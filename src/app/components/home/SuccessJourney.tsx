import { motion } from "motion/react";

const stages = [
  {
    id: "01",
    phase: "Day 1",
    title: "Sign Up & Explore",
    description:
      "Browse notes, PYQs, and bundles tailored for your BVP semester. Download your first resource in under 2 minutes.",
    metric: "< 2 min",
    metricLabel: "Time to first download",
    accentBg: "bg-[#1E40AF]",
    accentText: "text-[#1E40AF]",
    cardBg: "bg-blue-50",
    border: "border-blue-100",
  },
  {
    id: "02",
    phase: "Week 1",
    title: "Study with Focus",
    description:
      "BVP-curated notes by toppers. Every resource highlights what's high-weightage and what to skip entirely.",
    metric: "40%",
    metricLabel: "Less time wasted",
    accentBg: "bg-[#4F46E5]",
    accentText: "text-[#4F46E5]",
    cardBg: "bg-indigo-50",
    border: "border-indigo-100",
  },
  {
    id: "03",
    phase: "Exam Week",
    title: "Predict the Paper",
    description:
      "PYQ frequency analysis shows exactly which topics appear every year. Study those first, with full confidence.",
    metric: "8 / 10",
    metricLabel: "Questions predicted",
    accentBg: "bg-[#10B981]",
    accentText: "text-[#10B981]",
    cardBg: "bg-emerald-50",
    border: "border-emerald-100",
  },
  {
    id: "04",
    phase: "Results",
    title: "Score Beyond Expectation",
    description:
      "Students using BCA Vault consistently outperform their previous semester. The data speaks for itself.",
    metric: "+18%",
    metricLabel: "Average score increase",
    accentBg: "bg-[#F59E0B]",
    accentText: "text-[#D97706]",
    cardBg: "bg-amber-50",
    border: "border-amber-100",
  },
];

export function SuccessJourney() {
  return (
    <section className="py-24 bg-white overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <p className="text-sm font-semibold text-[#4F46E5] uppercase tracking-wider mb-3">
            Your Transformation
          </p>
          <h2
            className="text-3xl sm:text-4xl font-black text-[#111827] mb-4"
            style={{ fontFamily: "var(--font-display)" }}
          >
            From confused to confident — the BCA Vault path
          </h2>
          <p className="text-gray-500 max-w-lg mx-auto">
            Over 2,400 BCA students have followed this exact journey. Here's how it unfolds.
          </p>
        </motion.div>

        <div className="relative">
          {/* Connecting line — desktop */}
          <div className="hidden lg:block absolute top-8 left-[calc(12.5%+2rem)] right-[calc(12.5%+2rem)] h-px bg-gradient-to-r from-blue-200 via-indigo-200 via-emerald-200 to-amber-200" />

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {stages.map((stage, i) => (
              <motion.div
                key={stage.id}
                initial={{ opacity: 0, y: 28 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.13 }}
                className="relative flex flex-col"
              >
                {/* Stage badge */}
                <div className="flex lg:justify-center mb-5 relative z-10">
                  <div
                    className={`w-16 h-16 rounded-2xl ${stage.accentBg} flex items-center justify-center shadow-lg`}
                  >
                    <span
                      className="text-xl font-black text-white"
                      style={{ fontFamily: "var(--font-mono)" }}
                    >
                      {stage.id}
                    </span>
                  </div>
                </div>

                {/* Content card */}
                <div
                  className={`${stage.cardBg} rounded-2xl border ${stage.border} p-5 flex flex-col flex-1`}
                >
                  <p
                    className={`text-xs font-bold uppercase tracking-wider ${stage.accentText} mb-2`}
                  >
                    {stage.phase}
                  </p>
                  <h3
                    className="font-bold text-gray-900 mb-2"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    {stage.title}
                  </h3>
                  <p className="text-gray-500 text-sm leading-relaxed flex-1">
                    {stage.description}
                  </p>
                  <div className={`mt-5 pt-4 border-t ${stage.border}`}>
                    <p
                      className={`text-2xl font-black ${stage.accentText}`}
                      style={{ fontFamily: "var(--font-mono)" }}
                    >
                      {stage.metric}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">{stage.metricLabel}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Bottom CTA strip */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-12 flex flex-col sm:flex-row items-center justify-between gap-4 bg-gray-50 rounded-2xl border border-gray-100 px-8 py-6"
        >
          <div>
            <p className="font-bold text-gray-900" style={{ fontFamily: "var(--font-display)" }}>
              Ready to start your journey?
            </p>
            <p className="text-sm text-gray-500 mt-0.5">
              Join 2,400+ BCA students already studying smarter.
            </p>
          </div>
          <a
            href="/auth/login"
            className="shrink-0 inline-flex items-center gap-2 px-6 py-3 bg-[#1E40AF] hover:bg-[#1E3A8A] text-white rounded-xl text-sm font-semibold transition-colors"
          >
            Get Started Free
          </a>
        </motion.div>
      </div>
    </section>
  );
}
