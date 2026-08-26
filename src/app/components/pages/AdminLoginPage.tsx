import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router";
import { motion } from "motion/react";
import { Shield, Eye, EyeOff, Loader2, AlertCircle, Lock } from "lucide-react";
import { useAdminAuth } from "@/app/components/auth/AdminAuthContext";

export function AdminLoginPage() {
  const navigate   = useNavigate();
  const location   = useLocation();
  const { signIn, logout } = useAdminAuth();

  const isSuperAdmin = true;

  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [showPw,   setShowPw]   = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState<string | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [locked,   setLocked]   = useState(false);
  const [lockTime, setLockTime] = useState(0);

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
  }, [locked]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (locked) return;

    setLoading(true);
    setError(null);

    try {
      const profile = await signIn(email, password);
      const role = profile.role;
      const hasAccess = role === "superadmin";

      if (!hasAccess) {
        await logout();
        throw new Error("This account is not authorized for this portal.");
      }

      // Redirect based on actual role
      navigate("/admin-root/dashboard", { replace: true });

      setAttempts(0);
    } catch (err: any) {
      setAttempts(a => {
        const next = a + 1;
        if (next >= 5) {
          setLocked(true);
          setLockTime(300);
          setError("Too many failed attempts. Please try again in 5 minutes.");
        } else {
          const msg = err?.message ?? "Login failed. Please try again.";
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
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#1E40AF]/20 border border-[#1E40AF]/30 mb-4">
            <Shield className="w-7 h-7 text-[#60A5FA]" />
          </div>
          <h1 className="text-xl font-black text-white" style={{ fontFamily: "var(--font-display)" }}>
            {isSuperAdmin ? "Super Admin" : "Admin"} Access
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            {isSuperAdmin ? "Root-level administration" : "Dashboard administration"}
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-1.5">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              disabled={locked || loading}
              placeholder="superadmin@bcavault.in"
              className="w-full bg-gray-900 border border-gray-700 text-white placeholder-gray-600 px-4 py-3 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#1E40AF] focus:border-transparent transition disabled:opacity-50"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-1.5">Password</label>
            <div className="relative">
              <input
                type={showPw ? "text" : "password"}
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                disabled={locked || loading}
                placeholder="••••••••"
                className="w-full bg-gray-900 border border-gray-700 text-white placeholder-gray-600 px-4 py-3 pr-12 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#1E40AF] focus:border-transparent transition disabled:opacity-50"
              />
              <button
                type="button"
                onClick={() => setShowPw(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-500 hover:text-gray-300 transition"
              >
                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-2 bg-red-950/50 border border-red-900 rounded-xl px-4 py-3 text-red-400 text-sm">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /> {error}
            </div>
          )}

          {locked && (
            <div className="flex items-center gap-2 bg-orange-950/50 border border-orange-900 rounded-xl px-4 py-3 text-orange-400 text-sm">
              <Lock className="w-4 h-4 shrink-0" />
              Account locked. Try again in {lockTime}s.
            </div>
          )}

          <button
            type="submit"
            disabled={loading || locked}
            className="w-full h-12 bg-[#1E40AF] hover:bg-[#1E3A8A] disabled:opacity-50 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition mt-2"
          >
            {loading ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Verifying…</>
            ) : (
              "Sign In"
            )}
          </button>
        </form>

        <p className="text-center text-xs text-gray-700 mt-8">
          Unauthorized access attempts are logged and monitored.
        </p>
      </motion.div>
    </div>
  );
}
