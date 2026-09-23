import React, { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, ArrowUpRight } from "lucide-react";

// Shipped titles, taken from the gameography on mikibutler.ca so the two sites
// stay in step. These are the games worked on, presented as such — the covers
// are the publishers' key art, not renders from this portfolio, which is why
// each card carries the role rather than implying the image itself is the work.
const titles = [
  { title: "Starship Troopers: Extermination", role: "Environment Artist", platform: "PC", img: "/work/starship-troopers.jpg" },
  { title: "Squad", role: "Environment Artist", platform: "PC", img: "/work/squad.jpg" },
  { title: "Star Trek Legends", role: "Environment Artist", platform: "iOS / Android", img: "/work/star-trek-legends.jpg" },
  { title: "Tomb Raider Reloaded", role: "Environment Artist", platform: "iOS / Android", img: "/work/tomb-raider-reloaded.jpg" },
  { title: "Mad Streets", role: "Environment Artist", platform: "PC", img: "/work/mad-streets.jpg" },
  { title: "Plants vs Zombies: Battle for Neighborville", role: "Environment Artist", platform: "PS4 / XOne / PC", img: "/work/pvz-bfn.jpg" },
  { title: "Dead Rising 4", role: "Environment Artist", platform: "XOne / PS4 / PC", img: "/work/dead-rising-4.jpg" },
  { title: "Skara: The Blade Remains", role: "Environment Artist", platform: "PC", img: "/work/skara.jpg" },
  { title: "ESPN Sports Connection", role: "Environment Artist", platform: "WiiU", img: "/work/espn-sports-connection.jpg" },
  { title: "The Adventures of Tintin", role: "3D Artist, UI", platform: "X360", img: "/work/tintin-x360.jpg" },
  { title: "The Adventures of Tintin", role: "3D Artist", platform: "3DS", img: "/work/tintin-3ds.jpg" },
  { title: "Motion Sports", role: "3D Artist", platform: "X360 Kinect", img: "/work/motion-sports.jpg" },
  { title: "Your Shape", role: "3D Artist", platform: "Wii / PC", img: "/work/your-shape.jpg" },
];

const PORTFOLIO_URL = "https://mikibutler.ca/work.html";

const WorkCarousel = () => {
  const trackRef = useRef(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);

  // The arrows are only useful while there is somewhere to go, so they track
  // the scroll position rather than sitting permanently enabled.
  //
  // The tolerance covers the track's own horizontal padding: the cards bleed
  // to the screen edge via -mx-6 px-6, which leaves the resting scrollLeft at
  // 24 rather than 0, and a tighter check would light up the back arrow when
  // there is nothing behind the first card.
  const EDGE_SLACK = 28;
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
    // Move by roughly a screenful rather than a fixed number of cards, so the
    // step feels right at every width.
    el.scrollBy({ left: dir * Math.round(el.clientWidth * 0.8), behavior: "smooth" });
  };

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
              Shipped work
            </h2>
            <h3 className="text-3xl font-bold">
              Games Miki has{" "}
              <span className="text-orange-500">worked on</span>
            </h3>
            <p className="text-gray-400 text-sm mt-3 max-w-md leading-relaxed">
              Eighteen years of production art, across console, PC and mobile.
            </p>
          </div>

          <div className="hidden md:flex gap-2 shrink-0">
            <button
              type="button"
              onClick={() => scrollBy(-1)}
              disabled={atStart}
              aria-label="Previous titles"
              className="p-2.5 rounded-full border border-white/10 text-white transition-all hover:border-orange-500/60 hover:text-orange-400 disabled:opacity-30 disabled:hover:border-white/10 disabled:hover:text-white"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              type="button"
              onClick={() => scrollBy(1)}
              disabled={atEnd}
              aria-label="More titles"
              className="p-2.5 rounded-full border border-white/10 text-white transition-all hover:border-orange-500/60 hover:text-orange-400 disabled:opacity-30 disabled:hover:border-white/10 disabled:hover:text-white"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </motion.div>

        {/* Native horizontal scrolling with snap points: it is already smooth
            on touch, keyboard accessible, and needs no carousel library. */}
        <div
          ref={trackRef}
          className="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-4 -mx-6 px-6 [&::-webkit-scrollbar]:hidden"
          style={{ scrollbarWidth: "none" }}
        >
          {titles.map((game) => (
            <div
              key={`${game.title}-${game.platform}`}
              className="snap-start shrink-0 w-[150px] sm:w-[168px] group"
            >
              <div className="rounded-xl overflow-hidden border border-white/10 bg-white/[0.03] transition-colors group-hover:border-orange-500/40">
                <img
                  src={game.img}
                  alt={`${game.title} cover art`}
                  width="300"
                  height="450"
                  // Below the fold, and thirteen of them — let the browser
                  // fetch these only when they are about to matter.
                  loading="lazy"
                  decoding="async"
                  className="w-full h-auto block"
                />
              </div>
              <h4 className="text-[13px] font-semibold mt-3 leading-snug">
                {game.title}
              </h4>
              <p className="text-[11px] text-orange-500/80 mt-1">{game.role}</p>
              <p className="text-[11px] text-gray-500">{game.platform}</p>
            </div>
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
