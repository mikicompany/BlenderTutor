// Node 18+ required for native fetch
if (typeof globalThis.fetch === 'undefined') {
  console.error('Node 18+ required')
  process.exit(1)
}

const RAWG_KEY = process.env.VITE_RAWG_API_KEY
const WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL

if (!RAWG_KEY || !WEBHOOK_URL) {
  console.error('Missing VITE_RAWG_API_KEY or DISCORD_WEBHOOK_URL')
  process.exit(1)
}

function dateRange(daysBack) {
  const end = new Date()
  const start = new Date(Date.now() - daysBack * 86400000)
  const fmt = d => d.toISOString().split('T')[0]
  return `${fmt(start)},${fmt(end)}`
}

function scoreEmoji(s) {
  if (!s) return '⬜'
  if (s >= 90) return '🟩'
  if (s >= 75) return '🟨'
  if (s >= 60) return '🟧'
  return '🟥'
}

function reviewColor(pct) {
  if (pct >= 80) return '🟢'
  if (pct >= 60) return '🟡'
  return '🔴'
}

async function rawg(path) {
  const res = await fetch(`https://api.rawg.io/api/${path}&key=${RAWG_KEY}`)
  if (!res.ok) throw new Error(`RAWG error ${res.status}`)
  return res.json()
}

async function steamSpy() {
  const res = await fetch('https://steamspy.com/api.php?request=top100in2weeks')
  if (!res.ok) throw new Error('Steam Spy error')
  const json = await res.json()
  return Object.values(json).slice(0, 10)
}

function formatPrice(p) {
  if (!p || p === '0') return 'Free'
  return `$${(parseInt(p, 10) / 100).toFixed(2)}`
}

async function main() {
  const now = new Date()
  const monthName = now.toLocaleString('en-US', { month: 'long', year: 'numeric' })

  const [notable, metacritic, steam] = await Promise.allSettled([
    rawg(`games?ordering=-added&dates=${dateRange(30)}&page_size=5`),
    rawg(`games?ordering=-metacritic&metacritic=80,100&page_size=5`),
    steamSpy(),
  ])

  const notableGames = notable.status === 'fulfilled' ? notable.value.results ?? [] : []
  const topGames = metacritic.status === 'fulfilled' ? metacritic.value.results ?? [] : []
  const steamGames = steam.status === 'fulfilled' ? steam.value : []

  // --- Build embeds ---
  const embeds = []

  // New & Notable
  if (notableGames.length) {
    embeds.push({
      title: '🆕 New & Notable',
      color: 0x22c55e,
      description: notableGames.map(g =>
        `${scoreEmoji(g.metacritic)} **[${g.name}](https://rawg.io/games/${g.slug})** ${g.metacritic ? `· ${g.metacritic}` : ''}\n> ${g.released ?? 'TBA'}`
      ).join('\n'),
    })
  }

  // Metacritic Top 5
  if (topGames.length) {
    embeds.push({
      title: '🏆 Top by Metacritic',
      color: 0xfacc15,
      description: topGames.map((g, i) =>
        `\`${String(i + 1).padStart(2)}\` ${scoreEmoji(g.metacritic)} **${g.metacritic}** [${g.name}](https://rawg.io/games/${g.slug})`
      ).join('\n'),
    })
  }

  // Steam Trending
  if (steamGames.length) {
    embeds.push({
      title: '🔥 Trending on Steam',
      color: 0x1b2838,
      description: steamGames.map((g, i) => {
        const total = g.positive + g.negative
        const pct = total ? Math.round((g.positive / total) * 100) : null
        const ccu = g.ccu >= 1000 ? `${(g.ccu / 1000).toFixed(0)}K` : String(g.ccu)
        return `\`${String(i + 1).padStart(2)}\` ${pct ? reviewColor(pct) : '⬜'} **[${g.name}](https://store.steampowered.com/app/${g.appid})** · ${formatPrice(g.price)} · 👥 ${ccu}`
      }).join('\n'),
    })
  }

  // Post to Discord
  const payload = {
    username: 'The Radar',
    avatar_url: 'https://www.blendertutoring.com/favicon.ico',
    content: `📡 **THE RADAR** — ${monthName}\nGame news in a glimpse · [View full dashboard](https://www.blendertutoring.com/radar)`,
    embeds,
  }

  const res = await fetch(WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Discord error ${res.status}: ${text}`)
  }

  console.log('✓ Posted to Discord')
}

main().catch(e => {
  console.error(e)
  process.exit(1)
})
