import { motion } from "motion/react";
import { Star, Quote } from "lucide-react";

const testimonials = [
  {
    name: "Priya Sharma",
    college: "Bharati Vidyapeeth",
    semester: "Semester 1 · 2026–27",
    result: "Scored 82% in finals",
    quote: "BCA Vault transformed how I prepare for exams. The theory-first structure makes it easier to organize my preparation. Worth every rupee!",
    rating: 5,
    avatar: "PS",
    avatarColor: "bg-blue-100 text-blue-700",
  },
  {
    name: "Rohit Verma",
    college: "Bharati Vidyapeeth",
    semester: "Semester 2 · 2026–27",
    result: "Distinction holder",
    quote: "The Complete Theory Bundle saved me so much time and money. The notes are concise, exam-focused, and 100x better than anything I found on Studocu. My whole friend group now uses BCA Vault.",
    rating: 5,
    avatar: "RV",
    avatarColor: "bg-indigo-100 text-indigo-700",
  },
  {
    name: "Anjali Patel",
    college: "Bharati Vidyapeeth",
    semester: "Semester 2 · 2026–27",
    result: "Topped her batch",
    quote: "The unit-wise organization keeps my theory preparation focused and clear.",
    rating: 5,
    avatar: "AP",
    avatarColor: "bg-emerald-100 text-emerald-700",
  },
];

export function Testimonials() {
  return (
    <section className="py-20 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-14"
        >
          <p className="text-sm font-semibold text-[#4F46E5] uppercase tracking-wider mb-3">Student Stories</p>
          <h2 className="text-3xl sm:text-4xl font-bold text-[#111827] mb-4" style={{ fontFamily: 'var(--font-display)' }}>
            Real results from real students
          </h2>
          <p className="text-gray-500 max-w-lg mx-auto">
            Join 2,400+ BCA students who are already scoring better with BCA Vault.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6">
          {testimonials.map((t, i) => (
            <motion.div
              key={t.name}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.15 }}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm p-7 relative hover:shadow-md transition-all duration-300"
            >
              <Quote className="w-8 h-8 text-[#1E40AF]/15 absolute top-6 right-6" />

              <div className="flex mb-4">
                {Array.from({ length: t.rating }).map((_, j) => (
                  <Star key={j} className="w-4 h-4 fill-amber-400 text-amber-400" />
                ))}
              </div>

              <p className="text-gray-700 text-sm leading-relaxed mb-6 relative z-10">
                "{t.quote}"
              </p>

              <div className="flex items-center gap-3 pt-4 border-t border-gray-100">
                <div className={`w-10 h-10 rounded-full ${t.avatarColor} flex items-center justify-center text-sm font-bold shrink-0`}>
                  {t.avatar}
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900" style={{ fontFamily: 'var(--font-display)' }}>{t.name}</p>
                  <p className="text-xs text-gray-500">{t.college} · {t.semester}</p>
                </div>
                <div className="ml-auto">
                  <span className="text-xs font-semibold text-[#10B981] bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">
                    {t.result}
                  </span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Stats Bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-12 grid grid-cols-2 sm:grid-cols-4 gap-6 bg-white rounded-2xl border border-gray-100 shadow-sm p-8"
        >
          {[
            { label: "Students enrolled", value: "2,400+" },
            { label: "Average rating", value: "4.9 / 5" },
            { label: "Notes available", value: "1,200+" },
            { label: "Successful downloads", value: "18,000+" },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <p className="text-2xl font-black text-[#1E40AF] mb-1" style={{ fontFamily: 'var(--font-mono)' }}>
                {stat.value}
              </p>
              <p className="text-sm text-gray-500">{stat.label}</p>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
