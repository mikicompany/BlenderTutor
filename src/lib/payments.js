// Configuration for the /pay page.
//
// The page is a link you send directly to someone — in Discord, in an email,
// in a DM — rather than something reached by browsing the site. It carries no
// merchant integration of its own: it hands the payer off to Stripe or PayPal,
// who take the card details. Nothing sensitive passes through this site, which
// is the whole reason to do it this way.
//
// ──────────────────────────────────────────────────────────────────────────
// TO MAKE THE PAGE LIVE, FILL IN ONE OF THE TWO BELOW AND REBUILD.
// Until at least one is set, /pay shows a "not ready yet" notice and points
// the visitor at the contact address instead of offering a dead button.
// ──────────────────────────────────────────────────────────────────────────

// Your PayPal.me handle — just the name, not an email address. PayPal.me
// links are built from a username, so a payment cannot be addressed to
// "someone@example.com" this way; receiving by email address is what PayPal
// invoicing does instead, and that is sent from PayPal rather than from here.
//
// One handle covers every amount: the amount is appended to the URL, so
// adding a package below never needs a new PayPal link. The handle lives at
// paypal.com/paypalme.
//
// This must be the handle of the account the money should land in. Opening
// https://www.paypal.com/paypalme/mikibutler should show your own name.
export const PAYPAL_ME_HANDLE = "mikibutler"

// Stripe Payment Links, one per item — a Stripe link has its price baked in,
// so unlike PayPal it cannot be reused across amounts. Create them at
// dashboard.stripe.com → Payment links → New. Each looks like
// https://buy.stripe.com/xxxxxxxxxxxx
//
// Keys must match the keys of ITEMS below.
export const STRIPE_LINKS = {
  session: "",
  prop: "",
}

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
function paypalUrl(amount) {
  const handle = encodeURIComponent(PAYPAL_ME_HANDLE.replace(/^@/, ""))
  return `https://www.paypal.com/paypalme/${handle}/${amount}USD`
}

// Only methods that are actually configured come back, so the page can never
// render a button that goes nowhere.
//
// Card first: it is the lowest-friction option — no account, no sign-in — and
// it is what most people reach for. PayPal second, for people who prefer to
// pay from a balance they already have.
export function methodsFor(item) {
  const methods = []

  const stripe = Object.hasOwn(STRIPE_LINKS, item.id) ? STRIPE_LINKS[item.id] : ""
  if (stripe) {
    methods.push({
      id: "card",
      label: "Pay by card",
      note: "Visa, Mastercard, Amex. No account needed.",
      url: stripe,
      primary: true,
    })
  }

  if (PAYPAL_ME_HANDLE) {
    methods.push({
      id: "paypal",
      label: "Pay with PayPal",
      note: "Use your PayPal balance, or a card as a guest.",
      url: paypalUrl(item.amount),
      primary: !stripe,
    })
  }

  return methods
}
