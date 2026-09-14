import { useState } from "react";
import { CheckCircle2, Clock3, Eye, EyeOff, LayoutDashboard, Lock, UserPlus, X, AlertCircle, Loader2, MailWarning } from "lucide-react";
import { useAuth } from "../auth/AuthContext";

interface PaymentEvidenceSuccessProps {
  referenceId: string;
  guestData?: {
    fullName: string;
    email: string;
    phone: string;
    course: string;
    semester: number;
  };
  onDashboard: () => void;
  onClose: () => void;
}

function getSignupErrorMessage(error: any): string {
  const message = String(error?.message || error || "").toLowerCase();

  if (message.includes("rate limit") || message.includes("too many requests") || message.includes("email rate limit")) {
    return "Account creation is temporarily rate-limited by the email service. Your payment is safe. Please wait a little and try again. You do not need to submit the payment again.";
  }

  if (message.includes("already registered") || message.includes("user already registered")) {
    return "An account already exists for this email. Please use the Sign In option instead of creating another account.";
  }

  if (message.includes("invalid email")) {
    return "The email address from your payment appears to be invalid. Please contact BCA Vault support so we can link your payment correctly.";
  }

  return error?.message || "We couldn't create the account right now. Your payment submission is still recorded. Please try again.";
}

export function PaymentEvidenceSuccess({
  referenceId,
  guestData,
  onDashboard,
  onClose,
}: PaymentEvidenceSuccessProps) {
  const { user, signUp } = useAuth();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accountCreated, setAccountCreated] = useState(false);
  const [needsEmailConfirmation, setNeedsEmailConfirmation] = useState(false);

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNeedsEmailConfirmation(false);

    if (!guestData) return;

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const result = await signUp(
        guestData.email,
        password,
        guestData.fullName,
        guestData.semester,
        guestData.course,
        guestData.phone
      );

      if (result.error) {
        setError(getSignupErrorMessage(result.error));
        return;
      }

      if (result.needsEmailConfirmation) {
        setNeedsEmailConfirmation(true);
      } else {
        setAccountCreated(true);
      }
    } catch (err: any) {
      setError(getSignupErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const isGuest = !user && guestData;

  return (
    <div
      className="fixed inset-0 z-[110] grid place-items-center bg-slate-950/60 p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-label="Payment evidence submitted"
    >
      <div className="relative my-6 w-full max-w-lg rounded-3xl bg-white p-6 sm:p-8 text-center shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-xl p-2 text-slate-400 hover:bg-slate-100 transition"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-emerald-100">
          <CheckCircle2 className="h-8 w-8 text-emerald-600" />
        </div>

        <p className="mt-4 text-xs font-bold uppercase tracking-[.16em] text-emerald-700">
          Evidence Received
        </p>
        <h2 className="mt-1 text-2xl font-bold text-slate-950">
          Payment Submitted Successfully!
        </h2>
        <p className="mt-2 text-xs leading-5 text-slate-600">
          Your payment is submitted for manual administrative review.
        </p>

        <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-3.5 text-left">
          <p className="text-[10px] font-bold uppercase tracking-[.12em] text-slate-500">
            Payment Reference ID
          </p>
          <p className="mt-0.5 font-mono text-base font-bold text-indigo-700">
            {referenceId}
          </p>
        </div>

        <div className="mt-3 flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 p-3 text-left text-xs leading-5 text-amber-900">
          <Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <span>
            <strong>Status: Pending Verification.</strong> The BCA Vault admin will review your transaction UTR and activate your BCA Semester 1 bundle access.
          </span>
        </div>

        {isGuest && !accountCreated && !needsEmailConfirmation ? (
          <div className="mt-6 rounded-2xl border border-indigo-100 bg-indigo-50/50 p-5 text-left">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-indigo-700">
              <UserPlus className="h-4 w-4" />
              <span>Step 3: Create Your Student Account</span>
            </div>
            <p className="mt-1 text-xs text-slate-600">
              Create your account now so your payment can be linked to your student profile. Your payment is already recorded separately.
            </p>

            {error && (
              <div className="mt-3 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-2.5 text-xs leading-5 text-red-700">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleCreateAccount} className="mt-4 space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase">
                  Name & Email (from payment)
                </label>
                <div className="mt-1 flex gap-2">
                  <input type="text" disabled value={guestData.fullName} className="w-1/2 rounded-xl border border-slate-200 bg-slate-100 px-3 py-2 text-xs font-medium text-slate-600" />
                  <input type="text" disabled value={guestData.email} className="w-1/2 rounded-xl border border-slate-200 bg-slate-100 px-3 py-2 text-xs font-medium text-slate-600 truncate" />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase">Set Password <span className="text-red-500">*</span></label>
                <div className="relative mt-1">
                  <input required type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 6 characters" className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600" aria-label={showPassword ? "Hide password" : "Show password"}>
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase">Confirm Password <span className="text-red-500">*</span></label>
                <input required type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Repeat password" className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100" />
              </div>

              <button type="submit" disabled={loading} className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-xs font-bold text-white hover:bg-indigo-700 disabled:bg-slate-300 transition">
                {loading ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Creating Account…</> : <><Lock className="h-3.5 w-3.5" /> Create Account & Link Payment</>}
              </button>
            </form>

            <p className="mt-3 text-[11px] leading-4 text-slate-500">
              If account creation is temporarily unavailable, do not submit your payment again. Your reference ID above is enough for support to locate the payment.
            </p>
          </div>
        ) : needsEmailConfirmation ? (
          <div className="mt-5 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-left">
            <div className="flex items-start gap-3">
              <MailWarning className="mt-0.5 h-5 w-5 shrink-0 text-blue-700" />
              <div>
                <p className="text-sm font-bold text-blue-900">Account created — check your email</p>
                <p className="mt-1 text-xs leading-5 text-blue-800">
                  We created your BCA Vault account, but Supabase requires email confirmation before your first sign-in. Check your inbox and spam folder for the confirmation email.
                </p>
                <p className="mt-2 text-xs font-semibold text-blue-900">Payment reference: {referenceId}</p>
              </div>
            </div>
          </div>
        ) : accountCreated ? (
          <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-center">
            <p className="text-xs font-bold text-emerald-800">✓ Account created and linked to your payment!</p>
            <p className="mt-1 text-xs text-emerald-700">Admin will activate your course access once verified.</p>
            <button type="button" onClick={onDashboard} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-xs font-bold text-white hover:bg-slate-800 transition">
              <LayoutDashboard className="h-4 w-4" /> Go to Student Dashboard
            </button>
          </div>
        ) : (
          <div>
            <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50/60 p-3 text-left">
              <p className="text-[11px] font-bold text-[#1E40AF]">Know someone preparing for BCA?</p>
              <p className="text-[11px] text-slate-600 mt-0.5 leading-normal">Once inside your dashboard, share your personal referral identifier to unlock Most Repeated Questions after their verified purchase.</p>
            </div>
            <button type="button" onClick={onDashboard} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-3.5 text-sm font-bold text-white hover:bg-slate-800 transition">
              <LayoutDashboard className="h-4 w-4" /> Go to Student Dashboard
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
