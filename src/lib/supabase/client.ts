import { createClient } from "@supabase/supabase-js";
import { projectId, publicAnonKey as defaultAnonKey } from "../../../utils/supabase/info";

export const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || `https://${projectId}.supabase.co`;
export const publicAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || defaultAnonKey;

// Client for student UI (standard session persistence)
export const supabase = createClient(supabaseUrl, publicAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    storageKey: "bca_student_auth",
  },
});

// Client for Super Admin UI (isolated admin session in localStorage under bca_admin_auth)
export const adminSupabase = createClient(supabaseUrl, publicAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    storageKey: "bca_admin_auth",
  },
});

export const SERVER_URL = `${supabaseUrl}/functions/v1/make-server-6704fe8f`;

export async function serverFetch(
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token ?? publicAnonKey;
  return fetch(`${SERVER_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "apikey": publicAnonKey,
      "Authorization": `Bearer ${token}`,
      ...(options.headers ?? {}),
    },
  });
}

