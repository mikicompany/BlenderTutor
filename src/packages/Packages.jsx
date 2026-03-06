import React from "react";
import { motion } from "framer-motion";
import { Check } from "lucide-react"; // npm install lucide-react

const packages = [
  {
    name: "Starter",
    price: "49",
    period: "per session",
    description: "Perfect for beginners looking to learn fundamentals.",
    features: [
      "1-hour live session",
      "Asset workflow overview",
      "Low-poly basics",
      "Session recording",
    ],
    highlighted: false,
  },
  {
    name: "Pro",
    price: "179",
    period: "per month",
    description: "For serious learners ready to master the pipeline.",
    features: [
      "4 sessions per month",
      "Custom art roadmap",
      "Project-based creation",
      "Asset feedback",
      "Discord access",
    ],
    highlighted: true,
  },
  {
    name: "Studio",
    price: "399",
    period: "per month",
    description: "Full mentorship for aspiring professionals.",
    features: [
      "8 sessions per month",
      "Portfolio development",
      "Pipeline training",
      "Priority scheduling",
      "Career guidance",
      "Async Q&A",
    ],
    highlighted: false,
  },
];

const Packages = () => {
  return (
    <section className="py-16 px-6 text-white">
      
      <div className="max-w-5xl mx-auto">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          
          <h2 className="text-orange-500 uppercase tracking-[0.3em] text-[10px] font-bold mb-2">
            Packages
          </h2>
          <h3 className="text-3xl font-bold">
            Choose your <span className="text-orange-500">path</span>
          </h3>
        </motion.div>
        {/* Pricing Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {packages.map((pkg, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1, duration: 0.5 }}
              className={`relative p-6 rounded-xl border ${
                pkg.highlighted
                  ? "border-orange-500/50 bg-orange-500/5"
                  : "border-white/5 bg-white/[0.03]"
              } flex flex-col`}
            >
            
              {pkg.highlighted && (
                <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-orange-500 text-black text-[9px] font-black uppercase px-3 py-0.5 rounded-full">
                  Most Popular{" "}
                </span>
              )}
              <h4 className="text-lg font-bold mb-1">{pkg.name}</h4>
              <p className="text-gray-500 text-xs mb-5 leading-relaxed">
                {pkg.description}
              </p>
              <div className="mb-6">
                
                <span className="text-3xl font-bold text-orange-500">
                  ${pkg.price}
                </span>
                <span className="text-gray-600 text-[10px] ml-1">
                  /{pkg.period}
                </span>
              </div>
              <ul className="space-y-3 mb-8 flex-1">
                
                {pkg.features.map((feature, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2 text-[13px] text-gray-400"
                  >
                    
                    <Check className="text-orange-500 w-3.5 h-3.5 mt-0.5" />
                    {feature}
                  </li>
                ))}
              </ul>
              <button
                className={`w-full py-2.5 rounded-lg text-xs font-bold transition-all ${
                  pkg.highlighted
                    ? "bg-orange-500 text-black hover:bg-orange-600"
                    : "bg-white/5 border border-white/10 hover:bg-white/10 text-white"
                }`}
              >
                Get Started
              </button>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Packages;
