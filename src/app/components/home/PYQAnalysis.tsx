import { BarChart3, BookOpen, Flame, ShieldCheck } from "lucide-react";

export function PYQAnalysis() {
  return (
    <section className="bg-slate-950 py-20 text-white sm:py-28">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="grid gap-10 lg:grid-cols-[1fr_1.2fr]">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-indigo-300">
              Exam Intelligence
            </p>
            <h2 className="mt-4 text-3xl font-bold tracking-[-0.025em] sm:text-4xl">
              Exam patterns, without made-up data.
            </h2>
            <p className="mt-5 max-w-md text-sm leading-7 text-slate-300">
              Semester 1 exam preparation is built around authentic syllabus patterns. Note: College and library PYQs are categorized as separate study resources.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              [BookOpen, "Theory Notes", "Structured unit-wise coverage for Semester 1."],
              [BarChart3, "Topic Weightage", "Pattern insights based on syllabus emphasis."],
              [Flame, "Most Repeated Topics", "High-frequency exam topics highlighted for revision."],
            ].map(([Icon, title, desc]) => {
              const Component = Icon as typeof BookOpen;
              return (
                <article key={title as string} className="rounded-2xl border border-white/10 bg-white/5 p-5">
                  <Component className="h-5 w-5 text-indigo-300" />
                  <h3 className="mt-7 text-sm font-bold">{title as string}</h3>
                  <p className="mt-2 text-xs leading-5 text-slate-400">{desc as string}</p>
                </article>
              );
            })}
          </div>
        </div>
        <div className="mt-10 flex items-center gap-3 rounded-2xl border border-emerald-400/20 bg-emerald-400/5 p-4 text-sm text-emerald-100">
          <ShieldCheck className="h-5 w-5 shrink-0 text-emerald-300" />
          No fabricated question frequency, year, priority, or prediction data.
        </div>
      </div>
    </section>
  );
}
