import { createContext, useContext, type ReactNode } from "react";
import { useAuth, type AppUser } from "./AuthContext";
import { supabase } from "@/lib/supabase/client";
export type AdminRole = "superadmin";
interface Value { user: AppUser | null; appUser: AppUser | null; role: AdminRole | null; loading: boolean; signIn: (email: string, password: string) => Promise<AppUser>; logout: () => Promise<void>; }
const Context = createContext<Value | null>(null);
export function AdminAuthProvider({ children }: { children: ReactNode }) { const auth = useAuth(); const role = auth.role === "superadmin" ? "superadmin" : null; async function signIn(email: string, password: string) { await auth.signIn(email, password); const { data: identity } = await supabase.auth.getUser(); const { data } = await supabase.from("admin_profiles").select("*").eq("user_id", identity.user?.id ?? "").maybeSingle(); if (!data || data.status !== "active" || data.role !== "superadmin") { await auth.logout(); throw new Error("Super Admin access required."); } await auth.refreshProfile(); return { uid: data.user_id, name: data.email, email: data.email, role: "superadmin", status: "active", createdAt: data.created_at, createdBy: "system" }; } return <Context.Provider value={{ user: role ? auth.appUser : null, appUser: role ? auth.appUser : null, role, loading: auth.loading, signIn, logout: auth.logout }}>{children}</Context.Provider>; }
export function useAdminAuth() { const value = useContext(Context); if (!value) throw new Error("Administration context is unavailable."); return value; }
