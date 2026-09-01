import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase/client";

export type UserRole = "superadmin" | "admin" | "member";

export interface AppUser {
  uid: string;
  name: string;
  email: string;
  role: UserRole;
  status: "active" | "suspended";
  branch?: string;
  semester?: number;
  college?: string;
  createdAt: string;
  createdBy: string;
}

interface AuthContextValue {
  user: User | null;
  appUser: AppUser | null;
  role: UserRole | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (
    email: string,
    password: string,
    fullName: string,
    semester?: number,
    course?: string
  ) => Promise<{ user: User | null; session: any; needsEmailConfirmation: boolean }>;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function mapStudent(row: any): AppUser {
  return {
    uid: row.user_id,
    name: row.full_name || row.email?.split("@")[0] || "Student",
    email: row.email,
    role: "member",
    status: row.status === "active" ? "active" : "suspended",
    semester: row.semester ?? 1,
    branch: row.course ?? "BCA",
    createdAt: row.created_at,
    createdBy: "system",
  };
}

function mapAdmin(row: any): AppUser {
  return {
    uid: row.user_id,
    name: row.email,
    email: row.email,
    role: row.role,
    status: row.status === "active" ? "active" : "suspended",
    createdAt: row.created_at,
    createdBy: "system",
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadProfile(nextUser: User | null): Promise<AppUser | null> {
    if (!nextUser) {
      setAppUser(null);
      return null;
    }
    try {
      const { data: admin } = await supabase
        .from("admin_profiles")
        .select("*")
        .eq("user_id", nextUser.id)
        .maybeSingle();

      if (admin?.status === "active") {
        const adminUser = mapAdmin(admin);
        setAppUser(adminUser);
        return adminUser;
      }

      let { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", nextUser.id)
        .maybeSingle();

      // Auto-repair missing student profile in profiles table
      if (!profile) {
        try {
          const rawSem = nextUser.user_metadata?.semester;
          const sem = typeof rawSem === "number" ? rawSem : Number(rawSem) || 1;
          const newProfile = {
            user_id: nextUser.id,
            full_name:
              nextUser.user_metadata?.full_name ||
              nextUser.user_metadata?.name ||
              nextUser.email?.split("@")[0] ||
              "Student",
            email: nextUser.email || "",
            course: nextUser.user_metadata?.course || "BCA",
            semester: sem,
            status: "inactive",
          };
          const { data: inserted, error: insertErr } = await supabase
            .from("profiles")
            .upsert(newProfile, { onConflict: "user_id" })
            .select()
            .maybeSingle();
          if (!insertErr && inserted) {
            profile = inserted;
          }
        } catch (repairErr) {
          console.warn("[AuthContext] Auto-repair profiles catch:", repairErr);
        }
      }

      const rawMetaSem = nextUser.user_metadata?.semester;
      const fallbackSem = typeof rawMetaSem === "number" ? rawMetaSem : Number(rawMetaSem) || 1;

      const studentUser: AppUser = profile
        ? mapStudent(profile)
        : {
            uid: nextUser.id,
            name:
              nextUser.user_metadata?.full_name ||
              nextUser.user_metadata?.name ||
              nextUser.email?.split("@")[0] ||
              "Student",
            email: nextUser.email || "",
            role: "member" as UserRole,
            status: "active" as const,
            semester: fallbackSem,
            branch: nextUser.user_metadata?.course || "BCA",
            createdAt: nextUser.created_at || new Date().toISOString(),
            createdBy: "system",
          };
      setAppUser(studentUser);
      return studentUser;
    } catch (err) {
      console.error("[AuthContext] loadProfile error:", err);
      setAppUser(null);
      return null;
    }
  }

  async function refreshProfile() {
    await loadProfile(user);
  }

  useEffect(() => {
    let mounted = true;

    async function initializeAuth() {
      try {
        const { data } = await supabase.auth.getSession();
        if (!mounted) return;
        const currentUser = data.session?.user ?? null;
        setUser(currentUser);
        if (currentUser) {
          await loadProfile(currentUser);
        } else {
          setAppUser(null);
        }
      } catch (err) {
        console.error("[AuthContext] Session init error:", err);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    void initializeAuth();

    const { data: listener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) {
        await loadProfile(currentUser);
      } else {
        setAppUser(null);
      }
      if (mounted) setLoading(false);
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  async function signIn(email: string, password: string) {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error || !data.user) {
        const message = error?.message || "Invalid email or password.";
        const err = new Error(message);
        (err as any).code = error?.code || "invalid_credentials";
        throw err;
      }
      setUser(data.user);
      await loadProfile(data.user);
    } finally {
      setLoading(false);
    }
  }

  async function signUp(
    email: string,
    password: string,
    fullName: string,
    semester?: number,
    course?: string
  ): Promise<{ user: User | null; session: any; needsEmailConfirmation: boolean }> {
    setLoading(true);
    try {
      const sem = semester && semester >= 1 && semester <= 6 ? semester : 1;
      const crs = course?.trim() || "BCA";
      const name = fullName.trim();
      const cleanEmail = email.trim().toLowerCase();

      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          data: {
            full_name: name,
            course: crs,
            semester: sem,
          },
        },
      });

      if (error) {
        throw error;
      }

      const needsEmailConfirmation = Boolean(
        data.user &&
          !data.session &&
          (!data.user.confirmed_at || (data.user.identities && data.user.identities.length === 0))
      );

      if (data.user && data.session) {
        setUser(data.user);
        await loadProfile(data.user);
      }

      return {
        user: data.user,
        session: data.session,
        needsEmailConfirmation,
      };
    } finally {
      setLoading(false);
    }
  }

  async function signInWithGoogle() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/dashboard`,
      },
    });
    if (error) throw error;
  }

  async function logout() {
    await supabase.auth.signOut();
    setUser(null);
    setAppUser(null);
  }

  async function resetPassword(email: string) {
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo: `${window.location.origin}/auth/update-password`,
    });
    if (error) throw error;
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        appUser,
        role: appUser?.role ?? null,
        loading,
        signIn,
        signUp,
        signInWithGoogle,
        logout,
        resetPassword,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("Authentication context is unavailable.");
  return value;
}


