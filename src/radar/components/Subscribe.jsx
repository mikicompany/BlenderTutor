import React, { useState } from 'react'
import { Send } from 'lucide-react'
import { subscribeToNewsletter, isValidEmail } from '../../lib/mailchimp'

export default function Subscribe() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState('idle') // idle | loading | success | error
  const [errorMsg, setErrorMsg] = useState('')

  const submit = async (e) => {
    e.preventDefault()
    if (!isValidEmail(email)) {
      setErrorMsg('Enter a valid email address.')
      setStatus('error')
      return
    }

    setStatus('loading')
    const result = await subscribeToNewsletter(email, { tags: 'the-radar' })

    if (result.ok) {
      setStatus('success')
      setEmail('')
    } else {
      setStatus('error')
      setErrorMsg(result.message)
    }
  }

  return (
    <section className="border-t border-[#1e1e1e] pt-10">
      <div className="max-w-xl mx-auto text-center">
        <div className="flex justify-center mb-4">
          <svg width="36" height="36" viewBox="0 0 72 72" fill="none">
            <circle cx="36" cy="36" r="34" stroke="#22c55e" strokeWidth="1.5" strokeDasharray="4 2" opacity="0.5" />
            <circle cx="36" cy="36" r="3" fill="#22c55e" />
            <line x1="36" y1="36" x2="70" y2="36" stroke="#22c55e" strokeWidth="2" opacity="0.8" />
            <circle cx="53" cy="21" r="2.5" fill="#22c55e" opacity="0.8" />
          </svg>
        </div>

        <h3 className="text-2xl font-black text-white tracking-tight">Stay on the radar</h3>
        <p className="text-gray-500 text-sm mt-2 mb-6 font-mono">
          A PDF snapshot every two weeks: the biggest releases, trending titles,
          and Metacritic highlights.
        </p>

        {status === 'success' ? (
          <div className="bg-green-950/40 border border-green-700/40 text-green-400 text-sm font-mono px-6 py-4 rounded">
            ✓ You're on the radar. Your first snapshot arrives within two weeks.
          </div>
        ) : (
          <form onSubmit={submit} className="flex gap-2">
            <input
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={e => { setEmail(e.target.value); setStatus('idle') }}
              className={`flex-1 bg-[#111] border ${
                status === 'error' ? 'border-red-600/60' : 'border-[#2a2a2a] focus:border-green-500/50'
              } text-white placeholder-gray-700 px-4 py-2.5 rounded text-sm outline-none transition-colors font-mono`}
            />
            <button
              type="submit"
              disabled={status === 'loading'}
              className="flex items-center gap-2 bg-green-500 hover:bg-green-400 active:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed text-black font-black px-5 py-2.5 rounded text-sm transition-colors tracking-wider"
            >
              <Send size={13} className={status === 'loading' ? 'animate-pulse' : ''} />
              {status === 'loading' ? '...' : 'SUBSCRIBE'}
            </button>
          </form>
        )}

        {status === 'error' && (
          <p className="text-red-400 text-xs font-mono mt-2">{errorMsg}</p>
        )}
      </div>
    </section>
  )
}
