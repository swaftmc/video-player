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

// The video area alone goes fullscreen (not the <video>), so the messages still show and the page still gets the keys;
// the video's own fullscreen button is hidden (controlslist) for the same reason.
function toggleFullscreen() {
  if (document.fullscreenElement) document.exitFullscreen();
  else $("stage").requestFullscreen().catch(e => say(`fullscreen refused: ${e.message}`, 3000));
}

$("bFull").onclick = toggleFullscreen;
v.addEventListener("dblclick", toggleFullscreen);
$("bSettings").onclick = () => $("settings").showModal();
$("bHelp").onclick = () => $("help").showModal();
