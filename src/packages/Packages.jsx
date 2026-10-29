import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Check, Target, Gift } from "lucide-react"; // npm install lucide-react
import { BOOKING_URL } from "../lib/links";
import { CURRENCIES, loadRates, formatConverted } from "../lib/currency";

// The packages are sold on what a student ends up with, not on how many hours
// they buy — so each one that promises an outcome states it as a guarantee,
// and the session count is the means rather than the headline.
//
// outcome: null on Starter on purpose. A single session cannot promise a
// finished piece, and saying so keeps the guarantee on the other two credible.
const packages = [
  {
    name: "Starter",
    price: "49",
    unit: "USD per session",
    description: "A single session, to see how we work together.",
    outcome: null,
    features: [
      "1-hour live session",
      "Asset workflow overview",
      "Low-poly basics",
      "Session recording",
    ],
    highlighted: false,
  },
  {
    name: "Portfolio Prop",
    price: "349",
    unit: "USD for 8 sessions",
    // The bundle is cheaper than buying the hours singly, but that is invisible
    // unless someone does the arithmetic — so the saving is stated outright.
    // compareAt is the à-la-carte total (8 x $49); the badge is the headline.
    badge: "Save $43",
    compareAt: "392",
    compareNote: "bought as 8 single sessions",
    description: "Take one prop from blockout to portfolio-ready.",
    outcome: "You finish with a game-ready prop in your portfolio.",
    features: [
      "8 one-hour sessions",
      "Modeling, UVs and texturing",
      "Feedback between sessions",
      "Session recordings",
      "Final presentation renders",
    ],
    highlighted: false,
  },
  {
    name: "Portfolio Scene",
    // Quote-on-call, anchored at $640 USD (16 sessions, ~$40/hr — the next
    // step down the per-hour ladder from the $349 Prop's ~$44, and $58 under
    // buying two Props). Kept off the card on purpose: the flagship tier
    // converts better after a conversation than as a cold number, and the
    // commitment note below reads as a discussion rather than a disclaimer.
    // $640 is the firm quote, not a starting point to negotiate up from.
    price: null,
    priceNote: "Priced in USD on your free call",
    unit: "16 sessions",
    description: "A complete environment, built the way studios build them.",
    outcome: "You finish with a full scene in your portfolio.",
    features: [
      "16 one-hour sessions",
      "Everything in Portfolio Prop",
      "Scene composition and set dressing",
      "Lighting and final renders",
      "Engine-ready export",
      "Portfolio and career guidance",
    ],
    // The guarantee is real but not unconditional, and saying where the line
    // sits protects both sides — nobody buys 16 sessions expecting to be
    // carried, and the promise stays one that can actually be kept.
    commitment:
      "This one needs you too: expect homework between sessions. We guide the work, you do the building — that is what makes it yours.",
    highlighted: true,
    badge: "Full portfolio piece",
  },
];

// The referral credit, in USD, for both the existing student and the friend
// they send. One number so it is easy to change. Kept below the price of a
// single session on purpose, and it is worded to trigger on the friend's
// first paid booking — so it is funded by new revenue rather than discounting
// a session the referrer would have bought anyway.
const REFERRAL_CREDIT = 20;

const Packages = () => {
  const [rates, setRates] = useState(null)
  const [currency, setCurrency] = useState("USD")

  useEffect(() => {
    let cancelled = false
    loadRates()
      .then((r) => { if (!cancelled) setRates(r) })
      // No rates means no selector. The prices are still correct without it,
      // so there is nothing to tell the visitor and nothing to recover from.
      .catch(() => {})
    return () => { cancelled = true }
  }, [])

  const converted = (price) =>
    rates && currency !== "USD" ? formatConverted(Number(price), currency, rates) : null

  return (
    <section className="py-16 px-6 text-white">
      <div className="max-w-5xl mx-auto">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-orange-500 uppercase tracking-[0.3em] text-[10px] font-bold mb-2">
            Packages
          </h2>
          <h3 className="text-3xl font-bold">
            Leave with something{" "}
            <span className="text-orange-500">finished</span>
          </h3>
          <p className="text-gray-400 text-sm mt-4 max-w-lg mx-auto leading-relaxed">
            Eight sessions gets a prop into your portfolio. Sixteen gets a full
            scene. That&apos;s the promise — and every package starts with the
            same free intro call.
          </p>
        </motion.div>

        {/* Pricing Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {packages.map((pkg, index) => (
            <motion.div
              key={pkg.name}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1, duration: 0.5 }}
              className={`relative p-6 rounded-xl border ${
                pkg.highlighted
                  ? "border-orange-500/50 bg-orange-500/5"
                  : "border-white/5 bg-white/[0.03]"
              } flex flex-col`}
            >
              {pkg.badge && (
                <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-orange-500 text-black text-[9px] font-black uppercase px-3 py-0.5 rounded-full whitespace-nowrap">
                  {pkg.badge}
                </span>
              )}

              <h4 className="text-lg font-bold mb-1">{pkg.name}</h4>
              <p className="text-gray-500 text-xs mb-5 leading-relaxed">
                {pkg.description}
              </p>

              <div className="mb-6">
                {pkg.price ? (
                  <>
                    <span className="text-3xl font-bold text-orange-500">
                      ${pkg.price}
                    </span>
                    <span className="text-gray-500 text-[11px] ml-1.5">
                      {pkg.unit}
                    </span>
                    {/* The à-la-carte total, struck through, so the saving in
                        the badge is substantiated rather than just asserted. */}
                    {pkg.compareAt && (
                      <span className="block text-[11px] text-gray-500 mt-1.5">
                        <span className="line-through">${pkg.compareAt}</span>{" "}
                        {pkg.compareNote}
                      </span>
                    )}
                    {/* Secondary and explicitly approximate: the USD figure
                        above is the one that gets charged. */}
                    {converted(pkg.price) && (
                      <span className="block text-gray-500 text-[11px] mt-1.5">
                        ≈ {converted(pkg.price)}{" "}
                        <span className="text-gray-600">· charged in USD</span>
                      </span>
                    )}
                  </>
                ) : (
                  <>
                    <span className="text-xl font-bold text-orange-500">
                      {pkg.unit}
                    </span>
                    <span className="block text-gray-500 text-[11px] mt-1">
                      {pkg.priceNote}
                    </span>
                  </>
                )}
              </div>

              {/* The guarantee, set apart from the feature list so it reads as
                  a promise rather than as one more bullet. */}
              {pkg.outcome && (
                <div className="mb-6 p-3 rounded-lg border border-orange-500/20 bg-orange-500/[0.07] flex gap-2.5">
                  <Target className="text-orange-500 w-4 h-4 mt-0.5 shrink-0" />
                  <p className="text-[13px] text-orange-100/90 leading-snug font-medium">
                    {pkg.outcome}
                  </p>
                </div>
              )}

              <ul className="space-y-3 mb-6 flex-1">
                {pkg.features.map((feature) => (
                  <li
                    key={feature}
                    className="flex items-start gap-2 text-[13px] text-gray-400"
                  >
                    <Check className="text-orange-500 w-3.5 h-3.5 mt-0.5 shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>

              {pkg.commitment && (
                <p className="text-[11.5px] text-gray-500 leading-relaxed mb-6 pt-4 border-t border-white/10">
                  {pkg.commitment}
                </p>
              )}

              {/* There is no checkout, so the intro call is where every
                  package actually starts. */}
              <a
                href={BOOKING_URL}
                target="_blank"
                rel="noreferrer"
                className={`w-full py-2.5 rounded-lg text-xs font-bold transition-all text-center block ${
                  pkg.highlighted
                    ? "bg-orange-500 text-black hover:bg-orange-600"
                    : "bg-white/5 border border-white/10 hover:bg-white/10 text-white"
                }`}
              >
                Start with a free call
              </a>
            </motion.div>
          ))}
        </div>

        {/* Referral — the one discount worth running for a 1:1 service: it
            rewards an existing student for bringing a new one, so it is paid
            for by new custom rather than by softening the list price. No code
            field (that only invites coupon-hunting); it is claimed by a word
            on the call or a short email, which suits the manual checkout. */}
        <div className="mt-10 max-w-2xl mx-auto rounded-xl border border-orange-500/20 bg-orange-500/[0.05] p-5 flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
          <div className="w-10 h-10 shrink-0 rounded-lg grid place-items-center bg-orange-500/10 border border-orange-500/20 text-orange-500">
            <Gift size={18} />
          </div>
          <div className="flex-1">
            <h4 className="text-sm font-bold mb-1">
              Already a student? Refer a friend.
            </h4>
            <p className="text-gray-400 text-[13px] leading-relaxed">
              When someone you send books their first session, you both get{" "}
              <span className="text-orange-400 font-semibold">
                ${REFERRAL_CREDIT} off
              </span>{" "}
              your next one. Mention your name when you book, or{" "}
              <a
                href={`mailto:info@blendertutoring.com?subject=${encodeURIComponent(
                  "Referral"
                )}`}
                className="text-orange-400 hover:text-orange-300 underline underline-offset-2"
              >
                email us
              </a>
              .
            </p>
          </div>
        </div>

        {/* "$" alone reads as the reader's own dollar. Students book from
            outside North America, so the currency is stated rather than
            assumed. */}
        <div className="mt-8 flex flex-col items-center gap-3">
          <p className="text-center text-gray-500 text-xs">
            All prices in US dollars (USD). Your bank may apply its own
            conversion and fees.
          </p>

          {/* Only rendered once rates have actually arrived — offering a
              selector that cannot convert would be worse than not offering
              one. */}
          {rates && (
            <label className="flex items-center gap-2 text-xs text-gray-500">
              <span>Show approximate price in</span>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                aria-label="Show approximate prices in another currency"
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
        </div>
      </div>
    </section>
  );
};

export default Packages;
