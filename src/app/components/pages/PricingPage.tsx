import { useNavigate } from "react-router";
import { motion } from "motion/react";
import { BookOpen, Check, ArrowRight, FileText, HelpCircle, Zap, Star, X as XIcon, Sparkles } from "lucide-react";
import { Button } from "../ui/button";
import { useAuth } from "../auth/AuthContext";

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

const FAQ = [
  ["What is included in the BCA Vault bundle?", "The bundle includes eligible Semester 1 study notes, unit-wise/topic-wise material, and Semester 1 most repeated topics organized for theory exam preparation."],
  ["Are Mathematics, labs and projects included?", "No. Mathematics, lab/practical subjects and projects are currently excluded unless specifically stated for a particular bundle."],
  ["How do I get access?", "Create your account, complete payment from your dashboard, submit payment evidence and wait for manual verification. Once approved, your content becomes available."],
  ["Can I download the notes?", "Access is provided through the BCA Vault learning experience. Content availability and download permissions depend on the specific material and platform policy."],
  ["Who is BCA Vault?", "BCA Vault is an independent student-focused platform providing organised BCA study resources."],
  ["Is BCA Vault officially affiliated with the university?", "No. BCA Vault is an independent student startup project and is not sponsored, owned, operated, endorsed or affiliated with Bharati Vidyapeeth University, its faculty, departments or administration."],
];

export function PricingPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const go = () => navigate(user ? "/purchase" : "/auth/signup");

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="max-w-4xl mx-auto px-4 pt-16 pb-10 text-center">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
          <p className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 border border-blue-100 rounded-full text-xs font-bold text-[#1E40AF] uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            <span>First-Batch Student Edition</span>
          </p>
          <h1 className="text-4xl sm:text-5xl font-black text-gray-900 mt-5 mb-4" style={{ fontFamily: "var(--font-display)" }}>
            Semester 1 Bundle
          </h1>
          <p className="text-gray-600 max-w-xl mx-auto">
            Complete theory preparation bundle for eligible Semester 1 theory subjects.
          </p>
        </motion.div>
      </div>

      <div className="max-w-lg mx-auto px-4 pb-16">
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-3xl border-2 border-[#1E40AF] shadow-xl overflow-hidden">
          <div className="bg-gradient-to-r from-[#1E40AF] to-[#4F46E5] px-6 py-4 text-center text-white font-bold">
            First-Batch Introductory Pricing
          </div>
          <div className="p-8">
            <div className="text-center mb-6">
              <div className="w-16 h-16 rounded-2xl bg-[#1E40AF]/10 flex items-center justify-center mx-auto mb-4">
                <BookOpen className="w-8 h-8 text-[#1E40AF]" />
              </div>
              <p className="text-xs font-bold text-[#1E40AF] uppercase tracking-widest">BCA Vault</p>
              <h2 className="text-2xl font-black text-gray-900" style={{ fontFamily: "var(--font-display)" }}>Semester 1 Bundle</h2>
              <p className="text-sm text-gray-500">Semester 1 Notes + Most Repeated Topics</p>
            </div>
            <div className="text-center mb-6 py-5 border-y border-gray-100">
              <p className="text-5xl font-black text-gray-900" style={{ fontFamily: "var(--font-mono)" }}>₹100</p>
              <p className="text-xs text-gray-400 mt-2">One-time payment · Semester 1 access</p>
            </div>
            <div className="space-y-3 mb-6">
              {INCLUDES.map((item) => (
                <div key={item} className="flex items-center gap-3">
                  <span className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                    <Check className="w-3 h-3 text-emerald-600" />
                  </span>
                  <span className="text-sm text-gray-700">{item}</span>
                </div>
              ))}
            </div>
            <div className="bg-gray-50 rounded-xl px-4 py-3 mb-8">
              <p className="text-xs font-semibold text-gray-500 mb-2 uppercase">Not Included</p>
              <div className="flex flex-wrap gap-2">
                {EXCLUDES.map((item) => (
                  <span key={item} className="inline-flex items-center gap-1 text-xs text-gray-500 bg-white border border-gray-200 px-2.5 py-1 rounded-full">
                    <XIcon className="w-3 h-3" />
                    {item}
                  </span>
                ))}
              </div>
            </div>
            <Button onClick={go} className="w-full h-14 bg-[#1E40AF] hover:bg-[#1E3A8A] text-white rounded-2xl gap-2 font-bold cursor-pointer shadow-md">
              <span>{user ? "Proceed to Payment" : "Create Account First"}</span>
              <ArrowRight className="w-4 h-4" />
            </Button>
            {!user && (
              <p className="text-center text-xs text-gray-400 mt-3">
                Create your account first. Payment comes next from your dashboard.
              </p>
            )}
          </div>
        </motion.div>

        <div className="mt-8 grid grid-cols-3 gap-4">
          {[
            { icon: FileText, label: "Theory Notes", sub: "Semester 1" },
            { icon: Zap, label: "Most Repeated", sub: "Core Topics" },
            { icon: Star, label: "High Yield", sub: "Exam Format" },
          ].map((item) => (
            <div key={item.label} className="bg-white rounded-2xl border border-gray-100 p-4 text-center">
              <item.icon className="w-4 h-4 text-[#1E40AF] mx-auto mb-2" />
              <p className="text-xs font-bold">{item.label}</p>
              <p className="text-xs text-gray-400">{item.sub}</p>
            </div>
          ))}
        </div>

        <div className="mt-12">
          <div className="flex items-center gap-2 mb-6">
            <HelpCircle className="w-5 h-5 text-[#1E40AF]" />
            <h3 className="text-lg font-bold">Frequently Asked Questions</h3>
          </div>
          <div className="space-y-4">
            {FAQ.map(([q, a]) => (
              <div key={q} className="bg-white rounded-2xl border border-gray-100 p-5 shadow-xs">
                <p className="text-sm font-semibold text-gray-900 mb-2">{q}</p>
                <p className="text-sm text-gray-500 leading-relaxed">{a}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
