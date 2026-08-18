import { useState } from "react";
import { Link } from "react-router-dom";
import { useAssessment } from "@/store/assessment-context";
import { updateSubmission } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle } from "lucide-react";

const GiftPage = () => {
  const { orgProfile } = useAssessment();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("");
  const [emailError, setEmailError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [showDoneLink, setShowDoneLink] = useState(false);

  const validateEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

  const handleClaim = async () => {
    if (!validateEmail(email)) {
      setEmailError("Please enter a valid email address so we can send you the resource.");
      return;
    }
    setEmailError("");
    setSubmitError("");

    const orgId = localStorage.getItem("orgId");
    if (!orgId) {
      console.error("Missing orgId in localStorage — cannot save gift information.");
      setSubmitError("We couldn't find your assessment. Please restart the assessment and try again.");
      return;
    }

    try {
      await updateSubmission(orgId, {
        gift_email: email,
        gift_role: role,
      });
      setSubmitted(true);
      setTimeout(() => setShowDoneLink(true), 1500);
    } catch (error) {
      console.error("Error claiming gift:", error);
      setSubmitError("Something went wrong sending your checklist. Please try again.");
    }
  };

  return (
    <div className="pt-24 pb-16 px-6 min-h-screen" style={{ backgroundColor: "#F8F6F1" }}>
      <div className="max-w-[560px] mx-auto">
        {/* Header */}
        <div className="rounded-2xl p-8 text-center mb-8 relative overflow-hidden" style={{ backgroundColor: "#0B3D4A" }}>
          <div className="relative z-10">
            <div className="flex justify-center mb-4">
              <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
                <rect x="12" y="28" width="40" height="28" rx="4" stroke="white" strokeWidth="2" fill="none" />
                <rect x="8" y="22" width="48" height="10" rx="3" stroke="white" strokeWidth="2" fill="none" />
                <line x1="32" y1="22" x2="32" y2="56" stroke="white" strokeWidth="2" />
                <path d="M32 22 C32 22 24 14 20 14 C16 14 14 18 18 20 C22 22 32 22 32 22" stroke="white" strokeWidth="2" fill="none" />
                <path d="M32 22 C32 22 40 14 44 14 C48 14 50 18 46 20 C42 22 32 22 32 22" stroke="white" strokeWidth="2" fill="none" />
              </svg>
            </div>
            <h1 className="font-display font-bold text-white text-2xl mb-2">
              Your next steps, as a checklist.
            </h1>
            <p className="text-[#A8CCD5] text-sm">
              The Metropolitan Institute has prepared a free resource to help you act on your DoDiligence results — organised by priority, with the exact steps you need to take.
            </p>
          </div>
        </div>

        {/* Resource description card */}
        <div className="bg-white rounded-2xl border border-[#E5E7EB] p-6 mb-4">
          <p className="text-sm font-medium text-[#111827] mb-3">The DoDiligence Action Checklist gives you:</p>
          <ul className="space-y-2 text-sm text-[#4B5563]">
            <li className="flex items-start gap-2">
              <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[#C4872A] shrink-0" />
              A prioritised list of documents to gather or create, in the order that matters most to funders
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[#C4872A] shrink-0" />
              Simple, plain-English instructions for each item — no compliance jargon
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[#C4872A] shrink-0" />
              A ready-to-use template financial policy and board resolution format
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[#C4872A] shrink-0" />
              A guide to the government portals you will need, and what to prepare before you log in
            </li>
          </ul>
        </div>

        {/* Form / Success */}
        <AnimatePresence mode="wait">
          {!submitted ? (
            <motion.div
              key="form"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="bg-white rounded-2xl border border-[#E5E7EB] p-8"
            >
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[#111827] mb-1.5">Organisation Name</label>
                  <Input value={orgProfile.name || ""} readOnly className="border-[#E5E7EB] bg-[#F8F6F1] text-[#9CA3AF]" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#111827] mb-1.5">Your email address</label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setEmailError(""); }}
                    placeholder="The checklist will be sent here"
                    className={`border-[#E5E7EB] focus:border-[#0B3D4A] ${emailError ? "border-[#B91C1C]" : ""}`}
                  />
                  {emailError && <p className="text-xs text-[#B91C1C] mt-1">{emailError}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#111827] mb-1.5">Your role</label>
                  <Input
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    placeholder="e.g. Executive Director, Programme Manager"
                    className="border-[#E5E7EB] focus:border-[#0B3D4A]"
                  />
                </div>
              </div>

              {submitError && <p className="text-xs text-[#B91C1C] text-center mt-4">{submitError}</p>}

              <button
                onClick={handleClaim}
                disabled={!email || !role}
                className="w-full mt-6 py-4 rounded-2xl bg-[#C4872A] text-white font-display font-bold text-base tracking-[0.02em] hover:bg-[#A8711F] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Send me the checklist
              </button>

              <p className="text-xs text-[#9CA3AF] text-center mt-3">
                One email. No follow-ups unless you ask. Your details are not shared with any third party.
              </p>
            </motion.div>
          ) : (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-2xl border border-[#E5E7EB] p-8 text-center"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: [0, 1.2, 1] }}
                transition={{ duration: 0.4 }}
                className="w-16 h-16 rounded-full bg-[#0B3D4A] flex items-center justify-center mx-auto mb-4"
              >
                <CheckCircle size={32} className="text-white" />
              </motion.div>
              <h2 className="font-display font-bold text-[#111827] text-xl mb-2">Your checklist is on its way.</h2>
              <p className="text-[#4B5563] text-sm">Check your inbox. If you do not see it within 15 minutes, check your spam folder and mark it as safe — that way you will not miss anything from us.</p>

              <AnimatePresence>
                {showDoneLink && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="mt-6"
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

        <p className="text-xs text-[#9CA3AF] text-center mt-8">
          This resource is provided free by The Metropolitan Institute (TMI) as part of their ongoing work to strengthen India's civil society.
        </p>
      </div>
    </div>
  );
};

export default GiftPage;