import { ArrowRight, BookOpen, CheckCircle2, Sparkles } from "lucide-react";
import { Link } from "react-router";
import { syllabus2026_27 } from "../../data/syllabus";

export function TopNotes() {
  const sem1Subjects = syllabus2026_27.semesters[1].subjects;

  return (
    <section className="bg-white py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-bold uppercase tracking-wider mb-3">
              <Sparkles className="w-3.5 h-3.5" /> Product Preview
            </div>
            <h2 className="text-3xl font-bold tracking-[-0.025em] text-slate-950 sm:text-4xl" style={{ fontFamily: "var(--font-display)" }}>
              See What You’re Getting
            </h2>
            <p className="mt-2 text-sm text-slate-500 max-w-xl leading-relaxed">
              Don’t buy based only on promises. Explore the type of notes and most repeated topics included in BCA Vault.
            </p>
          </div>
          <Link
            to="/notes"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-800 transition"
          >
            Explore What’s Included <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {sem1Subjects.map((subject) => (
            <Link
              key={subject.courseCode}
              to={`/notes?subject=${subject.courseCode}`}
              className="group rounded-2xl border border-slate-200 p-5 transition hover:border-indigo-200 hover:bg-indigo-50/30 shadow-sm hover:shadow"
            >
              <BookOpen className="h-5 w-5 text-indigo-600" />
              <p className="mt-8 font-mono text-xs font-bold text-slate-400">
                {subject.courseCode} · SEM {subject.semester}
              </p>
              <h3 className="mt-2 text-sm font-bold leading-5 text-slate-900">
                {subject.officialTitle}
              </h3>
              <p className="mt-4 flex items-center gap-1 text-xs font-semibold text-emerald-600">
                <CheckCircle2 className="h-3.5 w-3.5" />Theory Notes
              </p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
