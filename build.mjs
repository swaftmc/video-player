// Build the single-file index.html: src/index.html with its stylesheet and scripts inlined. `node build.mjs`
import { readFileSync, writeFileSync } from "node:fs";

const src = f => readFileSync(new URL(`src/${f}`, import.meta.url), "utf8");
let n = 0;
const html = src("index.html")
  .replace(/<link rel="stylesheet" href="([\w.-]+)">/g, (_, f) => (n++, `<style>\n${src(f)}</style>`))
  .replace(/<script src="([\w.-]+)"><\/script>/g, (_, f) => (n++, `<script>\n${src(f).replaceAll("</script", "<\\/script")}</script>`))
  .replace(/poster="([\w.-]+)\.(jpe?g|png|webp)"/g, (_, f, ext) => {   // the picture shown until a video plays
    n++;
    const bytes = readFileSync(new URL(`src/${f}.${ext}`, import.meta.url));
    return `poster="data:image/${ext === "jpg" ? "jpeg" : ext};base64,${bytes.toString("base64")}"`;
  });
if (/<(link|script) [^>]*(href|src)=|poster="(?!data:)/.test(html)) throw new Error("src/index.html still links a file the build did not inline");
writeFileSync(new URL("index.html", import.meta.url), html);
console.log(`index.html: ${n} files inlined, ${(html.length / 1024).toFixed(1)} KB`);
