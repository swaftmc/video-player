// Self-check of src/keymap.js, the key names and the saved key list: `node check_keys.mjs`
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInThisContext } from "node:vm";

runInThisContext(readFileSync(new URL("src/keymap.js", import.meta.url), "utf8"));
const ev = (key, mods = {}) => ({ key, ctrlKey: false, altKey: false, shiftKey: false, metaKey: false, ...mods });

// key names: Shift is named for letters and named keys, not for symbols that already include it
assert.equal(combo(ev("z")), "z");
assert.equal(combo(ev("Z", { shiftKey: true })), "shift+z");
assert.equal(combo(ev("A")), "a", "Caps Lock alone is still the plain letter");
assert.equal(combo(ev("?", { shiftKey: true })), "?", "? is Shift+/ already");
assert.equal(combo(ev("ArrowRight", { shiftKey: true })), "shift+arrowright");
assert.equal(combo(ev(" ", { shiftKey: true })), "shift+ ");
assert.equal(combo(ev("2", { ctrlKey: true, altKey: true })), "ctrl+alt+2");
assert.equal(combo(ev("Shift", { shiftKey: true })), "", "a modifier alone is no key");
assert.equal(combo(ev("Control", { ctrlKey: true })), "");

// labels
assert.equal(label(" "), "Space");
assert.equal(label("shift+arrowright"), "Shift+→");
assert.equal(label("ctrl+alt+2"), "Ctrl+Alt+2");
assert.equal(label("ctrl++"), "Ctrl++");
assert.equal(label("pagedown"), "Pagedown");
assert.equal(label("meta+k"), "Win+K");
assert.equal(label(""), "(none)");

// Esc and Tab (with or without modifiers) can't be used
for (const k of ["escape", "tab", "shift+tab", "ctrl+escape", "unidentified", "", null]) assert.equal(usable(k), false, String(k));
for (const k of ["z", " ", "shift+tab+", "ctrl++", "f1", "backspace"]) assert.equal(usable(k), true, k);

// values
assert.ok(validValue("rate", 0.25) && !validValue("rate", 0) && !validValue("rate", 20));
assert.ok(validValue("step", -10) && !validValue("step", 1.5) && !validValue("step", 0));
assert.ok(validValue("skip", -2.5) && !validValue("skip", 0) && !validValue("skip", NaN));

// the saved list: bad entries go, a repeated key keeps its first action, all-bad gives the defaults, empty stays
assert.deepEqual(cleanBindings([["z", "motion"], ["z", "play"], ["q", "rate", 99], ["tab", "play"], ["x", "nope"],
  ["k", "play", 3], ["j", "skip", -10], "junk"]), [["z", "motion"], ["j", "skip", -10]]);
assert.deepEqual(cleanBindings([["escape", "play"]]), defaultBindings());
assert.deepEqual(cleanBindings([]), []);
assert.equal(new Set(DEFAULT_BINDINGS.map(b => b[0])).size, DEFAULT_BINDINGS.length, "the defaults use each key once");
assert.ok(DEFAULT_BINDINGS.every(validBinding), "the defaults are all valid");

// speed keys saved by 1.0 - 1.1 become the full list: those speeds, then the other defaults
const old = fromOldSpeedKeys([["q", 0.25], ["2", 0.5], ["x", 2]]);
assert.deepEqual(old.filter(b => b[1] === "rate"), [["q", "rate", 0.25], ["2", "rate", 0.5], ["x", "rate", 2]]);
assert.deepEqual(old.filter(b => b[1] !== "rate"), DEFAULT_BINDINGS.filter(b => b[1] !== "rate"));
assert.deepEqual(fromOldSpeedKeys([]), DEFAULT_BINDINGS.filter(b => b[1] !== "rate"), "no speed keys stays no speed keys");
assert.deepEqual(fromOldSpeedKeys([["z", 1]]), defaultBindings(), "nothing usable: the defaults");

// assign: the key moves, and what it did before is reported
const list = defaultBindings();
const moved = assign(list, list.findIndex(b => b[1] === "help"), "z");
assert.deepEqual(moved, [["z", "motion"]]);
assert.deepEqual(list.find(b => b[0] === "z"), ["z", "help"]);
assert.equal(list.filter(b => b[0] === "z").length, 1);
assert.equal(list.some(b => b[1] === "motion"), false, "motion zoom lost its only key");
assert.deepEqual(assign(list, 0, "1"), [], "a key given to its own binding moves nothing");

// descriptions
assert.equal(describe(["shift+arrowright", "step", 10]), "10 frames forward");
assert.equal(describe(["arrowleft", "step", -1]), "1 frame back");
assert.equal(describe(["j", "skip", -10]), "10 s back");
assert.equal(describe(["1", "rate", 0.25]), "0.25x speed");
console.log("keymap.js: all checks pass");
