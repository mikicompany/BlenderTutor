import React, { useEffect, useState } from "react";
import { Share2, Check } from "lucide-react";

// Rendered once in App so it reaches every route, including The Radar, which
// has its own header rather than the site navbar.
//
// The URL and title are read at click time rather than at render time on
// purpose: the build prerenders each route from a local server, so anything
// derived from window.location during render would bake a 127.0.0.1 address
// into the shipped HTML.
const ShareButton = () => {
  const [state, setState] = useState("idle"); // idle | copied | failed

  useEffect(() => {
    if (state === "idle") return;
    const t = setTimeout(() => setState("idle"), 2200);
    return () => clearTimeout(t);
  }, [state]);

  const handleShare = async () => {
    const url = window.location.href;
    const title = document.title;

    // Phones and most tablets get the real share sheet, which is what people
    // actually want when sending a link to a friend.
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
        return;
      } catch (err) {
        // Dismissing the sheet rejects with AbortError — that is a deliberate
        // cancel, not a failure, so fall through to copying only otherwise.
        if (err?.name === "AbortError") return;
      }
    }

    try {
      await navigator.clipboard.writeText(url);
      setState("copied");
    } catch {
      setState("failed");
    }
  };

  const label =
    state === "copied"
      ? "Link copied"
      : state === "failed"
        ? "Copy failed"
        : "Share with a friend";

  return (
    <div className="fixed bottom-5 right-5 z-40 print:hidden">
      <button
        type="button"
        onClick={handleShare}
        aria-label={label}
        className="group flex items-center gap-2 rounded-full border border-white/15 bg-[#0f1011]/90 backdrop-blur-md px-4 py-3 text-white shadow-lg transition-all hover:border-orange-500/60 hover:text-orange-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
      >
        {state === "copied" ? (
          <Check size={17} className="text-orange-500 shrink-0" />
        ) : (
          <Share2 size={17} className="shrink-0" />
        )}
        {/* The label is hidden on small screens so the button stays out of the
            way of content, and appears from sm upwards where there is room. */}
        <span className="hidden sm:inline text-[13px] font-medium whitespace-nowrap">
          {label}
        </span>
      </button>
    </div>
  );
};

export default ShareButton;
