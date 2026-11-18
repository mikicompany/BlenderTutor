import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Star, Quote, ChevronLeft, ChevronRight } from "lucide-react";
import data from "./testimonials.json";

// ─────────────────────────────────────────────────────────────────────────
// Testimonials — compact carousel.
//
// The quotes live in testimonials.json, right here in the site code — private,
// no external service. They are managed in the private admin's Content tab and
// pushed into this file on request, so adding a review is a code change, never
// a public sheet. A row is hidden by setting its "show" to "no".
// ─────────────────────────────────────────────────────────────────────────
const FALLBACK = [
  {
    quote:
      "Hands down the fastest way to bridge the gap between hobbyist Blender habits and real-time production workflows. Practical, patient, and focused on things tutorials usually gloss over.",
    name: "Samir K.",
    role: "Indie Dev",
  },
];

// Keep only visible rows with a real quote; fall back so the section is never
// empty even if the data file is cleared.
const VISIBLE = (Array.isArray(data) ? data : [])
  .filter((t) => t && String(t.quote || "").trim())
  .filter((t) => String(t.show ?? "yes").toLowerCase() !== "no")
  .map((t) => ({ quote: t.quote.trim(), name: (t.name || "").trim(), role: (t.role || "").trim() }));

const TESTIMONIALS = VISIBLE.length ? VISIBLE : FALLBACK;

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

  const t = TESTIMONIALS[Math.min(i, n - 1)];

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
        </motion.div>

        {/* Carousel */}
        <div
          className="relative mt-8 flex items-center gap-2 sm:gap-4"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          onFocusCapture={() => setPaused(true)}
          onBlurCapture={() => setPaused(false)}
        >
          {n > 1 && (
            <button
              type="button"
              onClick={() => go(i - 1)}
              aria-label="Previous testimonial"
              className="shrink-0 p-2.5 rounded-full border border-white/10 text-white transition-all hover:border-orange-500/60 hover:text-orange-400"
            >
              <ChevronLeft size={18} />
            </button>
          )}

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
                    {t.role && (
                      <span className="text-gray-400 text-sm">
                        {" "}
                        — {t.role}
                      </span>
                    )}
                  </div>
                </figcaption>
              </motion.figure>
            </AnimatePresence>
          </div>

          {n > 1 && (
            <button
              type="button"
              onClick={() => go(i + 1)}
              aria-label="Next testimonial"
              className="shrink-0 p-2.5 rounded-full border border-white/10 text-white transition-all hover:border-orange-500/60 hover:text-orange-400"
            >
              <ChevronRight size={18} />
            </button>
          )}
        </div>

        {/* Dots */}
        {n > 1 && (
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
        )}
      </div>
    </section>
  );
};

export default Testimonials;
