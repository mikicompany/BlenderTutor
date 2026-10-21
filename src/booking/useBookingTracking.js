import { useEffect } from "react"
import { trackBookingClick, trackPackagesCtaClick } from "../lib/tracking"

// One delegated listener on the document rather than a handler on each of the
// eight booking links spread across the navbar, hero, tutor card, pricing
// cards and footer. It catches every one of them, keeps the tracking out of
// the presentation components, and — the real reason — automatically covers
// any booking link added later, which per-link handlers would quietly miss.
export function useBookingTracking() {
  useEffect(() => {
    const onClick = (event) => {
      // closest() walks up from whatever was actually clicked, so a click on
      // the arrow icon inside the button still resolves to the link.
      //
      // The second selector matches the article CTAs, which are written as
      // absolute URLs. Matching the absolute form on purpose: the navbar's
      // "Packages" item is a bare "#packages", and counting plain navigation
      // as a call-to-action click would make the number meaningless.
      const anchor = event.target.closest?.(
        'a[href*="calendly.com"], a[href*="blendertutoring.com/#packages"]'
      )
      if (!anchor) return

      // Middle-click and ctrl/cmd-click open the booking page too, so they
      // count. Right-click does not, and is excluded.
      if (event.type === "auxclick" && event.button !== 1) return

      if (anchor.href.includes("calendly.com")) trackBookingClick(anchor)
      else trackPackagesCtaClick(anchor)
      // Deliberately no preventDefault: the navigation is the point, and the
      // beacon is fire-and-forget.
    }

    document.addEventListener("click", onClick)
    document.addEventListener("auxclick", onClick)
    return () => {
      document.removeEventListener("click", onClick)
      document.removeEventListener("auxclick", onClick)
    }
  }, [])
}
