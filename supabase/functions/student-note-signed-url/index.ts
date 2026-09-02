import "jsr:@supabase/functions-js/edge-runtime.d.ts";
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
      const body = (await request.json().catch(() => ({}))) as Record<string, any>;
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
    // 1. Check student profile status and retrieve identity metadata
    const { data: profile, error: profileErr } = await admin
      .from("profiles")
      .select("status, full_name, email")
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
      .select("id, title, subject, semester, storage_bucket, storage_path, published, bundle_id, is_protected")
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

    // 3. Verify bundle exists and is published (if note is associated with a bundle)
    let bundleTitle = "Independent Note";
    if (note.bundle_id) {
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
      bundleTitle = bundle.title;
    }

    // 4. Verify student authorization: bundle permission OR granular document access
    const nowIso = new Date().toISOString();
    let hasAccess = false;

    if (note.bundle_id) {
      const { data: permission } = await admin
        .from("access_permissions")
        .select("id")
        .eq("user_id", userId)
        .eq("bundle_id", note.bundle_id)
        .eq("status", "active")
        .or(`expires_at.is.null,expires_at.gt.${nowIso}`)
        .maybeSingle();

      if (permission) {
        hasAccess = true;
      }
    }

    // Check direct document-level access grant if not already granted via bundle
    if (!hasAccess) {
      const { data: directDocAccess } = await admin
        .from("student_document_access")
        .select("id")
        .eq("user_id", userId)
        .eq("note_id", note.id)
        .or(`expires_at.is.null,expires_at.gt.${nowIso}`)
        .maybeSingle();

      if (directDocAccess) {
        hasAccess = true;
      }
    }

    if (!hasAccess) {
      // Audit log access denial
      try {
        await admin.from("activity_logs").insert({
          actor_id: userId,
          action: "DOCUMENT_ACCESS_DENIED",
          target_type: "note",
          target_id: note.id,
          metadata: {
            note_title: note.title,
            bundle_id: note.bundle_id,
            reason: "no_active_access_permission",
          },
        });
      } catch (logErr) {
        console.warn("Access denied audit log error:", logErr);
      }

      return respond(
        {
          success: false,
          error: "You do not have active access to this note. Please verify your course bundle access.",
        },
        403,
        corsHeaders
      );
    }

    // 5. Generate short-lived signed URL (180 seconds = 3 minutes)
    // Short expiration ensures links cannot be effectively shared while giving ample time to stream
    const SIGNED_URL_TTL = 180;
    const primaryBucket = note.storage_bucket || "bca-notes";
    let signedUrl = "";

    const { data: signedData, error: signedErr } = await admin.storage
      .from(primaryBucket)
      .createSignedUrl(note.storage_path, SIGNED_URL_TTL);

    if (!signedErr && signedData?.signedUrl) {
      signedUrl = signedData.signedUrl;
    } else {
      // Try alternate bucket casing if first attempt failed
      const altBucket = primaryBucket === "bca-notes" ? "Bca_notes" : "bca-notes";
      const { data: altData, error: altErr } = await admin.storage
        .from(altBucket)
        .createSignedUrl(note.storage_path, SIGNED_URL_TTL);

      if (!altErr && altData?.signedUrl) {
        signedUrl = altData.signedUrl;
      } else {
        console.error("Storage signed URL error:", signedErr || altErr);
        return respond(
          {
            success: false,
            error: "Unable to generate secure link for this document at this time.",
          },
          500,
          corsHeaders
        );
      }
    }

    // 6. Audit log authorized document access
    try {
      await admin.from("activity_logs").insert({
        actor_id: userId,
        action: "DOCUMENT_ACCESS_GRANTED",
        target_type: "note",
        target_id: note.id,
        metadata: {
          note_title: note.title,
          bundle_id: note.bundle_id,
          bundle_title: bundleTitle,
          ttl_seconds: SIGNED_URL_TTL,
        },
      });
    } catch (logErr) {
      console.warn("Activity log insert failed:", logErr);
    }

    const studentName = profile.full_name || identity.user.user_metadata?.full_name || "Student";
    const studentEmail = profile.email || identity.user.email || "";

    return respond(
      {
        success: true,
        signedUrl,
        expiresIn: SIGNED_URL_TTL,
        note: {
          id: note.id,
          title: note.title,
          subject: note.subject ?? null,
          semester: note.semester ?? null,
          is_protected: note.is_protected ?? true,
        },
        watermark: {
          studentName,
          studentEmail,
          studentId: userId,
          sessionTimestamp: nowIso,
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
