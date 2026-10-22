import { useState } from "react";
import {
  ArrowRight, CheckCircle2, Clock3, Code2, ExternalLink,
  Laptop, Layers3, MonitorPlay, Sparkles, Video, Wrench, Zap,
} from "lucide-react";
import { toast } from "sonner";

const GOOGLE_REGISTRATION_FORM_URL = ""; // Add the final Google Form URL here when it is ready.\n\nconst learningItems = [
  { icon: Laptop, title: "Install your IDE", detail: "Set up Visual Studio Code and prepare your workspace." },
  { icon: Sparkles, title: "Understand AI assistants", detail: "A beginner-friendly overview of ChatGPT and Claude." },
  { icon: Layers3, title: "Explore Figma", detail: "Learn how to turn ideas and wireframes into a clear design." },
  { icon: Code2, title: "Build a website with AI", detail: "Plan, prompt, create and improve a simple real website." },
  { icon: Wrench, title: "Developer toolkit", detail: "Discover useful tools, workflows and practical next steps." },
];

export function BootcampsPage() {
  const [showDetails, setShowDetails] = useState(false);

  const registerInterest = () => {
    setShowDetails(true);
    toast.success("Free bootcamp interest form opened.");
  };

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-7xl space-y-7 px-4 py-6 sm:px-6 lg:px-8 lg:py-9">
        <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-bold text-violet-700">
              <Video className="h-3.5 w-3.5" /> LIVE, HANDS-ON LEARNING
            </div>
            <h1 className="text-3xl font-black tracking-tight sm:text-4xl">Bootcamps</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
              Learn practical digital skills, build real projects and ask questions in live sessions.
            </p>
          </div>
          <div className="inline-flex w-fit items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-600 shadow-sm">
            <MonitorPlay className="h-4 w-4 text-violet-600" /> Live sessions hosted on Zoom
          </div>
        </header>

        <section className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-slate-950 via-indigo-950 to-violet-900 p-6 text-white shadow-xl shadow-indigo-950/15 sm:p-9 lg:p-11">
          <div className="pointer-events-none absolute -right-16 -top-20 h-72 w-72 rounded-full bg-violet-500/20 blur-3xl" />
          <div className="pointer-events-none absolute bottom-0 right-1/4 h-40 w-64 rounded-full bg-blue-500/20 blur-3xl" />
          <div className="relative grid items-center gap-8 lg:grid-cols-[1.15fr_.85fr]">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-emerald-300/30 bg-emerald-400/15 px-3 py-1.5 text-xs font-black uppercase tracking-wide text-emerald-200">
                <Zap className="h-3.5 w-3.5" /> First bootcamp · Free
              </span>
              <h2 className="mt-5 max-w-2xl text-3xl font-black leading-tight tracking-tight sm:text-5xl">
                Build your first website <span className="text-violet-300">using AI.</span>
              </h2>
              <p className="mt-4 max-w-xl text-sm leading-7 text-indigo-100 sm:text-base">
                A beginner-friendly live session to set up your development environment, explore AI tools and create a website step by step—even if you are starting from zero.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <button onClick={registerInterest} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-black text-indigo-950 shadow-lg transition hover:-translate-y-0.5 hover:bg-indigo-50">
                  Register interest — Free <ArrowRight className="h-4 w-4" />
                </button>
                <button onClick={() => document.getElementById("bootcamp-curriculum")?.scrollIntoView({ behavior: "smooth" })} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-white/25 bg-white/5 px-5 py-3 text-sm font-bold text-white transition hover:bg-white/10">
                  Explore what you’ll learn
                </button>
              </div>
              <p className="mt-4 text-xs text-indigo-200">Session date and Zoom joining link will be shared when registration details are confirmed.</p>
            </div>
            <div className="relative mx-auto w-full max-w-md">
              <div className="rounded-3xl border border-white/15 bg-white/[0.08] p-5 shadow-2xl backdrop-blur-sm sm:p-6">
                <div className="flex items-center justify-between">
                  <div className="flex gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-rose-400" /><span className="h-2.5 w-2.5 rounded-full bg-amber-300" /><span className="h-2.5 w-2.5 rounded-full bg-emerald-300" /></div>
                  <span className="rounded-full bg-rose-400/15 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-rose-200">Live learning</span>
                </div>
                <div className="mt-7 rounded-2xl border border-white/10 bg-slate-950/60 p-5">
                  <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-violet-500 to-blue-500 shadow-lg shadow-violet-950/50"><Code2 className="h-8 w-8" /></div>
                  <p className="mt-4 text-center text-lg font-extrabold">Idea → AI → Website</p>
                  <p className="mt-1 text-center text-xs text-indigo-200">Learn it live. Build it yourself.</p>
                  <div className="mt-5 grid grid-cols-3 gap-2 text-center text-[11px] font-bold">
                    <div className="rounded-xl bg-white/5 p-3"><Laptop className="mx-auto mb-2 h-5 w-5 text-sky-300" />IDE</div>
                    <div className="rounded-xl bg-white/5 p-3"><Sparkles className="mx-auto mb-2 h-5 w-5 text-violet-300" />AI tools</div>
                    <div className="rounded-xl bg-white/5 p-3"><Layers3 className="mx-auto mb-2 h-5 w-5 text-emerald-300" />Design</div>
                  </div>
                </div>
              </div>
              <div className="absolute -bottom-4 -left-3 rounded-2xl border border-emerald-200/30 bg-emerald-300 px-4 py-3 text-sm font-black text-emerald-950 shadow-lg sm:-left-6">
                ₹0 · First session
              </div>
            </div>
          </div>
        </section>

        {showDetails && (
          <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 sm:p-6" aria-live="polite">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" />
              <div>
                <h3 className="font-extrabold text-emerald-950">Bootcamp registration form coming soon</h3>
                <p className="mt-1 text-sm leading-6 text-emerald-900">The Google Form link is not configured yet. It will collect your contact details and preferred domain before the session schedule and Zoom details are shared.</p>
                <button onClick={() => setShowDetails(false)} className="mt-3 text-xs font-bold text-emerald-800 underline underline-offset-4">Dismiss</button>
              </div>
            </div>
          </section>
        )}

        <section id="bootcamp-curriculum" className="grid gap-6 lg:grid-cols-[1.1fr_.9fr]">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
            <div className="mb-5">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-violet-600">Beginner-friendly curriculum</p>
              <h3 className="mt-2 text-xl font-black sm:text-2xl">What you’ll learn in the free session</h3>
            </div>
            <div className="space-y-3">
              {learningItems.map(({ icon: Icon, title, detail }, index) => (
                <div key={title} className="flex gap-3 rounded-2xl border border-slate-100 bg-slate-50/80 p-4 transition hover:border-violet-100 hover:bg-violet-50/50">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-violet-100 text-violet-700"><Icon className="h-5 w-5" /></div>
                  <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h4 className="text-sm font-extrabold">{title}</h4><span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-bold text-slate-500">Part {index + 1}</span></div><p className="mt-1 text-xs leading-5 text-slate-600 sm:text-sm">{detail}</p></div>
                  <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-emerald-500" />
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-5">
            <div className="rounded-3xl border border-violet-200 bg-gradient-to-br from-violet-50 to-white p-5 shadow-sm sm:p-7">
              <div className="flex items-center justify-between gap-3"><span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-800">START HERE</span><span className="text-2xl font-black text-emerald-700">FREE</span></div>
              <h3 className="mt-4 text-xl font-black">AI Website Building — Intro Bootcamp</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">One live beginner session covering IDE setup, ChatGPT, Claude, Figma and your first AI-assisted website.</p>
              <div className="mt-5 space-y-2 text-xs font-semibold text-slate-600"><p className="flex items-center gap-2"><Video className="h-4 w-4 text-violet-600" /> Live interactive session on Zoom</p><p className="flex items-center gap-2"><Clock3 className="h-4 w-4 text-violet-600" /> Schedule to be announced</p><p className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-violet-600" /> No payment for the first bootcamp</p></div>
              <button onClick={registerInterest} className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-violet-700 px-4 py-3 text-sm font-extrabold text-white transition hover:bg-violet-800">Register interest <ArrowRight className="h-4 w-4" /></button>
            </div>

            <div className="rounded-3xl border border-slate-800 bg-slate-950 p-5 text-white shadow-sm sm:p-7">
              <div className="flex items-center justify-between gap-3"><span className="rounded-full bg-violet-400/15 px-3 py-1 text-xs font-black text-violet-200">NEXT SESSION</span><span className="text-2xl font-black">₹99</span></div>
              <h3 className="mt-4 text-xl font-black">Full Website Creation Bootcamp</h3>
              <p className="mt-2 text-sm leading-6 text-slate-300">A planned deeper bootcamp for building, refining and presenting a complete website with modern AI-assisted workflows.</p>
              <ul className="mt-4 space-y-2 text-xs text-slate-300"><li className="flex gap-2"><CheckCircle2 className="h-4 w-4 shrink-0 text-violet-300" /> Guided project-based learning</li><li className="flex gap-2"><CheckCircle2 className="h-4 w-4 shrink-0 text-violet-300" /> Live Q&A and practical demonstrations</li><li className="flex gap-2"><CheckCircle2 className="h-4 w-4 shrink-0 text-violet-300" /> Tool setup, design and website workflow</li></ul>
              <div className="mt-5 rounded-xl border border-white/10 bg-white/5 p-3 text-xs leading-5 text-slate-300">Session price: ₹99 INR. Dates, curriculum and registration will be announced before enrollment opens.</div>
            </div>
          </div>
        </section>

        <section className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-5 sm:flex-row sm:items-center sm:justify-between sm:p-7">
          <div><h3 className="text-lg font-black">Have a bootcamp topic in mind?</h3><p className="mt-1 text-sm text-slate-600">Suggest a topic you’d like to learn in a future live session.</p></div>
          <button onClick={() => toast.info("Topic suggestions will be enabled when the bootcamp registration workflow is connected.")} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-700 transition hover:border-violet-200 hover:bg-violet-50">Suggest a topic <ExternalLink className="h-4 w-4" /></button>
        </section>
      </div>
    </main>
  );
}
