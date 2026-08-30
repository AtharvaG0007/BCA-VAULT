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
  const isAllowed =
    ALLOWED_ORIGINS.includes(origin) ||
    origin.endsWith(".vercel.app") ||
    origin.endsWith(".figma.site");
  const allowOrigin = isAllowed ? origin : (origin || "*");

  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
    "Access-Control-Max-Age": "86400",
  };
}

const url = Deno.env.get("SUPABASE_URL") ?? "";
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function respond(
  body: unknown,
  status = 200,
  corsHeaders: Record<string, string>
) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

async function requireUser(
  request: Request,
  corsHeaders: Record<string, string>
) {
  const token = request.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) {
    return {
      error: respond(
        { success: false, error: "Authentication required." },
        401,
        corsHeaders
      ),
    };
  }
  const {
    data: { user },
    error,
  } = await admin.auth.getUser(token);
  if (error || !user) {
    return {
      error: respond(
        { success: false, error: "Authentication required or session expired." },
        401,
        corsHeaders
      ),
    };
  }
  return { user };
}

Deno.serve(async (request: Request) => {
  const corsHeaders = getCorsHeaders(request);

  if (request.method === "OPTIONS") {
    return new Response("ok", {
      status: 200,
      headers: corsHeaders,
    });
  }

  if (request.method !== "POST" && request.method !== "GET") {
    return respond(
      { success: false, error: "Method not allowed." },
      405,
      corsHeaders
    );
  }

  const identity = await requireUser(request, corsHeaders);
  if (identity.error) return identity.error;
  const userId = identity.user.id;

  try {
    let noteId = "";
    if (request.method === "POST") {
      const body = await request.json().catch(() => ({}));
      noteId = String(body.noteId || body.note_id || "").trim();
    } else {
      const parsedUrl = new URL(request.url);
      noteId = String(parsedUrl.searchParams.get("noteId") || parsedUrl.searchParams.get("note_id") || "").trim();
    }

    if (!noteId) {
      return respond(
        { success: false, error: "Note ID is required." },
        400,
        corsHeaders
      );
    }

    // 1. Check student profile status
    const { data: profile, error: profileErr } = await admin
      .from("profiles")
      .select("status")
      .eq("user_id", userId)
      .maybeSingle();

    if (profileErr || !profile || profile.status !== "active") {
      return respond(
        { success: false, error: "Your account is not active. Please contact support." },
        403,
        corsHeaders
      );
    }

    // 2. Fetch note details
    const { data: note, error: noteErr } = await admin
      .from("notes")
      .select("id, title, storage_bucket, storage_path, published, bundle_id")
      .eq("id", noteId)
      .maybeSingle();

    if (noteErr || !note) {
      return respond(
        { success: false, error: "Note not found." },
        404,
        corsHeaders
      );
    }

    if (!note.published) {
      return respond(
        { success: false, error: "This note is currently not published." },
        403,
        corsHeaders
      );
    }

    // 3. Verify bundle exists and is published
    const { data: bundle, error: bundleErr } = await admin
      .from("bundles")
      .select("id, title, published")
      .eq("id", note.bundle_id)
      .maybeSingle();

    if (bundleErr || !bundle || !bundle.published) {
      return respond(
        { success: false, error: "The course bundle for this note is unavailable." },
        403,
        corsHeaders
      );
    }

    // 4. Verify user has active access permission for this bundle
    const nowIso = new Date().toISOString();
    const { data: permission, error: permErr } = await admin
      .from("access_permissions")
      .select("id, status, expires_at")
      .eq("user_id", userId)
      .eq("bundle_id", note.bundle_id)
      .eq("status", "active")
      .or(`expires_at.is.null,expires_at.gt.${nowIso}`)
      .maybeSingle();

    if (permErr || !permission) {
      return respond(
        {
          success: false,
          error: "You do not have active access to this note's bundle. Please verify your purchase.",
        },
        403,
        corsHeaders
      );
    }

    // 5. Generate signed URL (600 seconds = 10 mins)
    // Support configured bucket, with graceful fallback between "Bca_notes" and "bca-notes"
    const primaryBucket = note.storage_bucket || "Bca_notes";
    let signedUrl = "";

    const { data: signedData, error: signedErr } = await admin.storage
      .from(primaryBucket)
      .createSignedUrl(note.storage_path, 600);

    if (!signedErr && signedData?.signedUrl) {
      signedUrl = signedData.signedUrl;
    } else {
      // Try alternate bucket casing if first attempt failed
      const altBucket = primaryBucket === "Bca_notes" ? "bca-notes" : "Bca_notes";
      const { data: altData, error: altErr } = await admin.storage
        .from(altBucket)
        .createSignedUrl(note.storage_path, 600);

      if (!altErr && altData?.signedUrl) {
        signedUrl = altData.signedUrl;
      } else {
        console.error("Storage signed URL error:", signedErr || altErr);
        return respond(
          {
            success: false,
            error: "Unable to generate secure link for this note at this time.",
          },
          500,
          corsHeaders
        );
      }
    }

    // 6. Log note view activity
    try {
      await admin.from("activity_logs").insert({
        actor_id: userId,
        action: "note_opened",
        target_type: "note",
        target_id: note.id,
        metadata: {
          note_title: note.title,
          bundle_id: note.bundle_id,
          bundle_title: bundle.title,
        },
      });
    } catch (logErr) {
      console.warn("Activity log insert failed:", logErr);
    }

    return respond(
      {
        success: true,
        signedUrl,
        note: {
          id: note.id,
          title: note.title,
        },
      },
      200,
      corsHeaders
    );
  } catch (error: any) {
    console.error("student-note-signed-url error:", error);
    return respond(
      { success: false, error: error.message || "An unexpected error occurred." },
      500,
      corsHeaders
    );
  }
});
