import React, { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, ArrowUpRight } from "lucide-react";

// Miki's own Starship Troopers: Extermination environment art, taken from the
// public work gallery on mikibutler.ca — the same ArtStation URLs that site
// serves, on his own ArtStation account.
//
// These are hotlinked rather than copied into public/. That is a third-party
// dependency, which is normally worth avoiding, but these are his own uploads
// on his own account and mikibutler.ca already depends on exactly these URLs,
// so the two sites fail or survive together rather than drifting apart.
const pieces = [
  {
    // The shot he features in his own site's carousel.
    img: "https://cdnb.artstation.com/p/assets/images/images/063/045/963/4k/miki-butler-starshiptroopers-extermination-lookout-miki-butler-02.jpg?1684570986",
    title: "Lookout",
    meta: "Starship Troopers: Extermination · Environment Art",
    alt: "Lookout environment from Starship Troopers: Extermination",
  },
  {
    img: "https://cdna.artstation.com/p/assets/images/images/063/425/778/4k/miki-butler-ste-showcase-mikibutler-caverox-08.jpg?1685504021",
    title: "Cave Road",
    meta: "Starship Troopers: Extermination · Environment Art",
    alt: "Cave road environment from Starship Troopers: Extermination",
  },
  {
    img: "https://cdna.artstation.com/p/assets/images/images/063/045/640/4k/miki-butler-starshiptroopers-extermination-garrison-gate-miki-butler-02.jpg?1684570080",
    title: "Garrison Gate",
    meta: "Starship Troopers: Extermination · Environment Art",
    alt: "Garrison gate structure from Starship Troopers: Extermination",
  },
  {
    img: "https://cdna.artstation.com/p/assets/images/images/063/045/584/4k/miki-butler-starshiptroopers-extermination-ucf-statue-miki-butler-01.jpg?1684569850",
    title: "UCF Statue",
    meta: "Starship Troopers: Extermination · Prop Art",
    alt: "UCF statue prop from Starship Troopers: Extermination",
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
              Shipped environment art from Starship Troopers: Extermination —
              the same pipeline you&apos;ll be taught.
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
              {/* A fixed frame, because these come in mixed shapes and an
                  unset height would make the row jump as each one loads. The
                  dark panel also means a failed fetch reads as an empty card
                  rather than a broken-image icon. */}
              <div className="rounded-xl overflow-hidden border border-white/10 bg-white/[0.04] aspect-[16/9] transition-colors group-hover:border-orange-500/40">
                <img
                  src={piece.img}
                  alt={piece.alt}
                  loading="lazy"
                  decoding="async"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover block"
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
