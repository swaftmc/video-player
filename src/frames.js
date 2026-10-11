// Frame-step maths (pure: check_step.mjs runs it in Node). A browser doesn't report a video's frame rate, so the
// frame length is the shortest gap seen between the times of two frames shown one after the other.
"use strict";

const MIN_GAP = 1 / 240;   // a shorter gap between two frames' times is rounding noise, not a frame

// The gap from the frame at time prev (-1: none yet) to the one at time t, or 0 if it isn't a frame-to-frame gap
// (the same frame again, a seek backwards). A longer gap (a dropped frame, a seek forward) can't lower the shortest.
function validGap(prev, t) {
  return prev >= 0 && t - prev >= MIN_GAP ? t - prev : 0;
}

// The start time of the frame a step lands on: one frame (d seconds) from base, kept inside the video.
function stepFrom(base, dir, d, duration) {
  return Math.min(Math.max(0, duration - d), Math.max(0, base + dir * d));
}
