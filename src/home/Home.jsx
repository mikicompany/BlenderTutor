import React from "react";
import { Helmet } from "react-helmet-async";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import hero from "../assets/hero-bg-CMX9Xi5b.mp4";
import heroWebm from "../assets/hero-bg.webm";
import Navbar from "../navbar/Navbar";
import Packages from "../packages/Packages";
import About from "../about/About";
import MeetYourTutor from "../tutors/MeetYourTutor";
import WorkCarousel from "../work/WorkCarousel";
import Footer from "../footer/Footer";
import { BOOKING_URL, BOOKING_LABEL } from "../lib/links";

// Shared by the hero buttons so the fixed navbar does not cover the heading
// of whichever section is scrolled to.
const scrollToSection = (selector) => {
  const element = document.querySelector(selector);
  if (!element) return;
  const top = element.getBoundingClientRect().top + window.scrollY - 70;
  window.scrollTo({ top, behavior: "smooth" });
};

const Home = () => {
  const fadeInUp = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.8, ease: "easeOut" },
    },
  };

  const container = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.2 },
    },
  };

  return (
    <div className="relative w-full">
      {/* Every route sets its own head tags through Helmet, so index.html can
          stay free of static copies that would otherwise duplicate them. */}
      <Helmet>
        <title>BlenderTutor – Blender Online Tutoring</title>
        <meta
          name="description"
          content="Get Blender online tutoring. Learn modeling, sculpting, animation, shading, and rendering with beginner-friendly lessons and personalized teaching."
        />
        <link rel="canonical" href="https://www.blendertutoring.com/" />
        <meta property="og:title" content="BlenderTutor – Blender Online Tutoring" />
        <meta
          property="og:description"
          content="Blender tutorials and personalized online tutoring. Learn 3D modeling, sculpting, animation and more — beginner friendly."
        />
        <meta property="og:url" content="https://www.blendertutoring.com/" />
        <meta property="og:type" content="website" />
        <meta property="og:image" content="https://www.blendertutoring.com/og-image.png" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="BlenderTutor – Blender 3D Tutorials & Online Tutoring" />
        <meta
          name="twitter:description"
          content="Blender tutorials and personalized online tutoring. Learn 3D modeling, sculpting, animation and more — beginner friendly."
        />
        <meta name="twitter:image" content="https://www.blendertutoring.com/og-image.png" />
      </Helmet>

      {/* --- FIXED BACKGROUND VIDEO --- */}
      <div className="fixed inset-0 w-full h-screen z-0">
        <video
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          className="h-full w-full object-cover"
        >
          <source src={heroWebm} type="video/webm" />
          <source src={hero} type="video/mp4" />
        </video>
        {/* Universal Overlay to keep text readable everywhere */}
        <div className="absolute inset-0 bg-black/75 z-10" />
      </div>

      {/* --- MAIN CONTENT LAYER --- */}
      <main className="relative z-20 w-full">
        <Navbar />

        {/* HERO SECTION — the id also gives the navbar logo's #hero link a
            real target, and lets click tracking name this section. */}
        <section id="hero" className="h-screen w-full flex flex-col items-center justify-center text-center px-6">
          <motion.div
            variants={container}
            initial="hidden"
            animate="visible"
            className="flex flex-col items-center"
          >
            <motion.h2
              variants={fadeInUp}
              className="uppercase tracking-[0.2em] text-[11px] md:text-[12px] mb-4 font-bold"
              style={{color: '#F37D16'}}
            >
              1-on-1 Blender Tutoring
            </motion.h2>

            {/* The promise leads. The brand is already in the navbar, the tab
                title and the logo, so the biggest text on the page is better
                spent on what a visitor actually gets. "Blender" stays in the
                h1 so the page keeps its main keyword. */}
            <motion.h1
              variants={fadeInUp}
              className="text-white text-4xl md:text-6xl font-bold leading-[1.1] mb-6 max-w-3xl"
            >
              Master the complete{" "}
              <span className="text-orange-500">Blender game art pipeline</span>
            </motion.h1>

            <motion.p
              variants={fadeInUp}
              className="max-w-xl text-gray-300 text-base md:text-lg leading-relaxed mb-10"
            >
              Personalized mentoring for building high-quality, optimized game
              assets — from low-poly modeling to engine-ready exports. Taught
              live, one student at a time.
            </motion.p>

            <motion.div
              variants={fadeInUp}
              className="flex flex-col md:flex-row gap-3 w-full md:w-auto items-center"
            >
              {/* The free call is the only conversion on the site, so it is the
                  primary action here rather than the pricing table. */}
              <a
                href={BOOKING_URL}
                target="_blank"
                rel="noreferrer"
                className="w-full md:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 text-[15px] font-bold text-black rounded-xl transition-all hover:shadow-[0_0_20px_rgba(255,165,0,0.5)]"
                style={{ backgroundColor: "#F37D16" }}
              >
                {BOOKING_LABEL} <ArrowRight size={18} />
              </a>

              <button
                onClick={() => scrollToSection("#about")}
                className="w-full md:w-auto px-7 py-3.5 text-[15px] bg-transparent border border-gray-700 text-white rounded-xl transition-all hover:border-orange-500/60 hover:text-orange-400"
              >
                How it works
              </button>
            </motion.div>

            <motion.p
              variants={fadeInUp}
              className="text-gray-500 text-xs mt-5"
            >
              15 minutes · No cost · No commitment
            </motion.p>
          </motion.div>
        </section>

        {/* Order matters here: what you get, then who teaches it, then what it
            costs. Pricing used to sit directly under the hero, which asked
            visitors to judge the price before they knew what they were buying. */}
        <section id="about">
          <About />
        </section>

        <section id="tutors">
          <MeetYourTutor />
        </section>

        {/* Directly after the tutor, where it backs up who they just read
            about rather than floating as a separate credential. */}
        <section id="work">
          <WorkCarousel />
        </section>

        {/* Note: Ensure the Packages component background is set to transparent! */}
        <section id="packages">
          <Packages />
        </section>

        <Footer />
      </main>
    </div>
  );
};

export default Home;
