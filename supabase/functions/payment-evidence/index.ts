import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "jsr:@supabase/supabase-js@2/cors";

const url = Deno.env.get("SUPABASE_URL") ?? "";
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
const bucket = "bca-payment-evidence";
const maxFileSize = 5 * 1024 * 1024;
const extensions: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

const respond = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
const text = (value: unknown) => typeof value === "string" ? value.trim() : "";

async function requireUser(request: Request) {
  const token = request.headers.get("Authorization")?.replace("Bearer ", "");
  if (!token) return { error: respond({ error: "Authentication required." }, 401) };
  const { data: { user }, error } = await admin.auth.getUser(token);
  return error || !user ? { error: respond({ error: "Authentication required." }, 401) } : { user };
}

async function bundleFor(id: string) {
  const { data, error } = await admin.from("bundles").select("id,title,price,published").eq("id", id).maybeSingle();
  if (error || !data || !data.published) return null;
  return data;
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return respond({ error: "Method not allowed." }, 405);
  const identity = await requireUser(request);
  if (identity.error) return identity.error;

  try {
    const body = await request.json();
    const action = text(body.action);
    const bundleId = text(body.bundle_id);
    const bundle = await bundleFor(bundleId);
    if (!bundle) return respond({ error: "The selected bundle is unavailable." }, 400);

    if (action === "create-upload") {
      const contentType = text(body.content_type);
      const size = Number(body.size);
      if (!extensions[contentType]) return respond({ error: "Only JPEG, PNG, and WebP images are allowed." }, 400);
      if (!Number.isInteger(size) || size < 1 || size > maxFileSize) return respond({ error: "Payment screenshot must be 5 MB or smaller." }, 400);
      const submissionId = `BV-${crypto.randomUUID().replaceAll("-", "").slice(0, 12).toUpperCase()}`;
      const path = `payment-evidence/${identity.user.id}/${submissionId}/screenshot.${extensions[contentType]}`;
      const { data, error } = await admin.storage.from(bucket).createSignedUploadUrl(path);
      if (error || !data) throw error ?? new Error("Unable to authorize upload.");
      return respond({ submission_id: submissionId, storage_path: path, token: data.token, bundle: { id: bundle.id, title: bundle.title, price: bundle.price } });
    }

    if (action !== "submit") return respond({ error: "Invalid payment action." }, 400);
    const fullName = text(body.full_name), phone = text(body.phone).replace(/[\s-]/g, ""), email = text(body.email).toLowerCase();
    const course = text(body.course), utr = text(body.utr).toUpperCase(), submissionId = text(body.submission_id), path = text(body.storage_path);
    const semester = Number(body.semester), amount = Number(body.amount);
    if (!identity.user.email || email !== identity.user.email.toLowerCase()) return respond({ error: "Use your registered BCA Vault email." }, 400);
    if (fullName.length < 2 || fullName.length > 100 || !/^\+?[0-9]{10,15}$/.test(phone) || course.length < 2 || course.length > 80 || !Number.isInteger(semester) || semester < 1 || semester > 6) return respond({ error: "Please complete all payment details correctly." }, 400);
    if (!/^[A-Z0-9-]{6,64}$/.test(utr)) return respond({ error: "Please enter a valid UPI transaction ID / UTR." }, 400);
    if (!/^BV-[A-F0-9]{12}$/.test(submissionId) || !path.startsWith(`payment-evidence/${identity.user.id}/${submissionId}/screenshot.`)) return respond({ error: "Your upload session is invalid." }, 400);
    if (Number(bundle.price) !== amount) return respond({ error: "The payment amount does not match the selected bundle." }, 400);
    const folder = path.slice(0, path.lastIndexOf("/"));
    const fileName = path.slice(path.lastIndexOf("/") + 1);
    const { data: files, error: fileError } = await admin.storage.from(bucket).list(folder, { limit: 1 });
    const file = files?.find((candidate) => candidate.name === fileName);
    if (fileError || !file || !extensions[file.metadata?.mimetype ?? ""] || Number(file.metadata?.size) < 1 || Number(file.metadata?.size) > maxFileSize) return respond({ error: "Your uploaded screenshot could not be verified." }, 400);
    const { error } = await admin.from("payment_submissions").insert({ reference_id: submissionId, user_id: identity.user.id, bundle_id: bundle.id, full_name: fullName, email: identity.user.email, phone, course, semester, amount: bundle.price, utr, screenshot_bucket: bucket, screenshot_path: path, status: "pending" });
    if (error?.code === "23505") return respond({ error: "This payment reference or UTR has already been submitted." }, 409);
    if (error) throw error;
    return respond({ submission_id: submissionId, status: "pending", bundle: { id: bundle.id, title: bundle.title, price: bundle.price } }, 201);
  } catch (error) {
    console.error(error);
    return respond({ error: "Unable to submit payment evidence." }, 500);
  }
});
