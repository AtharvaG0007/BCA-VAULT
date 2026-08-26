import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "jsr:@supabase/supabase-js@2/cors";

const url = Deno.env.get("SUPABASE_URL") ?? "";
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });

function respond(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

async function requireSuperadmin(request: Request) {
  const token = request.headers.get("Authorization")?.replace("Bearer ", "");
  if (!token) return { error: respond({ error: "Authentication required." }, 401) };
  const { data: { user }, error } = await admin.auth.getUser(token);
  if (error || !user) return { error: respond({ error: "Authentication required." }, 401) };
  const { data: profile } = await admin.from("admin_profiles").select("user_id").eq("user_id", user.id).eq("role", "superadmin").eq("status", "active").maybeSingle();
  if (!profile) return { error: respond({ error: "Super Admin access required." }, 403) };
  return { user };
}

async function log(actorId: string, action: string, targetType?: string, targetId?: string, metadata: Record<string, unknown> = {}) {
  await admin.from("activity_logs").insert({ actor_id: actorId, action, target_type: targetType ?? null, target_id: targetId ?? null, metadata });
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const access = await requireSuperadmin(request);
  if (access.error) return access.error;
  const pathname = new URL(request.url).pathname.replace(/^\/bca-admin/, "");

  try {
    if (request.method === "POST" && pathname === "/students") {
      const body = await request.json();
      const fullName = String(body.full_name ?? "").trim();
      const email = String(body.email ?? "").trim().toLowerCase();
      const semester = Number(body.semester);
      if (!fullName || !email || !Number.isInteger(semester) || semester < 1 || semester > 6) return respond({ error: "Name, email, and a semester from 1 to 6 are required." }, 400);
      const { data, error } = await admin.auth.admin.inviteUserByEmail(email, { data: { full_name: fullName } });
      if (error || !data.user) return respond({ error: error?.message ?? "Unable to invite the student." }, 400);
      const { error: profileError } = await admin.from("profiles").insert({ user_id: data.user.id, email, full_name: fullName, phone: body.phone || null, course: body.course || "BCA", semester, status: "active" });
      if (profileError) return respond({ error: profileError.message }, 400);
      await log(access.user.id, "student_created", "profile", data.user.id, { email });
      return respond({ student: { user_id: data.user.id, email, full_name: fullName } }, 201);
    }

    if (request.method === "POST" && pathname === "/students/reset-password") {
      const { email } = await request.json();
      const { error } = await admin.auth.resetPasswordForEmail(String(email), { redirectTo: `${request.headers.get("Origin") ?? ""}/auth/update-password` });
      if (error) return respond({ error: error.message }, 400);
      await log(access.user.id, "password_reset_sent", "profile", undefined, { email });
      return respond({ ok: true });
    }

    if (request.method === "POST" && pathname === "/payments/signed-url") {
      const { bucket, path } = await request.json();
      if (bucket !== "bca-payment-evidence" || !path) return respond({ error: "Invalid payment evidence path." }, 400);
      const { data, error } = await admin.storage.from(bucket).createSignedUrl(path, 300);
      if (error) return respond({ error: error.message }, 400);
      return respond({ url: data.signedUrl, expires_in: 300 });
    }

    if (request.method === "POST" && pathname === "/payments/review") {
      const { id, status, note = "" } = await request.json();
      if (!id || !["approved", "rejected"].includes(status)) return respond({ error: "A payment ID and review status are required." }, 400);
      const { data, error } = await admin.rpc("review_payment_submission", { p_payment_id: id, p_status: status, p_admin_notes: String(note), p_verified_by: access.user.id });
      if (error) return respond({ error: error.message }, 400);
      return respond({ payment: data });
    }

    if (request.method === "POST" && pathname === "/notes/upload-url") {
      const { fileName, contentType } = await request.json();
      if (contentType !== "application/pdf") return respond({ error: "Only PDF files are allowed." }, 400);
      const safeName = String(fileName ?? "note.pdf").replace(/[^a-zA-Z0-9._-]/g, "-");
      const path = `notes/${crypto.randomUUID()}-${safeName}`;
      const { data, error } = await admin.storage.from("bca-notes").createSignedUploadUrl(path);
      if (error) return respond({ error: error.message }, 400);
      return respond({ bucket: "bca-notes", path, token: data.token, signed_url: data.signedUrl });
    }

    if (request.method === "POST" && pathname === "/notes/delete") {
      const { id } = await request.json();
      const { data: note, error: lookupError } = await admin.from("notes").select("id,storage_bucket,storage_path").eq("id", id).single();
      if (lookupError || !note) return respond({ error: "Note not found." }, 404);
      const { error: storageError } = await admin.storage.from(note.storage_bucket).remove([note.storage_path]);
      if (storageError) return respond({ error: storageError.message }, 400);
      const { error: deleteError } = await admin.from("notes").delete().eq("id", id);
      if (deleteError) return respond({ error: deleteError.message }, 400);
      await log(access.user.id, "note_deleted", "note", id);
      return respond({ ok: true });
    }

    return respond({ error: "Route not found." }, 404);
  } catch (error) {
    console.error(error);
    return respond({ error: "Unexpected server error." }, 500);
  }
});
