import { useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  GraduationCap,
  Lock,
  Mail,
  Phone,
  User,
  X,
} from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { useAuth } from "@/app/components/auth/AuthContext";

/* ------------------------------------------------------------------ */
/*  Google brand icon – identical to LoginPage                         */
/* ------------------------------------------------------------------ */
function GoogleIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
      />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Error message normaliser – replicates LoginPage's friendlyError   */
/* ------------------------------------------------------------------ */
function friendlyError(codeOrMsg: string): string {
  const text = String(codeOrMsg || "").trim();
  const lower = text.toLowerCase();

  if (
    lower.includes("invalid login credentials") ||
    lower.includes("invalid_credentials") ||
    lower.includes("invalid_grant") ||
    lower === "auth/invalid-credential" ||
    lower === "auth/wrong-password"
  ) {
    return "Incorrect email or password.";
  }
  if (lower.includes("email not confirmed") || lower.includes("email_not_confirmed")) {
    return "Please verify your email before logging in.";
  }
  if (
    lower.includes("already registered") ||
    lower.includes("already exists") ||
    lower.includes("user already exists") ||
    lower === "auth/email-already-in-use"
  ) {
    return "An account with this email already exists. Try signing in instead.";
  }
  if (lower.includes("user not found") || lower === "auth/user-not-found") {
    return "No student account found with this email.";
  }
  if (
    lower.includes("too many requests") ||
    lower.includes("rate limit") ||
    lower === "auth/too-many-requests" ||
    lower.includes("over_request_rate_limit")
  ) {
    return "Too many attempts. Please wait a moment and try again.";
  }
  if (lower.includes("invalid email") || lower === "auth/invalid-email") {
    return "Please enter a valid email address.";
  }
  if (lower.includes("password should be at least")) {
    return "Password must be at least 6 characters.";
  }
  if (lower.includes("network") || lower.includes("failed to fetch")) {
    return "Network error. Please check your connection and try again.";
  }
  return text || "Authentication failed. Please check your credentials.";
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */
type AuthMode = "signup" | "signin" | "forgot";

interface PaymentAuthModalProps {
  /** Close the entire payment evidence overlay */
  onClose: () => void;
}

export function PaymentAuthModal({ onClose }: PaymentAuthModalProps) {
  const { signIn, signUp, signInWithGoogle, resetPassword, loading } = useAuth();

  const [mode, setMode] = useState<AuthMode>("signup");

  // shared
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // signup-only
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [semester, setSemester] = useState(1);
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // ui
  const [submitting, setSubmitting] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const busy = submitting || googleLoading || loading;

  /* ---- mode switch ---- */
  const switchMode = (next: AuthMode) => {
    setError(null);
    setSuccessMessage(null);
    setMode(next);
  };

  /* ---- sign in ---- */
  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setSubmitting(true);
    try {
      await signIn(email, password);
      // AuthContext sets `user` → PaymentEvidenceForm will re-render to show the form
    } catch (err: any) {
      setError(friendlyError(err.code || err.message));
    } finally {
      setSubmitting(false);
    }
  }

  /* ---- sign up ---- */
  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match. Please verify.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await signUp(email, password, fullName, semester, "BCA");
      if (res.needsEmailConfirmation) {
        setSuccessMessage(
          "Account created! Please check your email to verify your address, then sign in to continue."
        );
        setMode("signin");
      }
      // If session was returned (no email confirmation needed), AuthContext
      // updates `user` automatically → evidence form appears
    } catch (err: any) {
      setError(friendlyError(err.code || err.message));
    } finally {
      setSubmitting(false);
    }
  }

  /* ---- forgot password ---- */
  async function handleForgot(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    if (!email) {
      setError("Please enter your registered email address.");
      return;
    }
    setSubmitting(true);
    try {
      await resetPassword(email);
      setSuccessMessage("Password reset link has been sent to your email.");
      setMode("signin");
    } catch (err: any) {
      setError(friendlyError(err.code || err.message));
    } finally {
      setSubmitting(false);
    }
  }

  /* ---- google ---- */
  async function handleGoogle() {
    setError(null);
    setSuccessMessage(null);
    setGoogleLoading(true);
    try {
      await signInWithGoogle();
    } catch (err: any) {
      setError(friendlyError(err.message || "Google sign-in failed. Please try again."));
      setGoogleLoading(false);
    }
  }

  /* ================================================================ */
  /*  Render                                                           */
  /* ================================================================ */
  return (
    <div className="p-6 sm:p-8">
      {/* ---- Header ---- */}
      <div className="text-center mb-6">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-600">
          {mode === "forgot" ? (
            <Mail className="h-6 w-6" />
          ) : mode === "signup" ? (
            <User className="h-6 w-6" />
          ) : (
            <Lock className="h-6 w-6" />
          )}
        </div>
        <h3
          className="text-xl font-bold text-slate-900"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {mode === "signup"
            ? "Create your BCA Vault account"
            : mode === "forgot"
            ? "Reset your password"
            : "Sign in to BCA Vault"}
        </h3>
        <p className="mt-1.5 text-xs text-slate-500 max-w-xs mx-auto">
          {mode === "signup"
            ? "Secure your payment and get access to your notes."
            : mode === "forgot"
            ? "Enter your registered email and we'll send you a reset link."
            : "Sign in to link your payment to your account."}
        </p>
      </div>

      {/* ---- Mode toggle tabs ---- */}
      {mode !== "forgot" && (
        <div className="flex rounded-2xl bg-slate-100 p-1 mb-5">
          <button
            type="button"
            onClick={() => switchMode("signup")}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition ${
              mode === "signup"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Create Account
          </button>
          <button
            type="button"
            onClick={() => switchMode("signin")}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition ${
              mode === "signin"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Sign In
          </button>
        </div>
      )}

      {/* ---- Google button (signup & signin) ---- */}
      {mode !== "forgot" && (
        <>
          <Button
            type="button"
            variant="outline"
            onClick={handleGoogle}
            disabled={busy}
            className="w-full h-11 border-slate-200 bg-white hover:bg-slate-50 text-slate-700 rounded-xl font-bold text-xs flex items-center justify-center gap-2.5 transition shadow-2xs"
          >
            {googleLoading ? (
              <span className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-slate-400 border-t-slate-700 rounded-full animate-spin" />
                Connecting with Google...
              </span>
            ) : (
              <>
                <GoogleIcon className="w-4 h-4" />
                <span>Continue with Google</span>
              </>
            )}
          </Button>

          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center text-[10px] uppercase">
              <span className="bg-white px-3 text-slate-400 font-bold tracking-wider">OR</span>
            </div>
          </div>
        </>
      )}

      {/* ---- Feedback ---- */}
      {error && (
        <div className="flex items-start gap-2.5 bg-rose-50 border border-rose-200 rounded-2xl p-3.5 mb-4 text-rose-700 text-xs leading-5">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}
      {successMessage && (
        <div className="flex items-start gap-2.5 bg-emerald-50 border border-emerald-200 rounded-2xl p-3.5 mb-4 text-emerald-800 text-xs leading-5">
          <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* ============================================================ */}
      {/*  SIGN UP FORM                                                 */}
      {/* ============================================================ */}
      {mode === "signup" && (
        <form onSubmit={handleSignUp} className="space-y-3">
          {/* Full Name */}
          <div>
            <Label className="text-xs font-bold text-slate-700 mb-1.5 block">Full Name</Label>
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                type="text"
                placeholder="Your Full Name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                autoComplete="name"
                className="pl-10 h-10 rounded-xl border-slate-200 bg-white text-sm outline-none focus:border-indigo-600"
              />
            </div>
          </div>

          {/* Email */}
          <div>
            <Label className="text-xs font-bold text-slate-700 mb-1.5 block">Email address</Label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="pl-10 h-10 rounded-xl border-slate-200 bg-white text-sm outline-none focus:border-indigo-600"
              />
            </div>
          </div>

          {/* Phone */}
          <div>
            <Label className="text-xs font-bold text-slate-700 mb-1.5 block">Phone Number</Label>
            <div className="relative">
              <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                type="tel"
                placeholder="10-digit mobile number"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                inputMode="tel"
                autoComplete="tel"
                className="pl-10 h-10 rounded-xl border-slate-200 bg-white text-sm outline-none focus:border-indigo-600"
              />
            </div>
          </div>

          {/* Course + Semester */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-bold text-slate-700 mb-1.5 block">Course</Label>
              <div className="relative">
                <GraduationCap className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  type="text"
                  value="BCA"
                  readOnly
                  className="pl-10 h-10 rounded-xl border-slate-200 bg-slate-100 text-xs font-bold text-slate-700 outline-none"
                />
              </div>
            </div>
            <div>
              <Label className="text-xs font-bold text-slate-700 mb-1.5 block">Semester</Label>
              <select
                value={semester}
                onChange={(e) => setSemester(Number(e.target.value))}
                className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-800 outline-none focus:border-indigo-600"
              >
                {[1, 2, 3, 4, 5, 6].map((s) => (
                  <option key={s} value={s}>
                    Semester {s}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Password */}
          <div>
            <Label className="text-xs font-bold text-slate-700 mb-1.5 block">Password</Label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="At least 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                autoComplete="new-password"
                className="pl-10 pr-10 h-10 rounded-xl border-slate-200 bg-white text-sm outline-none focus:border-indigo-600"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Confirm Password */}
          <div>
            <Label className="text-xs font-bold text-slate-700 mb-1.5 block">Confirm Password</Label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                type={showConfirmPassword ? "text" : "password"}
                placeholder="Re-enter password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
                autoComplete="new-password"
                className="pl-10 pr-10 h-10 rounded-xl border-slate-200 bg-white text-sm outline-none focus:border-indigo-600"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showConfirmPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          <Button
            type="submit"
            disabled={busy}
            className="w-full h-11 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold mt-1 text-xs transition shadow-sm"
          >
            {submitting ? (
              <span className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Creating Account...
              </span>
            ) : (
              <>
                Create Account <ArrowRight className="w-4 h-4 ml-1" />
              </>
            )}
          </Button>

          <p className="text-center text-xs text-slate-500 pt-1">
            Already have an account?{" "}
            <button
              type="button"
              onClick={() => switchMode("signin")}
              className="font-bold text-indigo-600 hover:underline"
            >
              Sign in
            </button>
          </p>
        </form>
      )}

      {/* ============================================================ */}
      {/*  SIGN IN FORM                                                 */}
      {/* ============================================================ */}
      {mode === "signin" && (
        <form onSubmit={handleSignIn} className="space-y-3.5">
          <div>
            <Label className="text-xs font-bold text-slate-700 mb-1.5 block">Email address</Label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="pl-10 h-10 rounded-xl border-slate-200 bg-white text-sm outline-none focus:border-indigo-600"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <Label className="text-xs font-bold text-slate-700">Password</Label>
              <button
                type="button"
                onClick={() => switchMode("forgot")}
                className="text-xs font-semibold text-indigo-600 hover:underline"
              >
                Forgot password?
              </button>
            </div>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="pl-10 pr-10 h-10 rounded-xl border-slate-200 bg-white text-sm outline-none focus:border-indigo-600"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <Button
            type="submit"
            disabled={busy}
            className="w-full h-11 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold mt-1 text-xs transition shadow-sm"
          >
            {submitting ? (
              <span className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Signing in...
              </span>
            ) : (
              <>
                Sign In <ArrowRight className="w-4 h-4 ml-1" />
              </>
            )}
          </Button>

          <p className="text-center text-xs text-slate-500 pt-1">
            New to BCA Vault?{" "}
            <button
              type="button"
              onClick={() => switchMode("signup")}
              className="font-bold text-indigo-600 hover:underline"
            >
              Create account
            </button>
          </p>
        </form>
      )}

      {/* ============================================================ */}
      {/*  FORGOT PASSWORD FORM                                         */}
      {/* ============================================================ */}
      {mode === "forgot" && (
        <form onSubmit={handleForgot} className="space-y-3.5">
          <div>
            <Label className="text-xs font-bold text-slate-700 mb-1.5 block">
              Registered Email address
            </Label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="pl-10 h-10 rounded-xl border-slate-200 bg-white text-sm outline-none focus:border-indigo-600"
              />
            </div>
          </div>

          <Button
            type="submit"
            disabled={busy}
            className="w-full h-11 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs transition shadow-sm"
          >
            {submitting ? (
              <span className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Sending Link...
              </span>
            ) : (
              "Send Password Reset Link"
            )}
          </Button>

          <button
            type="button"
            onClick={() => switchMode("signin")}
            className="w-full py-2 text-xs font-bold text-slate-500 hover:text-slate-800 transition text-center"
          >
            ← Back to Sign In
          </button>
        </form>
      )}
    </div>
  );
}
