import { supabase, adminSupabase, publicAnonKey, supabaseUrl } from "./client";
import type { CreateStudentPayload, CreateStudentResponse } from "./types";

const studentFn = async <T>(path: string, body: unknown): Promise<T> => {
  const { data: { session } } = await supabase.auth.getSession();
  const response = await fetch(`${supabaseUrl}/functions/v1/make-server-6704fe8f${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": publicAnonKey,
      Authorization: `Bearer ${session?.access_token ?? ""}`,
    },
    body: JSON.stringify(body),
  });
  const json = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(json.error ?? "Student operation failed.");
  return json as T;
};

const adminFn = async <T>(path: string, body: unknown): Promise<T> => {
  const { data: { session } } = await adminSupabase.auth.getSession();
  const response = await fetch(`${supabaseUrl}/functions/v1/bca-admin${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": publicAnonKey,
      Authorization: `Bearer ${session?.access_token ?? ""}`,
    },
    body: JSON.stringify(body),
  });
  const json = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(json.error ?? "Administrative operation failed.");
  return json as T;
};

export const adminApi = {
  listPayments: (status = "all", search = "") => {
    let q = adminSupabase
      .from("payment_submissions")
      .select(
        "id,reference_id,user_id,full_name,email,phone,course,semester,amount,utr,screenshot_bucket,screenshot_path,status,admin_notes,verified_at,verified_by,created_at,bundle_id,referral_code,bundles(title)",
        { count: "exact" }
      )
      .order("created_at", { ascending: false })
      .range(0, 99);
    if (status !== "all") q = q.eq("status", status);
    if (search)
      q = q.or(`full_name.ilike.%${search}%,email.ilike.%${search}%,utr.ilike.%${search}%,reference_id.ilike.%${search}%`);
    return q;
  },
  listStudents: async (search = "") => {
    try {
      const res = await adminFn<{ success: boolean; data: any[]; count?: number }>("/students/list", { search });
      if (res && res.data) {
        return { data: res.data, error: null, count: res.count ?? res.data.length };
      }
    } catch (edgeErr) {
      console.warn("[adminApi.listStudents] Edge function fallback:", edgeErr);
    }

    let q = adminSupabase
      .from("profiles")
      .select("user_id,full_name,email,phone,course,semester,status,created_at,updated_at", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(0, 99);

    if (search) {
      q = q.or(`full_name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`);
    }

    const { data: students, error: studentsErr, count } = await q;
    if (studentsErr || !students?.length) {
      return { data: students ?? [], error: studentsErr, count };
    }

    const userIds = students.map((s) => s.user_id);
    const [accessRes, paymentsRes] = await Promise.all([
      adminSupabase
        .from("access_permissions")
        .select("user_id,bundle_id,status,bundles(title)")
        .in("user_id", userIds)
        .eq("status", "active"),
      adminSupabase
        .from("payment_submissions")
        .select("user_id,status,created_at")
        .in("user_id", userIds)
        .order("created_at", { ascending: false }),
    ]);

    const accessByUserId = new Map<string, string[]>();
    (accessRes.data || []).forEach((row: any) => {
      const title = row.bundles?.title || "Active Bundle";
      const list = accessByUserId.get(row.user_id) || [];
      list.push(title);
      accessByUserId.set(row.user_id, list);
    });

    const paymentByUserId = new Map<string, string>();
    (paymentsRes.data || []).forEach((row: any) => {
      if (!paymentByUserId.has(row.user_id)) {
        paymentByUserId.set(row.user_id, row.status);
      }
    });

    const enriched = students.map((s) => ({
      ...s,
      assigned_bundles: accessByUserId.get(s.user_id) || [],
      payment_status: paymentByUserId.get(s.user_id) || "unpaid",
      is_verified: true, // fallback assumption if edge fn unavailable
    }));

    return { data: enriched, error: null, count };
  },
  listAccess: async () => {
    const { data: access, error: accessError } = await adminSupabase.from("access_permissions").select("id,user_id,bundle_id,status,granted_at,granted_by,expires_at,bundles(title)").order("granted_at", { ascending: false }).range(0, 99);
    if (accessError || !access?.length) return { data: access ?? [], error: accessError };

    const { data: profiles, error: profilesError } = await adminSupabase.from("profiles").select("user_id,full_name,email").in("user_id", [...new Set(access.map((row) => row.user_id))]);
    if (profilesError) return { data: null, error: profilesError };

    const profilesByUserId = new Map((profiles ?? []).map((profile) => [profile.user_id, profile]));
    return { data: access.map((row) => ({ ...row, profiles: profilesByUserId.get(row.user_id) ?? null })), error: null };
  },
  listBundles: () => adminSupabase.from("bundles").select("id,title,description,price,published,created_at,notes(count),access_permissions(count)").order("created_at", { ascending: false }).range(0, 99),
  listNotes: () => adminSupabase.from("notes").select("id,title,description,subject,semester,bundle_id,storage_bucket,storage_path,published,created_at,bundles(title)").order("created_at", { ascending: false }).range(0, 99),
  listActivity: () => adminSupabase.from("activity_logs").select("id,action,target_type,target_id,metadata,created_at,actor_id").order("created_at", { ascending: false }).range(0, 99),
  
  listReferrals: async () => {
    try {
      const res = await adminFn<{
        success: boolean;
        metrics: {
          total_referrals: number;
          pending_referrals: number;
          successful_referrals: number;
          rewards_unlocked: number;
        };
        referrals: any[];
        rewards: any[];
      }>("/referrals/list", {});
      if (res && res.success) {
        return { data: res, error: null };
      }
    } catch (err: any) {
      console.warn("[adminApi.listReferrals] Edge function error:", err);
    }

    // Direct database fallback
    const [refsRes, rewardsRes] = await Promise.all([
      adminSupabase
        .from("referrals")
        .select("id, referrer_user_id, referred_user_id, referral_code_id, status, created_at, successful_at")
        .order("created_at", { ascending: false })
        .range(0, 99),
      adminSupabase
        .from("referral_rewards")
        .select("id, referral_id, user_id, reward_type, status, unlocked_at, claimed_at")
        .order("unlocked_at", { ascending: false })
        .range(0, 99),
    ]);

    const referrals = (refsRes.data || []).map((r: any) => ({
      ...r,
      referral_code: "BV-******",
      referrer_name: "Referrer",
      referrer_email: "—",
      referred_name: "Referred Student",
      referred_email: "—",
      reward_status: r.status === "successful" ? "unlocked" : "pending",
      reward_type: "Most Repeated Questions",
    }));

    const rewards = (rewardsRes.data || []).map((rw: any) => ({
      ...rw,
      student_name: "Student",
      student_email: "—",
      reward_type: rw.reward_type === "most_repeated_questions" ? "Most Repeated Questions" : rw.reward_type,
    }));

    return {
      data: {
        metrics: {
          total_referrals: referrals.length,
          pending_referrals: referrals.filter((r) => r.status === "pending").length,
          successful_referrals: referrals.filter((r) => r.status === "successful").length,
          rewards_unlocked: rewards.filter((rw) => rw.status === "unlocked").length,
        },
        referrals,
        rewards,
      },
      error: null,
    };
  },
  
  // Delete a bundle and all associated data
  deleteBundle: async (bundleId: string) => {
    // Verify admin session
    const { data: { user } } = await adminSupabase.auth.getUser();
    if (!user) throw new Error("Unauthenticated");
    const { data: adminProfile, error: adminErr } = await adminSupabase
      .from("admin_profiles")
      .select("role,status")
      .eq("user_id", user.id)
      .maybeSingle();
    if (adminErr) throw adminErr;
    if (!adminProfile || adminProfile.role !== "superadmin" || adminProfile.status !== "active")
      throw new Error("Unauthorized");

    // Fetch bundle
    const { data: bundle, error: bundleErr } = await adminSupabase
      .from("bundles")
      .select("id,title,published")
      .eq("id", bundleId)
      .single();
    if (bundleErr) throw bundleErr;
    if (!bundle) throw new Error("Bundle not found");

    // Fetch associated notes
    const { data: notes, error: notesErr } = await adminSupabase
      .from("notes")
      .select("id,storage_bucket,storage_path")
      .eq("bundle_id", bundleId);
    if (notesErr) throw notesErr;

    // Fetch associated access permissions
    const { data: access, error: accessErr } = await adminSupabase
      .from("access_permissions")
      .select("id")
      .eq("bundle_id", bundleId);
    if (accessErr) throw accessErr;

    // Delete access permissions
    if (access && access.length) {
      const { error: delAccessErr } = await adminSupabase
        .from("access_permissions")
        .delete()
        .eq("bundle_id", bundleId);
      if (delAccessErr) throw delAccessErr;
    }

    // Delete storage files and notes
    if (notes && notes.length) {
      for (const note of notes) {
        const bucket = note.storage_bucket || "Bca_notes";
        const { error: storageErr } = await adminSupabase.storage.from(bucket).remove([note.storage_path]);
        if (storageErr) throw storageErr;
      }
      const { error: delNotesErr } = await adminSupabase.from("notes").delete().eq("bundle_id", bundleId);
      if (delNotesErr) throw delNotesErr;
    }

    // Delete the bundle itself
    const { error: delBundleErr } = await adminSupabase.from("bundles").delete().eq("id", bundleId);
    if (delBundleErr) throw delBundleErr;

    // Activity log
    await adminSupabase.from("activity_logs").insert([
      {
        action: "bundle_deleted",
        actor_id: user.id,
        target_type: "bundle",
        target_id: bundleId,
        metadata: JSON.stringify({ title: bundle.title }),
        created_at: new Date().toISOString(),
      },
    ]);
    return true;
  },

  updateProfile: async (id: string, status: "active" | "inactive") => {
    const result = await adminSupabase.from("profiles").update({ status }).eq("user_id", id);
    if (result.error) throw result.error;
  },
  grantAccess: async (user_id: string, bundle_id: string, expires_at?: string) => {
    return adminFn<{ success: boolean; message: string }>("/access/grant", {
      userId: user_id,
      bundleId: bundle_id,
      expiresAt: expires_at || null,
    });
  },
  revokeAccess: async (userOrPermissionId: string, bundle_id?: string) => {
    if (bundle_id) {
      return adminFn<{ success: boolean; message: string }>("/access/revoke", {
        userId: userOrPermissionId,
        bundleId: bundle_id,
      });
    }
    return adminFn<{ success: boolean; message: string }>("/access/revoke", {
      permissionId: userOrPermissionId,
    });
  },
  saveBundle: async (payload: { id?: string; title: string; description: string; price: number; published: boolean }) => {
    const { id, ...data } = payload;
    const q = id ? adminSupabase.from("bundles").update(data).eq("id", id) : adminSupabase.from("bundles").insert(data);
    const result = await q;
    if (result.error) throw result.error;
  },
  saveNote: async (payload: Record<string, unknown>) => {
    const result = await adminSupabase.from("notes").insert(payload);
    if (result.error) throw result.error;
  },
  createStudent: (data: CreateStudentPayload | unknown) =>
    adminFn<CreateStudentResponse>("/students", data),
  
  // Student‑authorized signed URL generation using student-note-signed-url edge function
  getStudentSignedNoteUrl: async (noteId: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token ?? "";
    if (!token) throw new Error("Authentication required. Please sign in again.");

    const response = await fetch(`${supabaseUrl}/functions/v1/student-note-signed-url`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": publicAnonKey,
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify({ noteId }),
    });

    const json = await response.json().catch(() => ({}));
    if (!response.ok || !json.success || !json.signedUrl) {
      throw new Error(json.error || "Failed to generate secure note access link.");
    }
    return {
      signedUrl: json.signedUrl as string,
      expiresIn: (json.expiresIn as number) || 180,
      note: json.note,
      watermark: json.watermark as {
        studentName?: string;
        studentEmail?: string;
        studentId?: string;
        sessionTimestamp?: string;
      } | undefined,
    };
  },

  reviewPayment: (id: string, status: "approved" | "rejected", note = "") =>
    adminFn<{ success: boolean; payment: unknown }>("/payments/review", { id, status, note }),
  verifyStudentEmail: (userId: string) =>
    adminFn<{ success: boolean; message?: string }>("/students/verify-email", { userId }),
  resetPassword: (email: string) => adminFn("/students/reset-password", { email }),
  paymentUrl: (bucket: string, path: string) => adminFn<{ url: string }>("/payments/signed-url", { bucket, path }),
  noteUploadUrl: (fileName: string, semester = 1) => adminFn<{ bucket: string; path: string; token: string }>("/notes/upload-url", { fileName, contentType: "application/pdf", semester }),
  deleteNote: (id: string) => adminFn("/notes/delete", { id }),
};

