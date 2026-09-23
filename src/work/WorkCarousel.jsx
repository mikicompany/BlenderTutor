import React, { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, ArrowUpRight } from "lucide-react";

// Miki's own production art. Captions stay generic — no project name and no
// internal asset names — because this work comes from a gallery that is
// otherwise kept private, and the engine chrome carrying those names has been
// cropped out of the images themselves.
//
// Ordered finished-first: the renders earn attention, the blockout and kit
// then show how the finished shot was actually built, which is the part a
// prospective student is buying.
const pieces = [
  {
    img: "/work/env-village.jpg",
    title: "Tropical village",
    meta: "Environment art · Unreal Engine",
    alt: "Game environment: a tropical village with power lines, palms and a corrugated roof at dusk",
  },
  {
    img: "/work/env-roadside.jpg",
    title: "Roadside approach",
    meta: "Environment art · Unreal Engine",
    alt: "Game environment: a dirt road lined with palms and undergrowth, trucks in the distance",
  },
  {
    img: "/work/blockout-street.jpg",
    title: "Street blockout",
    meta: "Blockout · Blender",
    alt: "Untextured grey blockout of a three-storey street building with awnings",
  },
  {
    img: "/work/modular-kit.jpg",
    title: "Modular building kit",
    meta: "Modeling · Maya",
    alt: "Wireframe view of modular wall, floor and roof pieces laid out separately",
  },
];

const PORTFOLIO_URL = "https://mikibutler.ca/work.html";

// Covers the track's own horizontal padding: the cards bleed to the screen
// edge via -mx-6 px-6, so the resting scrollLeft is 24 rather than 0, and a
// tighter check would light up the back arrow with nothing behind card one.
const EDGE_SLACK = 28;

const WorkCarousel = () => {
  const trackRef = useRef(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);

  const syncEdges = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    setAtStart(el.scrollLeft <= EDGE_SLACK);
    setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - EDGE_SLACK);
  }, []);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    syncEdges();
    el.addEventListener("scroll", syncEdges, { passive: true });
    window.addEventListener("resize", syncEdges);
    return () => {
      el.removeEventListener("scroll", syncEdges);
      window.removeEventListener("resize", syncEdges);
    };
  }, [syncEdges]);

  const scrollBy = (dir) => {
    const el = trackRef.current;
    if (!el) return;
    el.scrollBy({
      left: dir * Math.round(el.clientWidth * 0.8),
      behavior: "smooth",
    });
  };

  // With only four pieces the row fits on a wide desktop, so the arrows would
  // sit permanently dead there. Hiding them when nothing can scroll keeps the
  // header honest rather than showing two disabled buttons.
  const scrollable = !(atStart && atEnd);

  return (
    <section className="py-20 px-6 text-white">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="flex items-end justify-between gap-6 mb-8"
        >
          <div>
            <h2 className="text-orange-500 uppercase tracking-[0.3em] text-[10px] font-bold mb-2">
              Recent work
            </h2>
            <h3 className="text-3xl font-bold">
              The work behind the{" "}
              <span className="text-orange-500">teaching</span>
            </h3>
            <p className="text-gray-400 text-sm mt-3 max-w-md leading-relaxed">
              Production environment art — and the blockouts and kit pieces it
              was built from.
            </p>
          </div>

          {scrollable && (
            <div className="hidden md:flex gap-2 shrink-0">
              <button
                type="button"
                onClick={() => scrollBy(-1)}
                disabled={atStart}
                aria-label="Previous work"
                className="p-2.5 rounded-full border border-white/10 text-white transition-all hover:border-orange-500/60 hover:text-orange-400 disabled:opacity-30 disabled:hover:border-white/10 disabled:hover:text-white"
              >
                <ChevronLeft size={18} />
              </button>
              <button
                type="button"
                onClick={() => scrollBy(1)}
                disabled={atEnd}
                aria-label="More work"
                className="p-2.5 rounded-full border border-white/10 text-white transition-all hover:border-orange-500/60 hover:text-orange-400 disabled:opacity-30 disabled:hover:border-white/10 disabled:hover:text-white"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          )}
        </motion.div>

        {/* Native scroll snapping: already smooth on touch, keyboard
            accessible, and adds nothing to the bundle. */}
        <div
          ref={trackRef}
          className="flex gap-5 overflow-x-auto snap-x snap-mandatory pb-4 -mx-6 px-6 [&::-webkit-scrollbar]:hidden"
          style={{ scrollbarWidth: "none" }}
        >
          {pieces.map((piece) => (
            <figure
              key={piece.img}
              className="snap-start shrink-0 w-[280px] sm:w-[340px] group m-0"
            >
              <div className="rounded-xl overflow-hidden border border-white/10 bg-white/[0.03] transition-colors group-hover:border-orange-500/40">
                <img
                  src={piece.img}
                  alt={piece.alt}
                  width="640"
                  height="360"
                  loading="lazy"
                  decoding="async"
                  className="w-full h-auto block"
                />
              </div>
              <figcaption className="mt-3">
                <h4 className="text-[13px] font-semibold leading-snug">
                  {piece.title}
                </h4>
                <p className="text-[11px] text-gray-500 mt-0.5">{piece.meta}</p>
              </figcaption>
            </figure>
          ))}
        </div>

        <div className="mt-6">
          <a
            href={PORTFOLIO_URL}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-[13px] font-medium text-orange-500 hover:text-orange-400 transition-colors"
          >
            See the full portfolio
            <ArrowUpRight size={15} />
          </a>
        </div>
      </div>
    </section>
  );
};

export default WorkCarousel;
