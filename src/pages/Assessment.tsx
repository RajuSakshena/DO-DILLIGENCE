import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { CheckCircle, XCircle, Save } from "lucide-react";
import { SECTION_ORDER, getParameterIcon } from "@/lib/assessment-data";
import { useAssessment } from "@/store/assessment-context";
import QuestionCard from "@/components/QuestionCard";
import JourneyProgressBar from "@/components/JourneyProgressBar";
import TooltipTour from "@/components/TooltipTour";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

const Assessment = () => {
  const { sectionId } = useParams<{ sectionId: string }>();
  const navigate = useNavigate();
  const { answers, setAnswer, setCurrentSectionIndex,
    isSectionComplete, isSectionUnlocked, markSectionComplete, getFilteredParams,
    saveProgress } = useAssessment();

  const sectionIndex = SECTION_ORDER.indexOf(sectionId || "legal");
  const filteredParams = getFilteredParams();
  const param = filteredParams.find((p) => p.id === sectionId);

  const [showSummary, setShowSummary] = useState(false);
  const [showSaveDraft, setShowSaveDraft] = useState(false);
  const [sectionJustCompleted, setSectionJustCompleted] = useState(false);
  const [unansweredPulse, setUnansweredPulse] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);

  useEffect(() => {
    if (sectionIndex >= 0) setCurrentSectionIndex(sectionIndex);
    setShowSummary(false);
    setSectionJustCompleted(false);
    setUnansweredPulse(false);
  }, [sectionId, sectionIndex, setCurrentSectionIndex]);

  const applicableDocs = useMemo(() => {
    if (!param) return [];
    return param.documents;
  }, [param]);

  const allAnswered = applicableDocs.every((d) => answers[d.id] != null);

  useEffect(() => {
    if (allAnswered && applicableDocs.length > 0 && !sectionJustCompleted) {
      setSectionJustCompleted(true);
      if (sectionId) markSectionComplete(sectionId);
      toast.success(`${param?.name} done. One step closer to your results.`, { duration: 2500 });
    }
  }, [allAnswered, applicableDocs.length, sectionJustCompleted, sectionId, param?.name, markSectionComplete]);

  if (!param || !isSectionUnlocked(sectionId || "")) {
    navigate("/assessment/" + SECTION_ORDER[0]);
    return null;
  }

  const Icon = getParameterIcon(param.iconName);
  const isLast = sectionIndex === SECTION_ORDER.length - 1;
  const nextSection = !isLast ? SECTION_ORDER[sectionIndex + 1] : null;

  const handleProceed = () => {
    if (!allAnswered) {
      setUnansweredPulse(true);
      setTimeout(() => setUnansweredPulse(false), 1500);
      const firstUnanswered = applicableDocs.find((d) => answers[d.id] == null);
      if (firstUnanswered) {
        const el = document.getElementById(`card-${firstUnanswered.id}`);
        el?.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      toast.error("Please answer all required questions to continue.");
      return;
    }
    setShowSummary(true);
  };

  const handleConfirmAndContinue = () => {
    setShowSummary(false);
    if (isLast) {
      navigate("/results");
    } else {
      navigate(`/assessment/${nextSection}`);
    }
  };

  const handleSaveDraft = async () => {
    if (isSavingDraft) return;
    setIsSavingDraft(true);
    try {
      const result = await saveProgress();
      if (!result.success) {
        if (result.reason === "missing-org") {
          toast.error("Please complete your organisation profile before saving your progress.");
        } else {
          toast.error("We couldn't save your progress right now. Please try again.");
        }
        return;
      }
      setShowSaveDraft(true);
    } finally {
      setIsSavingDraft(false);
    }
  };

  return (
    <div className="pt-24 pb-16 px-6" style={{ backgroundColor: "#F8F6F1" }}>
      <div className="max-w-[960px] mx-auto">
        {/* Section Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#E4F2F6] flex items-center justify-center">
              <Icon size={20} className="text-[#0B3D4A]" />
            </div>
            <div>
              <h1 className="font-display font-bold text-[#111827] text-lg">{param.name}</h1>
              <p className="text-xs text-[#9CA3AF]">{sectionIndex + 1} of 6</p>
            </div>
          </div>
        </div>

        {/* Unanswered banner */}
        <AnimatePresence>
          {unansweredPulse && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-4 bg-[#FFF5F5] border border-[#B91C1C] rounded-lg px-4 py-3"
            >
              <p className="text-sm text-[#B91C1C] font-medium">Please answer all required questions to continue.</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Journey Progress Bar */}
        <JourneyProgressBar currentSectionId={sectionId || "legal"} />

        {/* Tooltip Tour */}
        {sectionId === "legal" && <TooltipTour />}

        {/* GRID VIEW - 2 columns desktop, 1 column mobile */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          {applicableDocs.map((doc, idx) => (
            <div
              key={doc.id}
              id={`card-${doc.id}`}
              data-tour={idx === 0 ? "question-card" : undefined}
              className={unansweredPulse && answers[doc.id] == null ? "animate-border-pulse rounded-[14px]" : ""}
            >
              <QuestionCard
                doc={doc}
                answer={answers[doc.id] || null}
                onAnswer={(status) => setAnswer(doc.id, status)}
              />
            </div>
          ))}
        </div>

        <button
          onClick={handleProceed}
          disabled={!allAnswered}
          className={`w-full py-3 rounded-xl font-display font-semibold text-sm tracking-wide transition-all ${
            allAnswered
              ? "bg-[#C4872A] text-white hover:bg-[#A8711F]"
              : "bg-[#E5E7EB] text-[#9CA3AF] cursor-not-allowed"
          }`}
        >
          {isLast ? "View My Results" : `Next: ${filteredParams[sectionIndex + 1]?.name || ""}`}
        </button>

        {/* Save as draft */}
        <div className="mt-4">
          <button
            onClick={handleSaveDraft}
            disabled={isSavingDraft}
            className="text-[13px] text-[#6B7280] font-body hover:underline transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isSavingDraft ? "Saving..." : "Save as draft"}
          </button>
        </div>

        {/* Save Draft Modal */}
        <AnimatePresence>
          {showSaveDraft && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
              onClick={() => setShowSaveDraft(false)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white rounded-2xl w-full max-w-sm overflow-hidden"
              >
                <div className="p-6 text-center" style={{ backgroundColor: "#0B3D4A" }}>
                  <Save size={24} className="text-white mx-auto mb-3" />
                  <h2 className="font-display font-bold text-white text-lg">Progress saved</h2>
                </div>
                <div className="p-6 text-center">
                  <p className="text-[15px] text-[#4B5563] font-body mb-6">
                    Come back anytime to continue.
                  </p>
                  <button
                    onClick={() => setShowSaveDraft(false)}
                    className="px-6 py-3 rounded-xl bg-[#C4872A] text-white font-display font-semibold text-sm hover:bg-[#A8711F] transition-all"
                  >
                    Got it
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Section Summary Modal */}
        <AnimatePresence>
          {showSummary && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center p-4"
              onClick={() => setShowSummary(false)}
            >
              <motion.div
                initial={{ y: 100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 100, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white rounded-2xl p-6 w-full max-w-md max-h-[80vh] overflow-y-auto"
              >
                <h2 className="font-display font-bold text-[#111827] text-lg mb-1">
                  Here's what you told us about {param.name}
                </h2>
                <p className="text-sm text-[#9CA3AF] mb-4">Review your answers. You can change anything before confirming.</p>

                <div className="space-y-2 mb-6">
                  {applicableDocs.map((doc) => (
                    <div key={doc.id} className="flex items-center gap-3 py-2 border-b border-[#F3F4F6] last:border-0">
                      {answers[doc.id] === "yes" ? (
                        <CheckCircle size={16} className="text-[#15803D] shrink-0" />
                      ) : (
                        <XCircle size={16} className="text-[#B91C1C] shrink-0" />
                      )}
                      <span className="text-sm text-[#111827]">{doc.name}</span>
                    </div>
                  ))}
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setShowSummary(false)}
                    className="flex-1 py-3 rounded-xl border border-[#E5E7EB] text-sm font-medium text-[#9CA3AF] hover:text-[#111827] transition-all"
                  >
                    Edit answers
                  </button>
                  <button
                    onClick={handleConfirmAndContinue}
                    className="flex-1 py-3 rounded-xl bg-[#C4872A] text-white text-sm font-semibold hover:bg-[#A8711F] transition-all"
                  >
                    Confirm and continue
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Assessment;