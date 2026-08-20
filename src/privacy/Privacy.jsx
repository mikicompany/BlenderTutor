import { Helmet } from "react-helmet-async"
import Navbar from "../navbar/Navbar"

const sections = [
  {
    title: "1. The short version",
    body: `We collect as little as we reasonably can. There are no ads on this
    site and we never sell your information. We do use Google Tag Manager to
    measure how the site is used, described below. Beyond that, the only
    personal information we receive is what you choose to give us — when you
    book a call or subscribe to our newsletter — and we use it only for that
    purpose.`,
  },
  {
    title: "2. Analytics",
    body: `The Site loads Google Tag Manager, which we use to run analytics
    such as Google Analytics. These tools record things like which pages are
    visited, roughly where visitors are in the world, and which site referred
    them, and they may set cookies in your browser to do so. We use this only
    to understand which articles are useful and how people find us — never to
    identify you personally. You can opt out with any standard cookie or
    tracker blocker, and browsers offering "Do Not Track" or similar controls
    will limit it further.`,
  },
  {
    title: "3. Booking a call",
    body: `When you book an intro call, scheduling is handled by Calendly. They
    collect your name, email address, and the time you pick, and share it with
    us so we can hold the session. Calendly processes this data under its own
    privacy policy. We use your contact details only to run and follow up on
    your sessions — never for unrelated marketing, and we never sell them.`,
  },
  {
    title: "4. Newsletter",
    body: `If you subscribe to updates on The Radar, your email address goes to
    Mailchimp, our newsletter provider, and is used solely to send you the
    digest you signed up for. Every email includes an unsubscribe link, and
    unsubscribing removes you from the list. Mailchimp processes your address
    under its own privacy policy.`,
  },
  {
    title: "5. Hosting",
    body: `The Site is hosted on GitHub Pages. Like most web hosts, GitHub may
    log basic technical information about visits (such as IP addresses) for
    security and operational purposes, governed by GitHub's privacy statement.
    We do not receive or review these logs.`,
  },
  {
    title: "6. Data stored in your browser",
    body: `The Radar can store an API key you provide in your browser's local
    storage so you don't have to re-enter it. That key stays on your device —
    it is never sent to us — and you can remove it at any time with the key
    button on The Radar or by clearing your browser data. Aside from the
    analytics cookies described above, we set no cookies of our own.`,
  },
  {
    title: "7. Third-party data on The Radar",
    body: `The Radar displays live gaming data fetched directly by your browser
    from third-party services (RAWG, Steam Spy, and news feeds from gaming
    publications). Those requests go from your browser to those services, so
    they can see your IP address the same way any website you visit can. We
    don't control those services and don't receive any data about you from
    them.`,
  },
  {
    title: "8. Your rights",
    body: `You can ask us at any time what personal information we hold about
    you, ask us to correct it, or ask us to delete it. Since we keep so little,
    this is usually just your booking details and, if you subscribed, your
    email address. Reach out through a booked call or reply to any email we've
    exchanged and we'll sort it out promptly.`,
  },
  {
    title: "9. Children",
    body: `Some of our students are minors learning 3D with a parent or
    guardian's involvement. Bookings for anyone under 16 should be made by a
    parent or guardian, using the parent or guardian's contact details.`,
  },
  {
    title: "10. Changes to this policy",
    body: `If we ever change how we handle your information, we'll update this
    page and the "last updated" date at the top. We won't start collecting
    more than described here without making that clear first.`,
  },
]

const Privacy = () => {
  return (
    <div className="relative w-full min-h-screen bg-black">
      <Helmet>
        <title>Privacy Policy — Blender Tutoring</title>
        <meta
          name="description"
          content="What information Blender Tutoring collects, how it's used, and your rights."
        />
        <link rel="canonical" href="https://www.blendertutoring.com/privacy" />
      </Helmet>

      <Navbar />

      <div className="max-w-3xl mx-auto px-6 py-24 text-white">
        <h1 className="text-4xl font-bold mb-3">Privacy Policy</h1>
        <p className="text-sm text-gray-500 mb-12">Last updated: August 18, 2026</p>

        {sections.map((s) => (
          <section key={s.title} className="mb-10">
            <h2 className="text-xl font-semibold mb-3 text-orange-400">
              {s.title}
            </h2>
            <p className="text-gray-300 leading-relaxed">{s.body}</p>
          </section>
        ))}
      </div>
    </div>
  )
}

export default Privacy
