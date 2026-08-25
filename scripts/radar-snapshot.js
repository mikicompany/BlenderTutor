// Builds a PDF snapshot of The Radar and writes it into docs/snapshots/,
// where GitHub Pages publishes it. Run by .github/workflows/radar-snapshot.yml.
//
//   node scripts/radar-snapshot.js            # live data (needs VITE_RAWG_API_KEY)
//   node scripts/radar-snapshot.js --fixture  # sample data, for checking layout
import { chromium } from 'playwright'
import { mkdirSync, writeFileSync, readdirSync, unlinkSync } from 'node:fs'
import { join } from 'node:path'

const FIXTURE = process.argv.includes('--fixture')
const RAWG_KEY = process.env.VITE_RAWG_API_KEY
const OUT_DIR = 'docs/snapshots'
const KEEP = 12 // number of past snapshots to retain

if (!FIXTURE && !RAWG_KEY) {
  console.error('Missing VITE_RAWG_API_KEY')
  process.exit(1)
}

const fmtDate = d => d.toISOString().split('T')[0]

function dateRange(daysBack) {
  return `${fmtDate(new Date(Date.now() - daysBack * 86400000))},${fmtDate(new Date())}`
}

function monthRange() {
  const now = new Date()
  return `${fmtDate(new Date(now.getFullYear(), now.getMonth(), 1))},${fmtDate(new Date(now.getFullYear(), now.getMonth() + 1, 0))}`
}

async function rawg(path) {
  const res = await fetch(`https://api.rawg.io/api/${path}&key=${RAWG_KEY}`)
  if (!res.ok) throw new Error(`RAWG ${res.status}`)
  return res.json()
}

async function steamSpy() {
  const res = await fetch('https://steamspy.com/api.php?request=top100in2weeks')
  if (!res.ok) throw new Error(`Steam Spy ${res.status}`)
  return Object.values(await res.json()).slice(0, 15)
}

function fixtureData() {
  const game = (name, mc, released) => ({
    name, metacritic: mc, released, background_image: null,
    genres: [{ name: 'Action' }, { name: 'Adventure' }],
    platforms: [{ platform: { name: 'PC' } }, { platform: { name: 'PS5' } }],
  })
  return {
    newAndNotable: [
      game('Starfall Chronicles', 91, '2026-08-02'), game('Neon Drift 2', 84, '2026-08-05'),
      game('Mycelium', 78, '2026-08-09'), game('Harbourlight', 88, '2026-08-11'),
      game('Iron Vale', null, '2026-08-12'), game('Paper Kingdoms', 72, '2026-08-14'),
    ],
    metacriticTop: [
      game('Elden Legacy', 96, '2026-07-01'), game('Quiet Horizon', 94, '2026-06-18'),
      game('The Long Dusk', 92, '2026-05-22'), game('Cobalt', 90, '2026-07-30'),
      game('Rivers of Ash', 89, '2026-04-11'),
    ],
    releases: [
      game('Autumn Court', null, '2026-08-18'), game('Deep Signal', null, '2026-08-21'),
      game('Featherfall', null, '2026-08-27'),
    ],
    steamTrending: [
      { name: 'Starfall Chronicles', price: '2999', positive: 8400, negative: 620, ccu: 91200, owners: '2,000,000 .. 5,000,000' },
      { name: 'Neon Drift 2', price: '1999', positive: 3100, negative: 900, ccu: 24100, owners: '500,000 .. 1,000,000' },
      { name: 'Harbourlight', price: '0', positive: 12000, negative: 1500, ccu: 65000, owners: '5,000,000 .. 10,000,000' },
    ],
  }
}

async function fetchData() {
  if (FIXTURE) return fixtureData()
  const [notable, top, cal, steam] = await Promise.allSettled([
    rawg(`games?ordering=-added&dates=${dateRange(30)}&page_size=6`),
    rawg(`games?ordering=-metacritic&metacritic=80,100&page_size=10`),
    rawg(`games?ordering=released&dates=${monthRange()}&page_size=40`),
    steamSpy(),
  ])
  const ok = r => r.status === 'fulfilled'
  if (!ok(notable) && !ok(top) && !ok(cal)) {
    throw new Error(`No RAWG data available: ${notable.reason?.message ?? 'unknown error'}`)
  }
  return {
    newAndNotable: ok(notable) ? notable.value.results ?? [] : [],
    metacriticTop: ok(top) ? top.value.results ?? [] : [],
    releases: ok(cal) ? cal.value.results ?? [] : [],
    steamTrending: ok(steam) ? steam.value : [],
  }
}

const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))
const price = p => (!p || p === '0' ? 'Free' : `$${(parseInt(p, 10) / 100).toFixed(2)}`)
const num = n => (Number(n) || 0).toLocaleString('en-US')

function scoreClass(s) {
  if (!s) return 'na'
  if (s >= 90) return 'great'
  if (s >= 75) return 'good'
  return 'ok'
}

function renderHtml(data, dateLabel) {
  const gameRow = g => `
    <tr>
      <td class="name">${esc(g.name)}</td>
      <td class="dim">${esc((g.genres ?? []).slice(0, 2).map(x => x.name).join(', ') || '—')}</td>
      <td class="dim">${esc(g.released ?? '—')}</td>
      <td><span class="score ${scoreClass(g.metacritic)}">${g.metacritic ?? '—'}</span></td>
    </tr>`

  const steamRow = s => `
    <tr>
      <td class="name">${esc(s.name)}</td>
      <td class="dim">${esc(price(s.price))}</td>
      <td class="dim">${num(s.positive)} / ${num(s.negative)}</td>
      <td class="dim">${num(s.ccu)}</td>
    </tr>`

  const section = (title, sub, head, rows) => !rows.length ? '' : `
    <section>
      <h2>${esc(title)} <span class="sub">${esc(sub)}</span></h2>
      <table><thead><tr>${head.map(h => `<th>${esc(h)}</th>`).join('')}</tr></thead>
      <tbody>${rows.join('')}</tbody></table>
    </section>`

  return `<!doctype html><html><head><meta charset="utf-8"><style>
  @page { size: A4; margin: 14mm 12mm; }
  * { box-sizing: border-box; }
  body { margin: 0; background: #0a0a0a; color: #e8e8e8;
         font-family: ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace; font-size: 10px; }
  header { border-bottom: 2px solid #22c55e; padding-bottom: 10px; margin-bottom: 18px;
           display: flex; align-items: flex-end; justify-content: space-between; }
  h1 { font-size: 30px; margin: 0; letter-spacing: -1px; color: #fff; font-weight: 800; }
  .tag { color: #22c55e; letter-spacing: 3px; font-size: 8px; text-transform: uppercase; margin-top: 3px; }
  .when { text-align: right; color: #22c55e; font-size: 11px; }
  .when b { display: block; color: #fff; font-size: 15px; letter-spacing: 1px; }
  section { margin-bottom: 20px; break-inside: avoid; }
  h2 { font-size: 12px; text-transform: uppercase; letter-spacing: 2px; color: #fff;
       margin: 0 0 8px; border-left: 3px solid #22c55e; padding-left: 7px; }
  h2 .sub { color: #555; letter-spacing: 0; text-transform: none; font-size: 9px; margin-left: 6px; }
  table { width: 100%; border-collapse: collapse; }
  th { text-align: left; font-size: 8px; text-transform: uppercase; letter-spacing: 1px;
       color: #666; border-bottom: 1px solid #222; padding: 4px 6px; font-weight: 500; }
  td { padding: 5px 6px; border-bottom: 1px solid #161616; vertical-align: top; }
  td.name { color: #fff; font-weight: 600; }
  td.dim { color: #9a9a9a; }
  .score { display: inline-block; min-width: 26px; text-align: center; padding: 1px 5px;
           border-radius: 3px; font-weight: 700; }
  .score.great { background: #14532d; color: #4ade80; }
  .score.good  { background: #1c2f16; color: #a3e635; }
  .score.ok    { background: #3a2a10; color: #fbbf24; }
  .score.na    { background: #1a1a1a; color: #666; }
  footer { margin-top: 22px; border-top: 1px solid #222; padding-top: 9px;
           color: #666; font-size: 8px; display: flex; justify-content: space-between; }
  footer a { color: #22c55e; text-decoration: none; }
  </style></head><body>
    <header>
      <div><h1>THE RADAR</h1><div class="tag">Game news in a glimpse</div></div>
      <div class="when"><b>${esc(dateLabel)}</b>snapshot</div>
    </header>
    ${section('New and notable', 'added in the last 30 days', ['Game', 'Genres', 'Released', 'Score'], data.newAndNotable.map(gameRow))}
    ${section('Top Metacritic', 'highest rated right now', ['Game', 'Genres', 'Released', 'Score'], data.metacriticTop.slice(0, 10).map(gameRow))}
    ${section('Trending on Steam', 'Steam Spy, past two weeks', ['Game', 'Price', 'Positive / Negative', 'Peak players'], data.steamTrending.map(steamRow))}
    ${section('Coming up', 'released this month', ['Game', 'Genres', 'Date', 'Score'], data.releases.slice(0, 15).map(gameRow))}
    <footer>
      <span>Data: RAWG.io + Steam Spy</span>
      <span><a href="https://www.blendertutoring.com/radar">blendertutoring.com/radar</a></span>
    </footer>
  </body></html>`
}

function prune(dir) {
  const files = readdirSync(dir).filter(f => /^radar-\d{4}-\d{2}-\d{2}\.pdf$/.test(f)).sort()
  for (const f of files.slice(0, Math.max(0, files.length - KEEP))) {
    unlinkSync(join(dir, f))
    console.log('pruned', f)
  }
}

async function main() {
  const data = await fetchData()
  const now = new Date()
  const label = now.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })
  const html = renderHtml(data, label)

  // --html <path> dumps the source the PDF is printed from, for layout checks.
  const htmlFlag = process.argv.indexOf('--html')
  if (htmlFlag !== -1 && process.argv[htmlFlag + 1]) {
    writeFileSync(process.argv[htmlFlag + 1], html)
    console.log('wrote', process.argv[htmlFlag + 1])
  }

  mkdirSync(OUT_DIR, { recursive: true })
  // CI installs its own Chromium; PLAYWRIGHT_CHROMIUM_PATH lets a machine with
  // one already on disk point at it instead.
  const browser = await chromium.launch({
    executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined,
  })
  try {
    const page = await browser.newPage()
    await page.setContent(html, { waitUntil: 'load' })
    const pdf = await page.pdf({ format: 'A4', printBackground: true })
    const dated = join(OUT_DIR, `radar-${fmtDate(now)}.pdf`)
    writeFileSync(dated, pdf)
    writeFileSync(join(OUT_DIR, 'latest.pdf'), pdf)

    // Publish the same figures as JSON so the email can show them inline
    // rather than only linking to the PDF. One fetch, one source of truth.
    const slim = g => ({
      name: g.name,
      metacritic: g.metacritic ?? null,
      released: g.released ?? null,
      genres: (g.genres ?? []).slice(0, 2).map(x => x.name),
    })
    writeFileSync(join(OUT_DIR, 'latest.json'), JSON.stringify({
      date: fmtDate(now),
      label,
      newAndNotable: data.newAndNotable.slice(0, 6).map(slim),
      metacriticTop: data.metacriticTop.slice(0, 5).map(slim),
      steamTrending: data.steamTrending.slice(0, 5).map(s => ({
        name: s.name, price: price(s.price),
        positive: Number(s.positive) || 0, ccu: Number(s.ccu) || 0,
      })),
      releaseCount: data.releases.length,
    }, null, 2))
    prune(OUT_DIR)
    console.log(`wrote ${dated} (${(pdf.length / 1024).toFixed(0)} KB)`)
    console.log(`counts: notable=${data.newAndNotable.length} metacritic=${data.metacriticTop.length} steam=${data.steamTrending.length} releases=${data.releases.length}`)
  } finally {
    await browser.close()
  }
}

main().catch(e => { console.error(e.message); process.exit(1) })
