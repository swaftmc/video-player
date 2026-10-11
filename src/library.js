// The sidebar library: open a folder, list its videos (sub-folders too), play the one clicked.
"use strict";

const VIDEO_EXT = /\.(mp4|m4v|mov|webm|mkv|ogv)$/i;
let videoUrl = "";

$("pick").addEventListener("change", () => {
  const all = [...$("pick").files];
  if (!all.length) return;                                // the picker was cancelled: keep the list
  const path = f => f.webkitRelativePath || f.name;
  const files = all.filter(f => f.type.startsWith("video/") || VIDEO_EXT.test(f.name))
    .sort((a, b) => path(a).localeCompare(path(b), undefined, { numeric: true }));
  $("folder").textContent = $("folder").title = path(all[0]).split("/")[0];
  $("folder").hidden = false;
  const list = $("list");
  list.textContent = "";
  for (const f of files) {
    const rel = path(f).replace(/^[^/]*\//, ""), cut = rel.lastIndexOf("/") + 1;   // the root folder is the heading
    const b = Object.assign(document.createElement("button"), { title: rel });
    b.append(Object.assign(document.createElement("span"), { className: "dir", textContent: rel.slice(0, cut) }), rel.slice(cut));
    b.onclick = () => play(f, b);
    const li = document.createElement("li");
    li.append(b);
    list.append(li);
  }
  if (!files.length) list.innerHTML = '<li class="empty">No videos in this folder.</li>';
});

function play(f, b) {
  document.querySelector("#list .on")?.classList.remove("on");
  b.classList.add("on");
  resetZoom();
  URL.revokeObjectURL(videoUrl);
  v.src = videoUrl = URL.createObjectURL(f);
  v.play().catch(() => { /* the error event says why */ });
  v.focus();
  document.title = f.name;
}

v.addEventListener("error", () => {
  if (v.currentSrc) say("This browser can't play this video. Phone (HEVC) videos need Edge with the HEVC Video Extensions.", 6000);
});
