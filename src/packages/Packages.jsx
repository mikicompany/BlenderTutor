import React from "react";
import { motion } from "framer-motion";
import { Check, Target } from "lucide-react"; // npm install lucide-react
import { BOOKING_URL } from "../lib/links";

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
    unit: "per session",
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
    price: "399",
    unit: "for 8 sessions",
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
    // Priced on the call rather than listed — a four-figure number on a card
    // asks for a decision before there has been any conversation.
    price: null,
    priceNote: "Priced on your free call",
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

const Packages = () => {
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
      </div>
    </section>
  );
};

export default Packages;
