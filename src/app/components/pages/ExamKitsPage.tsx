import { useMemo, useState, type FormEvent } from "react";
import { useNavigate } from "react-router";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/app/components/auth/AuthContext";
import { QRCodeSVG } from "qrcode.react";
import {
  ArrowLeft, ArrowRight, BookOpen, Calculator, Check, Code2, FileQuestion,
  Globe, GraduationCap, Layers3, LockKeyhole, Search, ShieldCheck, Sparkles, X, Loader2, Copy, CheckCircle2,
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
    id: "client-side",
    title: "Client-side Web Technologies (HTML, CSS & JavaScript)",
    short: "HTML, CSS and JavaScript — one combined subject",
    description: "A single combined kit covering web page structure, styling and client-side scripting.",
    icon: Globe,
    accent: "orange",
    topics: ["HTML structure, elements and forms", "CSS selectors, box model and layouts", "JavaScript variables, functions, events and DOM"],
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
  { id: "all", title: "Complete Exam Combo", price: 129, detail: "All 4 subject kits", badge: "BEST VALUE" },
];

export function ExamKitsPage() {
  const navigate = useNavigate();
  const { user, appUser } = useAuth();
  const [selected, setSelected] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [notice, setNotice] = useState(false);
  const [checkoutPlan, setCheckoutPlan] = useState<"single"|"double"|"all"|null>(null);
  const [checkoutStep, setCheckoutStep] = useState<"details"|"payment"|"submitted">("details");
  const [checkoutBusy, setCheckoutBusy] = useState(false);
  const [checkoutError, setCheckoutError] = useState("");
  const [order, setOrder] = useState<any>(null);
  const [student, setStudent] = useState({ name: appUser?.name || "", email: user?.email || appUser?.email || "", phone: "" });
  const [utr, setUtr] = useState("");
  const [screenshot, setScreenshot] = useState<File|null>(null);
  const upiId = "gogawaleatharva997-1@oksbi";
  const chosenSubjects = checkoutPlan === "all" ? subjects.map(s=>s.id) : selected;
  const chosenPrice = checkoutPlan ? ({single:49,double:79,all:129} as const)[checkoutPlan] : 0;
  const upiUri = order ? `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent("BCA Vault")}&am=${order.amount}&cu=INR&tn=${encodeURIComponent("BCA Vault Exam Kits "+order.order_code)}` : "";

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
                Explore subject-wise repeated questions, answers and concise revision topics for your BCA exam preparation. HTML, CSS and JavaScript are combined into one Client-side Web Technologies kit.
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
                  <p className="text-xs font-bold">All 4 kits</p>
                  <p className="mt-1 text-3xl font-black">₹129</p>
                  <p className="mt-1 text-[11px] font-semibold">Save ₹67 vs individual</p>
                </div>
              </div>
              <p className="mt-3 text-xs leading-5 text-indigo-100">Choose a single kit or get all four subject kits in one combo.</p>
            </div>
          </div>
        </section>

        <section className="mt-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-indigo-600">Choose your focus</p>
              <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">Explore subject kits</h2>
              <p className="mt-2 max-w-2xl text-sm text-slate-600">Select up to two subjects to build a ₹79 combo, or choose the complete four-subject kit below.</p>
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
                setNotice(false);
                if (!user) { navigate("/login"); return; }
                setCheckoutPlan(plan.id as "single"|"double"|"all");
                setCheckoutStep("details"); setCheckoutError(""); setOrder(null);
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
          <button onClick={() => { if (!user) { navigate("/login"); return; } setCheckoutPlan(selected.length===1?"single":"double"); setCheckoutStep("details"); setCheckoutError(""); setOrder(null); }} className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-700 px-5 py-3 text-sm font-bold text-white hover:bg-indigo-800">Continue <ArrowRight className="h-4 w-4" /></button>
        </section>}

        {notice && <div role="status" className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950"><p className="font-bold">Choose the correct plan</p><p className="mt-1 text-xs leading-5">Select one subject for ₹49 or two subjects for ₹79 before continuing.</p><button onClick={() => setNotice(false)} className="mt-2 text-xs font-bold underline">Dismiss</button></div>}

        {checkoutPlan && <div className="fixed inset-0 z-[120] overflow-y-auto bg-slate-950/70 p-3 sm:p-6" role="dialog" aria-modal="true" aria-label="Exam Kits checkout"><div className="mx-auto my-4 w-full max-w-2xl overflow-hidden rounded-3xl bg-white shadow-2xl">
          <div className="flex items-start justify-between border-b border-slate-100 p-5 sm:p-7"><div><p className="text-xs font-black uppercase tracking-widest text-indigo-600">BCA Vault · Secure checkout</p><h2 className="mt-1 text-2xl font-black text-slate-950">{checkoutStep==="details"?"Your order details":checkoutStep==="payment"?"Pay and submit evidence":"Order submitted"}</h2><p className="mt-1 text-sm text-slate-500">{checkoutStep==="submitted"?"Your order is waiting for manual verification.": "Order total: ₹"+chosenPrice}</p></div><button onClick={()=>setCheckoutPlan(null)} className="rounded-xl p-2 text-slate-500 hover:bg-slate-100" aria-label="Close checkout"><X className="h-5 w-5"/></button></div>
          {checkoutError && <div role="alert" className="mx-5 mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{checkoutError}</div>}
          {checkoutStep==="details" && <form className="space-y-4 p-5 sm:p-7" onSubmit={async(e:FormEvent)=>{e.preventDefault();setCheckoutBusy(true);setCheckoutError("");try{const {data,error}=await supabase.functions.invoke("exam-kits",{body:{action:"create-order",subjects:chosenSubjects,plan_type:checkoutPlan,full_name:student.name,email:student.email,phone:student.phone}});if(error||!data?.success)throw new Error(data?.error||error?.message||"Could not create order.");setOrder(data.order);setCheckoutStep("payment");}catch(err:any){setCheckoutError(err.message||"Unable to create order.");}finally{setCheckoutBusy(false);}}}>
            <div className="rounded-2xl bg-slate-50 p-4"><p className="text-xs font-bold uppercase text-slate-500">Selected kits</p><p className="mt-2 text-sm font-semibold text-slate-800">{chosenSubjects.map(id=>subjects.find(s=>s.id===id)?.title).join(" · ")}</p><p className="mt-2 text-2xl font-black text-indigo-700">₹{chosenPrice}</p></div>
            <label className="block text-sm font-bold text-slate-700">Full name<input required minLength={2} maxLength={100} value={student.name} onChange={e=>setStudent({...student,name:e.target.value})} className="mt-1 w-full rounded-xl border border-slate-200 p-3 font-normal" autoComplete="name"/></label>
            <label className="block text-sm font-bold text-slate-700">Account email<input required type="email" value={student.email} readOnly className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-3 font-normal"/></label>
            <label className="block text-sm font-bold text-slate-700">Phone number<input required type="tel" pattern="\+?[0-9\s-]{10,18}" value={student.phone} onChange={e=>setStudent({...student,phone:e.target.value})} className="mt-1 w-full rounded-xl border border-slate-200 p-3 font-normal" autoComplete="tel" placeholder="10-digit mobile number"/></label>
            <button disabled={checkoutBusy} className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 p-3.5 font-bold text-white disabled:opacity-60">{checkoutBusy&&<Loader2 className="h-4 w-4 animate-spin"/>}Create order and continue <ArrowRight className="h-4 w-4"/></button>
          </form>}
          {checkoutStep==="payment" && order && <form className="space-y-4 p-5 sm:p-7" onSubmit={async(e:FormEvent)=>{e.preventDefault();if(!screenshot){setCheckoutError("Upload the payment screenshot first.");return;}setCheckoutBusy(true);setCheckoutError("");try{const {data:upload,error:uploadError}=await supabase.functions.invoke("exam-kits",{body:{action:"create-upload",order_id:order.id,content_type:screenshot.type,size:screenshot.size}});if(uploadError||!upload?.success)throw new Error(upload?.error||uploadError?.message||"Could not prepare screenshot upload.");const {error:storageError}=await supabase.storage.from("exam-kit-payment-evidence").uploadToSignedUrl(upload.storage_path,upload.token,screenshot,{contentType:screenshot.type});if(storageError)throw storageError;const {data:submitted,error:submitError}=await supabase.functions.invoke("exam-kits",{body:{action:"submit-payment",order_id:order.id,utr:utr.trim(),storage_path:upload.storage_path}});if(submitError||!submitted?.success)throw new Error(submitted?.error||submitError?.message||"Could not submit payment evidence.");setCheckoutStep("submitted");}catch(err:any){setCheckoutError(err.message||"Could not submit payment evidence.");}finally{setCheckoutBusy(false);}}}>
            <div className="grid gap-5 sm:grid-cols-[180px_1fr] sm:items-center"><div className="mx-auto rounded-2xl border border-slate-200 p-3"><QRCodeSVG value={upiUri} size={156} level="M"/><p className="mt-2 text-center text-xs font-bold">Scan with UPI app</p></div><div><p className="text-sm text-slate-600">Pay the exact amount shown below using any UPI app. Then enter the UTR and upload the payment screenshot. Access is granted after manual verification.</p><p className="mt-3 text-xs font-bold uppercase text-slate-500">Payee UPI ID</p><p className="break-all font-bold text-slate-900">{upiId}</p><p className="mt-2 text-3xl font-black text-indigo-700">₹{order.amount}</p><p className="mt-1 text-xs text-slate-500">Order {order.order_code}</p><a href={upiUri} className="mt-3 inline-flex rounded-xl bg-indigo-600 px-4 py-2 text-sm font-bold text-white">Open UPI app</a></div></div>
            <label className="block text-sm font-bold text-slate-700">UPI transaction ID / UTR<input required minLength={6} maxLength={64} value={utr} onChange={e=>setUtr(e.target.value.toUpperCase())} className="mt-1 w-full rounded-xl border border-slate-200 p-3 font-mono font-normal" placeholder="Transaction reference"/></label>
            <label className="block text-sm font-bold text-slate-700">Payment screenshot (JPG, PNG or WebP; max 5 MB)<input required type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>setScreenshot(e.target.files?.[0]??null)} className="mt-1 block w-full rounded-xl border border-slate-200 p-3 text-sm font-normal"/></label>
            <button disabled={checkoutBusy} className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 p-3.5 font-bold text-white disabled:opacity-60">{checkoutBusy&&<Loader2 className="h-4 w-4 animate-spin"/>}Submit payment for verification</button>
          </form>}
          {checkoutStep==="submitted" && <div className="p-7 text-center"><CheckCircle2 className="mx-auto h-12 w-12 text-emerald-600"/><h3 className="mt-3 text-xl font-black">Payment evidence submitted</h3><p className="mt-2 text-sm leading-6 text-slate-600">Order {order.order_code} is pending manual verification. Your selected kits will be unlocked after an administrator approves the payment.</p><button onClick={()=>{setCheckoutPlan(null);navigate("/app/dashboard");}} className="mt-5 rounded-xl bg-indigo-600 px-5 py-3 font-bold text-white">Return to dashboard</button></div>}
        </div></div>}

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
