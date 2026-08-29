import { createClient } from "npm:@supabase/supabase-js@2";

const ALLOWED_ORIGINS = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:3000",
  "http://localhost:4173",
  "https://bcavault.in",
  "https://www.bcavault.in",
];

function getCorsHeaders(req: Request) {
  const origin = req.headers.get("Origin") || "";
  const isAllowed = ALLOWED_ORIGINS.includes(origin) || origin.endsWith(".vercel.app") || origin.endsWith(".figma.site");
  const allowOrigin = isAllowed ? origin : (origin || "*");

  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
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
  const pathname = new URL(request.url).pathname.replace(/^\/bca-admin/, "");

  try {
    if (request.method === "POST" && pathname === "/students") {
      const body = await request.json().catch(() => ({}));
      const fullName = String(body.full_name ?? "").trim();
      const email = String(body.email ?? "").trim().toLowerCase();
      const semester = Number(body.semester);
      if (!fullName || !email || !Number.isInteger(semester) || semester < 1 || semester > 6) {
        return respond({ success: false, error: "Name, email, and a semester from 1 to 6 are required." }, 400, corsHeaders);
      }
      const { data, error } = await admin.auth.admin.inviteUserByEmail(email, { data: { full_name: fullName } });
      if (error || !data.user) return respond({ success: false, error: error?.message ?? "Unable to invite the student." }, 400, corsHeaders);
      const { error: profileError } = await admin.from("profiles").insert({ user_id: data.user.id, email, full_name: fullName, phone: body.phone || null, course: body.course || "BCA", semester, status: "active" });
      if (profileError) return respond({ success: false, error: profileError.message }, 400, corsHeaders);
      await log(access.user.id, "student_created", "profile", data.user.id, { email });
      return respond({ success: true, student: { user_id: data.user.id, email, full_name: fullName } }, 201, corsHeaders);
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
      const { fileName, contentType } = await request.json().catch(() => ({}));
      if (contentType !== "application/pdf") return respond({ success: false, error: "Only PDF files are allowed." }, 400, corsHeaders);
      const safeName = String(fileName ?? "note.pdf").replace(/[^a-zA-Z0-9._-]/g, "-");
      const path = `notes/${crypto.randomUUID()}-${safeName}`;
      const { data, error } = await admin.storage.from("bca-notes").createSignedUploadUrl(path);
      if (error) return respond({ success: false, error: error.message }, 400, corsHeaders);
      return respond({ success: true, bucket: "bca-notes", path, token: data.token, signed_url: data.signedUrl }, 200, corsHeaders);
    }

    if (request.method === "POST" && pathname === "/notes/delete") {
      const { id } = await request.json().catch(() => ({}));
      const { data: note, error: lookupError } = await admin.from("notes").select("id,storage_bucket,storage_path").eq("id", id).single();
      if (lookupError || !note) return respond({ success: false, error: "Note not found." }, 404, corsHeaders);
      const { error: storageError } = await admin.storage.from(note.storage_bucket).remove([note.storage_path]);
      if (storageError) return respond({ success: false, error: storageError.message }, 400, corsHeaders);
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
