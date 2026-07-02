import React, { useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { useGameData } from './hooks/useGameData'
import RadarHeader from './components/RadarHeader'
import NewAndNotable from './components/NewAndNotable'
import SteamTrending from './components/SteamTrending'
import MetacriticTop from './components/MetacriticTop'
import ReleasesCalendar from './components/ReleasesCalendar'
import ApiSetup from './components/ApiSetup'
import Subscribe from './components/Subscribe'
import NewsMarquee from './components/NewsMarquee'

export default function Radar() {
  const [apiKey, setApiKey] = useState(
    () => localStorage.getItem('radar_rawg_key') || import.meta.env.VITE_RAWG_API_KEY || ''
  )

  const { data, loading, lastUpdated, error, refresh } = useGameData(apiKey)

  const handleSetKey = (key) => {
    localStorage.setItem('radar_rawg_key', key)
    setApiKey(key)
  }

  const handleResetKey = () => {
    localStorage.removeItem('radar_rawg_key')
    setApiKey('')
  }

  if (!apiKey) return <ApiSetup onSetKey={handleSetKey} />

  const canonicalUrl = 'https://www.blendertutoring.com/radar'
  const title = 'The Radar — Game News, Metacritic Scores & Steam Trending'
  const description = 'Live gaming dashboard: top Metacritic scores, trending Steam games, new releases, and a monthly game release calendar. Updated every minute.'

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: title,
    description,
    url: canonicalUrl,
    publisher: {
      '@type': 'Organization',
      name: 'BlenderTutoring',
      url: 'https://www.blendertutoring.com',
    },
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <Helmet>
        <title>{title}</title>
        <meta name="description" content={description} />
        <meta name="keywords" content="game news, metacritic scores, steam trending, new game releases, game release calendar, top games, gaming dashboard, steam spy, game charts" />
        <link rel="canonical" href={canonicalUrl} />

        <meta property="og:type" content="website" />
        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:image" content="https://www.blendertutoring.com/og-image.png" />
        <meta property="og:site_name" content="BlenderTutoring" />

        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={title} />
        <meta name="twitter:description" content={description} />
        <meta name="twitter:image" content="https://www.blendertutoring.com/og-image.png" />

        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      </Helmet>

      <RadarHeader
        lastUpdated={lastUpdated}
        loading={loading}
        onRefresh={refresh}
        onResetKey={handleResetKey}
      />

      <NewsMarquee />

      {error && (
        <div className="max-w-[1400px] mx-auto px-4 pt-4">
          <div className="bg-red-950/40 border border-red-800/50 text-red-400 text-sm font-mono px-4 py-3 rounded">
            ⚠ {error} — check your RAWG API key or try refreshing
          </div>
        </div>
      )}

      <div className="max-w-[1400px] mx-auto px-3 sm:px-4 py-5 sm:py-8 space-y-8 sm:space-y-10">
        <NewAndNotable games={data.newAndNotable} loading={loading} />

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-8">
          <SteamTrending games={data.steamTrending} loading={loading} />
          <MetacriticTop games={data.metacriticTop} loading={loading} />
        </div>

        <ReleasesCalendar releases={data.releases} loading={loading} />
        <Subscribe />
      </div>

      <footer className="border-t border-[#1a1a1a] mt-10 py-4 text-center text-gray-700 text-xs font-mono">
        THE RADAR · Data: RAWG.io + Steam Spy · Auto-refreshes every 60s
      </footer>
    </div>
  )
}
