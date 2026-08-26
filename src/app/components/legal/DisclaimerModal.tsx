import { useState } from "react";
import { motion } from "motion/react";
import { Shield, AlertTriangle, CheckSquare, Square } from "lucide-react";
import { useLegal } from "./LegalContext";
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

export function DisclaimerModal() {
  const { accept } = useLegal();
  const [checks, setChecks] = useState<Record<string, boolean>>({
    c1: false,
    c2: false,
    c3: false,
    c4: false,
  });
  const [declined, setDeclined] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const allChecked = Object.values(checks).every(Boolean);

  function toggle(id: string) {
    setChecks((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  async function handleAccept() {
    if (!allChecked) return;
    setAccepting(true);
    await accept();
  }

  if (declined) {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
        <div className="w-full max-w-sm bg-white rounded-3xl p-8 text-center shadow-2xl">
          <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-7 h-7 text-red-500" />
          </div>
          <h2 className="text-lg font-bold text-gray-900 mb-2" style={{ fontFamily: "var(--font-display)" }}>
            Access Declined
          </h2>
          <p className="text-gray-500 text-sm mb-6 leading-relaxed">
            You must accept the Terms & Conditions and Privacy Policy to access BCA Vault.
          </p>
          <button
            onClick={() => setDeclined(false)}
            className="w-full py-3 bg-[#1E40AF] hover:bg-[#1E3A8A] text-white rounded-xl text-sm font-semibold transition-colors"
          >
            Review Terms Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center sm:p-4 bg-black/75 backdrop-blur-sm"
    >
      <motion.div
        initial={{ y: 60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 320, damping: 32, delay: 0.05 }}
        className="w-full sm:max-w-lg bg-white sm:rounded-3xl rounded-t-3xl shadow-2xl flex flex-col overflow-hidden"
        style={{ maxHeight: "92dvh" }}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-6 pt-6 pb-4 border-b border-gray-100 shrink-0">
          <div className="w-10 h-10 rounded-xl bg-[#1E40AF] flex items-center justify-center">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="font-bold text-gray-900 text-sm" style={{ fontFamily: "var(--font-display)" }}>
              BCA Vault
            </p>
            <p className="text-xs text-gray-400">Platform Disclaimer · v{TERMS_VERSION}</p>
          </div>
          <div className="ml-auto text-xs text-[#4F46E5] font-semibold bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-100">
            Required
          </div>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">
          {/* ⚠️ Warning Banner */}
          <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-2xl">
            <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-red-700 mb-1">
                Independent Platform — Not Affiliated with Bharati Vidyapeeth
              </p>
              <p className="text-xs text-red-600 leading-relaxed">
                This platform is <strong>NOT</strong> sponsored, owned, operated, endorsed, or affiliated with Bharati Vidyapeeth University, any of its faculty members, professors, teachers, departments, or administration. It is independently developed by students as a startup initiative.
              </p>
            </div>
          </div>

          {/* Checkboxes */}
          <div className="space-y-3">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Please read and acknowledge each statement
            </p>
            {CHECKBOXES.map((item) => {
              const checked = checks[item.id];
              return (
                <button
                  key={item.id}
                  onClick={() => toggle(item.id)}
                  className={`w-full flex items-start gap-3 p-4 rounded-xl border text-left transition-all duration-150 ${
                    checked
                      ? "bg-[#1E40AF]/5 border-[#1E40AF]/30"
                      : "bg-gray-50 border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <span className="shrink-0 mt-0.5">
                    {checked ? (
                      <CheckSquare className="w-5 h-5 text-[#1E40AF]" />
                    ) : (
                      <Square className="w-5 h-5 text-gray-300" />
                    )}
                  </span>
                  <span className="text-sm text-gray-700 leading-relaxed">
                    {item.text}
                    {item.label === "terms" && (
                      <>
                        {" "}
                        <a
                          href="/terms-and-conditions"
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="text-[#1E40AF] underline font-medium"
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
                          className="text-[#1E40AF] underline font-medium"
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
        </div>

        {/* Footer */}
        <div className="px-6 py-5 border-t border-gray-100 bg-gray-50/80 shrink-0">
          <div className="flex gap-3">
            <button
              onClick={() => setDeclined(true)}
              className="flex-1 py-3 border border-gray-200 text-gray-600 hover:bg-gray-100 rounded-xl text-sm font-semibold transition-colors"
            >
              Decline
            </button>
            <button
              onClick={handleAccept}
              disabled={!allChecked || accepting}
              className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${
                allChecked && !accepting
                  ? "bg-[#1E40AF] hover:bg-[#1E3A8A] text-white shadow-lg shadow-blue-500/20"
                  : "bg-gray-200 text-gray-400 cursor-not-allowed"
              }`}
            >
              {accepting ? "Saving…" : "Accept & Continue →"}
            </button>
          </div>
          <p className="text-center text-[10px] text-gray-400 mt-3">
            All 4 checkboxes must be selected to continue.
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
}
