// Prints the beginner's guide post to a downloadable PDF.
//
// The markdown is rendered with the same react-markdown + remark-gfm pair the
// site itself uses, so the PDF cannot drift from the page: there is one copy
// of the text, in posts.js, and both outputs come from it.
//
// Runs before vite build, because the file is written into public/ and vite
// copies public/ into docs/ as part of the build.
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { chromium } from 'playwright'
import { writeFileSync, readFileSync } from 'node:fs'
import { resolve, extname } from 'node:path'
import { posts } from '../src/blog/posts.js'

const SLUG = 'blender-for-beginners'
const OUT = 'public/blender-beginners-guide.pdf'
const SITE = 'https://www.blendertutoring.com'

const post = posts.find(p => p.slug === SLUG)
if (!post) {
  console.error(`guide-pdf: no post with slug "${SLUG}" — nothing written`)
  process.exit(1)
}

// The two "download the PDF" calls to action belong on the web page, not
// inside the thing they link to.
const body = post.content
  .split('\n')
  .filter(line => !line.includes('(/blender-beginners-guide.pdf)'))
  .join('\n')

let article = renderToStaticMarkup(
  React.createElement(Markdown, { remarkPlugins: [remarkGfm] }, body),
)

// Images are inlined rather than pointed at on disk: the page is loaded via
// setContent, which gives it an opaque origin that Chromium refuses to let
// read file:// URLs, and a PDF has no server to resolve a leading / against
// either. Base64 sidesteps both.
const MIME = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml' }
article = article.replace(/src="\/blog-images\/([^"]+)"/g, (_, file) => {
  const path = resolve('public/blog-images', file)
  const mime = MIME[extname(file).toLowerCase()]
  if (!mime) throw new Error(`guide-pdf: unsupported image type for ${file}`)
  return `src="data:${mime};base64,${readFileSync(path).toString('base64')}"`
})
// Links stay live and clickable, pointed back at the site.
article = article.replace(/href="\/blog\//g, `href="${SITE}/blog/`)
article = article.replace(/href="\/#/g, `href="${SITE}/#`)

const today = new Date().toLocaleDateString('en-GB', {
  day: 'numeric', month: 'long', year: 'numeric',
})

const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>Blender for Beginners</title>
<style>
  @page { size: A4; margin: 18mm 16mm 20mm; }
  * { box-sizing: border-box; }
  body {
    margin: 0; color: #15181c; background: #fff;
    font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
    font-size: 10.6pt; line-height: 1.62;
  }

  /* Cover: its own page, so the guide starts clean on page 2. */
  .cover { height: 247mm; display: flex; flex-direction: column; justify-content: center;
           page-break-after: always; }
  .cover .kicker { color: #d2690a; font-size: 10pt; font-weight: 800;
                   letter-spacing: 3px; text-transform: uppercase; }
  .cover h1 { font-size: 34pt; line-height: 1.12; margin: 14px 0 10px; font-weight: 800;
              letter-spacing: -0.5px; }
  .cover h1 em { font-style: normal; color: #d2690a; }
  .cover .sub { font-size: 13pt; color: #4b5563; max-width: 125mm; line-height: 1.5; }
  .cover .rule { width: 56mm; height: 4px; background: #d2690a; border-radius: 2px; margin: 26px 0; }
  .cover .meta { font-size: 9.5pt; color: #6b7280; }
  .cover .meta a { color: #d2690a; font-weight: 700; text-decoration: none; }

  h2 { font-size: 15pt; margin: 26px 0 9px; font-weight: 800; letter-spacing: -0.2px;
       page-break-after: avoid; }
  h3 { font-size: 12pt; margin: 18px 0 6px; font-weight: 700; page-break-after: avoid; }
  p  { margin: 0 0 10px; }
  strong { font-weight: 700; color: #000; }
  a { color: #b25608; text-decoration: none; }

  ul, ol { margin: 0 0 12px; padding-left: 20px; }
  li { margin-bottom: 5px; }

  img { max-width: 100%; height: auto; display: block; border-radius: 7px;
        margin: 14px 0; page-break-inside: avoid; }

  table { width: 100%; border-collapse: collapse; margin: 12px 0 16px;
          font-size: 9.8pt; page-break-inside: avoid; }
  th { text-align: left; background: #f3f4f6; font-weight: 800; font-size: 8.8pt;
       letter-spacing: 0.8px; text-transform: uppercase; color: #4b5563; }
  th, td { border: 1px solid #e3e6ea; padding: 7px 10px; vertical-align: top; }

  hr { border: 0; border-top: 1px solid #e3e6ea; margin: 22px 0; }

  /* Keep a heading and its first lines together. */
  h2, h3 { break-after: avoid-page; }
</style></head>
<body>
  <div class="cover">
    <div class="kicker">Blender Tutoring</div>
    <h1>Blender for<br><em>Beginners</em></h1>
    <div class="rule"></div>
    <div class="sub">The order to learn it in — which version to install, the keys
      that matter on day one, what to build after the donut, and a 30-day plan
      that fits around a job.</div>
    <div class="rule" style="width:20mm;height:2px;background:#d8dbe0"></div>
    <div class="meta">${today} &nbsp;·&nbsp; <a href="${SITE}">blendertutoring.com</a></div>
  </div>
  ${article}
</body></html>`

// --html <path> dumps the source the PDF is printed from, for layout checks.
const htmlFlag = process.argv.indexOf('--html')
if (htmlFlag !== -1 && process.argv[htmlFlag + 1]) {
  writeFileSync(process.argv[htmlFlag + 1], html)
  console.log('wrote', process.argv[htmlFlag + 1])
}

const browser = await chromium.launch({
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined,
})
try {
  const page = await browser.newPage()
  await page.setContent(html, { waitUntil: 'networkidle' })

  const broken = await page.evaluate(
    () => [...document.images].filter(i => !i.naturalWidth).map(i => i.src),
  )
  if (broken.length) throw new Error(`images failed to load:\n  ${broken.join('\n  ')}`)

  const pdf = await page.pdf({
    format: 'A4',
    printBackground: true,
    displayHeaderFooter: true,
    headerTemplate: '<span></span>',
    footerTemplate: `<div style="width:100%;font-size:7.5pt;color:#9ca3af;
        font-family:system-ui,sans-serif;padding:0 16mm;display:flex;
        justify-content:space-between;">
        <span>blendertutoring.com</span>
        <span class="pageNumber"></span></div>`,
    margin: { top: '18mm', bottom: '20mm', left: '16mm', right: '16mm' },
  })
  writeFileSync(OUT, pdf)
  console.log(`${OUT} — ${(pdf.length / 1024).toFixed(0)} KB`)
} finally {
  await browser.close()
}
