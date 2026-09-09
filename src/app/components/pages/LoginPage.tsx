import { useEffect, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router";
import { motion } from "motion/react";
import {
  BookOpen,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  User,
  GraduationCap,
  Sparkles,
} from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { useAuth } from "@/app/components/auth/AuthContext";

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

export function LoginPage({ initialMode = "signin" }: { initialMode?: "signin" | "signup" }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { signIn, signUp, signInWithGoogle, resetPassword, loading, user } = useAuth();

  // Mode: "signin" | "signup" | "forgot"
  const isSignupPath = location.pathname.includes("signup") || location.pathname.includes("register");
  const [mode, setMode] = useState<"signin" | "signup" | "forgot">(
    isSignupPath || initialMode === "signup" ? "signup" : "signin"
  );

  // Form states
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [semester, setSemester] = useState<number>(1);
  const [course] = useState("BCA");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const from = (location.state as any)?.from?.pathname;

  // Auto-fill from payment lead or URL search params
  useEffect(() => {
    try {
      const searchParams = new URLSearchParams(window.location.search);
      const urlEmail = searchParams.get("email");
      const urlName = searchParams.get("name");

      const leadRaw = sessionStorage.getItem("bca_payment_lead");
      const lead = leadRaw ? JSON.parse(leadRaw) : null;

      const prefillEmail = urlEmail || lead?.email;
      const prefillName = urlName || lead?.fullName;
      const prefillSem = lead?.semester;

      if (prefillEmail) setEmail(prefillEmail);
      if (prefillName) setFullName(prefillName);
      if (prefillSem) setSemester(Number(prefillSem) || 1);

      if (prefillEmail || prefillName) {
        setMode("signup");
      }
    } catch {
      // Ignore
    }
  }, []);

  // Check for error parameters in URL (e.g. from OAuth redirect failure)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const errDesc = params.get("error_description");
    const errCode = params.get("error");
    if (errDesc) {
      setError(friendlyError(errDesc));
    } else if (errCode) {
      setError("Authentication failed. Please try again.");
    }
  }, []);

  // Redirect if already authenticated
  useEffect(() => {
    if (user && !loading) {
      navigate(from ?? "/dashboard", { replace: true });
    }
  }, [user, loading, navigate, from]);

  // Update mode when path changes
  useEffect(() => {
    if (location.pathname.includes("signup") || location.pathname.includes("register")) {
      setMode("signup");
    }
  }, [location.pathname]);

  const switchMode = (newMode: "signin" | "signup" | "forgot") => {
    setError(null);
    setSuccessMessage(null);
    setMode(newMode);
  };

  async function handleSignInSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setSubmitting(true);
    try {
      await signIn(email, password);
      navigate(from ?? "/dashboard", { replace: true });
    } catch (err: any) {
      setError(friendlyError(err.code || err.message));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSignUpSubmit(e: React.FormEvent) {
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
      const res = await signUp(email, password, fullName, semester, course);
      if (res.error) {
        setError(friendlyError(res.error.code || res.error.message));
      } else {
        // Immediate dashboard navigation without email roadblock
        navigate(from ?? "/dashboard", { replace: true });
      }
    } catch (err: any) {
      setError(friendlyError(err.code || err.message));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleForgotPasswordSubmit(e: React.FormEvent) {
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

  async function handleGoogleSignIn() {
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

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-indigo-700 via-indigo-800 to-slate-950 relative overflow-hidden flex-col justify-between p-12 text-white">
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)",
            backgroundSize: "28px 28px",
          }}
        />
        <Link to="/" className="relative flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center backdrop-blur-md shadow-md">
            <BookOpen className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-black text-white tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
            BCA Vault
          </span>
        </Link>
        <div className="relative max-w-lg">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold text-indigo-200 mb-6 backdrop-blur-sm">
            <Sparkles className="h-3.5 w-3.5 text-amber-300" />
            <span>Bharati Vidyapeeth Student Portal</span>
          </div>
          <h2
            className="text-4xl font-bold text-white mb-4 leading-tight"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {mode === "signup"
              ? "Join your fellow students on BCA Vault."
              : "Welcome back.\nAccess your notes & PYQs."}
          </h2>
          <p className="text-indigo-200 text-base leading-relaxed">
            Unit-wise curated theory notes, solved past year questions, and AI-assisted exam preparation for BCA students.
          </p>
        </div>
        <div className="relative flex items-center justify-between text-xs text-white/50 border-t border-white/10 pt-6">
          <span>Protected with Supabase Authentication</span>
          <Link to="/terms-and-conditions" className="hover:text-white transition">
            Terms & Privacy
          </Link>
        </div>
      </div>

      {/* Right: Form */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-10 min-w-0">
        <motion.div
          key={mode}
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="w-full max-w-md"
        >
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-sm">
              <BookOpen className="w-4 h-4" />
            </div>
            <span className="text-lg font-black text-slate-900" style={{ fontFamily: "var(--font-display)" }}>
              BCA Vault
            </span>
          </div>

          {/* Mode Switcher Tabs */}
          {mode !== "forgot" && (
            <div className="flex rounded-2xl bg-slate-200/70 p-1.5 mb-8">
              <button
                type="button"
                onClick={() => switchMode("signin")}
                className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition ${
                  mode === "signin"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => switchMode("signup")}
                className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition ${
                  mode === "signup"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Create Account
              </button>
            </div>
          )}

          <h1 className="text-2xl font-bold text-slate-900 mb-1" style={{ fontFamily: "var(--font-display)" }}>
            {mode === "signup"
              ? "Create Student Account"
              : mode === "forgot"
              ? "Reset your password"
              : "Sign in to your account"}
          </h1>
          <p className="text-slate-500 text-xs mb-6">
            {mode === "signup"
              ? "Register to access study materials and submit payment evidence."
              : mode === "forgot"
              ? "Enter your registered email address and we'll send you a password reset link."
              : "Enter your credentials to access your notes and study materials."}
          </p>

          {/* Feedback Messages */}
          {error && (
            <div className="flex items-start gap-2.5 bg-rose-50 border border-rose-200 rounded-2xl p-4 mb-5 text-rose-700 text-xs leading-5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {successMessage && (
            <div className="flex items-start gap-2.5 bg-emerald-50 border border-emerald-200 rounded-2xl p-4 mb-5 text-emerald-800 text-xs leading-5">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* SIGN IN FORM */}
          {mode === "signin" && (
            <form onSubmit={handleSignInSubmit} className="space-y-4">
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
                    className="pl-10 h-11 rounded-xl border-slate-200 bg-white text-sm outline-none focus:border-indigo-600"
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
                    className="pl-10 pr-10 h-11 rounded-xl border-slate-200 bg-white text-sm outline-none focus:border-indigo-600"
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
                disabled={submitting || googleLoading || loading}
                className="w-full h-11 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold mt-2 text-xs transition shadow-sm"
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
            </form>
          )}

          {/* SIGN UP / REGISTRATION FORM */}
          {mode === "signup" && (
            <form onSubmit={handleSignUpSubmit} className="space-y-3.5">
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
                    className="pl-10 h-11 rounded-xl border-slate-200 bg-white text-sm outline-none focus:border-indigo-600"
                  />
                </div>
              </div>

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
                    className="pl-10 h-11 rounded-xl border-slate-200 bg-white text-sm outline-none focus:border-indigo-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-bold text-slate-700 mb-1.5 block">Course</Label>
                  <div className="relative">
                    <GraduationCap className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      type="text"
                      value={course}
                      readOnly
                      className="pl-10 h-11 rounded-xl border-slate-200 bg-slate-100 text-xs font-bold text-slate-700 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-xs font-bold text-slate-700 mb-1.5 block">Semester</Label>
                  <select
                    value={semester}
                    onChange={(e) => setSemester(Number(e.target.value))}
                    className="w-full h-11 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-800 outline-none focus:border-indigo-600"
                  >
                    {[1, 2, 3, 4, 5, 6].map((s) => (
                      <option key={s} value={s}>
                        Semester {s}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

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
                    className="pl-10 pr-10 h-11 rounded-xl border-slate-200 bg-white text-sm outline-none focus:border-indigo-600"
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
                    className="pl-10 pr-10 h-11 rounded-xl border-slate-200 bg-white text-sm outline-none focus:border-indigo-600"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                disabled={submitting || googleLoading || loading}
                className="w-full h-11 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold mt-2 text-xs transition shadow-sm"
              >
                {submitting ? (
                  <span className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Creating Account...
                  </span>
                ) : (
                  <>
                    Create Student Account <ArrowRight className="w-4 h-4 ml-1" />
                  </>
                )}
              </Button>
            </form>
          )}

          {/* FORGOT PASSWORD FORM */}
          {mode === "forgot" && (
            <form onSubmit={handleForgotPasswordSubmit} className="space-y-4">
              <div>
                <Label className="text-xs font-bold text-slate-700 mb-1.5 block">Registered Email address</Label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                    className="pl-10 h-11 rounded-xl border-slate-200 bg-white text-sm outline-none focus:border-indigo-600"
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={submitting || loading}
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

          {/* GOOGLE SIGN IN */}
          {mode !== "forgot" && (
            <>
              <div className="relative my-5">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200" />
                </div>
                <div className="relative flex justify-center text-[10px] uppercase">
                  <span className="bg-slate-50 px-3 text-slate-400 font-bold tracking-wider">
                    OR
                  </span>
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                onClick={handleGoogleSignIn}
                disabled={submitting || googleLoading || loading}
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
            </>
          )}
        </motion.div>
      </div>
    </div>
  );
}

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
    return "An account with this email already exists.";
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
