# Video viewer

One HTML file. Download it from [the latest release](https://github.com/swaftmc/video-player/releases/latest) and
open it in Edge or Chrome from anywhere (a double-click works; no server).

- Open a folder of videos (Folder). They're listed in the sidebar on the left, sub-folders included. Click one to
  watch it. Opening another folder replaces it.
- Add single video files (Files). They're listed under `misc/`, after the folder's videos, and stay when you open
  another folder.
- Speed keys: 1 → 0.25x, 2 → 0.5x, 3 → 1x, 4 → 2x, 5 → 3x by default. Change a key or its speed under the sliders
  button, or add more. The browser remembers them. The ? button (or the ? key) lists every key.
- Fullscreen (the Fullscreen button or F) shows the video alone, and every key still works. The player's own
  fullscreen button and double-click work too, but there the speed and zoom messages don't show.
- Motion zoom (the switch, or Z): the picture zooms onto where things move. A small optical-flow model
  ([NeuFlowV2](https://github.com/neufieldrobotics/NeuFlow_v2)) compares two frames 0.1 s apart, the camera's own pan is
  taken out, and the view eases to a box round what is left.
- The mouse wheel over the video zooms at the cursor. With motion zoom on it frames the motion tighter or looser.

## Use

| key | does |
| --- | --- |
| 1 2 3 4 5 | 0.25x, 0.5x, 1x, 2x, 3x (changeable) |
| Z | motion zoom on / off |
| wheel | zoom in / out (motion zoom on: tighter / looser) |
| 0 | reset the zoom (and turn motion zoom off) |
| F | fullscreen on / off (also leaves the player's own fullscreen) |
| Space | play / pause |
| ? | the keys list |

The first time motion zoom is turned on, the page asks for the model file:
[neuflow_mixed.onnx](https://github.com/ibaiGorordo/ONNX-NeuFlowV2-Optical-Flow/releases/download/0.1.0/neuflow_mixed.onnx)
(42 MB, SHA-256 `7a07929423133f9267e33aec322873ef1dfcb17224020f30c794e569d353624d`). The browser keeps it, so this happens once.
GitHub doesn't let web pages download it themselves.

Motion zoom also needs internet once: it loads onnxruntime-web 1.30.0 (about 25 MB) from jsDelivr, checked against
pinned SHA-384 hashes, and the browser caches it. Watching videos needs nothing.

## Measured

Edge 155 on this laptop (Intel Iris Xe, WebGPU), 1920x1080 video:

| | time |
| --- | --- |
| one look (two frames → zoom box) | 0.9–2 s, depending on the laptop's load; the view eases between looks |
| the first look in a new browser profile | about 20 s (the GPU shaders compile; the page says so) |
| one look on the CPU (no WebGPU) | 15 s, so motion zoom needs WebGPU |

## Building

The page is written as separate files in `src/`; `build.mjs` inlines them into `index.html`. Node, no packages.

```powershell
node check_motion.mjs   # self-check of the motion box maths
node build.mjs          # src/ -> index.html
```

`src/index.html` also runs as it is, for working on it.

Layout:
- `src/ui.js`: the shared bits (element lookup, the message over the video, fullscreen, the two dialogs)
- `src/motion.js`: flow field → box round the main motion, and the zoomed view that frames it
- `src/zoom.js`: zoom by cropping the video (`object-view-box`), the wheel, easing to the motion
- `src/flow.js`: onnxruntime-web, the model file (kept in IndexedDB), grabbing frame pairs, running the model
- `src/keys.js`: the speed keys, their table in the Speed keys dialog and the keyboard
- `src/library.js`: the folder, the misc/ files and the video list

## Known limits

- Firefox plays videos but can't zoom (no `object-view-box`) or run motion zoom (no WebGPU).
- Phone (HEVC) videos need Edge with the HEVC Video Extensions.
- Motion zoom sees all motion, not only people: a crowd moving behind the action widens the box.
- The model takes a fixed 768x432 picture; portrait videos are squeezed into it.
- Browsers can't reopen a folder by themselves: pick it again after a reload.
- The model file can't be chosen in fullscreen (a file chooser would end it): the first time, turn motion zoom on outside it.
- In the player's own fullscreen (its button or double-click), the speed and zoom messages don't show. Edge won't let
  the page swap it for its own fullscreen without a fresh click.
- After pressing Tab into the player's controls, the keys go to those controls until you click the video.

## Licence

[PolyForm Noncommercial 1.0.0](LICENSE): free to use, change and share for non-commercial purposes. For commercial
use, ask first: open an issue at [swaftmc/video-player](https://github.com/swaftmc/video-player/issues).

Not included here, and under their own licences: the NeuFlowV2 model (Apache-2.0) and onnxruntime-web (MIT), which
the page loads when motion zoom is used.
