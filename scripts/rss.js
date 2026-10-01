// Writes docs/rss.xml from the same posts data the site renders.
//
// A feed is cheap to produce and is how aggregators, readers and a few
// Blender community sites pick articles up — distribution that does not
// depend on ranking for anything.
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { posts } from '../src/blog/posts.js'

const SITE = 'https://www.blendertutoring.com'
const DIST = 'docs'

// Minimal XML escaping. Titles and descriptions are ours, but an unescaped
// ampersand in one of them is enough to make the whole feed unparseable.
const esc = (s = '') =>
  String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

const byNewest = [...posts].sort((a, b) => new Date(b.date) - new Date(a.date))

const items = byNewest
  .map((p) => {
    const url = `${SITE}/blog/${p.slug}`
    return `    <item>
      <title>${esc(p.title)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <pubDate>${new Date(p.date).toUTCString()}</pubDate>
      <description>${esc(p.description)}</description>
    </item>`
  })
  .join('\n')

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>BlenderTutor Blog</title>
    <link>${SITE}/blog</link>
    <description>Practical Blender guides for beginners and game artists.</description>
    <language>en</language>
    <lastBuildDate>${new Date(byNewest[0]?.date || Date.now()).toUTCString()}</lastBuildDate>
    <atom:link href="${SITE}/rss.xml" rel="self" type="application/rss+xml"/>
${items}
  </channel>
</rss>
`

writeFileSync(join(DIST, 'rss.xml'), xml)
console.log(`rss.xml — ${byNewest.length} posts`)
