import React, { useState, useEffect } from 'react'
import { RefreshCw, Key } from 'lucide-react'

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']

export default function RadarHeader({ lastUpdated, loading, onRefresh, onResetKey }) {
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  return (
    <header className="border-b border-green-500/20 bg-[#0a0a0a]">
      <div className="max-w-[1400px] mx-auto px-4 py-4">
        {/* Mobile: stacked layout */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          {/* Logo row */}
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 sm:w-[70px] sm:h-[70px] flex-shrink-0">
              <RadarIcon />
            </div>
            <div>
              <h1 className="text-3xl sm:text-5xl font-black tracking-tighter text-white leading-none select-none">
                THE RADAR
              </h1>
              <p className="text-green-400 text-[10px] sm:text-xs tracking-[0.3em] uppercase mt-0.5 font-mono">
                Game news in a glimpse
              </p>
            </div>
          </div>

          {/* Date + controls row */}
          <div className="flex items-center justify-between sm:flex-col sm:items-end gap-2">
            <div>
              <div className="text-base sm:text-2xl font-black text-white tracking-wide">
                {MONTHS[now.getMonth()].toUpperCase()} {now.getFullYear()}
              </div>
              <div className="text-green-400 font-mono text-xs sm:text-sm">
                {now.toLocaleTimeString()}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {lastUpdated && (
                <span className="hidden sm:inline text-gray-600 text-xs font-mono">
                  synced {lastUpdated.toLocaleTimeString()}
                </span>
              )}
              <button
                onClick={onRefresh}
                disabled={loading}
                className="flex items-center gap-1.5 text-xs text-green-400 hover:text-green-300 border border-green-500/30 hover:border-green-400/60 px-3 py-1.5 rounded transition-all disabled:opacity-40 font-mono"
              >
                <RefreshCw size={11} className={loading ? 'animate-spin' : ''} />
                {loading ? 'SCANNING...' : 'REFRESH'}
              </button>
              <button
                onClick={onResetKey}
                title="Change API key"
                className="text-gray-600 hover:text-gray-400 border border-gray-800 hover:border-gray-600 p-1.5 rounded transition-all"
              >
                <Key size={11} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}

function RadarIcon() {
  return (
    <svg width="70" height="70" viewBox="0 0 72 72" fill="none" className="flex-shrink-0">
      <defs>
        <radialGradient id="sweepFade" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse"
          gradientTransform="translate(36 36) scale(34)">
          <stop offset="0%" stopColor="#22c55e" stopOpacity="0.05" />
          <stop offset="100%" stopColor="#22c55e" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Static rings */}
      <circle cx="36" cy="36" r="34" stroke="#22c55e" strokeWidth="1.5" strokeDasharray="4 2" opacity="0.6" />
      <circle cx="36" cy="36" r="24" stroke="#22c55e" strokeWidth="0.75" opacity="0.35" />
      <circle cx="36" cy="36" r="14" stroke="#22c55e" strokeWidth="0.75" opacity="0.2" />

      {/* Static crosshairs */}
      <line x1="36" y1="2" x2="36" y2="70" stroke="#22c55e" strokeWidth="0.5" opacity="0.25" />
      <line x1="2" y1="36" x2="70" y2="36" stroke="#22c55e" strokeWidth="0.5" opacity="0.25" />

      {/* Rotating sweep group */}
      <g className="radar-sweep">
        {/* Sweep trail wedge */}
        <path
          d="M36 36 L70 36 A34 34 0 0 0 36 2 Z"
          fill="#22c55e"
          opacity="0.06"
        />
        {/* Sweep line */}
        <line x1="36" y1="36" x2="70" y2="36" stroke="#22c55e" strokeWidth="2" opacity="0.9"
          style={{ filter: 'drop-shadow(0 0 3px #22c55e)' }} />
      </g>

      {/* Center dot */}
      <circle cx="36" cy="36" r="3" fill="#22c55e" />

      {/* Blips */}
      <circle cx="53" cy="21" r="2.5" fill="#22c55e" className="radar-blip-1"
        style={{ filter: 'drop-shadow(0 0 4px #22c55e)' }} />
      <circle cx="19" cy="49" r="2" fill="#22c55e" className="radar-blip-2"
        style={{ filter: 'drop-shadow(0 0 3px #22c55e)' }} />
      <circle cx="46" cy="51" r="1.5" fill="#22c55e" className="radar-blip-3"
        style={{ filter: 'drop-shadow(0 0 3px #22c55e)' }} />
    </svg>
  )
}
