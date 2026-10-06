// The intro call is the only conversion on the site, so its URL appears in the
// navbar, the hero, the pricing cards and the footer. Keeping it in one place
// means a change to the Calendly handle does not have to be found in six files.
export const BOOKING_URL = "https://calendly.com/blendertutoring-info/"

// Shared by every booking button so the wording stays consistent — and says
// "free", which is the part that makes people click.
export const BOOKING_LABEL = "Book a free call"

// The paid hour, used only on /pay. Empty means /pay shows "I'll send you an
// invite" instead of an embedded calendar — see Pay.jsx.
//
// It is empty because Calendly's free plan allows exactly ONE active event
// type, and that one has to be the free intro call: it is what every button
// on the site points at, and it is where every student comes from.
//
// A "1-Hour Tutoring Session" event type does exist, already configured —
// 60 minutes, Google Meet as its location, created for exactly this. It is
// deactivated, because activating it is what deactivates the free call.
// Upgrading Calendly to a plan with multiple event types is the only thing
// standing between here and a working embed. Once that is done, activate it
// and set this to:
//
//   https://calendly.com/blendertutoring-info/1-hour-tutoring-session
//
// Do not point this at the free intro call. That one is 15 minutes and
// titled "No Charge", so a paying student sent there books a quarter of
// what they bought.
export const SESSION_BOOKING_URL = ""
