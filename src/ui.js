// Shared by the other scripts: the element lookup, the video, the message shown over it, clamp.
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
