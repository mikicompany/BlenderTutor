// The booking calendar's own availability, and the slot maths behind it.
//
// This is the site's calendar rather than a scheduler embedded from somewhere
// else. The trade is deliberate and worth being honest about: no third party
// sees your students, nothing needs an account or a monthly fee, and the page
// matches the rest of the site — but the page cannot see your real calendar,
// so the hours below are the single source of truth and have to be kept
// accurate by hand. A slot stays bookable until you block it here.
//
// ──────────────────────────────────────────────────────────────────────────
// YOUR HOURS. Edit WEEKLY, rebuild, done.
// ──────────────────────────────────────────────────────────────────────────

// Everything in WEEKLY is written in this timezone, so you set your hours in
// your own time and never have to think about anyone else's. Students are
// always shown their own local time.
export const HOST_TIMEZONE = "America/Los_Angeles"

export const SESSION_MINUTES = 60

// Nobody can book a slot starting sooner than this, so a booking never lands
// while you are asleep and unable to see it in time.
export const LEAD_HOURS = 24

// How far ahead the calendar offers. Far enough to be useful, short enough
// that you are not committed to a Tuesday three months out.
export const HORIZON_DAYS = 21

// Keys are days of the week, 0 = Sunday. Each entry is a list of [from, to]
// windows in 24-hour HOST_TIMEZONE time, and each window is cut into
// SESSION_MINUTES slots.
//
// Mornings, because of where the students are. 08:00–11:00 here is
// 16:00–19:00 in Ireland and 17:00–20:00 in Spain: after work, which is when
// people book. The previous 21:00–23:00 window was 05:00–07:00 for them,
// which is why the one booking that came through landed at 5:30am.
//
// To offer evenings as well, add the old window back alongside this one:
//   1: [["08:00", "11:00"], ["21:00", "23:00"]],
export const WEEKLY = {
  0: [],
  1: [["08:00", "11:00"]],
  2: [["08:00", "11:00"]],
  3: [["08:00", "11:00"]],
  4: [["08:00", "11:00"]],
  5: [["08:00", "11:00"]],
  6: [],
}

// Dates with nothing on offer, as "YYYY-MM-DD" in HOST_TIMEZONE. Holidays,
// trips, days already full. This is the one that needs keeping up to date:
// a slot you have taken elsewhere is still bookable here until it is listed.
export const BLOCKED_DATES = []

// ──────────────────────────────────────────────────────────────────────────
// Below here is the slot maths. It needs no editing to change your hours.
// ──────────────────────────────────────────────────────────────────────────

// How far the named zone is from UTC at a given instant. Intl is the only
// thing in the browser that knows this, including which side of a daylight
// saving change the date falls on, so the answer is read back out of a
// formatted date rather than assumed from a fixed offset.
function offsetMs(utcMs, timeZone) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(new Date(utcMs))

  const at = {}
  for (const part of parts) at[part.type] = part.value

  const asIfUtc = Date.UTC(
    Number(at.year),
    Number(at.month) - 1,
    Number(at.day),
    // Intl can render midnight as hour 24 in some environments.
    Number(at.hour) % 24,
    Number(at.minute),
    Number(at.second)
  )
  return asIfUtc - utcMs
}

// A wall-clock time in a zone, as a UTC instant.
//
// Applied twice on purpose. The first pass uses the offset at the wrong
// instant, which is off by an hour across a daylight saving boundary; feeding
// that result back in resolves it. Without the second pass, slots in the week
// of a clock change land an hour out.
export function zonedToUtc(y, m, d, hh, mm, timeZone) {
  const naive = Date.UTC(y, m - 1, d, hh, mm)
  const firstPass = naive - offsetMs(naive, timeZone)
  return naive - offsetMs(firstPass, timeZone)
}

// Today's date as the host sees it, which is not necessarily today in UTC.
function civilToday(timeZone) {
  // en-CA formats as YYYY-MM-DD, which needs no parsing beyond a split.
  const [y, m, d] = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .format(new Date())
    .split("-")
    .map(Number)
  return { y, m, d }
}

function addDays({ y, m, d }, days) {
  // Noon, so adding days can never tip over a daylight saving boundary into
  // the previous or next date.
  const at = new Date(Date.UTC(y, m - 1, d, 12))
  at.setUTCDate(at.getUTCDate() + days)
  return {
    y: at.getUTCFullYear(),
    m: at.getUTCMonth() + 1,
    d: at.getUTCDate(),
  }
}

const iso = ({ y, m, d }) =>
  `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`

const minutesOf = (hhmm) => {
  const [h, m] = hhmm.split(":").map(Number)
  return h * 60 + m
}

// The bookable days, each with its slots, as UTC instants. Days with nothing
// left are dropped, so an empty result means genuinely nothing is free rather
// than a list of empty days.
//
// `now` is injectable so the behaviour around the lead time and the horizon
// can be tested without waiting for a particular date to come around.
export function availableDays(now = Date.now()) {
  const earliest = now + LEAD_HOURS * 60 * 60 * 1000
  const today = civilToday(HOST_TIMEZONE)
  const days = []

  for (let i = 0; i <= HORIZON_DAYS; i++) {
    const date = addDays(today, i)
    const key = iso(date)
    if (BLOCKED_DATES.includes(key)) continue

    // getUTCDay on a UTC-noon date gives the weekday of the civil date, which
    // is what WEEKLY is keyed by.
    const weekday = new Date(Date.UTC(date.y, date.m - 1, date.d, 12)).getUTCDay()
    const windows = WEEKLY[weekday] || []

    const slots = []
    for (const [from, to] of windows) {
      const start = minutesOf(from)
      const end = minutesOf(to)
      for (let t = start; t + SESSION_MINUTES <= end; t += SESSION_MINUTES) {
        const at = zonedToUtc(
          date.y,
          date.m,
          date.d,
          Math.floor(t / 60),
          t % 60,
          HOST_TIMEZONE
        )
        if (at >= earliest) slots.push(at)
      }
    }

    if (slots.length) days.push({ date: key, slots })
  }

  return days
}
