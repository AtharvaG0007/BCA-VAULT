import type { VercelRequest, VercelResponse } from "@vercel/node";
import { publicError, requireUser, supabaseAdmin } from "../_supabaseAdmin";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const user = await requireUser(req, res);
  if (!user) return;

  const id = typeof req.query.id === "string" ? req.query.id : "";
  if (!id) return res.status(400).json({ error: "Note id is required." });

  try {
    const c = supabaseAdmin();
    const { data: profile } = await c
      .from("profiles")
      .select("status, full_name, email")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!profile || profile.status !== "active") {
      return res.status(403).json({ error: "Account inactive or unauthorized." });
    }

    const { data: note, error } = await c
      .from("notes")
      .select("id, title, subject, semester, storage_bucket, storage_path, bundle_id, published, is_protected")
      .eq("id", id)
      .maybeSingle();

    if (error || !note || !note.published) {
      return res.status(404).json({ error: "Note not found or unavailable." });
    }

    const nowIso = new Date().toISOString();
    let hasAccess = false;

    // Check bundle access
    if (note.bundle_id) {
      const { data: bundleAccess } = await c
        .from("access_permissions")
        .select("id")
        .eq("user_id", user.id)
        .eq("bundle_id", note.bundle_id)
        .eq("status", "active")
        .or(`expires_at.is.null,expires_at.gt.${nowIso}`)
        .maybeSingle();

      if (bundleAccess) {
        hasAccess = true;
      }
    }

    // Check direct per-document grant
    if (!hasAccess) {
      const { data: directDocAccess } = await c
        .from("student_document_access")
        .select("id")
        .eq("user_id", user.id)
        .eq("note_id", note.id)
        .or(`expires_at.is.null,expires_at.gt.${nowIso}`)
        .maybeSingle();

      if (directDocAccess) {
        hasAccess = true;
      }
    }

    if (!hasAccess) {
      return res.status(403).json({ error: "No bundle or document access." });
    }

    const TTL = 180;
    const bucket = note.storage_bucket || "bca-notes";
    const { data: signed, error: signError } = await c.storage
      .from(bucket)
      .createSignedUrl(note.storage_path, TTL);

    if (signError || !signed?.signedUrl) {
      throw signError ?? new Error("Download authorization unavailable.");
    }

    // Audit log access
    try {
      await c.from("activity_logs").insert({
        actor_id: user.id,
        action: "DOCUMENT_ACCESS_GRANTED",
        target_type: "note",
        target_id: note.id,
        metadata: {
          note_title: note.title,
          bundle_id: note.bundle_id,
          ttl_seconds: TTL,
        },
      });
    } catch {
      // Non-blocking log
    }

    return res.status(200).json({
      success: true,
      signedUrl: signed.signedUrl,
      expiresIn: TTL,
      note: {
        id: note.id,
        title: note.title,
        subject: note.subject,
        semester: note.semester,
        is_protected: note.is_protected ?? true,
      },
      watermark: {
        studentName: profile.full_name || user.user_metadata?.full_name || "Student",
        studentEmail: profile.email || user.email || "",
        studentId: user.id,
        sessionTimestamp: nowIso,
      },
    });
  } catch (error) {
    return res.status(500).json({ error: publicError(error) });
  }
}
