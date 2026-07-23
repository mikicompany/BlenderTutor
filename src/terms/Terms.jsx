import { Helmet } from "react-helmet-async"
import Navbar from "../navbar/Navbar"

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
    body: `Paid packages and session prices are presented before you commit to
    them. Payment is due before or at the time of the session unless we agree
    otherwise in writing. Prices may change, but changes never apply
    retroactively to sessions you have already paid for.`,
  },
  {
    title: "4. Cancellations and rescheduling",
    body: `Life happens — you can reschedule or cancel a session free of charge
    up to 24 hours before its start time. Sessions cancelled with less than 24
    hours' notice, or missed without notice, may be counted as used. If we need
    to cancel a session, we will offer you a replacement time or a refund for
    that session.`,
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
      </Helmet>

      <Navbar />

      <div className="max-w-3xl mx-auto px-6 py-24 text-white">
        <h1 className="text-4xl font-bold mb-3">Terms of Service</h1>
        <p className="text-sm text-gray-500 mb-12">Last updated: July 23, 2026</p>

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

export default Terms
