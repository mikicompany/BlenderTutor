import { Helmet } from "react-helmet-async"
import Navbar from "../navbar/Navbar"

import Footer from "../footer/Footer"
const sections = [
  {
    title: "1. Who we are",
    body: `Blender Tutoring ("we", "us") provides one-on-one mentoring and
    tutoring for Blender and related 3D creation tools through
    blendertutoring.com (the "Site"). By booking a session or using the Site,
    you agree to these Terms of Service.`,
  },
  {
    title: "2. Sessions and booking",
    body: `Tutoring sessions are scheduled through our booking provider
    (Calendly). Session times are agreed in advance and held over video call.
    The free intro call is a no-obligation conversation to see whether the
    mentorship is a good fit — it does not commit you to purchasing anything.`,
  },
  {
    title: "3. Payments",
    body: `All prices are quoted and charged in US dollars (USD). If your
    payment method uses another currency, your bank or card issuer sets the
    exchange rate and may add its own fees, so the amount leaving your account
    can differ from the figure shown here. Paid packages and session prices are
    presented before you commit to them. Payment is due before or at the time
    of the session unless we agree otherwise in writing. Prices may change, but
    changes never apply retroactively to sessions you have already paid for.`,
  },
  {
    title: "4. Cancellations, rescheduling and no-shows",
    body: `Your session time is reserved for you alone, so a missed session is
    time that cannot be offered to anyone else. This policy is here to keep that
    fair on both sides — it applies to paid sessions, whether booked singly or
    as part of a package.`,
    points: [
      {
        label: "48 hours' notice or more",
        text: `Reschedule or cancel free of charge, no questions asked. Use the
        link in your booking confirmation email, or simply reply to it, and
        we'll find a new time.`,
      },
      {
        label: "Less than 48 hours' notice, or a no-show",
        text: `The session may be counted as used — its fee forfeited, or one
        session deducted from a package. As a goodwill, your first late
        cancellation or no-show is waived; the policy applies after that.`,
      },
      {
        label: "Arriving late",
        text: `We hold your slot and wait up to 15 minutes from the start time.
        Message us if you're held up and we'll make the most of the time we
        have; sessions still end at the scheduled time so the next booking is
        not affected.`,
      },
      {
        label: "The free intro call",
        text: `No charge and no penalty for missing it. If an intro call is
        missed twice without notice, we'll ask you to book paid time before
        reserving another free slot.`,
      },
      {
        label: "If we cancel, or are more than 10 minutes late",
        text: `That session is free — or credited back to your package — and
        we'll reschedule at a time that suits you. The policy runs both ways.`,
      },
      {
        label: "Emergencies and technical problems",
        text: `Genuine emergencies, illness, and real connection or software
        failures (yours or ours) are handled case by case and in good faith.
        Tell us what happened and we'll sort it out fairly — this policy exists
        to respect everyone's time, not to penalise bad luck.`,
      },
    ],
  },
  {
    title: "5. Your work stays yours",
    body: `Everything you create during the mentorship — models, scenes,
    materials, renders, and project files — belongs entirely to you. We claim
    no rights over your work. With your permission, we may showcase excerpts of
    student projects on the Site; we will always ask first.`,
  },
  {
    title: "6. Our materials",
    body: `Lesson plans, exercises, and learning materials we share with you
    are for your personal learning use. Please don't resell or republish them
    as your own.`,
  },
  {
    title: "7. Acceptable use",
    body: `Be respectful during sessions and when using the Site. We may
    decline or discontinue service in cases of abusive behaviour, and in that
    situation any unused, prepaid sessions will be refunded.`,
  },
  {
    title: "8. No guarantees, within reason",
    body: `We put real care into every session, but learning outcomes depend on
    practice and vary from person to person. The Site and its content —
    including the blog and The Radar dashboard, which aggregates third-party
    data — are provided "as is" without warranties of accuracy or fitness for
    a particular purpose.`,
  },
  {
    title: "9. Limitation of liability",
    body: `To the maximum extent permitted by law, our total liability arising
    from the Site or our services is limited to the amount you paid us in the
    three months before the claim arose. We are not liable for indirect or
    consequential damages.`,
  },
  {
    title: "10. Changes to these terms",
    body: `We may update these terms from time to time. The "last updated" date
    at the top of this page always reflects the current version, and continued
    use of the Site after a change means you accept the updated terms.`,
  },
  {
    title: "11. Questions",
    body: `If anything here is unclear, reach out — the easiest way is to book
    a free intro call from the home page and ask us directly, or reply to any
    email we've exchanged with you.`,
  },
]

const Terms = () => {
  return (
    <div className="relative w-full min-h-screen bg-black">
      <Helmet>
        <title>Terms of Service — Blender Tutoring</title>
        <meta
          name="description"
          content="The terms of service for Blender Tutoring's mentoring sessions and website."
        />
        <link rel="canonical" href="https://www.blendertutoring.com/terms" />

        {/* Without these a shared link unfurls as a bare URL. Legal pages
            get linked more than you would think — in emails, in disputes —
            and an unfurl with no image reads as an untrustworthy link. */}
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="Blender Tutoring" />
        <meta property="og:title" content="Terms of Service — Blender Tutoring" />
        <meta
          property="og:url"
          content="https://www.blendertutoring.com/terms"
        />
        <meta
          property="og:image"
          content="https://www.blendertutoring.com/og-image.jpg"
        />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta
          name="twitter:image"
          content="https://www.blendertutoring.com/og-image.jpg"
        />
      </Helmet>

      <Navbar />

      <div className="max-w-3xl mx-auto px-6 py-24 text-white">
        <h1 className="text-4xl font-bold mb-3">Terms of Service</h1>
        <p className="text-sm text-gray-500 mb-12">Last updated: October 29, 2026</p>

        {sections.map((s) => (
          <section key={s.title} className="mb-10">
            <h2 className="text-xl font-semibold mb-3 text-orange-400">
              {s.title}
            </h2>
            <p className="text-gray-300 leading-relaxed">{s.body}</p>
            {/* A section can carry labelled sub-points (clause 4, the
                cancellation policy). They render as a definition-style list:
                a bold lead, then the rule. Sections without `points` are
                unchanged. */}
            {s.points && (
              <ul className="mt-4 space-y-3">
                {s.points.map((p) => (
                  <li key={p.label} className="text-gray-300 leading-relaxed">
                    <strong className="font-semibold text-white">
                      {p.label}
                    </strong>
                    {" — "}
                    {p.text}
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>
      <Footer />
    </div>
  )
}

export default Terms
