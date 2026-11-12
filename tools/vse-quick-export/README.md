# Quick MP4 Export (Blender VSE addon)

A one-click fix for the most common Blender video-editing mistake: rendering
your Sequencer edit and getting **a folder of PNGs** or a **silent video**.

One button sets everything Output needs to export a standard, plays-everywhere
MP4:

- **Post Processing → Sequencer** on (so your edit renders, not the empty scene)
- **File Format → FFmpeg Video**
- **Container → MPEG-4** (`.mp4`)
- **Video Codec → H.264**
- **Audio Codec → AAC** (toggle off for a silent export)
- A sensible quality preset (High / Medium / Small)

## Install

1. Blender → **Edit ▸ Preferences ▸ Add-ons ▸ Install…**
2. Pick `quick_mp4_export.py` (or the released `.zip`).
3. Tick **Quick MP4 Export (VSE)** to enable it.

## Use

1. Open the **Video Editing** workspace and build your edit.
2. In the Sequencer, open the sidebar (**N**) and go to the **Export** tab.
3. Pick a quality, then click **Set Up MP4 Export**.
4. Choose where the file saves in **Output Properties**, then
   **Render ▸ Render Animation** — or use **Set Up & Render MP4** to do both.

Tested on Blender 3.0–4.x.

Made by [Blender Tutoring](https://www.blendertutoring.com) · companion to the
[VSE video-editing guide](https://www.blendertutoring.com/blog/video-editing-in-blender).
