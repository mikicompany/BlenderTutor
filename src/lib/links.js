// The intro call is the only conversion on the site, so its URL appears in the
// navbar, the hero, the pricing cards and the footer. Keeping it in one place
// means a change to the Calendly handle does not have to be found in six files.
export const BOOKING_URL = "https://calendly.com/blendertutoring-info/"

// Shared by every booking button so the wording stays consistent — and says
// "free", which is the part that makes people click.
export const BOOKING_LABEL = "Book a free call"

// The booking calendar for the paid hour, embedded on /pay. Empty means /pay
// tells the student to email instead — which is the one step we are trying
// to remove, so this is worth filling in.
//
// It is NOT a Calendly-only field. The embed is a plain iframe, so any
// scheduler that gives you a bookable page works: Calendly, Cal.com, Google
// Calendar appointment schedules. Paste the page's own URL.
//
// It is empty today because Calendly's free plan allows exactly ONE active
// event type, and that one has to be the free intro call — it is what every
// button on the site points at, and where every student comes from.
//
// Three ways out, any of which makes this a one-line change:
//
//   Google Calendar appointment schedule — RECOMMENDED. Free on a personal
//   Google account, which dg1company@gmail.com is, and it books straight
//   into the calendar that already exists rather than through anyone else's
//   service. A free account gets exactly one booking page, which is all
//   this needs. In Google Calendar: Create → Appointment schedule, set the
//   length to 60 minutes, set the hours, and under its settings add Google
//   Meet as the conferencing option.
//
//   Then take the EMBED url, not the share link. Open the schedule → Share →
//   Embed, and copy the address out of the iframe code. It looks like
//     https://calendar.google.com/calendar/appointments/schedules/AcZ...?gv=true
//   The short calendar.app.google/... share link opens the full Calendar UI
//   when framed, which is not what anyone wants on a payment page. (If the
//   gv=true is missing, the embed adds it.)
//
//   Calendly paid plan — a "1-Hour Tutoring Session" event type already
//   exists, configured and ready (60 minutes, Google Meet as its location).
//   It is deactivated, because activating it is what deactivates the free
//   call. Upgrade, reactivate it, then set this to:
//     https://calendly.com/blendertutoring-info/1-hour-tutoring-session
//
//   Cal.com free plan — unlimited event types at no cost, and it embeds the
//   same way. Make a 60-minute event type there, connect Google Meet, and
//   paste its URL. The free Calendly intro call keeps working untouched.
//
// Do not point this at the free intro call. That one is 15 minutes and
// titled "No Charge", so a paying student sent there books a quarter of
// what they bought.
export const SESSION_BOOKING_URL = ""
