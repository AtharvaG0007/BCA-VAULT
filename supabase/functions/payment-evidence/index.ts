import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

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
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
    "Access-Control-Max-Age": "86400",
  };
}

const url = Deno.env.get("SUPABASE_URL") ?? "";
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });

const bucket = "bca-payment-evidence";
const maxFileSize = 5 * 1024 * 1024;
const extensions: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

function respond(body: unknown, status = 200, corsHeaders: Record<string, string>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

const text = (value: unknown) => (typeof value === "string" ? value.trim() : "");

async function getOptionalUser(request: Request) {
  const token = request.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) {
    return { user: null };
  }
  const { data: { user }, error } = await admin.auth.getUser(token);
  if (error || !user) {
    return { user: null };
  }
  return { user };
}

async function getSem1Bundle(id?: string) {
  if (id) {
    const { data } = await admin.from("bundles").select("id,title,price,published").eq("id", id).maybeSingle();
    if (data && data.published) return data;
  }

  // Look for Semester 1 bundle
  const { data: sem1 } = await admin
    .from("bundles")
    .select("id,title,price,published")
    .ilike("title", "%sem%1%")
    .eq("published", true)
    .maybeSingle();

  if (sem1) return sem1;

  // Fallback to any published bundle
  const { data: anyBundle } = await admin
    .from("bundles")
    .select("id,title,price,published")
    .eq("published", true)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  return anyBundle || null;
}

Deno.serve(async (request: Request) => {
  const corsHeaders = getCorsHeaders(request);

  // 1. Handle OPTIONS preflight immediately
  if (request.method === "OPTIONS") {
    return new Response("ok", {
      status: 200,
      headers: corsHeaders,
    });
  }

  if (request.method !== "POST") {
    return respond({ success: false, error: "Method not allowed." }, 405, corsHeaders);
  }

  // 2. Identify caller (can be guest or logged-in student)
  const { user } = await getOptionalUser(request);

  try {
    const body = (await request.json().catch(() => ({}))) as Record<string, any>;
    const action = text(body.action);
    const bundleId = text(body.bundle_id);

    const bundle = await getSem1Bundle(bundleId);
    if (!bundle) {
      return respond({ success: false, error: "The course bundle is currently unavailable." }, 400, corsHeaders);
    }

    // ACTION: create-upload
    if (action === "create-upload") {
      const contentType = text(body.content_type);
      const size = Number(body.size);

      if (!extensions[contentType]) {
        return respond({ success: false, error: "Only JPEG, PNG, and WebP images are allowed." }, 400, corsHeaders);
      }
      if (!Number.isInteger(size) || size < 1 || size > maxFileSize) {
        return respond({ success: false, error: "Payment screenshot must be 5 MB or smaller." }, 400, corsHeaders);
      }

      const submissionId = `BV-${crypto.randomUUID().replaceAll("-", "").slice(0, 12).toUpperCase()}`;
      const userPrefix = user?.id ? user.id : `guest-${submissionId}`;
      const path = `payment-evidence/${userPrefix}/${submissionId}/screenshot.${extensions[contentType]}`;

      const { data, error } = await admin.storage.from(bucket).createSignedUploadUrl(path);
      if (error || !data) {
        console.error("Signed upload URL error:", error);
        throw error ?? new Error("Unable to authorize upload.");
      }

      return respond(
        {
          success: true,
          submission_id: submissionId,
          storage_path: path,
          token: data.token,
          bundle: { id: bundle.id, title: bundle.title, price: 349 },
        },
        200,
        corsHeaders
      );
    }

    // ACTION: submit
    if (action === "submit") {
      const fullName = text(body.full_name);
      const phone = text(body.phone).replace(/[\s-]/g, "");
      const email = text(body.email).toLowerCase();
      const course = text(body.course) || "BCA";
      const utr = text(body.utr).toUpperCase();
      const submissionId = text(body.submission_id);
      const path = text(body.storage_path);
      const semester = Number(body.semester) || 1;
      const amount = Number(body.amount);

      if (
        fullName.length < 2 ||
        fullName.length > 100 ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
        !/^\+?[0-9]{10,15}$/.test(phone) ||
        course.length < 2 ||
        course.length > 80 ||
        !Number.isInteger(semester) ||
        semester < 1 ||
        semester > 6
      ) {
        return respond({ success: false, error: "Please complete all payment details correctly." }, 400, corsHeaders);
      }

      if (!/^[A-Z0-9-]{6,64}$/.test(utr)) {
        return respond({ success: false, error: "Please enter a valid UPI transaction ID / UTR." }, 400, corsHeaders);
      }

      if (!/^BV-[A-F0-9]{12}$/.test(submissionId) || !path.startsWith("payment-evidence/") || !path.includes(submissionId)) {
        return respond({ success: false, error: "Your upload session is invalid. Please select your screenshot again." }, 400, corsHeaders);
      }

      // Valid prices: 349 (regular) or 299 (Top 3 winner)
      const allowedPrices = [349, 299];
      if (!allowedPrices.includes(amount)) {
        return respond({ success: false, error: "Invalid payment amount. Valid pricing is ₹349 or ₹299 for verified Top 3 winners." }, 400, corsHeaders);
      }

      const folder = path.slice(0, path.lastIndexOf("/"));
      const fileName = path.slice(path.lastIndexOf("/") + 1);

      const { data: files, error: fileError } = await admin.storage.from(bucket).list(folder, { limit: 5 });
      const file = files?.find((candidate: { name: string; metadata?: Record<string, unknown> | null }) => candidate.name === fileName);

      if (
        fileError ||
        !file ||
        !extensions[file.metadata?.mimetype ?? ""] ||
        Number(file.metadata?.size) < 1 ||
        Number(file.metadata?.size) > maxFileSize
      ) {
        return respond({ success: false, error: "Your uploaded screenshot could not be verified in storage. Please upload again." }, 400, corsHeaders);
      }

      // If student is logged in, attach their user_id. If guest, check if profile exists with email.
      let effectiveUserId = user?.id || null;
      if (!effectiveUserId) {
        const { data: existingProfile } = await admin
          .from("profiles")
          .select("user_id")
          .ilike("email", email)
          .maybeSingle();
        if (existingProfile?.user_id) {
          effectiveUserId = existingProfile.user_id;
        }
      }

      // Referral identifier handling (optional)
      const rawReferralInput = text(body.referral_identifier || body.referral_code || body.referralCode);
      let validReferralIdentifier: string | null = null;
      let resolvedReferrerUserId: string | null = null;

      if (rawReferralInput) {
        // Resolve using server-side resolve_referral_identifier function
        const { data: refResult, error: refRpcError } = await admin.rpc("resolve_referral_identifier", {
          p_identifier: rawReferralInput,
          p_caller_user_id: effectiveUserId || null,
          p_caller_email: email,
          p_is_internal: true,
        });

        if (refRpcError || !refResult || !refResult.success) {
          const errorMessage = refResult?.error || refRpcError?.message || "Invalid referral identifier.";
          return respond(
            { success: false, error: errorMessage },
            400,
            corsHeaders
          );
        }

        validReferralIdentifier = refResult.referral_identifier;
        resolvedReferrerUserId = refResult.referrer_user_id;
      }

      const { error: insertError } = await admin.from("payment_submissions").insert({
        reference_id: submissionId,
        user_id: effectiveUserId,
        bundle_id: bundle.id,
        full_name: fullName,
        email,
        phone,
        course,
        semester,
        amount,
        utr,
        screenshot_bucket: bucket,
        screenshot_path: path,
        status: "pending",
        referral_code: validReferralIdentifier,
        referral_identifier: validReferralIdentifier,
      });

      if (insertError?.code === "23505") {
        return respond({ success: false, error: "This UTR or payment reference has already been submitted." }, 409, corsHeaders);
      }

      if (insertError) {
        console.error("Insert error:", insertError);
        throw insertError;
      }

      // If a valid referral identifier was supplied and we have an identified student, create pending referral
      if (validReferralIdentifier && effectiveUserId && resolvedReferrerUserId) {
        // Enforce 1-referral per student: check if referral already exists
        const { data: existingReferral } = await admin
          .from("referrals")
          .select("id")
          .eq("referred_user_id", effectiveUserId)
          .maybeSingle();

        if (!existingReferral) {
          const { error: refInsertError } = await admin.from("referrals").insert({
            referrer_user_id: resolvedReferrerUserId,
            referred_user_id: effectiveUserId,
            referral_identifier: validReferralIdentifier,
            status: "pending",
          });

          if (refInsertError) {
            console.warn("[payment-evidence] Could not insert pending referral:", refInsertError);
          }
        }
      }

      return respond(
        {
          success: true,
          submission_id: submissionId,
          status: "pending",
          bundle: { id: bundle.id, title: bundle.title, price: amount },
          user_id: effectiveUserId,
        },
        201,
        corsHeaders
      );
    }

    return respond({ success: false, error: "Invalid payment action." }, 400, corsHeaders);
  } catch (error: any) {
    console.error("Payment Edge Function Error:", error);
    return respond({ success: false, error: error.message || "Unable to process payment evidence." }, 500, corsHeaders);
  }
});
