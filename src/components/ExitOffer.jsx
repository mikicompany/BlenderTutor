import React, { useEffect, useState, useCallback } from "react"
import { useLocation } from "react-router-dom"
import { subscribeToNewsletter, isValidEmail } from "../lib/newsletter"

// Exit-intent lead capture. When a desktop visitor's cursor leaves the top of
// the viewport (the "I'm about to close the tab" gesture), or a mobile visitor
// has scrolled a while, we offer the free beginner's guide in exchange for an
// email. Shown at most once per visitor (localStorage), and never on the
// transactional / utility routes.
const SEEN_KEY = "bt_exit_offer_seen_v1"
const GUIDE_URL = "/blender-beginners-guide.pdf"
const SKIP_ROUTES = ["/pay", "/radar", "/terms", "/privacy"]

const alreadySeen = () => {
  try {
    return localStorage.getItem(SEEN_KEY) === "1"
  } catch {
    return false
  }
}
const markSeen = () => {
  try {
    localStorage.setItem(SEEN_KEY, "1")
  } catch {
    /* private mode — just show once this session instead */
  }
}

const ExitOffer = () => {
  const { pathname } = useLocation()
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState("")
  const [status, setStatus] = useState("idle") // idle | loading | done | error
  const [msg, setMsg] = useState("")

  const skip = SKIP_ROUTES.some((r) => pathname === r || pathname.startsWith(r + "/"))

  const trigger = useCallback(() => {
    if (alreadySeen()) return
    markSeen()
    setOpen(true)
  }, [])

  useEffect(() => {
    if (skip || alreadySeen()) return

    // Desktop: fire when the mouse leaves through the top edge.
    const onLeave = (e) => {
      if (e.clientY <= 0) trigger()
    }
    // Touch devices have no mouseleave — fall back to a scroll-depth + dwell
    // trigger so the offer still appears for engaged mobile readers.
    let scrolled = false
    const onScroll = () => {
      const d = document.documentElement
      const pct = (d.scrollTop + window.innerHeight) / d.scrollHeight
      if (pct > 0.55) scrolled = true
    }
    const mobileTimer = setTimeout(() => {
      if (scrolled) trigger()
    }, 35000)

    document.addEventListener("mouseout", onLeave)
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => {
      document.removeEventListener("mouseout", onLeave)
      window.removeEventListener("scroll", onScroll)
      clearTimeout(mobileTimer)
    }
  }, [skip, trigger])

  if (!open) return null

  const close = () => setOpen(false)

  const submit = async (e) => {
    e.preventDefault()
    if (status === "loading") return
    if (!isValidEmail(email)) {
      setStatus("error")
      setMsg("That doesn't look like a valid email.")
      return
    }
    setStatus("loading")
    setMsg("")
    try {
      const res = await subscribeToNewsletter(email, { source: "exit-intent-guide" })
      if (res && res.ok) {
        setStatus("done")
      } else {
        setStatus("error")
        setMsg((res && res.message) || "Something went wrong — try again.")
      }
    } catch {
      setStatus("error")
      setMsg("Something went wrong — try again.")
    }
  }

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm px-4"
      onClick={close}
      role="dialog"
      aria-modal="true"
      aria-labelledby="exit-offer-title"
    >
      <div
        className="relative w-full max-w-md rounded-2xl border border-white/10 bg-[#151617] p-7 text-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={close}
          aria-label="Close"
          className="absolute right-4 top-4 text-gray-500 hover:text-white text-xl leading-none"
        >
          ×
        </button>

        {status === "done" ? (
          <div className="text-center py-2">
            <div className="text-4xl mb-3">✅</div>
            <h2 className="text-xl font-bold mb-2">You're in — here's the guide</h2>
            <p className="text-gray-400 text-sm mb-6">
              Check your inbox for the newsletter confirmation too. Your free
              beginner's guide is ready below.
            </p>
            <a
              href={GUIDE_URL}
              target="_blank"
              rel="noreferrer"
              onClick={close}
              className="inline-block px-6 py-3 rounded-xl bg-orange-500 text-black font-bold hover:shadow-[0_0_20px_rgba(255,165,0,0.45)] transition-all"
            >
              Download the guide ↓
            </a>
          </div>
        ) : (
          <>
            <p className="uppercase tracking-[0.18em] text-[10px] font-bold text-orange-500 mb-3">
              Before you go
            </p>
            <h2 id="exit-offer-title" className="text-2xl font-bold mb-2 leading-snug">
              Grab the free Blender beginner's guide
            </h2>
            <p className="text-gray-400 text-sm mb-5 leading-relaxed">
              The shortcuts, settings and first-week roadmap I give every new
              student — so you skip the confusing part. Straight to your inbox,
              no spam, unsubscribe anytime.
            </p>
            <form onSubmit={submit} className="space-y-3">
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  if (status === "error") setStatus("idle")
                }}
                placeholder="you@email.com"
                autoFocus
                className="w-full rounded-xl bg-black/40 border border-white/15 px-4 py-3 text-[15px] outline-none focus:border-orange-500/60"
              />
              {status === "error" && (
                <p className="text-red-400 text-xs">{msg}</p>
              )}
              <button
                type="submit"
                disabled={status === "loading"}
                className="w-full px-6 py-3 rounded-xl bg-orange-500 text-black font-bold hover:shadow-[0_0_20px_rgba(255,165,0,0.45)] transition-all disabled:opacity-60"
              >
                {status === "loading" ? "Sending…" : "Send me the guide"}
              </button>
            </form>
            <button
              onClick={close}
              className="mt-3 w-full text-center text-xs text-gray-500 hover:text-gray-300"
            >
              No thanks, I'll keep reading
            </button>
          </>
        )}
      </div>
    </div>
  )
}

export default ExitOffer
