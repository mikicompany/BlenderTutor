import React from "react";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

const Footer = () => {
  return (
<footer className="relative z-20 bg-transparent text-white pt-24 pb-10">

  {/* Centered Content */}
  <div className="max-w-4xl mx-auto text-center px-6">
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="mb-32"
    >
      <h2 className="text-4xl md:text-5xl font-bold mb-6">
        Ready to <span className="text-orange-500">create</span>?
      </h2>

      <p className="text-gray-400 text-sm md:text-base mb-10 max-w-md mx-auto">
        Book a free 15-minute intro call and take the first step toward building something that’s truly yours. We’ll talk about your goals, your interests, and the kind of projects you’ve always wanted to bring to life—and map out a clear path forward together.

During the call, you’ll meet your mentor, ask questions, and get a feel for how the process works.

After the intro call, you’ll continue working together step by step to create your own project from start to finish—something real you can show, share, and be proud of.

Let’s turn your ideas into something tangible.

      </p>

      <motion.button
        whileHover={{ opacity: 0.9 }}
        className="text-black font-bold rounded-lg inline-flex items-center gap-2"
        style={{ backgroundColor: "#F37D16", padding: "8px 32px" }}
      >
        <a
          href="https://calendly.com/blendertutoring-info/"
          className="flex items-center"
          target="_blank"
          rel="noreferrer"
        >
          Book a free call <ArrowRight size={18} />
        </a>
      </motion.button>
    </motion.div>
  </div>

  {/* FULL WIDTH BOTTOM BAR */}
  <div className="border-t border-white/10 pt-12 px-32 flex flex-col md:flex-row justify-between items-center gap-4 text-[12px] text-gray-500">
    <p>© 2026 Blender Tutor. All rights reserved.</p>

    <div className="flex gap-6">
      <a href="#" className="hover:text-white transition-colors">
        Privacy
      </a>
      <a href="#" className="hover:text-white transition-colors">
        Terms
      </a>
    </div>
  </div>

</footer>
  );
};

export default Footer;
