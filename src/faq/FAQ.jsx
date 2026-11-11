import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { BOOKING_URL, BOOKING_LABEL } from "../lib/links";

// Objection-handling FAQ, placed right after the pricing. These answer the
// exact doubts that stop someone booking the free call — kept honest and
// specific to what the tutoring actually is (a free 15-minute intro call,
// 1:1, no subscription).
const FAQS = [
  {
    q: "I'm a total beginner — is this for me?",
    a: "Absolutely. Most students start unsure of themselves, whether they've never opened Blender or they're stuck after the donut. Lessons meet you exactly where you are and build from what you can already do — nothing is assumed.",
  },
  {
    q: "What if I use Maya, ZBrush, or another program?",
    a: "That's common, and welcome. The fundamentals carry straight across, and I work with artists switching into Blender all the time. We can focus on Blender itself or on fitting it into a pipeline you already know.",
  },
  {
    q: "How much time does it take? How often do we meet?",
    a: "Entirely up to you. Book a single session when you're stuck, or come back regularly — it's one-to-one and fits around a job or studies. No subscription and no lock-in.",
  },
  {
    q: "What actually happens on the free call?",
    a: "It's a free 15-minute call with no commitment. You share your screen, show me what you're working on or where you're stuck, and we figure out whether 1:1 tutoring is a good fit and what to focus on first.",
  },
  {
    q: "What can you help me with?",
    a: "Modeling, sculpting, hard-surface, texturing and UVs, game-art and the full Blender-to-engine pipeline, performance, and honest portfolio feedback. Bring a specific problem or a general goal — both work.",
  },
  {
    q: "Do I need an expensive computer or paid software?",
    a: "No. Blender is free and open-source, and runs fine on modest hardware. If you can run Blender, you're ready — just have it installed before the session.",
  },
];

const FAQ = () => {
  const [open, setOpen] = useState(0);

  return (
    <section className="py-20 px-6 bg-transparent text-white relative">
      <div className="max-w-3xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-10"
        >
          <p className="text-orange-400 text-[10px] font-bold tracking-[0.3em] uppercase mb-2">
            Questions?
          </p>
          <h2 className="text-3xl md:text-4xl font-black tracking-tight">
            Before you book
          </h2>
        </motion.div>

        <div className="divide-y divide-white/10 border-t border-b border-white/10">
          {FAQS.map((item, i) => {
            const isOpen = open === i;
            return (
              <div key={item.q}>
                <h3>
                  <button
                    type="button"
                    onClick={() => setOpen(isOpen ? -1 : i)}
                    aria-expanded={isOpen}
                    className="w-full flex items-center justify-between gap-4 py-5 text-left group"
                  >
                    <span
                      className={`text-[15px] md:text-base font-semibold transition-colors ${
                        isOpen ? "text-orange-400" : "text-white group-hover:text-orange-300"
                      }`}
                    >
                      {item.q}
                    </span>
                    <ChevronDown
                      size={20}
                      className={`shrink-0 text-gray-400 transition-transform duration-300 ${
                        isOpen ? "rotate-180 text-orange-400" : ""
                      }`}
                    />
                  </button>
                </h3>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.28, ease: "easeInOut" }}
                      className="overflow-hidden"
                    >
                      <p className="text-gray-300 text-[14.5px] leading-relaxed pb-5 pr-8">
                        {item.a}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>

        {/* Soft CTA — the whole section exists to get them here. */}
        <div className="text-center mt-10">
          <p className="text-gray-400 text-sm mb-4">
            Still not sure? That&apos;s exactly what the free call is for.
          </p>
          <a
            href={BOOKING_URL}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center rounded-full bg-orange-500 hover:bg-orange-400 text-black font-bold px-7 py-3 text-sm transition-colors"
          >
            {BOOKING_LABEL}
          </a>
        </div>
      </div>
    </section>
  );
};

export default FAQ;
