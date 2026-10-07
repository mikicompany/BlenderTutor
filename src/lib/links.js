// The intro call is the only conversion on the site, so its URL appears in the
// navbar, the hero, the pricing cards and the footer. Keeping it in one place
// means a change to the Calendly handle does not have to be found in six files.
export const BOOKING_URL = "https://calendly.com/blendertutoring-info/"

// Shared by every booking button so the wording stays consistent — and says
// "free", which is the part that makes people click.
export const BOOKING_LABEL = "Book a free call"

// The booking calendar embedded on /pay, after payment.
//
// It is the SAME event type the rest of the site books — "Book with Miki" —
// rather than a second scheduler bolted on beside it. One calendar, one set
// of availability, one place a booking can land.
//
// That works because the event type now offers two lengths: 15 minutes for
// the free intro call, 60 minutes for a paid session. Calendly's free plan
// allows one active event type but puts no limit on durations, so this needs
// no upgrade, no second account and no migration.
//
// The booking page shows a length chooser, so step two on /pay tells the
// student to pick 60 minutes. Calendly can preselect a duration by appending
// it to the path — .../30min/60min — which would remove even that step, but
// it is not used here because it could not be verified from the build
// environment, and an unverified URL in a paid flow fails where it hurts
// most. Open it yourself; if the hour is preselected, append it here.
//
// The slug still reads "30min" because it is the original URL and renaming it
// would break every link already sent out.
//
// Worth knowing: the hour is bookable by anyone who opens the page and picks
// it, paid or not. Calendly cannot price one duration and not the other on
// this plan. At present volume that is a smaller problem than making paying
// students wait on an email, but it is the thing to watch — and the reason to
// upgrade if it ever gets abused.
//
// The embed is a plain iframe, so this is not a Calendly-only field. Any
// scheduler with a bookable page works by changing this one line: Cal.com's
// free plan, or a Google Calendar appointment schedule, which is free on a
// personal account and books straight into the calendar that already exists.
// For the Google route take the EMBED url — Share → Embed, the address inside
// the iframe code, like
//   https://calendar.google.com/calendar/appointments/schedules/AcZ...?gv=true
// — and not the short calendar.app.google share link, which renders the whole
// Calendar UI when framed.
export const SESSION_BOOKING_URL =
  "https://calendly.com/blendertutoring-info/30min"
