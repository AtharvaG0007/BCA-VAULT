import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router";
import { motion } from "motion/react";
import { Shield, Eye, EyeOff, Loader2, AlertCircle, Lock } from "lucide-react";
import { useAdminAuth } from "@/app/components/auth/AdminAuthContext";

export function AdminLoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, role, loading: authLoading, signIn, logout } = useAdminAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [locked, setLocked] = useState(false);
  const [lockTime, setLockTime] = useState(0);

  // If already authenticated as superadmin, redirect to /admin/dashboard
  useEffect(() => {
    if (!authLoading && user && role === "superadmin") {
      navigate("/admin/dashboard", { replace: true });
    }
  }, [user, role, authLoading, navigate]);

  // Rate limit: lock after 5 failed attempts for 5 minutes
  useEffect(() => {
    if (!locked) return;
    const target = Date.now() + lockTime * 1000;
    const interval = setInterval(() => {
      const remaining = Math.ceil((target - Date.now()) / 1000);
      if (remaining <= 0) {
        setLocked(false);
        setAttempts(0);
        setLockTime(0);
        clearInterval(interval);
      } else {
        setLockTime(remaining);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [locked, lockTime]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (locked) return;

    setLoading(true);
    setError(null);

    try {
      const profile = await signIn(email, password);
      const userRole = profile.role;

      if (userRole !== "superadmin") {
        await logout();
        throw new Error("This account is not authorized for administration.");
      }

      navigate("/admin/dashboard", { replace: true });
      setAttempts(0);
    } catch (err: any) {
      setAttempts((a) => {
        const next = a + 1;
        if (next >= 5) {
          setLocked(true);
          setLockTime(300);
          setError("Too many failed attempts. Please try again in 5 minutes.");
        } else {
          const msg = err?.message ?? "Login failed. Please verify your credentials.";
          setError(msg);
        }
        return next;
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-sm"
      >
        {/* Icon + title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#1E40AF]/20 border border-[#1E40AF]/30 mb-4 shadow-lg shadow-indigo-500/10">
            <Shield className="w-7 h-7 text-[#60A5FA]" />
          </div>
          <h1 className="text-2xl font-black text-white" style={{ fontFamily: "var(--font-display)" }}>
            Super Admin Access
          </h1>
          <p className="text-gray-400 text-xs mt-1">Root-level system administration</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1.5">Admin Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={locked || loading}
              placeholder="superadmin@bcavault.in"
              autoComplete="username"
              className="w-full bg-gray-900 border border-gray-700 text-white placeholder-gray-500 px-4 py-3 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#1E40AF] focus:border-transparent transition disabled:opacity-50"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1.5">Password</label>
            <div className="relative">
              <input
                type={showPw ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={locked || loading}
                placeholder="••••••••"
                autoComplete="current-password"
                className="w-full bg-gray-900 border border-gray-700 text-white placeholder-gray-500 px-4 py-3 pr-12 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#1E40AF] focus:border-transparent transition disabled:opacity-50"
              />
              <button
                type="button"
                onClick={() => setShowPw((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-200 transition"
                aria-label={showPw ? "Hide password" : "Show password"}
              >
                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-2 bg-red-950/60 border border-red-900 rounded-xl px-4 py-3 text-red-300 text-xs font-medium">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {locked && (
            <div className="flex items-center gap-2 bg-orange-950/60 border border-orange-900 rounded-xl px-4 py-3 text-orange-300 text-xs font-medium">
              <Lock className="w-4 h-4 shrink-0" />
              <span>Account locked. Try again in {lockTime}s.</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || locked}
            className="w-full h-12 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 transition mt-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Verifying…
              </>
            ) : (
              "Sign In to Admin Portal"
            )}
          </button>
        </form>

        <p className="text-center text-[11px] text-gray-500 mt-8">
          Authorized Super Admin access only. Unauthorized attempts are logged.
        </p>
      </motion.div>
    </div>
  );
}
