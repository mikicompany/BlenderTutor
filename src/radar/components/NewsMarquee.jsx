import React, { useMemo } from 'react'
import { useNewsFeed } from '../hooks/useNewsFeed'

const rawgLink = (g) => (g.slug ? `https://rawg.io/games/${g.slug}` : '#')

// Headline URLs arrive from third-party RSS feeds relayed through public CORS
// proxies — nothing in that chain is under our control. React escapes text it
// renders, but it does not vet a URL placed in href, so a feed returning
// "javascript:..." would produce a link that runs script when a visitor clicks
// it. Only http and https are allowed through; anything else becomes inert.
const safeHref = (url) => {
  if (typeof url !== 'string') return '#'
  try {
    const { protocol } = new URL(url, window.location.origin)
    return protocol === 'http:' || protocol === 'https:' ? url : '#'
  } catch {
    // Not a parseable URL at all.
    return '#'
  }
}

export default function NewsMarquee({ data }) {
  const headlines = useNewsFeed()

  // If no RSS feed is reachable, fill the ticker from RAWG data already on the page
  const fallback = useMemo(() => {
    const items = []
    data?.newAndNotable?.forEach(g =>
      items.push({ source: 'NEW & NOTABLE', title: g.name, link: rawgLink(g) })
    )
    data?.metacriticTop?.slice(0, 6).forEach(g =>
      items.push({ source: `METACRITIC ${g.metacritic}`, title: g.name, link: rawgLink(g) })
    )
    return items
  }, [data])

  const items = headlines.length ? headlines : fallback

  if (!items.length) return null

  // Content is duplicated so the track can loop seamlessly at -50%
  const track = (ariaHidden) => (
    <div className="news-marquee-track" aria-hidden={ariaHidden}>
      {items.map((h, i) => (
        <a
          key={`${h.link}-${i}`}
          href={safeHref(h.link)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-xs font-mono whitespace-nowrap px-5 text-gray-400 hover:text-green-300 transition-colors"
        >
          <span className="text-green-500 font-bold">{h.source}</span>
          <span className="text-green-800">▸</span>
          <span>{h.title}</span>
        </a>
      ))}
    </div>
  )

  return (
    <div className="border-b border-green-500/20 bg-[#050505] overflow-hidden select-none">
      <div className="flex items-stretch">
        <div className="flex items-center gap-1.5 px-3 py-2 bg-[#0a1a10] border-r border-green-500/20 flex-shrink-0 z-10">
          <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          <span className="text-green-400 text-[10px] font-mono font-bold tracking-[0.2em]">LIVE</span>
        </div>
        <div className="news-marquee flex items-center flex-1 min-w-0">
          {track(false)}
          {track(true)}
        </div>
      </div>
    </div>
  )
}
