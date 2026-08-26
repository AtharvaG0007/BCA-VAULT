import { supabase } from "./client";

const adminFn = async <T>(path: string, body: unknown): Promise<T> => {
  const { data: { session } } = await supabase.auth.getSession();
  const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/bca-admin${path}`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token ?? ""}` }, body: JSON.stringify(body) });
  const json = await response.json();
  if (!response.ok) throw new Error(json.error ?? "Administrative operation failed.");
  return json as T;
};

export const adminApi = {
  listPayments: (status = "all", search = "") => { let q = supabase.from("payment_submissions").select("id,reference_id,user_id,bundle_id,full_name,email,phone,course,semester,amount,utr,screenshot_bucket,screenshot_path,status,admin_notes,verified_at,verified_by,created_at,bundles(title)", { count: "exact" }).order("created_at", { ascending: false }).range(0, 49); if (status !== "all") q = q.eq("status", status); if (search) q = q.or(`full_name.ilike.%${search}%,email.ilike.%${search}%,utr.ilike.%${search}%`); return q; },
  listStudents: (search = "") => { let q = supabase.from("profiles").select("user_id,full_name,email,phone,course,semester,status,created_at", { count: "exact" }).order("created_at", { ascending: false }).range(0, 49); if (search) q = q.or(`full_name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`); return q; },
  listAccess: async () => {
    const { data: access, error: accessError } = await supabase.from("access_permissions").select("id,user_id,bundle_id,status,granted_at,granted_by,expires_at,bundles(title)").order("granted_at", { ascending: false }).range(0, 99);
    if (accessError || !access?.length) return { data: access ?? [], error: accessError };

    const { data: profiles, error: profilesError } = await supabase.from("profiles").select("user_id,full_name,email").in("user_id", [...new Set(access.map((row) => row.user_id))]);
    if (profilesError) return { data: null, error: profilesError };

    const profilesByUserId = new Map((profiles ?? []).map((profile) => [profile.user_id, profile]));
    return { data: access.map((row) => ({ ...row, profiles: profilesByUserId.get(row.user_id) ?? null })), error: null };
  },
  listBundles: () => supabase.from("bundles").select("id,title,description,price,published,created_at,notes(count),access_permissions(count)").order("created_at", { ascending: false }).range(0, 99),
  listNotes: () => supabase.from("notes").select("id,title,description,subject,semester,bundle_id,storage_bucket,storage_path,published,created_at,bundles(title)").order("created_at", { ascending: false }).range(0, 99),
  listActivity: () => supabase.from("activity_logs").select("id,action,target_type,target_id,metadata,created_at,actor_id").order("created_at", { ascending: false }).range(0, 99),
  reviewPayment: async (id: string, status: "approved" | "rejected", note = "") => { await adminFn("/payments/review", { id, status, note }); },
  updateProfile: async (id: string, status: "active" | "inactive") => { const result = await supabase.from("profiles").update({ status }).eq("user_id", id); if (result.error) throw result.error; },
  grantAccess: async (user_id: string, bundle_id: string, expires_at?: string) => { const { data: { user } } = await supabase.auth.getUser(); const result = await supabase.from("access_permissions").upsert({ user_id, bundle_id, status: "active", granted_by: user.user?.id, expires_at: expires_at || null }, { onConflict: "user_id,bundle_id" }); if (result.error) throw result.error; },
  revokeAccess: async (id: string) => { const result = await supabase.from("access_permissions").update({ status: "revoked" }).eq("id", id); if (result.error) throw result.error; },
  saveBundle: async (payload: { id?: string; title: string; description: string; price: number; published: boolean }) => { const { id, ...data } = payload; const q = id ? supabase.from("bundles").update(data).eq("id", id) : supabase.from("bundles").insert(data); const result = await q; if (result.error) throw result.error; },
  saveNote: async (payload: Record<string, unknown>) => { const result = await supabase.from("notes").insert(payload); if (result.error) throw result.error; },
  createStudent: (data: unknown) => adminFn<{ student: { user_id: string } }>("/students", data),
  resetPassword: (email: string) => adminFn("/students/reset-password", { email }),
  paymentUrl: (bucket: string, path: string) => adminFn<{ url: string }>("/payments/signed-url", { bucket, path }),
  noteUploadUrl: (fileName: string) => adminFn<{ bucket: string; path: string; token: string }>("/notes/upload-url", { fileName, contentType: "application/pdf" }),
  deleteNote: (id: string) => adminFn("/notes/delete", { id }),
};
