// The keyboard: the key list (keymap.js) edited in Settings and saved in localStorage, the keys list in help, and
// running the action of the key pressed.
"use strict";

const KEYS_SAVE = "video-viewer.bindings", OLD_KEYS_SAVE = "video-viewer.keys";   // the old one: speed keys of 1.0 - 1.1
let bindings = loadBindings(), capturing = -1;

function loadBindings() {
  try {
    const saved = JSON.parse(localStorage.getItem(KEYS_SAVE));
    if (Array.isArray(saved)) return cleanBindings(saved);
    const old = JSON.parse(localStorage.getItem(OLD_KEYS_SAVE));
    if (Array.isArray(old)) return fromOldSpeedKeys(old);
  } catch (_) { /* unreadable: the defaults */ }
  return defaultBindings();
}

function saveKeys(focus = -1) {
  localStorage.setItem(KEYS_SAVE, JSON.stringify(bindings.filter(b => b[0])));   // not a new row still without a key
  localStorage.removeItem(OLD_KEYS_SAVE);
  renderKeys(focus);
}

const keyOf = action => bindings.find(b => b[0] && b[1] === action)?.[0] ?? "";
const svgX = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';

function renderKeys(focus = -1) {
  const table = $("keys");
  table.textContent = "";
  bindings.forEach((b, i) => {
    const [k, action, x] = b, a = ACTIONS[action], tr = table.insertRow();
    const key = Object.assign(document.createElement("button"), { className: `btn key${capturing === i ? " wait" : ""}`,
      textContent: capturing === i ? "press a key…" : k ? label(k) : "set key" });
    key.title = capturing === i ? "press the new key (Esc cancels)" : "change this key";
    key.onclick = () => { capturing = capturing === i ? -1 : i; note(capturing === i ? "Press the new key. Esc cancels." : ""); renderKeys(i); };
    const pick = document.createElement("select");
    pick.setAttribute("aria-label", `action for ${label(k)}`);
    for (const [name, def] of Object.entries(ACTIONS)) pick.add(new Option(def.label, name, false, name === action));
    pick.onchange = () => {
      b[1] = pick.value;
      b.length = 2;
      if (ACTIONS[pick.value].unit) b[2] = ACTIONS[pick.value].def;
      saveKeys();
    };
    tr.insertCell().append(key);
    tr.insertCell().append(pick);
    const cell = tr.insertCell();
    if (a.unit) {
      const val = Object.assign(document.createElement("input"), { type: "number", step: a.inc, min: a.min, max: a.max, value: x });
      val.setAttribute("aria-label", `${a.label.toLowerCase()} for ${label(k)} (${a.unit})`);
      val.onchange = () => {
        const n = +val.value;
        if (validValue(action, n)) { b[2] = n; saveKeys(); } else val.value = b[2];
      };
      cell.append(val, ` ${a.unit}`);
    }
    const del = Object.assign(document.createElement("button"), { className: "btn icon x", title: "remove this key", innerHTML: svgX });
    del.setAttribute("aria-label", `remove ${label(k)}`);
    del.onclick = () => { bindings.splice(i, 1); capturing = -1; note(""); saveKeys(); };
    tr.insertCell().append(del);
  });
  if (focus >= 0) table.rows[focus]?.querySelector(".key")?.focus();
  showRate();
  renderHelp();
  // the key hints next to the switch and the buttons follow the keys
  const hint = (el, action) => { const k = keyOf(action); el.textContent = k ? label(k) : ""; el.hidden = !k; };
  hint($("motionKey"), "motion");
  hint($("fullKey"), "fullscreen");
  const inBrackets = action => (keyOf(action) ? ` (${label(keyOf(action))})` : "");
  $("motionLabel").title = `Zoom onto the motion${inBrackets("motion")}`;
  $("bFull").title = `Fullscreen${inBrackets("fullscreen")}`;
  $("bHelp").title = `Keys and help${inBrackets("help")}`;
}

function renderHelp() {      // one row per action that has keys, in the order of ACTIONS
  const body = $("helpKeys");
  body.textContent = "";
  const kbd = k => Object.assign(document.createElement("kbd"), { textContent: label(k) });
  for (const [action, a] of Object.entries(ACTIONS)) {
    const mine = bindings.filter(b => b[0] && b[1] === action);
    if (!mine.length) continue;
    const tr = body.insertRow(), left = tr.insertCell(), right = tr.insertCell();
    if (a.unit) {            // Speed / Frame step / Skip: each key with what it does
      left.textContent = a.label;
      mine.forEach((b, j) => right.append(j ? " · " : "", kbd(b[0]), ` ${describe(b)}`));
    } else {
      mine.forEach((b, j) => left.append(j ? " " : "", kbd(b[0])));
      right.textContent = describe(mine[0]);
      if (action === "fullscreen") right.append(". The player's own button and double-click work too, but there the speed and zoom messages don't show.");
    }
  }
}

function note(text) { $("keysNote").textContent = text; }

function showRate() {     // light the speed keys of the speed playing now
  [...$("keys").rows].forEach((tr, i) => tr.classList.toggle("on", bindings[i]?.[1] === "rate" && bindings[i][2] === v.playbackRate));
}

function stopCapture() {
  if (capturing >= 0 && !bindings[capturing][0]) bindings.splice(capturing, 1);   // a new row that never got its key
  capturing = -1;
}

function capture(e) {     // the next key pressed becomes the key of row `capturing`
  e.preventDefault();
  if (e.key === "Escape") { const i = capturing; stopCapture(); note(""); return renderKeys(bindings[i] ? i : -1); }
  const k = combo(e);
  if (!k) return;         // a modifier alone: wait for the key it goes with
  if (!usable(k)) return note(`${label(baseKey(k))} can't be used: it ${baseKey(k) === "tab" ? "moves between controls" : "can't be told apart"}. Press another key (Esc cancels).`);
  const b = bindings[capturing], moved = assign(bindings, capturing, k);   // rows above it can go: follow the row itself
  capturing = -1;
  note(moved.length ? `${label(k)} moved here from “${describe(moved[0])}”.` : `${label(k)}: ${describe(b)}.`);
  saveKeys(bindings.indexOf(b));
}

function run([, action, x]) {
  if (action === "rate") { v.playbackRate = v.defaultPlaybackRate = x; say(`${x}x`); }   // the default carries it on
  else if (action === "play") v.paused ? v.play().catch(() => { /* no video yet */ }) : v.pause();
  else if (action === "step") step(x);
  else if (action === "skip") skip(x);
  else if (action === "motion") setMotion(!motionOn);
  else if (action === "zoomreset") { motionOn ? setMotion(false) : resetZoom(); say("zoom reset"); }
  else if (action === "fullscreen") toggleFullscreen();
  else if (action === "help") $("help").showModal();
}

addEventListener("keydown", e => {
  if (capturing >= 0) return capture(e);
  if (document.querySelector("dialog[open]") || e.target.matches("input[type=number], input[type=text], select, textarea")) return;
  const k = combo(e), hit = k && bindings.find(b => b[0] === k);
  if (!hit) {             // the player's own Space / ← / → (seek ~1 %) on the focused video: off, so a moved key stops
    if (e.target === v && [" ", "arrowleft", "arrowright"].includes(k)) e.preventDefault();
    return;
  }
  if (e.target === sash && /^(shift\+)?arrow(left|right)$/.test(k)) return;   // there the arrows resize the sidebar
  if ((k === " " || k === "enter") && e.target !== document.body && e.target !== v) return;   // a focused button presses itself
  e.preventDefault();     // also keeps the player's own keys (Space, arrows) from acting twice
  run(hit);
}, true);

$("addKey").onclick = () => {
  bindings.push(["", "rate", ACTIONS.rate.def]);
  capturing = bindings.length - 1;
  note("Press the key for the new row, then pick what it does. Esc cancels.");
  renderKeys(capturing);
};
$("resetKeys").onclick = () => { bindings = defaultBindings(); capturing = -1; note("All keys are back to the defaults."); saveKeys(); };
// A click anywhere else in Settings ends setting a key; a new row without a key stays, to set after picking its
// action. The button changes in place: rebuilding the table here would take away what the click is landing on.
$("settings").addEventListener("pointerdown", e => {
  const w = $("keys").querySelector(".key.wait");
  if (capturing < 0 || !w || e.target.closest(".key.wait")) return;
  const k = bindings[capturing][0];
  capturing = -1;
  note("");
  w.classList.remove("wait");
  w.textContent = k ? label(k) : "set key";
  w.title = "change this key";
}, true);
$("settings").addEventListener("close", () => {
  capturing = -1;
  bindings = bindings.filter(b => b[0]);
  note("");
  renderKeys();
});
v.addEventListener("ratechange", showRate);
renderKeys();
