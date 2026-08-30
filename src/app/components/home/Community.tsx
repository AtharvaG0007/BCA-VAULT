import { BookOpenCheck, ShieldCheck, FileCheck, Lock, RefreshCw, Sparkles, CheckCircle2 } from "lucide-react";

const trustPoints = [
  {
    icon: BookOpenCheck,
    title: "Exam-Oriented Material",
    detail: "Syllabus-aligned units designed specifically around BCA theory exam formats.",
  },
  {
    icon: FileCheck,
    title: "Organised Study Resources",
    detail: "Notes, previous year questions, and repeated questions brought together in one place.",
  },
  {
    icon: Sparkles,
    title: "PYQ-Based Preparation",
    detail: "Pattern recognition and question analysis derived from actual past papers.",
  },
  {
    icon: ShieldCheck,
    title: "Manual Payment Verification",
    detail: "Every transaction is securely verified by our team before access authorization.",
  },
  {
    icon: Lock,
    title: "Secure Student Access",
    detail: "Protected student library access with secure in-app reading sessions.",
  },
  {
    icon: RefreshCw,
    title: "Regular Content Improvements",
    detail: "Continuous content refinement and updates for our active first-batch students.",
  },
];

export function Community() {
  return (
    <section className="bg-slate-50 py-20 sm:py-28 border-t border-slate-200">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold uppercase tracking-wider mb-3">
            <CheckCircle2 className="w-3.5 h-3.5" /> Honest Study Standards
          </div>
          <h2 className="text-3xl font-black tracking-[-0.025em] text-slate-950 sm:text-4xl" style={{ fontFamily: "var(--font-display)" }}>
            Built for Students. Focused on Exams.
          </h2>
          <p className="mt-3 text-sm sm:text-base text-slate-500 leading-relaxed">
            No inflated claims, no artificial shortcuts. Just well-organised study material built for BCA students.
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {trustPoints.map((point) => {
            const Icon = point.icon;
            return (
              <div key={point.title} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow transition">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 mb-4">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="text-base font-bold text-slate-900 mb-1.5" style={{ fontFamily: "var(--font-display)" }}>
                  {point.title}
                </h3>
                <p className="text-xs sm:text-sm leading-6 text-slate-500">
                  {point.detail}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
