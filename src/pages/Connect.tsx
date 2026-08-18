import { useState, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ChevronLeft, ChevronRight, CheckCircle, Check } from "lucide-react";
import { useAssessment } from "@/store/assessment-context";
import { updateSubmission } from "@/lib/api";
import { motion, AnimatePresence } from "framer-motion";

const TIME_SLOTS = [
  "10:00 AM — 10:30 AM",
  "10:30 AM — 11:00 AM",
  "11:00 AM — 11:30 AM",
  "11:30 AM — 12:00 PM",
  "12:00 PM — 12:30 PM",
  "12:30 PM — 1:00 PM",
];

function getNextSaturday(from: Date): Date {
  const d = new Date(from);
  const day = d.getDay();
  const diff = (6 - day + 7) % 7 || 7;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatSaturday(d: Date) {
  return d.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

const Connect = () => {
  const { resetAll } = useAssessment();
  const navigate = useNavigate();

  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [agenda, setAgenda] = useState("");
  const [shareReport, setShareReport] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [showDoneLink, setShowDoneLink] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const saturday = useMemo(() => {
    const base = getNextSaturday(new Date());
    const d = new Date(base);
    d.setDate(d.getDate() + weekOffset * 7);
    return d;
  }, [weekOffset]);

  const handleRetake = () => {
    resetAll();
    navigate("/");
  };

  const handleSubmit = async () => {
    setSubmitError("");

    const orgId = localStorage.getItem("orgId");
    if (!orgId) {
      console.error("Missing orgId in localStorage — cannot save session booking.");
      setSubmitError("We couldn't find your assessment. Please restart the assessment and try again.");
      return;
    }

    try {
      await updateSubmission(orgId, {
        connect_slot: selectedSlot,
        connect_agenda: agenda,
        connect_share_report: shareReport,
      });
      setSubmitted(true);
      setTimeout(() => setShowDoneLink(true), 1500);
    } catch (error) {
      console.error("Error saving session booking:", error);
      setSubmitError("Something went wrong booking your session. Please try again.");
    }
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#0B3D4A" }}>
      <div className="flex-1 flex flex-col items-center px-6 pt-24 pb-12">
        {/* TMI Logo */}
        <div className="mb-6">
          <div className="w-[240px] h-[72px] rounded-lg flex items-center justify-center" style={{ backgroundColor: "#1A6478" }}>
            <span className="text-white font-body font-medium text-sm tracking-[0.08em]">THE METROPOLITAN INSTITUTE</span>
          </div>
        </div>

        <div className="w-14 h-0.5 bg-[#C4872A] rounded-sm mb-6" />

        <h1 className="font-display font-bold text-white text-3xl md:text-4xl text-center mb-3">
          Let's talk about your journey.
        </h1>
        <p className="text-[#A8CCD5] font-body text-base md:text-lg text-center max-w-xl mb-12">
          Book a free 30-minute session with The Metropolitan Institute team. We meet every Saturday.
        </p>

        {/* Scheduling Card */}
        <AnimatePresence mode="wait">
          {!submitted ? (
            <motion.div
              key="form"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="bg-white rounded-2xl p-8 w-full max-w-[640px]"
            >
              <h2 className="font-display font-semibold text-[#0B3D4A] text-lg mb-4">Select a Saturday</h2>

              {/* Week navigator */}
              <div className="flex items-center justify-between mb-6">
                <button
                  onClick={() => setWeekOffset(Math.max(0, weekOffset - 1))}
                  disabled={weekOffset === 0}
                  className="p-2 rounded-lg hover:bg-[#F3F4F6] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft size={20} className="text-[#0B3D4A]" />
                </button>
                <span className="font-body font-medium text-[#0B3D4A] text-base">{formatSaturday(saturday)}</span>
                <button
                  onClick={() => setWeekOffset(weekOffset + 1)}
                  className="p-2 rounded-lg hover:bg-[#F3F4F6] transition-colors"
                >
                  <ChevronRight size={20} className="text-[#0B3D4A]" />
                </button>
              </div>

              {/* Time slot grid */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-3">
                {TIME_SLOTS.map((slot) => (
                  <button
                    key={slot}
                    onClick={() => setSelectedSlot(slot)}
                    className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                      selectedSlot === slot
                        ? "bg-[#0B3D4A] text-white"
                        : "bg-white border-[1.5px] border-[#E5E7EB] text-[#0B3D4A] hover:border-[#0B3D4A]"
                    }`}
                  >
                    {slot}
                  </button>
                ))}
              </div>
              <p className="text-xs text-[#6B7280] mb-6">All times are in IST. Sessions are 30 minutes.</p>

              {/* Divider */}
              <div className="border-t border-[#E5E7EB] my-6" />

              {/* Agenda */}
              <div className="mb-6">
                <label className="block text-sm font-semibold text-[#0B3D4A] mb-2">What would you like to discuss?</label>
                <div className="relative">
                  <textarea
                    value={agenda}
                    onChange={(e) => setAgenda(e.target.value.slice(0, 500))}
                    placeholder="e.g. I need help prioritising my 12AB application, understanding CSR-1 requirements, or reviewing my board governance structure."
                    className="w-full min-h-[100px] border-[1.5px] border-[#E5E7EB] rounded-lg p-3 text-sm font-body text-[#111827] placeholder:text-[#9CA3AF] focus:border-[#0B3D4A] focus:outline-none resize-none"
                  />
                  <span className="absolute bottom-2 right-3 text-xs text-[#9CA3AF]">{agenda.length} / 500</span>
                </div>
              </div>

              {/* Share report checkbox */}
              <div className="mb-6">
                <label className="flex items-start gap-3 cursor-pointer group">
                  <button
                    type="button"
                    onClick={() => setShareReport(!shareReport)}
                    className={`mt-0.5 w-4 h-4 rounded-[3px] border-[1.5px] flex items-center justify-center shrink-0 transition-all duration-150 ${
                      shareReport
                        ? "bg-[#0B3D4A] border-[#0B3D4A]"
                        : "bg-white border-[#9CA3AF] group-hover:border-[#0B3D4A]"
                    }`}
                  >
                    {shareReport && <Check size={12} className="text-white" strokeWidth={3} />}
                  </button>
                  <span className="text-sm text-[#4B5563] font-body">
                    Share my DoDiligence report with the TMI team before our session.
                  </span>
                </label>
                {shareReport && (
                  <p className="text-[13px] text-[#15803D] mt-2 ml-7">
                    Your report will be sent to hello@themetropolitaninstitute.com. Replace this placeholder email before deployment.
                  </p>
                )}
              </div>

              {submitError && <p className="text-xs text-[#B91C1C] text-center mb-3">{submitError}</p>}

              {/* Submit */}
              <button
                onClick={handleSubmit}
                disabled={!selectedSlot}
                className={`w-full py-3.5 rounded-[10px] font-display font-semibold text-base transition-all ${
                  selectedSlot
                    ? "bg-[#C4872A] text-white hover:bg-[#A8711F]"
                    : "bg-[#9CA3AF] text-white cursor-not-allowed"
                }`}
                style={{ height: "52px" }}
              >
                Confirm my session →
              </button>
            </motion.div>
          ) : (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-2xl p-8 w-full max-w-[640px] text-center"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: [0, 1.2, 1] }}
                transition={{ duration: 0.4 }}
              >
                <CheckCircle size={48} className="text-[#15803D] mx-auto mb-4" />
              </motion.div>
              <h2 className="font-display font-bold text-[#0B3D4A] text-xl md:text-[22px] mb-3">You're booked in.</h2>
              <p className="text-[#4B5563] text-[15px] font-body leading-relaxed">
                We'll see you on {formatSaturday(saturday)} at {selectedSlot}. A confirmation will be sent to your email. The TMI team looks forward to connecting.
              </p>

              <AnimatePresence>
                {showDoneLink && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="mt-8"
                  >
                    <Link to="/thankyou" className="text-sm text-[#C4872A] hover:underline font-medium">
                      You're done for now →
                    </Link>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Retake */}
        <button onClick={handleRetake} className="mt-8 text-white/60 hover:text-white text-sm underline transition-colors">
          Retake Assessment
        </button>
      </div>

      <footer className="py-6 text-center text-xs" style={{ color: "#4B8A9E" }}>
        DoDiligence v1.0 · Built by The Metropolitan Institute · © 2026
      </footer>
    </div>
  );
};

export default Connect;