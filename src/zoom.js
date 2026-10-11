// Zoom by cropping the video with object-view-box (the controls stay full size). The wheel zooms at the cursor;
// with motion zoom on it makes the framing tighter or looser, and the view eases to fitBox's view of the motion.
"use strict";

const MAX_ZOOM = 4;
const EASE = 0.5;         // seconds for the view to go ~63 % of the way to the motion's view
const canZoom = CSS.supports("object-view-box", "inset(0%)");
let view = [0, 0, 1];     // [x, y, w] shares of the frame, as fitBox returns
let goal = null, lastBox = null, room = 1.5, raf = 0, tPrev = 0;

function setView(x, y, w) {
  w = clamp(w, 1 / MAX_ZOOM, 1);
  view = [clamp(x, 0, 1 - w), clamp(y, 0, 1 - w), w];
  const p = n => `${(100 * n).toFixed(3)}%`;
  [x, y] = view;
  v.style.objectViewBox = w >= 1 ? "" : `inset(${p(y)} ${p(1 - x - w)} ${p(1 - y - w)} ${p(x)})`;
}

function resetZoom() {
  goal = lastBox = null;
  setView(0, 0, 1);
}

function follow(box) {    // motion zoom: a new box from the model (null: nothing moved, keep the last one)
  if (box) lastBox = box;
  aim();
}

function aim() {
  if (!lastBox) return;
  goal = fitBox(lastBox, room, MAX_ZOOM);
  if (!raf) { tPrev = performance.now(); raf = requestAnimationFrame(ease); }
}

function ease(now) {
  raf = 0;
  if (!goal) return;
  const a = 1 - Math.exp(-(now - tPrev) / 1000 / EASE);
  tPrev = now;
  setView(...view.map((c, i) => c + (goal[i] - c) * a));
  if (view.some((c, i) => Math.abs(goal[i] - c) > 1e-4)) raf = requestAnimationFrame(ease);
}

v.addEventListener("wheel", e => {
  if (!v.videoWidth) return;
  e.preventDefault();
  if (!canZoom) return say("zooming needs Edge or Chrome", 2500);
  const k = e.deltaY < 0 ? 1.25 : 1 / 1.25;
  if (motionOn) {
    room = clamp(room / k, 0.8, 4);
    say(`motion zoom ${k > 1 ? "tighter" : "looser"}`);
    return aim();
  }
  // the cursor as a share of the picture shown (object-fit: contain centres it in the element)
  const r = v.getBoundingClientRect(), s = Math.min(r.width / v.videoWidth, r.height / v.videoHeight);
  const u = clamp((e.clientX - r.left - (r.width - v.videoWidth * s) / 2) / (v.videoWidth * s), 0, 1);
  const t = clamp((e.clientY - r.top - (r.height - v.videoHeight * s) / 2) / (v.videoHeight * s), 0, 1);
  const [x, y, w] = view, w2 = clamp(w / k, 1 / MAX_ZOOM, 1);
  setView(x + u * (w - w2), y + t * (w - w2), w2);   // the point under the cursor stays put
}, { passive: false });
