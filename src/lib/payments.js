// Configuration for the /pay page.
//
// The page is a link you send directly to someone — in Discord, in an email,
// in a DM — rather than something reached by browsing the site. It carries no
// merchant integration of its own: it hands the payer off to a provider, who
// takes the card or account details. Nothing sensitive passes through this
// site, which is the whole reason to do it this way.
//
// ──────────────────────────────────────────────────────────────────────────
// TO ADD A PAYMENT OPTION, FILL IN ITS ENTRY BELOW AND REBUILD.
// Options with nothing filled in are not rendered, so the page can never
// show a button that goes nowhere. With none filled in at all, it shows a
// notice and the contact address instead.
// ──────────────────────────────────────────────────────────────────────────

// What can be paid for here. Prices mirror the cards in Packages.jsx and are
// in USD, matching what the site quotes everywhere else.
//
// Portfolio Scene is deliberately absent: it is priced on the intro call, so
// there is no fixed amount to charge and a link promising one would be wrong.
export const ITEMS = {
  session: {
    name: "One 1-hour session",
    amount: 49,
    summary:
      "A single live session. Bring a project, a problem, or a list of questions.",
    includes: [
      "One hour, live, screen shared both ways",
      "Recording afterwards, yours to keep",
      "Follow-up notes on what to practise next",
    ],
  },
  prop: {
    name: "Portfolio Prop — 8 sessions",
    amount: 399,
    summary:
      "Eight sessions that take one prop from blockout to portfolio-ready.",
    includes: [
      "8 one-hour sessions",
      "Modeling, UVs and texturing",
      "Feedback between sessions",
      "Session recordings",
      "Final presentation renders",
    ],
  },
}

export const DEFAULT_ITEM = "session"

// Payment options, in the order they appear on the page. The first one with a
// working link renders as the primary button.
//
// Each entry is enabled by exactly one of two fields:
//
//   handle — a username the link is BUILT from. Only PayPal works this way,
//            because its URL format is documented and takes the amount as a
//            path segment, so one handle serves every price.
//
//   url    — a link you PASTE, because the provider generates it rather than
//            letting you construct it. Either:
//              a string  — one link used for every item. If the link has no
//                          amount baked in, the payer types it; the page
//                          shows the amount right above the button.
//              an object — a different link per item, keyed as in ITEMS.
//                          Stripe needs this: a Stripe link has its price
//                          fixed, so it cannot be reused across amounts.
//
// Adding a provider that is not here is a matter of adding an entry: give it
// an id, a label, a note, and a url. Nothing else needs changing.
export const PROVIDERS = [
  {
    id: "card",
    label: "Pay by card",
    note: "Visa, Mastercard, Amex, Apple Pay. No account needed.",
    // Takes a hosted checkout link from EITHER processor — whichever account
    // exists. Both operate in Canada and both charge 2.9% + 30c on a link.
    //
    //   Square  — Dashboard → Payments → Links → Create a payment link.
    //             Comes out as https://square.link/u/xxxxxxxx
    //   Stripe  — dashboard.stripe.com → Payment links → New.
    //             Comes out as https://buy.stripe.com/xxxxxxxxxxxx
    //
    // Not to be confused with a Weebly or Square *admin* URL. Anything
    // containing /app/, /deeplink/, a site_id or a dashboard path is a link
    // into the account's own back office: it asks the visitor to sign in and
    // takes no payment. A real checkout link opens a payment page for
    // somebody who has never heard of the account behind it.
    //
    // IMPORTANT, when creating each link: turn on the redirect-after-payment
    // option — Square calls it "Redirect to a website after checkout",
    // Stripe "Redirect customers to your website" — and paste the matching
    // URL:
    //
    //   https://www.blendertutoring.com/pay?paid=1&item=session
    //   https://www.blendertutoring.com/pay?paid=1&item=prop
    //
    // CURRENCY. A Canadian Square account can only charge CAD — there is no
    // USD option and no multi-currency setting. The site quotes USD, so the
    // card link charges the CAD equivalent, and the exact CAD figure is
    // declared below and shown on the button. Without that, a student agrees
    // to $49 and meets a different number at checkout, which is the kind of
    // surprise that loses the sale rather than just annoying someone.
    //
    // These must match the amounts actually set on the links. Exchange rates
    // move, so revisit them now and then; nothing here updates by itself, and
    // a stale figure on the button is worse than none at all.
    chargeCurrency: "CAD",
    chargeAmounts: {
      session: 0,
      prop: 0,
    },
    //
    // That is what sends someone straight back to the booking calendar the
    // moment they have paid, instead of leaving them on a receipt page with
    // no idea what happens next.
    url: {
      session: "",
      prop: "",
    },
  },
  {
    id: "paypal",
    label: "Pay with PayPal",
    // Deliberately does not promise card-without-an-account. PayPal's guest
    // checkout exists but is not guaranteed: it depends on the payer's
    // country, the merchant setup and PayPal's own risk checks, and it
    // silently does not appear when those do not line up. A payment page
    // should not promise a route that may not be there when someone arrives.
    note: "From your PayPal balance or a linked card.",
    // Just the username, not an email address — PayPal.me links are built
    // from a handle, so a payment cannot be addressed to an email this way.
    // This must be the handle of the account the money should land in:
    // opening paypal.me/<handle> should show your own name.
    handle: "mikibutler",
  },
  {
    id: "revolut",
    label: "Pay with Revolut",
    note: "Instant, and free to send from anywhere in Europe.",
    // Paste a Revolut.me link from the app — Revolut generates these, they
    // are not built from a username, so there is nothing to construct here.
    // A link with an amount set is per-item and belongs in an object;
    // a plain revolut.me link works for everything as a string.
    url: "",
  },
  {
    id: "wise",
    label: "Pay with Wise",
    note: "Good exchange rates when paying from another currency.",
    // A Wise pay-me link. It carries no amount, so the payer types it — the
    // figure is shown directly above this button, which is why that is fine.
    //
    // Wise does document an ?amount= parameter for some link types, but it
    // is not used here: it could not be verified from the build environment,
    // and a payment link that silently stops working is the worst kind to
    // guess at.
    url: "https://wise.com/pay/me/miguelc293",
  },
]

// Transfers, shown as copyable details rather than buttons because there is
// nothing to click — the payer types these into their own banking app.
//
// These cost nothing in fees, which is what makes them worth the extra step:
// on the $399 package a card takes roughly $16, and a transfer takes none.
//
// Set `enabled: true` and fill in the fields that apply. Blank fields are
// not rendered, and an entry with no filled fields is skipped entirely, so a
// half-finished block never shows up as a row of empty labels.
export const TRANSFERS = [
  {
    id: "interac",
    title: "Interac e-Transfer",
    note: "From any Canadian bank. Free, and usually arrives within minutes.",
    enabled: false,
    fields: {
      // The email or phone number registered for Interac Autodeposit. With
      // Autodeposit on there is no security question to agree, which is what
      // makes this genuinely one step for the sender.
      "Send to": "",
    },
    footer: "Put your name in the message so I can match the payment to you.",
  },
  {
    id: "bank",
    title: "Bank transfer",
    note: "Best from inside the EU, where a SEPA transfer is free and same-day.",
    enabled: false,
    fields: {
      "Account name": "",
      IBAN: "",
      "BIC / SWIFT": "",
      Bank: "",
    },
    footer: "Use your name as the payment reference.",
  },
]

// The ?item= value arrives from a URL, so it is untrusted input. Looking it up
// with hasOwn rather than `ITEMS[key]` keeps inherited keys such as
// "constructor" or "toString" from resolving to something that is not an item
// and crashing the page.
export function resolveItem(key) {
  const id =
    typeof key === "string" && Object.hasOwn(ITEMS, key) ? key : DEFAULT_ITEM
  return { id, ...ITEMS[id] }
}

// ?name=Stefan puts "Prepared for Stefan" on the page, so a link sent to one
// person reads as though it was meant for them.
//
// Letters, spaces, hyphens and apostrophes only. React escapes what it
// renders, so this is not an injection defence — it stops the page being
// defaced with arbitrary text by anyone passing the link around.
export function resolveName(raw) {
  if (typeof raw !== "string") return null
  const cleaned = raw.replace(/[^\p{L}\p{M} '-]/gu, "").trim().slice(0, 24)
  return cleaned || null
}

// PayPal.me takes the amount and currency in the path, e.g.
// /paypalme/mikibutler/49USD, and opens with that amount already filled in.
function paypalUrl(handle, amount) {
  return `https://www.paypal.com/paypalme/${encodeURIComponent(
    handle.replace(/^@/, "")
  )}/${amount}USD`
}

// Shapes that mean somebody has pasted a link into their OWN back office
// rather than a customer-facing checkout. It is an easy mistake — those URLs
// are what you are looking at while setting a payment link up, and they are
// right there in the address bar — and a silent one, because the button looks
// perfectly fine and simply shows the student a login screen.
const BACK_OFFICE = [
  /\/app\//i,
  /deeplink/i,
  /[?&]site_id=/i,
  /\/dashboard(\/|$|\?)/i,
  /\/admin(\/|$|\?)/i,
  /\/login(\/|$|\?)/i,
  /\/signin(\/|$|\?)/i,
]

// Fails closed: anything suspect is treated as not configured, so the button
// does not render at all. A missing payment option is recoverable; one that
// sends a paying student to a sign-in page is not, because they will assume
// the business is broken and leave.
function usableUrl(raw) {
  const url = typeof raw === "string" ? raw.trim() : ""
  if (!url) return ""

  let parsed
  try {
    parsed = new URL(url)
  } catch {
    return warnUnusable(url, "is not a valid URL")
  }

  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    return warnUnusable(url, "is not an http(s) link")
  }

  if (BACK_OFFICE.some((pattern) => pattern.test(url))) {
    return warnUnusable(
      url,
      "looks like an admin or dashboard page rather than a checkout link " +
        "a customer can pay through"
    )
  }

  return url
}

function warnUnusable(url, why) {
  // Says so out loud rather than failing mutely, so the reason is findable
  // the moment anyone opens the console wondering where the button went.
  if (typeof console !== "undefined") {
    console.warn(`[payments] ignoring payment link — it ${why}:`, url)
  }
  return ""
}

// A provider's url may be one string for every item or an object keyed by
// item. Anything else — including a half-filled object with a blank for this
// particular item — counts as not configured.
function urlFor(provider, item) {
  if (provider.handle) return paypalUrl(provider.handle, item.amount)

  const { url } = provider
  if (typeof url === "string") return usableUrl(url)
  if (url && typeof url === "object" && Object.hasOwn(url, item.id)) {
    return usableUrl(url[item.id])
  }
  return ""
}

// The figure a provider will actually charge, when that differs from the USD
// price on the card — currently only the Square link, which is CAD-only.
// Returns null when the provider charges what the page says, so the button
// stays uncluttered in the normal case.
function chargeLabel(provider, item) {
  const amount = provider.chargeAmounts?.[item.id]
  if (!provider.chargeCurrency || !amount) return null

  // The currency code is appended rather than left to Intl, which renders
  // CAD as a bare "$69" in most locales — indistinguishable from the USD
  // price above it, which is the exact confusion this label exists to stop.
  try {
    const formatted = new Intl.NumberFormat("en-CA", {
      style: "currency",
      currency: provider.chargeCurrency,
      currencyDisplay: "narrowSymbol",
      maximumFractionDigits: 0,
    }).format(amount)
    return `${formatted} ${provider.chargeCurrency}`
  } catch {
    return `${amount} ${provider.chargeCurrency}`
  }
}

// Only providers that are actually configured come back, so the page can
// never render a button that goes nowhere. The first survivor is primary.
export function methodsFor(item) {
  return PROVIDERS.map((provider) => ({
    id: provider.id,
    label: provider.label,
    note: provider.note,
    charge: chargeLabel(provider, item),
    url: urlFor(provider, item),
  }))
    .filter((method) => method.url)
    .map((method, index) => ({ ...method, primary: index === 0 }))
}

// Enabled transfers, each reduced to the rows actually filled in. An entry
// left blank disappears rather than rendering as empty labels.
export function transfersToShow() {
  return TRANSFERS.filter((t) => t.enabled)
    .map((t) => ({
      ...t,
      rows: Object.entries(t.fields).filter(
        ([, value]) => typeof value === "string" && value.trim()
      ),
    }))
    .filter((t) => t.rows.length > 0)
}
