"""
Miki Butler Renderfarm: watcher and render hook in one file.

The render PC runs it through start_farm.bat:

    blender.exe -b --factory-startup --python farm_watcher.py

As the WATCHER it polls the Google Drive folder it sits in for job files
(job_*.json) written by the online Render Farm Manager. It renders each job
in its own Blender process and writes farm_status.json back, so the manager
can show the GPUs, the queue and live progress.

As the RENDER HOOK (FARM_ROLE=render, set by the watcher) it runs inside each
render process. It applies the job's GPU, samples, frames and output format,
then renders, either headless or in a visible Blender window.

Job file (all fields optional except id):
{
  "id": "20261114-153012-ab12",
  "blend": "shot01.blend",        # a .blend in the folder, or "*" for all
  "compute": "OPTIX",             # OPTIX | CUDA | HIP | ONEAPI | METAL | CPU | FILE
  "devices": ["<device id>", ...],# empty = every device of that type
  "frames": {"mode": "range", "start": 1, "end": 250, "step": 1},
                                  # mode: file | range | single (uses "start")
  "samples": 256,                 # null = keep the file's
  "resolution_pct": 100,          # null = keep the file's
  "output": {"format": "PNG"},    # PNG | JPEG | OPEN_EXR | OPEN_EXR_MULTILAYER
                                  # | TIFF | FFMPEG (MP4) | FILE (keep the file's)
  "headless": true
}

The old trigger still works: an empty render_256.txt renders every .blend
at 256 samples with the file's own settings.

Cancel: a file named cancel_<job id>.txt (or cancel_all.txt) stops that job,
or removes it from the queue.
"""

import bpy
import collections
import datetime
import glob
import json
import os
import platform
import re
import socket
import subprocess
import sys
import tempfile
import threading
import time
import traceback

VERSION = "1.0.0"
ROLE = os.environ.get("FARM_ROLE", "watcher")
SCRIPT = os.path.abspath(__file__)
FOLDER = os.environ.get("FARM_FOLDER") or os.path.dirname(SCRIPT)
STATUS_PATH = os.path.join(FOLDER, "farm_status.json")
OUTPUT_ROOT = os.path.join(FOLDER, "output")
ARCHIVE_DIR = os.path.join(FOLDER, "archive", "jobs")

POLL_IDLE = 5            # seconds between folder checks while idle
STATUS_IDLE = 60         # rewrite status (heartbeat) this often while idle
STATUS_BUSY = 10         # ...and this often while rendering
HISTORY_KEEP = 25
GPU_TYPES = ("OPTIX", "CUDA", "HIP", "ONEAPI", "METAL")
FORMATS = ("PNG", "JPEG", "OPEN_EXR", "OPEN_EXR_MULTILAYER", "TIFF", "FFMPEG", "FILE")


def now_iso():
    return datetime.datetime.now(datetime.timezone.utc).isoformat(timespec="seconds")


def log(msg):
    stamp = datetime.datetime.now().strftime("%H:%M:%S")
    print(f"[{stamp}] {msg}", flush=True)


# ---------------------------------------------------------------------------
# Shared: job normalisation
# ---------------------------------------------------------------------------

def _int_or_none(v, lo=None, hi=None):
    if v is None or v == "":
        return None
    try:
        v = int(v)
    except (TypeError, ValueError):
        return None
    if lo is not None and v < lo:
        return None
    if hi is not None and v > hi:
        v = hi
    return v


def normalise_job(raw, fallback_id):
    if not isinstance(raw, dict):
        raise ValueError("job file is not a JSON object")
    job_id = re.sub(r"[^A-Za-z0-9_-]", "", str(raw.get("id") or fallback_id))[:48] or fallback_id
    compute = str(raw.get("compute") or "FILE").upper()
    if compute not in GPU_TYPES + ("CPU", "FILE"):
        raise ValueError(f"unknown compute type {compute!r}")
    devices = raw.get("devices") or []
    if not isinstance(devices, list):
        devices = []
    frames = raw.get("frames") or {}
    mode = str(frames.get("mode") or "file").lower()
    if mode not in ("file", "range", "single"):
        mode = "file"
    start = _int_or_none(frames.get("start"), lo=0)
    end = _int_or_none(frames.get("end"), lo=0)
    step = _int_or_none(frames.get("step"), lo=1) or 1
    if mode in ("range", "single") and start is None:
        raise ValueError("frames.start is required for a range or single frame")
    if mode == "single":
        end, step = start, 1
    if mode == "range":
        if end is None:
            raise ValueError("frames.end is required for a range")
        if end < start:
            raise ValueError("frames.end is before frames.start")
    output = raw.get("output") or {}
    fmt = str(output.get("format") or "FILE").upper()
    if fmt not in FORMATS:
        raise ValueError(f"unknown output format {fmt!r}")
    blend = str(raw.get("blend") or "*")
    if blend != "*":
        blend = os.path.basename(blend)  # never leave the farm folder
        if not blend.lower().endswith(".blend"):
            raise ValueError("blend must be a .blend file name or *")
    return {
        "id": job_id,
        "created": raw.get("created"),
        "blend": blend,
        "compute": compute,
        "devices": [str(d) for d in devices][:16],
        "frames": {"mode": mode, "start": start, "end": end, "step": step},
        "samples": _int_or_none(raw.get("samples"), lo=1, hi=1_000_000),
        "resolution_pct": _int_or_none(raw.get("resolution_pct"), lo=1, hi=1000),
        "output": {"format": fmt},
        "headless": bool(raw.get("headless", True)),
        "note": str(raw.get("note") or "")[:200],
    }


# ---------------------------------------------------------------------------
# RENDER HOOK: runs inside each render process
# ---------------------------------------------------------------------------

def _set_media_type(settings, media):
    # Blender 5 splits images, multilayer EXR and video into media types.
    if hasattr(settings, "media_type"):
        try:
            settings.media_type = media
        except Exception:
            pass


def apply_output(scene, job, blend_name):
    r = scene.render
    out_dir = os.path.join(OUTPUT_ROOT, job["id"])
    os.makedirs(out_dir, exist_ok=True)
    fmt = job["output"]["format"]
    s = r.image_settings
    if fmt == "FFMPEG":
        _set_media_type(s, "VIDEO")
        s.file_format = "FFMPEG"
        ff = r.ffmpeg
        ff.format = "MPEG4"
        ff.codec = "H264"
        try:
            ff.constant_rate_factor = "HIGH"
            ff.ffmpeg_preset = "GOOD"
        except Exception:
            pass
        try:
            ff.audio_codec = "AAC"
        except Exception:
            pass
    elif fmt == "OPEN_EXR_MULTILAYER":
        _set_media_type(s, "MULTI_LAYER_IMAGE")
        s.file_format = "OPEN_EXR_MULTILAYER"
    elif fmt != "FILE":
        _set_media_type(s, "IMAGE")
        s.file_format = fmt
        if fmt == "PNG":
            s.color_mode = "RGBA"
        elif fmt == "JPEG":
            s.color_mode = "RGB"
            s.quality = 92
    is_video = s.file_format == "FFMPEG"
    r.filepath = os.path.join(out_dir, f"{blend_name}_" if is_video else f"{blend_name}_####")
    r.use_file_extension = True
    r.use_overwrite = True
    r.use_placeholder = False
    return out_dir


def apply_device(scene, job):
    compute = job["compute"]
    notes = []
    if compute == "FILE":
        return notes
    if scene.render.engine != "CYCLES":
        notes.append(f"GPU choice applies to Cycles only; this file renders with {scene.render.engine}")
        return notes
    if compute == "CPU":
        scene.cycles.device = "CPU"
        return notes
    try:
        prefs = bpy.context.preferences.addons["cycles"].preferences
        prefs.compute_device_type = compute
        try:
            prefs.refresh_devices()
        except Exception:
            pass
        devs = [d for d in prefs.get_devices_for_type(compute) if d.type != "CPU"]
    except Exception as e:
        devs = []
        notes.append(f"could not set up {compute}: {e}")
    if not devs:
        notes.append(f"no {compute} devices on this PC, rendering on CPU")
        scene.cycles.device = "CPU"
        return notes
    wanted = set(job["devices"])
    chosen = [d for d in devs if not wanted or d.id in wanted]
    if not chosen:
        notes.append("the chosen GPU was not found, using every " + compute + " device")
        chosen = devs
    for d in prefs.devices:
        d.use = d in chosen if d.type != "CPU" else False
    for d in devs:
        d.use = d in chosen
    scene.cycles.device = "GPU"
    notes.append("GPU: " + ", ".join(d.name for d in chosen))
    return notes


def render_role():
    job = json.loads(os.environ["FARM_JOB"])
    progress_path = os.environ["FARM_PROGRESS"]
    blend_name = os.path.splitext(os.path.basename(bpy.data.filepath))[0] or "render"
    # Never write this run's GPU choice back to the user's preferences.
    try:
        bpy.context.preferences.use_preferences_save = False
    except Exception:
        pass
    scene = bpy.context.scene
    notes = []

    f = job["frames"]
    if f["mode"] in ("range", "single"):
        # Set end first only if it moves the range forward, so start never passes end.
        if f["start"] > scene.frame_end:
            scene.frame_end = f["end"]
            scene.frame_start = f["start"]
        else:
            scene.frame_start = f["start"]
            scene.frame_end = f["end"]
        scene.frame_step = f["step"]
    if job["samples"]:
        try:
            scene.cycles.samples = job["samples"]
        except Exception:
            pass
        ee = getattr(scene, "eevee", None)
        if ee is not None and hasattr(ee, "taa_render_samples"):
            ee.taa_render_samples = job["samples"]
    if job["resolution_pct"]:
        scene.render.resolution_percentage = job["resolution_pct"]
    notes += apply_device(scene, job)
    out_dir = apply_output(scene, job, blend_name)

    total = len(range(scene.frame_start, scene.frame_end + 1, max(1, scene.frame_step)))
    prog = {
        "blend": os.path.basename(bpy.data.filepath),
        "engine": scene.render.engine,
        "device": getattr(getattr(scene, "cycles", None), "device", None),
        "frame_start": scene.frame_start,
        "frame_end": scene.frame_end,
        "frame_step": scene.frame_step,
        "frames_total": total,
        "frames_done": 0,
        "frame": None,
        "resolution": f"{scene.render.resolution_x * scene.render.resolution_percentage // 100}"
                      f"x{scene.render.resolution_y * scene.render.resolution_percentage // 100}",
        "format": scene.render.image_settings.file_format,
        "output_dir": out_dir,
        "notes": notes,
        "finished": False,
        "cancelled": False,
        "frame_times": [],
    }
    last = [time.time()]

    def dump():
        try:
            with open(progress_path, "w", encoding="utf-8") as fh:
                json.dump(prog, fh)
        except OSError:
            pass

    def on_post(sc, *_):
        t = time.time()
        prog["frames_done"] += 1
        prog["frame"] = sc.frame_current
        prog["frame_times"] = (prog["frame_times"] + [round(t - last[0], 2)])[-20:]
        last[0] = t
        dump()
        print(f"*** FARM *** frame {sc.frame_current} done "
              f"({prog['frames_done']}/{total})", flush=True)

    def on_done(*_):
        prog["finished"] = True
        dump()

    def on_cancel(*_):
        prog["cancelled"] = True
        prog["finished"] = True
        dump()

    bpy.app.handlers.render_post.append(on_post)
    for n in notes:
        print("*** FARM *** " + n, flush=True)
    print(f"*** FARM *** {prog['blend']}: frames {scene.frame_start}-{scene.frame_end} "
          f"step {scene.frame_step}, {prog['format']}, {prog['resolution']} -> {out_dir}", flush=True)
    dump()

    if bpy.app.background:
        bpy.ops.render.render(animation=True)
        on_done()
        return

    # Visible mode: wait for the window, render with the normal render view,
    # then close Blender when the animation finishes or is cancelled.
    def quit_soon(*_):
        def _q():
            bpy.ops.wm.quit_blender()
            return None
        bpy.app.timers.register(_q, first_interval=1.5)

    bpy.app.handlers.render_complete.append(lambda *a: (on_done(), quit_soon()))
    bpy.app.handlers.render_cancel.append(lambda *a: (on_cancel(), quit_soon()))

    def start():
        wm = bpy.context.window_manager
        if not wm.windows:
            return 0.5
        win = wm.windows[0]
        with bpy.context.temp_override(window=win, screen=win.screen):
            bpy.ops.render.render("INVOKE_DEFAULT", animation=True)
        return None

    bpy.app.timers.register(start, first_interval=2.0)


# ---------------------------------------------------------------------------
# WATCHER: runs once on the render PC
# ---------------------------------------------------------------------------

def cpu_name():
    name = platform.processor() or ""
    if sys.platform == "win32":
        try:
            import winreg
            k = winreg.OpenKey(winreg.HKEY_LOCAL_MACHINE,
                               r"HARDWARE\DESCRIPTION\System\CentralProcessor\0")
            name = winreg.QueryValueEx(k, "ProcessorNameString")[0].strip()
        except Exception:
            pass
    return name or "CPU"


def detect_devices():
    found, seen = [], set()
    try:
        prefs = bpy.context.preferences.addons["cycles"].preferences
    except Exception:
        prefs = None
    if prefs is not None:
        for t in GPU_TYPES:
            try:
                prefs.compute_device_type = t
            except Exception:
                continue  # backend not built for this OS
            try:
                prefs.refresh_devices()
            except Exception:
                pass
            try:
                devs = prefs.get_devices_for_type(t)
            except Exception:
                continue
            for d in devs:
                if d.type == "CPU" or (t, d.id) in seen:
                    continue
                seen.add((t, d.id))
                found.append({"id": d.id, "name": d.name, "type": t})
    found.append({"id": "CPU", "name": cpu_name(), "type": "CPU", "threads": os.cpu_count()})
    return found


class Watcher:
    def __init__(self):
        self.blender = bpy.app.binary_path
        self.state = {
            "farm": "Miki Butler Renderfarm",
            "version": VERSION,
            "worker": {
                "host": socket.gethostname(),
                "os": platform.platform(),
                "blender": bpy.app.version_string,
                "folder": FOLDER,
                "started": now_iso(),
                "heartbeat": None,
                "state": "idle",
            },
            "devices": [],
            "blends": [],
            "current": None,
            "queue": [],
            "history": [],
        }
        try:
            with open(STATUS_PATH, encoding="utf-8") as fh:
                old = json.load(fh)
            self.state["history"] = list(old.get("history") or [])[:HISTORY_KEEP]
        except Exception:
            pass
        self.last_status = 0
        self.bad_reads = collections.Counter()
        self.pending_cancels = set()   # cancel requests seen while a job was rendering

    # -- status --------------------------------------------------------------
    def write_status(self, force=False):
        busy = self.state["current"] is not None
        if not force and time.time() - self.last_status < (STATUS_BUSY if busy else STATUS_IDLE):
            return
        self.state["worker"]["heartbeat"] = now_iso()
        self.state["worker"]["state"] = "rendering" if busy else "idle"
        self.state["worker"]["poll_seconds"] = STATUS_BUSY if busy else STATUS_IDLE
        self.state["blends"] = sorted(os.path.basename(p) for p in glob.glob(os.path.join(FOLDER, "*.blend")))
        try:
            with open(STATUS_PATH, "w", encoding="utf-8") as fh:
                json.dump(self.state, fh, indent=1)
            self.last_status = time.time()
        except OSError as e:
            log(f"could not write status: {e}")

    def add_history(self, entry):
        self.state["history"] = ([entry] + self.state["history"])[:HISTORY_KEEP]

    # -- job intake ----------------------------------------------------------
    def read_jobs(self):
        jobs = []
        for path in glob.glob(os.path.join(FOLDER, "job_*.json")):
            try:
                with open(path, encoding="utf-8-sig") as fh:
                    raw = json.load(fh)
            except (OSError, ValueError):
                # Drive may still be syncing it; give up after a few tries.
                self.bad_reads[path] += 1
                if self.bad_reads[path] >= 6:
                    self.reject(path, None, "job file is not valid JSON")
                continue
            fallback = os.path.splitext(os.path.basename(path))[0][4:]
            try:
                job = normalise_job(raw, fallback)
            except ValueError as e:
                self.reject(path, raw, str(e))
                continue
            jobs.append((path, job))
        for path in glob.glob(os.path.join(FOLDER, "render_*.txt")):
            m = re.match(r"render_(\d+)$", os.path.splitext(os.path.basename(path))[0])
            if not m or int(m.group(1)) <= 0:
                self.reject(path, None, "legacy trigger needs a positive sample count")
                continue
            stamp = datetime.datetime.fromtimestamp(os.path.getmtime(path)).strftime("%Y%m%d-%H%M%S")
            job = normalise_job({"id": f"{stamp}-legacy", "samples": int(m.group(1))}, "legacy")
            job["created"] = datetime.datetime.fromtimestamp(os.path.getmtime(path), datetime.timezone.utc).isoformat(timespec="seconds")
            jobs.append((path, job))
        jobs.sort(key=lambda pj: (pj[1].get("created") or "", pj[1]["id"]))
        return jobs

    def archive(self, path, suffix):
        os.makedirs(ARCHIVE_DIR, exist_ok=True)
        base = os.path.basename(path)
        dest = os.path.join(ARCHIVE_DIR, f"{os.path.splitext(base)[0]}.{suffix}{os.path.splitext(base)[1]}")
        try:
            os.replace(path, dest)
        except OSError:
            try:
                os.remove(path)
            except OSError:
                pass

    def reject(self, path, raw, reason):
        jid = (raw or {}).get("id") if isinstance(raw, dict) else None
        log(f"rejected {os.path.basename(path)}: {reason}")
        self.add_history({"id": jid or os.path.basename(path), "status": "invalid",
                          "error": reason, "finished": now_iso()})
        self.archive(path, "invalid")
        self.write_status(force=True)

    def cancel_requests(self):
        ids = set(self.pending_cancels)
        self.pending_cancels.clear()
        for p in glob.glob(os.path.join(FOLDER, "cancel_*.txt")):
            ids.add(os.path.splitext(os.path.basename(p))[0][7:])
            try:
                os.remove(p)
            except OSError:
                pass
        return ids

    # -- one job -------------------------------------------------------------
    def blends_for(self, job):
        if job["blend"] == "*":
            return sorted(glob.glob(os.path.join(FOLDER, "*.blend")))
        p = os.path.join(FOLDER, job["blend"])
        return [p] if os.path.isfile(p) else []

    def run_job(self, path, job):
        self.archive(path, "taken")
        blends = self.blends_for(job)
        started = now_iso()
        cur = {"job": job, "started": started, "files_total": len(blends), "files_done": 0,
               "file": None, "progress": None, "log": [], "pid": None}
        self.state["current"] = cur
        log("=" * 68)
        log(f"JOB {job['id']}  ({len(blends)} file(s), {'headless' if job['headless'] else 'visible'})")
        if not blends:
            self.finish(job, started, "failed", f"{job['blend']} was not found in the farm folder", [])
            return
        results, status, error = [], "done", None
        for i, blend in enumerate(blends):
            cur["file"] = os.path.basename(blend)
            cur["files_done"] = i
            cur["progress"] = None
            res = self.render_file(job, blend, cur)
            results.append(res)
            if res["status"] == "cancelled":
                status = "cancelled"
                break
            if res["status"] != "done":
                status, error = "failed", res.get("error")
        cur["files_done"] = len([r for r in results if r["status"] == "done"])
        self.finish(job, started, status, error, results)

    def finish(self, job, started, status, error, results):
        entry = {"id": job["id"], "status": status, "job": job, "started": started,
                 "finished": now_iso(), "results": results}
        if error:
            entry["error"] = error
        self.add_history(entry)
        self.state["current"] = None
        log(f"JOB {job['id']} {status.upper()}" + (f": {error}" if error else ""))
        self.write_status(force=True)

    def render_file(self, job, blend, cur):
        name = os.path.basename(blend)
        tmp = tempfile.mkdtemp(prefix="farm_")
        progress_path = os.path.join(tmp, "progress.json")
        env = dict(os.environ, FARM_ROLE="render", FARM_FOLDER=FOLDER,
                   FARM_JOB=json.dumps(job), FARM_PROGRESS=progress_path)
        cmd = [self.blender]
        if job["headless"]:
            cmd.append("-b")
        cmd += [blend, "--python-exit-code", "3", "-P", SCRIPT]
        log(f"-> {name}")
        out_dir = os.path.join(OUTPUT_ROOT, job["id"])
        os.makedirs(out_dir, exist_ok=True)
        log_path = os.path.join(out_dir, os.path.splitext(name)[0] + "_log.txt")
        tail = collections.deque(maxlen=14)
        t0 = time.time()
        try:
            logf = open(log_path, "w", encoding="utf-8", errors="replace")
        except OSError:
            logf = None
        try:
            proc = subprocess.Popen(cmd, env=env, stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
                                    text=True, encoding="utf-8", errors="replace", bufsize=1)
        except OSError as e:
            return {"blend": name, "status": "failed", "error": f"could not start Blender: {e}"}
        cur["pid"] = proc.pid

        def pump():
            for line in proc.stdout:
                line = line.rstrip()
                if logf:
                    logf.write(line + "\n")
                if line.startswith("*** FARM ***") or "Error" in line or line.startswith("Saved:"):
                    print("   " + line, flush=True)
                if line.strip():
                    tail.append(line[:240])

        reader = threading.Thread(target=pump, daemon=True)
        reader.start()
        cancelled, finished_at = job["id"] in self.pending_cancels, None
        if cancelled:
            proc.terminate()
        while proc.poll() is None:
            time.sleep(2)
            prog = self.read_progress(progress_path)
            if prog:
                cur["progress"] = prog
                if prog.get("finished") and finished_at is None:
                    finished_at = time.time()
            cur["log"] = list(tail)
            cur["elapsed"] = round(time.time() - t0)
            ids = self.cancel_requests()
            if job["id"] in ids or "all" in ids:
                log(f"cancel requested for {job['id']}")
                ids.discard(job["id"])
                self.pending_cancels |= ids   # "all" also clears the queue afterwards
                cancelled = True
                proc.terminate()
                break
            self.pending_cancels |= ids       # for queued jobs; handled by the main loop
            # A visible Blender that finished but did not close on its own.
            if finished_at and time.time() - finished_at > 45:
                proc.terminate()
                break
            self.write_status()
        try:
            proc.wait(timeout=30)
        except subprocess.TimeoutExpired:
            proc.kill()
        reader.join(timeout=5)
        if logf:
            logf.close()
        prog = self.read_progress(progress_path) or cur.get("progress") or {}
        cur["progress"] = prog
        cur["log"] = list(tail)
        res = {"blend": name, "seconds": round(time.time() - t0),
               "frames_done": prog.get("frames_done", 0), "frames_total": prog.get("frames_total"),
               "format": prog.get("format"), "notes": prog.get("notes", []), "exit_code": proc.returncode}
        if cancelled or prog.get("cancelled"):
            res["status"] = "cancelled"
        elif prog.get("finished") and (proc.returncode in (0, None) or finished_at):
            res["status"] = "done"
        else:
            res["status"] = "failed"
            res["error"] = next((l for l in reversed(tail) if "rror" in l), None) \
                or f"Blender exited with code {proc.returncode}"
        log(f"   {name}: {res['status']} ({res['frames_done']}/{res['frames_total']} frames, {res['seconds']}s)")
        return res

    @staticmethod
    def read_progress(path):
        try:
            with open(path, encoding="utf-8") as fh:
                return json.load(fh)
        except (OSError, ValueError):
            return None

    # -- main loop -----------------------------------------------------------
    def run(self):
        log("=" * 68)
        log(f"*** MIKI BUTLER RENDERFARM {VERSION} ***")
        log(f"Watching: {FOLDER}")
        log(f"Blender:  {bpy.app.version_string}  ({self.blender})")
        self.state["devices"] = detect_devices()
        for d in self.state["devices"]:
            log(f"Device:   [{d['type']}] {d['name']}")
        log("Queue jobs from the online Render Farm Manager, or drop render_<samples>.txt here.")
        log("=" * 68)
        os.makedirs(OUTPUT_ROOT, exist_ok=True)
        self.write_status(force=True)
        while True:
            try:
                cancels = self.cancel_requests()
                jobs = self.read_jobs()
                keep = []
                for path, job in jobs:
                    if job["id"] in cancels or "all" in cancels:
                        log(f"removed {job['id']} from the queue")
                        self.add_history({"id": job["id"], "status": "cancelled", "job": job,
                                          "finished": now_iso(), "results": []})
                        self.archive(path, "cancelled")
                    else:
                        keep.append((path, job))
                if len(keep) != len(jobs):
                    self.write_status(force=True)
                self.state["queue"] = [j for _, j in keep[1:]]
                if keep:
                    self.run_job(*keep[0])
                    continue
                self.state["queue"] = []
                self.write_status()
            except KeyboardInterrupt:
                raise
            except Exception:
                log("watcher error:\n" + traceback.format_exc())
                self.state["current"] = None
            time.sleep(POLL_IDLE)


if ROLE == "render":
    try:
        render_role()
    except Exception:
        traceback.print_exc()
        sys.exit(3)
elif __name__ == "__main__":
    try:
        Watcher().run()
    except KeyboardInterrupt:
        log("stopped.")
