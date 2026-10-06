// The intro call is the only conversion on the site, so its URL appears in the
// navbar, the hero, the pricing cards and the footer. Keeping it in one place
// means a change to the Calendly handle does not have to be found in six files.
export const BOOKING_URL = "https://calendly.com/blendertutoring-info/"

// Shared by every booking button so the wording stays consistent — and says
// "free", which is the part that makes people click.
export const BOOKING_LABEL = "Book a free call"

// The paid hour, used only on /pay. Deliberately a different event type from
// the one above: that one is 15 minutes and titled "No Charge", so sending a
// paying student there books them a quarter of what they bought.
//
// Both event types have Google Meet set as their location, so the invite
// carries a join link without anyone having to create one.
export const SESSION_BOOKING_URL =
  "https://calendly.com/blendertutoring-info/1-hour-tutoring-session"
