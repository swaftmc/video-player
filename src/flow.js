// Motion zoom: NeuFlowV2 optical flow between two frames 0.1 s of video apart, run by onnxruntime-web on WebGPU
// (about 1 s per look on an Iris Xe), turned into a zoom box by motionBox. The model file is picked once and kept
// in IndexedDB; onnxruntime-web comes from jsDelivr, pinned to the hashes of its npm 1.30.0 tarball.
"use strict";

const ORT = "https://cdn.jsdelivr.net/npm/onnxruntime-web@1.30.0/dist/";
const ORT_JS = ["ort.webgpu.min.js", "sha384-6BOUZhMpgaXRZBIj89pTWET0c7xcMe1yHACreuaBy2kUZwLd2tzCmv7MzwZccHYH"];
const ORT_MJS = ["ort-wasm-simd-threaded.asyncify.mjs", "sha384-qViEcCGzsR/m8nlQwIsbYh7afN4thuraqFYDQY6huvmoLVoZq/eYawQ1wrv8nnhA"];
const ORT_WASM = ["ort-wasm-simd-threaded.asyncify.wasm", "sha384-EPVDLTxuO663dkZO/pcKJF6vOyyfq/5z9FY1oksN0UWFX2ABH4wDDZQHeNoUleWR"];
const FW = 768, FH = 432;   // the model's fixed input size
const GAP = 0.1;            // seconds of video between the two frames
let motionOn = false, session = null, sessionP = null, ortP = null, busy = false, first = null;
const grabCv = Object.assign(document.createElement("canvas"), { width: FW, height: FH });
const grabCtx = grabCv.getContext("2d", { willReadFrequently: true });

function status(text, needFile = false) {  // shown only while loading or after a problem; the sidebar hides in fullscreen
  $("motionState").textContent = text;
  $("motionState").hidden = !text;
  $("modelLabel").hidden = !needFile;
  if (text && document.fullscreenElement) say(text, 4000);
}
const fail = (text, needFile = false) => Object.assign(new Error(text), { needFile });

async function setMotion(on) {
  motionOn = $("motion").checked = on;
  first = null;
  if (!on) { resetZoom(); status(""); return; }
  try {
    if (!canZoom) throw fail("zooming needs Edge or Chrome");
    await (sessionP ??= openModel().catch(e => { sessionP = null; throw e; }));
    status("");
  } catch (e) {
    motionOn = $("motion").checked = false;
    status(e.message, e.needFile);
  }
}

function store(mode, op) {  // one request on the "files" store of this page's IndexedDB
  return new Promise((ok, err) => {
    const open = indexedDB.open("video-viewer", 1);
    open.onupgradeneeded = () => open.result.createObjectStore("files");
    open.onerror = () => err(open.error);
    open.onsuccess = () => {
      const db = open.result, r = op(db.transaction("files", mode).objectStore("files"));
      r.onsuccess = () => { db.close(); ok(r.result); };
      r.onerror = () => { db.close(); err(r.error); };
    };
  });
}

async function openModel() {
  if (!navigator.gpu) throw fail("motion zoom needs WebGPU (Edge or Chrome)");
  const kept = await store("readonly", s => s.get("model")), file = kept || $("modelPick").files[0];
  if (!file) {   // a file chooser would end fullscreen, so there only say what's needed
    const key = a => (keyOf(a) ? ` (${label(keyOf(a))})` : "");   // the keys as set in Settings
    if (document.fullscreenElement) throw fail(`motion zoom needs its model file once: leave fullscreen${key("fullscreen")}, then turn motion zoom on${key("motion")}`, true);
    $("modelPick").click();
    throw fail("choose the model file, neuflow_mixed.onnx (asked once)", true);
  }
  status("loading the model…");
  await (ortP ??= loadOrt().catch(e => { ortP = null; throw e; }));
  let s;
  try {
    s = await ort.InferenceSession.create(new Uint8Array(await file.arrayBuffer()), { executionProviders: ["webgpu"] });
  } catch (e) {
    $("modelPick").value = "";
    throw fail(`${file.name} did not load: ${e.message.split("\n")[0]}`, !kept);
  }
  // one run on blank frames: it compiles the GPU shaders (~20 s in a new browser profile, ~1 s after) and proves
  // the file takes two 768 x 432 frames before it is kept
  status("preparing the GPU (the first time takes up to half a minute)…");
  try {
    const blank = new ort.Tensor("float32", new Float32Array(3 * FW * FH), [1, 3, FH, FW]);
    await s.run({ [s.inputNames[0]]: blank, [s.inputNames[1]]: blank });
  } catch (e) {
    await s.release();
    $("modelPick").value = "";
    throw fail(`${file.name} is not a 768 x 432 two-frame optical-flow model: choose neuflow_mixed.onnx`, !kept);
  }
  if (!kept) await store("readwrite", st => st.put(file, "model"));
  session = s;
}

async function pinned([file, sri]) {  // a CDN file, refused unless it matches its pinned SHA-384
  const r = await fetch(ORT + file).catch(() => { throw fail("could not download onnxruntime-web (offline?)"); });
  if (!r.ok) throw fail(`${file}: HTTP ${r.status}`);
  const b = await r.arrayBuffer(), h = new Uint8Array(await crypto.subtle.digest("SHA-384", b));
  if (`sha384-${btoa(String.fromCharCode(...h))}` !== sri) throw fail(`${file} from the CDN does not match its pinned hash`);
  return b;
}

async function loadOrt() {
  await new Promise((ok, err) => {
    const s = Object.assign(document.createElement("script"), { src: ORT + ORT_JS[0], integrity: ORT_JS[1], crossOrigin: "anonymous" });
    s.onload = ok;
    s.onerror = () => err(fail("could not load onnxruntime-web (offline?)"));
    document.head.append(s);
  });
  const [mjs, wasm] = await Promise.all([pinned(ORT_MJS), pinned(ORT_WASM)]);
  ort.env.wasm.numThreads = 1;       // a page opened from disk is not cross-origin isolated: no worker threads
  ort.env.wasm.wasmBinary = new Uint8Array(wasm);
  ort.env.wasm.wasmPaths = { mjs: URL.createObjectURL(new Blob([mjs], { type: "text/javascript" })) };
}

function grab() {  // the frame shown now -> the model's [1, 3, H, W] RGB in 0..1
  // ponytail: the frame is stretched to 768 x 432 as the model's own demo does; a portrait video is squeezed ~3x
  // across. Upgrade if it misses motion there: letterbox it and take the medians over the picture only.
  grabCtx.drawImage(v, 0, 0, FW, FH);
  const px = grabCtx.getImageData(0, 0, FW, FH).data, N = FW * FH, x = new Float32Array(3 * N);
  for (let i = 0; i < N; i++) {
    x[i] = px[4 * i] / 255;
    x[N + i] = px[4 * i + 1] / 255;
    x[2 * N + i] = px[4 * i + 2] / 255;
  }
  return new ort.Tensor("float32", x, [1, 3, FH, FW]);
}

function onFrame(_, meta) {
  v.requestVideoFrameCallback(onFrame);
  if (!motionOn || !session || busy) return;
  const t = meta.mediaTime;
  if (!first || t < first.t || t - first.t > 4 * GAP) first = { t, x: grab() };   // start a pair (again after a seek)
  else if (t - first.t >= GAP) look(first.x, grab());
}

async function look(a, b) {
  busy = true;
  first = null;
  const t0 = performance.now();
  try {
    const out = await session.run({ [session.inputNames[0]]: a, [session.inputNames[1]]: b });
    if (motionOn) {
      follow(motionBox(out[session.outputNames[0]].data, FW, FH));
      const k = keyOf("motion");
      $("motionLabel").title = `Zoom onto the motion${k ? ` (${label(k)})` : ""}: ${((performance.now() - t0) / 1000).toFixed(1)} s per look`;
    }
  } catch (e) {
    await setMotion(false);
    status(`motion zoom stopped: ${e.message.split("\n")[0]}`);
  }
  busy = false;
}

v.requestVideoFrameCallback(onFrame);
$("motion").addEventListener("change", e => setMotion(e.target.checked));
$("modelPick").addEventListener("change", () => { if ($("modelPick").files[0]) setMotion(true); });
