import React, { useEffect, useState } from "react";
import { ArrowRight, X } from "lucide-react";
import { BOOKING_URL } from "../lib/links";

// A compact "Book a free call" bar that slides up once a reader is ~40% through
// an article. Most readers never reach the end-of-article CTA, so this catches
// them mid-read. It hides again near the bottom so it doesn't fight the end CTA,
// is dismissible for the session, and leaves the bottom-right corner clear for
// the floating share button. The link is a Calendly URL, so the site's existing
// booking-click tracking already counts it.
const StickyBookingBar = () => {
  const [show, setShow] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    try {
      if (sessionStorage.getItem("bt_sticky_cta_dismissed") === "1") {
        setDismissed(true);
        return;
      }
    } catch (e) {}

    const onScroll = () => {
      const scrollable =
        document.documentElement.scrollHeight - window.innerHeight;
      if (scrollable <= 400) return; // article too short to bother
      const pct = window.scrollY / scrollable;
      // Appear after 40% read; retract in the last stretch so it doesn't
      // collide with the end-of-article CTA.
      setShow(pct > 0.4 && pct < 0.88);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const dismiss = () => {
    setDismissed(true);
    try {
      sessionStorage.setItem("bt_sticky_cta_dismissed", "1");
    } catch (e) {}
  };

  if (dismissed) return null;

  return (
    <div
      aria-hidden={!show}
      className={`fixed inset-x-0 bottom-0 z-40 transition-transform duration-300 motion-reduce:transition-none ${
        show ? "translate-y-0" : "translate-y-full pointer-events-none"
      }`}
    >
      <div
        className="mx-auto flex max-w-3xl items-center gap-3 rounded-xl border border-orange-500/30 bg-[#1b1813]/95 px-4 py-3 pr-14 shadow-2xl backdrop-blur sm:pr-4"
        style={{
          marginInline: "0.75rem",
          marginBottom: "calc(0.75rem + env(safe-area-inset-bottom, 0px))",
        }}
      >
        <p className="min-w-0 flex-1 text-sm text-gray-200">
          <span className="font-semibold text-white">Learning Blender?</span>{" "}
          <span className="hidden text-gray-400 sm:inline">
            Get unstuck on your own project in a free 15-min call.
          </span>
        </p>
        <a
          href={BOOKING_URL}
          target="_blank"
          rel="noreferrer"
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-bold text-black transition-all hover:shadow-[0_0_16px_rgba(255,165,0,0.5)]"
          style={{ backgroundColor: "#F37D16" }}
        >
          Book a free call <ArrowRight size={16} />
        </a>
        <button
          onClick={dismiss}
          aria-label="Dismiss"
          className="shrink-0 p-1.5 text-gray-500 transition-colors hover:text-white"
        >
          <X size={18} />
        </button>
      </div>
    </div>
  );
};

export default StickyBookingBar;
