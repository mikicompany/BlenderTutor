// Writes a real HTML file for every route, so GitHub Pages can serve them
// with a 200 instead of falling through to 404.html.
//
// Without this, Pages has no file at /blog/<slug> and answers with 404.html —
// which carries an HTTP 404 status. Browsers follow its JS redirect and land
// in the right place, but crawlers just record "not found", which keeps every
// route except the home page out of search results.
//
// Each page is rendered in Chromium first, so the file contains the finished
// markup and the meta tags Helmet sets, rather than an empty SPA shell.
import { chromium } from 'playwright'
import { createServer } from 'node:http'
import { readFileSync, existsSync, mkdirSync, writeFileSync, statSync } from 'node:fs'
import { join, extname, dirname } from 'node:path'
import { posts } from '../src/blog/posts.js'

const DIST = 'docs'

// Must mirror the routes in src/App.jsx. 404.html no longer redirects into
// the app, so anything routable but missing from this list is a hard 404 for
// visitors as well as crawlers. Blog posts come from the posts data, so new
// articles are picked up automatically; only new top-level routes need adding.
const ROUTES = [
  '/',
  '/blog',
  ...posts.map(p => `/blog/${p.slug}`),
  '/radar',
  '/terms',
  '/privacy',
]

const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp',
  '.woff': 'font/woff', '.woff2': 'font/woff2', '.otf': 'font/otf',
  '.mp4': 'video/mp4', '.webm': 'video/webm', '.pdf': 'application/pdf',
}

// Serves the built site with an SPA fallback, mirroring how the app behaves
// in a browser today. The fallback is the untouched Vite shell held in memory:
// reading index.html off disk would, once the home page had been written,
// hand every later route a shell with the home page's head tags already baked
// in — and Helmet would then add a second set on top.
function serve(shell) {
  return createServer((req, res) => {
    const path = decodeURIComponent(req.url.split('?')[0])
    const file = join(DIST, path)
    if (path !== '/' && existsSync(file) && statSync(file).isFile()) {
      res.writeHead(200, { 'Content-Type': MIME[extname(file)] || 'application/octet-stream' })
      return res.end(readFileSync(file))
    }
    res.writeHead(200, { 'Content-Type': 'text/html' })
    res.end(shell)
  })
}

async function main() {
  // Snapshot the shell before anything is overwritten.
  const shell = readFileSync(join(DIST, 'index.html'))

  const server = serve(shell)
  await new Promise(r => server.listen(0, '127.0.0.1', r))
  const port = server.address().port

  const browser = await chromium.launch({
    executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined,
  })
  const page = await browser.newPage()

  // The Radar calls third-party APIs that need a key and network access;
  // blocking them keeps a transient error state out of the saved markup.
  await page.route(/rawg\.io|steamspy|corsproxy|allorigins|codetabs|rss2json|calendly/,
    r => r.abort())

  // Collected and written only once every route has been rendered, so no
  // output can become the input for a later one.
  const pages = []
  try {
    for (const route of ROUTES) {
      await page.goto(`http://127.0.0.1:${port}${route}`, { waitUntil: 'load', timeout: 45000 })
      // Give React and Helmet a moment to render and set the head tags.
      await page.waitForTimeout(600)

      // index.html ships static head tags, and Helmet adds its own alongside
      // them rather than replacing them. Left as-is, every page would carry
      // two titles, two descriptions and two canonicals — one of them
      // pointing at the home page, which invites Google to fold the whole
      // site into a single URL. Helmet marks its tags with data-rh; where it
      // set one, drop the static twin.
      await page.evaluate(`(() => {
        const keyOf = el => {
          if (el.tagName === 'TITLE') return 'title'
          if (el.tagName === 'LINK') return 'link:' + el.getAttribute('rel')
          return 'meta:' + (el.getAttribute('name') || el.getAttribute('property'))
        }
        const groups = new Map()
        for (const el of document.head.querySelectorAll('title, link[rel="canonical"], meta[name], meta[property]')) {
          const k = keyOf(el)
          if (!groups.has(k)) groups.set(k, [])
          groups.get(k).push(el)
        }
        for (const els of groups.values()) {
          if (els.length < 2) continue
          const managed = els.filter(e => e.hasAttribute('data-rh'))
          if (!managed.length) continue
          for (const el of els) if (!el.hasAttribute('data-rh')) el.remove()
        }
      })()`)

      // String form: this expression is evaluated in the page, not in Node.
      const html = '<!doctype html>\n' + await page.evaluate('document.documentElement.outerHTML')
      const title = await page.title()

      // Two files per route. Pages resolves /blog/x to blog/x.html directly,
      // and /blog/x/ to blog/x/index.html. Writing both means the exact URLs
      // in the sitemap and the canonical tags answer 200 without a redirect,
      // while the trailing-slash form still works. Both carry the same
      // canonical, so search engines treat them as one page.
      const outs = route === '/'
        ? [join(DIST, 'index.html')]
        : [join(DIST, `${route}.html`), join(DIST, route, 'index.html')]
      for (const out of outs) pages.push({ out, html, title })
    }
  } finally {
    await browser.close()
    server.close()
  }

  for (const { out, html, title } of pages) {
    mkdirSync(dirname(out), { recursive: true })
    writeFileSync(out, html)
    console.log(`${out}  —  ${title.slice(0, 60)}`)
  }
  console.log(`prerendered ${pages.length} routes`)
}

main().catch(e => { console.error(e.message); process.exit(1) })
