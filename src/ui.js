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
