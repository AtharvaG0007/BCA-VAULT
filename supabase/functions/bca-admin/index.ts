import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient, type User } from "npm:@supabase/supabase-js@2";

const ALLOWED_ORIGINS = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:3000",
  "http://localhost:4173",
  "https://bca-vault.portalbcavault.workers.dev",
  "https://bca-vault-bay.vercel.app",
  "https://bca-vault-atharv-0700s-projects.vercel.app",
  "https://bcavault.in",
  "https://www.bcavault.in",
];

function getCorsHeaders(req: Request) {
  const origin = req.headers.get("Origin") || "";
  const isAllowed =
    ALLOWED_ORIGINS.includes(origin) ||
    origin.endsWith(".workers.dev") ||
    origin.endsWith(".vercel.app") ||
    origin.endsWith(".figma.site") ||
    /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
  const allowOrigin = isAllowed ? origin : (origin || ALLOWED_ORIGINS[0]);

  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type, x-requested-with",
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS, PUT, DELETE, PATCH",
    "Access-Control-Max-Age": "86400",
  };
}

const url = Deno.env.get("SUPABASE_URL") ?? "";
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });

function respond(body: unknown, status = 200, corsHeaders: Record<string, string>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

async function requireSuperadmin(request: Request, corsHeaders: Record<string, string>) {
  const token = request.headers.get("Authorization")?.replace("Bearer ", "");
  if (!token) return { error: respond({ success: false, error: "Authentication required." }, 401, corsHeaders) };
  const { data: { user }, error } = await admin.auth.getUser(token);
  if (error || !user) return { error: respond({ success: false, error: "Authentication required or expired." }, 401, corsHeaders) };
  const { data: profile } = await admin.from("admin_profiles").select("user_id").eq("user_id", user.id).eq("role", "superadmin").eq("status", "active").maybeSingle();
  if (!profile) return { error: respond({ success: false, error: "Super Admin access required." }, 403, corsHeaders) };
  return { user };
}

async function log(actorId: string, action: string, targetType?: string, targetId?: string, metadata: Record<string, unknown> = {}) {
  await admin.from("activity_logs").insert({ actor_id: actorId, action, target_type: targetType ?? null, target_id: targetId ?? null, metadata });
}

Deno.serve(async (request: Request) => {
  const corsHeaders = getCorsHeaders(request);

  if (request.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: corsHeaders });
  }

  const access = await requireSuperadmin(request, corsHeaders);
  if (access.error) return access.error;
  const rawPath = new URL(request.url).pathname;
  const pathname = rawPath
    .replace(/^\/functions\/v1\/bca-admin/, "")
    .replace(/^\/bca-admin/, "") || "/";

  try {
    if (request.method === "POST" && pathname === "/students") {
      const body = await request.json().catch(() => ({}));
      const fullName = String(body.full_name ?? "").trim();
      const email = String(body.email ?? "").trim().toLowerCase();
      const phone = body.phone ? String(body.phone).trim() : null;
      const course = body.course || "BCA";
      const semester = Number(body.semester) || 1;

      // Accept password or generate strong 16-char temporary password
      let password = body.password ? String(body.password).trim() : "";
      if (!password) {
        const charset = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%&*";
        const array = new Uint8Array(16);
        crypto.getRandomValues(array);
        password = Array.from(array, (b) => charset[b % charset.length]).join("");
      }

      if (!fullName || !email) {
        return respond({ success: false, error: "Name and email are required." }, 400, corsHeaders);
      }
      if (password.length < 6) {
        return respond({ success: false, error: "Password must be at least 6 characters." }, 400, corsHeaders);
      }

      // Check if profile already exists
      const { data: existingProfile } = await admin
        .from("profiles")
        .select("user_id")
        .eq("email", email)
        .maybeSingle();

      let userId: string;

      // 1. Create Auth user with password and confirmed email (service role)
      const { data: createData, error: createError } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: fullName, course, semester },
        app_metadata: { role: "student" },
      });

      if (createError) {
        const isExisting =
          createError.message?.toLowerCase().includes("already") ||
          createError.message?.toLowerCase().includes("exists") ||
          Boolean(existingProfile?.user_id);

        if (isExisting) {
          let targetUserId = existingProfile?.user_id;
          if (!targetUserId) {
            const { data: userList } = await admin.auth.admin.listUsers({ perPage: 1000 });
            const foundUser = userList?.users?.find(
              (u: User) => u.email?.toLowerCase() === email
            );
            targetUserId = foundUser?.id;
          }

          if (targetUserId) {
            const { error: updateError } = await admin.auth.admin.updateUserById(targetUserId, {
              password,
              email_confirm: true,
              user_metadata: { full_name: fullName, course, semester },
              app_metadata: { role: "student" },
            });
            if (updateError) {
              return respond(
                { success: false, error: `Failed to update existing student: ${updateError.message}` },
                400,
                corsHeaders
              );
            }
            userId = targetUserId;
          } else {
            return respond(
              { success: false, error: "A user with this email address already exists." },
              409,
              corsHeaders
            );
          }
        } else {
          return respond(
            { success: false, error: createError.message || "Unable to create student account." },
            400,
            corsHeaders
          );
        }
      } else {
        if (!createData?.user) {
          return respond({ success: false, error: "Auth user creation failed." }, 500, corsHeaders);
        }
        userId = createData.user.id;
      }

      // 2. Insert or update profile row linked to Auth user UUID
      const { error: profileError } = await admin.from("profiles").upsert({
        user_id: userId,
        email,
        full_name: fullName,
        phone: phone || null,
        course: course || null,
        semester: semester || null,
        status: "active",
      }, { onConflict: "user_id" });

      if (profileError) {
        return respond({ success: false, error: profileError.message }, 500, corsHeaders);
      }

      // 3. Log event (never store plaintext password in database)
      await log(access.user.id, "student_created", "profile", userId, { email });

      // 4. Return the temporary password for one-time UI display to admin
      return respond(
        {
          success: true,
          student: {
            user_id: userId,
            email,
            temporary_password: password,
          },
        },
        201,
        corsHeaders
      );
    }

    if (request.method === "POST" && pathname === "/students/list") {
      const { search = "" } = await request.json().catch(() => ({}));
      let q = admin
        .from("profiles")
        .select("user_id,full_name,email,phone,course,semester,status,created_at,updated_at", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(0, 99);

      if (search) {
        q = q.or(`full_name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`);
      }

      const { data: students, error: studentsErr, count } = await q;
      if (studentsErr) {
        return respond({ success: false, error: studentsErr.message }, 400, corsHeaders);
      }

      if (!students || students.length === 0) {
        return respond({ success: true, data: [], count: 0 }, 200, corsHeaders);
      }

      const userIds = students.map((s) => s.user_id);
      const [accessRes, paymentsRes, authUsersRes] = await Promise.all([
        admin
          .from("access_permissions")
          .select("user_id,bundle_id,status,bundles(title)")
          .in("user_id", userIds)
          .eq("status", "active"),
        admin
          .from("payment_submissions")
          .select("user_id,status,created_at")
          .in("user_id", userIds)
          .order("created_at", { ascending: false }),
        admin.auth.admin.listUsers({ perPage: 1000 }),
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

      const authUserMap = new Map<string, { email_confirmed_at?: string | null; confirmed_at?: string | null; last_sign_in_at?: string | null }>();
      (authUsersRes.data?.users || []).forEach((u: User) => {
        authUserMap.set(u.id, {
          email_confirmed_at: u.email_confirmed_at || null,
          confirmed_at: (u as any).confirmed_at || null,
          last_sign_in_at: u.last_sign_in_at || null,
        });
      });

      const enriched = students.map((s) => {
        const authInfo = authUserMap.get(s.user_id);
        const emailConfirmed = Boolean(authInfo?.email_confirmed_at || authInfo?.confirmed_at);
        return {
          ...s,
          assigned_bundles: accessByUserId.get(s.user_id) || [],
          payment_status: paymentByUserId.get(s.user_id) || "unpaid",
          email_confirmed_at: authInfo?.email_confirmed_at || authInfo?.confirmed_at || null,
          last_sign_in_at: authInfo?.last_sign_in_at || null,
          is_verified: emailConfirmed,
        };
      });

      return respond({ success: true, data: enriched, count }, 200, corsHeaders);
    }

    if (request.method === "POST" && pathname === "/students/verify-email") {
      const { userId } = await request.json().catch(() => ({}));
      const cleanUserId = String(userId || "").trim();
      if (!cleanUserId) {
        return respond({ success: false, error: "Valid student user ID is required." }, 400, corsHeaders);
      }

      // 1. Check if auth user exists
      const { data: userData, error: getUserError } = await admin.auth.admin.getUserById(cleanUserId);
      if (getUserError || !userData?.user) {
        return respond({ success: false, error: "Student auth account not found." }, 404, corsHeaders);
      }

      // 2. Confirm email without touching password or metadata
      const { data: updateData, error: updateError } = await admin.auth.admin.updateUserById(cleanUserId, {
        email_confirm: true,
      });

      if (updateError || !updateData?.user) {
        return respond({ success: false, error: updateError?.message || "Failed to verify student email." }, 400, corsHeaders);
      }

      // 3. Log verification action
      await log(access.user.id, "verify_student_email", "student", cleanUserId, {
        email: userData.user.email,
      });

      return respond({
        success: true,
        message: "Student email verified successfully.",
        user_id: cleanUserId,
        email_confirmed_at: updateData.user.email_confirmed_at || (updateData.user as any).confirmed_at,
      }, 200, corsHeaders);
    }

    if (request.method === "POST" && pathname === "/students/reset-password") {
      const { email } = await request.json().catch(() => ({}));
      const { error } = await admin.auth.resetPasswordForEmail(String(email), { redirectTo: `${request.headers.get("Origin") ?? ""}/auth/update-password` });
      if (error) return respond({ success: false, error: error.message }, 400, corsHeaders);
      await log(access.user.id, "password_reset_sent", "profile", undefined, { email });
      return respond({ success: true, ok: true }, 200, corsHeaders);
    }

    if (request.method === "POST" && pathname === "/payments/signed-url") {
      const { bucket, path } = await request.json().catch(() => ({}));
      if (bucket !== "bca-payment-evidence" || !path) return respond({ success: false, error: "Invalid payment evidence path." }, 400, corsHeaders);
      const { data, error } = await admin.storage.from(bucket).createSignedUrl(path, 300);
      if (error) return respond({ success: false, error: error.message }, 400, corsHeaders);
      return respond({ success: true, url: data.signedUrl, expires_in: 300 }, 200, corsHeaders);
    }

    if (request.method === "POST" && pathname === "/payments/review") {
      const { id, status, note = "" } = await request.json().catch(() => ({}));
      if (!id || !["approved", "rejected"].includes(status)) {
        return respond({ success: false, error: "A payment ID and review status are required." }, 400, corsHeaders);
      }

      // Try calling stored procedure first
      const rpcResult = await admin.rpc("review_payment_submission", {
        p_payment_id: id,
        p_status: status,
        p_admin_notes: String(note),
        p_verified_by: access.user.id,
      });

      if (!rpcResult.error) {
        return respond({ success: true, payment: rpcResult.data }, 200, corsHeaders);
      }

      // Direct fallback if RPC is not yet loaded in cache
      const { data: payment, error: fetchErr } = await admin
        .from("payment_submissions")
        .select("*")
        .eq("id", id)
        .single();

      if (fetchErr || !payment) {
        return respond({ success: false, error: "Payment submission not found." }, 404, corsHeaders);
      }

      const { error: updateErr } = await admin
        .from("payment_submissions")
        .update({
          status,
          verified_by: access.user.id,
          verified_at: new Date().toISOString(),
          admin_notes: note ? String(note).trim() : null,
        })
        .eq("id", id);

      if (updateErr) return respond({ success: false, error: updateErr.message }, 400, corsHeaders);

      if (status === "approved" && payment.user_id) {
        // Activate profile
        await admin.from("profiles").update({ status: "active", updated_at: new Date().toISOString() }).eq("user_id", payment.user_id);

        // Grant access permission
        if (payment.bundle_id) {
          await admin.from("access_permissions").upsert({
            user_id: payment.user_id,
            bundle_id: payment.bundle_id,
            status: "active",
            granted_by: access.user.id,
            granted_at: new Date().toISOString(),
            expires_at: null,
          }, { onConflict: "user_id,bundle_id" });

          // Also check for semester combo bundle granting
          const { data: bundle } = await admin.from("bundles").select("title").eq("id", payment.bundle_id).maybeSingle();
          if (bundle && (bundle.title.toLowerCase().includes("complete") || bundle.title.toLowerCase().includes("both"))) {
            const { data: semBundles } = await admin.from("bundles").select("id").eq("published", true);
            for (const sb of semBundles || []) {
              await admin.from("access_permissions").upsert({
                user_id: payment.user_id,
                bundle_id: sb.id,
                status: "active",
                granted_by: access.user.id,
                granted_at: new Date().toISOString(),
                expires_at: null,
              }, { onConflict: "user_id,bundle_id" });
            }
          }
        }
      }

      await log(access.user.id, `payment_${status}`, "payment", id, { bundle_id: payment.bundle_id });

      return respond({ success: true, payment: { id, status, bundle_id: payment.bundle_id } }, 200, corsHeaders);
    }

    if (request.method === "POST" && pathname === "/notes/upload-url") {
      const { fileName, contentType, semester = 1 } = await request.json().catch(() => ({}));
      if (contentType !== "application/pdf") return respond({ success: false, error: "Only PDF files are allowed." }, 400, corsHeaders);
      
      const rawName = String(fileName ?? "note.pdf").trim();
      // Clean name preserving dot and basic safe chars
      const safeName = rawName.replace(/[^a-zA-Z0-9._\-\s]/g, "").replace(/\s+/g, "_");
      const semNum = Number(semester) === 2 ? 2 : 1;
      const path = `BCA SEM${semNum}/${safeName}`;

      // Try primary "Bca_notes" bucket with fallback to "bca-notes"
      let bucket = "Bca_notes";
      let uploadResult = await admin.storage.from(bucket).createSignedUploadUrl(path);

      if (uploadResult.error) {
        // Try fallback bucket name
        bucket = "bca-notes";
        uploadResult = await admin.storage.from(bucket).createSignedUploadUrl(path);
      }

      if (uploadResult.error || !uploadResult.data) {
        console.error("Storage signed upload error:", uploadResult.error);
        return respond({ success: false, error: uploadResult.error?.message || "Failed to create upload authorization." }, 400, corsHeaders);
      }

      return respond({
        success: true,
        bucket,
        path,
        token: uploadResult.data.token,
        signed_url: uploadResult.data.signedUrl
      }, 200, corsHeaders);
    }

    if (request.method === "POST" && pathname === "/notes/delete") {
      const { id } = await request.json().catch(() => ({}));
      const { data: note, error: lookupError } = await admin.from("notes").select("id,storage_bucket,storage_path").eq("id", id).single();
      if (lookupError || !note) return respond({ success: false, error: "Note not found." }, 404, corsHeaders);
      
      const bucket = note.storage_bucket || "Bca_notes";
      // Remove from storage
      await admin.storage.from(bucket).remove([note.storage_path]);
      
      const { error: deleteError } = await admin.from("notes").delete().eq("id", id);
      if (deleteError) return respond({ success: false, error: deleteError.message }, 400, corsHeaders);
      
      await log(access.user.id, "note_deleted", "note", id);
      return respond({ success: true, ok: true }, 200, corsHeaders);
    }

    return respond({ success: false, error: "Route not found." }, 404, corsHeaders);
  } catch (error: any) {
    console.error(error);
    return respond({ success: false, error: error.message || "Unexpected server error." }, 500, corsHeaders);
  }
});
