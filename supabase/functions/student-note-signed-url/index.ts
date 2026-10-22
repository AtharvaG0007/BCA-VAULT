import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { PDFDocument, rgb, StandardFonts, degrees } from "npm:pdf-lib@1.17.1";

const ALLOWED_ORIGINS = new Set([
  "https://bca-vault.portalbcavault.workers.dev",
  "https://bcavault.in",
  "https://www.bcavault.in",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:3000",
  "http://localhost:4173",
]);

function isAllowedOrigin(origin: string): boolean {
  if (!origin) return false;
  if (ALLOWED_ORIGINS.has(origin)) return true;
  if (/^https:\/\/bca-vault(-[a-z0-9-]+)?\.portalbcavault\.workers\.dev$/.test(origin)) return true;
  if (/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) return true;
  return false;
}

function getCorsHeaders(req: Request) {
  const origin = req.headers.get("Origin") || "";
  const allowOrigin = isAllowedOrigin(origin) ? origin : "https://bcavault.in";

  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type, x-requested-with",
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
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
      .select("id, title, subject, semester, storage_bucket, storage_path, published, bundle_id")
      .eq("id", noteId)
      .maybeSingle();

    if (noteErr || !note) {
      if (noteErr) {
        console.error("Database query error for note:", noteErr);
      }
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

    // 3. Classify resource type. Regular published notes are free; question-answer packs remain gated.
    const isPaidQuestionResource = (
      /most[\\s_-]*repeated[\\s_-]*(questions|topics)/i.test(note.title || "") ||
      /most[\\s_-]*repeated[\\s_-]*(questions|topics)|repted[\\s_-]*(questions|topics)|refral_bouns|referral_bonus|questions_complete|question.*answer/i.test(note.storage_path || "")
    );

    // 4. Verify student authorization
    // Regular published notes are free for active student accounts. Paid question packs
    // are served only through Exam Kits after a verified order grants an entitlement.
    if (isPaidQuestionResource) {
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
            reason: "paid_question_pack_requires_exam_kit_entitlement",
          },
        });
      } catch (logErr) {
        console.warn("Access denied audit log error:", logErr);
      }

      return respond(
        {
          success: false,
          error: "Most Repeated Questions are available through Exam Kits after payment verification.",
        },
        403,
        corsHeaders
      );
    }

    // 5. Generate short-lived signed URL (180 seconds = 3 minutes)
    // Short expiration ensures links cannot be effectively shared while giving ample time to stream
    const SIGNED_URL_TTL = 180;
    const candidateBuckets = [
      note.storage_bucket,
      "Bca_notes",
      "bca-notes",
    ].filter((b, idx, arr): b is string => Boolean(b) && arr.indexOf(b) === idx);

    const rawPath = note.storage_path || "";
    const candidatePaths = [
      rawPath,
      decodeURIComponent(rawPath),
    ];
    if (rawPath.includes("C_Programming_Complete_Notes.pdf")) {
      candidatePaths.push(
        rawPath.replace("C_Programming_Complete_Notes.pdf", "BCA_Vault_Algorithms_and_Programming_Design_using_C_Corrected.pdf")
      );
    } else if (rawPath.includes("BCA_Vault_Algorithms_and_Programming_Design_using_C_Corrected.pdf")) {
      candidatePaths.push(
        rawPath.replace("BCA_Vault_Algorithms_and_Programming_Design_using_C_Corrected.pdf", "C_Programming_Complete_Notes.pdf")
      );
    }

    // Map referral-bonus question files to verified storage paths
    if (
      rawPath.includes("Algorithms_and_Program_Design_Using_C_repted_questions_refral_bouns.pdf") ||
      note.id === "6d971cc5-5677-43f5-958f-add182553c87"
    ) {
      candidatePaths.push(
        "BCA SEM1/BCA_Vault_Referral_Bonus_C_Programming_Most_Repeated_Questions.pdf"
      );
    }
    if (
      rawPath.includes("Foundations_of_Computing_repted_questions_refral_bouns.pdf") ||
      note.id === "33cc389f-4a00-4d3e-89dd-670e514e2ed3"
    ) {
      candidatePaths.push(
        "BCA SEM1/BCA_Vault_Referral_Bonus_Foundations_of_Computing_Most_Repeated_Questions.pdf"
      );
    }
    if (
      rawPath.includes("Client_Side_Web_Technologies_repted_questions_refral_bouns.pdf") ||
      note.id === "20af0ae2-66e3-46cb-bbc2-4ae8e12f0500"
    ) {
      candidatePaths.push(
        "BCA SEM1/BCA_Vault_Referral_Bonus_Client_Side_Web_Technologies_Most_Repeated_Questions.pdf"
      );
    }

    // Ensure BCA SEM1 folder prefix is attempted if rawPath lacks it
    if (rawPath === "Foundation_of_Computing_Most_Repeated_Topics.pdf") {
      candidatePaths.push("BCA SEM1/Foundation_of_Computing_Most_Repeated_Topics.pdf");
    }

    const uniquePaths = Array.from(new Set(candidatePaths.filter(Boolean)));

    let signedUrl = "";
    let matchedBucket = "";
    let matchedPath = "";
    let lastStorageError: any = null;

    for (const b of candidateBuckets) {
      for (const p of uniquePaths) {
        const { data: sData, error: sErr } = await admin.storage
          .from(b)
          .createSignedUrl(p, SIGNED_URL_TTL);
        if (!sErr && sData?.signedUrl) {
          signedUrl = sData.signedUrl;
          matchedBucket = b;
          matchedPath = p;
          break;
        }
        if (sErr) lastStorageError = sErr;
      }
      if (signedUrl) break;
    }

    if (!signedUrl) {
      console.error("Storage signed URL generation failed:", lastStorageError);
      const isNotFound =
        lastStorageError?.statusCode === "404" ||
        lastStorageError?.status === 400 ||
        lastStorageError?.code === "NoSuchKey" ||
        lastStorageError?.message?.toLowerCase().includes("not found");

      if (isNotFound) {
        return respond(
          {
            success: false,
            error: "The requested note document is currently unavailable. Please contact support.",
          },
          404,
          corsHeaders
        );
      }

      return respond(
        {
          success: false,
          error: "Unable to generate secure link for this note at this time. Please try again later.",
        },
        500,
        corsHeaders
      );
    }

    const studentName = profile.full_name || identity.user.user_metadata?.full_name || "Student";
    const studentEmail = profile.email || identity.user.email || "";

    // 6. Dynamic Server-Side PDF Watermarking (Per-Student, Master Untouched)
    // Stamps the PDF binary with student identity so browser native downloads retain the watermark.
    let finalSignedUrl = signedUrl;
    const watermarkedPath = `.watermarked/${userId}/${note.id}.pdf`;

    try {
      const storageBucket = matchedBucket || "bca-notes";
      // Check if already watermarked and cached
      const { data: existingList } = await admin.storage
        .from(storageBucket)
        .list(`.watermarked/${userId}`, { limit: 10, search: `${note.id}.pdf` });

      const isCached = existingList && existingList.some((f) => f.name === `${note.id}.pdf`);

      if (isCached) {
        const { data: cachedSign, error: cachedSignErr } = await admin.storage
          .from(storageBucket)
          .createSignedUrl(watermarkedPath, SIGNED_URL_TTL);
        if (!cachedSignErr && cachedSign?.signedUrl) {
          finalSignedUrl = cachedSign.signedUrl;
        }
      } else if (matchedBucket && matchedPath) {
        // Download master PDF bytes
        const { data: masterBlob, error: dlErr } = await admin.storage
          .from(matchedBucket)
          .download(matchedPath);

        if (!dlErr && masterBlob) {
          const rawBuffer = await masterBlob.arrayBuffer();
          const pdfDoc = await PDFDocument.load(rawBuffer, { ignoreEncryption: true });
          const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
          const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);

          const studentLabel = `${studentName} • ${studentEmail}`;
          const diagonalWatermark = `BCA VAULT • ${studentLabel}`;
          const footerStamp = `Licensed to: ${studentName} (${studentEmail}) • BCA Vault Official Study Material`;

          const pages = pdfDoc.getPages();
          for (const page of pages) {
            const { width, height } = page.getSize();

            // Subtle center diagonal watermark across the page
            const textWidth = boldFont.widthOfTextAtSize(diagonalWatermark, 14);
            page.drawText(diagonalWatermark, {
              x: Math.max(20, (width - textWidth) / 2),
              y: height / 2,
              size: 14,
              font: boldFont,
              color: rgb(0.55, 0.6, 0.7),
              opacity: 0.15,
              rotate: degrees(35),
            });

            // Subtle top security header
            page.drawText(footerStamp, {
              x: 25,
              y: height - 16,
              size: 7.5,
              font: regularFont,
              color: rgb(0.4, 0.45, 0.5),
              opacity: 0.5,
            });

            // Subtle bottom footer stamp
            page.drawText(footerStamp, {
              x: 25,
              y: 14,
              size: 7.5,
              font: regularFont,
              color: rgb(0.4, 0.45, 0.5),
              opacity: 0.5,
            });
          }

          const watermarkedBytes = await pdfDoc.save();

          // Upload per-student watermarked copy to storage
          const { error: uploadErr } = await admin.storage
            .from(storageBucket)
            .upload(watermarkedPath, watermarkedBytes, {
              contentType: "application/pdf",
              upsert: true,
            });

          if (!uploadErr) {
            const { data: newSign, error: newSignErr } = await admin.storage
              .from(storageBucket)
              .createSignedUrl(watermarkedPath, SIGNED_URL_TTL);
            if (!newSignErr && newSign?.signedUrl) {
              finalSignedUrl = newSign.signedUrl;
            }
          } else {
            console.warn("Watermarked upload failed, falling back to original:", uploadErr);
          }
        }
      }
    } catch (wmErr) {
      console.warn("Watermark processing encountered error, falling back to original:", wmErr);
    }

    // 7. Audit log authorized document access
    try {
      await admin.from("activity_logs").insert({
        actor_id: userId,
        action: "DOCUMENT_ACCESS_GRANTED",
        target_type: "note",
        target_id: note.id,
        metadata: {
          note_title: note.title,
          bundle_id: note.bundle_id,
          ttl_seconds: SIGNED_URL_TTL,
        },
      });
    } catch (logErr) {
      console.warn("Activity log insert failed:", logErr);
    }

    return respond(
      {
        success: true,
        signedUrl: finalSignedUrl,
        expiresIn: SIGNED_URL_TTL,
        note: {
          id: note.id,
          title: note.title,
          subject: note.subject ?? null,
          semester: note.semester ?? null,
          is_protected: true,
        },
        watermark: {
          studentName,
          studentEmail,
          studentId: userId,
          sessionTimestamp: new Date().toISOString(),
        },
      },
      200,
      corsHeaders
    );
  } catch (error: any) {
    console.error("student-note-signed-url unhandled error:", error);
    return respond(
      { success: false, error: "An unexpected error occurred while preparing your document. Please try again later." },
      500,
      corsHeaders
    );
  }
});
