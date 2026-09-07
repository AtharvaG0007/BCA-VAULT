import { FileQuestion, Gift, ShieldCheck } from "lucide-react";
import { syllabus2026_27 } from "../../data/syllabus";

export function PYQPage() {
  const sem1Subjects = syllabus2026_27.semesters[1].subjects;

  return (
    <main className="min-h-screen bg-[#f8fafc] py-12 sm:py-16">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-indigo-600">
          Supplementary Exam Resources
        </p>
        <h1 className="mt-3 text-3xl font-bold tracking-[-0.025em] text-slate-950 sm:text-5xl">
          College & library PYQ resources.
        </h1>
        <p className="mt-4 max-w-2xl leading-7 text-slate-500">
          Previous year question papers are supplementary library materials separate from the BCA Vault paid bundle. Curated "Most Repeated Questions" PDFs are unlocked exclusively through the student referral program.
        </p>
        <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {sem1Subjects.map((subject) => (
            <article key={subject.courseCode} className="rounded-2xl border border-slate-200 bg-white p-6">
              <p className="font-mono text-xs font-bold text-slate-400">
                {subject.courseCode} · SEM {subject.semester}
              </p>
              <h2 className="mt-3 text-lg font-bold leading-6 text-slate-900">
                {subject.officialTitle}
              </h2>
              <div className="mt-6 space-y-3 border-t border-slate-100 pt-5">
                <p className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <FileQuestion className="h-4 w-4 text-indigo-600" />
                  Library Question Papers
                </p>
                <p className="flex items-center gap-2 text-sm font-semibold text-amber-700">
                  <Gift className="h-4 w-4 text-amber-500" />
                  Referral: Repeated Questions
                </p>
              </div>
              <p className="mt-5 text-xs leading-5 text-slate-500">
                Supplementary study reference for Semester 1.
              </p>
            </article>
          ))}
        </div>
        <div className="mt-8 flex gap-3 rounded-2xl border border-emerald-100 bg-emerald-50 p-5 text-sm leading-6 text-emerald-900">
          <ShieldCheck className="h-5 w-5 shrink-0" />
          BCA Vault does not fabricate PYQ years, repeat counts or priority labels.
        </div>
      </div>
    </main>
  );
}
