import React, { useState } from 'react'

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']
const CHIP_COLORS = [
  'bg-green-700 hover:bg-green-600',
  'bg-blue-700 hover:bg-blue-600',
  'bg-purple-700 hover:bg-purple-600',
  'bg-orange-700 hover:bg-orange-600',
  'bg-pink-700 hover:bg-pink-600',
  'bg-teal-700 hover:bg-teal-600',
  'bg-indigo-700 hover:bg-indigo-600',
  'bg-rose-700 hover:bg-rose-600',
]

export default function ReleasesCalendar({ releases, loading }) {
  const [selected, setSelected] = useState(null)
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()

  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const today = now.getDate()

  const byDay = {}
  releases.forEach((g, idx) => {
    if (!g.released) return
    const d = new Date(g.released)
    if (d.getFullYear() === year && d.getMonth() === month) {
      const day = d.getDate()
      if (!byDay[day]) byDay[day] = []
      byDay[day].push({ ...g, _color: CHIP_COLORS[idx % CHIP_COLORS.length] })
    }
  })

  const cells = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]

  // Pad to complete last row
  while (cells.length % 7 !== 0) cells.push(null)

  return (
    <section>
      <div className="flex items-center gap-4 mb-4">
        <h2 className="text-2xl font-black text-white uppercase">
          Save the Date / Releases Calendar
        </h2>
        <span className="text-green-400 font-black font-mono">
          {MONTHS[month]} {year}
        </span>
      </div>

      {loading ? (
        <div className="h-72 bg-[#0f0f0f] border border-[#1e1e1e] rounded animate-pulse" />
      ) : (
        <div className="bg-[#0f0f0f] border border-[#1e1e1e] rounded overflow-hidden">
          {/* Day headers */}
          <div className="grid grid-cols-7 border-b border-[#1e1e1e]">
            {DAYS.map(d => (
              <div key={d} className="text-center py-2.5 text-xs font-mono font-bold text-gray-600 uppercase tracking-widest">
                {d}
              </div>
            ))}
          </div>

          {/* Grid */}
          <div className="grid grid-cols-7">
            {cells.map((day, i) => {
              const games = day ? byDay[day] || [] : []
              const isToday = day === today
              return (
                <div
                  key={i}
                  className={`min-h-[90px] border-b border-r border-[#161616] p-1.5 ${
                    isToday ? 'bg-green-950/20' : day ? 'hover:bg-[#141414]' : ''
                  } transition-colors`}
                >
                  {day && (
                    <>
                      <div className={`text-xs font-mono mb-1.5 w-6 h-6 flex items-center justify-center rounded-full ${
                        isToday
                          ? 'bg-green-500 text-black font-black'
                          : 'text-gray-600 hover:text-gray-400'
                      }`}>
                        {day}
                      </div>
                      <div className="space-y-0.5">
                        {games.slice(0, 3).map(g => (
                          <a
                            key={g.id}
                            href={`https://rawg.io/games/${g.slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            title={g.name}
                            className={`${g._color} text-white text-[9px] leading-tight px-1.5 py-0.5 rounded block truncate transition-colors`}
                          >
                            {g.name}
                          </a>
                        ))}
                        {games.length > 3 && (
                          <div className="text-gray-700 text-[9px] pl-1 font-mono">
                            +{games.length - 3} more
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </section>
  )
}
