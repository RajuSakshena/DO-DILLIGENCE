import { Link } from "react-router-dom";
import { Lock, Clock } from "lucide-react";
import { PARAMETERS, getParameterIcon, getCountableDocuments } from "@/lib/assessment-data";
import { motion } from "framer-motion";

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4 },
};

const descriptions: Record<string, string> = {
  legal: "Core registrations and legal standing",
  financial: "Audited records and tax compliance",
  governance: "Board structure and internal policies",
  operational: "Activity reports and impact evidence",
  strategic: "Long-term planning and vision",
  communications: "Digital presence and stakeholder trust",
};

const Overview = () => {
  return (
    <div className="pt-24 pb-16 px-6" style={{ backgroundColor: "#F8F6F1" }}>
      <div className="max-w-4xl mx-auto">
        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="font-display font-bold text-[#0B3D4A] text-2xl md:text-4xl mb-2"
        >
          Here's what we'll cover
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-[#4B5563] font-body mb-10 max-w-lg"
        >
          Your assessment spans six key areas that CSR funders generally evaluate when considering your organisation.
        </motion.p>

        <motion.div
          initial="initial"
          animate="animate"
          variants={{ animate: { transition: { staggerChildren: 0.08 } } }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-12"
        >
          {PARAMETERS.map((param) => {
            const Icon = getParameterIcon(param.iconName);

            const displayName =
              param.name === "Operational"
                ? "Operations"
                : param.name === "Strategic"
                  ? "Strategy"
                  : param.name;

            return (
              <motion.div
                key={param.id}
                variants={fadeInUp}
                className="bg-white rounded-2xl border border-[#E5E7EB] p-6 hover-scale transition-all duration-150 hover:border-[#1A6478]"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-[#E4F2F6] flex items-center justify-center">
                    <Icon size={20} className="text-[#0B3D4A]" />
                  </div>

                  <span className="px-2.5 py-0.5 rounded-full bg-[#E4F2F6] text-[#0B3D4A] text-xs font-medium">
                    {getCountableDocuments(param.documents).length} documents
                  </span>
                </div>

                <h3 className="font-display font-semibold text-[#0B3D4A] text-sm mb-1">
                  {displayName}
                </h3>

                <p className="text-xs text-[#4B5563]">
                  {descriptions[param.id]}
                </p>
              </motion.div>
            );
          })}
        </motion.div>

        <div className="flex flex-col md:flex-row items-start md:items-center gap-4 md:gap-8 mb-10 text-sm text-[#4B5563]">
          <div className="flex items-center gap-2">
            <Lock size={14} className="text-[#0B3D4A]" />
            <span>No personal data is stored without your consent</span>
          </div>

          <div className="flex items-center gap-2">
            <Clock size={14} className="text-[#0B3D4A]" />
            <span>10 minutes for most organisations</span>
          </div>
        </div>

        <Link
          to="/profile"
          className="inline-flex items-center justify-center w-full md:w-auto px-8 py-4 rounded-2xl bg-[#C4872A] text-white font-display font-bold text-base tracking-[0.02em] hover:bg-[#A8711F] transition-all duration-200"
        >
          Begin Assessment
        </Link>
      </div>
    </div>
  );
};

export default Overview;
