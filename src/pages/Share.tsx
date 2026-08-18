import { useState } from "react";
import { Link } from "react-router-dom";
import { Mail, Link2, FileDown, Info } from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { updateSubmission } from "@/lib/api";

const Share = () => {
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [isSending, setIsSending] = useState(false);
  const shareUrl = window.location.origin + "/results";

  const validateEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    toast.success("Link copied to clipboard!");
  };

  const handleSendEmail = async () => {
    if (!email) return;
    if (!validateEmail(email)) {
      setEmailError("Please enter a valid email address.");
      return;
    }
    setEmailError("");

    const orgId = localStorage.getItem("orgId");
    if (!orgId) {
      setEmailError("We couldn't find your assessment. Please restart from the beginning.");
      return;
    }

    setIsSending(true);
    try {
      await updateSubmission(orgId, {
        shared_with_email: email,
      });
      toast.success(`Report sent to ${email}`, { duration: 2500 });
      setEmail("");
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Something went wrong while sharing the report. Please try again.";
      setEmailError(message);
    } finally {
      setIsSending(false);
    }
  };

  const handleDownload = () => window.print();

  return (
    <div className="pt-24 pb-16 px-6" style={{ backgroundColor: "#F8F6F1" }}>
      <div className="max-w-[640px] mx-auto">
        <h1 className="font-display font-bold text-[#111827] text-xl md:text-2xl mb-2">Share & Export</h1>
        <p className="text-[#4B5563] text-sm mb-8">Share your DoDiligence report with your team, advisor, or board.</p>

        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-[#E5E7EB] p-6">
            <div className="flex items-center gap-2 mb-3">
              <Mail size={18} className="text-[#0B3D4A]" />
              <h2 className="font-display font-semibold text-[#111827] text-sm">Email Report</h2>
            </div>
            <div className="flex gap-2">
              <div className="flex-1">
                <Input
                  type="email"
                  placeholder="advisor@example.com"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setEmailError(""); }}
                  className={`border-[#E5E7EB] focus:border-[#0B3D4A] ${emailError ? "border-[#B91C1C]" : ""}`}
                />
                {emailError && <p className="text-xs text-[#B91C1C] mt-1">{emailError}</p>}
              </div>
              <button
                onClick={handleSendEmail}
                disabled={!email || isSending}
                className="shrink-0 px-4 py-2 rounded-xl bg-[#0B3D4A] text-white text-sm font-medium hover:bg-[#1A6478] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSending ? "Sending..." : "Send Report"}
              </button>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-[#E5E7EB] p-6">
            <div className="flex items-center gap-2 mb-3">
              <Link2 size={18} className="text-[#0B3D4A]" />
              <h2 className="font-display font-semibold text-[#111827] text-sm">Share Link</h2>
            </div>
            <div className="flex gap-2">
              <Input readOnly value={shareUrl} className="border-[#E5E7EB] bg-[#F8F6F1] text-[#9CA3AF] text-xs" />
              <button
                onClick={handleCopyLink}
                className="shrink-0 px-4 py-2 rounded-xl border-2 border-[#0B3D4A] text-[#0B3D4A] text-sm font-medium hover:bg-[#E4F2F6] transition-all"
              >
                Copy Link
              </button>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-[#E5E7EB] p-6">
            <div className="flex items-center gap-2 mb-3">
              <FileDown size={18} className="text-[#111827]" />
              <h2 className="font-display font-semibold text-[#111827] text-sm">Download Report</h2>
            </div>
            <button
              onClick={handleDownload}
              className="w-full py-3 rounded-xl bg-[#111827] text-white text-sm font-medium hover:opacity-90 transition-all"
            >
              Download PDF Report
            </button>
          </div>
        </div>

        {/* Tertiary link to Thank You */}
        <div className="text-center mt-6">
          <Link to="/thankyou" className="text-sm text-[#C4872A] hover:underline font-medium">
            You're done for now →
          </Link>
        </div>

        <div className="flex items-start gap-2 mt-8 text-xs text-[#9CA3AF]">
          <Info size={14} className="shrink-0 mt-0.5" />
          <p>Your responses are held in this session only. Share this with your CA or legal advisor to action the report faster.</p>
        </div>
      </div>
    </div>
  );
};

export default Share;