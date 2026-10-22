import { useEffect, useMemo, useState, type FormEvent } from "react";
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
  short_description: string;
  description: string;
  topics: string[];
};

type ExamKitPlan = {
  id: "single" | "double" | "all";
  title: string;
  detail: string;
  badge: string;
  price: number;
  selection_mode: "any" | "all";
  subject_count: number | null;
};

const subjectIcons: Record<string, typeof BookOpen> = {
  foundation: Layers3,
  algorithms: Code2,
  "client-side": Globe,
  mathematics: Calculator,
};

export function ExamKitsPage() {
  const navigate = useNavigate();
  const { user, appUser } = useAuth();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [plans, setPlans] = useState<ExamKitPlan[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [notice, setNotice] = useState(false);
  const [checkoutPlan, setCheckoutPlan] = useState<ExamKitPlan["id"]|null>(null);
  const [checkoutStep, setCheckoutStep] = useState<"details"|"payment"|"submitted">("details");
  const [checkoutBusy, setCheckoutBusy] = useState(false);
  const [checkoutError, setCheckoutError] = useState("");
  const [order, setOrder] = useState<any>(null);
  const [student, setStudent] = useState({ name: appUser?.name || "", email: user?.email || appUser?.email || "", phone: "" });
  const [utr, setUtr] = useState("");
  const [screenshot, setScreenshot] = useState<File|null>(null);
  const upiId = "gogawaleatharva997-1@oksbi";
  const chosenSubjects = checkoutPlan === "all" ? subjects.map((subject) => subject.id) : selected;
  const chosenPrice = plans.find((plan) => plan.id === checkoutPlan)?.price ?? 0;
  const maxSelectableCount = Math.max(0, ...plans.filter((plan) => plan.selection_mode === "any").map((plan) => plan.subject_count ?? 0));
  const upiUri = order ? `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent("BCA Vault")}&am=${order.amount}&cu=INR&tn=${encodeURIComponent("BCA Vault Exam Kits "+order.order_code)}` : "";

  useEffect(() => {
    let active = true;
    async function loadCatalog() {
      setCatalogLoading(true);
      setCatalogError("");
      const [subjectResult, planResult] = await Promise.all([
        supabase.from("exam_kit_subjects").select("id,title,short_description,description,topics").eq("published", true).order("sort_order"),
        supabase.from("exam_kit_plans").select("id,title,detail,badge,price,selection_mode,subject_count").eq("published", true).order("sort_order"),
      ]);
      if (!active) return;
      if (subjectResult.error || planResult.error) {
        setCatalogError("Exam Kit options are temporarily unavailable. Please refresh or try again later.");
      } else {
        setSubjects((subjectResult.data ?? []) as Subject[]);
        setPlans((planResult.data ?? []) as ExamKitPlan[]);
      }
      setCatalogLoading(false);
    }
    void loadCatalog();
    return () => { active = false; };
  }, []);

  const visibleSubjects = useMemo(
    () => subjects.filter((s) => (s.title + " " + s.short_description + " " + s.topics.join(" ")).toLowerCase().includes(search.toLowerCase())),
    [search, subjects],
  );

  const toggleSubject = (id: string) => {
    setNotice(false);
    setSelected((current) => {
      if (current.includes(id)) return current.filter((item) => item !== id);
      if (current.length >= maxSelectableCount) return current;
      return [...current, id];
    });
  };

  const selectedPlan = plans.find((plan) => plan.selection_mode === "any" && plan.subject_count === selected.length);
  const selectedPrice = selectedPlan?.price ?? 0;
  const singlePlan = plans.find((plan) => plan.selection_mode === "any" && plan.subject_count === 1);
  const allPlan = plans.find((plan) => plan.selection_mode === "all");
  const formatSubjects = selected.map((id) => subjects.find((s) => s.id === id)?.title).filter(Boolean);

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <button onClick={() => navigate("/app/dashboard")} className="mb-5 inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-white hover:text-indigo-700">
          <ArrowLeft className="h-4 w-4" /> Back to dashboard
        </button>
        <button onClick={() => navigate("/app/exam-kits/portal")} className="mb-5 ml-2 inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-50"><LockKeyhole className="h-4 w-4" /> My orders & purchased kits</button>

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
                Browse published subject kits, included materials, and current prices before submitting a payment.
              </p>
              <div className="mt-6 flex flex-wrap gap-3 text-xs font-semibold text-indigo-50">
                <span className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2"><FileQuestion className="h-4 w-4" /> Questions + answers</span>
                <span className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2"><BookOpen className="h-4 w-4" /> Revision topics</span>
                <span className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2"><Calculator className="h-4 w-4" /> Maths solutions</span>
              </div>
            </div>
            <div className="rounded-3xl border border-white/15 bg-white/10 p-5 backdrop-blur-sm sm:p-6">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-indigo-200">Published catalog</p>
              <p className="mt-4 text-sm leading-6 text-indigo-100">{catalogLoading ? "Loading current options…" : `${subjects.length} published subjects and ${plans.length} current plans.`}</p>
              <p className="mt-2 text-xs leading-5 text-indigo-100">One-time prices appear in the plan catalog below.</p>
              {/* Prices are loaded from the published Exam Kit plan catalog. */}

            </div>
          </div>
        </section>

        <section className="mt-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-indigo-600">Choose your focus</p>
              <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">Explore subject kits</h2>
              <p className="mt-2 max-w-2xl text-sm text-slate-600">Choose from the currently published subject kits and plans.</p>
            </div>
            <label className="relative block w-full sm:max-w-xs">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search subjects or topics" className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100" />
            </label>
          </div>

          {catalogLoading && <p className="mt-5 rounded-2xl bg-white p-6 text-sm text-slate-500">Loading Exam Kit catalog...</p>}
          {catalogError && <p role="alert" className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">{catalogError}</p>}
          <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {visibleSubjects.map((subject) => {
              const Icon = subjectIcons[subject.id] ?? BookOpen;
              const isSelected = selected.includes(subject.id);
              return (
                <article key={subject.id} className={`group rounded-3xl border bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg ${isSelected ? "border-indigo-400 ring-2 ring-indigo-100" : "border-slate-200"}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="grid h-12 w-12 place-items-center rounded-2xl bg-indigo-50 text-indigo-700"><Icon className="h-6 w-6" /></div>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">{singlePlan ? `INR ${singlePlan.price}` : "Plan pricing below"}</span>
                  </div>
                  <h3 className="mt-4 text-lg font-black leading-snug text-slate-900">{subject.title}</h3>
                  <p className="mt-1 text-xs font-semibold text-indigo-700">{subject.short_description}</p>
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
              <div className="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-1"><span className="text-4xl font-black text-slate-950">INR {plan.price}</span><span className="text-xs text-slate-500">one-time</span></div>
              <p className="mt-2 text-sm text-slate-600">{plan.detail}</p>
              <button onClick={() => {
                if (plan.selection_mode === "any" && selected.length !== plan.subject_count) { setNotice(true); return; }
                setNotice(false);
                if (!user) { navigate("/login"); return; }
                setCheckoutPlan(plan.id);
                setCheckoutStep("details"); setCheckoutError(""); setOrder(null);
              }} className={`mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold transition ${plan.id === "all" ? "bg-indigo-600 text-white hover:bg-indigo-700" : "border border-slate-200 text-slate-800 hover:bg-slate-50"}`}>
                {plan.selection_mode === "all" ? "Get complete combo" : `Continue with ${plan.subject_count} subject${plan.subject_count === 1 ? "" : "s"}`} <ArrowRight className="h-4 w-4" />
              </button>
            </article>
          ))}
        </section>

        {selected.length > 0 && <section className="mt-5 flex flex-col gap-4 rounded-3xl border border-indigo-200 bg-indigo-50 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-black text-indigo-950">Your selection ({selected.length}/{maxSelectableCount})</p>
            <p className="mt-1 text-xs leading-5 text-indigo-800">{formatSubjects.join(" · ")}</p>
            {selectedPlan && <p className="mt-1 text-xs font-bold text-indigo-800">Current plan price: INR {selectedPlan.price}</p>}
          </div>
          <button onClick={() => { if (!user) { navigate("/login"); return; } setCheckoutPlan(selected.length===1?"single":"double"); setCheckoutStep("details"); setCheckoutError(""); setOrder(null); }} className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-700 px-5 py-3 text-sm font-bold text-white hover:bg-indigo-800">Continue <ArrowRight className="h-4 w-4" /></button>
        </section>}

        {notice && <div role="status" className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950"><p className="font-bold">Choose the correct plan</p><p className="mt-1 text-xs leading-5">Select the number of subjects required by the plan before continuing.</p><button onClick={() => setNotice(false)} className="mt-2 text-xs font-bold underline">Dismiss</button></div>}

        {checkoutPlan && <div className="fixed inset-0 z-[120] overflow-y-auto bg-slate-950/70 p-3 sm:p-6" role="dialog" aria-modal="true" aria-label="Exam Kits checkout"><div className="mx-auto my-4 w-full max-w-2xl overflow-hidden rounded-3xl bg-white shadow-2xl">
          <div className="flex items-start justify-between border-b border-slate-100 p-5 sm:p-7"><div><p className="text-xs font-black uppercase tracking-widest text-indigo-600">BCA Vault · Secure checkout</p><h2 className="mt-1 text-2xl font-black text-slate-950">{checkoutStep==="details"?"Your order details":checkoutStep==="payment"?"Pay and submit evidence":"Order submitted"}</h2><p className="mt-1 text-sm text-slate-500">{checkoutStep==="submitted"?"Your order is waiting for manual verification.": "Order total: ₹"+chosenPrice}</p></div><button onClick={()=>setCheckoutPlan(null)} className="rounded-xl p-2 text-slate-500 hover:bg-slate-100" aria-label="Close checkout"><X className="h-5 w-5"/></button></div>
          {checkoutError && <div role="alert" className="mx-5 mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{checkoutError}</div>}
          {checkoutStep==="details" && <form className="space-y-4 p-5 sm:p-7" onSubmit={async(e:FormEvent)=>{e.preventDefault();setCheckoutBusy(true);setCheckoutError("");try{const {data,error}=await supabase.functions.invoke("exam-kits",{body:{action:"create-order",subjects:chosenSubjects,plan_type:checkoutPlan,full_name:student.name,email:student.email,phone:student.phone}});if(error||!data?.success)throw new Error(data?.error||error?.message||"Could not create order.");setOrder(data.order);setCheckoutStep("payment");}catch(err:any){setCheckoutError(err.message||"Unable to create order.");}finally{setCheckoutBusy(false);}}}>
            <div className="rounded-2xl bg-slate-50 p-4"><p className="text-xs font-bold uppercase text-slate-500">Selected kits</p><p className="mt-2 text-sm font-semibold text-slate-800">{chosenSubjects.map(id=>subjects.find(s=>s.id===id)?.title).join(" · ")}</p><p className="mt-2 text-2xl font-black text-indigo-700">₹{chosenPrice}</p></div>
            <label className="block text-sm font-bold text-slate-700">Full name<input required minLength={2} maxLength={100} value={student.name} onChange={e=>setStudent({...student,name:e.target.value})} className="mt-1 w-full rounded-xl border border-slate-200 p-3 font-normal" autoComplete="name"/></label>
            <label className="block text-sm font-bold text-slate-700">Account email<input required type="email" value={student.email} readOnly className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-3 font-normal"/></label>
            <label className="block text-sm font-bold text-slate-700">Phone number<input required type="tel" pattern="\+?[0-9\s\-]{10,18}" value={student.phone} onChange={e=>setStudent({...student,phone:e.target.value})} className="mt-1 w-full rounded-xl border border-slate-200 p-3 font-normal" autoComplete="tel" placeholder="10-digit mobile number"/></label>
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
