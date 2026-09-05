import { useState, useEffect } from "react";
import { Link } from "react-router";
import { Gift, X, ArrowRight } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

const DISMISSAL_KEY = "bca_referral_promo_dismissed";
const DISMISSAL_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

export function ReferralFloatingPromo() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      const dismissedAt = localStorage.getItem(DISMISSAL_KEY);
      if (dismissedAt) {
        const timePassed = Date.now() - parseInt(dismissedAt, 10);
        if (timePassed < DISMISSAL_DURATION_MS) {
          return;
        }
      }
      // Small delay before showing so it doesn't immediately jar the user
      const timer = setTimeout(() => {
        setVisible(true);
      }, 2500);
      return () => clearTimeout(timer);
    } catch {
      // LocalStorage unavailable
    }
  }, []);

  const handleDismiss = () => {
    setVisible(false);
    try {
      localStorage.setItem(DISMISSAL_KEY, Date.now().toString());
    } catch {
      // ignore
    }
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.96 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="fixed bottom-20 left-4 sm:left-6 z-40 max-w-sm w-[calc(100vw-2rem)] sm:w-auto"
        >
          <div className="bg-white rounded-2xl p-4 shadow-xl border border-blue-100 shadow-blue-900/10 flex items-start gap-3.5 relative overflow-hidden">
            <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-200/60 text-[#1E40AF] flex items-center justify-center shrink-0 mt-0.5">
              <Gift className="w-4 h-4" />
            </div>

            <div className="flex-1 min-w-0 pr-6">
              <div className="flex items-center gap-1.5 mb-1">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#1E40AF] bg-blue-100/60 px-2 py-0.5 rounded-full">
                  Referral Reward
                </span>
              </div>
              <p className="text-xs font-bold text-slate-900 leading-snug">
                Got a BCA friend? 🎓
              </p>
              <p className="text-[11px] text-slate-600 mt-0.5 leading-normal">
                Share your code and unlock Most Repeated Questions after their verified purchase.
              </p>

              <div className="mt-2.5 flex items-center gap-2">
                <Link
                  to="/referral"
                  onClick={() => setVisible(false)}
                  className="inline-flex items-center gap-1 text-xs font-bold text-[#1E40AF] hover:text-[#1E3A8A] transition-colors"
                >
                  <span>Learn More</span>
                  <ArrowRight className="w-3 h-3" />
                </Link>
                <span className="text-slate-300">•</span>
                <button
                  type="button"
                  onClick={handleDismiss}
                  className="text-xs text-slate-400 hover:text-slate-600 font-medium transition-colors"
                >
                  Dismiss
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={handleDismiss}
              aria-label="Close referral promotion"
              className="absolute top-3 right-3 text-slate-400 hover:text-slate-600 rounded-lg p-1 hover:bg-slate-100 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
