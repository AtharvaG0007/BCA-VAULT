import { motion } from "motion/react";
import { FileX, Search, Clock, AlertCircle, CheckCircle2 } from "lucide-react";

const problems = [
  {
    icon: FileX,
    tag: "Fragmented Notes",
    title: "Collecting notes from scattered groups",
    body: "Incomplete, unstructured PDF dumps shared across random chat groups right before exams.",
    color: "text-red-400",
    bg: "bg-red-500/10",
    border: "border-red-500/20",
  },
  {
    icon: Search,
    tag: "Question Uncertainty",
    title: "Not knowing which topics actually repeat",
    body: "Studying hundreds of pages without knowing the question patterns that appear year after year.",
    color: "text-orange-400",
    bg: "bg-orange-500/10",
    border: "border-orange-500/20",
  },
  {
    icon: Clock,
    tag: "Time Crunch",
    title: "Wasting hours organizing instead of revising",
    body: "Spending precious revision time searching for syllabus-aligned materials rather than studying.",
    color: "text-amber-400",
    bg: "bg-amber-500/10",
    border: "border-amber-500/20",
  },
  {
    icon: AlertCircle,
    tag: "Unanalyzed PYQs",
    title: "Raw question papers without structured breakdown",
    body: "Browsing old papers without knowing topic-wise weightage or standard exam model answers.",
    color: "text-violet-400",
    bg: "bg-violet-500/10",
    border: "border-violet-500/20",
  },
];

const highlights = [
  "Theory Notes",
  "Unit-Wise Preparation",
  "Previous Year Questions",
  "PYQ Analysis",
  "Most Repeated Questions",
  "Important Exam Topics",
  "Exam-Oriented Preparation",
  "Regular Content Updates",
];

export function StudentProblems() {
  return (
    <section className="py-24 bg-[#070B14] relative overflow-hidden">
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <div className="grid lg:grid-cols-2 gap-16 items-start">
          {/* Left: Headline & Solution Breakdown */}
          <motion.div
            initial={{ opacity: 0, x: -24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="lg:sticky lg:top-24"
          >
            <span className="inline-flex items-center gap-2 text-xs font-bold text-indigo-400 uppercase tracking-widest mb-6 px-3 py-1.5 bg-indigo-500/10 rounded-full border border-indigo-500/20">
              Exam Preparation Solved
            </span>
            <h2
              className="text-4xl sm:text-5xl font-black text-white mb-6 leading-[1.1]"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Stop Searching. Start Studying.
            </h2>
            <p className="text-slate-300 text-base leading-relaxed mb-4">
              Preparing for exams often means collecting notes from different groups, searching old PYQs and trying to understand which questions actually matter.
            </p>
            <p className="text-slate-400 text-sm leading-relaxed mb-8">
              BCA Vault brings your theory preparation together in one organised place.
            </p>

            {/* 8 Core Highlights */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 p-5 bg-white/5 rounded-2xl border border-white/10">
              {highlights.map((item) => (
                <div key={item} className="flex items-center gap-2 text-xs font-semibold text-slate-200">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{item}</span>
                </div>
              ))}
            </div>

            <div className="mt-6 p-5 bg-gradient-to-r from-[#1E40AF]/20 to-[#4F46E5]/20 rounded-2xl border border-[#4F46E5]/30">
              <p className="text-white font-semibold mb-1">
                Everything in one place. No more guessing.
              </p>
              <p className="text-slate-400 text-xs">
                Unit-wise theory notes, previous year question trends, and exam-focused revision.
              </p>
            </div>
          </motion.div>

          {/* Right: Problem Cards */}
          <div className="space-y-3.5">
            {problems.map((p, i) => {
              const Icon = p.icon;
              return (
                <motion.div
                  key={p.tag}
                  initial={{ opacity: 0, x: 24 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.09 }}
                  className={`flex items-start gap-4 p-5 rounded-2xl border ${p.border} ${p.bg} hover:scale-[1.01] transition-transform duration-200 cursor-default`}
                >
                  <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center shrink-0">
                    <Icon className={`w-5 h-5 ${p.color}`} />
                  </div>
                  <div>
                    <span className={`text-[10px] font-bold uppercase tracking-wider ${p.color} opacity-80`}>
                      {p.tag}
                    </span>
                    <p className="text-sm font-bold text-white mt-0.5 mb-1">{p.title}</p>
                    <p className="text-xs text-slate-400 leading-relaxed">{p.body}</p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
