import React, { useEffect, useRef, useState } from "react"
import { ExternalLink, CalendarDays } from "lucide-react"
import { SESSION_BOOKING_URL } from "../lib/links"

// The booking calendar on /pay, embedded as a plain iframe.
//
// This used to load Calendly's widget script. An iframe is better here for
// two reasons: it ties the page to no particular scheduler — Calendly,
// Cal.com and Google's booking pages all embed the same way, so switching is
// a URL change — and it adds no third-party JavaScript to a page that is
// handling a payment.
//
// Calendly reads these as theme parameters and other schedulers ignore
// unknown query keys, so they are safe to send either way. Without them a
// Calendly embed is a white panel in a black page.
const THEME_PARAMS = {
  hide_gdpr_banner: "1",
  background_color: "0f1011",
  text_color: "ffffff",
  primary_color: "f37d16",
}

function embedUrl(base) {
  try {
    const url = new URL(base)
    for (const [key, value] of Object.entries(THEME_PARAMS)) {
      // Never clobber a parameter already on the configured URL — it was put
      // there deliberately.
      if (!url.searchParams.has(key)) url.searchParams.set(key, value)
    }
    return url.toString()
  } catch {
    // A malformed URL in config should not take the page down; the fallback
    // link below still gives the visitor somewhere to go.
    return base
  }
}

// Long enough for a slow connection, short enough that nobody sits in front
// of a blank rectangle wondering whether the page is broken.
const TIMEOUT_MS = 8000

const BookingEmbed = () => {
  const [status, setStatus] = useState("loading") // loading | ready | failed
  const settled = useRef(false)
  const alive = useRef(true)

  useEffect(() => {
    alive.current = true

    const settle = (next) => {
      if (settled.current || !alive.current) return
      settled.current = true
      setStatus(next)
    }

    // Privacy extensions, strict blockers and corporate networks stop
    // scheduler domains often enough that "the calendar never appears" is a
    // real outcome, not a hypothetical one.
    //
    // The iframe cannot report this itself: a blocked frame still fires
    // onLoad — the browser loaded its own error page into it — and
    // same-origin policy forbids looking inside to tell the difference. Left
    // to onLoad, a blocked calendar renders as a grey broken-frame box on a
    // page someone is trying to pay through.
    //
    // So reachability is probed first. A no-cors request yields an opaque
    // response that reveals nothing about the body, which is all that is
    // needed here: it resolves when the request got out and rejects when
    // something blocked it.
    const controller = new AbortController()
    const timer = setTimeout(() => {
      controller.abort()
      settle("failed")
    }, TIMEOUT_MS)

    fetch(SESSION_BOOKING_URL, { mode: "no-cors", signal: controller.signal })
      .then(() => settle("ready"))
      .catch(() => settle("failed"))
      .finally(() => clearTimeout(timer))

    return () => {
      alive.current = false
      clearTimeout(timer)
      controller.abort()
    }
  }, [])

  if (!SESSION_BOOKING_URL) return null

  return (
    <div>
      <div
        className="relative rounded-xl overflow-hidden border border-white/10 bg-[#0f1011]"
        style={{ height: status === "failed" ? "auto" : "660px" }}
      >
        {/* Mounted only once the probe has succeeded, so a blocked frame is
            never shown mid-failure. */}
        {status === "ready" && (
          <iframe
            src={embedUrl(SESSION_BOOKING_URL)}
            title="Booking calendar"
            className="absolute inset-0 w-full h-full"
            style={{ border: 0, minWidth: "280px" }}
          />
        )}

        {status === "loading" && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <p className="text-xs text-gray-600">Loading calendar…</p>
          </div>
        )}

        {status === "failed" && (
          <div className="p-6 text-center">
            <CalendarDays className="w-5 h-5 text-orange-500 mx-auto mb-3" />
            <p className="text-[13px] text-gray-400 leading-relaxed mb-5 max-w-xs mx-auto">
              The calendar could not load here — a browser extension or network
              is most likely blocking it. It works fine in a new tab.
            </p>
            <a
              href={SESSION_BOOKING_URL}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 bg-orange-500 text-black hover:bg-orange-600 px-5 py-3 rounded-xl text-sm font-bold transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
            >
              Open the booking page
              <ExternalLink size={15} />
            </a>
          </div>
        )}
      </div>

      {/* Kept even when the iframe reports success, because it can load and
          then fail inside itself — which no amount of watching from out here
          will ever see. */}
      {status !== "failed" && (
        <p className="text-[11.5px] text-gray-500 mt-3">
          Calendar not loading?{" "}
          <a
            href={SESSION_BOOKING_URL}
            target="_blank"
            rel="noreferrer"
            className="text-gray-400 hover:text-orange-400 underline underline-offset-2 inline-flex items-center gap-1"
          >
            Open the booking page
            <ExternalLink size={11} />
          </a>
        </p>
      )}
    </div>
  )
}

export default BookingEmbed
