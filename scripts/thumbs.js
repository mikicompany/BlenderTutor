// Card-sized copies of each post thumbnail.
//
// The blog index renders thumbnails into a 128x96 slot, but post.thumbnail is
// the social-sharing image — 2400px wide and a quarter of a megabyte, because
// og:image wants that. Serving it to the card meant /blog pulled several
// megabytes of images to draw postage stamps, which is paid for by whoever is
// on a phone.
//
// So: one downscaled copy per thumbnail, written next to the original as
// <name>-thumb.jpg. BlogList points at those; og:image and the JSON-LD still
// point at the full-size original.
//
// Each copy keeps its source's own aspect ratio rather than being cropped to a
// fixed one, so the card's object-cover crops exactly as it did before.
//
// Runs before vite build so the results are picked up from public/. Existing
// copies are reused unless the source is newer, which keeps rebuilds quick.

import { chromium } from "playwright"
import { readFileSync, writeFileSync, existsSync, statSync } from "node:fs"
import { fileURLToPath } from "node:url"
import path from "node:path"
import { posts } from "../src/blog/posts.js"

const root = path.dirname(fileURLToPath(import.meta.url))
const pub = path.join(root, "..", "public")

// Wide enough for a 128x96 slot on a 3x display: the card crops to 4:3, so
// height drives the requirement (96 * 3 = 288px tall), and at these aspect
// ratios that needs roughly 500px of width.
const WIDTH = 500

const wanted = [...new Set(posts.map((p) => p.thumbnail).filter(Boolean))]
const todo = []

for (const rel of wanted) {
  const src = path.join(pub, rel)
  if (!existsSync(src)) {
    console.warn(`thumbs: missing source ${rel}`)
    continue
  }
  const out = src.replace(/\.(jpg|jpeg|png)$/i, "-thumb.jpg")
  if (existsSync(out) && statSync(out).mtimeMs >= statSync(src).mtimeMs) continue
  todo.push({ src, out, rel })
}

if (!todo.length) {
  console.log(`thumbs — ${wanted.length} up to date`)
} else {
  const browser = await chromium.launch({
    executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined,
  })
  const page = await browser.newPage()
  let saved = 0

  for (const { src, out, rel } of todo) {
    const b64 = readFileSync(src).toString("base64")
    const ext = path.extname(src).slice(1).toLowerCase()
    const uri = `data:image/${ext === "jpg" ? "jpeg" : ext};base64,${b64}`

    const { w, h } = await page.evaluate(
      (u) =>
        new Promise((res, rej) => {
          // This callback is serialised and run inside the page, so the
          // browser globals are the right ones here even though the rest of
          // the file is Node.
          // eslint-disable-next-line no-undef
          const i = new Image()
          i.onload = () => res({ w: i.naturalWidth, h: i.naturalHeight })
          i.onerror = () => rej(new Error("decode failed"))
          i.src = u
        }),
      uri
    )

    const height = Math.max(1, Math.round((WIDTH * h) / w))
    await page.setViewportSize({ width: WIDTH, height })
    await page.setContent(
      `<!doctype html><meta charset="utf-8">
       <style>html,body{margin:0;padding:0;background:#0f1011}
              img{display:block;width:${WIDTH}px;height:${height}px}</style>
       <img src="${uri}">`,
      { waitUntil: "load" }
    )
    const buf = await page.screenshot({ type: "jpeg", quality: 78 })
    writeFileSync(out, buf)
    saved += statSync(src).size - buf.length
    console.log(`  ${rel} -> ${WIDTH}x${height}  ${(buf.length / 1024).toFixed(0)}KB`)
  }

  await browser.close()
  console.log(`thumbs — ${todo.length} written, ${(saved / 1024 / 1024).toFixed(1)}MB saved`)
}
