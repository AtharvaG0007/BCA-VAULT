import { motion } from "motion/react";
import { useNavigate } from "react-router";
import {
  BookOpen, Check, X as XIcon, Shield,
  BadgeCheck, RefreshCw, QrCode, ClipboardList, Sparkles, Trophy
} from "lucide-react";

// Single fixed product — no DB fetch required
const INCLUDES = [
  "Complete Theory Notes",
  "Semester 1 & 2 Theory Subjects",
  "Unit-Wise & Topic-Wise Notes",
  "Previous Year Questions (PYQs)",
  "PYQ Analysis",
  "Most Repeated Questions",
  "Important Exam Topics",
  "Exam-Oriented Preparation",
  "Regular Content Updates",
];

const EXCLUDES = ["Mathematics", "Lab / Practical Subjects", "Projects"];

const HOW_IT_WORKS = [
  { icon: BookOpen,      step: "01", label: "Choose Bundle",   desc: "Select the BCA Vault theory bundle" },
  { icon: QrCode,        step: "02", label: "Make Payment",    desc: "Pay using official BCA Vault UPI" },
  { icon: ClipboardList, step: "03", label: "Submit Evidence", desc: "Submit UTR and payment screenshot" },
  { icon: BadgeCheck,    step: "04", label: "Get Access",      desc: "Appears in My Library after verification" },
];

const SUPPORT_EMAIL = "bcavault07@gmail.com";
const SUPPORT_PHONE = "9326342123";

export function BundlesPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Hero */}
      <div className="text-center px-4 pt-16 pb-12">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <div className="inline-flex items-center gap-1.5 text-xs font-bold px-3.5 py-1.5 rounded-full bg-[#1E40AF]/10 text-[#1E40AF] mb-5 uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" /> First-Batch Student Edition
          </div>
          <h1 className="text-4xl lg:text-5xl font-black text-gray-900 mb-4" style={{ fontFamily: "var(--font-display)" }}>
            First-Batch Student Offer
          </h1>
          <p className="text-gray-600 max-w-xl mx-auto text-base lg:text-lg mb-5 leading-relaxed">
            Complete theory preparation bundle for eligible Semester 1 & Semester 2 theory subjects.
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {["Theory Notes", "PYQ Papers", "Most Repeated Qs", "Semester 1 & 2"].map((tag) => (
              <span key={tag} className="flex items-center gap-1 text-xs bg-white border border-gray-200 text-gray-700 px-3 py-1 rounded-full shadow-sm font-medium">
                <Check className="w-3 h-3 text-emerald-500" /> {tag}
              </span>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Main Bundle Card */}
      <div className="max-w-2xl mx-auto px-4 pb-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-3xl border-2 border-[#1E40AF] shadow-2xl shadow-blue-100/60 overflow-hidden"
        >
          {/* Gradient header */}
          <div className="bg-gradient-to-r from-[#1E40AF] to-[#4F46E5] px-8 py-5 flex items-center justify-between">
            <div>
              <p className="text-white/70 text-xs font-bold uppercase tracking-widest mb-0.5">BCA Vault</p>
              <p className="text-white font-black text-xl" style={{ fontFamily: "var(--font-display)" }}>
                Complete Theory Bundle
              </p>
            </div>
            <div className="flex items-center gap-1.5 bg-white/10 px-3 py-1 rounded-full border border-white/20">
              <span className="text-white text-xs font-bold">First Batch</span>
            </div>
          </div>

          <div className="p-8">
            <p className="text-sm text-gray-600 mb-7 leading-relaxed">
              Theory Notes + PYQs + Most Repeated Questions for eligible Semester 1 and Semester 2 theory subjects.
            </p>

            <div className="sm:flex gap-8">
              {/* Includes list */}
              <div className="flex-1 mb-7 sm:mb-0">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">What's Included</p>
                <div className="space-y-2.5">
                  {INCLUDES.map((item) => (
                    <div key={item} className="flex items-center gap-2.5">
                      <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                        <Check className="w-3 h-3 text-emerald-600" />
                      </div>
                      <span className="text-sm text-gray-700">{item}</span>
                    </div>
                  ))}
                </div>

                <div className="mt-5 bg-gray-50 rounded-xl px-4 py-3">
                  <p className="text-xs text-gray-400 font-semibold mb-2 uppercase tracking-wide">Not Included</p>
                  <div className="flex flex-wrap gap-2">
                    {EXCLUDES.map((item) => (
                      <span key={item} className="inline-flex items-center gap-1 text-xs text-gray-400 bg-white border border-gray-200 px-2.5 py-1 rounded-full">
                        <XIcon className="w-2.5 h-2.5" /> {item}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Quiz winner banner */}
                <div className="mt-4 flex items-center gap-2.5 rounded-xl border border-amber-200 bg-amber-50/80 px-3.5 py-2 text-xs font-medium text-amber-900">
                  <Trophy className="h-4 w-4 text-amber-600 shrink-0" />
                  <span>Top 3 Quiz Winners → <strong>₹349</strong> with code WINNER150</span>
                </div>
              </div>

              {/* Price + CTA */}
              <div className="flex flex-col items-center justify-center sm:w-52 shrink-0">
                <div className="w-full bg-[#1E40AF]/5 border border-[#1E40AF]/20 rounded-2xl p-5 text-center mb-4">
                  <div className="flex items-baseline justify-center gap-1.5 mb-1">
                    <span className="text-xl font-bold text-gray-500">₹</span>
                    <span className="text-4xl sm:text-5xl font-black text-gray-900" style={{ fontFamily: "var(--font-mono)" }}>499</span>
                    <span className="text-sm font-bold text-gray-400 line-through">₹899</span>
                  </div>
                  <p className="text-[11px] font-bold text-emerald-700">First-Batch Offer (BUDMS400)</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">One-time · Lifetime access</p>
                </div>

                <button
                  onClick={() => navigate("/purchase")}
                  className="w-full py-4 bg-[#1E40AF] hover:bg-[#1E3A8A] text-white font-bold rounded-2xl transition-all active:scale-95 shadow-lg shadow-blue-200 tracking-wide text-xs uppercase"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  Get First-Batch Access
                </button>

                <div className="flex flex-col gap-1.5 mt-4 w-full">
                  {[
                    { icon: RefreshCw,  text: "Regular Updates" },
                    { icon: Shield,     text: "Manual Verification" },
                    { icon: BadgeCheck, text: "Lifetime Access" },
                  ].map((item) => (
                    <div key={item.text} className="flex items-center gap-2 text-xs text-gray-500">
                      <item.icon className="w-3.5 h-3.5 text-[#1E40AF] shrink-0" />
                      {item.text}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Promo 2: Referral Callout */}
        <div className="mt-6 bg-gradient-to-r from-blue-50/70 to-indigo-50/50 border border-blue-200/80 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[#1E40AF]">
              <span>🎓 Know a BCA friend?</span>
            </div>
            <p className="text-xs text-slate-700 leading-relaxed max-w-lg">
              Refer them to BCA Vault and unlock <strong className="text-slate-900 font-semibold">Most Repeated Questions</strong> for yourself after their eligible purchase is verified.
            </p>
          </div>
          <button
            onClick={() => navigate("/referral")}
            className="shrink-0 px-4 py-2 bg-white border border-blue-200 text-[#1E40AF] hover:bg-blue-50 text-xs font-bold rounded-xl shadow-xs transition-colors"
          >
            Learn About Referral
          </button>
        </div>

        {/* How it works */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-8 bg-white border border-gray-100 rounded-3xl p-7 shadow-sm"
        >
          <h3 className="text-base font-black text-gray-900 mb-6 text-center" style={{ fontFamily: "var(--font-display)" }}>
            How to Get Access
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {HOW_IT_WORKS.map((s) => (
              <div key={s.step} className="flex flex-col items-center text-center">
                <div className="w-10 h-10 rounded-full bg-[#1E40AF] text-white flex items-center justify-center mb-2 shadow-md shadow-blue-200">
                  <s.icon className="w-5 h-5" />
                </div>
                <p className="text-xs font-black text-[#1E40AF] mb-0.5">{s.step}</p>
                <p className="text-sm font-bold text-gray-900 mb-1">{s.label}</p>
                <p className="text-xs text-gray-400 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Support */}
        <div className="mt-6 mb-8 text-center text-sm text-gray-500">
          Need help? Email{" "}
          <a href={`mailto:${SUPPORT_EMAIL}`} className="text-[#1E40AF] hover:underline font-medium">
            {SUPPORT_EMAIL}
          </a>{" "}
          or WhatsApp{" "}
          <a href={`https://wa.me/91${SUPPORT_PHONE}`} className="text-[#1E40AF] hover:underline font-medium">
            +91 {SUPPORT_PHONE}
          </a>
        </div>
      </div>

    </div>
  );
}
