import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient, type User } from "npm:@supabase/supabase-js@2";

const ALLOWED_ORIGINS = [
  "https://bca-vault.portalbcavault.workers.dev",
  "https://bcavault.in",
  "https://www.bcavault.in",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:3000",
  "http://localhost:4173",
];

function getCorsHeaders(req: Request) {
  const origin = req.headers.get("Origin") || "";
  const isAllowed =
    ALLOWED_ORIGINS.includes(origin) ||
    origin.endsWith(".workers.dev") ||
    origin.endsWith(".figma.site") ||
    /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
  const allowOrigin = isAllowed ? origin : (origin || "https://bca-vault.portalbcavault.workers.dev");

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

async function triggerEmailDispatcher(outboxId?: string, paymentId?: string) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) return;

  try {
    const url = `${supabaseUrl}/functions/v1/email-dispatcher`;
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${serviceRoleKey}`,
    };
    const dispatcherSecret = Deno.env.get("DISPATCHER_SECRET") || Deno.env.get("CRON_SECRET");
    if (dispatcherSecret) {
      headers["x-dispatcher-secret"] = dispatcherSecret;
    }

    const body: Record<string, string> = {};
    if (outboxId) body.outbox_id = outboxId;
    if (paymentId) body.payment_id = paymentId;

    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.warn("[bca-admin] email-dispatcher async trigger returned HTTP", res.status, d?.error || d);
    } else {
      console.log("[bca-admin] email-dispatcher invoked successfully for payment:", paymentId || outboxId || "sweep");
    }
  } catch (err: any) {
    // Failure isolation: log sanitized notice, never throw
    console.warn("[bca-admin] email-dispatcher background invocation notice:", err?.message || err);
  }
}

function renderPaymentApprovedHtml(
  studentName: string,
  course: string,
  bundleTitle: string,
  amountText: string
): string {
  const escapeHtml = (s: string) =>
    s.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");

  const safeName = escapeHtml(studentName || "Student");
  const safeCourse = escapeHtml(course || "BCA");
  const safeBundle = escapeHtml(bundleTitle || "BCA Vault Bundle");
  const safeAmount = escapeHtml(amountText || "₹499");

  return `<div style="font-family: Arial, sans-serif; color: #333333; line-height: 1.6; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
  <h2 style="color: #2e7d32; margin-top: 0;">Payment Approved</h2>

  <p>Dear ${safeName},</p>

  <p>We are pleased to inform you that your payment has been successfully approved.</p>

  <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
    <p style="margin: 5px 0;"><strong>Course:</strong> ${safeCourse}</p>
    <p style="margin: 5px 0;"><strong>Bundle:</strong> ${safeBundle}</p>
    <p style="margin: 5px 0;"><strong>Amount:</strong> ${safeAmount}</p>
    <p style="margin: 5px 0;">
      <strong>Status:</strong>
      <span style="color: #2e7d32; font-weight: bold;">Approved</span>
    </p>
  </div>

  <p>Thank you for choosing BCA Vault for your studies.</p>

  <p style="margin-bottom: 0;">
    Warm regards,<br>
    <strong>BCA Vault Team</strong>
  </p>
</div>`;
}

async function ensurePaymentApprovedOutboxEntry(paymentId: string, verifiedByUserId: string) {
  try {
    const eventKey = `payment-approved:${paymentId}`;
    const { data: existing } = await admin
      .from("email_outbox")
      .select("id, status")
      .eq("event_key", eventKey)
      .maybeSingle();

    if (existing?.status === "sent") {
      return existing;
    }

    const { data: payment } = await admin
      .from("payment_submissions")
      .select("id, status, amount, reference_id, utr, bundle_id, user_id, email, full_name, course, semester, bundles(title)")
      .eq("id", paymentId)
      .maybeSingle();

    if (!payment || payment.status !== "approved") return null;

    let targetUserId = payment.user_id;
    let studentProf: any = null;
    if (targetUserId) {
      const { data: p } = await admin
        .from("profiles")
        .select("user_id, full_name, email, course")
        .eq("user_id", targetUserId)
        .maybeSingle();
      studentProf = p;
    } else if (payment.email) {
      const { data: p } = await admin
        .from("profiles")
        .select("user_id, full_name, email, course")
        .ilike("email", payment.email)
        .maybeSingle();
      studentProf = p;
      if (p?.user_id) targetUserId = p.user_id;
    }

    const studentName = studentProf?.full_name?.trim() || payment.full_name?.trim() || "Student";
    const studentEmail = studentProf?.email?.trim() || payment.email?.trim();
    if (!studentEmail) return null;

    const course = payment.course?.trim() || studentProf?.course?.trim() || "BCA";
    const paymentRef = payment.reference_id || payment.utr || payment.id;
    const rawAmount = payment.amount != null ? String(payment.amount).trim() : "";
    const amountText = !rawAmount ? "₹0" : (rawAmount.startsWith("₹") ? rawAmount : `₹${rawAmount}`);
    const paymentAny = payment as any;
    const bundleTitle = (Array.isArray(paymentAny?.bundles) ? paymentAny.bundles[0]?.title : paymentAny?.bundles?.title) || "BCA Vault Bundle";

    const payload = {
      payment_id: payment.id,
      user_id: targetUserId,
      bundle_id: payment.bundle_id,
      course,
      semester: payment.semester,
      student_name: studentName,
      student_email: studentEmail,
      payment_reference: paymentRef,
      amount_paid: amountText,
      bundle_name: bundleTitle,
      approved_at: new Date().toISOString(),
      verified_by: verifiedByUserId,
      access_granted: true,
    };

    const fixedTextBody = `Dear ${studentName},\n\nWe are pleased to inform you that your payment has been successfully approved.\n\nPayment Details\n\n• Course: ${course}\n• Bundle: ${bundleTitle}\n• Amount: ${amountText}\n• Status: Approved\n\nThank you for choosing BCA Vault for your studies.\n\nWarm regards,\n\nBCA Vault Team`;

    const fixedHtmlBody = renderPaymentApprovedHtml(studentName, course, bundleTitle, amountText);

    if (!existing) {
      const { data: inserted } = await admin
        .from("email_outbox")
        .insert({
          event_key: eventKey,
          event_type: "payment_approved",
          recipient_user_id: targetUserId,
          recipient_email: studentEmail,
          sender_name: "BCA Vault",
          sender_email: "bcavault07@gmail.com",
          status: "pending",
          subject: "BCA Vault — Payment Approved & Access Activated",
          text_body: fixedTextBody,
          html_body: fixedHtmlBody,
          payload,
          approved_at: new Date().toISOString(),
          approved_by: verifiedByUserId,
        })
        .select("*")
        .maybeSingle();
      return inserted;
    } else {
      const { data: updated } = await admin
        .from("email_outbox")
        .update({
          recipient_user_id: targetUserId,
          recipient_email: studentEmail,
          subject: "BCA Vault — Payment Approved & Access Activated",
          text_body: fixedTextBody,
          html_body: fixedHtmlBody,
          payload,
        })
        .eq("id", existing.id)
        .select("*")
        .maybeSingle();
      return updated;
    }
  } catch (err) {
    console.warn("[bca-admin] ensurePaymentApprovedOutboxEntry notice:", err);
    return null;
  }
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
      const origin = request.headers.get("Origin") || "https://bca-vault.portalbcavault.workers.dev";
      const redirectUrl = `${origin.replace(/\/$/, "")}/auth/update-password`;
      const { error } = await admin.auth.resetPasswordForEmail(String(email), { redirectTo: redirectUrl });
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
        if (status === "approved") {
          const targetPaymentId = id;
          // Ensure deterministic default email draft exists in email_outbox
          await ensurePaymentApprovedOutboxEntry(targetPaymentId, access.user.id);

          const trigger = async () => {
            await triggerEmailDispatcher(undefined, targetPaymentId);
          };
          if (typeof EdgeRuntime !== "undefined" && typeof EdgeRuntime.waitUntil === "function") {
            EdgeRuntime.waitUntil(trigger());
          } else {
            trigger().catch((err) => console.warn("[bca-admin] Dispatcher trigger notice:", err));
          }
        }
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

      // If user_id is null, attempt to link with profile by email
      let targetUserId = payment.user_id;
      if (!targetUserId) {
        const { data: matchedProfile } = await admin
          .from("profiles")
          .select("user_id")
          .ilike("email", payment.email)
          .maybeSingle();
        if (matchedProfile?.user_id) {
          targetUserId = matchedProfile.user_id;
        }
      }

      const { error: updateErr } = await admin
        .from("payment_submissions")
        .update({
          status,
          user_id: targetUserId,
          verified_by: access.user.id,
          verified_at: new Date().toISOString(),
          admin_notes: note ? String(note).trim() : null,
        })
        .eq("id", id);

      if (updateErr) return respond({ success: false, error: updateErr.message }, 400, corsHeaders);

      if (status === "approved" && targetUserId) {
        // Activate profile
        await admin.from("profiles").update({ status: "active", updated_at: new Date().toISOString() }).eq("user_id", targetUserId);

        let bundleTitle = "BCA Vault Bundle";
        // Grant access permission
        if (payment.bundle_id) {
          await admin.from("access_permissions").upsert({
            user_id: targetUserId,
            bundle_id: payment.bundle_id,
            status: "active",
            granted_by: access.user.id,
            granted_at: new Date().toISOString(),
            expires_at: null,
          }, { onConflict: "user_id,bundle_id" });

          // Also check for semester combo bundle granting
          const { data: bundle } = await admin.from("bundles").select("title").eq("id", payment.bundle_id).maybeSingle();
          if (bundle?.title) bundleTitle = bundle.title;
          if (bundle && (bundle.title.toLowerCase().includes("complete") || bundle.title.toLowerCase().includes("both"))) {
            const { data: semBundles } = await admin.from("bundles").select("id").eq("published", true);
            for (const sb of semBundles || []) {
              await admin.from("access_permissions").upsert({
                user_id: targetUserId,
                bundle_id: sb.id,
                status: "active",
                granted_by: access.user.id,
                granted_at: new Date().toISOString(),
                expires_at: null,
              }, { onConflict: "user_id,bundle_id" });
            }
          }
        }

        // Trigger referral qualification for qualifying Semester 1 payment
        const isSem1 = payment.semester === 1 ||
          payment.bundle_id === "5b36f72a-165c-4cd1-8458-d4f33fadd860";
        if (isSem1) {
          try {
            await admin.rpc("qualify_referral_on_payment_approval", {
              p_referred_user_id: targetUserId,
            });
          } catch (refErr) {
            console.warn("[bca-admin] Referral qualification notice:", refErr);
          }
        }

        // Automatically populate payment_approved email draft into email_outbox
        await ensurePaymentApprovedOutboxEntry(payment.id, access.user.id);

        // Asynchronously trigger dispatcher in the background
        const targetPaymentId = payment.id;
        const trigger = async () => {
          await triggerEmailDispatcher(undefined, targetPaymentId);
        };
        if (typeof EdgeRuntime !== "undefined" && typeof EdgeRuntime.waitUntil === "function") {
          EdgeRuntime.waitUntil(trigger());
        } else {
          trigger().catch((err) => console.warn("[bca-admin] Fallback dispatcher trigger notice:", err));
        }
      }

      await log(access.user.id, `payment_${status}`, "payment", id, { bundle_id: payment.bundle_id, student_user_id: targetUserId });

      return respond({ success: true, payment: { id, status, bundle_id: payment.bundle_id, user_id: targetUserId } }, 200, corsHeaders);
    }

    if (request.method === "POST" && pathname === "/emails/sweep") {
      const trigger = async () => {
        await triggerEmailDispatcher();
      };
      if (typeof EdgeRuntime !== "undefined" && typeof EdgeRuntime.waitUntil === "function") {
        EdgeRuntime.waitUntil(trigger());
      } else {
        trigger().catch((err) => console.warn("[bca-admin] Sweep trigger notice:", err));
      }
      return respond({ success: true, message: "Background email sweep initiated." }, 200, corsHeaders);
    }

    if (request.method === "POST" && pathname === "/access/grant") {
      const { userId, bundleId, expiresAt = null } = await request.json().catch(() => ({}));
      const cleanUserId = String(userId || "").trim();
      const cleanBundleId = String(bundleId || "").trim();

      if (!cleanUserId || !cleanBundleId) {
        return respond({ success: false, error: "Student user ID and bundle ID are required." }, 400, corsHeaders);
      }

      // 1. Verify bundle exists
      const { data: bundle, error: bErr } = await admin
        .from("bundles")
        .select("id,title")
        .eq("id", cleanBundleId)
        .maybeSingle();

      if (bErr || !bundle) {
        return respond({ success: false, error: "Bundle not found." }, 404, corsHeaders);
      }

      // 2. Upsert active access permission
      const { error: grantErr } = await admin
        .from("access_permissions")
        .upsert(
          {
            user_id: cleanUserId,
            bundle_id: cleanBundleId,
            status: "active",
            granted_by: access.user.id,
            granted_at: new Date().toISOString(),
            expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
          },
          { onConflict: "user_id,bundle_id" }
        );

      if (grantErr) {
        return respond({ success: false, error: grantErr.message }, 500, corsHeaders);
      }

      // 3. Ensure profile is activated
      await admin.from("profiles").update({ status: "active", updated_at: new Date().toISOString() }).eq("user_id", cleanUserId);

      // 4. Audit log
      await log(access.user.id, "bundle_granted", "access_permission", cleanUserId, {
        bundle_id: cleanBundleId,
        bundle_title: bundle.title,
      });

      return respond(
        {
          success: true,
          message: `Access to "${bundle.title}" granted successfully.`,
          user_id: cleanUserId,
          bundle_id: cleanBundleId,
        },
        200,
        corsHeaders
      );
    }

    if (request.method === "POST" && pathname === "/access/revoke") {
      const { userId, bundleId } = await request.json().catch(() => ({}));
      const cleanUserId = String(userId || "").trim();
      const cleanBundleId = String(bundleId || "").trim();

      if (!cleanUserId || !cleanBundleId) {
        return respond({ success: false, error: "Student user ID and bundle ID are required." }, 400, corsHeaders);
      }

      const { error: revokeErr } = await admin
        .from("access_permissions")
        .update({ status: "revoked" })
        .eq("user_id", cleanUserId)
        .eq("bundle_id", cleanBundleId);

      if (revokeErr) {
        return respond({ success: false, error: revokeErr.message }, 500, corsHeaders);
      }

      await log(access.user.id, "bundle_revoked", "access_permission", cleanUserId, {
        bundle_id: cleanBundleId,
      });

      return respond({ success: true, message: "Access revoked successfully." }, 200, corsHeaders);
    }

    if (request.method === "POST" && (pathname === "/referrals" || pathname === "/referrals/list")) {
      // 1. Query referrals with referrer and referred profile information
      const { data: rawReferrals, error: refsErr } = await admin
        .from("referrals")
        .select(`
          id,
          referrer_user_id,
          referred_user_id,
          referral_code_id,
          referral_identifier,
          status,
          created_at,
          successful_at
        `)
        .order("created_at", { ascending: false })
        .limit(200);

      if (refsErr) {
        return respond({ success: false, error: refsErr.message }, 500, corsHeaders);
      }

      // Collect user IDs and code IDs for enrichment
      const userIds = new Set<string>();
      const codeIds = new Set<string>();
      for (const r of rawReferrals || []) {
        if (r.referrer_user_id) userIds.add(r.referrer_user_id);
        if (r.referred_user_id) userIds.add(r.referred_user_id);
        if (r.referral_code_id) codeIds.add(r.referral_code_id);
      }

      const [profilesRes, codesRes, rewardsRes] = await Promise.all([
        userIds.size > 0
          ? admin.from("profiles").select("user_id, full_name, email").in("user_id", Array.from(userIds))
          : Promise.resolve({ data: [] }),
        codeIds.size > 0
          ? admin.from("referral_codes").select("id, code").in("id", Array.from(codeIds))
          : Promise.resolve({ data: [] }),
        admin
          .from("referral_rewards")
          .select("id, referral_id, user_id, reward_type, status, unlocked_at, claimed_at")
          .order("unlocked_at", { ascending: false })
          .limit(200),
      ]);

      const profileMap = new Map<string, { full_name: string; email: string }>();
      (profilesRes.data || []).forEach((p: any) => {
        profileMap.set(p.user_id, { full_name: p.full_name || "Student", email: p.email });
      });

      const codeMap = new Map<string, string>();
      (codesRes.data || []).forEach((c: any) => {
        codeMap.set(c.id, c.code);
      });

      const rewardsList = (rewardsRes.data || []).map((rw: any) => {
        const u = profileMap.get(rw.user_id);
        return {
          id: rw.id,
          referral_id: rw.referral_id,
          user_id: rw.user_id,
          student_name: u?.full_name || "Student",
          student_email: u?.email || "—",
          reward_type: rw.reward_type === "most_repeated_questions" ? "Most Repeated Questions" : rw.reward_type,
          status: rw.status,
          unlocked_at: rw.unlocked_at,
          claimed_at: rw.claimed_at,
        };
      });

      const rewardByReferralId = new Map<string, any>();
      const unlockedUserIds = new Set<string>();
      rewardsList.forEach((rw: any) => {
        if (rw.referral_id) rewardByReferralId.set(rw.referral_id, rw);
        if (rw.status === "unlocked") unlockedUserIds.add(rw.user_id);
      });

      // Count successful referrals per referrer to evaluate the 3-referral threshold
      const successfulCountByReferrer = new Map<string, number>();
      (rawReferrals || []).forEach((r: any) => {
        if (r.status === "successful" && r.referrer_user_id) {
          successfulCountByReferrer.set(
            r.referrer_user_id,
            (successfulCountByReferrer.get(r.referrer_user_id) || 0) + 1
          );
        }
      });

      const referralsList = (rawReferrals || []).map((r: any) => {
        const referrer = profileMap.get(r.referrer_user_id);
        const referred = profileMap.get(r.referred_user_id);
        const code = r.referral_identifier || codeMap.get(r.referral_code_id) || (referrer?.full_name ? `${referrer.full_name} DMS` : "—");
        const rw = rewardByReferralId.get(r.id);
        const referrerSuccessfulCount = successfulCountByReferrer.get(r.referrer_user_id) || 0;
        const isQualified = referrerSuccessfulCount >= 3;

        return {
          id: r.id,
          referral_code: code,
          referrer_user_id: r.referrer_user_id,
          referrer_name: referrer?.full_name || "Student",
          referrer_email: referrer?.email || "—",
          referred_user_id: r.referred_user_id,
          referred_name: referred?.full_name || "Student",
          referred_email: referred?.email || "—",
          status: r.status,
          created_at: r.created_at,
          successful_at: r.successful_at,
          reward_status: (rw?.status === "unlocked" || isQualified) && referrerSuccessfulCount >= 3 ? "unlocked" : "locked",
          reward_type: rw?.reward_type || "Most Repeated Questions",
        };
      });

      const totalReferrals = referralsList.length;
      const pendingReferrals = referralsList.filter((x: any) => x.status === "pending").length;
      const successfulReferrals = referralsList.filter((x: any) => x.status === "successful").length;
      const rewardsUnlocked = Array.from(unlockedUserIds).filter((uid) => (successfulCountByReferrer.get(uid) || 0) >= 3).length;

      return respond(
        {
          success: true,
          metrics: {
            total_referrals: totalReferrals,
            pending_referrals: pendingReferrals,
            successful_referrals: successfulReferrals,
            rewards_unlocked: rewardsUnlocked,
          },
          referrals: referralsList,
          rewards: rewardsList,
        },
        200,
        corsHeaders
      );
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
