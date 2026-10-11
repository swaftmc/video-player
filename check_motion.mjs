// Self-check of src/motion.js on made-up flow fields: `node check_motion.mjs`
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInThisContext } from "node:vm";

runInThisContext(readFileSync(new URL("src/motion.js", import.meta.url), "utf8"));
const W = 768, H = 432;
// a flow field: (bx, by) everywhere (the camera), plus (dx, dy) more inside [x0, x1) x [y0, y1)
function field(bx, by, patch) {
  const f = new Float32Array(2 * W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x, on = patch && x >= patch[0] && x < patch[2] && y >= patch[1] && y < patch[3];
    f[i] = bx + (on ? patch[4] : 0) + 0.2 * Math.sin(x * 0.7 + y);   // a little noise, as a real model gives
    f[W * H + i] = by + (on ? patch[5] : 0) + 0.2 * Math.cos(x + y * 0.3);
  }
  return f;
}
const near = (got, want, tol, what) => got.forEach((g, i) => assert.ok(Math.abs(g - want[i]) <= tol, `${what}: got [${got}], want [${want}]`));
const box = p => [p[0] / W, p[1] / H, p[2] / W, p[3] / H];
const tol = 6 / H;   // a sample step and a bit, as a share of the frame

// something moving on a still camera: the box is round it
const still = [400, 200, 500, 280, 8, 4];
near(motionBox(field(0, 0, still), W, H), box(still), tol, "moving patch, still camera");
// the same patch while the camera pans: the pan is removed, the patch still found
near(motionBox(field(5, -3, still), W, H), box(still), tol, "moving patch, panning camera");
// only the camera moves, or nothing does: no box
assert.equal(motionBox(field(5, -3), W, H), null, "a pan alone is not motion");
assert.equal(motionBox(field(0, 0), W, H), null, "noise alone is not motion");
// the main motion wins over a slower one
const fast = [60, 60, 160, 160, 20, 0];
const f = field(0, 0, fast);
for (let y = 300; y < 400; y++) for (let x = 600; x < 700; x++) f[y * W + x] += 2;   // slow, 10 % of the fast one
near(motionBox(f, W, H), box(fast), tol, "fast patch over a slow one");
// a strip of bad flow down the left edge (new picture coming in as the camera pans) does not widen the box
const g = field(5, 0, still);
for (let y = 0; y < H; y++) for (let x = 0; x < 20; x++) g[y * W + x] += 15;
near(motionBox(g, W, H), box(still), tol, "edge strip ignored");

// fitBox: centred, `room` times the box, at most maxZoom, inside the frame
near(fitBox([0.4, 0.4, 0.5, 0.45], 1.5, 4), [0.325, 0.3, 0.25], 1e-9, "small box: the max zoom");
near(fitBox([0.2, 0.2, 0.6, 0.5], 1.5, 4), [0.1, 0.05, 0.6], 1e-9, "the larger side sets the size");
near(fitBox([0.9, 0.9, 1, 1], 1.5, 4), [0.75, 0.75, 0.25], 1e-9, "a corner box stays inside the frame");
near(fitBox([0, 0, 1, 1], 1.5, 4), [0, 0, 1], 1e-9, "a whole-frame box: no zoom");
console.log("motion.js: all checks pass");
