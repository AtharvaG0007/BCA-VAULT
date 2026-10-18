import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import {
  ArrowLeft, ArrowRight, BookOpen, Calculator, Check, Code2, FileQuestion,
  Globe, GraduationCap, Layers3, LockKeyhole, Search, ShieldCheck, Sparkles,
} from "lucide-react";

type Subject = {
  id: string;
  title: string;
  short: string;
  description: string;
  icon: typeof BookOpen;
  accent: string;
  topics: string[];
};

const subjects: Subject[] = [
  {
    id: "foundation",
    title: "Foundations of Computing",
    short: "Computer fundamentals",
    description: "Core computing concepts, organised for focused revision.",
    icon: Layers3,
    accent: "indigo",
    topics: ["Computer fundamentals", "Hardware & software", "Data representation"],
  },
  {
    id: "algorithms",
    title: "Algorithms & Program Design using C",
    short: "Logic and C programming",
    description: "Algorithm design, problem-solving and C programming concepts.",
    icon: Code2,
    accent: "blue",
    topics: ["Algorithms & flowcharts", "C fundamentals", "Control structures"],
  },
  {
    id: "html",
    title: "HTML",
    short: "Web page structure",
    description: "HTML concepts and question practice for web foundations.",
    icon: Globe,
    accent: "orange",
    topics: ["HTML document structure", "Elements & attributes", "Forms and semantic HTML"],
  },
  {
    id: "css",
    title: "CSS",
    short: "Styling and layout",
    description: "Important styling concepts and concise revision material.",
    icon: Sparkles,
    accent: "sky",
    topics: ["Selectors & specificity", "Box model", "Layouts and responsive design"],
  },
  {
    id: "javascript",
    title: "JavaScript",
    short: "Client-side programming",
    description: "Core JavaScript concepts, examples and exam-focused answers.",
    icon: Code2,
    accent: "amber",
    topics: ["Variables & operators", "Functions and events", "DOM fundamentals"],
  },
  {
    id: "mathematics",
    title: "Mathematics",
    short: "Problems with solutions",
    description: "Topic-wise practice with step-by-step solutions where prepared.",
    icon: Calculator,
    accent: "emerald",
    topics: ["Key formulas", "Worked examples", "Practice problems with solutions"],
  },
];

const plans = [
  { id: "single", title: "Single Subject", price: 49, detail: "Choose any one subject", badge: "" },
  { id: "double", title: "Any 2 Subjects", price: 79, detail: "Pick any two subject kits", badge: "SAVE ₹19" },
  { id: "all", title: "Complete Exam Combo", price: 129, detail: "All 6 subject kits", badge: "BEST VALUE" },
];

export function ExamKitsPage() {
  const navigate = useNavigate();
  const [selected, setSelected] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [notice, setNotice] = useState(false);

  const visibleSubjects = useMemo(
    () => subjects.filter((s) => (s.title + " " + s.short + " " + s.topics.join(" ")).toLowerCase().includes(search.toLowerCase())),
    [search],
  );

  const toggleSubject = (id: string) => {
    setNotice(false);
    setSelected((current) => {
      if (current.includes(id)) return current.filter((item) => item !== id);
      if (current.length >= 2) return current;
      return [...current, id];
    });
  };

  const selectedPrice = selected.length === 1 ? 49 : selected.length === 2 ? 79 : 0;
  const formatSubjects = selected.map((id) => subjects.find((s) => s.id === id)?.title).filter(Boolean);

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <button onClick={() => navigate("/app/dashboard")} className="mb-5 inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-white hover:text-indigo-700">
          <ArrowLeft className="h-4 w-4" /> Back to dashboard
        </button>

        <section className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-slate-950 via-indigo-950 to-indigo-800 p-6 text-white shadow-xl sm:p-10">
          <div className="pointer-events-none absolute -right-10 -top-16 h-64 w-64 rounded-full bg-indigo-400/20 blur-3xl" />
          <div className="relative grid gap-8 lg:grid-cols-[1.35fr_0.65fr] lg:items-center">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-bold text-indigo-100">
                <Sparkles className="h-3.5 w-3.5" /> BCA VAULT · EXAM KITS
              </span>
              <h1 className="mt-5 max-w-2xl text-3xl font-black tracking-tight sm:text-5xl">
                Revise smarter.<br /><span className="text-indigo-200">One subject at a time.</span>
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-indigo-100 sm:text-base">
                Explore subject-wise repeated questions, answers and concise revision topics for your BCA exam preparation.
              </p>
              <div className="mt-6 flex flex-wrap gap-3 text-xs font-semibold text-indigo-50">
                <span className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2"><FileQuestion className="h-4 w-4" /> Questions + answers</span>
                <span className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2"><BookOpen className="h-4 w-4" /> Revision topics</span>
                <span className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2"><Calculator className="h-4 w-4" /> Maths solutions</span>
              </div>
            </div>
            <div className="rounded-3xl border border-white/15 bg-white/10 p-5 backdrop-blur-sm sm:p-6">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-indigo-200">Simple student pricing</p>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-white p-4 text-slate-900">
                  <p className="text-xs font-semibold text-slate-500">One subject</p>
                  <p className="mt-1 text-3xl font-black">₹49</p>
                </div>
                <div className="rounded-2xl bg-amber-300 p-4 text-slate-950">
                  <p className="text-xs font-bold">All 6 kits</p>
                  <p className="mt-1 text-3xl font-black">₹129</p>
                  <p className="mt-1 text-[11px] font-semibold">Save ₹165 vs individual</p>
                </div>
              </div>
              <p className="mt-3 text-xs leading-5 text-indigo-100">Choose a single kit or get every listed subject in one combo.</p>
            </div>
          </div>
        </section>

        <section className="mt-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-indigo-600">Choose your focus</p>
              <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">Explore subject kits</h2>
              <p className="mt-2 max-w-2xl text-sm text-slate-600">Select up to two subjects to build a ₹79 combo, or choose the complete kit below.</p>
            </div>
            <label className="relative block w-full sm:max-w-xs">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search subjects or topics" className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100" />
            </label>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {visibleSubjects.map((subject) => {
              const Icon = subject.icon;
              const isSelected = selected.includes(subject.id);
              return (
                <article key={subject.id} className={`group rounded-3xl border bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg ${isSelected ? "border-indigo-400 ring-2 ring-indigo-100" : "border-slate-200"}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="grid h-12 w-12 place-items-center rounded-2xl bg-indigo-50 text-indigo-700"><Icon className="h-6 w-6" /></div>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">₹49</span>
                  </div>
                  <h3 className="mt-4 text-lg font-black leading-snug text-slate-900">{subject.title}</h3>
                  <p className="mt-1 text-xs font-semibold text-indigo-700">{subject.short}</p>
                  <p className="mt-3 min-h-10 text-sm leading-5 text-slate-600">{subject.description}</p>
                  <div className="mt-4 space-y-2 border-t border-slate-100 pt-4">
                    {subject.topics.map((topic) => <div key={topic} className="flex items-start gap-2 text-xs text-slate-600"><Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />{topic}</div>)}
                  </div>
                  <button onClick={() => toggleSubject(subject.id)} className={`mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold transition ${isSelected ? "bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200" : "bg-slate-900 text-white hover:bg-indigo-700"}`}>
                    {isSelected ? <><Check className="h-4 w-4" /> Selected</> : <>Select subject <ArrowRight className="h-4 w-4" /></>}
                  </button>
                </article>
              );
            })}
          </div>
          {visibleSubjects.length === 0 && <p className="mt-5 rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">No subjects match that search.</p>}
        </section>

        <section className="mt-8 grid gap-4 lg:grid-cols-3">
          {plans.map((plan) => (
            <article key={plan.id} className={`relative rounded-3xl border bg-white p-5 shadow-sm ${plan.id === "all" ? "border-indigo-300 ring-2 ring-indigo-100" : "border-slate-200"}`}>
              {plan.badge && <span className={`absolute -top-3 right-5 rounded-full px-3 py-1 text-[10px] font-black tracking-wider ${plan.id === "all" ? "bg-amber-300 text-amber-950" : "bg-emerald-100 text-emerald-800"}`}>{plan.badge}</span>}
              <p className="text-sm font-bold text-slate-700">{plan.title}</p>
              <div className="mt-2 flex items-baseline gap-1"><span className="text-4xl font-black text-slate-950">₹{plan.price}</span><span className="text-xs text-slate-500">one-time</span></div>
              <p className="mt-2 text-sm text-slate-600">{plan.detail}</p>
              <button onClick={() => {
                if (plan.id === "single" && selected.length !== 1) { setNotice(true); return; }
                if (plan.id === "double" && selected.length !== 2) { setNotice(true); return; }
                setNotice(true);
              }} className={`mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold transition ${plan.id === "all" ? "bg-indigo-600 text-white hover:bg-indigo-700" : "border border-slate-200 text-slate-800 hover:bg-slate-50"}`}>
                {plan.id === "single" ? "Continue with 1 subject" : plan.id === "double" ? "Continue with 2 subjects" : "Get complete combo"} <ArrowRight className="h-4 w-4" />
              </button>
            </article>
          ))}
        </section>

        {selected.length > 0 && <section className="mt-5 flex flex-col gap-4 rounded-3xl border border-indigo-200 bg-indigo-50 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-black text-indigo-950">Your selection ({selected.length}/2)</p>
            <p className="mt-1 text-xs leading-5 text-indigo-800">{formatSubjects.join(" · ")}</p>
            {selected.length === 2 && <p className="mt-1 text-xs font-bold text-indigo-800">Combo price: ₹79</p>}
          </div>
          <button onClick={() => setNotice(true)} className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-700 px-5 py-3 text-sm font-bold text-white hover:bg-indigo-800">Continue <ArrowRight className="h-4 w-4" /></button>
        </section>}

        {notice && <div role="status" className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
          <p className="font-bold">Checkout is not connected yet.</p>
          <p className="mt-1 text-xs leading-5">This branch currently contains the product-selection UI. Before accepting payment, the team must add database-backed product records, verify ₹49/₹79/₹129 server-side, and grant access only after payment approval. No payment has been initiated.</p>
          <button onClick={() => setNotice(false)} className="mt-2 text-xs font-bold underline">Dismiss</button>
        </div>}

        <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
            <div>
              <h2 className="font-black text-slate-900">Clear, honest exam preparation</h2>
              <p className="mt-1 text-sm leading-6 text-slate-600">Repeated questions are identified from available previous papers. Important topics are revision guidance, not a guarantee of future exam questions. Mathematics solutions and all other materials will be published only after content review.</p>
            </div>
          </div>
        </section>
        <p className="mx-auto mt-6 max-w-3xl text-center text-[11px] leading-5 text-slate-500">BCA Vault Exam Kits · Built for focused revision · Content and checkout availability may vary by subject.</p>
      </div>
    </main>
  );
}
