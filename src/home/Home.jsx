import React from "react";
import { motion, rgba } from "framer-motion";
import hero from "../assets/hero-bg-CMX9Xi5b.mp4";
import Navbar from "../navbar/Navbar";
import Packages from "../packages/Packages";
import About from "../about/About";
import Footer from "../footer/Footer";

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
      {/* --- FIXED BACKGROUND VIDEO --- */}
      <div className="fixed inset-0 w-full h-screen z-0">
        <video
          src={hero}
          autoPlay
          muted
          loop
          className="h-full w-full object-cover"
        />
        {/* Universal Overlay to keep text readable everywhere */}
        <div className="absolute inset-0 bg-black/75 z-10" />
      </div>

      {/* --- MAIN CONTENT LAYER --- */}
      <main className="relative z-20 w-full">
        <Navbar />

        {/* HERO SECTION */}
        <section className="h-screen w-full flex flex-col items-center justify-center text-center px-6">
          <motion.div
            variants={container}
            initial="hidden"
            animate="visible"
            className="flex flex-col items-center"
          >
            <motion.h2
              variants={fadeInUp}
              className="uppercase -tracking-normal text-[14px]  mb-3"
              style={{color: '#F37D16'}}
            >
              Master Blender with Guidance
            </motion.h2>

            <motion.h1
              variants={fadeInUp}
              className="text-white text-7xl font-bold leading-tight mb-4"
              style={{fontFamily: 'JetBrains Mono, Roboto Mono '}}
            >
              <span
                className="inline-block"
                style={{ fontFamily: "'space grotesk', sans-serif", fontWeight: 700 }}
              >
                B
              </span>
              lender <br />
              <span className="text-orange-500">Tutoring.com</span>
            </motion.h1>

            <motion.p
              variants={fadeInUp}
              className="max-w-md text-gray-400 text-[20px] md:text-sm leading-relaxed mb-8"
            >
              Master the complete game art pipeline. Personalized 1-on-1
              mentoring for building high-quality, optimized game assets — from
              low-poly modeling to engine-ready exports.
            </motion.p>

            <motion.div
              variants={fadeInUp}
              className="flex flex-col md:flex-row gap-3 w-full md:w-auto"
            >
              {/* View Packages / Preview Button */}
              <button
                onClick={(e) => {
                  const element = document.querySelector("#packages");
                  if (element) {
                    const offset = 70;
                    const elementTop =
                      element.getBoundingClientRect().top + window.scrollY;
                    window.scrollTo({
                      top: elementTop - offset,
                      behavior: "smooth",
                    });
                  }
                }}
                className="w-full md:w-auto  text-md text-black rounded-2xl transition-all  hover:shadow-[0_0_15px_rgba(255,165,0,0.6)]"
                style={{backgroundColor: "#F37D16", padding: "0px 32px"}}
              >
                View Packages
              </button>

              {/* Learn More Button */}
              <button
                onClick={(e) => {
                  const element = document.querySelector("#about");
                  if (element) {
                    const offset = 70;
                    const elementTop =
                      element.getBoundingClientRect().top + window.scrollY;
                    window.scrollTo({
                      top: elementTop - offset,
                      behavior: "smooth",
                    });
                  }
                }}
                className="w-full md:w-auto px-6 py-3 text-md bg-transparent border-1 border-gray-700 text-white rounded-2xl transition-all hover:bg-orange-500 hover:text-white hover:scale-105 hover:shadow-[0_0_15px_rgba(255,165,0,0.6)]"
              >
                Learn More
              </button>
            </motion.div>
          </motion.div>
        </section>

        {/* PACKAGES SECTION */}
        {/* Note: Ensure the Packages component background is set to transparent! */}
        <section id="packages">
          <Packages />
        </section>

        <section id="about">
          <About />
        </section>

        <Footer />
      </main>
    </div>
  );
};

export default Home;
