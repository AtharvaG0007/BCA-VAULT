import { motion } from "motion/react";
import { useNavigate } from "react-router";
import { ArrowRight, BookOpen, Check, Clock, ShieldCheck, UserCheck, ShoppingBag } from "lucide-react";
import { useAuth } from "../auth/AuthContext";

const includes = ["Semester 1 BCA Study Notes", "Semester 1 Most Repeated Topics", "Unit-Wise & Topic-Wise Theory Notes", "Exam-Oriented Preparation Format", "Regular Content Updates"];
const steps = [
  { icon: UserCheck, label: "Create Account", desc: "Create your student account" },
  { icon: ShoppingBag, label: "Purchase Bundle", desc: "Pay ₹499 from your dashboard" },
  { icon: Clock, label: "Payment Reviewed", desc: "Admin verifies your payment" },
  { icon: ShieldCheck, label: "Access Activated", desc: "Materials unlock after approval" },
  { icon: BookOpen, label: "Start Studying", desc: "Open your Semester 1 materials" },
];

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
              <div className="text-center"><div className="rounded-2xl bg-indigo-50 border border-indigo-100 p-5"><p className="text-4xl font-black text-slate-900">₹499</p><p className="mt-1 text-xs text-slate-500">One-time payment</p></div><button onClick={goToNextStep} className="mt-4 w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white py-4 font-bold text-sm">{user ? "Proceed to Payment" : "Create Account First"}<ArrowRight className="w-4 h-4" /></button>{!user && <p className="mt-3 text-[11px] text-slate-500">You will create your account first. Payment comes next from your dashboard.</p>}</div>
            </div>
          </div>
        </motion.div>

        <div className="mt-8 bg-white border border-slate-200 rounded-3xl p-6 shadow-sm"><h2 className="text-lg font-black text-slate-900 text-center mb-6">Your 5-Step Path</h2><div className="grid sm:grid-cols-5 gap-5">{steps.map((step, i) => <div key={step.label} className="text-center"><div className="mx-auto w-10 h-10 rounded-full bg-indigo-600 text-white flex items-center justify-center"><step.icon className="w-5 h-5" /></div><p className="mt-2 text-xs font-black text-indigo-700">STEP {i + 1}</p><p className="text-sm font-bold text-slate-900">{step.label}</p><p className="text-xs text-slate-500 mt-1 leading-4">{step.desc}</p></div>)}</div></div>
      </div>
    </div>
  );
}
