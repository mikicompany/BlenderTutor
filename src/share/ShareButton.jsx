import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { Share2, Check } from "lucide-react";
import {
  shareCurrentPage,
  SHARE_IDLE,
  SHARE_COPIED,
  SHARE_FAILED,
} from "../lib/share";

// Rendered once in App so it reaches every route, with two exceptions. The
// Radar has its own share control in its header styled to match that page,
// and two share buttons on one screen is just clutter. And /pay is sent to
// one person to settle an invoice — inviting them to pass it to a friend
// makes no sense there.
const HIDDEN_ON = ["/radar", "/pay"];

const ShareButton = () => {
  const { pathname } = useLocation();
  const [state, setState] = useState(SHARE_IDLE);

  useEffect(() => {
    if (state === SHARE_IDLE) return;
    const t = setTimeout(() => setState(SHARE_IDLE), 2200);
    return () => clearTimeout(t);
  }, [state]);

  if (HIDDEN_ON.includes(pathname.replace(/\/$/, ""))) return null;

  const handleShare = async () => setState(await shareCurrentPage());

  const label =
    state === SHARE_COPIED
      ? "Link copied"
      : state === SHARE_FAILED
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
        {state === SHARE_COPIED ? (
          <Check size={17} className="text-orange-500 shrink-0" />
        ) : (
          <Share2 size={17} className="shrink-0" />
        )}
        {/* Hidden on small screens so the button stays clear of content. */}
        <span className="hidden sm:inline text-[13px] font-medium whitespace-nowrap">
          {label}
        </span>
      </button>
    </div>
  );
};

export default ShareButton;
