import { motion } from "motion/react";
import { useNavigate } from "react-router";
import { ArrowRight, BookOpen, Check, Clock, ShieldCheck, UserCheck, ShoppingBag } from "lucide-react";
import { useAuth } from "../auth/AuthContext";

const includes = ["Semester 1 BCA Study Notes", "Semester 1 Most Repeated Topics", "Unit-Wise & Topic-Wise Theory Notes", "Exam-Oriented Preparation Format", "Regular Content Updates"];
const steps = [
  { icon: UserCheck, label: "Create Account", desc: "Create your student account" },
  { icon: ShoppingBag, label: "Purchase Bundle", desc: "Pay ₹349 from your dashboard" },
  { icon: Clock, label: "Payment Reviewed", desc: "Admin verifies your payment" },
  { icon: ShieldCheck, label: "Access Activated", desc: "Materials unlock after approval" },
  { icon: BookOpen, label: "Start Studying", desc: "Open your Semester 1 materials" },
];

<<<<<<< HEAD
const EXCLUDES = [
  "Semester 2 Material (Future Release)",
  "Most Repeated Questions (Referral Reward)",
  "Previous Year Questions (PYQs)",
  "PYQ Analysis",
  "Mathematics",
  "Lab / Practical Subjects",
  "Projects",
];

const HOW_IT_WORKS = [
  { icon: UserCheck,     step: "STEP 1", label: "Create Account",   desc: "Sign up in 30 seconds" },
  { icon: ShoppingBag,   step: "STEP 2", label: "Purchase Bundle",  desc: "Semester 1 Bundle — ₹349" },
  { icon: Clock,         step: "STEP 3", label: "Payment Reviewed", desc: "Admin reviews submission" },
  { icon: ShieldCheck,   step: "STEP 4", label: "Access Activated", desc: "Materials unlock automatically" },
  { icon: BookOpen,      step: "STEP 5", label: "Start Studying",   desc: "Study Notes & Repeated Topics" },
];

const SUPPORT_EMAIL = "bcavault07@gmail.com";
const SUPPORT_PHONE = "9326342123";

=======
>>>>>>> e36d8cdb47a82807b009a28638d1435b110353f3
export function BundlesPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const goToNextStep = () => navigate(user ? "/purchase" : "/auth/signup");

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white px-4 py-12 sm:py-16">
      <div className="max-w-3xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-10">
          <p className="inline-flex rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700">SEMESTER 1 · FIRST-BATCH EDITION</p>
          <h1 className="mt-4 text-4xl sm:text-5xl font-black text-slate-900">BCA Semester 1 Bundle</h1>
          <p className="mt-3 text-slate-600 max-w-xl mx-auto">Semester 1 Notes + Most Repeated Topics, organised for theory exam preparation.</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-3xl border-2 border-indigo-600 shadow-xl overflow-hidden">
          <div className="bg-gradient-to-r from-indigo-700 to-indigo-600 px-6 py-5 text-white"><p className="text-xs font-bold uppercase tracking-widest text-indigo-200">BCA Vault</p><p className="text-xl font-black">Semester 1 Exam Preparation</p></div>
          <div className="p-6 sm:p-8">
            <div className="grid sm:grid-cols-[1fr_220px] gap-8">
              <div><p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">What's Included</p><div className="space-y-3">{includes.map(item => <div key={item} className="flex items-center gap-2.5 text-sm text-slate-700"><span className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center shrink-0"><Check className="w-3 h-3 text-emerald-600" /></span>{item}</div>)}</div><div className="mt-6 rounded-2xl bg-slate-50 border border-slate-100 p-4 text-xs text-slate-500 leading-5"><strong className="text-slate-700">Not included:</strong> PYQs, PYQ analysis, Semester 2, and the Most Repeated Questions referral reward.</div></div>
              <div className="text-center"><div className="rounded-2xl bg-indigo-50 border border-indigo-100 p-5"><p className="text-4xl font-black text-slate-900">₹349</p><p className="mt-1 text-xs text-slate-500">One-time payment</p></div><button onClick={goToNextStep} className="mt-4 w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white py-4 font-bold text-sm">{user ? "Proceed to Payment" : "Create Account First"}<ArrowRight className="w-4 h-4" /></button>{!user && <p className="mt-3 text-[11px] text-slate-500">You will create your account first. Payment comes next from your dashboard.</p>}</div>
            </div>
          </div>
        </motion.div>

        <div className="mt-8 bg-white border border-slate-200 rounded-3xl p-6 shadow-sm"><h2 className="text-lg font-black text-slate-900 text-center mb-6">Your 5-Step Path</h2><div className="grid sm:grid-cols-5 gap-5">{steps.map((step, i) => <div key={step.label} className="text-center"><div className="mx-auto w-10 h-10 rounded-full bg-indigo-600 text-white flex items-center justify-center"><step.icon className="w-5 h-5" /></div><p className="mt-2 text-xs font-black text-indigo-700">STEP {i + 1}</p><p className="text-sm font-bold text-slate-900">{step.label}</p><p className="text-xs text-slate-500 mt-1 leading-4">{step.desc}</p></div>)}</div></div>
      </div>
<<<<<<< HEAD

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
                Semester 1 Bundle
              </p>
            </div>
            <div className="flex items-center gap-1.5 bg-white/10 px-3 py-1 rounded-full border border-white/20">
              <span className="text-white text-xs font-bold">First Batch</span>
            </div>
          </div>

          <div className="p-8">
            <p className="text-sm text-gray-600 mb-7 leading-relaxed">
              Semester 1 Notes + Most Repeated Topics for eligible Semester 1 theory subjects.
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
                  <span>Top 3 Quiz Winners → <strong>₹299</strong> with exclusive winner access</span>
                </div>
              </div>

              {/* Price + CTA */}
              <div className="flex flex-col items-center justify-center sm:w-52 shrink-0">
                <div className="w-full bg-[#1E40AF]/5 border border-[#1E40AF]/20 rounded-2xl p-5 text-center mb-4">
                  <div className="flex items-baseline justify-center gap-1.5 mb-1">
                    <span className="text-xl font-bold text-gray-500">₹</span>
                    <span className="text-4xl sm:text-5xl font-black text-gray-900" style={{ fontFamily: "var(--font-mono)" }}>349</span>
                    <span className="text-sm font-bold text-gray-400 line-through">₹499</span>
                  </div>
                  <p className="text-[11px] font-bold text-emerald-700">First-Batch Launch Offer</p>
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
              <span>🎓 Know BCA friends?</span>
            </div>
            <p className="text-xs text-slate-700 leading-relaxed max-w-lg">
              Refer 3 friends to BCA Vault. When their purchases are approved, unlock the <strong className="text-slate-900 font-semibold">Semester 1 Most Repeated Questions</strong> pack for free.
            </p>
          </div>
          <button
            onClick={() => navigate("/referral")}
            className="shrink-0 px-4 py-2 bg-white border border-blue-200 text-[#1E40AF] hover:bg-blue-50 text-xs font-bold rounded-xl shadow-xs transition-colors"
          >
            Refer 3 Friends
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
            5-Step Path to Study Materials
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
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

=======
>>>>>>> e36d8cdb47a82807b009a28638d1435b110353f3
    </div>
  );
}
