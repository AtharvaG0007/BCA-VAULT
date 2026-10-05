import { useNavigate } from "react-router";
import { motion } from "motion/react";
import { ArrowRight, BookOpen, Check, X as XIcon, Zap, FileText, Sparkles, Trophy } from "lucide-react";
import { Button } from "../ui/button";

const INCLUDES = [
  "Semester 1 BCA Study Notes",
  "Semester 1 Most Repeated Topics",
  "Unit-Wise & Topic-Wise Theory Notes",
  "Exam-Oriented Preparation Format",
  "Regular Content Updates",
];

const EXCLUDES = [
  "Semester 2 Material (Future Release)",
  "Most Repeated Questions (Referral Reward)",
  "Previous Year Questions (PYQs)",
  "PYQ Analysis",
  "Mathematics",
  "Lab / Practical Subjects",
  "Projects",
];

export function PopularBundles() {
  const navigate = useNavigate();

  return (
    <section className="py-20 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-100 text-[#1E40AF] text-xs font-bold uppercase tracking-wider mb-3">
            <Sparkles className="w-3.5 h-3.5" /> Introductory Student Access
          </div>
          <h2 className="text-3xl sm:text-4xl font-black text-[#111827] mb-3" style={{ fontFamily: "var(--font-display)" }}>
            First-Batch Student Offer
          </h2>
          <p className="text-gray-600 max-w-xl mx-auto text-sm sm:text-base leading-relaxed">
            Complete theory preparation bundle for eligible Semester 1 theory subjects.
          </p>
        </motion.div>

        <div className="flex justify-center">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="bg-white rounded-3xl border-2 border-[#1E40AF] shadow-2xl shadow-blue-100/60 overflow-hidden w-full max-w-2xl"
          >
            {/* Top gradient bar */}
            <div className="bg-gradient-to-r from-[#1E40AF] to-[#4F46E5] px-8 py-5 flex items-center justify-between">
              <div>
                <p className="text-white/70 text-xs font-semibold uppercase tracking-widest mb-0.5">BCA Vault</p>
                <p className="text-white font-black text-xl" style={{ fontFamily: "var(--font-display)" }}>
                  Semester 1 Bundle
                </p>
              </div>
              <div className="flex items-center gap-1.5 bg-white/10 px-3 py-1 rounded-full border border-white/20">
                <span className="text-white text-xs font-bold">First Batch</span>
              </div>
            </div>

            <div className="p-8 lg:flex gap-10">
              {/* Left: Features */}
              <div className="flex-1">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">
                  Semester 1 Notes + Most Repeated Topics
                </p>
                <div className="space-y-2.5 mb-5">
                  {INCLUDES.map((item) => (
                    <div key={item} className="flex items-center gap-3">
                      <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                        <Check className="w-3 h-3 text-emerald-600" />
                      </div>
                      <span className="text-sm text-gray-700">{item}</span>
                    </div>
                  ))}
                </div>

                {/* Excludes */}
                <div className="bg-gray-50 rounded-xl px-4 py-3">
                  <p className="text-xs text-gray-400 font-semibold mb-2">Not included</p>
                  <div className="flex flex-wrap gap-2">
                    {EXCLUDES.map((item) => (
                      <span key={item} className="inline-flex items-center gap-1 text-xs text-gray-400 bg-white border border-gray-200 px-2 py-0.5 rounded-full">
                        <XIcon className="w-2.5 h-2.5" /> {item}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Quiz winner banner */}
                <div className="mt-4 flex items-center gap-2.5 rounded-xl border border-amber-200 bg-amber-50/80 px-3.5 py-2 text-xs font-medium text-amber-900">
                  <Trophy className="h-4 w-4 text-amber-600 shrink-0" />
                  <span>Top 3 Quiz Winners → <strong>₹299</strong> with code WINNER150</span>
                </div>
              </div>

              {/* Right: Price + CTA */}
              <div className="flex flex-col items-center justify-center mt-8 lg:mt-0 lg:w-52 shrink-0">
                {/* What's inside icons */}
                <div className="grid grid-cols-2 gap-2 mb-6 w-full">
                  {[
                    { icon: BookOpen, label: "Theory Notes" },
                    { icon: Zap,      label: "Repeated Topics" },
                  ].map((s) => (
                    <div key={s.label} className="bg-[#1E40AF]/5 rounded-xl p-3 text-center">
                      <s.icon className="w-5 h-5 text-[#1E40AF] mx-auto mb-1" />
                      <p className="text-[10px] font-semibold text-gray-600 leading-tight">{s.label}</p>
                    </div>
                  ))}
                </div>

                <div className="text-center mb-6">
                  <div className="flex items-baseline justify-center gap-1.5 mb-1">
                    <span className="text-lg font-bold text-gray-500">₹</span>
                    <span className="text-5xl font-black text-gray-900" style={{ fontFamily: "var(--font-mono)" }}>499</span>
                    <span className="text-sm font-bold text-gray-400 line-through">₹899</span>
                  </div>
                  <p className="text-xs font-bold text-emerald-700">First-Batch Regular Price</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">One-time · Lifetime access</p>
                </div>

                <Button
                  onClick={() => navigate("/purchase")}
                  className="w-full h-12 bg-[#1E40AF] hover:bg-[#1E3A8A] text-white rounded-2xl gap-2 shadow-md shadow-blue-200"
                >
                  Get First-Batch Access <ArrowRight className="w-4 h-4" />
                </Button>

                <p className="text-xs text-gray-400 mt-2 text-center">Manual verification · Access within 24h</p>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Promo 3: Referral Callout */}
        <div className="mt-8 max-w-2xl mx-auto bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/80 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#1E40AF]">
              <span>Study Together. Earn More.</span>
            </div>
            <p className="text-xs text-slate-700 leading-relaxed max-w-md">
              Refer 3 friends. Unlock <strong className="text-slate-900 font-semibold">Most Repeated Questions</strong> FREE after their eligible Semester 1 purchases are approved.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/referral")}
            className="shrink-0 bg-white border-blue-200 text-[#1E40AF] hover:bg-blue-50 text-xs font-bold rounded-xl shadow-xs"
          >
            Refer 3 Friends
          </Button>
        </div>
      </div>
    </section>
  );
}
