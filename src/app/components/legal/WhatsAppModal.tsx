import { useState } from "react";
import { motion } from "motion/react";
import { AlertTriangle, CheckSquare, Square, X } from "lucide-react";

interface WhatsAppModalProps {
  isOpen: boolean;
  url: string;
  onClose: () => void;
}

function WhatsAppModalDialog({ isOpen, url, onClose }: WhatsAppModalProps) {
  const [checked, setChecked] = useState(false);

  if (!isOpen) return null;

  function handleContinue() {
    if (!checked) return;
    window.open(url, "_blank", "noopener,noreferrer");
    setChecked(false);
    onClose();
  }

  function handleClose() {
    setChecked(false);
    onClose();
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[9998] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
    >
      <motion.div
        initial={{ scale: 0.93, opacity: 0, y: 16 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 8 }}
        transition={{ type: "spring", stiffness: 340, damping: 30 }}
        className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-amber-50 border border-amber-100 rounded-xl flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <p className="font-bold text-gray-900 text-sm" style={{ fontFamily: "var(--font-display)" }}>
                Independent Student Community Notice
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5">
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-5">
            <p className="text-sm text-amber-800 leading-relaxed">
              This WhatsApp group/community is <strong>independently managed by students</strong>.
            </p>
            <ul className="mt-2 space-y-1 text-xs text-amber-700">
              <li>• NOT an official Bharati Vidyapeeth group</li>
              <li>• NOT managed by any teacher, professor, or faculty member</li>
              <li>• NOT endorsed by any department or university administration</li>
              <li>• Independently run by student volunteers</li>
            </ul>
          </div>

          <button
            onClick={() => setChecked((v) => !v)}
            className={`w-full flex items-start gap-3 p-4 rounded-xl border text-left transition-all ${
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
              I understand this is an independently managed student community and not an official Bharati Vidyapeeth platform.
            </span>
          </button>
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 flex gap-3">
          <button
            onClick={handleClose}
            className="flex-1 py-3 border border-gray-200 text-gray-600 hover:bg-gray-100 rounded-xl text-sm font-semibold transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleContinue}
            disabled={!checked}
            className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${
              checked
                ? "bg-[#25D366] hover:bg-[#1ebe5d] text-white shadow-lg shadow-green-500/20"
                : "bg-gray-200 text-gray-400 cursor-not-allowed"
            }`}
          >
            Continue to WhatsApp
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

interface WhatsAppLinkProps {
  url: string;
  children: React.ReactNode;
  className?: string;
}

export function WhatsAppLink({ url, children, className }: WhatsAppLinkProps) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)} className={className}>
        {children}
      </button>
      <WhatsAppModalDialog
        isOpen={open}
        url={url}
        onClose={() => setOpen(false)}
      />
    </>
  );
}
