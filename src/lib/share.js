// Shared by the floating site-wide button and The Radar's own header button,
// so both behave identically and the awkward parts are only solved once.
//
// The URL and title are read at call time rather than captured earlier: the
// build prerenders every route from a local server, and anything derived from
// window.location during render would ship a 127.0.0.1 address in the HTML.

export const SHARE_IDLE = "idle"
export const SHARE_SHARED = "shared"
export const SHARE_COPIED = "copied"
export const SHARE_FAILED = "failed"

export async function shareCurrentPage() {
  const url = window.location.href
  const title = document.title

  // Phones and most tablets get the real share sheet, which is what people
  // reach for when sending a link to someone.
  if (navigator.share) {
    try {
      await navigator.share({ title, url })
      return SHARE_SHARED
    } catch (err) {
      // Dismissing the sheet rejects with AbortError. That is a deliberate
      // cancel, so it must not fall through to copying a link nobody asked to
      // have on their clipboard.
      if (err?.name === "AbortError") return SHARE_IDLE
    }
  }

  try {
    await navigator.clipboard.writeText(url)
    return SHARE_COPIED
  } catch {
    return SHARE_FAILED
  }
}
