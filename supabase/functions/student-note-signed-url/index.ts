// supabase/functions/student-note-signed-url/index.ts

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL || "https://dmxegktlxqsxaysqwswa.supabase.co";
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!; // Must be set in function env

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

// ---------- CORS configuration ----------
const ALLOWED_ORIGINS = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "https://bcavault.in",
  "https://www.bcavault.in"
];

function getCorsHeaders(req: any) {
  const origin = req.headers?.origin || "";
  const isAllowed = ALLOWED_ORIGINS.includes(origin);
  const allowOrigin = isAllowed ? origin : "*";
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, content-type",
    "Access-Control-Max-Age": "86400",
  };
}

export const handler = async (event: any) => {
  // Handle CORS preflight
  if (event.method === "OPTIONS") {
    return { statusCode: 200, headers: getCorsHeaders(event) };
  }
  // Expect POST with JSON body { noteId }
  const token = event.headers?.authorization?.replace("Bearer ", "");
  if (!token) {
    return { statusCode: 401, body: JSON.stringify({ error: "Missing auth token" }), headers: getCorsHeaders(event) };
  }

  // Verify user via auth token
  const { data: authUser, error: authErr } = await supabaseAdmin.auth.getUser(token);
  if (authErr || !authUser) {
    return { statusCode: 401, body: JSON.stringify({ error: "Invalid token" }), headers: getCorsHeaders(event) };
  }
  const userId = authUser.id;

  const body = event.body ? JSON.parse(event.body) : {};
  const noteId = body.noteId;
  if (!noteId) {
    return { statusCode: 400, body: JSON.stringify({ error: "noteId required" }), headers: getCorsHeaders(event) };
  }

  // Fetch note details
  const { data: note, error: noteErr } = await supabaseAdmin
    .from("notes")
    .select("id, storage_bucket, storage_path, published, bundle_id")
    .eq("id", noteId)
    .single();
  if (noteErr || !note) {
    return { statusCode: 404, body: JSON.stringify({ error: "Note not found" }), headers: getCorsHeaders(event) };
  }
  if (!note.published) {
    return { statusCode: 403, body: JSON.stringify({ error: "Note not published" }), headers: getCorsHeaders(event) };
  }

  // Verify bundle is published
  const { data: bundle, error: bundleErr } = await supabaseAdmin
    .from("bundles")
    .select("published")
    .eq("id", note.bundle_id)
    .single();
  if (bundleErr || !bundle || !bundle.published) {
    return { statusCode: 403, body: JSON.stringify({ error: "Bundle not accessible" }), headers: getCorsHeaders(event) };
  }

  // Verify active access permission for this user and bundle
  const { data: permission, error: permErr } = await supabaseAdmin
    .from("access_permissions")
    .select("id")
    .eq("user_id", userId)
    .eq("bundle_id", note.bundle_id)
    .eq("status", "active")
    .or("expires_at.is.null,expires_at.gt." + new Date().toISOString())
    .limit(1)
    .single();
  if (permErr || !permission) {
    return { statusCode: 403, body: JSON.stringify({ error: "Access denied" }), headers: getCorsHeaders(event) };
  }

  // Create signed URL (10 minutes)
  const bucket = note.storage_bucket || "bca-notes";
  const { data: signedData, error: signedErr } = await supabaseAdmin
    .storage.from(bucket)
    .createSignedUrl(note.storage_path, 600);
  if (signedErr || !signedData?.signedUrl) {
    return { statusCode: 500, body: JSON.stringify({ error: "Failed to create signed URL" }), headers: getCorsHeaders(event) };
  }

  // Optional: log activity (if activity_logs table exists)
  try {
    await supabaseAdmin.from("activity_logs").insert({
      actor_id: userId,
      action: "note_view",
      target_type: "note",
      target_id: note.id,
      metadata: JSON.stringify({ bundle_id: note.bundle_id }),
    });
  } catch (_) {}

  return { statusCode: 200, body: JSON.stringify({ signedUrl: signedData.signedUrl }), headers: getCorsHeaders(event) };
};
