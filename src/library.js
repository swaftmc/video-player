// The sidebar library: open a folder, list its videos (sub-folders too), play the one clicked.
"use strict";

const VIDEO_EXT = /\.(mp4|m4v|mov|webm|mkv|ogv)$/i;
let videoUrl = "";

$("pick").addEventListener("change", () => {
  const path = f => f.webkitRelativePath || f.name;
  const files = [...$("pick").files].filter(f => f.type.startsWith("video/") || VIDEO_EXT.test(f.name))
    .sort((a, b) => path(a).localeCompare(path(b), undefined, { numeric: true }));
  const list = $("list");
  list.textContent = "";
  for (const f of files) {
    const b = Object.assign(document.createElement("button"), { textContent: path(f).replace(/^[^/]*\//, ""), title: path(f) });
    b.onclick = () => play(f, b);
    const li = document.createElement("li");
    li.append(b);
    list.append(li);
  }
  const root = path($("pick").files[0] || { name: "" }).split("/")[0];
  $("count").textContent = files.length ? `${root}: ${files.length} video${files.length > 1 ? "s" : ""}` : "No videos in that folder.";
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
