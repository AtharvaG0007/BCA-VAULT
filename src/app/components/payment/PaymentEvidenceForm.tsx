import { useRef, useState, type FormEvent } from "react";
import { AlertCircle, CheckCircle2, ImageUp, Loader2, ShieldCheck, X, Sparkles } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/app/components/auth/AuthContext";
import { useNavigate } from "react-router";
import { PaymentEvidenceSuccess } from "./PaymentEvidenceSuccess";
import { publicAnonKey } from "../../../../utils/supabase/info";

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ACCEPTED_TYPES = ["image/png", "image/jpeg", "image/webp"];
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "https://dmxegktlxqsxaysqwswa.supabase.co";
const ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || publicAnonKey;

interface EdgeResponse<T = any> { success?: boolean; error?: string; [key: string]: any; }

async function callPaymentFunction<T = any>(body: Record<string, unknown>): Promise<T> {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  const headers: Record<string, string> = { "Content-Type": "application/json", apikey: ANON_KEY };
  if (token) headers.Authorization = `Bearer ${token}`;
  try {
    const { data, error } = await supabase.functions.invoke("payment-evidence", { body, headers: token ? { Authorization: `Bearer ${token}` } : undefined });
    if (!error && data && data.success !== false) return data as T;
    if (data?.error) throw new Error(data.error);
    if (error) console.warn("[PaymentEvidenceForm] supabase.functions.invoke warning, falling back to fetch:", error);
  } catch (err: any) {
    if (err.message && !err.message.includes("Failed to send a request")) throw err;
  }
  const response = await fetch(`${SUPABASE_URL}/functions/v1/payment-evidence`, { method: "POST", headers, body: JSON.stringify(body) });
  const json: EdgeResponse = await response.json().catch(() => ({ success: false, error: `Server responded with status ${response.status}` }));
  if (!response.ok || json.success === false) throw new Error(json.error || `Payment request failed with status ${response.status}`);
  return json as T;
}

export function PaymentEvidenceForm({ onClose, initialBundleId, initialPrice = 349, initialReferralIdentifier }: { onClose: () => void; initialBundleId?: string; initialPrice?: number; initialReferralIdentifier?: string; }) {
  const navigate = useNavigate();
  const { user, appUser } = useAuth();
  const fileInput = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [referenceId, setReferenceId] = useState<string | null>(null);
  const [form, setForm] = useState({ fullName: appUser?.name || "", phone: "", email: user?.email || appUser?.email || "", course: "BCA", semester: appUser?.semester ? String(appUser.semester) : "1", amountPaid: String(initialPrice || 349), utr: "", referralCode: initialReferralIdentifier || "", paymentConfirmation: false });
  const update = (key: keyof typeof form, value: string | boolean) => setForm((current) => ({ ...current, [key]: value }));
  function chooseFile(nextFile: File | undefined) { setError(""); if (!nextFile) return; if (!ACCEPTED_TYPES.includes(nextFile.type)) return setError("Please upload a PNG, JPG, or WebP image."); if (nextFile.size > MAX_FILE_SIZE) return setError("Payment screenshot must be 5 MB or smaller."); setFile(nextFile); }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError("");
    if (!file) return setError("Please upload your payment screenshot.");
    if (!form.utr.trim()) return setError("Please enter your 12-digit UPI transaction ID / UTR.");
    if (!form.paymentConfirmation) return setError("Please confirm that the payment details are correct.");
    setSubmitting(true);
    try {
      const createUploadData = await callPaymentFunction<{ submission_id: string; storage_path: string; token: string }>({ action: "create-upload", bundle_id: initialBundleId || undefined, content_type: file.type, size: file.size });
      if (!createUploadData.storage_path || !createUploadData.token) throw new Error("Unable to authorize screenshot upload. Please try again.");
      const { submission_id, storage_path, token } = createUploadData;
      const { error: uploadError } = await supabase.storage.from("bca-payment-evidence").uploadToSignedUrl(storage_path, token, file, { contentType: file.type });
      if (uploadError) throw new Error("Failed to upload payment screenshot. Please check your internet connection and try again.");
      const submitData = await callPaymentFunction<{ submission_id: string; status: string }>({ action: "submit", bundle_id: initialBundleId || undefined, full_name: form.fullName.trim(), phone: form.phone.trim(), email: form.email.trim().toLowerCase(), course: form.course.trim(), semester: Number(form.semester) || 1, amount: Number(form.amountPaid), utr: form.utr.trim().toUpperCase(), referral_code: form.referralCode.trim() || undefined, referral_identifier: form.referralCode.trim() || undefined, submission_id, storage_path });
      if (!submitData.submission_id) throw new Error("Failed to finalize payment record. Please contact support if payment was debited.");
      try { sessionStorage.setItem("bca_payment_lead", JSON.stringify({ fullName: form.fullName.trim(), email: form.email.trim().toLowerCase(), phone: form.phone.trim(), course: form.course.trim(), semester: Number(form.semester) || 1, referenceId: submitData.submission_id, amount: Number(form.amountPaid) })); } catch { /* Ignore session storage errors */ }
      setReferenceId(submitData.submission_id);
    } catch (caught: any) {
      console.error("[PaymentEvidenceForm] Error submitting payment:", caught);
      setError(caught instanceof Error ? caught.message : "Something went wrong while submitting payment details. Please try again later.");
    } finally { setSubmitting(false); }
  }
  if (referenceId) return <PaymentEvidenceSuccess referenceId={referenceId} guestData={!user ? { fullName: form.fullName.trim(), email: form.email.trim().toLowerCase(), phone: form.phone.trim(), course: form.course.trim(), semester: Number(form.semester) || 1, utr: form.utr.trim().toUpperCase() } : undefined} onDashboard={() => navigate("/app/dashboard")} onClose={onClose} />;
  return (
    <div className="fixed inset-0 z-[110] overflow-y-auto bg-slate-950/60 p-3 sm:p-6 lg:p-8" role="dialog" aria-modal="true" aria-label="Submit payment evidence">
      <div className="mx-auto my-2 sm:my-4 w-full max-w-2xl rounded-2xl sm:rounded-3xl bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-100 p-4 sm:p-6 lg:p-8"><div><p className="text-xs font-bold uppercase tracking-[.16em] text-indigo-600">Step 2 · Submit evidence</p><h2 className="mt-1 text-xl sm:text-2xl font-bold text-slate-950">Submit Payment Form</h2><p className="mt-1 text-xs sm:text-sm text-slate-500">Your evidence is verified manually before bundle access is activated.</p></div><button type="button" onClick={onClose} className="rounded-xl p-2 text-slate-500 hover:bg-slate-100 transition" aria-label="Close form"><X className="h-5 w-5" /></button></div>
        <form onSubmit={submit} className="space-y-4 sm:space-y-5 p-4 sm:p-6 lg:p-8">
          {error && <div role="alert" className="flex gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{error}</div>}
          <div className="flex items-center justify-between rounded-2xl border border-indigo-100 bg-gradient-to-r from-indigo-50 to-blue-50/50 p-4"><div><span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-indigo-700"><Sparkles className="h-3 w-3 text-amber-500" />Target Course Bundle</span><h4 className="text-base font-bold text-slate-900">BCA Semester 1 Bundle</h4><p className="text-xs text-slate-500">Semester 1 Notes + Most Repeated Topics</p></div><div className="text-right"><span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Amount</span><p className="font-mono text-2xl font-extrabold text-indigo-700">₹{form.amountPaid}</p></div></div>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Full Name" required><input required value={form.fullName} onChange={(e)=>update("fullName",e.target.value)} placeholder="Student full name" className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white p-3 text-sm outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100" autoComplete="name" /></Field>
            <Field label="Phone Number" required><input required value={form.phone} onChange={(e)=>update("phone",e.target.value)} placeholder="10-digit mobile number" className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white p-3 text-sm outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100" inputMode="tel" autoComplete="tel" /></Field>
            <Field label="Email Address" required><input required type="email" value={form.email} onChange={(e)=>update("email",e.target.value)} readOnly={Boolean(user?.email)} placeholder="student@gmail.com" className={`mt-1.5 w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 ${user?.email ? "bg-slate-50 text-slate-600" : "bg-white text-slate-900"}`} autoComplete="email" /></Field>
            <Field label="Course" required><input required disabled value="BCA (Bachelor of Computer Applications)" className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600" /></Field>
            <Field label="Semester" required><input required disabled value="Semester 1" className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600" /></Field>
            <Field label="Amount Paid" required><div className="relative mt-1.5"><span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-500">₹</span><input required type="number" value={form.amountPaid} readOnly className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 pl-8 text-sm font-bold text-slate-900 outline-none" /></div></Field>
          </div>
          <Field label="UPI Transaction ID / 12-digit UTR" required><input required value={form.utr} onChange={(e)=>update("utr",e.target.value.toUpperCase())} placeholder="12-digit UTR from your UPI payment receipt" className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white p-3 font-mono text-sm uppercase outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 tracking-wider" minLength={6} maxLength={64} /></Field>
          <Field label="Referral Identifier (Optional)"><input value={form.referralCode} onChange={(e)=>update("referralCode",e.target.value)} placeholder="e.g. Atharva Gogawale DMS" className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white p-3 font-medium text-sm outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100" /><span className="mt-1 block text-xs text-slate-400">Were you referred by a BCA Vault student? Enter their referral identifier (e.g. Atharva Gogawale DMS) so they receive referral credit upon payment verification.</span></Field>
          <div><label className="block text-sm font-bold text-slate-700">Payment Screenshot <span className="text-red-600">*</span></label><input ref={fileInput} type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={(e)=>chooseFile(e.target.files?.[0])} /><button type="button" onClick={()=>fileInput.current?.click()} className="mt-2 flex w-full items-center gap-3 rounded-2xl border border-dashed border-indigo-300 bg-indigo-50/50 p-4 text-left hover:bg-indigo-50 transition"><ImageUp className="h-6 w-6 text-indigo-600 shrink-0" /><span className="min-w-0"><span className="block text-sm font-bold text-slate-800 truncate">{file ? file.name : "Click to select payment screenshot"}</span><span className="mt-0.5 block text-xs text-slate-500">PNG, JPG, JPEG, or WebP · up to 5 MB</span></span></button></div>
          <label className="flex cursor-pointer items-start gap-3 rounded-xl bg-slate-50 p-4 text-sm leading-6 text-slate-600"><input required type="checkbox" checked={form.paymentConfirmation} onChange={(e)=>update("paymentConfirmation",e.target.checked)} className="mt-1 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 accent-indigo-600" /><span>I confirm that the payment details and screenshot are accurate. I understand that payment verification is completed manually by BCA Vault.</span></label>
          <div className="flex gap-2 rounded-xl border border-indigo-100 bg-indigo-50/60 p-3 text-xs leading-5 text-slate-600"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-indigo-600" />Your screenshot is encrypted and stored in private BCA Vault storage. No external parties have access.</div>
          <button type="submit" disabled={submitting} className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-5 py-4 text-sm font-bold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-400 transition shadow-lg shadow-indigo-600/20">{submitting && <Loader2 className="h-4 w-4 animate-spin" />}{submitting ? "Submitting payment evidence…" : "Submit Payment Evidence"}</button>
        </form>
      </div>
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return <label className="block text-sm font-bold text-slate-700">{label} {required && <span className="text-red-600">*</span>}{children}</label>;
}
