import { useState, useEffect, useCallback } from 'react'

const REFRESH_INTERVAL = 60 * 1000

function dateRange(daysBack) {
  const end = new Date()
  const start = new Date(Date.now() - daysBack * 86400000)
  const fmt = d => d.toISOString().split('T')[0]
  return `${fmt(start)},${fmt(end)}`
}

function monthRange() {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), 1)
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  const fmt = d => d.toISOString().split('T')[0]
  return `${fmt(start)},${fmt(end)}`
}

export function useGameData(apiKey) {
  const [data, setData] = useState({
    newAndNotable: [],
    metacriticTop: [],
    releases: [],
    steamTrending: [],
  })
  const [loading, setLoading] = useState(false)
  const [lastUpdated, setLastUpdated] = useState(null)
  const [error, setError] = useState(null)

  const fetchSteam = useCallback(async () => {
    const STEAM_URL = 'https://steamspy.com/api.php?request=top100in2weeks'
    const proxies = [
      `https://corsproxy.io/?${encodeURIComponent(STEAM_URL)}`,
      `https://api.allorigins.win/raw?url=${encodeURIComponent(STEAM_URL)}`,
      `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(STEAM_URL)}`,
    ]
    for (const url of proxies) {
      try {
        const res = await fetch(url, { signal: AbortSignal.timeout(8000) })
        if (!res.ok) continue
        const json = await res.json()
        if (typeof json === 'object' && !Array.isArray(json)) {
          return Object.values(json).slice(0, 15)
        }
      } catch {
        // try next proxy
      }
    }
    throw new Error('All Steam Spy proxies failed')
  }, [])

  const rawg = useCallback(async (path) => {
    const res = await fetch(`https://api.rawg.io/api/${path}&key=${apiKey}`)
    if (!res.ok) throw new Error(`RAWG ${res.status}`)
    return res.json()
  }, [apiKey])

  const fetchAll = useCallback(async () => {
    if (!apiKey) return
    setLoading(true)
    setError(null)
    try {
      const [notable, top, cal, steam] = await Promise.allSettled([
        rawg(`games?ordering=-added&dates=${dateRange(30)}&page_size=6`),
        rawg(`games?ordering=-metacritic&metacritic=80,100&page_size=10`),
        rawg(`games?ordering=released&dates=${monthRange()}&page_size=50`),
        fetchSteam(),
      ])

      setData({
        newAndNotable: notable.status === 'fulfilled' ? notable.value.results ?? [] : [],
        metacriticTop: top.status === 'fulfilled' ? top.value.results ?? [] : [],
        releases: cal.status === 'fulfilled' ? cal.value.results ?? [] : [],
        steamTrending: steam.status === 'fulfilled' ? steam.value : [],
      })
      setLastUpdated(new Date())
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [apiKey, rawg])

  useEffect(() => {
    fetchAll()
    const t = setInterval(fetchAll, REFRESH_INTERVAL)
    return () => clearInterval(t)
  }, [fetchAll])

  return { data, loading, lastUpdated, error, refresh: fetchAll }
}
