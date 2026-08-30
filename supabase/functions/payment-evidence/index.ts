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

async function requireUser(request: Request, corsHeaders: Record<string, string>) {
  const token = request.headers.get("Authorization")?.replace("Bearer ", "");
  if (!token) {
    return { error: respond({ success: false, error: "Authentication required" }, 401, corsHeaders) };
  }
  const { data: { user }, error } = await admin.auth.getUser(token);
  if (error || !user) {
    return { error: respond({ success: false, error: "Authentication required or session expired" }, 401, corsHeaders) };
  }
  return { user };
}

async function bundleFor(id: string) {
  const { data, error } = await admin.from("bundles").select("id,title,price,published").eq("id", id).maybeSingle();
  if (error || !data || !data.published) return null;
  return data;
}

Deno.serve(async (request) => {
  const corsHeaders = getCorsHeaders(request);

  // 1. Handle OPTIONS preflight immediately without requiring authentication
  if (request.method === "OPTIONS") {
    return new Response("ok", {
      status: 200,
      headers: corsHeaders,
    });
  }

  if (request.method !== "POST") {
    return respond({ success: false, error: "Method not allowed." }, 405, corsHeaders);
  }

  // 2. Authenticate user from bearer token
  const identity = await requireUser(request, corsHeaders);
  if (identity.error) return identity.error;

  try {
    const body = await request.json().catch(() => ({}));
    const action = text(body.action);
    const bundleId = text(body.bundle_id);

    const bundle = await bundleFor(bundleId);
    if (!bundle) {
      return respond({ success: false, error: "The selected bundle is unavailable." }, 400, corsHeaders);
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
      const path = `payment-evidence/${identity.user.id}/${submissionId}/screenshot.${extensions[contentType]}`;

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
          bundle: { id: bundle.id, title: bundle.title, price: bundle.price },
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
      const course = text(body.course);
      const utr = text(body.utr).toUpperCase();
      const submissionId = text(body.submission_id);
      const path = text(body.storage_path);
      const semester = Number(body.semester);
      const amount = Number(body.amount);

      if (!identity.user.email || email !== identity.user.email.toLowerCase()) {
        return respond({ success: false, error: "Use your registered BCA Vault email address." }, 400, corsHeaders);
      }

      if (
        fullName.length < 2 ||
        fullName.length > 100 ||
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

      if (!/^BV-[A-F0-9]{12}$/.test(submissionId) || !path.startsWith(`payment-evidence/${identity.user.id}/${submissionId}/screenshot.`)) {
        return respond({ success: false, error: "Your upload session is invalid. Please select your screenshot again." }, 400, corsHeaders);
      }

      if (Number(bundle.price) !== amount) {
        return respond({ success: false, error: "The payment amount does not match the selected bundle." }, 400, corsHeaders);
      }

      const folder = path.slice(0, path.lastIndexOf("/"));
      const fileName = path.slice(path.lastIndexOf("/") + 1);

      const { data: files, error: fileError } = await admin.storage.from(bucket).list(folder, { limit: 5 });
      const file = files?.find((candidate) => candidate.name === fileName);

      if (
        fileError ||
        !file ||
        !extensions[file.metadata?.mimetype ?? ""] ||
        Number(file.metadata?.size) < 1 ||
        Number(file.metadata?.size) > maxFileSize
      ) {
        return respond({ success: false, error: "Your uploaded screenshot could not be verified in storage. Please upload again." }, 400, corsHeaders);
      }

      const { error: insertError } = await admin.from("payment_submissions").insert({
        reference_id: submissionId,
        user_id: identity.user.id,
        bundle_id: bundle.id,
        full_name: fullName,
        email: identity.user.email,
        phone,
        course,
        semester,
        amount: bundle.price,
        utr,
        screenshot_bucket: bucket,
        screenshot_path: path,
        status: "pending",
      });

      if (insertError?.code === "23505") {
        return respond({ success: false, error: "This UTR or payment reference has already been submitted." }, 409, corsHeaders);
      }

      if (insertError) {
        console.error("Insert error:", insertError);
        throw insertError;
      }

      return respond(
        {
          success: true,
          submission_id: submissionId,
          status: "pending",
          bundle: { id: bundle.id, title: bundle.title, price: bundle.price },
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
