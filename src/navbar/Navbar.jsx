import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X } from "lucide-react";

// Note: Ensure @import url('https://fonts.googleapis.com/css2?family=Arvo:wght@700&display=swap'); is in your CSS

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);

  const menuVariants = {
    closed: { opacity: 0, y: "-100%" },
    open: {
      opacity: 1,
      y: 0,
      transition: { type: "spring", stiffness: 100, damping: 20 },
    },
  };

  const navLinks = [
    { name: "Packages", href: "#packages" },
    { name: "About", href: "#about" },
  ];

  // Logic to scroll to the absolute top
  const scrollToTop = (e) => {
    e.preventDefault();
    setIsOpen(false);
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const handleScroll = (e, id) => {
    e.preventDefault();
    const element = document.querySelector(id);
    if (element) {
      setIsOpen(false);
      const offset = 70; // Matches navbar height
      const elementPosition = element.getBoundingClientRect().top + window.pageYOffset;
      const offsetPosition = elementPosition - offset;

      window.scrollTo({
        top: offsetPosition,
        behavior: "smooth",
      });
    }
  };

  return (
    <nav>
      <motion.div
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="fixed top-0 left-0 w-full z-[60] bg-[#0f1011]/80 backdrop-blur-md flex justify-between px-6 md:px-20 py-4 items-center h-[60px] border-b border-white/5"
      >
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-white cursor-pointer relative z-[70]">
          {/* Logo links to top of page */}
          <a href="#hero" onClick={scrollToTop} className="flex items-center gap-2">
            <img
              src="data:image/svg+xml,%3c?xml%20version=%271.0%27%20encoding=%27UTF-8%27?%3e%3csvg%20style=%27clip-rule:evenodd;fill-rule:evenodd;stroke-linejoin:round;stroke-miterlimit:2%27%20version=%271.1%27%20viewBox=%270%200%20181%20148%27%20xml:space=%27preserve%27%20xmlns=%27http://www.w3.org/2000/svg%27%3e%3ctitle%3eBlender%20logo%20(without%20text)%3c/title%3e%3cg%20transform=%27matrix(.281%200%200%20.281%20-41.8%20-43.7)%27%3e%3cg%20transform=%27matrix(21.6%200%200%2021.6%20-4857%207665)%27%3e%3cpath%20d=%27m243-334c0.106-1.89%201.03-3.56%202.43-4.74%201.37-1.16%203.21-1.87%205.23-1.87%202.01%200%203.85%200.709%205.22%201.87%201.4%201.18%202.32%202.85%202.43%204.74%200.106%201.94-0.675%203.75-2.04%205.09-1.4%201.36-3.38%202.22-5.61%202.22s-4.22-0.854-5.61-2.22c-1.37-1.34-2.15-3.14-2.04-5.08z%27%20style=%27fill-rule:nonzero;fill:%23fff%27/%3e%3c/g%3e%3cg%20transform=%27matrix(11.1%200%200%2011.1%20-2215%204153)%27%3e%3cpath%20d=%27m243-334c0.106-1.89%201.03-3.56%202.43-4.74%201.37-1.16%203.21-1.87%205.23-1.87%202.01%200%203.85%200.709%205.22%201.87%201.4%201.18%202.32%202.85%202.43%204.74%200.106%201.94-0.675%203.75-2.04%205.09-1.4%201.36-3.38%202.22-5.61%202.22s-4.22-0.854-5.61-2.22c-1.37-1.34-2.15-3.14-2.04-5.08z%27%20style=%27fill-rule:nonzero;fill:%23265787%27/%3e%3cpath%20d=%27m231-330c0.013%200.74%200.249%202.18%200.603%203.3%200.744%202.38%202.01%204.58%203.76%206.51%201.8%201.99%204.02%203.59%206.58%204.73%202.69%201.19%205.61%201.8%208.64%201.8%203.03-4e-3%205.95-0.624%208.64-1.83%202.56-1.15%204.78-2.75%206.58-4.75%201.76-1.95%203.02-4.15%203.76-6.53%200.375-1.2%200.612-2.42%200.707-3.64%200.093-1.2%200.054-2.41-0.117-3.62-0.334-2.35-1.15-4.56-2.4-6.56-1.14-1.85-2.62-3.46-4.38-4.82l4e-3%20-3e-3%20-17.7-13.6c-0.016-0.012-0.029-0.025-0.046-0.036-1.16-0.892-3.12-0.889-4.39%205e-3%20-1.29%200.904-1.44%202.4-0.29%203.34l-5e-3%205e-3%207.39%206.01-22.5%200.024h-0.03c-1.86%202e-3%20-3.65%201.22-4%202.77-0.364%201.57%200.9%202.88%202.84%202.88l-3e-3%207e-3%2011.4-0.022-20.4%2015.6c-0.026%200.019-0.054%200.039-0.078%200.058-1.92%201.47-2.54%203.92-1.33%205.46%201.23%201.57%203.84%201.58%205.78%209e-3l11.1-9.1s-0.162%201.23-0.149%201.96zm28.6%204.11c-2.29%202.33-5.5%203.66-8.96%203.66-3.47%206e-3%20-6.68-1.3-8.97-3.63-1.12-1.14-1.94-2.44-2.45-3.83-0.497-1.37-0.69-2.82-0.562-4.28%200.121-1.43%200.547-2.8%201.23-4.03%200.668-1.21%201.59-2.31%202.72-3.24%202.23-1.81%205.06-2.8%208.02-2.8%202.97-4e-3%205.8%200.969%208.03%202.78%201.13%200.924%202.05%202.02%202.72%203.23%200.683%201.23%201.11%202.59%201.23%204.03%200.126%201.46-0.067%202.91-0.564%204.28-0.508%201.4-1.33%202.7-2.45%203.84z%27%20style=%27fill-rule:nonzero;fill:%23ea7600%27/%3e%3c/g%3e%3c/g%3e%3c/svg%3e" // Your Blender SVG
              alt="Blender Logo"
              className="w-6 h-6"
            />
            <span className="flex items-baseline" style={{fontSize: "20px"}}>
              <span
                className="mr-[1px]"
                style={{ fontFamily: "'space grotesk', serif", fontWeight: 700, fontSize: "20px", color: "#F37D16" }}
              >
                B
              </span>
              lender Tutor
            </span>
          </a>
        </h1>

        {/* Desktop Links */}
        <div className="hidden lg:flex gap-8 items-center">
          <ul className="flex gap-8">
            {navLinks.map((link) => (
              <li key={link.name} className="text-gray-400 hover:text-white transition-colors text-[14px] font-medium">
                <a href={link.href} onClick={(e) => handleScroll(e, link.href)}>
                  {link.name}
                </a>
              </li>
            ))}
          </ul>
          <button className="px-5 py-2 rounded-full text-sm font-bold cursor-pointer hover:bg-orange-600 text-black transition-all"
          style={{backgroundColor: '#F37D16'}}
          >
           <a href="https://calendly.com/mikibutler" className="flex items-center" target="_blank" rel="noreferrer">Book a call </a>
          </button>
        </div>

        {/* Mobile/Tablet Toggle */}
        <div className="lg:hidden flex items-center gap-4 relative z-[70]">
          <button className="px-4 py-1.5 rounded-full text-xs font-bold cursor-pointer text-black md:flex hidden"
          style={{backgroundColor: '#F37D16'}}
          >
            Book a call
          </button>
          <button onClick={() => setIsOpen(!isOpen)} className="text-white p-2 hover:bg-white/5 rounded-lg">
            {isOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </motion.div>

      {/* Mobile Menu Popup */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            variants={menuVariants}
            initial="closed"
            animate="open"
            exit="closed"
            className="fixed inset-0 h-[280px] w-full bg-[#0f1011] z-[50] flex flex-col items-start pt-[85px] pl-8 border-b border-white/10 shadow-2xl"
          >
            <ul className="flex flex-col gap-6 mb-6">
              {navLinks.map((link) => (
                <motion.li key={link.name} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}>
                  <a
                    href={link.href}
                    onClick={(e) => handleScroll(e, link.href)}
                    className="text-gray-400 text-lg font-bold hover:text-orange-500 transition-colors"
                  >
                    {link.name}
                  </a>
                </motion.li>
              ))}
            </ul>
            <button className="px-6 py-2 rounded-full text-md font-bold bg-orange-500 text-black">
              Book a call
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

export default Navbar;