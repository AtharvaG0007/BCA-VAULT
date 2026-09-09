import type { VercelRequest, VercelResponse } from "@vercel/node";
import { publicError, requireAdmin, supabaseAdmin } from "../_supabaseAdmin";

const text = (value: unknown) => typeof value === "string" ? value.trim() : "";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const caller = await requireAdmin(req, res);
  if (!caller) return;
  const client = supabaseAdmin();
  try {
    if (req.method === "GET") {
      const { data: profiles, error: profilesError } = await client.from("profiles").select("*").order("created_at", { ascending: false });
      if (profilesError) throw profilesError;
      if (!profiles?.length) return res.status(200).json({ students: [] });

      const [accessRes, authUsersRes] = await Promise.all([
        client.from("access_permissions").select("id,user_id,status,bundle_id,bundles(title)").in("user_id", profiles.map((profile) => profile.user_id)),
        client.auth.admin.listUsers({ perPage: 1000 }),
      ]);
      if (accessRes.error) throw accessRes.error;
      const accessByUserId = new Map<string, typeof accessRes.data>();
      for (const access of accessRes.data ?? []) {
        const existing = accessByUserId.get(access.user_id) ?? [];
        existing.push(access);
        accessByUserId.set(access.user_id, existing);
      }
      const authUserMap = new Map<string, { email_confirmed_at?: string | null; confirmed_at?: string | null; is_verified: boolean }>();
      (authUsersRes.data?.users || []).forEach((u) => {
        const confirmed = Boolean(u.email_confirmed_at || (u as any).confirmed_at);
        authUserMap.set(u.id, {
          email_confirmed_at: u.email_confirmed_at || (u as any).confirmed_at || null,
          confirmed_at: (u as any).confirmed_at || null,
          is_verified: confirmed,
        });
      });
      return res.status(200).json({
        students: profiles.map((profile) => {
          const authInfo = authUserMap.get(profile.user_id);
          return {
            ...profile,
            access_permissions: accessByUserId.get(profile.user_id) ?? [],
            email_confirmed_at: authInfo?.email_confirmed_at ?? null,
            is_verified: authInfo?.is_verified ?? false,
          };
        }),
      });
    }
    if (req.method === "POST") {
      const email = text(req.body?.email).toLowerCase();
      const fullName = text(req.body?.fullName || req.body?.full_name);
      const course = text(req.body?.course) || "BCA";
      const semester = Number(req.body?.semester) || 1;
      const bundleId = text(req.body?.bundleId || req.body?.bundle_id);
      const paymentId = text(req.body?.paymentId || req.body?.payment_id);
      const phone = text(req.body?.phone) || null;
      const password = text(req.body?.password);

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || fullName.length < 2 || !course || !Number.isInteger(semester) || semester < 1 || semester > 6) {
        return res.status(400).json({ error: "Valid email, name, course, and semester are required." });
      }

      const { data: existing } = await client.from("profiles").select("user_id").eq("email", email).maybeSingle();
      let userId = existing?.user_id;

      if (!userId) {
        if (password && password.length >= 6) {
          const { data: authData, error: createError } = await client.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: { full_name: fullName, course, semester },
            app_metadata: { role: "student" },
          });
          if (createError || !authData?.user) throw createError ?? new Error("Unable to create student account.");
          userId = authData.user.id;
        } else {
          const appBase = process.env.APP_URL || "https://bca-vault.portalbcavault.workers.dev";
          const { data, error } = await client.auth.admin.inviteUserByEmail(email, {
            data: { full_name: fullName },
            redirectTo: `${appBase.replace(/\/$/, "")}/auth/update-password`,
          });
          if (error || !data.user) throw error ?? new Error("Unable to create student account.");
          userId = data.user.id;
        }
        const { error: profileError } = await client.from("profiles").upsert(
          { user_id: userId, email, full_name: fullName, phone, course, semester, status: "active" },
          { onConflict: "user_id" }
        );
        if (profileError) throw profileError;
      } else {
        if (password && password.length >= 6) {
          await client.auth.admin.updateUserById(userId, {
            password,
            email_confirm: true,
            user_metadata: { full_name: fullName, course, semester },
          });
        }
        const { error } = await client.from("profiles").update({ full_name: fullName, phone, course, semester, status: "active" }).eq("user_id", userId);
        if (error) throw error;
      }

      if (bundleId) {
        const { error: accessError } = await client.from("access_permissions").upsert(
          { user_id: userId, bundle_id: bundleId, status: "active", granted_at: new Date().toISOString(), granted_by: caller.user.id },
          { onConflict: "user_id,bundle_id" }
        );
        if (accessError) throw accessError;
      }

      if (paymentId) await client.from("payment_submissions").update({ user_id: userId }).eq("id", paymentId);
      await client.from("activity_logs").insert({ actor_id: caller.user.id, action: "student_provisioned", target_type: "profile", target_id: userId, metadata: { email } });
      return res.status(201).json({ userId });
    }
    if (req.method !== "PATCH") return res.status(405).json({ error: "Method not allowed" });
    const userId = text(req.body?.userId);
    const status = req.body?.status;
    const bundleId = text(req.body?.bundleId);
    const accessStatus = req.body?.accessStatus;
    const verifyEmail = Boolean(req.body?.verifyEmail || req.body?.action === "verify_email");
    if (!userId) return res.status(400).json({ error: "Student id is required." });
    
    if (verifyEmail) {
      const { data: authUser, error: authErr } = await client.auth.admin.getUserById(userId);
      if (authErr || !authUser?.user) return res.status(404).json({ error: "Student auth account not found." });
      const { data: updateData, error: updateErr } = await client.auth.admin.updateUserById(userId, { email_confirm: true });
      if (updateErr) throw updateErr;
      await client.from("activity_logs").insert({
        actor_id: caller.user.id,
        action: "verify_student_email",
        target_type: "student",
        target_id: userId,
        metadata: { email: authUser.user.email },
      });
      return res.status(200).json({ success: true, message: "Student email verified successfully." });
    }

    if (status === "active" || status === "inactive") {
      const { error } = await client.from("profiles").update({ status }).eq("user_id", userId);
      if (error) throw error;
    }
    if (bundleId && (accessStatus === "active" || accessStatus === "revoked")) {
      const { error } = await client.from("access_permissions").upsert({ user_id: userId, bundle_id: bundleId, status: accessStatus, granted_by: caller.user.id, granted_at: new Date().toISOString() }, { onConflict: "user_id,bundle_id" });
      if (error) throw error;
    }
    return res.status(200).json({ success: true });
  } catch (error) { return res.status(500).json({ error: publicError(error) }); }
}
