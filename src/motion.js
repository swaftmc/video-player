// Where the frame moves: the box around the main motion in an optical-flow field, and the view that frames it.
// Pure functions (no page needed): check_motion.mjs runs them in Node.
"use strict";

const STEP = 4;           // sample every 4th flow pixel each way (192 x 108 samples at 768 x 432)
const EDGE = 0.04;        // skip this share of the frame at each edge: the flow there is unreliable when the camera pans
const MIN_MOVE = 1;       // flow px: slower motion (after removing the camera's) is noise
const MAIN = 0.3;         // a sample moves if it is at least this share of the 98th-percentile motion
const MIN_SHARE = 0.002;  // fewer moving samples than this share of the frame: nothing moves
const TRIM = 0.02;        // the box spans the 2nd to 98th percentile of the moving samples, so strays don't widen it

const quantile = (sorted, q) => sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))];
const sorted = a => Float32Array.from(a).sort();

// flow: [dx plane, dy plane] of W x H flow px. Returns [x0, y0, x1, y1] as shares of the frame, or null if nothing moves.
function motionBox(flow, W, H) {
  const N = W * H, xs = [], ys = [], dx = [], dy = [], ex = Math.ceil(EDGE * W), ey = Math.ceil(EDGE * H);
  for (let y = ey + (STEP >> 1); y < H - ey; y += STEP) {
    for (let x = ex + (STEP >> 1); x < W - ex; x += STEP) {
      xs.push(x); ys.push(y); dx.push(flow[y * W + x]); dy.push(flow[N + y * W + x]);
    }
  }
  // the median motion is the camera's own (pan, shake): most of the frame is background
  const mx = quantile(sorted(dx), 0.5), my = quantile(sorted(dy), 0.5);
  const move = dx.map((d, i) => Math.hypot(d - mx, dy[i] - my));
  const gate = Math.max(MIN_MOVE, MAIN * quantile(sorted(move), 0.98));
  const mxs = [], mys = [];
  move.forEach((m, i) => { if (m >= gate) { mxs.push(xs[i]); mys.push(ys[i]); } });
  if (mxs.length < MIN_SHARE * move.length) return null;
  const sx = sorted(mxs), sy = sorted(mys), h = STEP / 2;    // each sample stands for the STEP x STEP square round it
  return [Math.max(0, quantile(sx, TRIM) - h) / W, Math.max(0, quantile(sy, TRIM) - h) / H,
          Math.min(W, quantile(sx, 1 - TRIM) + h) / W, Math.min(H, quantile(sy, 1 - TRIM) + h) / H];
}

// The view [x, y, w] (shares of the frame; it keeps the video's shape, so w is its share of both width and height)
// centred on box, `room` times the box's size, zoomed in at most maxZoom, inside the frame.
function fitBox(box, room, maxZoom) {
  const [x0, y0, x1, y1] = box;
  const w = Math.min(1, Math.max(1 / maxZoom, room * Math.max(x1 - x0, y1 - y0)));
  const at = c => Math.min(1 - w, Math.max(0, c - w / 2));
  return [at((x0 + x1) / 2), at((y0 + y1) / 2), w];
}
