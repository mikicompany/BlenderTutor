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
    note: "Visa, Mastercard, Amex. No account needed.",
    // Stripe Payment Links, created at dashboard.stripe.com → Payment links.
    // Each looks like https://buy.stripe.com/xxxxxxxxxxxx
    url: {
      session: "",
      prop: "",
    },
  },
  {
    id: "paypal",
    label: "Pay with PayPal",
    note: "Use your PayPal balance, or a card as a guest.",
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
    // Paste a Wise payment-request link.
    url: "",
  },
]

// Bank transfer, shown as details rather than a button because there is
// nothing to click — the payer copies these into their own banking app.
//
// Worth filling in for students in the EU and Ireland especially: a SEPA
// transfer between euro accounts is normally free and arrives the same day,
// which beats every card option above on cost for both sides.
//
// Fill in `enabled: true` along with the fields that apply. Leave out
// anything that does not — only filled rows are shown.
export const BANK_TRANSFER = {
  enabled: false,
  accountName: "",
  iban: "",
  bic: "",
  bank: "",
  // Shown under the details. Say what the payer should put as a reference so
  // an arriving transfer can be matched to a person.
  reference: "Use your name as the payment reference.",
}

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

// A provider's url may be one string for every item or an object keyed by
// item. Anything else — including a half-filled object with a blank for this
// particular item — counts as not configured.
function urlFor(provider, item) {
  if (provider.handle) return paypalUrl(provider.handle, item.amount)

  const { url } = provider
  if (typeof url === "string") return url.trim()
  if (url && typeof url === "object" && Object.hasOwn(url, item.id)) {
    const specific = url[item.id]
    return typeof specific === "string" ? specific.trim() : ""
  }
  return ""
}

// Only providers that are actually configured come back, so the page can
// never render a button that goes nowhere. The first survivor is primary.
export function methodsFor(item) {
  return PROVIDERS.map((provider) => ({
    id: provider.id,
    label: provider.label,
    note: provider.note,
    url: urlFor(provider, item),
  }))
    .filter((method) => method.url)
    .map((method, index) => ({ ...method, primary: index === 0 }))
}

// Only the rows that have been filled in, so a partly completed block does
// not render as a list of empty labels.
export function bankRows() {
  if (!BANK_TRANSFER.enabled) return []
  return [
    ["Account name", BANK_TRANSFER.accountName],
    ["IBAN", BANK_TRANSFER.iban],
    ["BIC / SWIFT", BANK_TRANSFER.bic],
    ["Bank", BANK_TRANSFER.bank],
  ].filter(([, value]) => typeof value === "string" && value.trim())
}
