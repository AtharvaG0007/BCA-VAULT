import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { motion } from "motion/react";
import { ArrowRight, AlertCircle, BookOpen, CheckCircle2, Lock, Mail, Phone, User, Sparkles } from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { useAuth } from "@/app/components/auth/AuthContext";
import { supabase } from "@/lib/supabase/client";

function friendlyError(value: string): string {
  const text = String(value || "").trim();
  const lower = text.toLowerCase();
  if (lower.includes("already exists") || lower.includes("already registered") || lower.includes("user already exists")) return "An account with this email already exists. Please sign in instead.";
  if (lower.includes("invalid login credentials") || lower.includes("invalid_credentials") || lower.includes("invalid_grant")) return "Incorrect email or password.";
  if (lower.includes("password") && lower.includes("6")) return "Password must be at least 6 characters.";
  if (lower.includes("rate limit") || lower.includes("too many requests") || lower.includes("over_email_send_rate_limit")) return "Too many attempts. Please wait a moment and try again.";
  if (lower.includes("invalid email")) return "Please enter a valid email address.";
  if (lower.includes("network") || lower.includes("failed to fetch")) return "Network error. Please check your connection and try again.";
  return text || "Something went wrong. Please try again.";
}

export function LoginPage({ initialMode = "signin" }: { initialMode?: "signin" | "signup" }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { signIn, signInWithGoogle, resetPassword, loading, user } = useAuth();
  const isSignupPath = location.pathname.includes("signup") || location.pathname.includes("register") || initialMode === "signup";
  const [mode, setMode] = useState<"signin" | "signup" | "forgot">(isSignupPath ? "signup" : "signin");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const from = (location.state as any)?.from?.pathname;

  useEffect(() => {
    if (user && !loading) navigate(from ?? "/dashboard", { replace: true });
  }, [user, loading, navigate, from]);

  const clearMessages = () => { setError(null); setSuccessMessage(null); };

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault(); clearMessages(); setSubmitting(true);
    try { await signIn(email, password); navigate(from ?? "/dashboard", { replace: true }); }
    catch (err: any) { setError(friendlyError(err.code || err.message)); }
    finally { setSubmitting(false); }
  }

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault(); clearMessages();
    if (fullName.trim().length < 2) { setError("Please enter your full name."); return; }
    if (password.length < 6) { setError("Password must be at least 6 characters."); return; }
    if (password !== confirmPassword) { setError("Passwords do not match."); return; }
    setSubmitting(true);
    try {
      const { data, error: fnError } = await supabase.functions.invoke("student-account-create", {
        body: { fullName: fullName.trim(), phone: phone.trim(), email: email.trim().toLowerCase(), password, semester: 1 },
      });
      if (fnError) throw new Error(fnError.message || "Unable to create your account.");
      if (!data?.success) throw new Error(data?.error || "Unable to create your account.");
      await signIn(email, password);
      navigate("/app/dashboard", { replace: true });
    } catch (err: any) {
      setError(friendlyError(err.message || err));
    } finally { setSubmitting(false); }
  }

  async function handleForgotPassword(e: React.FormEvent) {
    e.preventDefault(); clearMessages();
    if (!email.trim()) { setError("Please enter your registered email address."); return; }
    setSubmitting(true);
    try { await resetPassword(email); setSuccessMessage("Password reset link has been sent to your email."); setMode("signin"); }
    catch (err: any) { setError(friendlyError(err.code || err.message)); }
    finally { setSubmitting(false); }
  }

  async function handleGoogleSignIn() {
    clearMessages(); setGoogleLoading(true);
    try { await signInWithGoogle(); }
    catch (err: any) { setError(friendlyError(err.message || "Google sign-in failed.")); setGoogleLoading(false); }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-indigo-700 via-indigo-800 to-slate-950 relative overflow-hidden flex-col justify-between p-12 text-white">
        <Link to="/" className="relative flex items-center gap-3"><div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center"><BookOpen className="w-5 h-5" /></div><span className="text-xl font-black">BCA Vault</span></Link>
        <div className="relative max-w-lg"><div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold text-indigo-200 mb-6"><Sparkles className="h-3.5 w-3.5 text-amber-300" />Bharati Vidyapeeth Student Portal</div><h2 className="text-4xl font-bold text-white mb-4 leading-tight">{mode === "signup" ? "Create your Semester 1 account." : "Welcome back."}</h2><p className="text-indigo-200 text-base leading-relaxed">Create your account first, then purchase Semester 1 from your dashboard. Your notes unlock only after payment approval.</p></div>
        <div className="relative text-xs text-white/50 border-t border-white/10 pt-6">Protected with Supabase Authentication</div>
      </div>

      <div className="flex-1 flex items-center justify-center p-4 sm:p-10 min-w-0">
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
          <div className="flex items-center gap-2 mb-8 lg:hidden"><div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center text-white"><BookOpen className="w-4 h-4" /></div><span className="text-lg font-black text-slate-900">BCA Vault</span></div>
          <div className="flex rounded-2xl bg-slate-200/70 p-1.5 mb-7">
            <button type="button" onClick={() => { clearMessages(); setMode("signin"); }} className={`flex-1 py-2.5 text-xs font-bold rounded-xl ${mode === "signin" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600"}`}>Sign In</button>
            <button type="button" onClick={() => { clearMessages(); setMode("signup"); }} className={`flex-1 py-2.5 text-xs font-bold rounded-xl ${mode === "signup" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600"}`}>Create Account</button>
          </div>

          {mode === "signup" && (
            <form onSubmit={handleSignUp} className="space-y-3">
              <h1 className="text-2xl font-bold text-slate-900">Create Student Account</h1>
              <p className="text-slate-500 text-xs mb-5">Create your account first. After login, your dashboard will guide you to the Semester 1 payment.</p>
              {error && <div className="flex items-start gap-2 bg-rose-50 border border-rose-200 rounded-2xl p-3.5 text-rose-700 text-xs"><AlertCircle className="w-4 h-4 shrink-0" /><span>{error}</span></div>}
              <div><Label className="text-xs font-bold text-slate-700 mb-1.5 block">Full Name</Label><div className="relative"><User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" /><Input value={fullName} onChange={e => setFullName(e.target.value)} required autoComplete="name" placeholder="Your full name" className="pl-10 h-11 rounded-xl" /></div></div>
              <div><Label className="text-xs font-bold text-slate-700 mb-1.5 block">Email address</Label><div className="relative"><Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" /><Input type="email" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" placeholder="you@example.com" className="pl-10 h-11 rounded-xl" /></div></div>
              <div><Label className="text-xs font-bold text-slate-700 mb-1.5 block">Phone Number</Label><div className="relative"><Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" /><Input type="tel" value={phone} onChange={e => setPhone(e.target.value)} autoComplete="tel" placeholder="10-digit mobile number" className="pl-10 h-11 rounded-xl" /></div></div>
              <div className="grid grid-cols-2 gap-3"><div><Label className="text-xs font-bold text-slate-700 mb-1.5 block">Password</Label><Input type="password" value={password} onChange={e => setPassword(e.target.value)} required autoComplete="new-password" placeholder="••••••••" className="h-11 rounded-xl" /></div><div><Label className="text-xs font-bold text-slate-700 mb-1.5 block">Confirm</Label><Input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required autoComplete="new-password" placeholder="••••••••" className="h-11 rounded-xl" /></div></div>
              <Button type="submit" disabled={submitting || googleLoading || loading} className="w-full h-11 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs">{submitting ? "Creating account..." : "Create Account"}<ArrowRight className="w-4 h-4 ml-1" /></Button>
              <div className="rounded-2xl bg-indigo-50 border border-indigo-100 p-3.5 text-xs text-indigo-800"><strong>Next:</strong> you'll be signed in automatically and taken to your dashboard. Payment comes after account creation.</div>
            </form>
          )}

          {mode === "signin" && (
            <form onSubmit={handleSignIn} className="space-y-4">
              <h1 className="text-2xl font-bold text-slate-900">Sign in to your account</h1><p className="text-slate-500 text-xs mb-5">After signing in, your dashboard shows whether you need to purchase or can study.</p>
              {error && <div className="flex items-start gap-2 bg-rose-50 border border-rose-200 rounded-2xl p-3.5 text-rose-700 text-xs"><AlertCircle className="w-4 h-4 shrink-0" /><span>{error}</span></div>}
              {successMessage && <div className="flex items-start gap-2 bg-emerald-50 border border-emerald-200 rounded-2xl p-3.5 text-emerald-800 text-xs"><CheckCircle2 className="w-4 h-4 shrink-0" /><span>{successMessage}</span></div>}
              <div><Label className="text-xs font-bold text-slate-700 mb-1.5 block">Email address</Label><Input type="email" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" placeholder="you@example.com" className="h-11 rounded-xl" /></div>
              <div><div className="flex justify-between mb-1.5"><Label className="text-xs font-bold text-slate-700">Password</Label><button type="button" onClick={() => { clearMessages(); setMode("forgot"); }} className="text-xs font-semibold text-indigo-600">Forgot password?</button></div><Input type="password" value={password} onChange={e => setPassword(e.target.value)} required autoComplete="current-password" placeholder="••••••••" className="h-11 rounded-xl" /></div>
              <Button type="submit" disabled={submitting || googleLoading || loading} className="w-full h-11 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs">{submitting ? "Signing in..." : "Sign In"}<ArrowRight className="w-4 h-4 ml-1" /></Button>
            </form>
          )}

          {mode === "forgot" && (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <h1 className="text-2xl font-bold text-slate-900">Reset your password</h1><p className="text-slate-500 text-xs">Enter your registered email address.</p>
              {error && <div className="flex items-start gap-2 bg-rose-50 border border-rose-200 rounded-2xl p-3.5 text-rose-700 text-xs"><AlertCircle className="w-4 h-4 shrink-0" /><span>{error}</span></div>}
              <Input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="you@example.com" className="h-11 rounded-xl" />
              <Button type="submit" disabled={submitting || loading} className="w-full h-11 bg-indigo-600 text-white rounded-xl font-bold text-xs">{submitting ? "Sending..." : "Send Reset Link"}</Button>
              <button type="button" onClick={() => { clearMessages(); setMode("signin"); }} className="w-full text-xs font-bold text-slate-500">← Back to Sign In</button>
            </form>
          )}

          {mode !== "forgot" && (
            <>
              <div className="relative my-5"><div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200" /></div><div className="relative flex justify-center"><span className="bg-slate-50 px-3 text-[10px] text-slate-400 font-bold">OR</span></div></div>
              <Button type="button" variant="outline" onClick={handleGoogleSignIn} disabled={submitting || googleLoading || loading} className="w-full h-11 rounded-xl text-xs font-bold">{googleLoading ? "Connecting..." : "Continue with Google"}</Button>
            </>
          )}
        </motion.div>
      </div>
    </div>
  );
}
