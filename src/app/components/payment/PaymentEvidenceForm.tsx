import { useEffect, useRef, useState, type FormEvent } from "react";
import { AlertCircle, CheckCircle2, ImageUp, Loader2, LogIn, ShieldCheck, X } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/app/components/auth/AuthContext";
import { useNavigate } from "react-router";
import { PaymentEvidenceSuccess } from "./PaymentEvidenceSuccess";
import { publicAnonKey } from "../../../../utils/supabase/info";

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ACCEPTED_TYPES = ["image/png", "image/jpeg", "image/webp"];

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "https://dmxegktlxqsxaysqwswa.supabase.co";
const ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || publicAnonKey;

interface BundleOption {
  id: string;
  title: string;
  price: number;
}

interface EdgeResponse<T = any> {
  success?: boolean;
  error?: string;
  [key: string]: any;
}

async function callPaymentFunction<T = any>(body: Record<string, unknown>): Promise<T> {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;

  if (!token) {
    throw new Error("Authentication required. Please sign in to submit payment evidence.");
  }

  // 1. Try invoking through supabase-js client
  try {
    const { data, error } = await supabase.functions.invoke("payment-evidence", {
      body,
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!error && data && data.success !== false) {
      return data as T;
    }
    if (data?.error) {
      throw new Error(data.error);
    }
    if (error) {
      console.warn("[PaymentEvidenceForm] supabase.functions.invoke warning, falling back to fetch:", error);
    }
  } catch (err: any) {
    if (err.message && !err.message.includes("Failed to send a request")) {
      throw err;
    }
  }

  // 2. Direct fetch fallback with full CORS and Authorization headers
  const url = `${SUPABASE_URL}/functions/v1/payment-evidence`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
      "apikey": ANON_KEY,
    },
    body: JSON.stringify(body),
  });

  const json: EdgeResponse = await response.json().catch(() => ({
    success: false,
    error: `Server responded with status ${response.status}`,
  }));

  if (!response.ok || json.success === false) {
    throw new Error(json.error || `Payment request failed with status ${response.status}`);
  }

  return json as T;
}

export function PaymentEvidenceForm({
  onClose,
  initialBundleId,
}: {
  onClose: () => void;
  initialBundleId?: string;
}) {
  const navigate = useNavigate();
  const { user, appUser } = useAuth();
  const fileInput = useRef<HTMLInputElement>(null);

  const [bundles, setBundles] = useState<BundleOption[]>([]);
  const [selectedBundleId, setSelectedBundleId] = useState<string>(initialBundleId || "");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [referenceId, setReferenceId] = useState<string | null>(null);

  const [form, setForm] = useState({
    fullName: appUser?.name || "",
    phone: "",
    email: user?.email || appUser?.email || "",
    course: "BCA",
    semester: appUser?.semester ? String(appUser.semester) : "1",
    amountPaid: "899",
    utr: "",
    paymentConfirmation: false,
  });

  useEffect(() => {
    async function loadBundles() {
      try {
        const { data, error: bError } = await supabase
          .from("bundles")
          .select("id, title, price")
          .eq("published", true)
          .order("price", { ascending: false });

        if (!bError && data && data.length > 0) {
          setBundles(data);
          if (!selectedBundleId) {
            setSelectedBundleId(data[0].id);
            setForm((prev) => ({ ...prev, amountPaid: String(data[0].price) }));
          }
        }
      } catch (err) {
        console.error("Failed to load bundles:", err);
      }
    }
    void loadBundles();
  }, [selectedBundleId]);

  useEffect(() => {
    if (user?.email && !form.email) {
      setForm((prev) => ({
        ...prev,
        email: user.email || "",
        fullName: prev.fullName || appUser?.name || "",
      }));
    }
  }, [user, appUser]);

  const update = (key: keyof typeof form, value: string | boolean) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const handleBundleChange = (bundleId: string) => {
    setSelectedBundleId(bundleId);
    const bundle = bundles.find((b) => b.id === bundleId);
    if (bundle) {
      setForm((prev) => ({ ...prev, amountPaid: String(bundle.price) }));
    }
  };

  function chooseFile(nextFile: File | undefined) {
    setError("");
    if (!nextFile) return;
    if (!ACCEPTED_TYPES.includes(nextFile.type)) {
      return setError("Please upload a PNG, JPG, or WebP image.");
    }
    if (nextFile.size > MAX_FILE_SIZE) {
      return setError("Payment screenshot must be 5 MB or smaller.");
    }
    setFile(nextFile);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!user) {
      return setError("Please sign in to your BCA Vault account before submitting payment.");
    }

    if (!selectedBundleId) {
      return setError("Please select a bundle.");
    }

    if (!file) {
      return setError("Please upload your payment screenshot.");
    }

    if (!form.paymentConfirmation) {
      return setError("Please confirm that the payment details are correct.");
    }

    setSubmitting(true);

    try {
      // Step 1: Create signed upload URL via Edge Function
      const createUploadData = await callPaymentFunction<{
        submission_id: string;
        storage_path: string;
        token: string;
      }>({
        action: "create-upload",
        bundle_id: selectedBundleId,
        content_type: file.type,
        size: file.size,
      });

      if (!createUploadData.storage_path || !createUploadData.token) {
        throw new Error("Unable to authorize screenshot upload. Please try again.");
      }

      const { submission_id, storage_path, token } = createUploadData;

      // Step 2: Upload file directly to private Supabase Storage using signed URL
      const { error: uploadError } = await supabase.storage
        .from("bca-payment-evidence")
        .uploadToSignedUrl(storage_path, token, file, {
          contentType: file.type,
        });

      if (uploadError) {
        throw new Error("Failed to upload payment screenshot. Please check your internet connection and try again.");
      }

      // Step 3: Finalize submission via Edge Function
      const submitData = await callPaymentFunction<{
        submission_id: string;
        status: string;
      }>({
        action: "submit",
        bundle_id: selectedBundleId,
        full_name: form.fullName.trim(),
        phone: form.phone.trim(),
        email: form.email.trim(),
        course: form.course.trim(),
        semester: Number(form.semester),
        amount: Number(form.amountPaid),
        utr: form.utr.trim().toUpperCase(),
        submission_id,
        storage_path,
      });

      if (!submitData.submission_id) {
        throw new Error("Failed to finalize payment record. Please contact support if payment was debited.");
      }

      setReferenceId(submitData.submission_id);
    } catch (caught: any) {
      console.error("[PaymentEvidenceForm] Error submitting payment:", caught);
      setError(
        caught instanceof Error
          ? caught.message
          : "Something went wrong while submitting payment details. Please try again later."
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (referenceId) {
    return (
      <PaymentEvidenceSuccess
        referenceId={referenceId}
        onDashboard={() => navigate("/app/dashboard")}
        onClose={onClose}
      />
    );
  }

  return (
    <div
      className="fixed inset-0 z-[110] overflow-y-auto bg-slate-950/60 p-4 sm:p-8"
      role="dialog"
      aria-modal="true"
      aria-label="Submit payment evidence"
    >
      <div className="mx-auto my-4 w-full max-w-2xl rounded-3xl bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-100 p-6 sm:p-8">
          <div>
            <p className="text-xs font-bold uppercase tracking-[.16em] text-indigo-600">
              Step 2 · Submit evidence
            </p>
            <h2 className="mt-2 text-2xl font-bold text-slate-950">Submit Payment Form</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Your evidence is reviewed manually before bundle access is authorized.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-slate-500 hover:bg-slate-100"
            aria-label="Close form"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {!user ? (
          <div className="p-8 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
              <LogIn className="h-7 w-7" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Sign in required</h3>
            <p className="mt-2 text-sm text-slate-500 max-w-md mx-auto">
              Please sign in or create an account with your BCA Vault registered email to link your payment.
            </p>
            <button
              type="button"
              onClick={() => navigate("/auth/login")}
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-sm font-bold text-white hover:bg-indigo-700 transition"
            >
              Sign In to Continue
            </button>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-5 p-6 sm:p-8">
            {error && (
              <div
                role="alert"
                className="flex gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700"
              >
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                {error}
              </div>
            )}

            {bundles.length > 1 && (
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">
                  Select Bundle <span className="text-red-600">*</span>
                </label>
                <select
                  value={selectedBundleId}
                  onChange={(e) => handleBundleChange(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm font-medium text-slate-800 outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100"
                  required
                >
                  {bundles.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.title} — ₹{b.price}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Full Name" required>
                <input
                  required
                  value={form.fullName}
                  onChange={(e) => update("fullName", e.target.value)}
                  placeholder="Your full name"
                  className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white p-3 text-sm outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100"
                  autoComplete="name"
                />
              </Field>

              <Field label="Phone Number" required>
                <input
                  required
                  value={form.phone}
                  onChange={(e) => update("phone", e.target.value)}
                  placeholder="10-digit mobile number"
                  className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white p-3 text-sm outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100"
                  inputMode="tel"
                  autoComplete="tel"
                />
              </Field>

              <Field label="Registered Email" required>
                <input
                  required
                  type="email"
                  value={form.email}
                  onChange={(e) => update("email", e.target.value)}
                  readOnly={!!user?.email}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700 outline-none"
                  autoComplete="email"
                />
              </Field>

              <Field label="Course" required>
                <select
                  required
                  value={form.course}
                  onChange={(e) => update("course", e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white p-3 text-sm outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100"
                >
                  <option value="BCA">BCA (Bachelor of Computer Applications)</option>
                  <option value="Other">Other</option>
                </select>
              </Field>

              <Field label="Semester" required>
                <select
                  required
                  value={form.semester}
                  onChange={(e) => update("semester", e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white p-3 text-sm outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100"
                >
                  <option value="">Select semester</option>
                  {[1, 2, 3, 4, 5, 6].map((semester) => (
                    <option key={semester} value={semester}>
                      Semester {semester}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Amount Paid" required>
                <div className="relative mt-1.5">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-500">
                    ₹
                  </span>
                  <input
                    required
                    type="number"
                    value={form.amountPaid}
                    readOnly
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 pl-8 text-sm font-bold text-slate-900 outline-none"
                  />
                </div>
              </Field>
            </div>

            <Field label="UPI Transaction ID / UTR" required>
              <input
                required
                value={form.utr}
                onChange={(e) => update("utr", e.target.value.toUpperCase())}
                placeholder="12-digit UTR or transaction ID (e.g. 423456789012)"
                className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white p-3 font-mono text-sm uppercase outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100"
                minLength={6}
                maxLength={64}
              />
            </Field>

            <div>
              <label className="block text-sm font-bold text-slate-700">
                Payment Screenshot <span className="text-red-600">*</span>
              </label>
              <input
                ref={fileInput}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="sr-only"
                onChange={(e) => chooseFile(e.target.files?.[0])}
              />
              <button
                type="button"
                onClick={() => fileInput.current?.click()}
                className="mt-2 flex w-full items-center gap-3 rounded-2xl border border-dashed border-indigo-300 bg-indigo-50/50 p-4 text-left hover:bg-indigo-50 transition"
              >
                <ImageUp className="h-6 w-6 text-indigo-600 shrink-0" />
                <span className="min-w-0">
                  <span className="block text-sm font-bold text-slate-800 truncate">
                    {file ? file.name : "Choose a payment screenshot"}
                  </span>
                  <span className="mt-0.5 block text-xs text-slate-500">
                    PNG, JPG, JPEG, or WebP · maximum 5 MB
                  </span>
                </span>
              </button>
            </div>

            <label className="flex cursor-pointer items-start gap-3 rounded-xl bg-slate-50 p-4 text-sm leading-6 text-slate-600">
              <input
                required
                type="checkbox"
                checked={form.paymentConfirmation}
                onChange={(e) => update("paymentConfirmation", e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 accent-indigo-600"
              />
              <span>
                I confirm that the payment details and screenshot are accurate. I understand that payment
                verification is manual.
              </span>
            </label>

            <div className="flex gap-2 rounded-xl border border-indigo-100 bg-indigo-50/60 p-3 text-xs leading-5 text-slate-600">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-indigo-600" />
              Your screenshot is uploaded securely to private BCA Vault storage. Submission does not
              automatically grant access.
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-5 py-4 text-sm font-bold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-400 transition"
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {submitting ? "Submitting evidence…" : "Submit Payment Evidence"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block text-sm font-bold text-slate-700">
      {label} {required && <span className="text-red-600">*</span>}
      {children}
    </label>
  );
}
