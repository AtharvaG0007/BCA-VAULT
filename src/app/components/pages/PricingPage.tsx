import { useNavigate } from "react-router";
import { motion } from "motion/react";
import {
  BookOpen, Check, X as XIcon, ArrowRight,
  FileText, HelpCircle, Zap, Star,
} from "lucide-react";
import { Button } from "../ui/button";

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

const faqs = [
  {
    q: "What subjects are included?",
    a: "Eligible Semester 1 and Semester 2 theory subjects under BCA Syllabus 2026–27 — Mathematics, lab/practical work and projects are excluded.",
  },
  {
    q: "How do I get access after payment?",
    a: "After you pay and submit payment evidence in BCA Vault, our admin verifies your payment within a few hours and manually authorizes your account. The bundle then appears in your My Library.",
  },
  {
    q: "Is there a refund policy?",
    a: "Due to the digital nature of our materials, we do not offer refunds after access has been granted. Contact support if you face any issues.",
  },
  {
    q: "Which semesters are included?",
    a: "The Complete Theory Bundle currently includes theory-focused preparation for Semester 1 and Semester 2. Semesters 3–8 are Coming Soon.",
  },
  {
    q: "Will the content be updated?",
    a: "Yes. We regularly add new content and update existing materials. Once you have the bundle, you get all future updates too.",
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
            <BookOpen className="w-3.5 h-3.5 text-[#1E40AF]" />
            <span className="text-xs font-semibold text-[#1E40AF]">One Bundle. Complete Theory.</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-black text-gray-900 mb-4" style={{ fontFamily: "var(--font-display)" }}>
            Simple, Honest Pricing
          </h1>
          <p className="text-gray-500 text-lg max-w-xl mx-auto">
            One product. One price. Everything you need to ace your BCA theory exams.
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
            <div className="flex items-center justify-center gap-2 mb-1">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-4 h-4 fill-amber-300 text-amber-300" />
              ))}
            </div>
            <p className="text-white/80 text-sm font-medium">Most Complete Study Resource for BCA</p>
          </div>

          <div className="p-8">
            {/* Product title */}
            <div className="text-center mb-8">
              <div className="w-16 h-16 rounded-2xl bg-[#1E40AF]/10 flex items-center justify-center mx-auto mb-4">
                <BookOpen className="w-8 h-8 text-[#1E40AF]" />
              </div>
              <p className="text-xs font-bold text-[#1E40AF] uppercase tracking-widest mb-1">BCA Vault</p>
              <h2 className="text-2xl font-black text-gray-900 mb-1" style={{ fontFamily: "var(--font-display)" }}>
                Complete Theory Bundle
              </h2>
              <p className="text-sm text-gray-500">Theory Notes + PYQs + Most Repeated Questions</p>
            </div>

            {/* Price */}
            <div className="text-center mb-8 py-6 border-y border-gray-100">
              <div className="flex items-baseline justify-center gap-2">
                <span className="text-2xl font-bold text-slate-400">₹</span>
                <span className="text-5xl sm:text-6xl font-black text-gray-900" style={{ fontFamily: "var(--font-mono)" }}>499</span>
                <span className="text-lg font-bold text-gray-400 line-through">₹899</span>
              </div>
              <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 border border-emerald-200">
                <span>Use coupon code <strong>BUDMS400</strong> at checkout</span>
              </div>
              <p className="text-xs text-gray-400 mt-2">One-time payment · Semester 1 & 2 Complete Access</p>
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
              className="w-full h-14 bg-[#1E40AF] hover:bg-[#1E3A8A] text-white rounded-2xl gap-2"
            >
              Get Complete Bundle
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
            { icon: FileText, label: "Theory Notes", sub: "Semester 1 & 2" },
            { icon: Zap,      label: "PYQ Papers",   sub: "With Analysis" },
            { icon: Star,     label: "Most Repeated", sub: "Questions" },
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
              Common Questions
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
