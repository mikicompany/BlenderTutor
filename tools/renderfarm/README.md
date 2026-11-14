# Miki Butler Renderfarm

Queue Blender renders on the home render PC from anywhere, through the Google
Drive folder `Work/Renderfarm`.

| File | Where it runs | What it does |
|---|---|---|
| `manager.html` | published as a claude.ai artifact | The online manager: choose the .blend, GPU, frames, samples, resolution, output format and headless/visible, then watch progress, the queue and finished jobs. It reads and writes the Drive folder through the Google Drive connector. |
| `farm_watcher.py` | render PC, inside Blender's own Python | Watches the folder for `job_*.json`, renders each job in its own Blender process and writes `farm_status.json` (heartbeat, GPUs, live progress, queue, history). |
| `start_farm.bat` | render PC | Launches the watcher with `blender -b --factory-startup` and restarts it if it stops. Edit the Blender path and folder at the top. |

## How a job flows

1. The manager writes `job_<id>.json` into the Drive folder.
2. Google Drive for desktop syncs it to `G:\My Drive\Work\Renderfarm`.
3. The watcher moves it to `archive/jobs/`, renders, and writes frames plus a
   log to `output/<id>/`.
4. `farm_status.json` syncs back up, and the manager shows it.

Each sync hop usually takes seconds and can take a minute or so.

`cancel_<id>.txt` stops a running job. Removing a queued job in the manager moves
its job file to the Drive trash. The old trigger still works: an empty
`render_256.txt` renders every .blend at 256 samples.

## Job file

```json
{
  "id": "20261114-153012-ab12",
  "blend": "shot01.blend",
  "compute": "OPTIX",
  "devices": [],
  "frames": {"mode": "range", "start": 1, "end": 250, "step": 1},
  "samples": 256,
  "resolution_pct": 100,
  "output": {"format": "PNG"},
  "headless": true
}
```

- `blend`: a file name in the folder, or `*` for every .blend.
- `compute`: `OPTIX`, `CUDA`, `HIP`, `ONEAPI`, `METAL`, `CPU`, or `FILE` (keep the file's own setting).
- `devices`: Cycles device ids from `farm_status.json`. Empty means every device of that type.
- `frames.mode`: `file`, `range` or `single`.
- `output.format`: `PNG`, `JPEG`, `OPEN_EXR`, `OPEN_EXR_MULTILAYER`, `TIFF`, `FFMPEG` (H.264 MP4), or `FILE`.
- `headless: false` opens Blender's render window on the PC and closes it when the render ends.

The GPU choice applies to Cycles only, and it is never saved into the PC's Blender preferences.
