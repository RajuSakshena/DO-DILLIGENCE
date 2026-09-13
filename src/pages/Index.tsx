import { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { motion, useInView } from "framer-motion";

const fadeInUp = {
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.45, ease: "easeOut" },
};

const stagger = {
  animate: { transition: { staggerChildren: 0.08 } },
};

const CountUp = ({ target, suffix = "" }: { target: number; suffix?: string }) => {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true });
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!isInView) return;
    let start = 0;
    const duration = 1200;
    const step = (timestamp: number) => {
      if (!start) start = timestamp;
      const progress = Math.min((timestamp - start) / duration, 1);
      setCount(Math.floor(progress * target));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [isInView, target]);

  return (
    <span ref={ref} className="font-display text-5xl md:text-6xl font-bold text-[#111827]">
      {count}{suffix}
    </span>
  );
};

const SwooshArrow = ({ className = "" }: { className?: string }) => (
  <svg width="90" height="70" viewBox="0 -14 90 70" fill="none" className={className} style={{ overflow: "visible", flexShrink: 0 }}>
    <path
      d="M9 40 C27 12, 57 12, 76 30"
      stroke="#C4872A"
      strokeWidth="2.5"
      strokeLinecap="round"
      fill="none"
    />
    <path d="M71 17 L76 30 L63 25" stroke="#C4872A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
  </svg>
);

const Landing = () => {
  return (
    <div className="min-h-screen">
      {/* HERO - Dark */}
      <section className="relative min-h-screen flex flex-col items-center justify-center px-6 text-center overflow-hidden" style={{ backgroundColor: "#0B3D4A" }}>
        <div className="absolute inset-0 bg-breathe" />
        <div className="absolute inset-0 grain-overlay" />

        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8 }}
          className="relative z-10 mb-8"
        >
          <img
            src="/WhiteLogo.png"
            alt="The Metropolitan Institute"
            className="w-32 md:w-36 h-auto object-contain"
          />
        </motion.div>

        <motion.h1
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.7, delay: 0.3 }}
  className="relative z-10 font-display font-bold text-white text-4xl md:text-[64px] md:leading-[1.1] max-w-3xl mb-5"
>
  Become CSR ready.
</motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.5 }}
          className="relative z-10 font-body text-[#A8CCD5] text-lg md:text-xl max-w-lg mb-8"
        >
          Know where you stand. Know what to do next.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.6 }}
          className="relative z-10 flex items-center gap-3 mb-10"
        >
          {["6 Health Area Quiz", "One Comprehensive Report"].map((text) => (
            <span key={text} className="px-4 py-2 rounded-full text-white text-sm font-medium border border-white/30 bg-white/10">
              {text}
            </span>
          ))}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.7 }}
          className="relative z-10"
        >
          <Link
            to="/overview"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-[14px] bg-[#C4872A] text-white font-display font-bold text-base tracking-[0.02em] hover:bg-[#A8711F] hover:scale-[1.02] transition-all duration-200 shadow-lg shadow-[#C4872A]/20"
            style={{ height: "52px" }}
          >
            Start Your Assessment
            <ArrowRight size={20} />
          </Link>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, y: [0, 8, 0] }}
          transition={{ opacity: { duration: 0.7, delay: 1 }, y: { duration: 1.8, repeat: Infinity, ease: "easeInOut" } }}
          className="absolute z-10 right-6 bottom-8 md:right-10 md:bottom-10 flex flex-col items-center gap-1.5 text-white/70"
        >
          <span className="font-body text-xs tracking-[0.08em] uppercase">Swipe Down</span>
          <svg width="16" height="20" viewBox="0 0 16 20" fill="none">
            <path d="M8 1 V17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            <path d="M2 12 L8 18 L14 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          </svg>
        </motion.div>
      </section>

      {/* HOW IT WORKS - Warm */}
      <section className="relative py-16 md:py-20 overflow-hidden" style={{ backgroundColor: "#FFFFFF" }}>
        <div className="absolute inset-0 grain-overlay" />
        <div className="max-w-4xl mx-auto px-6 relative z-10">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="font-display font-bold text-[#111827] text-2xl md:text-3xl text-center mb-12"
          >
            How it works
          </motion.h2>

          <motion.div
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            variants={stagger}
            className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr_auto_1fr] gap-4 md:gap-0 items-center"
          >
            {[
              { num: "1", title: "Tell us about your organisation", desc: "A quick profile to tailor the assessment" },
              { num: "2", title: "Answer questions across 6 areas", desc: "Simple yes/no for each document" },
              { num: "3", title: "Get your personalised CSR-readiness report", desc: "See exactly where you stand" },
            ].map((step, i) => (
              <>
                <motion.div key={step.num} variants={fadeInUp} className="flex flex-col items-center text-center">
                  <span className="font-mono text-[#C4872A] text-5xl font-bold mb-3">{step.num}</span>
                  <p className="text-[#111827] font-display font-semibold text-lg mb-2">{step.title}</p>
                  <p className="text-[#6B7280] font-body text-sm">{step.desc}</p>
                </motion.div>
                {i < 2 && (
                  <div key={`arrow-${i}`} className="hidden md:flex items-center justify-center px-2 overflow-visible">
                    <SwooshArrow />
                  </div>
                )}
                {i < 2 && (
                  <div key={`arrow-mobile-${i}`} className="md:hidden flex justify-center py-2 overflow-visible">
                    <SwooshArrow className="rotate-90" />
                  </div>
                )}
              </>
            ))}
          </motion.div>
        </div>
      </section>

      {/* STATS STRIP - Light */}
      <section className="py-16 md:py-20" style={{ backgroundColor: "#F8F6F1" }}>
        <div className="max-w-4xl mx-auto px-6">
          <motion.div
            variants={stagger}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center"
          >
            {[
              { value: 6, suffix: "", label: "Health Areas" },
              { value: 27, suffix: "", label: "Documents" },
              { value: 5, suffix: " min", label: "Average Time" },
            ].map((stat) => (
              <motion.div key={stat.label} variants={fadeInUp} className="flex flex-col items-center">
                <CountUp target={stat.value} suffix={stat.suffix} />
                <div className="w-12 h-0.5 bg-[#C4872A] mt-3 mb-2 rounded-full" />
                <span className="text-[#9CA3AF] font-body text-sm">{stat.label}</span>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* BUILT FOR YOU - Light — text-only two columns */}
      <section className="py-16 md:py-20" style={{ backgroundColor: "#F8F6F1" }}>
        <div className="max-w-4xl mx-auto px-6">
          <motion.div
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            variants={stagger}
            className="grid md:grid-cols-2 gap-12 items-start"
          >
            <motion.div variants={fadeInUp}>
              <h2 className="font-display font-bold text-[#111827] text-2xl md:text-3xl mb-6">
                Simple steps, easy analysis for:
              </h2>
              <ul className="space-y-4">
                {[
                  "Trusts, societies, and Section 8 companies across India",
                  "Early-stage Non-profits",
                  "Organisations preparing for CSR grants",
                ].map((text, i) => (
                  <li key={i} className="flex items-start gap-3 text-[#4B5563]">
                    <svg className="mt-1 shrink-0" width="20" height="20" viewBox="0 0 20 20" fill="none">
                      <circle cx="10" cy="10" r="10" fill="#FDF3E3" />
                      <path d="M6 10 L9 13 L14 7" stroke="#C4872A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <span className="font-body text-sm md:text-base">{text}</span>
                  </li>
                ))}
              </ul>
            </motion.div>

            <motion.div variants={fadeInUp}>
              <div className="bg-white rounded-2xl border-[1.5px] border-[#E5E7EB] p-8">
                <h3 className="font-display font-semibold text-[#0B3D4A] text-base mb-5">
                  What you get at the end
                </h3>
                <ul className="space-y-3">
                  {[
                    "A clear score across 6 health parameters",
                    "A prioritised list of documents to act on",
                    "A shareable report for your team or board",
                  ].map((text, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <span className="mt-2 w-2 h-2 rounded-sm bg-[#0B3D4A] shrink-0" />
                      <span className="font-body text-[15px] text-[#4B5563] leading-[1.7]">{text}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* CTA Section - Light */}
      <section className="py-20" style={{ backgroundColor: "#F8F6F1" }}>
        <div className="max-w-4xl mx-auto px-6 text-center">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="font-display font-bold text-[#0B3D4A] text-2xl md:text-4xl mb-6"
          >
            Enough about us, a lot about you!
          </motion.h2>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
          >
            <Link
              to="/overview"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-[14px] bg-[#C4872A] text-white font-display font-bold text-lg tracking-[0.02em] hover:bg-[#A8711F] transition-all duration-200"
            >
              Start Your Assessment
              <ArrowRight size={20} />
            </Link>
          </motion.div>
          
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#E5E7EB] py-6" style={{ backgroundColor: "#F8F6F1" }}>
        <div className="max-w-4xl mx-auto px-6 flex items-center justify-between text-xs text-[#9CA3AF]">
          <div className="flex items-center gap-2">
            <img
              src="/TransparentIcon.png"
              alt="The Metropolitan Institute"
              className="w-6 h-6 object-contain"
            />
            <span>An Initiative by The Metropolitan Institute</span>
          </div>
          <a
            href="https://themetropolitaninstitute.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-[#111827] transition-colors"
          >
            About Us
          </a>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
