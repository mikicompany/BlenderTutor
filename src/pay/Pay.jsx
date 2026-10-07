import React, { useEffect, useState } from "react"
import { Helmet } from "react-helmet-async"
import { Link, useLocation } from "react-router-dom"
import {
  Check,
  ShieldCheck,
  Mail,
  ArrowRight,
  CreditCard,
  Smartphone,
  Globe,
  Landmark,
  Wallet,
  CheckCircle2,
  Lock,
} from "lucide-react"
import { FaPaypal, FaCcVisa, FaCcMastercard, FaCcAmex } from "react-icons/fa"
import Navbar from "../navbar/Navbar"
import BookingCalendar from "./BookingCalendar"
import {
  resolveItem,
  resolveName,
  methodsFor,
  transfersToShow,
} from "../lib/payments"
import { CURRENCIES, loadRates, formatConverted } from "../lib/currency"
import { trackPaymentClick } from "../lib/tracking"

// A page you send to one person, not one anybody browses to. It is in no
// menu, excluded from the sitemap, and marked noindex — a payment page in
// search results is at best confusing and at worst something to impersonate.
//
// It does both halves of starting a session: take the money, then book the
// time. Splitting those across two links is how a paid student ends up never
// scheduling, or scheduling into the free 15-minute consult by mistake.
//
// It takes two optional query parameters:
//   ?item=session|prop   which package is being paid for (default: session)
//   ?name=Stefan         puts "Prepared for Stefan" at the top
//
// Neither is required, so the bare /pay URL is always valid.

// Keyed by provider id. A provider with no entry here still renders — it
// just gets the generic wallet — so adding one to lib/payments.js never
// requires touching this file.
const STARTED_KEY = "bt_payment_started"

const ICONS = {
  card: CreditCard,
  paypal: FaPaypal,
  revolut: Smartphone,
  wise: Globe,
}

// The page is two things in sequence — pay, then pick a time — and numbering
// them is what stops the calendar at the bottom reading as an alternative to
// paying rather than the step after it.
const Step = ({ n, title, children }) => (
  <div className="flex gap-4">
    <span
      aria-hidden="true"
      className="shrink-0 w-7 h-7 rounded-full bg-orange-500/15 text-orange-500 text-xs font-bold flex items-center justify-center"
    >
      {n}
    </span>
    <div className="flex-1 min-w-0">
      <h2 className="text-base font-bold mb-4 mt-0.5">{title}</h2>
      {children}
    </div>
  </div>
)

// The site's own footer leads with "Ready to create?" and a booking button.
// On a page whose single job is to take a payment, a second competing call to
// action is a way to lose the first — so this page ends with a quiet bar of
// links instead.
const PayFooter = () => (
  <div className="max-w-xl mx-auto px-6 pb-16">
    <div className="border-t border-white/10 pt-8 flex flex-col sm:flex-row justify-between items-center gap-4 text-[12px] text-gray-500">
      <p>© 2026 Blender Tutor</p>
      <div className="flex gap-6">
        <Link to="/" className="hover:text-white transition-colors">
          Home
        </Link>
        <Link to="/terms" className="hover:text-white transition-colors">
          Terms
        </Link>
        <Link to="/privacy" className="hover:text-white transition-colors">
          Privacy
        </Link>
      </div>
    </div>
  </div>
)

const Pay = () => {
  const { search } = useLocation()
  const params = new URLSearchParams(search)
  const item = resolveItem(params.get("item"))
  const name = resolveName(params.get("name"))
  const methods = methodsFor(item)
  const transfers = transfersToShow()
  // Set by the payment provider redirecting back here after a successful
  // charge. It is self-asserted and anyone can type it, so it changes what
  // the page SAYS and never what it allows — booking is open either way,
  // exactly as it was before.
  const justPaid = params.get("paid") === "1"

  // The calendar is held back until payment is under way, so the page reads
  // as one thing at a time rather than offering a free booking beside a
  // request for money.
  //
  // ?paid=1 only arrives from providers that can redirect after a charge —
  // Stripe can, PayPal.me cannot. Relying on it alone would lock every
  // PayPal payer out of booking entirely. So clicking any payment button
  // also unlocks it: the provider opens in a new tab, this one stays put,
  // and the calendar is waiting when they come back.
  //
  // sessionStorage so a reload does not lock it again mid-booking. It is a
  // convenience, not a gate — the same page with ?paid=1 typed by hand shows
  // the same calendar, exactly as it did when it was always visible.
  const [started, setStarted] = useState(() => {
    try {
      return sessionStorage.getItem(STARTED_KEY) === "1"
    } catch {
      // Private browsing can throw on access alone.
      return false
    }
  })

  const markStarted = () => {
    setStarted(true)
    try {
      sessionStorage.setItem(STARTED_KEY, "1")
    } catch {
      // Not being able to remember is not a reason to block the booking.
    }
  }

  const unlocked = justPaid || started

  const [rates, setRates] = useState(null)
  const [currency, setCurrency] = useState("USD")

  useEffect(() => {
    let cancelled = false
    loadRates()
      .then((r) => {
        if (!cancelled) setRates(r)
      })
      // No rates means no selector. The USD price is the one being charged,
      // so nothing on this page is wrong without it.
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  const converted =
    rates && currency !== "USD"
      ? formatConverted(item.amount, currency, rates)
      : null

  return (
    <div className="relative w-full min-h-screen bg-black">
      <Helmet>
        <title>Pay and book your session — Blender Tutoring</title>
        <meta
          name="description"
          content="Pay for your Blender Tutoring session and book your time. Card or PayPal."
        />
        {/* Sent privately, so it has no business being indexed — and a
            payment page in search results is worth impersonating. */}
        <meta name="robots" content="noindex, nofollow" />

        {/* This link gets pasted into Discord and chat apps, which show a
            preview card from these tags. Without them the unfurl is a bare
            URL, which is exactly what a payment link should not look like. */}
        <meta property="og:type" content="website" />
        <meta
          property="og:title"
          content="Pay and book your Blender session — Blender Tutoring"
        />
        <meta
          property="og:description"
          content="1:1 Blender tutoring with a senior environment artist. Pay securely, then pick your time."
        />
        <meta
          property="og:image"
          content="https://www.blendertutoring.com/og-image.jpg"
        />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta
          property="og:image:alt"
          content="Blender Tutoring — 1:1 mentoring"
        />
        <meta property="og:url" content="https://www.blendertutoring.com/pay" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta
          name="twitter:title"
          content="Pay and book your Blender session — Blender Tutoring"
        />
        <meta
          name="twitter:description"
          content="1:1 Blender tutoring with a senior environment artist. Pay securely, then pick your time."
        />
        <meta
          name="twitter:image"
          content="https://www.blendertutoring.com/og-image.jpg"
        />
        <meta name="theme-color" content="#F37D16" />
      </Helmet>

      <Navbar />

      <main className="max-w-xl mx-auto px-6 pt-28 pb-16 text-white">
        <p className="text-orange-500 uppercase tracking-[0.3em] text-[10px] font-bold mb-3">
          Payment
        </p>
        <h1 className="text-3xl font-bold mb-2">Pay and book your session</h1>
        {name ? (
          <p className="text-gray-400 text-sm mb-10">
            Prepared for <span className="text-white font-medium">{name}</span>.
          </p>
        ) : (
          <p className="text-gray-400 text-sm mb-10">
            Pay, pick a time, done. Takes about two minutes.
          </p>
        )}

        {/* WHAT IS BEING PAID FOR — stated before the amount, so nobody is
            looking at a number without knowing what it buys. */}
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-6 mb-10">
          <h2 className="text-lg font-bold mb-1">{item.name}</h2>
          <p className="text-gray-500 text-xs mb-5 leading-relaxed">
            {item.summary}
          </p>

          <div className="pb-5 mb-5 border-b border-white/10">
            <span className="text-4xl font-bold text-orange-500">
              ${item.amount}
            </span>
            <span className="text-gray-500 text-xs ml-2">USD</span>
            {converted && (
              <span className="block text-gray-500 text-[11px] mt-2">
                ≈ {converted}{" "}
                <span className="text-gray-600">· charged in USD</span>
              </span>
            )}
          </div>

          <ul className="space-y-2.5">
            {item.includes.map((line) => (
              <li
                key={line}
                className="flex items-start gap-2 text-[13px] text-gray-400"
              >
                <Check className="text-orange-500 w-3.5 h-3.5 mt-0.5 shrink-0" />
                {line}
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-12">
          <Step n="1" title={justPaid ? "Payment received" : "Pay for the session"}>
            {justPaid && (
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/[0.07] p-5 flex gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-px" />
                <p className="text-[13px] text-emerald-50/90 leading-relaxed">
                  Thanks — that went through. Your receipt is on its way by
                  email from the payment provider. All that is left is picking
                  a time below.
                </p>
              </div>
            )}

            {/* Only ever rendered for a configured provider, so there is no
                such thing as a dead button here. */}
            {!justPaid && methods.length > 0 && (
              <div className="space-y-3 mb-4">
                {methods.map((method) => {
                  const Icon = ICONS[method.id] || Wallet
                  return (
                    <a
                      key={method.id}
                      href={method.url}
                      target="_blank"
                      rel="noreferrer"
                      onClick={() => {
                        trackPaymentClick({ item, method: method.id, name })
                        markStarted()
                      }}
                      className={`flex items-center gap-3 w-full px-5 py-4 rounded-xl font-bold transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 ${
                        method.primary
                          ? "bg-orange-500 text-black hover:bg-orange-600"
                          : "bg-white/5 border border-white/10 text-white hover:bg-white/10"
                      }`}
                    >
                      {Icon && <Icon size={19} className="shrink-0" />}
                      <span className="flex-1 text-left">
                        <span className="block text-sm">{method.label}</span>
                        <span
                          className={`block text-[11px] font-normal mt-0.5 ${
                            method.primary ? "text-black/60" : "text-gray-500"
                          }`}
                        >
                          {method.note}
                        </span>
                      </span>
                      {/* The card button says "Visa, Mastercard, Amex" in
                          words, but the marks are what people actually scan
                          for when deciding whether their card will work. */}
                      {method.id === "card" && (
                        <span
                          className={`flex items-center gap-1.5 shrink-0 ${
                            method.primary ? "text-black/70" : "text-gray-400"
                          }`}
                        >
                          <FaCcVisa size={22} aria-hidden="true" />
                          <FaCcMastercard size={22} aria-hidden="true" />
                          <FaCcAmex size={22} aria-hidden="true" />
                        </span>
                      )}
                      <ArrowRight size={17} className="shrink-0 opacity-60" />
                    </a>
                  )
                })}
              </div>
            )}

            {/* Transfers are details rather than buttons — there is nothing
                to click, the payer copies these into their own banking app.
                They carry no fee, which on the $399 package is about $16 that
                stays with you. */}
            {!justPaid &&
              transfers.map((transfer) => (
                <div
                  key={transfer.id}
                  className="rounded-xl border border-white/10 bg-white/[0.03] p-5 mb-4"
                >
                  <div className="flex items-center gap-2.5 mb-1">
                    <Landmark size={17} className="text-orange-500 shrink-0" />
                    <h3 className="text-sm font-bold">{transfer.title}</h3>
                  </div>
                  {transfer.note && (
                    <p className="text-[11.5px] text-gray-500 mb-4 ml-[26px]">
                      {transfer.note}
                    </p>
                  )}
                  <dl className="space-y-2.5">
                    {transfer.rows.map(([label, value]) => (
                      <div
                        key={label}
                        className="flex flex-wrap gap-x-3 gap-y-0.5 text-[13px]"
                      >
                        <dt className="text-gray-500 w-28 shrink-0">{label}</dt>
                        {/* break-all so a long IBAN wraps instead of forcing
                            the whole page to scroll sideways on a phone. */}
                        <dd className="text-gray-200 font-mono text-[12.5px] break-all">
                          {value}
                        </dd>
                      </div>
                    ))}
                  </dl>
                  {transfer.footer && (
                    <p className="text-[11.5px] text-gray-500 mt-4 pt-4 border-t border-white/10">
                      {transfer.footer}
                    </p>
                  )}
                </div>
              ))}

            {!justPaid && methods.length === 0 && transfers.length === 0 && (
              // Reached only if the link is shared before anything is filled
              // in in src/lib/payments.js. Better an honest notice with a way
              // to reach a human than a button that goes nowhere.
              <div className="rounded-xl border border-orange-500/30 bg-orange-500/[0.07] p-5 mb-4">
                <p className="text-sm text-orange-100/90 leading-relaxed mb-3">
                  Online payment is being set up right now. Email me and
                  I&apos;ll send you an invoice you can pay by card straight
                  away — you can still pick your time below.
                </p>
                <a
                  href="mailto:info@blendertutoring.com"
                  className="inline-flex items-center gap-2 text-white hover:text-orange-400 transition-colors text-sm font-medium"
                >
                  <Mail size={15} className="text-orange-500" />
                  info@blendertutoring.com
                </a>
              </div>
            )}

            {!justPaid && methods.length > 0 && (
              <p className="flex items-start gap-2 text-[11.5px] text-gray-500 leading-relaxed">
                <ShieldCheck className="w-4 h-4 mt-px shrink-0 text-gray-600" />
                <span>
                  Payment is handled entirely by the provider you choose — card
                  and account details are entered on their site, never on this
                  one. You&apos;ll get a receipt from them by email.
                </span>
              </p>
            )}

            {!justPaid && rates && (
              <label className="flex items-center gap-2 text-xs text-gray-500 mt-5">
                <span>Show approximate price in</span>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  aria-label="Show the approximate price in another currency"
                  className="bg-white/[0.06] border border-white/10 rounded-md px-2 py-1 text-gray-300 text-xs focus:outline-none focus:border-orange-500/60 hover:border-white/20 transition-colors"
                >
                  {CURRENCIES.map((c) => (
                    <option key={c.code} value={c.code} className="bg-[#0f1011]">
                      {c.label}
                    </option>
                  ))}
                </select>
              </label>
            )}

            {/* Transfers have no button to click, so a bank or Interac payer
                would otherwise have no way through. This also covers anyone
                coming back in a fresh session after paying earlier.

                It is not a loophole: the calendar was reachable by anyone
                with the link before this gate existed, and bookings are
                reconciled against payments either way. */}
            {!unlocked && (
              <button
                type="button"
                onClick={markStarted}
                className="text-[12px] text-gray-500 hover:text-orange-400 underline underline-offset-2 transition-colors mt-5"
              >
                Already paid? Open the calendar
              </button>
            )}
          </Step>

          {/* The section id is what the booking-click tracking reports as the
              origin of a click, so a booking started here is distinguishable
              from one started on the home page. */}
          <section id="book-session">
            <Step n="2" title="Pick your time">
              {unlocked ? (
                <BookingCalendar item={item} prefillName={name} />
              ) : (
                <div className="rounded-xl border border-white/10 bg-white/[0.02] p-6 text-center">
                  <Lock className="w-4 h-4 text-gray-600 mx-auto mb-3" />
                  <p className="text-[13px] text-gray-500 leading-relaxed max-w-xs mx-auto">
                    The calendar opens as soon as your payment is on its way.
                    Pay above and it appears here — your payment opens in a
                    new tab, so leave this one where it is.
                  </p>
                </div>
              )}
            </Step>
          </section>
        </div>

        <p className="text-[11.5px] text-gray-500 leading-relaxed mt-12 pt-8 border-t border-white/10">
          Reschedule or cancel free of charge up to 24 hours before a session —
          the full terms are in the{" "}
          <Link
            to="/terms"
            className="text-gray-400 hover:text-orange-400 underline underline-offset-2"
          >
            Terms of Service
          </Link>
          . Questions before you pay? Email{" "}
          <a
            href="mailto:info@blendertutoring.com"
            className="text-gray-400 hover:text-orange-400 underline underline-offset-2"
          >
            info@blendertutoring.com
          </a>
          .
        </p>
      </main>

      <PayFooter />
    </div>
  )
}

export default Pay
