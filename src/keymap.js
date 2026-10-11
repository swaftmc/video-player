// The keys: what each action is, the default keys, key names, and checking the saved list (pure: check_keys.mjs runs
// it in Node). A binding is [key, action] or [key, action, value]; a key is a name such as "z", "shift+arrowright",
// "ctrl+2" or " " (Space), from combo().
"use strict";

// value: the unit shown after the number, its range, whether it must be a whole number, a new key's value
const ACTIONS = {
  rate: { label: "Speed", unit: "x", min: 0.0625, max: 16, def: 1.5, inc: 0.05 },   // Chromium's playbackRate range
  play: { label: "Play / pause" },
  step: { label: "Frame step", unit: "frames", min: -1000, max: 1000, def: 1, inc: 1, whole: true },
  skip: { label: "Skip", unit: "s", min: -3600, max: 3600, def: 10, inc: 1 },
  motion: { label: "Motion zoom on / off" },
  zoomreset: { label: "Reset zoom" },
  fullscreen: { label: "Fullscreen" },
  help: { label: "Keys list" },
};
const DEFAULT_BINDINGS = [
  ["1", "rate", 0.25], ["2", "rate", 0.5], ["3", "rate", 1], ["4", "rate", 2], ["5", "rate", 3],
  [" ", "play"], ["arrowleft", "step", -1], ["arrowright", "step", 1], ["a", "skip", -5], ["d", "skip", 5],
  ["z", "motion"], ["0", "zoomreset"], ["f", "fullscreen"], ["?", "help"],
];
const MODIFIER_KEYS = ["control", "shift", "alt", "altgraph", "meta", "os", "capslock", "numlock", "fn"];
const defaultBindings = () => DEFAULT_BINDINGS.map(b => [...b]);

// The name of the key pressed (e: a keydown event), "" for a modifier alone. Shift is part of the name for letters
// and named keys (Shift+A, Shift+→); for symbols it's already in the character ("?" is Shift+/).
function combo(e) {
  const k = e.key.toLowerCase();
  if (MODIFIER_KEYS.includes(k)) return "";
  const shift = e.shiftKey && (/^[a-z]$/.test(k) || k.length > 1 || k === " ");
  return (e.ctrlKey ? "ctrl+" : "") + (e.altKey ? "alt+" : "") + (shift ? "shift+" : "") + (e.metaKey ? "meta+" : "") + k;
}

const baseKey = k => k.replace(/^((?:ctrl|alt|shift|meta)\+)*/, "") || k;   // "ctrl++" -> "+"
// Esc cancels, closes dialogs and leaves fullscreen; Tab moves the focus: neither can do anything else
function usable(k) {
  return typeof k === "string" && k !== "" && !["escape", "tab", "unidentified", "dead", "process"].includes(baseKey(k));
}

function label(k) {           // "shift+arrowright" -> "Shift+→", " " -> "Space"
  if (!k) return "(none)";
  const named = { " ": "Space", arrowleft: "←", arrowright: "→", arrowup: "↑", arrowdown: "↓", escape: "Esc", meta: "Win" };
  const key = baseKey(k), mods = k.slice(0, k.length - key.length).split("+").filter(Boolean);
  const cap = s => named[s] ?? (s.length === 1 ? s.toUpperCase() : s[0].toUpperCase() + s.slice(1));
  return mods.map(m => `${cap(m)}+`).join("") + cap(key);
}

function validValue(action, x) {
  const a = ACTIONS[action];
  return Number.isFinite(x) && x >= a.min && x <= a.max && (!a.whole || Number.isInteger(x)) &&
    (action === "rate" || x !== 0);   // a step or skip of 0 does nothing
}

function validBinding(b) {
  if (!Array.isArray(b) || !usable(b[0]) || !(b[1] in ACTIONS)) return false;
  return ACTIONS[b[1]].unit ? b.length === 3 && validValue(b[1], b[2]) : b.length === 2;
}

// The saved list, cleaned: bad entries dropped, and a key used twice keeps its first action. A saved list with
// nothing usable left gives the defaults; a saved empty list stays empty (every key removed on purpose).
function cleanBindings(saved) {
  const seen = new Set(), out = [];
  for (const b of saved) if (validBinding(b) && !seen.has(b[0])) { seen.add(b[0]); out.push([...b]); }
  return out.length || !saved.length ? out : defaultBindings();
}

// Speed keys saved by 1.0 to 1.1 ([key, speed] pairs), as the full list: those, then the other default keys. Those
// versions only allowed one character that wasn't one of the other default keys, so nothing else can be in the way.
function fromOldSpeedKeys(old) {
  const others = DEFAULT_BINDINGS.filter(b => b[1] !== "rate"), fixed = new Set(others.map(b => b[0]));
  const seen = new Set(), rates = [];
  for (const p of old) {
    const b = Array.isArray(p) ? [p[0], "rate", p[1]] : null;
    if (b && typeof b[0] === "string" && b[0].length === 1 && !fixed.has(b[0]) && validBinding(b) && !seen.has(b[0])) {
      seen.add(b[0]);
      rates.push(b);
    }
  }
  if (old.length && !rates.length) return defaultBindings();   // nothing usable: the defaults
  return [...rates, ...others.map(b => [...b])];
}

// Key k for binding i. A key does one thing, so it leaves any other binding it had; those are returned.
function assign(list, i, k) {
  const moved = list.filter((b, j) => j !== i && b[0] === k);
  list[i][0] = k;
  for (let j = list.length - 1; j >= 0; j--) if (j !== i && list[j][0] === k) list.splice(j, 1);
  return moved;
}

function describe([, action, x]) {   // "0.25x speed", "10 frames back", "play / pause"
  const n = Math.abs(x), dir = x > 0 ? "forward" : "back";
  if (action === "rate") return `${x}x speed`;
  if (action === "step") return `${n} frame${n === 1 ? "" : "s"} ${dir}`;
  if (action === "skip") return `${n} s ${dir}`;
  return { play: "play / pause", motion: "motion zoom on / off", zoomreset: "reset the zoom", fullscreen: "fullscreen",
           help: "the keys list" }[action];
}
