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
} from "lucide-react";

export const GOOGLE_PAYMENT_FORM_URL =
  "https://docs.google.com/forms/d/e/1FAIpQLSfKie4-l2VIcbkQ8cej2Wuq0BYQInPb6EfobEiQeZiu8bPbLg/viewform?usp=dialog";

const UPI_ID = "gogawaleatharva997-1@oksbi";
const UPI_NAME = "BCA Vault";
const BASE_PRICE = 899;

const VALID_COUPONS: Record<string, { discount: number; finalPrice: number; description: string }> = {
  BUDMS400: {
    discount: 400,
    finalPrice: 499,
    description: "Special Student Offer — ₹400 OFF",
  },
  WINNER150: {
    discount: 550,
    finalPrice: 349,
    description: "Top-3 Quiz Winner Access — Final Price ₹349",
  },
};

const instructions = [
  "Login or register to your BCA Vault account.",
  "Apply your coupon code (BUDMS400) for ₹499 offer.",
  "Complete the payment using the BCA Vault UPI ID or QR code.",
  "Take a clear screenshot of the successful payment showing the 12-digit UTR/Txn ID.",
  "Click Submit Payment Form to open the verification form.",
  "Enter the same email address used for your BCA Vault account.",
  "Upload your payment screenshot and submit the form.",
  "Our admin team manually verifies your payment and activates your notes.",
];

export function PaymentPage() {
  const [copied, setCopied] = useState(false);
  const [couponInput, setCouponInput] = useState("BUDMS400");
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>("BUDMS400");
  const [couponError, setCouponError] = useState<string | null>(null);

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

  const currentCouponInfo = appliedCoupon ? VALID_COUPONS[appliedCoupon] : null;
  const currentPrice = currentCouponInfo ? currentCouponInfo.finalPrice : BASE_PRICE;

  const upiUrl = `upi://pay?pa=${encodeURIComponent(UPI_ID)}&pn=${encodeURIComponent(
    UPI_NAME
  )}&am=${currentPrice}&cu=INR&tn=${encodeURIComponent(
    `BCA Vault Complete Bundle${appliedCoupon ? ` (${appliedCoupon})` : ""}`
  )}`;

  const handleApplyCoupon = (codeToApply?: string) => {
    const raw = (codeToApply ?? couponInput).trim().toUpperCase();
    setCouponError(null);

    if (!raw) {
      setAppliedCoupon(null);
      return;
    }

    if (VALID_COUPONS[raw]) {
      setAppliedCoupon(raw);
      setCouponInput(raw);
    } else {
      setCouponError("Invalid coupon code. Try BUDMS400 for ₹400 OFF.");
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
      <section className="relative overflow-hidden bg-slate-950 pb-24 pt-16 text-white sm:pt-20">
        <div className="absolute inset-0 opacity-50 [background-image:radial-gradient(circle_at_20%_20%,rgba(79,70,229,0.45),transparent_28%),radial-gradient(circle_at_78%_4%,rgba(16,185,129,0.2),transparent_24%)]" />
        <div className="relative mx-auto max-w-6xl px-5 sm:px-8">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-950/60 px-3 py-1 text-xs font-semibold text-indigo-300 backdrop-blur-sm">
              <Sparkles className="h-3.5 w-3.5 text-amber-400" />
              <span>Official BVDU Student Edition</span>
            </div>
            <h1 className="mt-4 text-4xl font-bold tracking-[-0.025em] sm:text-5xl">
              Complete your BCA Vault payment.
            </h1>
            <p className="mt-4 max-w-xl text-base leading-7 text-slate-300">
              Pay via UPI, then submit your payment evidence for manual administrative verification.
            </p>
          </div>
        </div>
      </section>

      {/* Marketing Urgency Countdown Banner */}
      <div className="sticky top-0 z-30 border-b border-indigo-200/80 bg-gradient-to-r from-indigo-900 via-indigo-800 to-blue-900 px-4 py-2.5 text-white shadow-md">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 text-xs sm:text-sm">
          <div className="flex items-center gap-2 font-medium">
            <Timer className="h-4 w-4 text-amber-400 animate-pulse" />
            <span>
              Special Offer: Use coupon <strong className="text-amber-300 font-mono tracking-wider">BUDMS400</strong> to get full access for only <strong className="text-emerald-300 font-bold">₹499</strong>!
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 rounded-lg bg-white/15 px-2.5 py-1 font-mono text-xs font-bold text-amber-300 backdrop-blur-sm">
              <span>Offer expires in:</span>
              <span className="text-white">{formatTimer(secondsRemaining)}</span>
            </div>
            {appliedCoupon !== "BUDMS400" && (
              <button
                onClick={() => handleApplyCoupon("BUDMS400")}
                className="rounded-lg bg-amber-400 px-2.5 py-1 text-xs font-bold text-slate-950 hover:bg-amber-300 transition"
              >
                Apply Coupon
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Payment Section */}
      <section className="relative mt-8 pb-20">
        <div className="mx-auto grid max-w-6xl gap-6 px-5 sm:px-8 lg:grid-cols-[0.9fr_1.1fr]">
          {/* Bundle Summary Card */}
          <aside className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-950/5 sm:p-8">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-indigo-600">BCA Vault</p>
            <h2 className="mt-2 text-2xl font-bold tracking-[-0.02em] text-slate-950">
              Complete Theory Bundle
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Theory Notes + PYQs + Analysis + Most Repeated Questions
            </p>

            {/* Price Box with Coupon Calculation */}
            <div className="my-6 border-y border-slate-100 py-5">
              <div className="flex items-baseline gap-3">
                <p className="font-mono text-5xl font-extrabold text-slate-950">₹{currentPrice}</p>
                {currentPrice < BASE_PRICE && (
                  <span className="font-mono text-xl text-slate-400 line-through">₹{BASE_PRICE}</span>
                )}
              </div>
              {currentCouponInfo ? (
                <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 border border-emerald-200">
                  <Tag className="h-3 w-3" />
                  <span>Coupon {appliedCoupon} applied (Saved ₹{currentCouponInfo.discount})</span>
                </div>
              ) : (
                <p className="mt-2 text-xs text-slate-500">One-time manual UPI payment</p>
              )}
            </div>

            {/* Coupon Code Input */}
            <div className="mb-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Have a discount coupon?
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={couponInput}
                  onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                  placeholder="e.g. BUDMS400"
                  className="flex-1 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-mono font-bold uppercase text-slate-900 placeholder:font-sans placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => handleApplyCoupon()}
                  className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800 transition"
                >
                  Apply
                </button>
              </div>
              {couponError && (
                <p className="mt-2 flex items-center gap-1 text-[11px] font-semibold text-rose-600">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" /> {couponError}
                </p>
              )}
              {appliedCoupon && (
                <p className="mt-2 text-[11px] text-emerald-700 font-medium">
                  ✓ {VALID_COUPONS[appliedCoupon]?.description}
                </p>
              )}
            </div>

            <div className="space-y-2.5 rounded-2xl bg-slate-50 p-4 text-xs text-slate-600">
              {[
                "Semester 1 & Semester 2 Complete Materials",
                "Unit-Wise Notes + Solved PYQs (2020–2025)",
                "Most Repeated Questions for Exam Prep",
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
          <div className="space-y-6">
            {/* Step 1: UPI / QR */}
            <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-indigo-600">
                    Step 1 · Make payment
                  </p>
                  <h2 className="mt-1 text-2xl font-bold text-slate-950">UPI / QR Payment</h2>
                </div>
                <Smartphone className="h-6 w-6 text-indigo-600" />
              </div>

              <div className="mt-6 grid gap-6 sm:grid-cols-[1fr_156px] sm:items-center">
                <div>
                  <p className="text-sm text-slate-600">
                    Transfer exactly <strong className="font-bold text-slate-950 font-mono text-base">₹{currentPrice}</strong> using any UPI app (GPay, PhonePe, Paytm, BHIM).
                  </p>
                  <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
                        Official UPI ID
                      </p>
                      <p className="mt-1 truncate font-mono text-sm font-bold text-slate-900">{UPI_ID}</p>
                    </div>
                    <button
                      type="button"
                      onClick={copyUpi}
                      className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-white px-3 py-2 text-xs font-bold text-indigo-700 shadow-sm ring-1 ring-slate-200 hover:bg-slate-50 transition"
                    >
                      {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Clipboard className="h-3.5 w-3.5" />}
                      {copied ? "Copied" : "Copy"}
                    </button>
                  </div>
                  <a
                    href={upiUrl}
                    className="mt-4 inline-flex items-center gap-2 text-xs font-bold text-indigo-600 hover:text-indigo-800 transition"
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

            {/* Step 2: Google Form Redirection */}
            <article className="rounded-3xl border border-indigo-100 bg-indigo-50/50 p-6 sm:p-8">
              <div className="flex items-start gap-3">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-indigo-600 text-white">
                  <ExternalLink className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-indigo-600">
                    Step 2 · Submit evidence
                  </p>
                  <h2 className="mt-1 text-2xl font-bold text-slate-950">Submit Payment Form</h2>
                  <p className="mt-2 text-xs leading-5 text-slate-600">
                    After completing payment, submit your transaction ID (UTR) and screenshot via our official Google Form or in-app verification.
                  </p>
                </div>
              </div>

              <a
                href={GOOGLE_PAYMENT_FORM_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-5 py-4 text-sm font-bold text-white shadow-lg shadow-indigo-600/20 transition hover:bg-indigo-700"
              >
                Submit Payment Form <ExternalLink className="h-4 w-4" />
              </a>

              <div className="mt-4 flex gap-2 rounded-xl border border-indigo-100 bg-white/80 p-3 text-xs leading-5 text-slate-600">
                <LockKeyhole className="mt-0.5 h-4 w-4 shrink-0 text-indigo-600" />
                Your submission is reviewed manually by the BCA Vault administrative team.
              </div>
            </article>
          </div>
        </div>
      </section>

      {/* Instructions & Approval Process */}
      <section className="border-t border-slate-200 bg-white py-16">
        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-indigo-600">
                How to get access
              </p>
              <h2 className="mt-1 text-3xl font-bold tracking-[-0.025em] text-slate-950">
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
