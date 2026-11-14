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
  "engine": "CYCLES",             # CYCLES | EEVEE | FILE (keep the file's engine)
  "compute": "OPTIX",             # OPTIX | CUDA | HIP | ONEAPI | METAL | CPU | FILE
  "devices": ["<device id>", ...],# empty = every device of that type
  "eevee_device": "10de/2684/0",  # EEVEE GPU from farm_status.json; null = display GPU
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
import hashlib
import json
import os
import platform
import re
import shutil
import socket
import subprocess
import sys
import tempfile
import threading
import urllib.error
import urllib.parse
import urllib.request
import uuid
import zipfile
import time
import traceback

VERSION = "1.6.0"
ROLE = os.environ.get("FARM_ROLE", "watcher")
SCRIPT = os.path.abspath(__file__)
FOLDER = os.environ.get("FARM_FOLDER") or os.path.dirname(SCRIPT)
STATUS_PATH = os.path.join(FOLDER, "farm_status.json")
CONFIG_PATH = os.path.join(FOLDER, "farm_config.json")
MANAGER_URL = "https://claude.ai/artifact/E6NgRqV79NRZ5H8zeN8Biu"
UPDATE_REQUEST = os.path.join(FOLDER, "update_blender.json")
# Per-PC state lives outside Drive: the Blender builds and which one renders.
LOCAL_DIR = os.path.join(os.environ.get("LOCALAPPDATA") or os.path.expanduser("~"), "MikiFarm")
BLENDER_OVERRIDE = os.path.join(LOCAL_DIR, "blender_path.txt")
RELEASE_URL = os.environ.get("FARM_RELEASE_URL", "https://download.blender.org/release")
OUTPUT_ROOT = os.path.join(FOLDER, "output")
ARCHIVE_DIR = os.path.join(FOLDER, "archive", "jobs")

POLL_IDLE = 5            # seconds between folder checks while idle
STATUS_IDLE = 60         # rewrite status (heartbeat) this often while idle
STATUS_BUSY = 10         # ...and this often while rendering
HISTORY_KEEP = 25
PREVIEW_SIDE = 960       # longest side of the "latest frame" preview, in pixels
THUMB_SIDE = 256
THUMBS_MAX = 24          # thumbnails kept per .blend, spread over the frame range
PREVIEW_EVERY = 10       # seconds between updates of the latest-frame preview
GPU_TYPES = ("OPTIX", "CUDA", "HIP", "ONEAPI", "METAL")
ENGINES = ("CYCLES", "EEVEE", "FILE")
# EEVEE's identifier changed between versions: BLENDER_EEVEE_NEXT in 4.2-4.x, BLENDER_EEVEE in 5.x.
EEVEE_IDS = ("BLENDER_EEVEE", "BLENDER_EEVEE_NEXT")
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
    engine = str(raw.get("engine") or "FILE").upper()
    if engine not in ENGINES:
        raise ValueError(f"unknown render engine {engine!r}")
    compute = str(raw.get("compute") or "FILE").upper()
    if compute not in GPU_TYPES + ("CPU", "FILE"):
        raise ValueError(f"unknown compute type {compute!r}")
    eevee_device = raw.get("eevee_device")
    if eevee_device is not None and eevee_device != "":
        eevee_device = str(eevee_device).strip()
        if not re.fullmatch(r"\d{1,2}|[0-9A-Fa-f]{1,8}/[0-9A-Fa-f]{1,8}/[0-9A-Fa-f]{1,8}", eevee_device):
            raise ValueError(f"eevee_device {eevee_device!r} is not a GPU index or vendor/device/id")
    else:
        eevee_device = None
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
        "engine": engine,
        "compute": compute,
        "devices": [str(d) for d in devices][:16],
        "eevee_device": eevee_device,
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


def apply_engine(scene, job):
    want = job.get("engine", "FILE")
    if want == "CYCLES":
        scene.render.engine = "CYCLES"
    elif want == "EEVEE":
        for ident in EEVEE_IDS:
            try:
                scene.render.engine = ident
                break
            except (TypeError, ValueError):
                continue
        else:
            return [f"EEVEE is not available in Blender {bpy.app.version_string}, kept {scene.render.engine}"]
    return []


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


def describe_cycles(scene):
    """Say which device Cycles will really use: scene.cycles.device = GPU means
    nothing unless a GPU is also enabled in this PC's Blender preferences."""
    if scene.render.engine != "CYCLES":
        return f"{scene.render.engine}", None
    c = scene.cycles
    where, warn = "CPU", None
    if c.device == "GPU":
        try:
            prefs = bpy.context.preferences.addons["cycles"].preferences
            t = prefs.compute_device_type
            try:
                prefs.refresh_devices()
            except Exception:
                pass
            used = [d.name for d in prefs.get_devices_for_type(t) if d.use and d.type != "CPU"] if t != "NONE" else []
            if used:
                where = f"{t} {', '.join(used)}"
            else:
                warn = ("Rendering on the CPU: the file asks for GPU but no GPU is enabled in this PC's "
                        "Blender preferences. Choose OptiX or CUDA in the manager.")
        except Exception:
            pass
    extras = [f"{c.samples} samples"]
    if getattr(c, "use_adaptive_sampling", False):
        extras.append(f"noise threshold {c.adaptive_threshold:g}")
    if getattr(c, "use_denoising", False):
        extras.append("denoising")
    return f"Cycles on {where} · " + ", ".join(extras), warn


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
    notes += apply_engine(scene, job)
    if job.get("engine") == "EEVEE" and job.get("eevee_device"):
        notes.append(f"EEVEE GPU: Vulkan device {job['eevee_device']}")
    notes += apply_device(scene, job)
    out_dir = apply_output(scene, job, blend_name)
    device_info, device_warn = describe_cycles(scene)
    if device_warn:
        notes.append(device_warn)

    total = len(range(scene.frame_start, scene.frame_end + 1, max(1, scene.frame_step)))
    prog = {
        "blend": os.path.basename(bpy.data.filepath),
        "engine": scene.render.engine,
        "device": getattr(getattr(scene, "cycles", None), "device", None),
        "device_info": device_info,
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
    prev_dir = os.environ.get("FARM_PREVIEW_DIR")
    prev_off = [not prev_dir]

    def grab_preview(sc):
        # Save the frame that just rendered as a full-size JPEG for the watcher to shrink.
        # The output format is switched to JPEG for this one save and put back at once;
        # nothing heavier may run here, the render is still in progress.
        if prev_off[0]:
            return
        rr = bpy.data.images.get("Render Result")
        if rr is None:
            return
        im = sc.render.image_settings
        keys = [k for k in ("media_type", "file_format", "color_mode", "color_depth", "quality") if hasattr(im, k)]
        saved = {k: getattr(im, k) for k in keys}
        ff = sc.render.ffmpeg
        ff_saved = {k: getattr(ff, k) for k in ("format", "codec", "constant_rate_factor", "ffmpeg_preset", "audio_codec") if hasattr(ff, k)}
        path = os.path.join(prev_dir, f"frame_{sc.frame_current:06d}.jpg")
        try:
            _set_media_type(im, "IMAGE")
            im.file_format = "JPEG"
            im.color_mode = "RGB"
            im.quality = 90
            rr.save_render(path + ".part")
            os.replace(path + ".part", path)
        except Exception as e:  # noqa: BLE001 - previews must never stop a render
            prev_off[0] = True
            prog["notes"].append(f"live preview turned off: {e}")
        finally:
            for k in keys:
                try:
                    setattr(im, k, saved[k])
                except Exception:
                    pass
            for k, v in ff_saved.items():
                try:
                    setattr(ff, k, v)
                except Exception:
                    pass

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
        grab_preview(sc)
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
    print("*** FARM *** " + device_info, flush=True)
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


_LOG_LINE = re.compile(r"^\s*\d\d:\d\d\.\d+|\|")
_HEX_ID = re.compile(r"\b([0-9A-Fa-f]{1,8}/[0-9A-Fa-f]{1,8}/[0-9A-Fa-f]{1,8})\b")


def parse_gpu_device_help(text):
    """Read the GPU list printed by `blender --gpu-backend vulkan --gpu-device help`."""
    found = []
    for line in text.splitlines():
        if _LOG_LINE.search(line) or re.search(r"warning|error|usage|blender \d", line, re.I):
            continue
        m = re.match(r"^\s*\[?(\d{1,2})\]?\s*[:.)\]-]\s*(.+?)\s*$", line)
        if not m:
            continue
        rest = m.group(2)
        hexid = _HEX_ID.search(rest)
        name = _HEX_ID.sub("", rest).strip(" -:[](),") or rest
        found.append({"index": int(m.group(1)), "id": hexid.group(1) if hexid else None, "name": name})
    return found


def detect_eevee_devices(blender):
    """EEVEE can only be pointed at a GPU through Vulkan (Blender 5.x --gpu-device)."""
    cmd = [blender, "-b", "--factory-startup", "--gpu-backend", "vulkan", "--gpu-device", "help"]
    try:
        r = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8",
                           errors="replace", timeout=120)
        out = (r.stdout or "") + "\n" + (r.stderr or "")
    except Exception as e:  # noqa: BLE001 - report any launch problem
        return [], f"could not ask Blender for its Vulkan GPUs: {e}"
    devs = parse_gpu_device_help(out)
    tail = "\n".join(l for l in out.splitlines() if l.strip())[-1200:]
    return devs, tail


def make_jpeg(src, dest, max_side, quality):
    """Shrink a JPEG with Blender's image API and copy it into the farm folder."""
    img = bpy.data.images.load(src, check_existing=False)
    try:
        w, h = img.size
        if not w or not h:
            return False
        k = max_side / max(w, h)
        if k < 1:
            img.scale(max(1, round(w * k)), max(1, round(h * k)))
        local = os.path.join(tempfile.gettempdir(), f"farm_preview_{os.getpid()}.jpg")
        img.filepath_raw = local
        img.file_format = "JPEG"
        try:
            img.save(filepath=local, quality=quality)
        except TypeError:
            img.save()
        # Copy over the old file in place so Drive keeps one file and just updates it.
        shutil.copyfile(local, dest)
        return True
    finally:
        bpy.data.images.remove(img)


# ---------------------------------------------------------------------------
# Notifications: ntfy push (phone app) and/or a Discord webhook, set in farm_config.json
# {"notify": {"ntfy_topic": "...", "ntfy_server": "https://ntfy.sh",
#             "discord_webhook": "https://discord.com/api/webhooks/...",
#             "on": ["done", "failed", "cancelled"]}}
# ---------------------------------------------------------------------------

def load_config():
    try:
        with open(CONFIG_PATH, encoding="utf-8-sig") as fh:
            cfg = json.load(fh)
        return cfg if isinstance(cfg, dict) else {}
    except (OSError, ValueError):
        return {}


def notify_targets(cfg):
    n = cfg.get("notify") if isinstance(cfg.get("notify"), dict) else {}
    topic = str(n.get("ntfy_topic") or "").strip()
    server = str(n.get("ntfy_server") or "https://ntfy.sh").strip().rstrip("/")
    hook = str(n.get("discord_webhook") or "").strip()
    out = {}
    if topic and re.fullmatch(r"[A-Za-z0-9_-]{1,64}", topic) and re.match(r"https?://", server):
        out["ntfy"] = (server, topic)
    if re.fullmatch(r"https://(?:\w+\.)?discord(?:app)?\.com/api/webhooks/\d+/[\w-]+", hook):
        out["discord"] = hook
    on = n.get("on")
    out["on"] = set(on) if isinstance(on, list) else {"done", "failed"}
    return out


def _send(req):
    with urllib.request.urlopen(req, timeout=30) as r:
        return r.status


def send_notification(targets, title, message, image=None, tags=""):
    """Send to every configured target. Returns a list of 'target: ok/error' strings."""
    results = []
    img = None
    if image and os.path.isfile(image) and os.path.getsize(image) < 8 * 1024 * 1024:
        with open(image, "rb") as fh:
            img = fh.read()
    if "ntfy" in targets:
        server, topic = targets["ntfy"]
        q = {"title": title, "tags": tags, "click": MANAGER_URL}
        try:
            if img:
                q.update(message=message, filename=os.path.basename(image))
                req = urllib.request.Request(f"{server}/{topic}?" + urllib.parse.urlencode(q),
                                             data=img, method="PUT")
            else:
                req = urllib.request.Request(f"{server}/{topic}?" + urllib.parse.urlencode(q),
                                             data=message.encode("utf-8"), method="POST")
            _send(req)
            results.append("phone (ntfy): sent")
        except Exception as e:  # noqa: BLE001
            results.append(f"phone (ntfy): {e}")
    if "discord" in targets:
        payload = json.dumps({"content": f"**{title}**\n{message}\n<{MANAGER_URL}>"[:1990]})
        try:
            if img:
                b = uuid.uuid4().hex
                body = (f"--{b}\r\nContent-Disposition: form-data; name=\"payload_json\"\r\n"
                        f"Content-Type: application/json\r\n\r\n{payload}\r\n"
                        f"--{b}\r\nContent-Disposition: form-data; name=\"files[0]\"; "
                        f"filename=\"{os.path.basename(image)}\"\r\nContent-Type: image/jpeg\r\n\r\n").encode() \
                    + img + f"\r\n--{b}--\r\n".encode()
                req = urllib.request.Request(targets["discord"], data=body, method="POST",
                                             headers={"Content-Type": f"multipart/form-data; boundary={b}",
                                                      "User-Agent": "MikiButlerRenderfarm"})
            else:
                req = urllib.request.Request(targets["discord"], data=payload.encode(), method="POST",
                                             headers={"Content-Type": "application/json",
                                                      "User-Agent": "MikiButlerRenderfarm"})
            _send(req)
            results.append("Discord: sent")
        except Exception as e:  # noqa: BLE001
            results.append(f"Discord: {e}")
    return results


def _dur(sec):
    sec = int(sec or 0)
    h, m, s = sec // 3600, sec % 3600 // 60, sec % 60
    return f"{h}h {m:02d}m" if h else f"{m}m {s:02d}s" if m else f"{s}s"


# ---------------------------------------------------------------------------
# Blender updates: portable builds from download.blender.org, checked against
# the published SHA-256, unpacked under %LOCALAPPDATA%\\MikiFarm\\blender.
# ---------------------------------------------------------------------------

def blender_version_of(exe):
    try:
        r = subprocess.run([exe, "--version"], capture_output=True, text=True, encoding="utf-8",
                           errors="replace", timeout=90)
        m = re.search(r"Blender\s+(\d+\.\d+(?:\.\d+)?(?:\s+\w+)?)", r.stdout or "")
        return m.group(1).strip() if m else None
    except Exception:  # noqa: BLE001
        return None


def platform_suffix():
    if sys.platform == "win32":
        return "windows-arm64.zip" if platform.machine().lower() in ("arm64", "aarch64") else "windows-x64.zip"
    if sys.platform == "darwin":
        return "macos-arm64.dmg"   # not supported for automatic install
    return "linux-x64.tar.xz"


def _fetch_text(url):
    req = urllib.request.Request(url, headers={"User-Agent": "MikiButlerRenderfarm"})
    with urllib.request.urlopen(req, timeout=60) as r:
        return r.read().decode("utf-8", "replace")


def find_release(series):
    """Newest blender-<series>.N build for this PC: (version, zip name, zip url, sha256 or None)."""
    if not re.fullmatch(r"\d+\.\d+", series):
        raise ValueError(f"{series!r} is not a Blender version like 5.3")
    suffix = platform_suffix()
    if not suffix.endswith(".zip"):
        raise RuntimeError("automatic updates are only set up for Windows")
    base = f"{RELEASE_URL}/Blender{series}/"
    try:
        html = _fetch_text(base)
    except urllib.error.HTTPError as e:
        if e.code == 404:
            raise RuntimeError(f"Blender {series} is not on blender.org's release page yet") from e
        raise
    names = set(re.findall(rf"blender-{re.escape(series)}\.(\d+)-{re.escape(suffix)}", html))
    if not names:
        raise RuntimeError(f"no {suffix} download for Blender {series} on blender.org")
    patch = max(int(n) for n in names)
    version = f"{series}.{patch}"
    zip_name = f"blender-{version}-{suffix}"
    sha = None
    for cand in (f"blender-{version}.sha256", f"{zip_name}.sha256"):
        if cand in html:
            try:
                for line in _fetch_text(base + cand).splitlines():
                    parts = line.split()
                    if len(parts) >= 2 and parts[-1].lstrip("*") == zip_name:
                        sha = parts[0].lower()
                        break
            except Exception:  # noqa: BLE001
                pass
        if sha:
            break
    return version, zip_name, base + zip_name, sha


class PreviewMaker:
    """Turns the frames a render drops into its temp folder into Drive previews."""

    def __init__(self, src_dir, dest_dir, blend_name):
        self.src = src_dir
        self.dest = dest_dir
        self.base = re.sub(r"[^A-Za-z0-9_.-]", "_", os.path.splitext(blend_name)[0])
        self.info = {"folder": os.path.relpath(dest_dir, FOLDER).replace(os.sep, "/"),
                     "latest": None, "latest_frame": None, "updated": None, "thumbs": []}
        self.last_write = 0
        self.thumbed = set()

    def update(self, prog, force=False):
        files = glob.glob(os.path.join(self.src, "frame_*.jpg"))
        if not files or not prog:
            return
        os.makedirs(self.dest, exist_ok=True)
        frames = []
        for f in files:
            m = re.search(r"frame_(-?\d+)\.jpg$", f)
            if m:
                frames.append((int(m.group(1)), f))
        frames.sort()
        start = prog.get("frame_start") or 0
        step = max(1, prog.get("frame_step") or 1)
        total = max(1, prog.get("frames_total") or 1)
        stride = max(1, -(-total // THUMBS_MAX))
        newest_frame, newest = frames[-1]
        for frame, f in frames:
            idx = (frame - start) // step
            if (idx % stride == 0 or idx == total - 1) and frame not in self.thumbed:
                name = f"{self.base}_f{frame:05d}.jpg"
                try:
                    if make_jpeg(f, os.path.join(self.dest, name), THUMB_SIDE, 75):
                        self.thumbed.add(frame)
                        self.info["thumbs"].append({"frame": frame, "file": name})
                except Exception as e:  # noqa: BLE001
                    log(f"   preview: {e}")
        wrote_latest = False
        if force or time.time() - self.last_write >= PREVIEW_EVERY:
            name = f"{self.base}_latest.jpg"
            try:
                if make_jpeg(newest, os.path.join(self.dest, name), PREVIEW_SIDE, 82):
                    self.info.update(latest=name, latest_frame=newest_frame, updated=now_iso())
                    self.last_write = time.time()
                    wrote_latest = True
            except Exception as e:  # noqa: BLE001
                log(f"   preview: {e}")
        for frame, f in frames:
            if f != newest or wrote_latest:
                try:
                    os.remove(f)
                except OSError:
                    pass


class Watcher:
    def __init__(self):
        self.default_blender = bpy.app.binary_path
        self.blender = self.default_blender
        self.blender_version = bpy.app.version_string
        try:
            with open(BLENDER_OVERRIDE, encoding="utf-8") as fh:
                alt = fh.read().strip()
            if alt and os.path.isfile(alt):
                self.blender = alt
                self.blender_version = blender_version_of(alt) or "unknown"
        except OSError:
            pass
        self.state = {
            "farm": "Miki Butler Renderfarm",
            "version": VERSION,
            "worker": {
                "host": socket.gethostname(),
                "os": platform.platform(),
                "blender": self.blender_version,
                "blender_default": bpy.app.version_string,
                "blender_override": self.blender != self.default_blender,
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
        self.notify_job(entry)
        self.write_status(force=True)

    # -- notifications -------------------------------------------------------
    def notify_async(self, title, message, image=None, tags="", label=""):
        targets = notify_targets(load_config())
        if "ntfy" not in targets and "discord" not in targets:
            return False

        def run():
            res = send_notification(targets, title, message, image, tags)
            log(f"   notify{(' ' + label) if label else ''}: " + "; ".join(res))
            self.state["notify_last"] = {"at": now_iso(), "title": title, "results": res}
            self.write_status(force=True)

        threading.Thread(target=run, daemon=True).start()
        return True

    def notify_job(self, entry):
        targets = notify_targets(load_config())
        if entry["status"] not in targets.get("on", set()):
            return
        res = entry.get("results") or []
        files = ", ".join(r["blend"] for r in res) or entry["job"].get("blend", "")
        frames = sum(r.get("frames_done") or 0 for r in res)
        secs = sum(r.get("seconds") or 0 for r in res)
        word = {"done": "Render done", "failed": "Render failed", "cancelled": "Render stopped"}.get(entry["status"], "Render finished")
        title = f"{word}: {files}"[:120]
        msg = f"{frames} frame{'s' if frames != 1 else ''} in {_dur(secs)} on {socket.gethostname()}"
        if entry.get("error"):
            msg += f"\n{entry['error']}"[:300]
        tags = {"done": "white_check_mark", "failed": "x", "cancelled": "stop_sign"}.get(entry["status"], "")
        image = None
        for r in reversed(res):
            pv = r.get("preview") or {}
            if pv.get("latest"):
                image = os.path.join(FOLDER, pv["folder"].replace("/", os.sep), pv["latest"])
                break
        self.notify_async(title, msg, image, tags, label=entry["id"])

    def handle_test_requests(self):
        for p in glob.glob(os.path.join(FOLDER, "notify_test*.txt")):
            try:
                os.remove(p)
            except OSError:
                continue
            log("notification test requested")
            if not self.notify_async("Renderfarm test", f"Notifications from {socket.gethostname()} work.",
                                     tags="bell", label="test"):
                self.state["notify_last"] = {"at": now_iso(), "title": "Renderfarm test",
                                             "results": ["nothing set up: add a phone topic or Discord webhook"]}
                self.write_status(force=True)

    def render_file(self, job, blend, cur):
        name = os.path.basename(blend)
        tmp = tempfile.mkdtemp(prefix="farm_")
        progress_path = os.path.join(tmp, "progress.json")
        preview_src = os.path.join(tmp, "preview")
        os.makedirs(preview_src, exist_ok=True)
        previews = PreviewMaker(preview_src, os.path.join(OUTPUT_ROOT, job["id"], "_preview"), name)
        cur["preview"] = previews.info
        env = dict(os.environ, FARM_ROLE="render", FARM_FOLDER=FOLDER,
                   FARM_JOB=json.dumps(job), FARM_PROGRESS=progress_path,
                   FARM_PREVIEW_DIR=preview_src)
        cmd = [self.blender]
        if job["headless"]:
            cmd.append("-b")
        if job.get("engine") == "EEVEE" and job.get("eevee_device"):
            cmd += ["--gpu-backend", "vulkan", "--gpu-device", job["eevee_device"]]
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
                previews.update(prog)
            cur["log"] = list(tail)
            cur["elapsed"] = round(time.time() - t0)
            self.handle_test_requests()
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
        previews.update(prog, force=True)
        shutil.rmtree(tmp, ignore_errors=True)
        cur["log"] = list(tail)
        res = {"blend": name, "seconds": round(time.time() - t0),
               "frames_done": prog.get("frames_done", 0), "frames_total": prog.get("frames_total"),
               "format": prog.get("format"), "notes": prog.get("notes", []), "exit_code": proc.returncode,
               "preview": previews.info}
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

    # -- Blender updates -----------------------------------------------------
    def set_update(self, **kw):
        self.state["update"] = dict(self.state.get("update") or {}, at=now_iso(), **kw)
        self.write_status(force=True)

    def use_blender(self, exe, version):
        self.blender = exe
        self.blender_version = version
        w = self.state["worker"]
        w["blender"] = version
        w["blender_override"] = exe != self.default_blender
        eevee, probe = detect_eevee_devices(self.blender)
        self.state["eevee_devices"], self.state["eevee_probe"] = eevee, probe

    def handle_update_request(self):
        if not os.path.isfile(UPDATE_REQUEST):
            return
        try:
            with open(UPDATE_REQUEST, encoding="utf-8-sig") as fh:
                req = json.load(fh)
        except (OSError, ValueError):
            self.bad_reads[UPDATE_REQUEST] += 1
            if self.bad_reads[UPDATE_REQUEST] < 6:
                return   # still syncing
            req = {}
        try:
            os.remove(UPDATE_REQUEST)
        except OSError:
            return
        action = str((req or {}).get("action") or "")
        if action == "revert":
            try:
                os.remove(BLENDER_OVERRIDE)
            except OSError:
                pass
            self.use_blender(self.default_blender, bpy.app.version_string)
            log(f"Blender: back to {bpy.app.version_string}")
            self.set_update(state="done", version=None, error=None, progress=None,
                            message=f"Rendering with Blender {bpy.app.version_string} again")
            return
        if action != "install":
            self.set_update(state="failed", error="unknown update request")
            return
        series = str(req.get("series") or "")
        try:
            self.install_blender(series)
        except Exception as e:  # noqa: BLE001
            log(f"Blender update failed: {e}")
            self.set_update(state="failed", error=str(e)[:300])

    def install_blender(self, series):
        log(f"Blender update: looking for the newest {series} build")
        self.set_update(state="checking", series=series, version=None, error=None, progress=None, message=None)
        version, zip_name, url, sha = find_release(series)
        if not sha:
            raise RuntimeError("blender.org has no checksum for this download, so it was not installed")
        install_root = os.path.join(LOCAL_DIR, "blender")
        folder = os.path.join(install_root, zip_name[:-4])
        exe = os.path.join(folder, "blender.exe")
        if not os.path.isfile(exe):
            os.makedirs(os.path.join(LOCAL_DIR, "downloads"), exist_ok=True)
            free = shutil.disk_usage(LOCAL_DIR).free
            if free < 4 * 1024 ** 3:
                raise RuntimeError(f"only {free / 1024 ** 3:.1f} GB free on the system drive; 4 GB needed")
            zpath = os.path.join(LOCAL_DIR, "downloads", zip_name)
            log(f"Blender update: downloading {zip_name}")
            self.set_update(state="downloading", version=version, progress=0)
            h = hashlib.sha256()
            req = urllib.request.Request(url, headers={"User-Agent": "MikiButlerRenderfarm"})
            with urllib.request.urlopen(req, timeout=60) as r, open(zpath + ".part", "wb") as out:
                total = int(r.headers.get("Content-Length") or 0)
                got, last = 0, 0
                while True:
                    chunk = r.read(1024 * 1024)
                    if not chunk:
                        break
                    out.write(chunk)
                    h.update(chunk)
                    got += len(chunk)
                    if time.time() - last > 10:
                        last = time.time()
                        pct = round(got * 100 / total) if total else None
                        self.state["update"].update(progress=pct, mb=round(got / 1048576))
                        self.write_status(force=True)
            if h.hexdigest() != sha:
                os.remove(zpath + ".part")
                raise RuntimeError("the download did not match blender.org's checksum, so it was thrown away")
            os.replace(zpath + ".part", zpath)
            log("Blender update: checksum OK, unpacking")
            self.set_update(state="unpacking", progress=100)
            tmp_dir = os.path.join(install_root, "_unpacking")
            shutil.rmtree(tmp_dir, ignore_errors=True)
            with zipfile.ZipFile(zpath) as z:
                for m in z.namelist():   # refuse paths that escape the folder
                    if m.startswith(("/", "\\")) or ".." in m.replace("\\", "/").split("/"):
                        raise RuntimeError("the download contains unsafe file paths")
                z.extractall(tmp_dir)
            inner = os.path.join(tmp_dir, zip_name[:-4])
            if not os.path.isfile(os.path.join(inner, "blender.exe")):
                raise RuntimeError("blender.exe was not found in the download")
            shutil.rmtree(folder, ignore_errors=True)
            os.replace(inner, folder)
            shutil.rmtree(tmp_dir, ignore_errors=True)
            try:
                os.remove(zpath)
            except OSError:
                pass
        self.set_update(state="testing", version=version)
        got_version = blender_version_of(exe)
        if not got_version or not got_version.startswith(series):
            raise RuntimeError(f"the new Blender did not start correctly (reported {got_version!r})")
        os.makedirs(LOCAL_DIR, exist_ok=True)
        with open(BLENDER_OVERRIDE, "w", encoding="utf-8") as fh:
            fh.write(exe)
        self.use_blender(exe, got_version)
        log(f"Blender update: renders now use Blender {got_version} ({exe})")
        self.set_update(state="done", version=got_version, message=f"Renders now use Blender {got_version}")

    # -- main loop -----------------------------------------------------------
    def run(self):
        log("=" * 68)
        log(f"*** MIKI BUTLER RENDERFARM {VERSION} ***")
        log(f"Watching: {FOLDER}")
        log(f"Blender:  {self.blender_version}  ({self.blender})")
        self.state["devices"] = detect_devices()
        for d in self.state["devices"]:
            log(f"Device:   [{d['type']}] {d['name']}")
        eevee, probe = detect_eevee_devices(self.blender)
        self.state["eevee_devices"] = eevee
        self.state["eevee_probe"] = probe
        for d in eevee:
            log(f"EEVEE:    [{d['index']}] {d['name']}" + (f"  ({d['id']})" if d["id"] else ""))
        if not eevee:
            log("EEVEE:    no selectable GPUs reported; EEVEE uses the display GPU")
        log("Queue jobs from the online Render Farm Manager, or drop render_<samples>.txt here.")
        log("=" * 68)
        os.makedirs(OUTPUT_ROOT, exist_ok=True)
        self.write_status(force=True)
        while True:
            try:
                self.handle_test_requests()
                self.handle_update_request()   # only between jobs, never mid-render
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
