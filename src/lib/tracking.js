// Booking-click tracking.
//
// The site is static on GitHub Pages, so there is no server to post to. That
// leaves two places a click can go, and both are wired here:
//
//   1. dataLayer — Google Tag Manager is already on every page. Pushing an
//      event costs nothing, works whether or not a tag is configured yet, and
//      lets GA4 (or anything else added to the container later) pick it up
//      without another deploy.
//
//   2. A webhook, if one is configured — the only way to get an actual
//      notification rather than a number on a dashboard.
//
// Note this counts *clicks*, not bookings. Calendly already reports bookings.
// The value here is the gap between the two: how many people reach the
// booking page and never finish.

const WEBHOOK = import.meta.env.VITE_BOOKING_WEBHOOK || ""

// Where on the page the click came from, so the numbers can say which button
// is doing the work — the hero, the pricing cards, the footer — rather than
// just giving one undifferentiated total.
function describe(anchor) {
  // Ordered most specific first. The nav and footer sit outside the page's
  // sections, so without the two landmark checks their buttons would fall
  // through to whatever the last guess was and misreport where clicks came
  // from — which is the one thing this data exists to answer.
  const section = anchor.closest("section[id]")
  const where = section
    ? section.id
    : anchor.closest("footer")
      ? "footer"
      : anchor.closest("nav")
        ? "navbar"
        : "page"

  return {
    label: (anchor.textContent || "").trim().slice(0, 60) || "unlabelled",
    section: where,
    page: window.location.pathname,
  }
}

export function trackBookingClick(anchor) {
  const detail = describe(anchor)

  // GTM reads this array. Creating it if absent means the push survives the
  // container being slow, blocked, or not yet configured.
  window.dataLayer = window.dataLayer || []
  window.dataLayer.push({ event: "book_call_click", ...detail })

  if (!WEBHOOK) return

  const body = JSON.stringify({
    ...detail,
    at: new Date().toISOString(),
    referrer: document.referrer || null,
  })

  // sendBeacon survives the page being left, which a plain fetch may not.
  // text/plain is deliberate: it is CORS-safelisted, so the request goes
  // without a preflight that sendBeacon cannot perform. Receivers like Zapier
  // parse the JSON body regardless of the declared type.
  try {
    if (navigator.sendBeacon) {
      navigator.sendBeacon(WEBHOOK, new Blob([body], { type: "text/plain" }))
    } else {
      fetch(WEBHOOK, { method: "POST", body, keepalive: true, mode: "no-cors" })
    }
  } catch {
    // Tracking must never interfere with the click that triggered it.
  }
}
