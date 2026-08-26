import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router";
import { motion } from "motion/react";
import { BookOpen, Mail, Lock, Eye, EyeOff, ArrowRight, AlertCircle } from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { useAuth } from "@/app/components/auth/AuthContext";

const roleRedirect: Record<string, string> = {
  superadmin: "/admin-root/dashboard",
  admin: "/admin/dashboard",
  member: "/app/dashboard",
};

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { signIn, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const from = (location.state as any)?.from?.pathname;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await signIn(email, password);
      // Role redirect handled by ProtectedRoute; navigate to home and let guards redirect
      navigate(from ?? "/", { replace: true });
    } catch (err: any) {
      setError(friendlyError(err.code));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-[#1E40AF] to-[#4F46E5] relative overflow-hidden flex-col justify-between p-12">
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)", backgroundSize: "28px 28px" }} />
        <Link to="/" className="relative flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
            <BookOpen className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold text-white" style={{ fontFamily: 'var(--font-display)' }}>BCA Vault</span>
        </Link>
        <div className="relative">
          <h2 className="text-4xl font-bold text-white mb-4 leading-tight" style={{ fontFamily: 'var(--font-display)' }}>
            Welcome back.<br />Sign in to continue.
          </h2>
          <p className="text-blue-200 text-lg">Trusted by Bharati Vidyapeeth students.</p>
        </div>
        <p className="relative text-xs text-white/30">Secure login powered by Supabase Authentication.</p>
      </div>

      {/* Right: Form */}
      <div className="flex-1 flex items-center justify-center p-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="w-8 h-8 rounded-lg bg-[#1E40AF] flex items-center justify-center">
              <BookOpen className="w-4 h-4 text-white" />
            </div>
            <span className="text-lg font-bold text-gray-900" style={{ fontFamily: 'var(--font-display)' }}>BCA Vault</span>
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-1" style={{ fontFamily: 'var(--font-display)' }}>Sign in to your account</h1>
          <p className="text-gray-500 text-sm mb-8">Accounts are created after payment verification by BCA Vault administration.</p>

          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-5 text-red-600 text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" /> {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label className="text-sm font-medium text-gray-700 mb-1.5 block">Email address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input type="email" placeholder="you@example.com" value={email}
                  onChange={e => setEmail(e.target.value)} required
                  className="pl-10 h-11 rounded-xl border-gray-200 bg-white" />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <Label className="text-sm font-medium text-gray-700">Password</Label>
                <Link to="/auth/forgot-password" className="text-xs text-[#4F46E5] hover:underline">Forgot password?</Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input type={showPassword ? "text" : "password"} placeholder="••••••••" value={password}
                  onChange={e => setPassword(e.target.value)} required
                  className="pl-10 pr-10 h-11 rounded-xl border-gray-200 bg-white" />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <Button type="submit" disabled={submitting || loading}
              className="w-full h-11 bg-[#1E40AF] hover:bg-[#1E3A8A] text-white rounded-xl font-semibold mt-2">
              {submitting ? (
                <span className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Signing in...
                </span>
              ) : <>Sign in <ArrowRight className="w-4 h-4" /></>}
            </Button>
          </form>

        </motion.div>
      </div>
    </div>
  );
}

function friendlyError(code: string): string {
  switch (code) {
    case "auth/user-not-found": return "No account found with this email.";
    case "auth/wrong-password": return "Incorrect password. Please try again.";
    case "auth/invalid-email": return "Please enter a valid email address.";
    case "auth/too-many-requests": return "Too many failed attempts. Please try again later.";
    case "auth/invalid-credential": return "Invalid email or password.";
    default: return "Sign in failed. Please check your credentials.";
  }
}
