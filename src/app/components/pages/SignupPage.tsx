import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { motion } from "motion/react";
import { BookOpen, Mail, Lock, Eye, EyeOff, User, ArrowRight, AlertCircle, CheckCircle } from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { useAuth } from "@/app/components/auth/AuthContext";

export function SignupPage() {
  const navigate = useNavigate();
  const { signUp } = useAuth();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const update = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (form.password.length < 6) { setError("Password must be at least 6 characters."); return; }
    setError(null);
    setSubmitting(true);
    try {
      await signUp(form.email, form.password, form.name);
      setSuccess(true);
      setTimeout(() => navigate("/app/dashboard"), 2000);
    } catch (err: any) {
      setError(friendlyError(err.code));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-[#111827] to-[#1E40AF] relative overflow-hidden flex-col justify-between p-12">
        <div className="absolute inset-0 opacity-[0.06]"
          style={{ backgroundImage: "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)", backgroundSize: "32px 32px" }} />
        <Link to="/" className="relative flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-[#1E40AF] flex items-center justify-center">
            <BookOpen className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold text-white" style={{ fontFamily: 'var(--font-display)' }}>BCA Vault</span>
        </Link>
        <div className="relative">
          <h2 className="text-4xl font-bold text-white mb-4 leading-tight" style={{ fontFamily: 'var(--font-display)' }}>
            Join BCA Vault.<br />Start learning today.
          </h2>
          <p className="text-blue-200 text-lg">For Bharati Vidyapeeth BCA students.</p>
        </div>
        <p className="relative text-xs text-white/30">Account creation secured by Supabase Authentication.</p>
      </div>

      <div className="flex-1 flex items-center justify-center p-6 overflow-y-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md py-8">
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="w-8 h-8 rounded-lg bg-[#1E40AF] flex items-center justify-center">
              <BookOpen className="w-4 h-4 text-white" />
            </div>
            <span className="text-lg font-bold text-gray-900" style={{ fontFamily: 'var(--font-display)' }}>BCA Vault</span>
          </div>

          {success ? (
            <div className="text-center py-8">
              <CheckCircle className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-gray-900 mb-2">Account created!</h2>
              <p className="text-gray-500 text-sm">A verification email has been sent. Redirecting to your dashboard…</p>
            </div>
          ) : (
            <>
              <h1 className="text-2xl font-bold text-gray-900 mb-1" style={{ fontFamily: 'var(--font-display)' }}>Create your account</h1>
              <p className="text-gray-500 text-sm mb-8">
                Already have an account?{" "}
                <Link to="/auth/login" className="text-[#1E40AF] font-semibold hover:underline">Sign in</Link>
              </p>

              {error && (
                <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-5 text-red-600 text-sm">
                  <AlertCircle className="w-4 h-4 shrink-0" /> {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-1.5 block">Full name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input type="text" placeholder="Your full name" value={form.name}
                      onChange={e => update("name", e.target.value)} required
                      className="pl-10 h-11 rounded-xl border-gray-200 bg-white" />
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-1.5 block">Email address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input type="email" placeholder="you@example.com" value={form.email}
                      onChange={e => update("email", e.target.value)} required
                      className="pl-10 h-11 rounded-xl border-gray-200 bg-white" />
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-1.5 block">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input type={showPassword ? "text" : "password"} placeholder="Min. 6 characters" value={form.password}
                      onChange={e => update("password", e.target.value)} required
                      className="pl-10 pr-10 h-11 rounded-xl border-gray-200 bg-white" />
                    <button type="button" onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <Button type="submit" disabled={submitting}
                  className="w-full h-11 bg-[#1E40AF] hover:bg-[#1E3A8A] text-white rounded-xl font-semibold mt-2">
                  {submitting ? (
                    <span className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Creating account...
                    </span>
                  ) : <>Create account <ArrowRight className="w-4 h-4" /></>}
                </Button>
              </form>

              <p className="text-xs text-gray-400 text-center mt-6">
                By creating an account you agree to our{" "}
                <a href="#" className="text-[#4F46E5] hover:underline">Terms</a> and{" "}
                <a href="#" className="text-[#4F46E5] hover:underline">Privacy Policy</a>.
              </p>
            </>
          )}
        </motion.div>
      </div>
    </div>
  );
}

function friendlyError(code: string): string {
  switch (code) {
    case "auth/email-already-in-use": return "An account with this email already exists.";
    case "auth/invalid-email": return "Please enter a valid email address.";
    case "auth/weak-password": return "Password must be at least 6 characters.";
    default: return "Sign up failed. Please try again.";
  }
}
