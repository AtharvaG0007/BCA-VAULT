import { useNavigate } from "react-router";
import { motion } from "motion/react";
import {
  BookOpen, Check, X as XIcon, ArrowRight,
  FileText, HelpCircle, Zap, Star, Trophy, Sparkles
} from "lucide-react";
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

const faqs = [
  {
    q: "What is included in the BCA Vault bundle?",
    a: "The bundle includes eligible Semester 1 study notes, unit-wise/topic-wise material, and Semester 1 most repeated topics organized for theory exam preparation.",
  },
  {
    q: "Are Mathematics, labs and projects included?",
    a: "No. Mathematics, lab/practical subjects and projects are currently excluded unless specifically stated for a particular bundle.",
  },
  {
    q: "How do I get access?",
    a: "Create/login to your account, complete payment, submit your payment evidence and wait for manual verification. Once approved, your content will appear in My Library.",
  },
  {
    q: "Can I download the notes?",
    a: "Access is provided through the BCA Vault learning experience. Content availability and download permissions depend on the specific material and platform policy.",
  },
  {
    q: "Who is BCA Vault?",
    a: "BCA Vault is an independent student-focused platform providing organised BCA study resources.",
  },
  {
    q: "Is BCA Vault officially affiliated with the university?",
    a: "No. BCA Vault is an independent student startup project and is not sponsored, owned, operated, endorsed or affiliated with Bharati Vidyapeeth University, its faculty, departments or administration.",
  },
];

export function PricingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Header */}
      <div className="max-w-4xl mx-auto px-4 pt-16 pb-10 text-center">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-100 rounded-full mb-6">
            <Sparkles className="w-3.5 h-3.5 text-[#1E40AF]" />
            <span className="text-xs font-bold text-[#1E40AF] uppercase tracking-wider">First-Batch Student Edition</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-black text-gray-900 mb-4" style={{ fontFamily: "var(--font-display)" }}>
            First-Batch Student Offer
          </h1>
          <p className="text-gray-600 text-base sm:text-lg max-w-xl mx-auto leading-relaxed">
            Complete theory preparation bundle for eligible Semester 1 theory subjects.
          </p>
        </motion.div>
      </div>

      {/* Single Bundle Card */}
      <div className="max-w-lg mx-auto px-4 pb-16">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-3xl border-2 border-[#1E40AF] shadow-xl shadow-blue-100 overflow-hidden"
        >
          {/* Top bar */}
          <div className="bg-gradient-to-r from-[#1E40AF] to-[#4F46E5] px-6 py-4 text-center">
            <p className="text-white text-sm font-bold tracking-wide">First-Batch Introductory Pricing</p>
          </div>

          <div className="p-8">
            {/* Product title */}
            <div className="text-center mb-6">
              <div className="w-16 h-16 rounded-2xl bg-[#1E40AF]/10 flex items-center justify-center mx-auto mb-4">
                <BookOpen className="w-8 h-8 text-[#1E40AF]" />
              </div>
              <p className="text-xs font-bold text-[#1E40AF] uppercase tracking-widest mb-1">BCA Vault</p>
              <h2 className="text-2xl font-black text-gray-900 mb-1" style={{ fontFamily: "var(--font-display)" }}>
                Semester 1 Bundle
              </h2>
              <p className="text-sm text-gray-500">Semester 1 Notes + Most Repeated Topics</p>
            </div>

            {/* Price */}
            <div className="text-center mb-6 py-5 border-y border-gray-100">
              <div className="flex items-baseline justify-center gap-2">
                <span className="text-2xl font-bold text-slate-400">₹</span>
                <span className="text-5xl sm:text-6xl font-black text-gray-900" style={{ fontFamily: "var(--font-mono)" }}>349</span>
                <span className="text-lg font-bold text-gray-400 line-through">₹499</span>
              </div>
              <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3.5 py-1 text-xs font-bold text-emerald-700 border border-emerald-200">
                <span>First-Batch Launch Offer</span>
              </div>
              <p className="text-xs text-gray-400 mt-2">One-time payment · Semester 1 Complete Access</p>

              {/* Quiz winner info */}
              <div className="mt-4 flex items-center justify-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900">
                <Trophy className="h-4 w-4 text-amber-600 shrink-0" />
                <span>Top 3 Quiz Winners → <strong>₹299</strong> with exclusive winner access</span>
              </div>
            </div>

            {/* Includes */}
            <div className="space-y-3 mb-6">
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
            <div className="bg-gray-50 rounded-xl px-4 py-3 mb-8">
              <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">Not Included</p>
              <div className="flex flex-wrap gap-2">
                {EXCLUDES.map((item) => (
                  <span key={item} className="inline-flex items-center gap-1 text-xs text-gray-500 bg-white border border-gray-200 px-2.5 py-1 rounded-full">
                    <XIcon className="w-3 h-3 text-gray-400" /> {item}
                  </span>
                ))}
              </div>
            </div>

            <Button
              onClick={() => navigate("/purchase")}
              className="w-full h-14 bg-[#1E40AF] hover:bg-[#1E3A8A] text-white rounded-2xl gap-2 font-bold shadow-md shadow-blue-200"
            >
              Get First-Batch Access
              <ArrowRight className="w-4 h-4" />
            </Button>

            <p className="text-center text-xs text-gray-400 mt-3">
              Manual payment verification · Access within 24h
            </p>
          </div>
        </motion.div>

        {/* What you get summary */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-8 grid grid-cols-3 gap-4"
        >
          {[
            { icon: FileText, label: "Theory Notes", sub: "Semester 1" },
            { icon: Zap,      label: "Most Repeated", sub: "Core Topics" },
            { icon: Star,     label: "High Yield", sub: "Exam Format" },
          ].map((item) => (
            <div key={item.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-center">
              <div className="w-9 h-9 rounded-xl bg-[#1E40AF]/10 flex items-center justify-center mx-auto mb-2">
                <item.icon className="w-4 h-4 text-[#1E40AF]" />
              </div>
              <p className="text-xs font-bold text-gray-900">{item.label}</p>
              <p className="text-xs text-gray-400">{item.sub}</p>
            </div>
          ))}
        </motion.div>

        {/* FAQ */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="mt-12"
        >
          <div className="flex items-center gap-2 mb-6">
            <HelpCircle className="w-5 h-5 text-[#1E40AF]" />
            <h3 className="text-lg font-bold text-gray-900" style={{ fontFamily: "var(--font-display)" }}>
              Frequently Asked Questions
            </h3>
          </div>
          <div className="space-y-4">
            {faqs.map((faq) => (
              <div key={faq.q} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <p className="text-sm font-semibold text-gray-900 mb-2">{faq.q}</p>
                <p className="text-sm text-gray-500 leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
