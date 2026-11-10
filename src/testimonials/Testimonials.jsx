import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Star, Quote, ChevronLeft, ChevronRight } from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────
// Testimonials — compact single-card carousel.
//
// SAMPLE controls whether these are presented as placeholders. While it is
// true, the card shows a small "Sample" tag and the section carries an
// honest sub-line, so no visitor is misled into thinking these are real
// reviews. To go live with genuine testimonials:
//   1. Replace the TESTIMONIALS entries below with real student quotes.
//   2. Set SAMPLE = false.
// That removes the "Sample" tag and the disclaimer in one step.
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
      "He looked at my portfolio the way a studio actually would and told me exactly what was missing. Blunt, kind, and worth ten times the price.",
    name: "Lena K.",
    role: "Junior environment artist",
  },
  {
    quote:
      "Patient, clear, and genuinely good at teaching — not just good at Blender. I leave every session with something I can actually use that week.",
    name: "Sam W.",
    role: "Weekend learner",
  },
];

const AUTO_MS = 6500;

const Stars = () => (
  <div className="flex gap-0.5" aria-label="5 out of 5 stars">
    {Array.from({ length: 5 }).map((_, i) => (
      <Star key={i} size={15} className="fill-orange-400 text-orange-400" />
    ))}
  </div>
);

const Testimonials = () => {
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const n = TESTIMONIALS.length;

  const go = (next) => setI((prev) => (next + n) % n);

  // Auto-advance, paused on hover/focus so a reader is never yanked away.
  useEffect(() => {
    if (paused || n < 2) return;
    const t = setInterval(() => setI((prev) => (prev + 1) % n), AUTO_MS);
    return () => clearInterval(t);
  }, [paused, n]);

  const t = TESTIMONIALS[i];

  return (
    <section className="py-16 px-6 bg-transparent text-white relative">
      <div className="max-w-3xl mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <p className="text-orange-400 text-[10px] font-bold tracking-[0.3em] uppercase mb-2">
            Testimonials
          </p>
          <h2 className="text-3xl md:text-4xl font-black tracking-tight">
            What students say
          </h2>
          {SAMPLE && (
            <p className="mt-3 text-xs text-gray-400 italic">
              Sample testimonials, shown while we gather real student reviews.
            </p>
          )}
        </motion.div>

        {/* Carousel */}
        <div
          className="relative mt-8 flex items-center gap-2 sm:gap-4"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          onFocusCapture={() => setPaused(true)}
          onBlurCapture={() => setPaused(false)}
        >
          <button
            type="button"
            onClick={() => go(i - 1)}
            aria-label="Previous testimonial"
            className="shrink-0 p-2.5 rounded-full border border-white/10 text-white transition-all hover:border-orange-500/60 hover:text-orange-400"
          >
            <ChevronLeft size={18} />
          </button>

          <div className="relative flex-1 min-h-[220px] flex items-center">
            <AnimatePresence mode="wait">
              <motion.figure
                key={i}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.35 }}
                className="relative w-full rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-sm p-7 sm:p-9"
              >
                {SAMPLE && (
                  <span className="absolute top-4 right-4 text-[10px] font-bold uppercase tracking-wider text-orange-300/80 bg-orange-400/10 border border-orange-400/20 rounded-full px-2 py-0.5">
                    Sample
                  </span>
                )}

                <Quote
                  size={28}
                  className="text-orange-400/40 mx-auto mb-4"
                  aria-hidden="true"
                />

                <blockquote className="text-[16px] sm:text-lg leading-relaxed text-gray-100">
                  &ldquo;{t.quote}&rdquo;
                </blockquote>

                <figcaption className="mt-6 flex flex-col items-center gap-2">
                  <Stars />
                  <div>
                    <span className="font-bold text-white text-sm">
                      {t.name}
                    </span>
                    <span className="text-gray-400 text-sm">
                      {" "}
                      — {t.role}
                    </span>
                  </div>
                </figcaption>
              </motion.figure>
            </AnimatePresence>
          </div>

          <button
            type="button"
            onClick={() => go(i + 1)}
            aria-label="Next testimonial"
            className="shrink-0 p-2.5 rounded-full border border-white/10 text-white transition-all hover:border-orange-500/60 hover:text-orange-400"
          >
            <ChevronRight size={18} />
          </button>
        </div>

        {/* Dots */}
        <div className="mt-6 flex justify-center gap-2">
          {TESTIMONIALS.map((_, d) => (
            <button
              key={d}
              type="button"
              onClick={() => setI(d)}
              aria-label={`Go to testimonial ${d + 1}`}
              aria-current={d === i}
              className={`h-2 rounded-full transition-all ${
                d === i
                  ? "w-6 bg-orange-400"
                  : "w-2 bg-white/25 hover:bg-white/40"
              }`}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default Testimonials;
