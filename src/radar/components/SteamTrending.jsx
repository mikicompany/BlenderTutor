import React from 'react'

function reviewPct(pos, neg) {
  const total = pos + neg
  if (!total) return null
  return Math.round((pos / total) * 100)
}

function formatNum(n) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`
  return String(n)
}

function formatPrice(p) {
  if (!p || p === '0') return 'Free'
  return `$${(parseInt(p, 10) / 100).toFixed(2)}`
}

function ReviewPill({ pct }) {
  if (pct === null) return <span className="text-gray-600">—</span>
  const color = pct >= 80 ? 'text-green-400' : pct >= 60 ? 'text-yellow-400' : 'text-red-400'
  return <span className={`font-mono ${color}`}>{pct}%</span>
}

function SkeletonRow() {
  return (
    <tr className="border-t border-[#1c1c1c] animate-pulse">
      {[4, 40, 12, 10, 14, 10, 12].map((w, i) => (
        <td key={i} className="py-3 px-2">
          <div className={`h-3 bg-[#2a2a2a] rounded`} style={{ width: `${w * 4}px`, marginLeft: i > 1 ? 'auto' : 0 }} />
        </td>
      ))}
    </tr>
  )
}

export default function SteamTrending({ games, loading }) {
  return (
    <section>
      <h2 className="text-2xl font-black text-white uppercase mb-3">
        Trending Now on Steam
        <span className="text-green-400 text-sm font-normal normal-case ml-2 tracking-wider font-mono">(Steam Spy)</span>
      </h2>

      <div className="bg-[#0f0f0f] border border-[#1e1e1e] rounded overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[#161616] text-gray-500 text-[11px] uppercase tracking-widest font-mono">
              <th className="py-2.5 pl-4 pr-2 text-left w-8">#</th>
              <th className="py-2.5 px-2 text-left">Game</th>
              <th className="py-2.5 px-2 text-right">Price</th>
              <th className="py-2.5 px-2 text-right">Reviews</th>
              <th className="hidden sm:table-cell py-2.5 px-2 text-right">Owners</th>
              <th className="hidden sm:table-cell py-2.5 px-2 text-right">Avg/2wk</th>
              <th className="py-2.5 pr-4 text-right">CCU</th>
            </tr>
          </thead>
          <tbody>
            {loading
              ? Array(10).fill(0).map((_, i) => <SkeletonRow key={i} />)
              : games.map((g, i) => {
                const pct = reviewPct(g.positive, g.negative)
                return (
                  <tr
                    key={g.appid}
                    className="border-t border-[#1a1a1a] hover:bg-[#161616] transition-colors group"
                  >
                    <td className="py-3 pl-4 pr-2 text-gray-600 font-mono text-xs">{i + 1}</td>
                    <td className="py-3 px-2 max-w-[120px] sm:max-w-none">
                      <div className="flex items-center gap-2">
                        <img
                          src={`https://cdn.cloudflare.steamstatic.com/steam/apps/${g.appid}/capsule_sm_120.jpg`}
                          alt={g.name}
                          className="h-[18px] w-[45px] object-cover rounded-sm opacity-70 group-hover:opacity-100 transition-opacity flex-shrink-0"
                          onError={e => { e.target.style.display = 'none' }}
                        />
                        <a
                          href={`https://store.steampowered.com/app/${g.appid}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-white hover:text-green-400 transition-colors font-medium text-xs sm:text-sm leading-tight line-clamp-2 sm:line-clamp-1"
                        >
                          {g.name}
                        </a>
                      </div>
                    </td>
                    <td className="py-3 px-2 text-right font-mono text-gray-400 text-xs sm:text-sm">{formatPrice(g.price)}</td>
                    <td className="py-3 px-2 text-right text-xs sm:text-sm"><ReviewPill pct={pct} /></td>
                    <td className="hidden sm:table-cell py-3 px-2 text-right text-gray-500 font-mono text-xs">{g.owners || '—'}</td>
                    <td className="hidden sm:table-cell py-3 px-2 text-right font-mono text-gray-400 text-sm">
                      {g.average_2weeks ? `${g.average_2weeks}m` : '—'}
                    </td>
                    <td className="py-3 pr-4 text-right font-mono text-green-400 font-bold text-xs sm:text-sm">
                      {g.ccu ? formatNum(g.ccu) : '—'}
                    </td>
                  </tr>
                )
              })
            }
          </tbody>
        </table>
      </div>
    </section>
  )
}
