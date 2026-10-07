import React, { useMemo, useState } from "react"
import { Calendar, Clock, ArrowLeft, Check, Download, Video } from "lucide-react"
import {
  availableDays,
  SESSION_MINUTES,
  HOST_TIMEZONE,
} from "../lib/availability"
import { postAwait } from "../lib/tracking"

// The site's own booking calendar, used on /pay once a session is paid for.
//
// What it can and cannot do is worth stating plainly, because the difference
// decides how the page is worded. It cannot see a real calendar: a static
// site has no server and no credentials, so the hours in lib/availability.js
// are the only truth it has. It therefore takes a booking request and sends
// it on, rather than claiming a slot is confirmed when nothing has confirmed
// it. The student is given the details to put in their own calendar straight
// away, so a failed notification still leaves them holding something.

const VIEWER_TZ =
  Intl.DateTimeFormat().resolvedOptions().timeZone || "your local time"

// Everything on this calendar is shown in Pacific time, the same clock the
// sessions are actually run on, rather than in each visitor's own zone.
// One clock means one set of numbers to talk about afterwards.
//
// The cost is that a student abroad has to convert, so wherever a specific
// time is being committed to the local equivalent is shown beside it.
const SHOWS_LOCAL_TOO = VIEWER_TZ !== HOST_TIMEZONE

// Everything the student sees is in the student's own timezone, headings
// included. Grouping by the host's date instead looks tidier from this end
// and is actively dangerous from theirs: a 21:00 Monday slot in Vancouver is
// 05:00 Tuesday in Dublin, so a heading reading "Monday" over a button
// reading 05:00 invites someone to arrive a day late.
const dayLabel = (ms) =>
  new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: HOST_TIMEZONE,
  }).format(new Date(ms))

// The viewer's own calendar date for an instant, used only as a grouping key.
// Grouping key must match the clock the times are rendered on, or a heading
// ends up over slots belonging to a different day. Now that everything is
// Pacific, the key is Pacific too.
const localDateKey = (ms) =>
  new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: HOST_TIMEZONE,
  }).format(new Date(ms))

// 12-hour with AM/PM. "4 PM" is read at a glance; "16:00" is arithmetic for
// most people outside continental Europe.
const timeLabel = (ms) =>
  new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: HOST_TIMEZONE,
  }).format(new Date(ms))

// The same instant on the visitor's own clock, for the moments where being
// wrong costs them a session.
const localLabel = (ms) =>
  new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(ms))

// The zone abbreviation as it stands ON THAT DATE — PDT through the summer,
// PST from November — rather than a fixed string. Hardcoding "PST" would be
// wrong for roughly eight months of the year, and a wrong timezone on a
// booking is how someone misses their session by an hour.
//
// Forced to en-US because no locale abbreviates every zone well: en-US gives
// a clean PDT/PST for Pacific but GMT+1 for Dublin, while en-IE gives IST for
// Dublin and GMT-7 for Vancouver. GMT+1 is the better of those two anyway —
// "IST" means both Irish and India Standard Time, and an ambiguous timezone
// on a booking page is worse than a plain offset.
const zoneAbbr = (ms, timeZone = HOST_TIMEZONE) => {
  try {
    return new Intl.DateTimeFormat("en-US", {
      timeZone,
      timeZoneName: "short",
    })
      .formatToParts(new Date(ms))
      .find((part) => part.type === "timeZoneName")?.value
  } catch {
    return null
  }
}

// "4:00 PM PDT" — the zone named every time a specific time is shown, so a
// student never has to work out whose clock a figure belongs to.
const timeWithZone = (ms) => {
  const abbr = zoneAbbr(ms)
  return abbr ? `${timeLabel(ms)} ${abbr}` : timeLabel(ms)
}

const fullLabel = (ms) => {
  const date = new Intl.DateTimeFormat(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date(ms))
  return `${date} at ${timeWithZone(ms)}`
}

// Calendar files and Google's template URL both want UTC basic format:
// 20261008T040000Z
const stamp = (ms) => new Date(ms).toISOString().replace(/[-:]|\.\d{3}/g, "")

function googleCalendarUrl(ms, title) {
  const end = ms + SESSION_MINUTES * 60 * 1000
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: title,
    dates: `${stamp(ms)}/${stamp(end)}`,
    details:
      "Blender Tutoring session. A Google Meet link will arrive with your confirmation.",
  })
  return `https://calendar.google.com/calendar/render?${params}`
}

function icsHref(ms, title) {
  const end = ms + SESSION_MINUTES * 60 * 1000
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Blender Tutoring//EN",
    "BEGIN:VEVENT",
    `UID:${stamp(ms)}-blendertutoring`,
    `DTSTAMP:${stamp(Date.now())}`,
    `DTSTART:${stamp(ms)}`,
    `DTEND:${stamp(end)}`,
    `SUMMARY:${title}`,
    "DESCRIPTION:Blender Tutoring session.",
    "END:VEVENT",
    "END:VCALENDAR",
  ]
  // CRLF is what the calendar spec asks for, and Outlook is the one that
  // actually minds.
  return `data:text/calendar;charset=utf-8,${encodeURIComponent(
    lines.join("\r\n")
  )}`
}

const looksLikeEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value)

const BookingCalendar = ({ item, prefillName, alreadyPaid, onBooked }) => {
  // Computed once per mount. Recomputing on every render would let a slot
  // vanish mid-interaction as the lead-time cutoff rolls past it.
  //
  // Regrouped onto the viewer's calendar dates, because availableDays works
  // in the host's and the two disagree for most of the world.
  const days = useMemo(() => {
    const byDate = new Map()
    for (const day of availableDays()) {
      for (const at of day.slots) {
        const key = localDateKey(at)
        if (!byDate.has(key)) byDate.set(key, [])
        byDate.get(key).push(at)
      }
    }
    return [...byDate.values()]
      .map((slots) => slots.sort((a, b) => a - b))
      .sort((a, b) => a[0] - b[0])
  }, [])

  const [slot, setSlot] = useState(null)
  const [form, setForm] = useState({ name: prefillName || "", email: "" })
  const [status, setStatus] = useState("idle") // idle | sending | done | error
  const [touched, setTouched] = useState(false)

  const title = `Blender Tutoring — ${item?.name || "session"}`
  const valid = form.name.trim() && looksLikeEmail(form.email.trim())

  const submit = async (event) => {
    event.preventDefault()
    setTouched(true)
    if (!valid || status === "sending") return

    setStatus("sending")
    try {
      await postAwait({
        _subject: `Session booking — ${fullLabel(slot)}`,
        student: form.name.trim(),
        email: form.email.trim(),
        item: item?.name || "session",
        slot_utc: new Date(slot).toISOString(),
        slot_your_time: `${new Intl.DateTimeFormat("en-US", {
          dateStyle: "full",
          timeStyle: "short",
          hour12: true,
          timeZone: HOST_TIMEZONE,
        }).format(new Date(slot))} (${zoneAbbr(slot, HOST_TIMEZONE)})`,
        slot_student_time: `${localLabel(slot)} (${VIEWER_TZ})`,
        length: `${SESSION_MINUTES} minutes`,
      })
      setStatus("done")
      // Lets the payment step name the slot being paid for.
      onBooked?.(slot)
    } catch {
      setStatus("error")
    }
  }

  if (status === "done") {
    return (
      <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/[0.07] p-6">
        <div className="flex gap-3 mb-5">
          <Check className="w-5 h-5 text-emerald-400 shrink-0 mt-px" />
          <div>
            <h3 className="text-sm font-bold text-emerald-50 mb-1">
              {fullLabel(slot)}
            </h3>
            <p className="text-[12.5px] text-emerald-50/70">
              Pacific time{SHOWS_LOCAL_TOO ? ` · ${localLabel(slot)} your time` : ""}
            </p>
          </div>
        </div>

        <p className="text-[13px] text-gray-300 leading-relaxed mb-5">
          {alreadyPaid
            ? "That slot is requested and I have been notified. You will get a calendar invite with a Google Meet link — if anything about the time needs changing, I will say so before confirming."
            : "That slot is held and I have been notified. Complete payment below and I will send the calendar invite with a Google Meet link."}
        </p>

        {/* Given immediately, so the student is holding the details even if
            the notification never arrives at the other end. */}
        <div className="flex flex-wrap gap-3">
          <a
            href={googleCalendarUrl(slot, title)}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 bg-white/5 border border-white/10 hover:bg-white/10 px-4 py-2.5 rounded-lg text-[13px] font-medium text-white transition-all"
          >
            <Calendar size={15} className="text-orange-500" />
            Add to Google Calendar
          </a>
          <a
            href={icsHref(slot, title)}
            download="blender-tutoring-session.ics"
            className="inline-flex items-center gap-2 bg-white/5 border border-white/10 hover:bg-white/10 px-4 py-2.5 rounded-lg text-[13px] font-medium text-white transition-all"
          >
            <Download size={15} className="text-orange-500" />
            Download .ics
          </a>
        </div>
      </div>
    )
  }

  // ── Confirm step ────────────────────────────────────────────────────────
  if (slot) {
    return (
      <form
        onSubmit={submit}
        className="rounded-xl border border-white/10 bg-white/[0.03] p-5"
      >
        <button
          type="button"
          onClick={() => {
            setSlot(null)
            setStatus("idle")
          }}
          className="inline-flex items-center gap-1.5 text-[12px] text-gray-500 hover:text-orange-400 transition-colors mb-5"
        >
          <ArrowLeft size={13} />
          Pick a different time
        </button>

        <div className="flex gap-2.5 mb-5 pb-5 border-b border-white/10">
          <Clock size={17} className="text-orange-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold">{fullLabel(slot)}</p>
            <p className="text-[12px] text-gray-500 mt-0.5">
              {SESSION_MINUTES} minutes · Pacific time
              {SHOWS_LOCAL_TOO && ` · ${localLabel(slot)} your time`}
            </p>
          </div>
        </div>

        <label className="block mb-4">
          <span className="block text-[12px] text-gray-400 mb-1.5">
            Your name
          </span>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full bg-white/[0.06] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-orange-500/60 transition-colors"
            placeholder="Stefan Roos"
          />
        </label>

        <label className="block mb-5">
          <span className="block text-[12px] text-gray-400 mb-1.5">
            Your email
          </span>
          <input
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="w-full bg-white/[0.06] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-orange-500/60 transition-colors"
            placeholder="you@example.com"
          />
          <span className="block text-[11px] text-gray-600 mt-1.5">
            Only used to send your calendar invite.
          </span>
        </label>

        {touched && !valid && (
          <p className="text-[12px] text-orange-400 mb-4">
            A name and a valid email address are both needed to send the
            invite.
          </p>
        )}

        {status === "error" && (
          <p className="text-[12px] text-orange-400 mb-4">
            That did not send — the connection may have dropped. Try again, or
            email info@blendertutoring.com with the time above.
          </p>
        )}

        <button
          type="submit"
          disabled={status === "sending"}
          className="w-full bg-orange-500 text-black hover:bg-orange-600 disabled:opacity-60 px-5 py-3 rounded-xl text-sm font-bold transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
        >
          {status === "sending" ? "Sending…" : "Confirm this time"}
        </button>
      </form>
    )
  }

  // ── Slot picker ─────────────────────────────────────────────────────────
  if (!days.length) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-6 text-center">
        <Calendar className="w-5 h-5 text-orange-500 mx-auto mb-3" />
        <p className="text-[13px] text-gray-400 leading-relaxed max-w-xs mx-auto">
          No times are open in the next few weeks. Email{" "}
          <a
            href="mailto:info@blendertutoring.com"
            className="text-gray-300 hover:text-orange-400 underline underline-offset-2"
          >
            info@blendertutoring.com
          </a>{" "}
          and we will find one.
        </p>
      </div>
    )
  }

  return (
    <div>
      <div
        className="rounded-xl border border-white/10 bg-[#0f1011] overflow-y-auto"
        style={{ maxHeight: "440px" }}
      >
        {days.map((slots) => (
          <div
            key={slots[0]}
            className="px-5 py-4 border-b border-white/5 last:border-0"
          >
            {/* The zone sits here rather than on each chip: stated once per
                day it is still unmissable, and three identical suffixes in a
                row is noise. */}
            <p className="text-[12px] text-gray-500 mb-3">
              {dayLabel(slots[0])}
              {zoneAbbr(slots[0]) && (
                <span className="text-gray-600"> · {zoneAbbr(slots[0])}</span>
              )}
            </p>
            <div className="flex flex-wrap gap-2">
              {slots.map((at) => (
                <button
                  key={at}
                  type="button"
                  onClick={() => setSlot(at)}
                  className="px-4 py-2 rounded-lg border border-white/10 bg-white/[0.04] hover:border-orange-500/60 hover:bg-orange-500/10 text-sm font-medium text-white transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
                >
                  {timeLabel(at)}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <p className="flex items-start gap-2 text-[11.5px] text-gray-500 leading-relaxed mt-3">
        <Video className="w-4 h-4 mt-px shrink-0 text-gray-600" />
        <span>
          {/* Read off the first slot rather than the clock: a date, not
              "now", so rendering stays pure and the abbreviation matches the
              slots actually on screen. */}
          All times are Pacific ({zoneAbbr(days[0][0])}), the clock the
          sessions run on.
          {SHOWS_LOCAL_TOO &&
            " Your own local time is shown beside whichever slot you pick."}{" "}
          Each session is {SESSION_MINUTES} minutes, held over Google Meet.
        </span>
      </p>
    </div>
  )
}

export default BookingCalendar
