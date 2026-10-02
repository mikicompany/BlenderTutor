// Indicative currency conversion for the pricing cards.
//
// USD is what is actually charged. Everything here exists to answer "roughly
// what is that in my money?" without ever implying the visitor will be billed
// that figure — the card keeps the USD price, and a converted amount appears
// beside it marked as approximate.
//
// Rates come from Frankfurter, which is the European Central Bank's published
// reference rates: no account, no key, and CORS-enabled, so it works from a
// static site. If it is unreachable the selector simply never appears and the
// cards stay exactly as they are.

const RATES_URL = "https://api.frankfurter.app/latest?from=USD"
const CACHE_KEY = "fx_rates_usd"

// Deliberately short. Anything wider turns the control into a scrolling list
// that nobody reads; these cover the places people have actually arrived from.
export const CURRENCIES = [
  { code: "USD", label: "USD — US dollar" },
  { code: "EUR", label: "EUR — Euro" },
  { code: "GBP", label: "GBP — British pound" },
  { code: "CAD", label: "CAD — Canadian dollar" },
  { code: "AUD", label: "AUD — Australian dollar" },
  { code: "CHF", label: "CHF — Swiss franc" },
  { code: "SEK", label: "SEK — Swedish krona" },
  { code: "JPY", label: "JPY — Japanese yen" },
]

// One fetch per visit. Rates move far too slowly to be worth re-requesting as
// someone scrolls, and sessionStorage keeps a reload from paying for it twice.
export async function loadRates() {
  try {
    const cached = sessionStorage.getItem(CACHE_KEY)
    if (cached) return JSON.parse(cached)
  } catch {
    // Private browsing can throw on access alone; fall through and fetch.
  }

  const res = await fetch(RATES_URL)
  if (!res.ok) throw new Error(`rates ${res.status}`)
  const data = await res.json()
  if (!data?.rates) throw new Error("rates missing")

  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(data.rates))
  } catch {
    // Not being able to cache is not a reason to fail the conversion.
  }
  return data.rates
}

// Intl handles the symbol, its position and the decimal convention per locale
// — "€340" and "340 kr" are not the same shape, and hardcoding symbols gets
// that wrong for about half this list.
export function formatConverted(amountUsd, code, rates) {
  const rate = code === "USD" ? 1 : rates?.[code]
  if (!rate) return null

  const value = amountUsd * rate
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: code,
      // Prices are round numbers; cents on an approximation imply a precision
      // that an indicative rate does not have.
      maximumFractionDigits: 0,
    }).format(value)
  } catch {
    return null
  }
}
