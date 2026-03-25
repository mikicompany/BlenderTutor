import React from "react";
import { motion } from "framer-motion";
import { Box, Gamepad2, Film, Zap } from "lucide-react"; // npm install lucide-react

const About = () => {
  const specializations = [
    {
      title: "Game Assets",
      desc: "Characters, props & environment art",
      icon: <Gamepad2 size={20} />,
    },
    {
      title: "3D Modeling",
      desc: "Low-poly to high-poly workflows",
      icon: <Box size={20} />,
    },
    {
      title: "Animation",
      desc: "Game-ready rigging & motion",
      icon: <Film size={20} />,
    },
    {
      title: "Real-Time",
      desc: "EEVEE, baking & optimization",
      icon: <Zap size={20} />,
    },
  ];

  const software = [
    {
      name: "Blender",
      logo: "data:image/svg+xml,%3c?xml%20version=%271.0%27%20encoding=%27UTF-8%27?%3e%3csvg%20style=%27clip-rule:evenodd;fill-rule:evenodd;stroke-linejoin:round;stroke-miterlimit:2%27%20version=%271.1%27%20viewBox=%270%200%20181%20148%27%20xml:space=%27preserve%27%20xmlns=%27http://www.w3.org/2000/svg%27%3e%3ctitle%3eBlender%20logo%20(without%20text)%3c/title%3e%3cg%20transform=%27matrix(.281%200%200%20.281%20-41.8%20-43.7)%27%3e%3cg%20transform=%27matrix(21.6%200%200%2021.6%20-4857%207665)%27%3e%3cpath%20d=%27m243-334c0.106-1.89%201.03-3.56%202.43-4.74%201.37-1.16%203.21-1.87%205.23-1.87%202.01%200%203.85%200.709%205.22%201.87%201.4%201.18%202.32%202.85%202.43%204.74%200.106%201.94-0.675%203.75-2.04%205.09-1.4%201.36-3.38%202.22-5.61%202.22s-4.22-0.854-5.61-2.22c-1.37-1.34-2.15-3.14-2.04-5.08z%27%20style=%27fill-rule:nonzero;fill:%23fff%27/%3e%3c/g%3e%3cg%20transform=%27matrix(11.1%200%200%2011.1%20-2215%204153)%27%3e%3cpath%20d=%27m243-334c0.106-1.89%201.03-3.56%202.43-4.74%201.37-1.16%203.21-1.87%205.23-1.87%202.01%200%203.85%200.709%205.22%201.87%201.4%201.18%202.32%202.85%202.43%204.74%200.106%201.94-0.675%203.75-2.04%205.09-1.4%201.36-3.38%202.22-5.61%202.22s-4.22-0.854-5.61-2.22c-1.37-1.34-2.15-3.14-2.04-5.08z%27%20style=%27fill-rule:nonzero;fill:%23265787%27/%3e%3cpath%20d=%27m231-330c0.013%200.74%200.249%202.18%200.603%203.3%200.744%202.38%202.01%204.58%203.76%206.51%201.8%201.99%204.02%203.59%206.58%204.73%202.69%201.19%205.61%201.8%208.64%201.8%203.03-4e-3%205.95-0.624%208.64-1.83%202.56-1.15%204.78-2.75%206.58-4.75%201.76-1.95%203.02-4.15%203.76-6.53%200.375-1.2%200.612-2.42%200.707-3.64%200.093-1.2%200.054-2.41-0.117-3.62-0.334-2.35-1.15-4.56-2.4-6.56-1.14-1.85-2.62-3.46-4.38-4.82l4e-3%20-3e-3%20-17.7-13.6c-0.016-0.012-0.029-0.025-0.046-0.036-1.16-0.892-3.12-0.889-4.39%205e-3%20-1.29%200.904-1.44%202.4-0.29%203.34l-5e-3%205e-3%207.39%206.01-22.5%200.024h-0.03c-1.86%202e-3%20-3.65%201.22-4%202.77-0.364%201.57%200.9%202.88%202.84%202.88l-3e-3%207e-3%2011.4-0.022-20.4%2015.6c-0.026%200.019-0.054%200.039-0.078%200.058-1.92%201.47-2.54%203.92-1.33%205.46%201.23%201.57%203.84%201.58%205.78%209e-3l11.1-9.1s-0.162%201.23-0.149%201.96zm28.6%204.11c-2.29%202.33-5.5%203.66-8.96%203.66-3.47%206e-3%20-6.68-1.3-8.97-3.63-1.12-1.14-1.94-2.44-2.45-3.83-0.497-1.37-0.69-2.82-0.562-4.28%200.121-1.43%200.547-2.8%201.23-4.03%200.668-1.21%201.59-2.31%202.72-3.24%202.23-1.81%205.06-2.8%208.02-2.8%202.97-4e-3%205.8%200.969%208.03%202.78%201.13%200.924%202.05%202.02%202.72%203.23%200.683%201.23%201.11%202.59%201.23%204.03%200.126%201.46-0.067%202.91-0.564%204.28-0.508%201.4-1.33%202.7-2.45%203.84z%27%20style=%27fill-rule:nonzero;fill:%23ea7600%27/%3e%3c/g%3e%3c/g%3e%3c/svg%3e",
    },
    {
      name: "Unreal",
      logo: "https://github.com/mikicompany/BlenderTutor/blob/main/docs/assets/logos/unreal.png",
    },
    {
      name: "Unity",
      logo: "data:image/svg+xml,%3csvg%20xmlns='https://github.com/mikicompany/BlenderTutor/blob/main/docs/assets/logos/unity_logo.png'%20width='275'%20height='100'%3e%3cpath%20fill='%23110b09'%20d='M%2082.775,79.842%2064.9,49.775%2082.775,19.708%2091.392,49.775%20Z%20M%2042.992,76.908%2020.533,54.633%20h%2035.75%20L%2074.158,84.7%20Z%20m%200,-54.358%2031.075,-7.792%20-17.875,30.067%20H%2020.442%20Z%20M%2088.642,0%2048.033,10.542%2041.983,20.9%2029.792,20.808%200,49.775%2029.792,78.742%2041.983,78.65%2048.033,89.008%2088.642,99.642%2099.55,60.133%2093.408,49.867%2099.55,39.6%20Z'/%3e%3c/svg%3e",
    },
    {
      name: "Godot",
      logo: "https://blender-buddy-hub.lovable.app/assets/godot-logo-9wp0wbH6.svg",
    },
  ];

  return (
    <section className="py-24 px-6 bg-transparent text-white relative">
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
        {/* LEFT CONTENT */}
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          className="space-y-6"
        >
          <h2 className="text-orange-500 uppercase tracking-[0.3em] text-[10px] font-bold">
            About
          </h2>
          <h1 className="text-4xl md:text-5xl font-bold leading-tight">
            Specialized in <span className="text-orange-500">game dev</span>
          </h1>
          <p className="text-gray-400 text-sm md:text-base leading-relaxed max-w-md">
            We live and breathe game development with Blender. From stylized
            mobile characters to AAA-quality environment art, our mentoring is
            built around real game production pipelines — Unity, Unreal, Godot,
            you name it. <br />
            <br /> Whether you're building your first indie game or preparing
            assets for a studio, we'll teach you the exact workflows,
            optimization tricks, and art direction techniques that ship games —
            not just pretty renders.
          </p>

          {/* Software Badges */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-6"
          style={{ backgroundColor: "1A1D23" }}>
            {software.map((tech, i) => (
              <span
                key={tech.name}
                className={`px-2 py-2 rounded-lg border border-white/10 text-[14px] font-medium flex items-center gap-2
                ${i === 3 ? "lg:col-start-1" : ""}`}
              >
                <img
                  src={tech.logo}
                  alt={tech.name}
                  className="w-6 h-6 object-contain"
                />
                {tech.name}
              </span>
            ))}
          </div>
        </motion.div>

        {/* RIGHT GRID */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {specializations.map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              whileHover={{ scale: 1.02 }}
              className="group relative p-6 rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-md transition-all duration-300 hover:border-orange-500/50 hover:shadow-[0_0_20px_rgba(249,115,22,0.1)]"
            >
              <div className="text-orange-500 mb-4 group-hover:scale-110 transition-transform duration-300">
                {item.icon}
              </div>
              <h4 className="text-lg font-bold mb-1">{item.title}</h4>
              <p className="text-gray-500 text-xs leading-relaxed">
                {item.desc}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default About;
