import { motion } from "motion/react";
import { FileX, Search, Clock, AlertCircle, TrendingDown } from "lucide-react";

const problems = [
  {
    icon: FileX,
    tag: "Quality",
    title: "Unreliable notes from Telegram groups",
    body: "Outdated, incomplete, sometimes completely wrong. Shared by seniors who were also guessing the syllabus.",
    color: "text-red-400",
    bg: "bg-red-500/10",
    border: "border-red-500/20",
  },
  {
    icon: Search,
    tag: "Strategy",
    title: "No idea what actually comes in exams",
    body: "Studying everything equally, not knowing which 20% of topics deliver 80% of marks in BVP exams.",
    color: "text-orange-400",
    bg: "bg-orange-500/10",
    border: "border-orange-500/20",
  },
  {
    icon: Clock,
    tag: "Timing",
    title: "Wrong content, 72 hours before exams",
    body: "You realise your notes don't match BVP's question pattern. Too late to change course.",
    color: "text-amber-400",
    bg: "bg-amber-500/10",
    border: "border-amber-500/20",
  },
  {
    icon: AlertCircle,
    tag: "PYQ",
    title: "PYQ papers with zero guidance",
    body: "Raw question dumps. No answers, no analysis of what repeats yearly, no pattern recognition.",
    color: "text-violet-400",
    bg: "bg-violet-500/10",
    border: "border-violet-500/20",
  },
  {
    icon: TrendingDown,
    tag: "Results",
    title: "Hard work, average results",
    body: "12-hour study days, average scores. Because effort without the right strategy is just noise.",
    color: "text-pink-400",
    bg: "bg-pink-500/10",
    border: "border-pink-500/20",
  },
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
          {/* Left: Sticky Headline */}
          <motion.div
            initial={{ opacity: 0, x: -24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="lg:sticky lg:top-24"
          >
            <span className="inline-flex items-center gap-2 text-xs font-bold text-red-400 uppercase tracking-widest mb-6 px-3 py-1.5 bg-red-500/10 rounded-full border border-red-500/20">
              The Problem
            </span>
            <h2
              className="text-4xl sm:text-5xl font-black text-white mb-6 leading-[1.1]"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Every BCA student fights the same battle.
            </h2>
            <p className="text-slate-400 text-lg leading-relaxed mb-8 max-w-sm">
              BVP exams are specific. The resources floating around aren't. Most students discover this too late — usually 72 hours before their finals.
            </p>
            <div className="flex items-center gap-4 p-5 bg-white/5 rounded-2xl border border-white/10">
              <div
                className="text-4xl font-black text-white shrink-0"
                style={{ fontFamily: "var(--font-mono)" }}
              >
                68%
              </div>
              <p className="text-sm text-slate-400 leading-relaxed">
                of BCA students say they studied the wrong topics for at least one exam in their degree.
              </p>
            </div>

            <div className="mt-6 p-5 bg-gradient-to-r from-[#1E40AF]/20 to-[#4F46E5]/20 rounded-2xl border border-[#4F46E5]/30">
              <p className="text-white font-semibold mb-1">
                BCA Vault was built to solve all of this.
              </p>
              <p className="text-slate-400 text-sm">
                Study smarter. Score better. No more guesswork.
              </p>
            </div>
          </motion.div>

          {/* Right: Problem Cards */}
          <div className="space-y-3">
            {problems.map((p, i) => {
              const Icon = p.icon;
              return (
                <motion.div
                  key={p.tag}
                  initial={{ opacity: 0, x: 24 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.09 }}
                  className={`flex items-start gap-4 p-4 rounded-xl border ${p.border} ${p.bg} hover:scale-[1.01] transition-transform duration-200 cursor-default`}
                >
                  <div className="w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center shrink-0">
                    <Icon className={`w-4 h-4 ${p.color}`} />
                  </div>
                  <div>
                    <span className={`text-[10px] font-bold uppercase tracking-wider ${p.color} opacity-60`}>
                      {p.tag}
                    </span>
                    <p className="text-sm font-semibold text-white mt-0.5 mb-1">{p.title}</p>
                    <p className="text-xs text-slate-500 leading-relaxed">{p.body}</p>
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
