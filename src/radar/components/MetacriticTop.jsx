import React from 'react'

function scoreColor(s) {
  if (!s) return 'bg-gray-700 text-gray-400'
  if (s >= 90) return 'bg-green-500 text-white'
  if (s >= 75) return 'bg-yellow-500 text-black'
  if (s >= 60) return 'bg-orange-500 text-white'
  return 'bg-red-600 text-white'
}

function Skeleton() {
  return (
    <div className="flex gap-3 items-start p-2 animate-pulse">
      <div className="w-10 h-10 bg-[#1c1c1c] rounded flex-shrink-0" />
      <div className="flex-1 pt-1 space-y-1.5">
        <div className="h-3 bg-[#1c1c1c] rounded w-full" />
        <div className="h-2.5 bg-[#1c1c1c] rounded w-2/3" />
      </div>
    </div>
  )
}

export default function MetacriticTop({ games, loading }) {
  return (
    <section>
      <h2 className="text-lg font-black text-white uppercase tracking-widest mb-3 font-mono">
        Top 10 · Metacritic
      </h2>

      <div className="space-y-0.5">
        {loading
          ? Array(10).fill(0).map((_, i) => <Skeleton key={i} />)
          : games.map((g, i) => (
            <a
              key={g.id}
              href={`https://rawg.io/games/${g.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex gap-3 items-start p-2 rounded hover:bg-[#141414] transition-colors group"
            >
              <div className={`${scoreColor(g.metacritic)} w-10 h-10 flex-shrink-0 flex items-center justify-center rounded font-black text-sm`}>
                {g.metacritic ?? '?'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-gray-700 text-xs font-mono">{i + 1}.</span>
                  <p className="text-white text-sm font-semibold leading-tight group-hover:text-green-400 transition-colors line-clamp-2">
                    {g.name}
                  </p>
                </div>
                <p className="text-gray-600 text-xs mt-0.5 font-mono ml-4">
                  {g.released}
                  {g.platforms?.[0] && ` · ${g.platforms[0].platform.name}`}
                </p>
              </div>
            </a>
          ))
        }
      </div>
    </section>
  )
}
