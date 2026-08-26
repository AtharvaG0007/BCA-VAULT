import { ArrowUpRight, BookOpen, Check, LockKeyhole } from "lucide-react";
import { useNavigate } from "react-router";
import { syllabus2026_27 } from "../../data/syllabus";

export function SemesterHub() {
  const navigate = useNavigate();
  const available = [syllabus2026_27.semesters[1], syllabus2026_27.semesters[2]];

  return (
    <section id="syllabus" className="bg-[#f8fafc] py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="mb-10 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-[#4f46e5]">BCA Syllabus 2026–27</p>
            <h2 className="text-3xl font-bold tracking-[-0.025em] text-slate-950 sm:text-4xl">Theory preparation, precisely mapped.</h2>
          </div>
          <p className="max-w-md text-sm leading-6 text-slate-500">Semester 1 and Semester 2 are available now. Mathematics, labs, practicals and projects remain outside this theory-focused bundle.</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {available.map((semester) => (
            <article key={semester.number} className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_12px_35px_rgba(15,23,42,0.06)]">
              <div className="flex items-start justify-between border-b border-slate-100 bg-slate-950 px-6 py-6 text-white">
                <div><p className="text-xs font-bold tracking-[0.18em] text-indigo-200">SEMESTER {semester.number}</p><h3 className="mt-1 text-xl font-bold">Complete Theory Preparation</h3></div>
                <span className="rounded-full bg-emerald-400/15 px-3 py-1 text-xs font-bold text-emerald-300">Available</span>
              </div>
              <div className="p-4 sm:p-6">
                <p className="mb-4 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">2026–27 · Theory Notes only</p>
                <div className="space-y-2">
                  {semester.subjects.map((subject, index) => (
                    <button key={subject.courseCode} onClick={() => navigate(`/notes?subject=${subject.courseCode}`)} className="group flex w-full items-center gap-4 rounded-2xl border border-slate-100 p-3 text-left transition hover:border-indigo-200 hover:bg-indigo-50/40">
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-slate-100 font-mono text-xs font-bold text-slate-600">{String(index + 1).padStart(2, "0")}</span>
                      <span className="min-w-0 flex-1"><span className="block text-sm font-bold text-slate-900">{subject.displayTitle ?? subject.officialTitle}</span>{subject.courseCode === "105" && <span className="mt-0.5 block text-xs text-slate-500">HTML • JavaScript • CSS</span>}<span className="mt-1 flex items-center gap-1 text-xs font-semibold text-indigo-600"><Check className="h-3 w-3" /> Theory Notes</span></span>
                      <ArrowUpRight className="h-4 w-4 text-slate-300 transition group-hover:text-indigo-600" />
                    </button>
                  ))}
                </div>
                <div className="mt-5 border-t border-dashed border-slate-200 pt-4"><p className="mb-2 text-xs font-bold uppercase tracking-[0.14em] text-slate-400">Not Included</p><div className="flex flex-wrap gap-2">{semester.excludedSubjects.map((item) => <span key={item.officialTitle} className="rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-medium text-slate-500">{item.officialTitle}</span>)}</div></div>
              </div>
            </article>
          ))}
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[3, 4, 5, 6, 7, 8].map((semester) => <div key={semester} className="rounded-2xl border border-slate-200 bg-white px-5 py-5"><div className="flex items-center justify-between"><span className="text-sm font-bold text-slate-900">SEMESTER {semester}</span><LockKeyhole className="h-4 w-4 text-slate-400" /></div><p className="mt-4 text-base font-bold text-slate-700">Coming Soon</p><p className="mt-1 text-xs leading-5 text-slate-500">Theory notes and exam preparation for Semester {semester} are being prepared.</p></div>)}
        </div>
      </div>
    </section>
  );
}
