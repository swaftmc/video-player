// Arrow keys: one frame back / forward. A and D: 5 seconds back / forward. The frame length is measured while the video
// plays (frames.js); a step seeks to the middle of the wanted frame, so rounding can't skip or repeat one.
"use strict";

const GAPS_NEEDED = 5;    // frame gaps seen while playing before the frame length is trusted
const SKIP = 5;           // seconds for A and D
let frameLen = 0, gaps = 0, lastT = -1, shownT = -1, pending = null, pendingTimer = 0, measuring = false;
// shownT: the time of the frame on screen. pending: the frame a step is heading for, so steps pressed before it
// arrives (a held key) go on from there instead of from the old frame.

function onShown(_, meta) {
  v.requestVideoFrameCallback(onShown);
  const g = validGap(lastT, meta.mediaTime);
  if (g) {
    frameLen = frameLen ? Math.min(frameLen, g) : g;
    if (!v.paused) gaps++;                    // only frames shown one after the other count as evidence
  }
  lastT = shownT = meta.mediaTime;
  if (pending !== null && Math.abs(shownT - pending) < frameLen / 2) pending = null;   // arrived
}

v.addEventListener("loadstart", () => { frameLen = gaps = 0; lastT = shownT = -1; pending = null; });
v.requestVideoFrameCallback(onShown);

async function measure() {   // a step before any playback: play a few frames muted at normal speed, then stop
  measuring = true;
  const { muted, playbackRate } = v;
  v.muted = true;
  v.playbackRate = 1;
  let ok = false;
  try {
    await v.play();
    for (let t0 = performance.now(); !(ok = gaps >= GAPS_NEEDED) && performance.now() - t0 < 2000;) {
      await new Promise(r => setTimeout(r, 30));
    }
  } catch (_) { /* play refused: no measurement */ }
  v.pause();
  v.muted = muted;
  v.playbackRate = playbackRate;
  measuring = false;
  return ok;
}

async function step(dir) {
  if (!v.videoWidth || shownT < 0 || measuring) return;
  const base = pending ?? shownT;            // before measure(), which plays on
  v.pause();
  if (gaps < GAPS_NEEDED && !(await measure())) return say("can't tell this video's frame rate", 2500);
  const next = stepFrom(base, dir, frameLen, v.duration);
  if (Math.abs(next - base) < frameLen / 2) return;       // already on the first / last frame
  pending = next;
  clearTimeout(pendingTimer);
  pendingTimer = setTimeout(() => { pending = null; }, 1000);   // in case the frame never shows (variable frame rate)
  v.currentTime = next + frameLen / 2;
  say(`${next.toFixed(2)} s`, 700);
}

function skip(dir) {
  if (!v.videoWidth) return;
  pending = null;
  v.currentTime = clamp(v.currentTime + dir * SKIP, 0, v.duration);
  say(`${dir > 0 ? "+" : "−"}${SKIP} s`, 700);
}
