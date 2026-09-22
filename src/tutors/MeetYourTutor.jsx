import React from "react";
import { motion } from "framer-motion";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { BOOKING_URL, BOOKING_LABEL } from "../lib/links";

// ---------------------------------------------------------------------------
// Add another entry to this array to add a tutor; the layout handles one, two
// or three without further changes.
//
// photo: drop a square image in public/tutors/ and reference it as
// "/tutors/name.jpg". Leave it null and the card falls back to the initial.
// ---------------------------------------------------------------------------
const tutors = [
  {
    // Every claim here comes from resume-data.json on mikibutler.ca, so the
    // two sites cannot drift into saying different things.
    name: "Miki Butler",
    role: "Senior Environment Artist · 18 years in games",
    // The Miki mark from mikibutler.ca, resized to 160px for a 64px slot.
    // Its own background is black, so it sits cleanly in the circular crop.
    photo: "/tutors/miki-butler.jpg",
    bio: "Senior Environment Artist in Vancouver, building game worlds for 18 years — shipped titles with Capcom, EA, Ubisoft, Offworld Industries and Next Level Games, across PC, PlayStation, Xbox, Nintendo and mobile. Also mentors at Think Tank Training Centre, guiding artists through portfolio development and production-ready game art.",
    teaches: [
      "Environment art",
      "Modeling & sculpting",
      "Texturing",
      "Game pipeline",
    ],
    links: [
      { label: "Portfolio", href: "https://mikibutler.ca/work.html" },
      { label: "ArtStation", href: "https://www.artstation.com/mikicompany" },
    ],
  },
];

const GRID_FOR = {
  1: "max-w-md mx-auto",
  2: "sm:grid-cols-2 max-w-3xl mx-auto",
  3: "sm:grid-cols-2 lg:grid-cols-3",
};

const initialOf = (name) => name.trim().charAt(0).toUpperCase();

const MeetYourTutor = () => {
  return (
    <section className="py-24 px-6 text-white">
      <div className="max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-14"
        >
          <h2 className="text-orange-500 uppercase tracking-[0.3em] text-[10px] font-bold mb-2">
            Meet your tutor
          </h2>
          <h3 className="text-3xl font-bold">
            You&apos;re learning from a{" "}
            <span className="text-orange-500">person</span>, not a playlist
          </h3>
          <p className="text-gray-400 text-sm mt-4 max-w-lg mx-auto leading-relaxed">
            Every session is one-to-one. Here&apos;s who you&apos;ll be sitting
            with.
          </p>
        </motion.div>

        {/* One tutor centres; two or three sit side by side. The classes are
            written out in full because Tailwind generates them by scanning the
            source — a name built at runtime would never reach the stylesheet. */}
        <div className={`grid gap-6 ${GRID_FOR[Math.min(tutors.length, 3)]}`}>
          {tutors.map((tutor, i) => (
            <motion.div
              key={tutor.name}
              initial={{ opacity: 0, y: 25 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.5 }}
              className="p-6 rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-md transition-all duration-300 hover:border-orange-500/50 flex flex-col"
            >
              <div className="flex items-center gap-4 mb-5">
                {tutor.photo ? (
                  <img
                    src={tutor.photo}
                    alt={tutor.name}
                    className="w-16 h-16 rounded-full object-cover border border-white/10"
                  />
                ) : (
                  // Falls back to an initial rather than a broken image, so an
                  // unfilled card still looks deliberate.
                  <div
                    aria-hidden="true"
                    className="w-16 h-16 rounded-full border border-orange-500/30 bg-orange-500/10 flex items-center justify-center text-orange-500 text-xl font-bold shrink-0"
                  >
                    {initialOf(tutor.name)}
                  </div>
                )}
                <div className="min-w-0">
                  <h4 className="text-lg font-bold leading-tight">
                    {tutor.name}
                  </h4>
                  <p className="text-orange-500/80 text-xs mt-1">{tutor.role}</p>
                </div>
              </div>

              <p className="text-gray-400 text-sm leading-relaxed flex-1">
                {tutor.bio}
              </p>

              {tutor.teaches?.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-6">
                  {tutor.teaches.map((topic) => (
                    <span
                      key={topic}
                      className="px-2.5 py-1 rounded-full border border-white/10 text-[11px] text-gray-400"
                    >
                      {topic}
                    </span>
                  ))}
                </div>
              )}

              {tutor.links?.length > 0 && (
                <div className="flex flex-wrap gap-4 mt-5 pt-5 border-t border-white/10">
                  {tutor.links.map((link) => (
                    <a
                      key={link.label}
                      href={link.href}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-[12px] font-medium text-orange-500 hover:text-orange-400 transition-colors"
                    >
                      {link.label}
                      <ArrowUpRight size={13} />
                    </a>
                  ))}
                </div>
              )}
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-center mt-12"
        >
          <a
            href={BOOKING_URL}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 text-black font-bold rounded-lg px-8 py-3 text-sm transition-opacity hover:opacity-90"
            style={{ backgroundColor: "#F37D16" }}
          >
            {BOOKING_LABEL} <ArrowRight size={16} />
          </a>
          <p className="text-gray-500 text-xs mt-3">
            15 minutes, no cost, no commitment.
          </p>
        </motion.div>
      </div>
    </section>
  );
};

export default MeetYourTutor;
