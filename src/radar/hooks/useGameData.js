import { useState, useEffect, useCallback } from 'react'

const REFRESH_INTERVAL = 15 * 60 * 1000

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

// Carries the HTTP status so failures can be told apart — a rejected key and
// an exhausted quota need very different reactions.
class RawgError extends Error {
  constructor(status, detail) {
    super(detail ? `RAWG ${status}: ${detail}` : `RAWG ${status}`)
    this.status = status
    this.detail = detail
  }
}

function describeRawgFailure(reason) {
  const status = reason?.status

  if (status === 401 || status === 403) {
    return `RAWG rejected the API key (HTTP ${status}). The key may have been revoked or regenerated — use the key button above to enter a new one.`
  }
  if (status === 429) {
    return 'RAWG request limit reached (HTTP 429). The key is valid but has used up its quota — data returns once the quota resets.'
  }
  if (status >= 500) {
    return `RAWG is having server trouble (HTTP ${status}). This usually clears on its own.`
  }
  if (status) {
    return `RAWG request failed (HTTP ${status})${reason.detail ? `: ${reason.detail}` : ''}.`
  }
  return `Could not reach RAWG: ${reason?.message ?? 'network error'}.`
}

export function useGameData(apiKey, onAuthFailure) {
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
    if (!res.ok) {
      // RAWG explains refusals in the body; pass that through to the UI.
      let detail = ''
      try {
        const body = await res.json()
        detail = body?.error || body?.detail || ''
      } catch {
        // non-JSON error body
      }
      throw new RawgError(res.status, detail)
    }
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

      // Keep whatever already loaded for any section that failed, so a blip
      // doesn't wipe the dashboard.
      setData(prev => ({
        newAndNotable: notable.status === 'fulfilled' ? notable.value.results ?? [] : prev.newAndNotable,
        metacriticTop: top.status === 'fulfilled' ? top.value.results ?? [] : prev.metacriticTop,
        releases: cal.status === 'fulfilled' ? cal.value.results ?? [] : prev.releases,
        steamTrending: steam.status === 'fulfilled' ? steam.value : prev.steamTrending,
      }))

      // allSettled never throws, so failures have to be inspected by hand —
      // otherwise every outage looks like an empty dashboard with no reason.
      const rawgCalls = [notable, top, cal]
      const rawgFailure = rawgCalls.find(r => r.status === 'rejected')
      const messages = []

      if (rawgFailure) messages.push(describeRawgFailure(rawgFailure.reason))

      // A 200 carrying an empty result set is the one failure that looks
      // exactly like success: no error, but nothing to show.
      const rawgOk = rawgCalls.filter(r => r.status === 'fulfilled')
      const itemsReturned = rawgOk.reduce(
        (n, r) => n + (r.value?.results?.length ?? 0),
        0
      )
      if (!rawgFailure && rawgOk.length > 0 && itemsReturned === 0) {
        messages.push('RAWG accepted the request but returned no games, so there is nothing to display.')
      }

      if (steam.status === 'rejected') {
        messages.push('Steam Spy is unreachable (its public proxies are unreliable) — retrying on the next refresh.')
      }
      setError(messages.length ? messages.join(' ') : null)

      const status = rawgFailure?.reason?.status
      if (status === 401 || status === 403) onAuthFailure?.(status)

      // Only claim a sync when something actually arrived.
      if (rawgCalls.some(r => r.status === 'fulfilled') || steam.status === 'fulfilled') {
        setLastUpdated(new Date())
      }
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [apiKey, rawg, fetchSteam, onAuthFailure])

  useEffect(() => {
    fetchAll()
    const t = setInterval(fetchAll, REFRESH_INTERVAL)
    return () => clearInterval(t)
  }, [fetchAll])

  return { data, loading, lastUpdated, error, refresh: fetchAll }
}
