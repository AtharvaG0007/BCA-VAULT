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
    if (error) console.warn("[PaymentEvidenceForm] invoke fallback:", error);
  } catch (err: any) {
    if (err.message && !err.message.includes("Failed to send a request")) throw err;
  }
  const response = await fetch(`${SUPABASE_URL}/functions/v1/payment-evidence`, { method: "POST", headers, body: JSON.stringify(body) });
  const json: EdgeResponse = await response.json().catch(() => ({ success: false, error: `Server responded with status ${response.status}` }));
  if (!response.ok || json.success === false) throw new Error(json.error || `Payment request failed with status ${response.status}`);
  return json as T;
}

export function PaymentEvidenceForm({ onClose, initialBundleId, initialPrice = 499, initialReferralIdentifier }: { onClose: () => void; initialBundleId?: string; initialPrice?: number; initialReferralIdentifier?: string; }) {
  const navigate = useNavigate();
  const { user, appUser } = useAuth();
  const fileInput = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [referenceId, setReferenceId] = useState<string | null>(null);
  const [form, setForm] = useState({ fullName: appUser?.name || "", phone: "", email: user?.email || appUser?.email || "", course: "BCA", semester: appUser?.semester ? String(appUser.semester) : "1", amountPaid: String(initialPrice || 499), utr: "", referralCode: initialReferralIdentifier || "", paymentConfirmation: false });
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
      try { sessionStorage.setItem("bca_payment_lead", JSON.stringify({ fullName: form.fullName.trim(), email: form.email.trim().toLowerCase(), phone: form.phone.trim(), course: form.course.trim(), semester: Number(form.semester) || 1, referenceId: submitData.submission_id, amount: Number(form.amountPaid) })); } catch { /* ignore */ }
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
          <div className="grid gap-5 sm:grid-cols-2"><label className="block text-sm font-semibold">Full Name<input required value={form.fullName} onChange={(e)=>update("fullName",e.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 p-3 text-sm" autoComplete="name" /></label><label className="block text-sm font-semibold">Phone Number<input required value={form.phone} onChange={(e)=>update("phone",e.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 p-3 text-sm" inputMode="tel" autoComplete="tel" /></label><label className="block text-sm font-semibold">Email Address<input required value={form.email} onChange={(e)=>update("email",e.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 p-3 text-sm" inputMode="email" autoComplete="email" /></label><label className="block text-sm font-semibold">UPI Transaction ID / UTR<input required value={form.utr} onChange={(e)=>update("utr",e.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 p-3 text-sm" /></label></div>
          <input ref={fileInput} type="file" accept={ACCEPTED_TYPES.join(",")} className="hidden" onChange={(e)=>chooseFile(e.target.files?.[0])} />
          <button type="button" onClick={()=>fileInput.current?.click()} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold"><ImageUp className="h-4 w-4" />{file ? file.name : "Upload payment screenshot"}</button>
          <label className="flex items-start gap-2 text-xs text-slate-600"><input type="checkbox" checked={Boolean(form.paymentConfirmation)} onChange={(e)=>update("paymentConfirmation",e.target.checked)} className="mt-0.5" />I confirm the payment details and transaction ID are correct.</label>
          <button type="submit" disabled={submitting} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3.5 text-sm font-bold text-white disabled:bg-slate-300">{submitting?<><Loader2 className="h-4 w-4 animate-spin"/>Submitting…</>:<><ShieldCheck className="h-4 w-4"/>Submit Payment Form</>}</button>
        </form>
      </div>
    </div>
  );
}
