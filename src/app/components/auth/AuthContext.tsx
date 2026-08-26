import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase/client";

export type UserRole = "superadmin" | "admin" | "member";
export interface AppUser { uid: string; name: string; email: string; role: UserRole; status: "active" | "suspended"; branch?: string; semester?: number; college?: string; createdAt: string; createdBy: string; }
interface AuthContextValue { user: User | null; appUser: AppUser | null; role: UserRole | null; loading: boolean; signIn: (email: string, password: string) => Promise<void>; logout: () => Promise<void>; resetPassword: (email: string) => Promise<void>; refreshProfile: () => Promise<void>; }
const AuthContext = createContext<AuthContextValue | null>(null);
function mapStudent(row: any): AppUser { return { uid: row.user_id, name: row.full_name, email: row.email, role: "member", status: row.status === "active" ? "active" : "suspended", semester: row.semester ?? undefined, branch: row.course ?? undefined, createdAt: row.created_at, createdBy: "system" }; }
function mapAdmin(row: any): AppUser { return { uid: row.user_id, name: row.email, email: row.email, role: row.role, status: row.status === "active" ? "active" : "suspended", createdAt: row.created_at, createdBy: "system" }; }
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null); const [appUser, setAppUser] = useState<AppUser | null>(null); const [loading, setLoading] = useState(true);
  async function loadProfile(nextUser: User | null) {
    if (!nextUser) { setAppUser(null); return; }
    const { data: admin } = await supabase.from("admin_profiles").select("*").eq("user_id", nextUser.id).maybeSingle();
    if (admin?.status === "active") { setAppUser(mapAdmin(admin)); return; }
    const { data: profile } = await supabase.from("profiles").select("*").eq("user_id", nextUser.id).maybeSingle();
    setAppUser(profile ? mapStudent(profile) : null);
  }
  async function refreshProfile() { await loadProfile(user); }
  useEffect(() => { let current = true; supabase.auth.getSession().then(async ({ data }) => { if (!current) return; setUser(data.session?.user ?? null); await loadProfile(data.session?.user ?? null); if (current) setLoading(false); }); const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => { setUser(session?.user ?? null); void loadProfile(session?.user ?? null); setLoading(false); }); return () => { current = false; listener.subscription.unsubscribe(); }; }, []);
  async function signIn(email: string, password: string) { const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password }); if (error || !data.user) throw Object.assign(new Error("Invalid email or password."), { code: error?.code }); await loadProfile(data.user); }
  async function logout() { await supabase.auth.signOut(); setUser(null); setAppUser(null); }
  async function resetPassword(email: string) { const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/auth/update-password` }); if (error) throw error; }
  return <AuthContext.Provider value={{ user, appUser, role: appUser?.role ?? null, loading, signIn, logout, resetPassword, refreshProfile }}>{children}</AuthContext.Provider>;
}
export function useAuth() { const value = useContext(AuthContext); if (!value) throw new Error("Authentication context is unavailable."); return value; }
