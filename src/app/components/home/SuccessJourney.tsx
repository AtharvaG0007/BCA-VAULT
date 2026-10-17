import { motion } from "motion/react";
import { BookOpen, FileText, BarChart3, Zap, Sparkles, RefreshCw, ArrowRight } from "lucide-react";
import { Link } from "react-router";

const valueCards = [
  {
    id: "01",
    icon: BookOpen,
    tag: "Core Material",
    title: "Semester 1 Theory Notes",
    description: "Study organised unit-wise and topic-wise theory material.",
    accentBg: "bg-[#1E40AF]",
    accentText: "text-[#1E40AF]",
    cardBg: "bg-blue-50/70",
    border: "border-blue-100",
  },
  {
    id: "02",
    icon: FileText,
    tag: "Syllabus Structure",
    title: "Unit-Wise Coverage",
    description: "Comprehensive notes aligned with official university units.",
    accentBg: "bg-[#4F46E5]",
    accentText: "text-[#4F46E5]",
    cardBg: "bg-indigo-50/70",
    border: "border-indigo-100",
  },
  {
    id: "03",
    icon: BarChart3,
    tag: "Exam Focus",
    title: "Most Repeated Topics",
    description: "Identify high-priority exam topics instead of preparing blindly.",
    accentBg: "bg-[#059669]",
    accentText: "text-[#059669]",
    cardBg: "bg-emerald-50/70",
    border: "border-emerald-100",
  },
  {
    id: "04",
    icon: Zap,
    tag: "Smart Revision",
    title: "High-Yield Concepts",
    description: "Focus revision on core concepts that appear repeatedly in examinations.",
    accentBg: "bg-[#D97706]",
    accentText: "text-[#D97706]",
    cardBg: "bg-amber-50/70",
    border: "border-amber-100",
  },
  {
    id: "05",
    icon: Sparkles,
    tag: "Exam Ready",
    title: "Important Definitions & Code",
    description: "Definitions, syntax, and theoretical concepts clearly explained.",
    accentBg: "bg-[#7C3AED]",
    accentText: "text-[#7C3AED]",
    cardBg: "bg-purple-50/70",
    border: "border-purple-100",
  },
  {
    id: "06",
    icon: RefreshCw,
    tag: "Ongoing Access",
    title: "Regular Updates",
    description: "Keep your preparation material updated as new useful content is added.",
    accentBg: "bg-[#0284C7]",
    accentText: "text-[#0284C7]",
    cardBg: "bg-sky-50/70",
    border: "border-sky-100",
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
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#4F46E5] mb-3">
            What's Inside The Vault
          </p>
          <h2
            className="text-3xl sm:text-4xl font-black text-[#111827] mb-4"
            style={{ fontFamily: "var(--font-display)" }}
          >
            What You’re Actually Getting
          </h2>
          <p className="text-gray-500 max-w-xl mx-auto text-sm sm:text-base leading-relaxed">
            Benefit-focused study material designed specifically for BCA theory exams.
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {valueCards.map((card, i) => {
            const Icon = card.icon;
            return (
              <motion.div
                key={card.id}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="relative flex flex-col"
              >
                <div
                  className={`${card.cardBg} rounded-2xl border ${card.border} p-6 flex flex-col flex-1 hover:shadow-md transition-shadow`}
                >
                  <div className="flex items-center justify-between mb-4">
                    <div
                      className={`w-12 h-12 rounded-xl ${card.accentBg} flex items-center justify-center shadow-md`}
                    >
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <span
                      className={`text-xs font-black uppercase tracking-wider ${card.accentText}`}
                      style={{ fontFamily: "var(--font-mono)" }}
                    >
                      {card.id}
                    </span>
                  </div>

                  <p
                    className={`text-[11px] font-bold uppercase tracking-wider ${card.accentText} mb-1.5`}
                  >
                    {card.tag}
                  </p>
                  <h3
                    className="text-lg font-bold text-gray-900 mb-2"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    {card.title}
                  </h3>
                  <p className="text-gray-600 text-sm leading-relaxed flex-1">
                    {card.description}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Bottom CTA strip */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-14 flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50 rounded-3xl border border-slate-200 px-8 py-6"
        >
          <div>
            <p className="font-bold text-gray-900 text-base sm:text-lg" style={{ fontFamily: "var(--font-display)" }}>
              First-Batch Student Offer is Active
            </p>
            <p className="text-sm text-gray-500 mt-0.5">
              Get complete access for eligible Semester 1 theory subjects for ₹199.
            </p>
          </div>
          <Link
            to="/purchase"
            className="shrink-0 inline-flex items-center gap-2 px-6 py-3.5 bg-[#1E40AF] hover:bg-[#1E3A8A] text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-200"
          >
            Get First-Batch Access
            <ArrowRight className="w-4 h-4" />
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
