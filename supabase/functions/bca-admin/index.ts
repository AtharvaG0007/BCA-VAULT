import { createClient } from "npm:@supabase/supabase-js@2";

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

Deno.serve(async (request) => {
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
      const phone = body.phone || null;
      const course = body.course || "BCA";
      const semester = Number(body.semester) || 1;
      // Accept optional password; generate strong random if not provided
      let password = body.password;
      if (!password) {
        // Generate a URL-safe base64 password of length ~12 characters
        const array = new Uint8Array(9);
        crypto.getRandomValues(array);
        password = Array.from(array, (b) => b.toString(36).padStart(2, "0")).join("");
      }
      if (!fullName || !email) {
        return respond({ success: false, error: "Name and email are required." }, 400, corsHeaders);
      }
      // Create Auth user with password (service role)
      const { data, error } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        phone,
        user_metadata: { full_name: fullName, course, semester },
        app_metadata: { role: 'student' },
      });
      if (error || !data.user) return respond({ success: false, error: error?.message ?? "Unable to create student account." }, 500, corsHeaders);
      const { error: profileError } = await admin.from("profiles").insert({
        user_id: data.user.id,
        email,
        full_name: fullName,
        phone: phone || null,
        course: course || null,
        semester: semester || null,
        status: "active",
      });
      if (profileError) return respond({ success: false, error: profileError.message }, 500, corsHeaders);
      await log(access.user.id, "student_created", "profile", data.user.id, { email, temporary_password: password });
      // Return the temporary password for UI display (do NOT store)
      return respond({ success: true, student: { user_id: data.user.id, email, temporary_password: password } }, 201, corsHeaders);
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
      if (!id || !["approved", "rejected"].includes(status)) return respond({ success: false, error: "A payment ID and review status are required." }, 400, corsHeaders);
      const { data, error } = await admin.rpc("review_payment_submission", { p_payment_id: id, p_status: status, p_admin_notes: String(note), p_verified_by: access.user.id });
      if (error) return respond({ success: false, error: error.message }, 400, corsHeaders);
      return respond({ success: true, payment: data }, 200, corsHeaders);
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
