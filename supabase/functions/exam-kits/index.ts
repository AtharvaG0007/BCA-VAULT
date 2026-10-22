import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const db = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const contentBucket = "most-repeated-questions";
const evidenceBucket = "exam-kit-payment-evidence";
const maxContentTitleLength = 160;
const maxContentDescriptionLength = 1000;

function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("Origin") ?? "";
  const allowedOrigins = new Set([
    "https://bca-vault.portalbcavault.workers.dev",
    "https://bca-vault-exam-kits.portalbcavault.workers.dev",
    "https://bcavault.in",
    "https://www.bcavault.in",
  ]);

  try {
    const parsed = new URL(origin);
    if (["localhost", "127.0.0.1"].includes(parsed.hostname)) allowedOrigins.add(origin);
  } catch {
    // No Origin is valid for non-browser clients; the browser still needs an allowed origin.
  }

  const allowOrigin = allowedOrigins.has(origin) ? origin : "https://bca-vault.portalbcavault.workers.dev";
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

function reply(data: unknown, status: number, headers: Record<string, string>): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...headers, "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

const text = (value: unknown) => (typeof value === "string" ? value.trim() : "");

async function getUser(req: Request) {
  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const { data, error } = await db.auth.getUser(token);
  return error ? null : data.user;
}

async function isAdmin(userId: string) {
  const { data, error } = await db
    .from("admin_profiles")
    .select("user_id")
    .eq("user_id", userId)
    .eq("status", "active")
    .in("role", ["admin", "superadmin"])
    .maybeSingle();
  return !error && Boolean(data);
}

async function isActiveStudent(userId: string) {
  const { data, error } = await db.from("profiles").select("status").eq("user_id", userId).maybeSingle();
  return !error && data?.status === "active";
}

function validContentPath(path: string) {
  if (!path || path.length > 500 || path.startsWith("/") || path.includes("\\") || /[\u0000-\u001f\u007f]/.test(path)) {
    return false;
  }
  const segments = path.split("/");
  return segments.every((part) => part !== "" && part !== "." && part !== "..") && path.toLowerCase().endsWith(".pdf");
}

Deno.serve(async (req: Request) => {
  const headers = corsHeaders(req);
  if (req.method === "OPTIONS") return new Response("ok", { headers });
  if (req.method !== "POST") return reply({ success: false, error: "Method not allowed." }, 405, headers);

  const user = await getUser(req);
  if (!user) return reply({ success: false, error: "Please sign in to continue." }, 401, headers);

  try {
    const body = await req.json().catch(() => ({}));
    const action = text(body.action);
    const studentActions = new Set(["create-order", "create-upload", "submit-payment", "my-orders", "my-content"]);
    if (studentActions.has(action) && !(await isActiveStudent(user.id))) {
      return reply({ success: false, error: "Your account is inactive. Contact support to restore access." }, 403, headers);
    }

    if (action === "create-order") {
      const selectedSubjects: string[] = Array.isArray(body.subjects)
        ? Array.from(new Set<string>(body.subjects.filter((subject: unknown): subject is string => typeof subject === "string")))
        : [];
      const planType = text(body.plan_type);
      const [{ data: plan, error: planError }, { data: catalogSubjects, error: catalogError }] = await Promise.all([
        db.from("exam_kit_plans").select("id,price,selection_mode,subject_count").eq("id", planType).eq("published", true).maybeSingle(),
        db.from("exam_kit_subjects").select("id").eq("published", true),
      ]);
      if (planError || catalogError) throw planError ?? catalogError;
      const publishedSubjectIds = new Set((catalogSubjects ?? []).map((subject) => subject.id));
      if (!selectedSubjects.every((subject) => publishedSubjectIds.has(subject))) {
        return reply({ success: false, error: "Choose from the currently published Exam Kit subjects." }, 400, headers);
      }
      const validCount = plan?.selection_mode === "all"
        ? selectedSubjects.length === publishedSubjectIds.size && [...publishedSubjectIds].every((subject) => selectedSubjects.includes(subject))
        : Boolean(plan && selectedSubjects.length === plan.subject_count);
      if (!plan || !validCount) {
        return reply({ success: false, error: "Invalid plan or subject selection." }, 400, headers);
      }

      const fullName = text(body.full_name);
      const email = text(body.email).toLowerCase();
      const phone = text(body.phone).replace(/[\s-]/g, "");
      if (
        fullName.length < 2 ||
        fullName.length > 100 ||
        !/^\+?[0-9]{10,15}$/.test(phone) ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
        email !== (user.email ?? "").toLowerCase()
      ) {
        return reply({ success: false, error: "Enter your name, valid phone number and the signed-in account email." }, 400, headers);
      }

      const orderCode = `EK-${crypto.randomUUID().replaceAll("-", "").slice(0, 12).toUpperCase()}`;
      const { data, error } = await db
        .from("exam_kit_orders")
        .insert({
          user_id: user.id,
          order_code: orderCode,
          selected_subjects: selectedSubjects,
          plan_type: planType,
          amount: plan.price,
          status: "awaiting_payment",
          full_name: fullName,
          email,
          phone,
        })
        .select("id,order_code,selected_subjects,plan_type,amount,status,created_at")
        .single();
      if (error) throw error;
      return reply({ success: true, order: data }, 201, headers);
    }

    if (action === "create-upload") {
      const orderId = text(body.order_id);
      const { data: order } = await db
        .from("exam_kit_orders")
        .select("id,status")
        .eq("id", orderId)
        .eq("user_id", user.id)
        .maybeSingle();
      if (!order || order.status !== "awaiting_payment") {
        return reply({ success: false, error: "Order is not awaiting payment." }, 409, headers);
      }

      const contentType = text(body.content_type);
      const extensions: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
      const size = Number(body.size);
      if (!extensions[contentType] || !Number.isInteger(size) || size < 1 || size > 5 * 1024 * 1024) {
        return reply({ success: false, error: "Use a JPG, PNG or WebP screenshot up to 5 MB." }, 400, headers);
      }

      const path = `${user.id}/${order.id}/payment.${extensions[contentType]}`;
      const { data, error } = await db.storage.from(evidenceBucket).createSignedUploadUrl(path);
      if (error || !data) throw error ?? new Error("Could not create upload URL.");
      return reply({ success: true, storage_path: path, token: data.token }, 200, headers);
    }

    if (action === "submit-payment") {
      const orderId = text(body.order_id);
      const utr = text(body.utr).toUpperCase();
      const path = text(body.storage_path);
      if (!/^[A-Z0-9-]{6,64}$/.test(utr)) {
        return reply({ success: false, error: "Enter a valid UPI transaction reference." }, 400, headers);
      }
      if (!path.startsWith(`${user.id}/${orderId}/payment.`)) {
        return reply({ success: false, error: "Invalid screenshot upload session." }, 400, headers);
      }

      const { data: order } = await db
        .from("exam_kit_orders")
        .select("id,status")
        .eq("id", orderId)
        .eq("user_id", user.id)
        .maybeSingle();
      if (!order || order.status !== "awaiting_payment") {
        return reply({ success: false, error: "Order cannot accept payment evidence." }, 409, headers);
      }

      const folder = `${user.id}/${order.id}`;
      const { data: files, error: storageError } = await db.storage.from(evidenceBucket).list(folder, { limit: 5 });
      const fileName = path.slice(path.lastIndexOf("/") + 1);
      const file = files?.find((candidate: { name: string }) => candidate.name === fileName);
      const mimeType = file?.metadata?.mimetype;
      const fileSize = Number(file?.metadata?.size);
      if (
        storageError ||
        !file ||
        !["image/jpeg", "image/png", "image/webp"].includes(mimeType ?? "") ||
        !Number.isFinite(fileSize) ||
        fileSize > 5 * 1024 * 1024
      ) {
        return reply({ success: false, error: "Screenshot missing or invalid. Upload it again." }, 400, headers);
      }

      const { data, error } = await db
        .from("exam_kit_orders")
        .update({ utr, screenshot_bucket: evidenceBucket, screenshot_path: path, status: "pending_review", updated_at: new Date().toISOString() })
        .eq("id", order.id)
        .eq("user_id", user.id)
        .eq("status", "awaiting_payment")
        .select("id,order_code,amount,status")
        .maybeSingle();
      if (error?.code === "23505") {
        return reply({ success: false, error: "This UPI reference has already been submitted." }, 409, headers);
      }
      if (error || !data) throw error ?? new Error("Order submission failed.");
      return reply({ success: true, order: data, message: "Payment evidence submitted for manual verification." }, 200, headers);
    }

    if (action === "my-orders") {
      const { data, error } = await db
        .from("exam_kit_orders")
        .select("id,order_code,selected_subjects,plan_type,amount,status,admin_notes,created_at,verified_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return reply({ success: true, orders: data ?? [] }, 200, headers);
    }

    if (action === "my-content") {
      const subjectId = text(body.subject_id);
      const { data: subject, error: subjectError } = await db
        .from("exam_kit_subjects")
        .select("id")
        .eq("id", subjectId)
        .eq("published", true)
        .maybeSingle();
      if (subjectError) throw subjectError;
      if (!subject) {
        return reply({ success: false, error: "Unknown subject." }, 400, headers);
      }

      const { data: entitlement, error: entitlementError } = await db
        .from("exam_kit_entitlements")
        .select("id")
        .eq("user_id", user.id)
        .eq("subject_id", subjectId)
        .maybeSingle();
      if (entitlementError) throw entitlementError;
      if (!entitlement) return reply({ success: false, error: "You do not have access to this subject kit." }, 403, headers);

      const { data, error } = await db
        .from("exam_kit_content")
        .select("id,title,description,storage_path")
        .eq("subject_id", subjectId)
        .eq("storage_bucket", contentBucket)
        .eq("published", true)
        .order("created_at", { ascending: true });
      if (error) throw error;

      const content = await Promise.all(
        (data ?? []).map(async (item) => {
          const { data: signed, error: signError } = await db.storage
            .from(contentBucket)
            .createSignedUrl(item.storage_path, 300);
          return {
            id: item.id,
            title: item.title,
            description: item.description,
            available: !signError && Boolean(signed?.signedUrl),
            url: signError ? null : signed?.signedUrl ?? null,
            expires_in: signError ? null : 300,
          };
        }),
      );
      const unavailableCount = content.filter((item) => !item.available).length;
      return reply(
        {
          success: true,
          content,
          unavailable_count: unavailableCount,
          message: unavailableCount ? "Some files are not available yet. Please check again later." : null,
        },
        200,
        headers,
      );
    }

    if (action === "admin-list") {
      if (!(await isAdmin(user.id))) return reply({ success: false, error: "Administrator access required." }, 403, headers);
      const { data, error } = await db
        .from("exam_kit_orders")
        .select("*")
        .in("status", ["pending_review", "approved", "rejected"])
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;

      const orders = await Promise.all(
        (data ?? []).map(async (order) => {
          let screenshotUrl: string | null = null;
          const expectedPathPrefix = `${order.user_id}/${order.id}/payment.`;
          if (
            order.screenshot_bucket === evidenceBucket &&
            typeof order.screenshot_path === "string" &&
            order.screenshot_path.startsWith(expectedPathPrefix)
          ) {
            const { data: signed } = await db.storage
              .from(evidenceBucket)
              .createSignedUrl(order.screenshot_path, 300);
            screenshotUrl = signed?.signedUrl ?? null;
          }
          return { ...order, screenshot_url: screenshotUrl };
        }),
      );
      return reply({ success: true, orders }, 200, headers);
    }

    if (action === "admin-content-list") {
      if (!(await isAdmin(user.id))) return reply({ success: false, error: "Administrator access required." }, 403, headers);
      const [{ data: data, error: contentError }, { data: subjectsData, error: subjectsError }] = await Promise.all([
        db.from("exam_kit_content").select("id,subject_id,title,description,storage_path,published,created_at")
          .eq("storage_bucket", contentBucket).order("created_at", { ascending: false }).limit(200),
        db.from("exam_kit_subjects").select("id,title").eq("published", true).order("sort_order"),
      ]);
      if (contentError || subjectsError) throw contentError ?? subjectsError;
      return reply({ success: true, content: data ?? [], subjects: subjectsData ?? [] }, 200, headers);
    }

    if (action === "admin-content-save") {
      if (!(await isAdmin(user.id))) return reply({ success: false, error: "Administrator access required." }, 403, headers);
      const id = text(body.id);
      const subjectId = text(body.subject_id);
      const title = text(body.title);
      const description = text(body.description);
      const storagePath = text(body.storage_path);
      const published = body.published === true;
      const { data: subject, error: subjectError } = await db
        .from("exam_kit_subjects")
        .select("id")
        .eq("id", subjectId)
        .eq("published", true)
        .maybeSingle();
      if (subjectError) throw subjectError;
      if (!subject) {
        return reply({ success: false, error: "Choose a supported Exam Kit subject." }, 400, headers);
      }
      if (title.length < 1 || title.length > maxContentTitleLength || description.length > maxContentDescriptionLength) {
        return reply({ success: false, error: "Enter a title and a description under 1,000 characters." }, 400, headers);
      }
      if (!validContentPath(storagePath)) {
        return reply({ success: false, error: "Enter a relative PDF path inside the private most-repeated-questions bucket." }, 400, headers);
      }

      const values = {
        subject_id: subjectId,
        title,
        description,
        storage_bucket: contentBucket,
        storage_path: storagePath,
        published,
      };
      let data;
      let error;
      if (id) {
        const { data: existing, error: lookupError } = await db
          .from("exam_kit_content")
          .select("id")
          .eq("id", id)
          .eq("storage_bucket", contentBucket)
          .maybeSingle();
        if (lookupError) throw lookupError;
        if (!existing) return reply({ success: false, error: "Exam Kit content record not found." }, 404, headers);
        ({ data, error } = await db
          .from("exam_kit_content")
          .update(values)
          .eq("id", id)
          .eq("storage_bucket", contentBucket)
          .select("id,subject_id,title,description,storage_path,published,created_at")
          .single());
      } else {
        ({ data, error } = await db
          .from("exam_kit_content")
          .insert(values)
          .select("id,subject_id,title,description,storage_path,published,created_at")
          .single());
      }
      if (error?.code === "23505") return reply({ success: false, error: "This PDF path is already registered for this subject." }, 409, headers);
      if (error) throw error;
      return reply({ success: true, content: data }, 200, headers);
    }

    if (action === "admin-content-delete") {
      if (!(await isAdmin(user.id))) return reply({ success: false, error: "Administrator access required." }, 403, headers);
      const id = text(body.id);
      const { data, error } = await db
        .from("exam_kit_content")
        .delete()
        .eq("id", id)
        .eq("storage_bucket", contentBucket)
        .select("id")
        .maybeSingle();
      if (error) throw error;
      if (!data) return reply({ success: false, error: "Exam Kit content record not found." }, 404, headers);
      return reply({ success: true }, 200, headers);
    }

    if (action === "admin-review") {
      if (!(await isAdmin(user.id))) return reply({ success: false, error: "Administrator access required." }, 403, headers);
      const orderId = text(body.order_id);
      const decision = text(body.decision);
      const adminNotes = text(body.admin_notes).slice(0, 1000);
      if (!["approved", "rejected"].includes(decision)) {
        return reply({ success: false, error: "Choose approve or reject." }, 400, headers);
      }
      if (decision === "rejected" && !adminNotes) {
        return reply({ success: false, error: "Add a rejection reason before rejecting this payment." }, 400, headers);
      }

      const { data, error } = await db.rpc("review_exam_kit_order", {
        p_order_id: orderId,
        p_decision: decision,
        p_admin_notes: adminNotes,
        p_admin_id: user.id,
      });
      if (error) {
        if (error.code === "P0002") return reply({ success: false, error: "Pending order not found or already reviewed." }, 409, headers);
        if (error.code === "42501") return reply({ success: false, error: "Administrator access required." }, 403, headers);
        throw error;
      }
      return reply({ success: true, order: data }, 200, headers);
    }

    return reply({ success: false, error: "Unknown action." }, 400, headers);
  } catch (error) {
    console.error("[exam-kits] request failed:", error);
    return reply({ success: false, error: "Request could not be completed. Please retry or contact support." }, 500, headers);
  }
});
