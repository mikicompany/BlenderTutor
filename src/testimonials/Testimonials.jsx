import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Star, Quote, ChevronLeft, ChevronRight } from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────
// Testimonials — compact carousel.
//
// The quotes are pulled LIVE from a Google Sheet the owner edits, so adding a
// review is "type a row, it shows up" with no code change and no deploy. The
// sheet has columns: Quote | Name | Role | Show. A row shows unless its Show
// cell says no/false/0/hide (blank = show).
//
// FALLBACK below always renders first (so the section works even before the
// fetch, during prerender, or if the sheet is ever unreachable). If the sheet
// returns at least one row, it replaces the fallback.
// ─────────────────────────────────────────────────────────────────────────
const FALLBACK = [
  {
    quote:
      "Hands down the fastest way to bridge the gap between hobbyist Blender habits and real-time production workflows. Practical, patient, and focused on things tutorials usually gloss over.",
    name: "Samir K.",
    role: "Indie Dev",
  },
];

// Live data source — the published CSV of the owner's "Blender Tutoring —
// Testimonials" sheet. The gviz endpoint is derived from the sheet id, so this
// URL never has to change as rows are added. Publishing the sheet to the web
// (one-time) guarantees it is publicly readable.
const SHEET_CSV_URL =
  "https://docs.google.com/spreadsheets/d/12cbgRo4gY2oCNrPb4zSkMDMFd_DrtVdcOnL9X594QXI/gviz/tq?tqx=out:csv";

const AUTO_MS = 6500;

// Minimal CSV parser that respects quoted fields (a quote may contain commas,
// newlines and escaped "" quotes). Returns an array of string arrays.
function parseCSV(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (c !== "\r") {
      field += c;
    }
  }
  if (field !== "" || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

// Turn the sheet's rows into testimonial objects, keyed by header name so the
// owner can reorder columns without breaking anything.
function rowsToTestimonials(rows) {
  if (!rows.length) return [];
  const header = rows[0].map((h) => h.trim().toLowerCase());
  const qi = header.indexOf("quote");
  const ni = header.indexOf("name");
  const ri = header.indexOf("role");
  const si = header.indexOf("show");
  if (qi === -1) return [];
  const out = [];
  for (let r = 1; r < rows.length; r++) {
    const cells = rows[r];
    const quote = (cells[qi] || "").trim();
    if (!quote) continue; // skip blank rows
    if (si !== -1) {
      const show = (cells[si] || "").trim().toLowerCase();
      if (["no", "false", "0", "hide", "n"].includes(show)) continue;
    }
    out.push({
      quote,
      name: (cells[ni] || "").trim(),
      role: (cells[ri] || "").trim(),
    });
  }
  return out;
}

const Stars = () => (
  <div className="flex gap-0.5" aria-label="5 out of 5 stars">
    {Array.from({ length: 5 }).map((_, i) => (
      <Star key={i} size={15} className="fill-orange-400 text-orange-400" />
    ))}
  </div>
);

const Testimonials = () => {
  const [items, setItems] = useState(FALLBACK);
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const n = items.length;

  // Pull the live list once on mount. Any failure leaves the fallback in place.
  useEffect(() => {
    let cancelled = false;
    fetch(SHEET_CSV_URL)
      .then((res) => (res.ok ? res.text() : Promise.reject(res.status)))
      .then((text) => {
        const parsed = rowsToTestimonials(parseCSV(text));
        if (!cancelled && parsed.length) {
          setItems(parsed);
          setI(0);
        }
      })
      .catch(() => {
        /* keep FALLBACK — the section still renders a real review */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const go = (next) => setI((prev) => (next + n) % n);

  // Auto-advance, paused on hover/focus so a reader is never yanked away.
  useEffect(() => {
    if (paused || n < 2) return;
    const t = setInterval(() => setI((prev) => (prev + 1) % n), AUTO_MS);
    return () => clearInterval(t);
  }, [paused, n]);

  const t = items[Math.min(i, n - 1)];

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
            {items.map((_, d) => (
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
