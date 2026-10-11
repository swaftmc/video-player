// Speed keys: [key, speed] pairs, edited in the Speed keys dialog and saved in localStorage; the other keys are fixed.
"use strict";

const DEFAULT_KEYS = [["1", 0.25], ["2", 0.5], ["3", 1], ["4", 2], ["5", 3]];
const FIXED = { z: "motion zoom", 0: "reset zoom", f: "fullscreen", "?": "the keys list", " ": "play / pause" };
const MIN_RATE = 0.0625, MAX_RATE = 16;   // the playbackRate range Chromium accepts
const KEYS_SAVE = "video-viewer.keys";
let keys = loadKeys(), capturing = -1;

function loadKeys() {     // the saved pairs, or the defaults if there are none or they don't make sense
  try {
    const k = JSON.parse(localStorage.getItem(KEYS_SAVE));
    if (Array.isArray(k) && k.every(p => Array.isArray(p) && typeof p[0] === "string" && p[0].length === 1 &&
        !(p[0] in FIXED) && Number.isFinite(p[1]) && p[1] >= MIN_RATE && p[1] <= MAX_RATE)) return k;
  } catch (_) { /* unreadable: the defaults */ }
  return DEFAULT_KEYS.map(p => [...p]);
}

function saveKeys() {
  localStorage.setItem(KEYS_SAVE, JSON.stringify(keys.filter(p => p[0])));   // not a new row still waiting for its key
  renderKeys();
}

function renderKeys() {
  const table = $("keys");
  table.textContent = "";
  keys.forEach(([k, rate], i) => {
    const tr = table.insertRow();
    const key = Object.assign(document.createElement("button"), { className: "btn key", textContent: capturing === i ? "press a key…" : k.toUpperCase() });
    key.title = "change this key";
    key.onclick = () => { capturing = i; renderKeys(); };
    const speed = Object.assign(document.createElement("input"), { type: "number", step: "0.05", min: MIN_RATE, max: MAX_RATE, value: rate });
    speed.setAttribute("aria-label", `speed for key ${k.toUpperCase()}`);
    speed.onchange = () => {
      const r = +speed.value;
      if (r >= MIN_RATE && r <= MAX_RATE) { keys[i][1] = r; saveKeys(); } else speed.value = keys[i][1];
    };
    const del = Object.assign(document.createElement("button"), { className: "btn icon x", title: "remove this key",
      innerHTML: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>' });
    del.setAttribute("aria-label", "remove this key");
    del.onclick = () => { keys.splice(i, 1); capturing = -1; saveKeys(); };
    tr.insertCell().append(key);
    tr.insertCell().append(speed, "x");
    tr.insertCell().append(del);
  });
  $("helpSpeeds").textContent = keys.filter(p => p[0]).map(([k, r]) => `${k.toUpperCase()} ${r}x`).join(" · ");
  showRate();
}

function showRate() {     // light the key of the speed playing now
  [...$("keys").rows].forEach((tr, i) => tr.classList.toggle("on", keys[i]?.[1] === v.playbackRate));
}

function stopCapture() {
  if (capturing >= 0 && !keys[capturing][0]) keys.splice(capturing, 1);   // a new row that never got its key
  capturing = -1;
}

function capture(e) {     // the key pressed for the row being changed
  e.preventDefault();
  const k = e.key.toLowerCase(), i = capturing;
  if (e.key === "Escape") stopCapture();
  else if (k.length !== 1 || e.ctrlKey || e.altKey || e.metaKey) return say("press a single key (Esc cancels)", 2000);
  else if (k in FIXED) return say(`${k === " " ? "Space" : k.toUpperCase()} is ${FIXED[k]}`, 2000);
  else if (keys.some((p, j) => j !== i && p[0] === k)) return say(`${k.toUpperCase()} is already a speed key`, 2000);
  else { keys[i][0] = k; capturing = -1; saveKeys(); return; }
  renderKeys();
}

addEventListener("keydown", e => {
  if (capturing >= 0) return capture(e);
  if (e.ctrlKey || e.metaKey || e.altKey || document.querySelector("dialog[open]") ||   // an open dialog has the keys
      e.target.matches("input[type=number], input[type=text], select, textarea")) return;
  const k = e.key.toLowerCase();
  if (k === " ") {        // a focused video, button or switch handles Space itself
    if (e.target !== document.body) return;
    v.paused ? v.play() : v.pause();
  } else if (k === "z") setMotion(!motionOn);
  else if (k === "0") { motionOn ? setMotion(false) : resetZoom(); say("zoom reset"); }
  else if (k === "f") toggleFullscreen();
  else if (k === "?") $("help").showModal();
  else {
    const hit = keys.find(p => p[0] === k);
    if (!hit) return;
    v.playbackRate = v.defaultPlaybackRate = hit[1];   // the default carries the speed to the next video
    say(`${hit[1]}x`);
  }
  e.preventDefault();
}, true);

$("addKey").onclick = () => { keys.push(["", 1]); capturing = keys.length - 1; renderKeys(); };
$("resetKeys").onclick = () => { keys = DEFAULT_KEYS.map(p => [...p]); capturing = -1; saveKeys(); };
$("settings").addEventListener("close", () => { if (capturing >= 0) { stopCapture(); renderKeys(); } });
v.addEventListener("ratechange", showRate);
renderKeys();
