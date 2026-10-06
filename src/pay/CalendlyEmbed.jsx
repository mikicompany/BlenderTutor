import React, { useEffect, useState } from "react"
import { ExternalLink, CalendarDays } from "lucide-react"
import { SESSION_BOOKING_URL } from "../lib/links"

// Calendly's inline widget, themed to match the site.
//
// The colour parameters are Calendly's own and take bare hex with no "#".
// Without them the embed is a white panel dropped into a black page, which
// looks like a broken frame rather than part of the site.
const EMBED_URL =
  `${SESSION_BOOKING_URL}?hide_gdpr_banner=1` +
  `&background_color=0f1011&text_color=ffffff&primary_color=f37d16`

const WIDGET_SRC = "https://assets.calendly.com/assets/external/widget.js"

// Long enough for a slow connection, short enough that nobody sits in front
// of a blank rectangle wondering whether the page is broken.
const TIMEOUT_MS = 8000

const CalendlyEmbed = () => {
  const [status, setStatus] = useState("loading") // loading | ready | failed

  useEffect(() => {
    let settled = false
    const settle = (next) => {
      if (settled) return
      settled = true
      setStatus(next)
    }

    // Privacy extensions, strict blockers and corporate networks stop
    // assets.calendly.com often enough that "the calendar never appears" is a
    // real outcome, not a hypothetical one. Tracking it explicitly is what
    // lets the component swap in a working alternative instead of leaving a
    // 660px hole on the page someone is trying to pay through.
    const existing = document.querySelector(`script[src="${WIDGET_SRC}"]`)
    if (existing) {
      // Already loaded by an earlier mount — the widget binds any unbound
      // container itself, so there is nothing to wait for.
      settle("ready")
      return
    }

    const script = document.createElement("script")
    script.src = WIDGET_SRC
    script.async = true
    // A short delay past onload, so the overlay lifts on the iframe rather
    // than on an empty container the widget has not filled yet.
    script.onload = () => setTimeout(() => settle("ready"), 400)
    script.onerror = () => settle("failed")
    document.body.appendChild(script)

    const timer = setTimeout(() => settle("failed"), TIMEOUT_MS)

    return () => {
      clearTimeout(timer)
      // The script tag is deliberately left in place. The widget keeps state
      // on window, and pulling the script out from under it leaves the page
      // worse off than an idle script tag does.
    }
  }, [])

  return (
    <div>
      <div
        className="relative rounded-xl overflow-hidden border border-white/10 bg-[#0f1011]"
        style={{ height: status === "failed" ? "auto" : "660px" }}
      >
        {/* Stays mounted in every state: the widget script looks for this
            container when it loads, so unmounting it is what would actually
            break the embed. */}
        {status !== "failed" && (
          <div
            className="calendly-inline-widget absolute inset-0"
            data-url={EMBED_URL}
            style={{ minWidth: "280px", height: "100%" }}
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

      {/* Kept even when the embed reports success, because it can load and
          then fail inside its own iframe — which no amount of script
          watching from out here will ever see. */}
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

export default CalendlyEmbed
