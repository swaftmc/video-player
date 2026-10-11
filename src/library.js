// The sidebar library: the opened folder's videos (sub-folders too), then the files added one by one under misc/.
"use strict";

const VIDEO_EXT = /\.(mp4|m4v|mov|webm|mkv|ogv)$/i;
const isVideo = f => f.type.startsWith("video/") || VIDEO_EXT.test(f.name);
const byPath = (a, b) => a.path.localeCompare(b.path, undefined, { numeric: true });
let folderName = "", folderVideos = [], miscVideos = [], playing = null, videoUrl = "";   // videos: [{f, path}]

$("pick").addEventListener("change", () => {   // a folder replaces the last folder; misc/ stays
  const all = [...$("pick").files];
  if (!all.length) return;                     // the picker was cancelled: keep the list
  folderName = (all[0].webkitRelativePath || all[0].name).split("/")[0];
  folderVideos = all.filter(isVideo).map(f => ({ f, path: (f.webkitRelativePath || f.name).replace(/^[^/]*\//, "") })).sort(byPath);
  $("pick").value = "";                        // so picking the same folder again still counts
  renderList();
});

$("pickFiles").addEventListener("change", () => {   // files add to misc/, each once
  const same = (a, b) => a.name === b.name && a.size === b.size && a.lastModified === b.lastModified;
  for (const f of $("pickFiles").files) {
    if (isVideo(f) && !miscVideos.some(m => same(m.f, f))) miscVideos.push({ f, path: `misc/${f.name}` });
  }
  miscVideos.sort(byPath);
  $("pickFiles").value = "";
  renderList();
});

function renderList() {
  const list = $("list");
  list.textContent = "";
  $("folder").textContent = $("folder").title = folderName;
  $("folder").hidden = !folderName;
  for (const it of [...folderVideos, ...miscVideos]) {
    const cut = it.path.lastIndexOf("/") + 1;
    const b = Object.assign(document.createElement("button"), { title: it.path });
    b.append(Object.assign(document.createElement("span"), { className: "dir", textContent: it.path.slice(0, cut) }), it.path.slice(cut));
    b.classList.toggle("on", it.f === playing);
    b.onclick = () => play(it.f, b);
    const li = document.createElement("li");
    li.append(b);
    list.append(li);
  }
  if (!list.children.length) {
    list.innerHTML = `<li class="empty">${folderName ? "No videos in this folder." : "Open a folder or files to start."}</li>`;
  }
}

function play(f, b) {
  document.querySelector("#list .on")?.classList.remove("on");
  b.classList.add("on");
  playing = f;
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
