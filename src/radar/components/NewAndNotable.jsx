import React from 'react'

function scoreColor(s) {
  if (!s) return 'bg-gray-700'
  if (s >= 90) return 'bg-green-500'
  if (s >= 75) return 'bg-yellow-500'
  if (s >= 60) return 'bg-orange-500'
  return 'bg-red-600'
}

function Skeleton() {
  return (
    <div className="flex-shrink-0 w-44 animate-pulse">
      <div className="w-full h-58 bg-[#1c1c1c] rounded" style={{ height: '224px' }} />
      <div className="h-3 bg-[#1c1c1c] rounded mt-2 w-4/5" />
      <div className="h-3 bg-[#1c1c1c] rounded mt-1 w-2/3" />
    </div>
  )
}

export default function NewAndNotable({ games, loading }) {
  const today = new Date()
  const dateStr = `${String(today.getMonth() + 1).padStart(2, '0')}/${String(today.getDate()).padStart(2, '0')}/${today.getFullYear()}`

  return (
    <section>
      <div className="flex items-baseline gap-3 mb-4">
        <h2 className="text-2xl font-black text-white">New and notable</h2>
        <span className="text-green-400 font-mono text-sm">{dateStr}</span>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-3 scrollbar-hide">
        {loading
          ? Array(6).fill(0).map((_, i) => <Skeleton key={i} />)
          : games.map(g => (
            <a
              key={g.id}
              href={`https://rawg.io/games/${g.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-shrink-0 w-44 group"
            >
              <div className="relative w-full rounded overflow-hidden bg-[#1c1c1c]" style={{ height: '224px' }}>
                {g.background_image && (
                  <img
                    src={g.background_image}
                    alt={g.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                {g.metacritic && (
                  <div className={`absolute bottom-2 left-2 ${scoreColor(g.metacritic)} text-white font-black text-xl w-11 h-11 flex items-center justify-center rounded shadow-lg`}>
                    {g.metacritic}
                  </div>
                )}
                {g.ratings_count > 0 && (
                  <div className="absolute top-2 right-2 bg-black/60 text-gray-300 text-[10px] font-mono px-1.5 py-0.5 rounded">
                    ★ {g.rating?.toFixed(1)}
                  </div>
                )}
              </div>
              <p className="text-white text-sm font-semibold mt-2 leading-tight line-clamp-2 group-hover:text-green-400 transition-colors">
                {g.name}
              </p>
              <p className="text-gray-600 text-xs mt-0.5 font-mono">{g.released}</p>
            </a>
          ))
        }
      </div>
    </section>
  )
}
