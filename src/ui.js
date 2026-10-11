// Shared by the other scripts: the element lookup, the video, the message shown over it, clamp, fullscreen, dialogs.
"use strict";

const $ = id => document.getElementById(id);
const v = $("v");
const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));

let sayTimer = 0;
function say(text, ms = 1200) {
  const m = $("msg");
  m.textContent = text;
  m.hidden = false;
  clearTimeout(sayTimer);
  sayTimer = setTimeout(() => { m.hidden = true; }, ms);
}

// F and the Fullscreen button: the video area, so the messages over the video still show. The player's own button
// (and double-click) is the browser's fullscreen of the <video> alone: the keys work there, the messages can't show.
// (Edge refuses to swap that for the video area, as it needs a fresh click.)
function toggleFullscreen() {
  if (document.fullscreenElement) document.exitFullscreen();
  else $("stage").requestFullscreen().catch(e => say(`fullscreen refused: ${e.message}`, 3000));
}

// A click in the player's controls (seek bar, volume, its fullscreen button) leaves the focus inside them, where key
// presses never reach the page: hand it back to the video itself once the click, or the seek it made, is over.
// The seek bar's clicks don't reach the page at all, so its seeks are the cue for it.
const refocus = () => setTimeout(() => v.focus());
document.addEventListener("pointerup", e => { if (e.target === v) refocus(); }, true);
v.addEventListener("seeked", () => { if (document.activeElement === v) refocus(); });
document.addEventListener("fullscreenchange", () => { if (document.fullscreenElement === v) refocus(); });

$("bFull").onclick = toggleFullscreen;
$("bSettings").onclick = () => $("settings").showModal();
$("bHelp").onclick = () => $("help").showModal();

// Theme: auto follows the system; light / dark pin it (style.css reads data-theme). Saved in localStorage.
const THEMES = ["auto", "light", "dark"], THEME_SAVE = "video-viewer.theme";
function setTheme(t) {
  if (!THEMES.includes(t)) t = "auto";
  if (t === "auto") delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = t;
  for (const r of document.getElementsByName("theme")) r.checked = r.value === t;
  localStorage.setItem(THEME_SAVE, t);
}
for (const r of document.getElementsByName("theme")) r.addEventListener("change", () => setTheme(r.value));
setTheme(localStorage.getItem(THEME_SAVE));

// The sidebar's width: drag its edge (the sash), or arrow keys on it; double-click puts it back. Saved too.
const SIDE_MIN = 240, SIDE_MAX = 480, SIDE_DEFAULT = 260, SIDE_SAVE = "video-viewer.sidebar";
const sash = $("sash");
function setSide(px, save = true) {
  px = Math.round(clamp(px, SIDE_MIN, SIDE_MAX));
  document.body.style.setProperty("--side", `${px}px`);
  sash.setAttribute("aria-valuenow", px);
  if (save) localStorage.setItem(SIDE_SAVE, px);
}
sash.addEventListener("pointerdown", e => {
  if (e.button !== 0) return;
  e.preventDefault();
  sash.setPointerCapture(e.pointerId);
  document.body.classList.add("resizing");
});
sash.addEventListener("pointermove", e => { if (sash.hasPointerCapture(e.pointerId)) setSide(e.clientX, false); });
sash.addEventListener("lostpointercapture", () => {   // save where the drag left it (a plain click moves nothing)
  document.body.classList.remove("resizing");
  setSide(+sash.getAttribute("aria-valuenow"));
});
sash.addEventListener("dblclick", () => { setSide(SIDE_DEFAULT); localStorage.removeItem(SIDE_SAVE); });
sash.addEventListener("keydown", e => {
  const step = { ArrowLeft: -10, ArrowRight: 10 }[e.key];
  if (!step) return;
  e.preventDefault();
  setSide(+sash.getAttribute("aria-valuenow") + (e.shiftKey ? 5 * step : step));
});
setSide(+localStorage.getItem(SIDE_SAVE) || SIDE_DEFAULT, false);
