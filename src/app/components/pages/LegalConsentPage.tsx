import { useState } from "react";
import { useNavigate } from "react-router";
import { motion } from "motion/react";
import { Shield, AlertTriangle, CheckSquare, Square, BookOpen } from "lucide-react";
import { useLegal } from "../legal/LegalContext";
import { TERMS_VERSION } from "../../../lib/supabase/legalService";

const CHECKBOXES = [
  {
    id: "c1",
    text: "I understand that BCA Vault is an independent student startup project and is NOT officially affiliated with Bharati Vidyapeeth University, its faculty members, teachers, professors, departments, or administration in any way.",
  },
  {
    id: "c2",
    label: "terms",
    text: "I have read and agree to the Terms & Conditions of BCA Vault.",
  },
  {
    id: "c3",
    label: "privacy",
    text: "I have read and agree to the Privacy Policy of BCA Vault.",
  },
  {
    id: "c4",
    text: "I understand that educational content, notes, and resources on this platform are community-driven and may not represent official Bharati Vidyapeeth University material.",
  },
];

export function LegalConsentPage() {
  const { accept } = useLegal();
  const navigate = useNavigate();
  const [checks, setChecks] = useState<Record<string, boolean>>({
    c1: false,
    c2: false,
    c3: false,
    c4: false,
  });
  const [accepting, setAccepting] = useState(false);
  const allChecked = Object.values(checks).every(Boolean);

  function toggle(id: string) {
    setChecks((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  async function handleAccept() {
    if (!allChecked) return;
    setAccepting(true);
    await accept();
    navigate("/");
  }

  function handleDecline() {
    navigate("/");
  }

  return (
    <div className="min-h-screen bg-[#0A0F1E] flex flex-col">
      {/* Top bar */}
      <div className="border-b border-white/5 px-6 py-4 flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-[#1E40AF] flex items-center justify-center">
          <BookOpen className="w-3.5 h-3.5 text-white" />
        </div>
        <span className="text-sm font-bold text-white" style={{ fontFamily: "var(--font-display)" }}>
          BCA Vault
        </span>
        <span className="ml-2 text-xs text-slate-500">Legal Consent Required</span>
      </div>

      <div className="flex-1 flex items-center justify-center p-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="w-full max-w-lg"
        >
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-4">
              <Shield className="w-8 h-8 text-[#4F46E5]" />
            </div>
            <h1
              className="text-2xl font-black text-white mb-2"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Platform Disclaimer
            </h1>
            <p className="text-slate-400 text-sm">
              Please review and accept to continue · v{TERMS_VERSION}
            </p>
          </div>

          {/* Card */}
          <div className="bg-[#0D1117] border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
            {/* Warning */}
            <div className="flex items-start gap-3 m-5 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl">
              <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-red-300 mb-1">
                  NOT Affiliated with Bharati Vidyapeeth
                </p>
                <p className="text-xs text-red-400/80 leading-relaxed">
                  This is an independent student startup. It is NOT sponsored, owned, operated, endorsed, or managed by Bharati Vidyapeeth University, any faculty, teacher, or department.
                </p>
              </div>
            </div>

            {/* Checkboxes */}
            <div className="px-5 pb-2 space-y-2">
              {CHECKBOXES.map((item) => {
                const checked = checks[item.id];
                return (
                  <button
                    key={item.id}
                    onClick={() => toggle(item.id)}
                    className={`w-full flex items-start gap-3 p-4 rounded-xl border text-left transition-all duration-150 ${
                      checked
                        ? "bg-[#1E40AF]/15 border-[#1E40AF]/40"
                        : "bg-white/3 border-white/10 hover:border-white/20"
                    }`}
                  >
                    <span className="shrink-0 mt-0.5">
                      {checked ? (
                        <CheckSquare className="w-5 h-5 text-[#4F46E5]" />
                      ) : (
                        <Square className="w-5 h-5 text-slate-600" />
                      )}
                    </span>
                    <span className="text-sm text-slate-300 leading-relaxed">
                      {item.text}
                      {item.label === "terms" && (
                        <>
                          {" "}
                          <a
                            href="/terms-and-conditions"
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="text-[#4F46E5] underline"
                          >
                            Read Terms
                          </a>
                        </>
                      )}
                      {item.label === "privacy" && (
                        <>
                          {" "}
                          <a
                            href="/privacy-policy"
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="text-[#4F46E5] underline"
                          >
                            Read Policy
                          </a>
                        </>
                      )}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Actions */}
            <div className="p-5 space-y-3">
              <button
                onClick={handleAccept}
                disabled={!allChecked || accepting}
                className={`w-full py-3.5 rounded-xl text-sm font-bold transition-all ${
                  allChecked && !accepting
                    ? "bg-[#1E40AF] hover:bg-[#1E3A8A] text-white shadow-lg shadow-blue-500/20"
                    : "bg-white/5 text-slate-600 cursor-not-allowed"
                }`}
              >
                {accepting ? "Saving acceptance…" : "Accept & Continue →"}
              </button>
              <button
                onClick={handleDecline}
                className="w-full py-3 text-slate-500 hover:text-slate-300 text-sm font-medium transition-colors"
              >
                Decline — Return to Home
              </button>
              <p className="text-center text-[10px] text-slate-600">
                All 4 checkboxes must be selected to continue
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
