import { motion } from "motion/react";
import { Link, useNavigate } from "react-router";
import {
  Gift,
  Share2,
  Users,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  BookOpen,
  FileText,
  ChevronRight
} from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import { Button } from "../ui/button";

export function ReferralPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleCtaClick = () => {
    if (user) {
      navigate("/app/referral");
    } else {
      navigate("/auth/signup");
    }
  };

  const REWARD_SUBJECTS = [
    {
      title: "Foundation of Computing",
      desc: "Top repeated university exam topics, computer architectures, memory hierarchies, and core operating principles.",
      tag: "Semester 1",
    },
    {
      title: "C Programming",
      desc: "Crucial coding patterns, pointers, structures, file handling, and recurrent algorithm questions solved.",
      tag: "Semester 1",
    },
    {
      title: "HTML + CSS + JavaScript",
      desc: "Core web development repeated questions, DOM manipulation, responsive layouts, and modern syntax breakdowns.",
      tag: "Semester 1",
    },
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* ── SECTION 1: HERO ────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-gradient-to-b from-blue-50/70 via-white to-slate-50/50 pt-16 pb-20 sm:pt-24 sm:pb-28">
        <div className="absolute inset-0 bg-[radial-gradient(#1e40af_1px,transparent_1px)] [background-size:24px_24px] opacity-[0.04] pointer-events-none" />
        <div className="max-w-5xl mx-auto px-4 sm:px-6 text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-100/80 border border-blue-200/60 text-[#1E40AF] text-xs font-bold uppercase tracking-wider mb-6 shadow-xs">
              <Gift className="w-3.5 h-3.5 text-[#1E40AF]" />
              Official BCA Vault Referral Program
            </div>

            <h1
              className="text-4xl sm:text-5xl lg:text-6xl font-black text-slate-900 tracking-tight leading-[1.1] mb-6"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Referral rewards are being updated.
            </h1>

            <p className="text-base sm:text-lg lg:text-xl text-slate-600 max-w-2xl mx-auto mb-8 leading-relaxed">
              We are updating the referral program to support rewards only after a referred student’s purchase has been verified.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Button
                size="lg"
                onClick={handleCtaClick}
                className="w-full sm:w-auto bg-[#1E40AF] hover:bg-[#1E3A8A] text-white px-8 py-3.5 rounded-xl font-bold shadow-md shadow-blue-600/20 text-sm flex items-center justify-center gap-2 group transition-all"
              >
                <span>{user ? "Go to Referral Dashboard" : "Start Referring"}</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </Button>

              <Link
                to="/bundles"
                className="w-full sm:w-auto px-6 py-3.5 rounded-xl text-sm font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors inline-flex items-center justify-center gap-1.5"
              >
                <span>Explore Bundles</span>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </Link>
            </div>

            <p className="text-[11px] text-slate-600 mt-4">
              Cash rewards are not active until the updated verified-purchase program is enabled.
            </p>
          </motion.div>
        </div>
      </section>

      {/* ── SECTION 2: HOW IT WORKS ────────────────────────────────── */}
      <section className="py-20 bg-white border-t border-slate-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2
              className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mb-3"
              style={{ fontFamily: "var(--font-display)" }}
            >
              How It Works
            </h2>
            <p className="text-slate-600 text-sm sm:text-base">
              We are rebuilding referral rewards around verified purchases and auditable reward tracking.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            {/* Step 1 */}
            <div className="bg-slate-50/80 rounded-3xl p-7 border border-slate-200/80 relative flex flex-col justify-between hover:border-blue-200 transition-all shadow-xs">
              <div>
                <div className="flex items-center justify-between mb-6">
                  <span
                    className="text-3xl font-black text-blue-600/40"
                    style={{ fontFamily: "var(--font-mono)" }}
                  >
                    01
                  </span>
                  <div className="w-12 h-12 rounded-2xl bg-blue-100 text-[#1E40AF] flex items-center justify-center shadow-xs">
                    <Share2 className="w-5 h-5" />
                  </div>
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">Share Your Identifier</h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Sign in to your BCA Vault student account to copy your student referral identifier (<code className="bg-blue-50 text-blue-800 px-1.5 py-0.5 rounded text-xs font-semibold">&lt;Your Name&gt; DMS</code>) and share it with your BCA friends.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-slate-200/60 text-[11px] text-slate-500 font-medium">
                Available in your Student Dashboard
              </div>
            </div>

            {/* Step 2 */}
            <div className="bg-slate-50/80 rounded-3xl p-7 border border-slate-200/80 relative flex flex-col justify-between hover:border-blue-200 transition-all shadow-xs">
              <div>
                <div className="flex items-center justify-between mb-6">
                  <span
                    className="text-3xl font-black text-blue-600/40"
                    style={{ fontFamily: "var(--font-mono)" }}
                  >
                    02
                  </span>
                  <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center shadow-xs">
                    <Users className="w-5 h-5" />
                  </div>
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">Friends Purchase</h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Your friends enter your student referral identifier during checkout when purchasing the BCA Semester 1 bundle.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-slate-200/60 text-[11px] text-slate-500 font-medium">
                Status updates after admin approval
              </div>
            </div>

            {/* Step 3 */}
            <div className="bg-slate-50/80 rounded-3xl p-7 border border-slate-200/80 relative flex flex-col justify-between hover:border-blue-200 transition-all shadow-xs">
              <div>
                <div className="flex items-center justify-between mb-6">
                  <span
                    className="text-3xl font-black text-emerald-600/40"
                    style={{ fontFamily: "var(--font-mono)" }}
                  >
                    03
                  </span>
                  <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center shadow-xs">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">Verified Purchase Rewards</h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Referral rewards are being updated. No free-content unlock or cash reward is active at this time.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-slate-200/60 text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" /> Rewards launching soon
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── SECTION 3: STUDY RESOURCES ─────────────────────────────── */}
      <section className="py-20 bg-slate-50 border-t border-slate-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 border border-amber-200 text-amber-900 text-xs font-bold uppercase tracking-wider mb-3">
              <Award className="w-3.5 h-3.5 text-amber-700" />
              Study Resources
            </div>
            <h2
              className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mb-3"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Semester 1 Most Repeated Questions
            </h2>
            <p className="text-slate-600 text-sm sm:text-base">
              Explore the Most Repeated Questions resources available for Semester 1. They remain useful study materials, but they are not currently unlocked through referrals.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {REWARD_SUBJECTS.map((item) => (
              <div
                key={item.title}
                className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="bg-blue-50 border border-blue-200/60 text-[#1E40AF] px-2.5 py-0.5 rounded-full text-[11px] font-bold">
                      {item.tag}
                    </span>
                    <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                      High Priority
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-slate-900 mb-2 flex items-start gap-2">
                    <FileText className="w-4 h-4 text-[#1E40AF] shrink-0 mt-1" />
                    <span>{item.title}</span>
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed mb-4">
                    {item.desc}
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center gap-2 text-[11px] font-semibold text-emerald-700">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>Study resource · referral reward not active</span>
                </div>
              </div>
            ))}
          </div>

          {/* Important note */}
          <div className="max-w-2xl mx-auto mt-10 p-4 rounded-2xl bg-blue-50/60 border border-blue-200/70 text-center">
            <p className="text-xs text-slate-700 leading-relaxed">
              <strong className="text-[#1E40AF] font-bold">Referral program update:</strong> Rewards are being rebuilt and are not active yet. These cards describe the study resources only; they do not promise free access, a referral unlock, or a cash payout.
            </p>
          </div>
        </div>
      </section>

      {/* ── SECTION 4: WHY REFER? ──────────────────────────────────── */}
      <section className="py-20 bg-white border-t border-slate-100">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2
              className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mb-3"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Why Participate in the Referral Program?
            </h2>
            <p className="text-slate-600 text-sm sm:text-base">
              Built on fairness, clarity, and real academic value.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-blue-100 text-[#1E40AF] flex items-center justify-center">
                <BookOpen className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Help Your Friends</h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Connect your classmates with verified, exam-tested BCA notes and curated study material that actually saves revision time.
              </p>
            </div>

            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
                <Sparkles className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Study Smarter</h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Explore high-frequency exam questions across core programming and theory modules.
              </p>
            </div>

            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Simple & Transparent</h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Referral activity can be tracked in your portal. Reward eligibility and mechanics will be announced once the updated program launches.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── SECTION 5: FINAL CTA ───────────────────────────────────── */}
      <section className="py-20 bg-gradient-to-br from-[#1E40AF] to-[#1E3A8A] text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
          >
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-white/90 text-xs font-semibold mb-6 border border-white/20">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              Start Sharing Today
            </div>

            <h2
              className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight mb-4 text-white"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Have Friends Preparing for BCA?
            </h2>

            <p className="text-base sm:text-lg text-blue-100 max-w-xl mx-auto mb-8 leading-relaxed">
              Referral rewards are temporarily paused while the verified-purchase reward system is updated.
            </p>

            <Button
              size="lg"
              onClick={handleCtaClick}
              className="bg-white text-[#1E40AF] hover:bg-blue-50 font-bold px-8 py-3.5 rounded-xl shadow-lg hover:shadow-xl transition-all text-sm inline-flex items-center gap-2"
            >
              <span>{user ? "View My Referral Code" : "Get Your Referral Code"}</span>
              <ArrowRight className="w-4 h-4" />
            </Button>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
