import React from "react";
import { ArrowRight } from "lucide-react";
import { BOOKING_URL } from "../lib/links";

// A strong, consistent booking call-to-action at the foot of every article.
// The blog pulls in readers from search; this is the hand-off from "I read a
// tip" to "I can get this sorted on my own project." The booking link is a
// Calendly URL, so the site's delegated booking tracking already counts it.
const BlogCTA = () => (
  <aside className="my-14 rounded-2xl border border-orange-500/30 bg-gradient-to-br from-orange-500/[0.12] to-transparent p-7 sm:p-9 text-center">
    <p className="text-orange-400 text-[11px] font-bold tracking-[0.25em] uppercase mb-3">
      1-on-1 Blender tutoring
    </p>
    <h3 className="text-2xl md:text-3xl font-bold text-white leading-tight">
      Stuck on this in your own project?
    </h3>
    <p className="mt-3 text-gray-300 max-w-xl mx-auto text-[15px] leading-relaxed">
      Bring your <code className="text-orange-300">.blend</code> to a free 15-minute
      call and get it unstuck live — one-on-one with a senior environment artist who
      ships game art for a living. No cost, no commitment.
    </p>
    <a
      href={BOOKING_URL}
      target="_blank"
      rel="noreferrer"
      className="mt-6 inline-flex items-center justify-center gap-2 px-8 py-3.5 text-[15px] font-bold text-black rounded-xl transition-all hover:shadow-[0_0_20px_rgba(255,165,0,0.5)]"
      style={{ backgroundColor: "#F37D16" }}
    >
      Book a free call <ArrowRight size={18} />
    </a>
    <p className="mt-4 text-gray-500 text-xs">15 minutes · No cost · No commitment</p>
  </aside>
);

export default BlogCTA;
