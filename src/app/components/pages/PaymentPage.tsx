import { useState, useEffect } from "react";
import { QRCodeSVG } from "qrcode.react";
import {
  ArrowUpRight,
  Check,
  Clipboard,
  Clock3,
  ExternalLink,
  LockKeyhole,
  ShieldCheck,
  Smartphone,
  Tag,
  Timer,
  Sparkles,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "../auth/AuthContext";
import { PaymentEvidenceForm } from "../payment/PaymentEvidenceForm";

export const GOOGLE_PAYMENT_FORM_URL =
  "https://docs.google.com/forms/d/e/1FAIpQLSfKie4-l2VIcbkQ8cej2Wuq0BYQInPb6EfobEiQeZiu8bPbLg/viewform?usp=dialog";

const UPI_ID = "gogawaleatharva997-1@oksbi";
const UPI_NAME = "BCA Vault";

/** Regular price — always enforced server-side */
const REGULAR_PRICE = 100;
const instructions = [
  "Pay ₹100 — the same price for every student using any UPI app or QR code.",
  "Capture a screenshot showing the 12-digit UTR / UPI Transaction ID.",
  "Click 'Submit Payment Form' and upload your payment details.",
  "Create your BCA Vault account — your payment details will be auto-filled.",
  "Our admin team verifies your payment and assigns your complete bundle.",
];

export function PaymentPage() {
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);

  // Student DMS Referral state (separate from winner redemption)
  const [referralInput, setReferralInput] = useState("");
  const [appliedReferral, setAppliedReferral] = useState<string | null>(null);
  const [referralValidating, setReferralValidating] = useState(false);
  const [referralError, setReferralError] = useState<string | null>(null);

  const [showEvidenceModal, setShowEvidenceModal] = useState(false);

  // Marketing countdown timer: 3 minutes 50 seconds (230 seconds)
  const [secondsRemaining, setSecondsRemaining] = useState(230);

  useEffect(() => {
    const interval = setInterval(() => {
      setSecondsRemaining((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  /** Universal bundle price — ₹100 for every student */
  const currentPrice = REGULAR_PRICE;

  const upiUrl = `upi://pay?pa=${encodeURIComponent(UPI_ID)}&pn=${encodeURIComponent(
    UPI_NAME
  )}&am=${currentPrice}&cu=INR&tn=${encodeURIComponent(
    `BCA Vault Semester 1 Bundle`
  )}`;

  const handleApplyReferral = async () => {
    const raw = referralInput.trim();
    setReferralError(null);

    if (!raw) {
      setReferralError("Please enter a referral identifier.");
      return;
    }

    setReferralValidating(true);
    try {
      const { data, error } = await supabase.rpc("resolve_referral_identifier", {
        p_identifier: raw,
        p_caller_user_id: user?.id || null,
        p_caller_email: user?.email || null,
      });

      if (error) {
        setReferralError(error.message || "Referral identifier not found.");
        return;
      }

      if (!data || !data.success) {
        setReferralError(data?.error || "Referral identifier not found.");
        return;
      }

      setAppliedReferral(data.referral_identifier || `${data.referrer_name} DMS`);
      setReferralError(null);
      setReferralInput("");
    } catch (err: any) {
      setReferralError(err?.message || "Unable to verify referral identifier.");
    } finally {
      setReferralValidating(false);
    }
  };

  const copyUpi = async () => {
    await navigator.clipboard.writeText(UPI_ID).catch(() => undefined);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  return (
    <main className="min-h-screen bg-[#f7f8fc]">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-slate-950 pb-16 pt-12 text-white sm:pb-24 sm:pt-20">
        <div className="absolute inset-0 opacity-50 [background-image:radial-gradient(circle_at_20%_20%,rgba(79,70,229,0.45),transparent_28%),radial-gradient(circle_at_78%_4%,rgba(16,185,129,0.2),transparent_24%)]" />
        <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-950/60 px-3 py-1 text-xs font-semibold text-indigo-300 backdrop-blur-sm">
              <Sparkles className="h-3.5 w-3.5 text-amber-400" />
              <span>Official BVDU Student Edition</span>
            </div>
            <h1 className="mt-3 text-2xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl leading-tight">
              Complete your BCA Vault payment.
            </h1>
            <p className="mt-3 max-w-xl text-xs sm:text-base leading-relaxed text-slate-300">
              Pay via UPI, then submit your payment evidence for manual administrative verification.
            </p>
          </div>
        </div>
      </section>

      {/* Marketing Urgency Countdown Banner */}
      <div className="sticky top-0 z-30 border-b border-indigo-200/80 bg-gradient-to-r from-indigo-900 via-indigo-800 to-blue-900 px-3 py-2 text-white shadow-md sm:px-4 sm:py-2.5">
        <div className="mx-auto flex max-w-6xl flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs sm:text-sm">
          <div className="flex items-start sm:items-center gap-2 font-medium min-w-0">
            <Timer className="h-4 w-4 text-amber-400 animate-pulse shrink-0 mt-0.5 sm:mt-0" />
            <span className="leading-snug">
              All students: <strong className="text-emerald-300 font-bold">₹100</strong> · One-time bundle access
            </span>
          </div>
          <div className="flex items-center justify-between sm:justify-end gap-2.5 w-full sm:w-auto shrink-0 pt-1.5 sm:pt-0 border-t border-white/10 sm:border-t-0">
            <div className="flex items-center gap-1.5 rounded-lg bg-white/15 px-2.5 py-1 font-mono text-xs font-bold text-amber-300 backdrop-blur-sm">
              <span>Offer timer:</span>
              <span className="text-white">{formatTimer(secondsRemaining)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Payment Section */}
      <section className="relative mt-6 sm:mt-8 pb-16 sm:pb-20">
        <div className="mx-auto grid max-w-6xl gap-6 px-4 sm:px-6 lg:px-8 lg:grid-cols-[0.9fr_1.1fr]">
          {/* Bundle Summary Card */}
          <aside className="rounded-3xl border border-slate-200 bg-white p-4 sm:p-6 lg:p-8 shadow-xl shadow-slate-950/5 w-full min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-indigo-600">Official Curriculum</p>
            <h2 className="mt-1.5 text-xl sm:text-2xl font-bold tracking-tight text-slate-950">
              BCA Semester 1 Bundle
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Semester 1 Notes + Most Repeated Topics
            </p>

            {/* Price Box */}
            <div className="my-5 border-y border-slate-100 py-4 sm:py-5">
              <div className="flex items-baseline gap-3">
                <p className="font-mono text-4xl sm:text-5xl font-extrabold text-slate-950">₹{currentPrice}</p>
              </div>
              <p className="mt-1.5 text-xs text-slate-500">One-time manual UPI payment</p>
            </div>
            {/* Referral Identifier Section (Separate from Discount Coupon) */}
            <div className="mb-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="mb-2">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Have a referral code?
                </label>
                <p className="mt-0.5 text-[11px] text-slate-500 leading-normal">
                  Were you referred by a BCA Vault student? Enter their referral identifier below.
                </p>
              </div>

              {!appliedReferral ? (
                <div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={referralInput}
                      onChange={(e) => {
                        setReferralInput(e.target.value);
                        if (referralError) setReferralError(null);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          void handleApplyReferral();
                        }
                      }}
                      placeholder="e.g. Atharva Gogawale DMS"
                      disabled={referralValidating}
                      className="flex-1 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none disabled:bg-slate-100"
                    />
                    <button
                      type="button"
                      onClick={() => void handleApplyReferral()}
                      disabled={referralValidating}
                      className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800 transition disabled:bg-slate-400 shrink-0 inline-flex items-center gap-1.5"
                    >
                      {referralValidating ? (
                        <>
                          <Loader2 className="h-3 w-3 animate-spin" />
                          <span>Checking...</span>
                        </>
                      ) : (
                        "Apply"
                      )}
                    </button>
                  </div>

                  {referralError && (
                    <p className="mt-2 flex items-start gap-1 text-[11px] font-semibold text-rose-600">
                      <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                      <span>{referralError}</span>
                    </p>
                  )}
                </div>
              ) : (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1 text-xs font-bold text-emerald-800">
                      <Check className="h-3.5 w-3.5 text-emerald-600" />
                      <span>✓ Referral applied</span>
                    </div>
                    <p className="mt-0.5 text-[11px] font-medium text-emerald-700 truncate">
                      Referred by: <strong className="font-semibold text-slate-900">{appliedReferral}</strong>
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setAppliedReferral(null);
                      setReferralError(null);
                    }}
                    className="text-[11px] font-bold text-slate-500 hover:text-slate-800 underline shrink-0 px-1"
                  >
                    Change
                  </button>
                </div>
              )}
            </div>

            <div className="space-y-2.5 rounded-2xl bg-slate-50 p-4 text-xs text-slate-600">
              {[
                "Semester 1 Study Notes (All Theory Subjects)",
                "Semester 1 Most Repeated Topics",
                "Unit-Wise & Topic-Wise Exam Prep",
                "Mathematics, labs & projects excluded",
              ].map((item) => (
                <p key={item} className="flex gap-2 font-medium">
                  <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
                  {item}
                </p>
              ))}
            </div>
          </aside>

          {/* Payment Steps */}
          <div className="space-y-6 w-full min-w-0">
            {/* Step 1: UPI / QR */}
            <article className="rounded-3xl border border-slate-200 bg-white p-4 sm:p-6 lg:p-8 shadow-sm w-full min-w-0">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-indigo-600">
                    Step 1 · Make payment
                  </p>
                  <h2 className="mt-1 text-xl sm:text-2xl font-bold text-slate-950">UPI / QR Payment</h2>
                </div>
                <Smartphone className="h-5 w-5 sm:h-6 sm:w-6 text-indigo-600 shrink-0 mt-0.5" />
              </div>

              <div className="mt-5 sm:mt-6 grid gap-6 sm:grid-cols-[1fr_156px] sm:items-center">
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                    Transfer exactly <strong className="font-bold text-slate-950 font-mono text-sm sm:text-base">₹{currentPrice}</strong> using any UPI app (GPay, PhonePe, Paytm, BHIM).
                  </p>
                  <div className="mt-3.5 sm:mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 sm:p-4 min-w-0">
                    <div className="min-w-0 max-w-full">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                        Official UPI ID
                      </p>
                      <p className="mt-0.5 truncate font-mono text-xs sm:text-sm font-bold text-slate-900">{UPI_ID}</p>
                    </div>
                    <button
                      type="button"
                      onClick={copyUpi}
                      className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl bg-white px-3 py-2 text-xs font-bold text-indigo-700 shadow-sm ring-1 ring-slate-200 hover:bg-slate-50 transition cursor-pointer self-start sm:self-auto"
                    >
                      {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Clipboard className="h-3.5 w-3.5" />}
                      {copied ? "Copied" : "Copy"}
                    </button>
                  </div>
                  <a
                    href={upiUrl}
                    className="mt-3.5 sm:mt-4 inline-flex items-center gap-2 text-xs font-bold text-indigo-600 hover:text-indigo-800 transition"
                  >
                    Open in UPI App <ArrowUpRight className="h-3.5 w-3.5" />
                  </a>
                </div>

                <div className="justify-self-center rounded-2xl border border-slate-200 bg-white p-3 text-center shadow-sm">
                  <QRCodeSVG value={upiUrl} size={132} level="M" includeMargin />
                  <p className="mt-1.5 text-center text-[10px] font-bold text-slate-600">Scan to pay ₹{currentPrice}</p>
                </div>
              </div>
            </article>

            {/* Step 2: Evidence Submission */}
            <article className="rounded-3xl border border-indigo-100 bg-indigo-50/50 p-4 sm:p-6 lg:p-8 w-full min-w-0">
              <div className="flex items-start gap-3">
                <div className="grid h-9 w-9 sm:h-10 sm:w-10 shrink-0 place-items-center rounded-xl bg-indigo-600 text-white">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-indigo-600">
                    Step 2 · Submit evidence
                  </p>
                  <h2 className="mt-1 text-xl sm:text-2xl font-bold text-slate-950">Submit Payment Evidence</h2>
                  <p className="mt-1.5 text-xs leading-relaxed text-slate-600">
                    After transferring ₹{currentPrice} via UPI, submit your 12-digit UTR and payment screenshot for instant verification queue.
                  </p>
                </div>
              </div>

              <div className="mt-5 sm:mt-6 space-y-3">
                <button
                  type="button"
                  onClick={() => setShowEvidenceModal(true)}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-4 py-3.5 sm:py-4 text-xs sm:text-sm font-bold text-white shadow-lg shadow-indigo-600/20 transition hover:bg-indigo-700 active:scale-[0.99] cursor-pointer"
                >
                  <ShieldCheck className="h-4 w-4" />
                  <span>Submit Payment Evidence (In-App)</span>
                </button>

                <div className="text-center">
                  <span className="text-[11px] text-slate-400">or submit via </span>
                  <a
                    href={GOOGLE_PAYMENT_FORM_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 hover:underline"
                  >
                    Official Google Form <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>

              <div className="mt-4 flex gap-2 rounded-xl border border-indigo-100 bg-white/80 p-3 text-xs leading-5 text-slate-600">
                <LockKeyhole className="mt-0.5 h-4 w-4 shrink-0 text-indigo-600" />
                Your submission is verified manually by the BCA Vault administration. Access is activated upon approval.
              </div>
            </article>

            {showEvidenceModal && (
              <PaymentEvidenceForm
                onClose={() => setShowEvidenceModal(false)}
                initialPrice={currentPrice}
                initialReferralIdentifier={appliedReferral || undefined}
              />
            )}
          </div>
        </div>
      </section>

      {/* Instructions & Approval Process */}
      <section className="border-t border-slate-200 bg-white py-12 sm:py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-indigo-600">
                How to get access
              </p>
              <h2 className="mt-1 text-2xl sm:text-3xl font-bold tracking-tight text-slate-950">
                A clear, manual approval process.
              </h2>
            </div>
            <p className="flex items-center gap-2 text-xs font-medium text-slate-500">
              <Clock3 className="h-4 w-4 text-indigo-600" />
              Payment verification is manual. Access is activated within a few hours.
            </p>
          </div>

          <ol className="mt-8 grid gap-3 md:grid-cols-2">
            {instructions.map((instruction, index) => (
              <li key={instruction} className="flex gap-4 rounded-2xl border border-slate-200 p-4">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-slate-950 font-mono text-xs font-bold text-white">
                  {index + 1}
                </span>
                <p className="pt-0.5 text-xs leading-5 text-slate-600">{instruction}</p>
              </li>
            ))}
          </ol>

          <div className="mt-8 flex gap-3 rounded-2xl border border-emerald-100 bg-emerald-50 p-5 text-xs leading-5 text-emerald-950">
            <ShieldCheck className="h-5 w-5 shrink-0 text-emerald-600" />
            Payment evidence submission is processed manually. Once approved, your theory materials and PYQs will automatically appear in your Student Dashboard.
          </div>
        </div>
      </section>
    </main>
  );
}
