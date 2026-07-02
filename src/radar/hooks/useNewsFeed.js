import { useState, useEffect } from 'react'

const REFRESH_INTERVAL = 15 * 60 * 1000

const FEEDS = [
  { source: 'IGN', url: 'https://feeds.feedburner.com/ign/games-all' },
  { source: 'GAMESPOT', url: 'https://www.gamespot.com/feeds/game-news/' },
  { source: 'PC GAMER', url: 'https://www.pcgamer.com/rss/' },
]

async function fetchViaProxy(url) {
  const proxies = [
    `https://corsproxy.io/?${encodeURIComponent(url)}`,
    `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
    `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
  ]
  for (const proxy of proxies) {
    try {
      const res = await fetch(proxy, { signal: AbortSignal.timeout(8000) })
      if (!res.ok) continue
      const text = await res.text()
      if (text.includes('<item')) return text
    } catch {
      // try next proxy
    }
  }
  return null
}

function parseFeed(xml, source) {
  const doc = new DOMParser().parseFromString(xml, 'text/xml')
  if (doc.querySelector('parsererror')) return []
  return [...doc.querySelectorAll('item')].slice(0, 8).map(item => ({
    source,
    title: item.querySelector('title')?.textContent?.trim() ?? '',
    link: item.querySelector('link')?.textContent?.trim() ?? '',
    pubDate: new Date(item.querySelector('pubDate')?.textContent ?? 0),
  })).filter(h => h.title)
}

async function fetchAllFeeds() {
  const results = await Promise.allSettled(
    FEEDS.map(async ({ source, url }) => {
      const xml = await fetchViaProxy(url)
      return xml ? parseFeed(xml, source) : []
    })
  )
  return results
    .filter(r => r.status === 'fulfilled')
    .flatMap(r => r.value)
    .sort((a, b) => b.pubDate - a.pubDate)
    .slice(0, 20)
}

export function useNewsFeed() {
  const [headlines, setHeadlines] = useState([])

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      const all = await fetchAllFeeds()
      if (!cancelled && all.length) setHeadlines(all)
    }
    load()
    const t = setInterval(load, REFRESH_INTERVAL)
    return () => {
      cancelled = true
      clearInterval(t)
    }
  }, [])

  return headlines
}
