import React from "react";
import { motion } from "framer-motion";
import { Star, Quote } from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────
// Testimonials
//
// SAMPLE controls whether these are presented as placeholders. While it is
// true, each card shows a small "Sample" tag and the section carries an
// honest sub-line, so no visitor is misled into thinking these are real
// reviews. To go live with genuine testimonials:
//   1. Replace the TESTIMONIALS entries below with real student quotes.
//   2. Set SAMPLE = false.
// That removes the "Sample" tags and the disclaimer in one step.
// ─────────────────────────────────────────────────────────────────────────
const SAMPLE = true;

const TESTIMONIALS = [
  {
    quote:
      "I'd done the donut three times and still couldn't make anything of my own. One session and I finally understood why — and had a real plan. I'm actually building now.",
    name: "Jordan R.",
    role: "Hobbyist → first portfolio piece",
  },
  {
    quote:
      "Coming from Maya, Blender felt backwards. We set up the keymap and the workflow kit, and by the end of the call my hands just worked. Saved me weeks of frustration.",
    name: "Priya S.",
    role: "Maya artist, switching to Blender",
  },
  {
    quote:
      "Hard-surface finally clicked. Booleans, bevels, support loops — the order it all goes in. My props stopped falling apart the moment I subdivided them.",
    name: "Marcus T.",
    role: "Aspiring game artist",
  },
  {
    quote:
      "He looked at my portfolio the way a studio actually would and told me exactly what was missing. Blunt, kind, and worth ten times the price.",
    name: "Lena K.",
    role: "Junior environment artist",
  },
  {
    quote:
      "My bakes kept coming out wrong and no tutorial explained why. We fixed it in twenty minutes and I understood the whole pipeline after. Night and day.",
    name: "Diego M.",
    role: "Self-taught, 1 year in",
  },
  {
    quote:
      "Patient, clear, and genuinely good at teaching — not just good at Blender. I leave every session with something I can actually use that week.",
    name: "Sam W.",
    role: "Weekend learner",
  },
];

const Stars = () => (
  <div className="flex gap-0.5" aria-label="5 out of 5 stars">
    {Array.from({ length: 5 }).map((_, i) => (
      <Star key={i} size={15} className="fill-orange-400 text-orange-400" />
    ))}
  </div>
);

const Testimonials = () => {
  return (
    <section className="py-24 px-6 bg-transparent text-white relative">
      <div className="max-w-6xl mx-auto">
        {/* Heading */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-14"
        >
          <p className="text-orange-400 text-xs font-bold tracking-[0.2em] uppercase mb-3">
            Testimonials
          </p>
          <h2 className="text-4xl md:text-5xl font-black tracking-tight">
            What students say
          </h2>
          {SAMPLE && (
            <p className="mt-4 text-sm text-gray-400 max-w-xl mx-auto italic">
              Sample testimonials, shown while we gather real student reviews.
            </p>
          )}
        </motion.div>

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {TESTIMONIALS.map((t, i) => (
            <motion.figure
              key={t.name}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.45, delay: (i % 3) * 0.08 }}
              className="relative flex flex-col rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-sm p-6 hover:border-orange-400/40 transition-colors"
            >
              {SAMPLE && (
                <span className="absolute top-4 right-4 text-[10px] font-bold uppercase tracking-wider text-orange-300/80 bg-orange-400/10 border border-orange-400/20 rounded-full px-2 py-0.5">
                  Sample
                </span>
              )}

              <Quote
                size={26}
                className="text-orange-400/40 mb-4"
                aria-hidden="true"
              />

              <blockquote className="text-[15px] leading-relaxed text-gray-200 flex-1">
                "{t.quote}"
              </blockquote>

              <figcaption className="mt-6 pt-5 border-t border-white/10 flex items-center justify-between gap-3">
                <div>
                  <div className="font-bold text-white text-sm">{t.name}</div>
                  <div className="text-gray-400 text-xs mt-0.5">{t.role}</div>
                </div>
                <Stars />
              </figcaption>
            </motion.figure>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Testimonials;
