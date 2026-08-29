import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { adminSupabase } from "@/lib/supabase/client";

export type AdminRole = "superadmin";

export interface AdminUser {
  uid: string;
  name: string;
  email: string;
  role: AdminRole;
  status: "active" | "suspended";
  createdAt: string;
  createdBy: string;
}

interface Value {
  user: AdminUser | null;
  appUser: AdminUser | null;
  role: AdminRole | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<AdminUser>;
  logout: () => Promise<void>;
}

const Context = createContext<Value | null>(null);

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let mounted = true;

    async function checkCurrentAdmin() {
      try {
        const { data: { session } } = await adminSupabase.auth.getSession();
        const currentUser = session?.user;
        if (!currentUser) {
          if (mounted) {
            setUser(null);
            setLoading(false);
          }
          return;
        }

        const { data: adminProfile } = await adminSupabase
          .from("admin_profiles")
          .select("*")
          .eq("user_id", currentUser.id)
          .eq("role", "superadmin")
          .eq("status", "active")
          .maybeSingle();

        if (mounted) {
          if (adminProfile) {
            setUser({
              uid: adminProfile.user_id,
              name: adminProfile.email,
              email: adminProfile.email,
              role: "superadmin",
              status: "active",
              createdAt: adminProfile.created_at,
              createdBy: "system",
            });
          } else {
            setUser(null);
          }
          setLoading(false);
        }
      } catch (err) {
        console.error("[AdminAuth] Init error:", err);
        if (mounted) {
          setUser(null);
          setLoading(false);
        }
      }
    }

    void checkCurrentAdmin();

    const { data: listener } = adminSupabase.auth.onAuthStateChange(async (_event, session) => {
      if (!mounted) return;
      const currentUser = session?.user;
      if (!currentUser) {
        setUser(null);
        setLoading(false);
        return;
      }
      const { data: adminProfile } = await adminSupabase
        .from("admin_profiles")
        .select("*")
        .eq("user_id", currentUser.id)
        .eq("role", "superadmin")
        .eq("status", "active")
        .maybeSingle();

      if (mounted) {
        if (adminProfile) {
          setUser({
            uid: adminProfile.user_id,
            name: adminProfile.email,
            email: adminProfile.email,
            role: "superadmin",
            status: "active",
            createdAt: adminProfile.created_at,
            createdBy: "system",
          });
        } else {
          setUser(null);
        }
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  async function signIn(email: string, password: string): Promise<AdminUser> {
    setLoading(true);
    try {
      const { data, error } = await adminSupabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error || !data.user) {
        throw new Error(error?.message || "Invalid email or password.");
      }

      const { data: adminProfile, error: profileErr } = await adminSupabase
        .from("admin_profiles")
        .select("*")
        .eq("user_id", data.user.id)
        .eq("role", "superadmin")
        .eq("status", "active")
        .maybeSingle();

      if (profileErr || !adminProfile) {
        await adminSupabase.auth.signOut();
        throw new Error("Super Admin access required.");
      }

      const adminUser: AdminUser = {
        uid: adminProfile.user_id,
        name: adminProfile.email,
        email: adminProfile.email,
        role: "superadmin",
        status: "active",
        createdAt: adminProfile.created_at,
        createdBy: "system",
      };
      setUser(adminUser);
      return adminUser;
    } finally {
      setLoading(false);
    }
  }

  async function logout() {
    await adminSupabase.auth.signOut();
    setUser(null);
  }

  return (
    <Context.Provider
      value={{
        user,
        appUser: user,
        role: user ? "superadmin" : null,
        loading,
        signIn,
        logout,
      }}
    >
      {children}
    </Context.Provider>
  );
}

export function useAdminAuth() {
  const value = useContext(Context);
  if (!value) throw new Error("Administration context is unavailable.");
  return value;
}

