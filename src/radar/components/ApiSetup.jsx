import React, { useState } from 'react'

export default function ApiSetup({ onSetKey }) {
  const [key, setKey] = useState('')

  const submit = () => {
    const trimmed = key.trim()
    if (trimmed) onSetKey(trimmed)
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-4">
      <div className="text-center max-w-md w-full">
        <div className="flex justify-center mb-6">
          <svg width="80" height="80" viewBox="0 0 72 72" fill="none">
            <circle cx="36" cy="36" r="34" stroke="#22c55e" strokeWidth="1.5" strokeDasharray="4 2" opacity="0.7" />
            <circle cx="36" cy="36" r="24" stroke="#22c55e" strokeWidth="1" opacity="0.4" />
            <circle cx="36" cy="36" r="14" stroke="#22c55e" strokeWidth="1" opacity="0.25" />
            <circle cx="36" cy="36" r="4" fill="#22c55e" />
            <line x1="36" y1="2" x2="36" y2="70" stroke="#22c55e" strokeWidth="0.75" opacity="0.3" />
            <line x1="2" y1="36" x2="70" y2="36" stroke="#22c55e" strokeWidth="0.75" opacity="0.3" />
            <line x1="36" y1="36" x2="70" y2="36" stroke="#22c55e" strokeWidth="2" opacity="0.9" />
            <circle cx="53" cy="21" r="2.5" fill="#22c55e" opacity="0.9" />
          </svg>
        </div>

        <h1 className="text-5xl font-black text-white tracking-tighter leading-none">THE RADAR</h1>
        <p className="text-green-400 text-xs tracking-[0.35em] uppercase mt-2 mb-8 font-mono">
          Game news in a glimpse
        </p>

        <p className="text-gray-500 text-sm mb-3 leading-relaxed">
          The Radar pulls live game data from{' '}
          <span className="text-white font-semibold">RAWG.io</span>.
          Get a free API key — no credit card required.
        </p>

        <a
          href="https://rawg.io/apidocs"
          target="_blank"
          rel="noopener noreferrer"
          className="text-green-400 hover:text-green-300 text-sm font-mono underline underline-offset-2 block mb-8 transition-colors"
        >
          → rawg.io/apidocs — get your free key
        </a>

        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Paste RAWG API key..."
            value={key}
            onChange={e => setKey(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && submit()}
            className="flex-1 bg-[#141414] border border-[#2a2a2a] focus:border-green-500/60 text-white placeholder-gray-700 px-4 py-2.5 rounded text-sm outline-none transition-colors font-mono"
            autoFocus
          />
          <button
            onClick={submit}
            disabled={!key.trim()}
            className="bg-green-500 hover:bg-green-400 active:bg-green-600 disabled:opacity-30 disabled:cursor-not-allowed text-black font-black px-6 py-2.5 rounded text-sm transition-colors tracking-wider"
          >
            GO
          </button>
        </div>

        <p className="text-gray-700 text-xs mt-4 font-mono">
          Key is saved locally in your browser. Never sent anywhere else.
        </p>
      </div>
    </div>
  )
}
