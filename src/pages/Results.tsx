import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { CheckCircle, XCircle, Compass, ShieldCheck, ShieldAlert, TrendingUp, TriangleAlert } from "lucide-react";
import { useAssessment } from "@/store/assessment-context";
import { getParameterIcon } from "@/lib/assessment-data";
import { getPriorityActions } from "@/lib/scoring";
import { motion, AnimatePresence } from "framer-motion";

const priorityColors: Record<string, { border: string; bg: string; text: string }> = {
  Critical: { border: "border-l-[#B91C1C]", bg: "bg-[#FFF5F5]", text: "text-[#B91C1C]" },
  Standard: { border: "border-l-[#B45309]", bg: "bg-[#FFFBF0]", text: "text-[#B45309]" },
  Growth: { border: "border-l-[#15803D]", bg: "bg-[#F0FDF4]", text: "text-[#15803D]" },
};

// SWOT card colour/icon configuration
const swotConfig = {
  strengths: {
    title: "Strengths",
    Icon: ShieldCheck,
    bg: "#DFF3F2",
    itemBg: "#CDEEEC",
    border: "#14B8A6",
    iconColor: "#15803D",
  },
  weaknesses: {
    title: "Weaknesses",
    Icon: ShieldAlert,
    bg: "#FFE8D8",
    itemBg: "#FFDBC2",
    border: "#F97316",
    iconColor: "#F97316",
  },
  opportunities: {
    title: "Opportunities",
    Icon: TrendingUp,
    bg: "#E8F7D7",
    itemBg: "#D9F1C0",
    border: "#22C55E",
    iconColor: "#22C55E",
  },
  threats: {
    title: "Threats",
    Icon: TriangleAlert,
    bg: "#FFE3E3",
    itemBg: "#FFD1D1",
    border: "#EF4444",
    iconColor: "#EF4444",
  },
} as const;

const Results = () => {
  const navigate = useNavigate();
  const { answers, orgProfile, getFilteredParams } = useAssessment();
  const [openSection, setOpenSection] = useState<string | null>(null);
  const filteredParams = getFilteredParams();

  const hasAnswers = Object.values(answers).some((answer) => answer !== null);
  if (!hasAnswers) {
    return (
      <div className="pt-24 pb-16 px-6 min-h-screen flex items-center justify-center" style={{ backgroundColor: "#F8F6F1" }}>
        <div className="bg-white rounded-2xl border border-[#E5E7EB] p-8 text-center max-w-md">
          <Compass size={40} className="text-[#C4872A] mx-auto mb-4" />
          <h2 className="font-display font-bold text-[#111827] text-xl mb-2">No results yet</h2>
          <p className="text-[#4B5563] text-sm mb-6">Complete all 6 sections to see your funding-readiness report.</p>
          <button
            onClick={() => navigate("/")}
            className="px-6 py-3 rounded-xl bg-[#C4872A] text-white font-display font-semibold text-sm hover:bg-[#A8711F] transition-all"
          >
            Start Assessment
          </button>
        </div>
      </div>
    );
  }

  const toggleSection = (id: string) => {
    setOpenSection(openSection === id ? null : id);
  };

  // Colour logic:
  // RED   -> any mandatory document incomplete
  // AMBER -> all mandatory complete, optional documents still pending
  // GREEN -> both mandatory and optional complete
  const getSectionStatus = (paramId: string) => {
    const param = filteredParams.find((p) => p.id === paramId)!;
    const applicableDocs = param.documents;
    const mandatoryDocs = applicableDocs.filter((d) => d.category === "mandatory");
    const nonMandatoryDocs = applicableDocs.filter((d) => d.category !== "mandatory");
    const hasMandatoryNo = mandatoryDocs.some((d) => answers[d.id] === "no");
    const allMandatoryYes = mandatoryDocs.length === 0 || mandatoryDocs.every((d) => answers[d.id] === "yes");
    const allNonMandatoryYes = nonMandatoryDocs.length === 0 || nonMandatoryDocs.every((d) => answers[d.id] === "yes");

    if (mandatoryDocs.length > 0 && hasMandatoryNo) {
      return { color: "#B91C1C", bgTint: "bg-[#FFF5F5]" };
    }
    if (allMandatoryYes && !allNonMandatoryYes) {
      return { color: "#D97706", bgTint: "bg-[#FFFBF0]" };
    }
    return { color: "#15803D", bgTint: "bg-[#F0FDF4]" };
  };

  // Highest-priority open action for a section, so priority stays visible even when collapsed
  const getSectionPriority = (param: any, actions: any[]) => {
    const docPriorities = param.documents
      .map((doc: any) => actions.find((a: any) => a.docId === doc.id))
      .filter(Boolean)
      .map((a: any) => a.priority);

    if (docPriorities.includes("Critical")) return "Critical";
    if (docPriorities.includes("Standard")) return "Standard";
    if (docPriorities.includes("Growth")) return "Growth";
    return null;
  };

  const hasMandatoryNo = filteredParams.some((p) => p.documents.some((d) => d.category === "mandatory" && answers[d.id] === "no"));

  // All priority actions (used by every accordion)
  const allActions = getPriorityActions(answers, orgProfile.foreignFunds, 0, filteredParams);

  // Classifies every Health Area into exactly one SWOT bucket based on mandatory/optional
  // completion, in strict priority order: Strength -> Weakness -> Opportunity -> Threat.
  // Counts are computed once here and carried on each item so the card UI never recalculates them.
  const getSWOTCategories = () => {
    const strengths: any[] = [];
    const weaknesses: any[] = [];
    const opportunities: any[] = [];
    const threats: any[] = [];
    const debugRows: any[] = [];

    filteredParams.forEach((param) => {
      const mandatoryDocs = param.documents.filter((d) => d.category === "mandatory");
      const optionalDocs = param.documents.filter((d) => d.category !== "mandatory");

      const mandatoryTotal = mandatoryDocs.length;
      const mandatoryDone = mandatoryDocs.filter((d) => answers[d.id] === "yes").length;
      const optionalTotal = optionalDocs.length;
      const optionalDone = optionalDocs.filter((d) => answers[d.id] === "yes").length;

      // Edge case: 0 total (mandatory or optional) counts as 100% for that dimension
      const mandatoryPercent = mandatoryTotal === 0 ? 100 : (mandatoryDone / mandatoryTotal) * 100;
      const optionalPercent = optionalTotal === 0 ? 100 : (optionalDone / optionalTotal) * 100;

      const item = { param, mandatoryTotal, mandatoryDone, optionalTotal, optionalDone };

      let category: "Strength" | "Weakness" | "Opportunity" | "Threat";

      if (mandatoryPercent === 100 && optionalPercent === 100) {
        strengths.push(item);
        category = "Strength";
      } else if (mandatoryPercent < 100) {
        weaknesses.push(item);
        category = "Weakness";
      } else if (mandatoryPercent === 100 && optionalPercent >= 50 && optionalPercent < 100) {
        opportunities.push(item);
        category = "Opportunity";
      } else {
        threats.push(item);
        category = "Threat";
      }

      debugRows.push({
        "Health Area": param.name,
        "Mandatory Done": mandatoryDone,
        "Mandatory Total": mandatoryTotal,
        "Optional Done": optionalDone,
        "Optional Total": optionalTotal,
        "Mandatory %": `${Math.round(mandatoryPercent)}%`,
        "Optional %": `${Math.round(optionalPercent)}%`,
        "Assigned Category": category,
      });
    });

    if (process.env.NODE_ENV !== "production") {
      // eslint-disable-next-line no-console
      console.table(debugRows);
    }

    return { strengths, weaknesses, opportunities, threats };
  };

  const swotCategories = getSWOTCategories();

  const DonutChart = ({ percent, color }: { percent: number; color: string }) => {
    const radius = 26;
    const stroke = 6;
    const normalizedRadius = radius - stroke / 2;
    const circumference = normalizedRadius * 2 * Math.PI;
    const strokeDashoffset = circumference - (percent / 100) * circumference;

    return (
      <div className="relative w-[64px] h-[64px]">
        <svg height="64" width="64" role="img" aria-label={`Progress ${Math.round(percent)}%`}>
          <circle
            stroke="#E5E7EB"
            fill="transparent"
            strokeWidth={stroke}
            r={normalizedRadius}
            cx="32"
            cy="32"
          />
          <circle
            stroke={color}
            fill="transparent"
            strokeWidth={stroke}
            strokeDasharray={circumference + " " + circumference}
            style={{ strokeDashoffset, transition: "stroke-dashoffset 0.6s ease" }}
            strokeLinecap="round"
            r={normalizedRadius}
            cx="32"
            cy="32"
          />
        </svg>

        <div className="absolute inset-0 flex items-center justify-center text-xs font-semibold">
          {Math.round(percent)}%
        </div>
      </div>
    );
  };

  // Reusable accordion with simplified UI
  const HealthAccordion = ({ param }: { param: any }) => {
    const Icon = getParameterIcon(param.iconName);
    const isOpen = openSection === param.id;
    const status = getSectionStatus(param.id);
    const priority = getSectionPriority(param, allActions);
    const applicableDocs = param.documents;
    const mandatoryDocs = applicableDocs.filter((d: any) => d.category === "mandatory");
    const optionalDocs = applicableDocs.filter((d: any) => d.category !== "mandatory");
    const mandatoryYes = mandatoryDocs.filter((d: any) => answers[d.id] === "yes").length;
    const optionalYes = optionalDocs.filter((d: any) => answers[d.id] === "yes").length;

    // Donut percentage reflects progress across ALL applicable documents (mandatory + optional).
    // Status colour (RED/AMBER/GREEN) is unaffected and still comes from getSectionStatus.
    const completedDocuments = applicableDocs.filter((d: any) => answers[d.id] === "yes").length;
    const totalDocuments = applicableDocs.length;
    const barPercent = totalDocuments === 0 ? 0 : (completedDocuments / totalDocuments) * 100;

    return (
      <div
        className={`rounded-xl overflow-hidden border border-[#E5E7EB] border-l-4 shadow-sm transition-all duration-200 hover:shadow-md hover:scale-[1.01] ${status.bgTint}`}
        style={{ borderLeftColor: status.color }}
      >
        <button
          onClick={() => toggleSection(param.id)}
          aria-expanded={isOpen}
          className="w-full p-5 flex items-center justify-between gap-4 hover:bg-[#F8F6F1]/50 transition-colors"
        >
          <div className="flex items-center gap-4">
            <Icon size={22} style={{ color: status.color }} />
            <div>
              <div className="flex items-center gap-2 flex-wrap mb-1.5">
                <span className="font-display font-semibold text-[#0B3D4A] text-[17px]">
                  {param.name}
                </span>
                {priority && (
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium uppercase tracking-wide ${
                      (priorityColors[priority] || priorityColors.Growth).text
                    }`}
                    style={{ backgroundColor: `${status.color}15` }}
                  >
                    {priority}
                  </span>
                )}
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-x-4 gap-y-0.5 text-xs text-[#6B7280] font-body">
                <span>
                  Mandatory completed: <span className="font-semibold text-[#111827]">{mandatoryYes} / {mandatoryDocs.length}</span>
                </span>
                <span>
                  Optional completed: <span className="font-semibold text-[#111827]">{optionalYes} / {optionalDocs.length}</span>
                </span>
              </div>
            </div>
          </div>

          <DonutChart percent={barPercent} color={status.color} />
        </button>

        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="border-t border-[#E5E7EB] p-4 space-y-1">
                {applicableDocs.map((doc: any) => {
                  const docStatus = answers[doc.id];
                  const docAction = allActions.find((a: any) => a.docId === doc.id);

                  return (
                    <div key={doc.id}>
                      <div className="flex items-center gap-3 py-2 border-b border-[#F3F4F6]">
                        {docStatus === "yes" ? (
                          <CheckCircle size={16} className="text-[#15803D] shrink-0" />
                        ) : (
                          <XCircle size={16} className="text-[#B91C1C] shrink-0" />
                        )}
                        <span className="text-sm text-[#111827] font-body">{doc.name}</span>
                      </div>

                      {docAction && docStatus === "no" && (
                        <div
                          className={`ml-4 my-2 rounded-md p-3 text-xs space-y-1.5 border-l-[3px] ${
                            doc.category === "mandatory"
                              ? "bg-[#FFF5F5] border-l-[#B91C1C]"
                              : "bg-[#FFFBF0] border-l-[#D97706]"
                          }`}
                        >
                          <span
                            className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-medium uppercase tracking-wide ${
                              (priorityColors[docAction.priority] || priorityColors.Growth).text
                            }`}
                            style={{ backgroundColor: `${status.color}10` }}
                          >
                            {docAction.priority}
                          </span>
                          <p className="text-[#111827]">
                            <span className="font-medium">What to do:</span> {doc.actionStep}
                          </p>
                          <p className="text-[#6B7280]">
                            <span className="font-medium text-[#111827]">Estimated time:</span> {docAction.timeEstimate}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  return (
    <div className="min-h-screen">
      {/* Dark Header */}
      <div className="pt-16 px-6 py-8" style={{ backgroundColor: "#0B3D4A" }}>
        <div className="max-w-4xl mx-auto">
          <h1 className="font-display font-bold text-white text-xl md:text-[26px]">
            The Metropolitan Institute Assessment Platform
          </h1>
          <span className="text-white/60 text-[13px]">
            {new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
          </span>
        </div>
      </div>

      <div className="px-6 py-8" style={{ backgroundColor: "#F8F6F1" }}>
        <div className="max-w-4xl mx-auto">
          {/* SWOT Analysis Dashboard */}
          <h2 className="font-display font-bold text-[#0B3D4A] text-[22px] mb-1">SWOT Analysis</h2>
          <p className="text-sm text-[#6B7280] font-body mb-4">
            Your six health areas, grouped by how complete their mandatory and optional documentation is.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {(Object.keys(swotConfig) as Array<keyof typeof swotConfig>).map((key) => {
              const { title, Icon, bg, itemBg, border, iconColor } = swotConfig[key];
              const items = swotCategories[key];

              return (
                <div
                  key={key}
                  className="rounded-2xl border border-[#E5E7EB] border-l-4 shadow-sm p-6 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5"
                  style={{ backgroundColor: bg, borderLeftColor: border }}
                >
                  <div className="flex items-center gap-2 mb-4">
                    <Icon size={20} style={{ color: iconColor }} />
                    <h3 className="font-display font-semibold text-[#0B3D4A] text-base">{title}</h3>
                  </div>

                  {items.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {items.map(({ param }: any) => (
                        <span
                          key={param.id}
                          className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium text-[#111827] font-body transition-all hover:scale-105 hover:shadow-sm cursor-default"
                          style={{ backgroundColor: itemBg }}
                        >
                          <span style={{ color: border }}>✔</span>
                          {param.name}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-[#6B7280] font-body">No health areas in this category.</p>
                  )}
                </div>
              );
            })}
          </div>

          {/* 6 Health Areas */}
          <h2 className="font-display font-bold text-[#0B3D4A] text-[22px] mb-1">Your 6 Health Areas</h2>
          <p className="text-sm text-[#6B7280] font-body mb-6">Select any area to see your detailed status.</p>

          {/* All sections with simplified accordion */}
          <div className="space-y-4 mb-10">
            {filteredParams.map((param) => (
              <HealthAccordion key={param.id} param={param} />
            ))}
          </div>

          <div className="flex flex-col sm:flex-row gap-3 mb-4 no-print">
            <Link
              to="/share"
              className="flex-1 py-3 rounded-xl bg-[#C4872A] text-white font-display font-semibold text-sm text-center hover:bg-[#A8711F] transition-all"
            >
              Share & Export
            </Link>
            <a
              href="https://themetropolitaninstitute.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 py-3 rounded-xl border-2 border-[#0B3D4A] text-[#0B3D4A] font-display font-semibold text-sm text-center hover:bg-[#E4F2F6] transition-all"
            >
              Connect with Experts
            </a>
          </div>

          {/* CTA section with both links */}
          <div className="mb-4 no-print flex flex-col">
            {hasMandatoryNo && (
              <Link
                to="/gift"
                className="inline-flex items-center gap-1 text-sm text-[#C4872A] hover:underline font-medium transition-colors"
              >
                Claim checklists to strengthen your gaps. <span>→</span>
              </Link>
            )}
            <button
              onClick={() => navigate("/")}
              className={`inline-flex items-center gap-1 text-sm text-[#C4872A] hover:underline font-medium transition-colors ${hasMandatoryNo ? "mt-2" : ""}`}
            >
              Start assessment for a new organisation <span>→</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Results;
