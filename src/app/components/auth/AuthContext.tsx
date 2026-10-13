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
    course?: string,
    phone?: string
  ) => Promise<{ user: User | null; session: any; needsEmailConfirmation: boolean; error?: any }>;
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

function isEmailConfirmationRequired(user: User | null, session: any): boolean {
  if (!user || session) return false;
  // Supabase returns a user without a session when email confirmation is required.
  return !user.email_confirmed_at;
}

function isRateLimitError(error: any): boolean {
  const message = String(error?.message || error || "").toLowerCase();
  return message.includes("rate limit") || message.includes("too many requests") || message.includes("email rate limit");
}

interface ProfileCacheEntry {
  profile: AppUser;
  timestamp: number;
}

const PROFILE_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const profileMemoryCache = new Map<string, ProfileCacheEntry>();
let inFlightProfilePromise: Promise<AppUser | null> | null = null;
let inFlightUserId: string | null = null;

export function clearProfileCache(userId?: string) {
  if (userId) {
    profileMemoryCache.delete(userId);
  } else {
    profileMemoryCache.clear();
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadProfile(nextUser: User | null, forceRefresh = false): Promise<AppUser | null> {
    if (!nextUser) {
      setAppUser(null);
      return null;
    }

    const userId = nextUser.id;

    // Check memory cache if not force refreshing
    if (!forceRefresh) {
      const cached = profileMemoryCache.get(userId);
      if (cached && Date.now() - cached.timestamp < PROFILE_CACHE_TTL_MS) {
        setAppUser(cached.profile);
        return cached.profile;
      }

      // Deduplicate concurrent in-flight profile requests for the same user
      if (inFlightProfilePromise && inFlightUserId === userId) {
        const result = await inFlightProfilePromise;
        if (result) setAppUser(result);
        return result;
      }
    }

    const fetchPromise = (async (): Promise<AppUser | null> => {
      try {
        const { data: admin } = await supabase
          .from("admin_profiles")
          .select("*")
          .eq("user_id", userId)
          .maybeSingle();

        if (admin?.status === "active") {
          const adminUser = mapAdmin(admin);
          profileMemoryCache.set(userId, { profile: adminUser, timestamp: Date.now() });
          setAppUser(adminUser);
          return adminUser;
        }

        let { data: profile } = await supabase
          .from("profiles")
          .select("*")
          .eq("user_id", userId)
          .maybeSingle();

        if (!profile) {
          try {
            const rawSem = nextUser.user_metadata?.semester;
            const sem = typeof rawSem === "number" ? rawSem : Number(rawSem) || 1;
            const newProfile = {
              user_id: userId,
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
              uid: userId,
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

        profileMemoryCache.set(userId, { profile: studentUser, timestamp: Date.now() });
        setAppUser(studentUser);
        return studentUser;
      } catch (err) {
        console.error("[AuthContext] loadProfile error:", err);
        setAppUser(null);
        return null;
      } finally {
        if (inFlightUserId === userId) {
          inFlightProfilePromise = null;
          inFlightUserId = null;
        }
      }
    })();

    inFlightProfilePromise = fetchPromise;
    inFlightUserId = userId;

    return fetchPromise;
  }

  async function refreshProfile() {
    if (user?.id) {
      clearProfileCache(user.id);
    }
    await loadProfile(user, true);
  }

  useEffect(() => {
    let mounted = true;
    let lastHandledUserId: string | null = null;
    let initialLoadDone = false;

    async function initializeAuth() {
      try {
        const { data } = await supabase.auth.getSession();
        if (!mounted) return;
        const currentUser = data.session?.user ?? null;
        lastHandledUserId = currentUser?.id ?? null;
        setUser(currentUser);
        if (currentUser) {
          await loadProfile(currentUser);
        } else {
          setAppUser(null);
        }
      } catch (err) {
        console.error("[AuthContext] Session init error:", err);
      } finally {
        initialLoadDone = true;
        if (mounted) setLoading(false);
      }
    }

    void initializeAuth();

    const { data: listener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;
      const currentUser = session?.user ?? null;
      const currentUserId = currentUser?.id ?? null;

      // Handle sign out explicitly
      if (event === "SIGNED_OUT" || !currentUser) {
        lastHandledUserId = null;
        profileMemoryCache.clear();
        setUser(null);
        setAppUser(null);
        if (mounted) setLoading(false);
        return;
      }

      // If user ID hasn't changed and we already loaded profile, skip redundant loadProfile calls
      // (e.g. initial duplicate onAuthStateChange trigger or periodic TOKEN_REFRESHED)
      if (initialLoadDone && currentUserId === lastHandledUserId) {
        setUser(currentUser);
        return;
      }

      lastHandledUserId = currentUserId;
      setUser(currentUser);
      await loadProfile(currentUser);
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
    course?: string,
    phone?: string
  ): Promise<{ user: User | null; session: any; needsEmailConfirmation: boolean; error?: any }> {
    setLoading(true);
    try {
      const sem = semester && semester >= 1 && semester <= 6 ? semester : 1;
      const crs = course?.trim() || "BCA";
      const name = fullName.trim();
      const cleanEmail = email.trim().toLowerCase();

      const origin = typeof window !== "undefined" && window.location?.origin
        ? window.location.origin
        : "https://bca-vault.portalbcavault.workers.dev";

      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          emailRedirectTo: `${origin}/dashboard`,
          data: {
            full_name: name,
            course: crs,
            semester: sem,
            phone: phone?.trim() || undefined,
          },
        },
      });

      if (error) {
        // Never perform a fallback sign-in after a signup failure. It can create
        // additional Auth traffic and makes rate-limit incidents worse.
        if (isRateLimitError(error)) {
          console.warn("[AuthContext] Signup rate limited; payment remains independent.");
        }
        return {
          user: null,
          session: null,
          needsEmailConfirmation: false,
          error,
        };
      }

      const activeUser = data.user ?? null;
      const activeSession = data.session ?? null;
      const needsEmailConfirmation = isEmailConfirmationRequired(activeUser, activeSession);

      if (activeSession && activeUser) {
        setUser(activeUser);
        await loadProfile(activeUser);
      }

      return {
        user: activeUser,
        session: activeSession,
        needsEmailConfirmation,
      };
    } catch (err: any) {
      return {
        user: null,
        session: null,
        needsEmailConfirmation: false,
        error: err,
      };
    } finally {
      setLoading(false);
    }
  }

  async function signInWithGoogle() {
    const origin = typeof window !== "undefined" && window.location?.origin
      ? window.location.origin
      : "https://bca-vault.portalbcavault.workers.dev";
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${origin}/dashboard`,
      },
    });
    if (error) throw error;
  }

  async function logout() {
    profileMemoryCache.clear();
    await supabase.auth.signOut();
    setUser(null);
    setAppUser(null);
  }

  async function resetPassword(email: string) {
    const origin = typeof window !== "undefined" && window.location?.origin
      ? window.location.origin
      : "https://bca-vault.portalbcavault.workers.dev";
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo: `${origin}/auth/update-password`,
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
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
