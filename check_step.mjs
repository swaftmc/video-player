// Self-check of src/frames.js, the frame-step maths: `node check_step.mjs`
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInThisContext } from "node:vm";

runInThisContext(readFileSync(new URL("src/frames.js", import.meta.url), "utf8"));
const d = 1 / 30, near = (a, b, what) => assert.ok(Math.abs(a - b) < 1e-9, `${what}: got ${a}, want ${b}`);

// the frame length from the times of the frames shown: the shortest valid gap wins
const shown = [1, 1 + d, 1 + 3 * d /* a dropped frame */, 1 + 3 * d /* the same frame again */, 1 + 4 * d,
               20 /* a seek forward */, 20 + d, 5 /* a seek back */, 5 + d];
let prev = -1, best = 0;
for (const t of shown) { const g = validGap(prev, t); if (g) best = best ? Math.min(best, g) : g; prev = t; }
near(best, d, "frame length from a messy run of frame times");
assert.equal(validGap(-1, 3), 0, "the first frame has no gap");
assert.equal(validGap(3, 3), 0, "the same frame again is no gap");
assert.equal(validGap(3, 2), 0, "a seek back is no gap");
assert.equal(validGap(3, 3 + 1 / 1000), 0, "a gap below a frame at 240 fps is noise");

// steps: one frame on, ten on and ten back give the start again, and the ends hold
near(stepFrom(1, 1, d, 46), 1 + d, "one frame forward");
near(stepFrom(1, -1, d, 46), 1 - d, "one frame back");
let t = 1;
for (let i = 0; i < 10; i++) t = stepFrom(t, 1, d, 46);
near(t, 1 + 10 * d, "ten frames forward");
for (let i = 0; i < 10; i++) t = stepFrom(t, -1, d, 46);
near(t, 1, "ten forward and ten back");
assert.equal(stepFrom(0, -1, d, 46), 0, "the first frame holds");
near(stepFrom(46 - d, 1, d, 46), 46 - d, "the last frame holds");
near(stepFrom(46 - d / 2, 1, d, 46), 46 - d, "a base past the last frame start comes back to it");
assert.equal(stepFrom(0, 1, 50, 10), 0, "a clip shorter than a frame stays at 0");
console.log("frames.js: all checks pass");
