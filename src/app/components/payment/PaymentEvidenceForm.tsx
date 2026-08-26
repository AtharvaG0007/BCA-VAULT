import { useRef, useState, type FormEvent } from "react";
import { AlertCircle, CheckCircle2, ImageUp, Loader2, ShieldCheck, X } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { useNavigate } from "react-router";
import { PaymentEvidenceSuccess } from "./PaymentEvidenceSuccess";

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ACCEPTED_TYPES = ["image/png", "image/jpeg", "image/webp"];

type UploadAuthorization = { submissionId: string; storagePath: string; bucket: string; token: string };
type ApiResult = { submissionId?: string; error?: string };

async function apiFetch(userToken: string, url: string, body: Record<string, unknown>) {
  return fetch(url, { method: "POST", headers: { "Content-Type": "application/json", ...(userToken ? { Authorization: `Bearer ${userToken}` } : {}) }, body: JSON.stringify(body) });
}

async function readApiResult(response: Response): Promise<ApiResult> {
  const body = await response.text();
  if (!body) return { error: response.status >= 500 ? "Temporary server error. Please try again later." : "The payment service returned an empty response." };
  try {
    return JSON.parse(body) as ApiResult;
  } catch {
    return { error: response.status >= 500 ? "Temporary server error. Please try again later." : "The payment service returned an invalid response." };
  }
}

export function PaymentEvidenceForm({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const fileInput = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [referenceId, setReferenceId] = useState<string | null>(null);
  const [form, setForm] = useState({
    fullName: "", phone: "", email: "", course: "BCA", semester: "", amountPaid: "899", utr: "", paymentConfirmation: false,
  });

  const update = (key: keyof typeof form, value: string | boolean) => setForm((current) => ({ ...current, [key]: value }));

  function chooseFile(nextFile: File | undefined) {
    setError("");
    if (!nextFile) return;
    if (!ACCEPTED_TYPES.includes(nextFile.type)) return setError("Please upload a PNG, JPG, or JPEG image.");
    if (nextFile.size > MAX_FILE_SIZE) return setError("Payment screenshot must be 5 MB or smaller.");
    setFile(nextFile);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (!file) return setError("Please upload your payment screenshot.");
    if (!form.paymentConfirmation) return setError("Please confirm that the payment details are correct.");

    setSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("Session expired. Please sign in again.");
      const authorize = await apiFetch(session.access_token, "/api/payment-evidence/create-upload", { contentType: file.type, size: file.size });
      const upload = await readApiResult(authorize) as UploadAuthorization & ApiResult;
      if (!authorize.ok) throw new Error(upload.error || "Your payment screenshot could not be uploaded. Please try again.");

      const { error: uploadError } = await supabase.storage.from(upload.bucket).uploadToSignedUrl(upload.storagePath, upload.token, file, { contentType: file.type });
      if (uploadError) throw new Error("Your payment screenshot could not be uploaded. Please try again.");

      const finalized = await apiFetch(session.access_token, "/api/payment-evidence/submit", { ...form, submissionId: upload.submissionId, storagePath: upload.storagePath });
      const result = await readApiResult(finalized);
      if (!finalized.ok || !result.submissionId) throw new Error(result.error || "We couldn't submit your payment evidence. Please try again.");
      setReferenceId(result.submissionId);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Something went wrong. Please try again later.");
    } finally {
      setSubmitting(false);
    }
  }

  if (referenceId) return <PaymentEvidenceSuccess referenceId={referenceId} onDashboard={() => navigate("/app/dashboard")} onClose={onClose} />;

  return <div className="fixed inset-0 z-[110] overflow-y-auto bg-slate-950/60 p-4 sm:p-8" role="dialog" aria-modal="true" aria-label="Submit payment evidence">
    <div className="mx-auto my-4 w-full max-w-2xl rounded-3xl bg-white shadow-2xl">
      <div className="flex items-start justify-between border-b border-slate-100 p-6 sm:p-8"><div><p className="text-xs font-bold uppercase tracking-[.16em] text-indigo-600">Step 2 · Submit evidence</p><h2 className="mt-2 text-2xl font-bold text-slate-950">Submit Payment Form</h2><p className="mt-2 text-sm leading-6 text-slate-500">Your evidence is reviewed manually before bundle access is authorized.</p></div><button type="button" onClick={onClose} className="rounded-xl p-2 text-slate-500 hover:bg-slate-100" aria-label="Close form"><X className="h-5 w-5" /></button></div>
      <form onSubmit={submit} className="space-y-5 p-6 sm:p-8">
        {error && <div role="alert" className="flex gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{error}</div>}
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Full Name" required><input required value={form.fullName} onChange={(e) => update("fullName", e.target.value)} className="field" autoComplete="name" /></Field>
          <Field label="Phone Number" required><input required value={form.phone} onChange={(e) => update("phone", e.target.value)} className="field" inputMode="tel" autoComplete="tel" /></Field>
          <Field label="BCA Vault Registered Email" required><input required type="email" value={form.email} onChange={(e) => update("email", e.target.value)} className="field" autoComplete="email" /></Field>
          <Field label="Course" required><select required value={form.course} onChange={(e) => update("course", e.target.value)} className="field"><option value="BCA">BCA</option><option value="Other">Other</option></select></Field>
          <Field label="Semester" required><select required value={form.semester} onChange={(e) => update("semester", e.target.value)} className="field"><option value="">Select semester</option>{[1, 2, 3, 4, 5, 6].map((semester) => <option key={semester} value={semester}>Semester {semester}</option>)}</select></Field>
          <Field label="Amount Paid" required><select required value={form.amountPaid} onChange={(e) => update("amountPaid", e.target.value)} className="field"><option value="899">₹899 — Standard Price</option><option value="849">₹849 — BUDMS50 Discount</option><option value="749">₹749 — WINNER150 Quiz Winner</option><option value="Other">Other</option></select></Field>
        </div>
        <Field label="UPI Transaction ID / UTR" required><input required value={form.utr} onChange={(e) => update("utr", e.target.value.toUpperCase())} className="field" minLength={6} maxLength={64} /></Field>
        <div><label className="block text-sm font-bold text-slate-700">Payment Screenshot <span className="text-red-600">*</span></label><input ref={fileInput} type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={(e) => chooseFile(e.target.files?.[0])} /><button type="button" onClick={() => fileInput.current?.click()} className="mt-2 flex w-full items-center gap-3 rounded-2xl border border-dashed border-indigo-300 bg-indigo-50/50 p-4 text-left hover:bg-indigo-50"><ImageUp className="h-6 w-6 text-indigo-600" /><span><span className="block text-sm font-bold text-slate-800">{file ? file.name : "Choose a payment screenshot"}</span><span className="mt-0.5 block text-xs text-slate-500">PNG, JPG, JPEG, or WebP · maximum 5 MB</span></span></button></div>
        <label className="flex cursor-pointer items-start gap-3 rounded-xl bg-slate-50 p-4 text-sm leading-6 text-slate-600"><input required type="checkbox" checked={form.paymentConfirmation} onChange={(e) => update("paymentConfirmation", e.target.checked)} className="mt-1 h-4 w-4 accent-indigo-600" /><span>I confirm that the payment details and screenshot are accurate. I understand that payment verification is manual.</span></label>
        <div className="flex gap-2 rounded-xl border border-indigo-100 bg-indigo-50/60 p-3 text-xs leading-5 text-slate-600"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-indigo-600" />Your screenshot is uploaded to private BCA Vault storage. Submission does not automatically grant access.</div>
        <button disabled={submitting} className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-5 py-4 text-sm font-bold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-400">{submitting && <Loader2 className="h-4 w-4 animate-spin" />}{submitting ? "Submitting evidence…" : "Submit Payment Evidence"}</button>
      </form>
    </div>
  </div>;
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return <label className="block text-sm font-bold text-slate-700">{label} {required && <span className="text-red-600">*</span>}{children}</label>;
}
