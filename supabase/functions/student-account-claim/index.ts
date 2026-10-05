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

function cors(req: Request) {
  const origin = req.headers.get("Origin") || "";
  const allowed = ALLOWED_ORIGINS.includes(origin) || origin.endsWith(".workers.dev") || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
  return {
    "Access-Control-Allow-Origin": allowed ? origin : "https://bca-vault.portalbcavault.workers.dev",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-requested-with",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Max-Age": "86400",
    "Content-Type": "application/json",
  };
}

function response(req: Request, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: cors(req) });
}

const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const serviceKey = Deno.env.get("SUPABASE_" + "SERVICE_ROLE_KEY") || "";
const admin = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function normalizeEmail(value: unknown) {
  return String(value || "").trim().toLowerCase();
}

function normalizeText(value: unknown) {
  return String(value || "").trim();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return response(req, { success: true });
  if (req.method !== "POST") return response(req, { success: false, error: "Method not allowed." }, 405);

  try {
    const body = await req.json().catch(() => ({}));
    const referenceId = normalizeText(body.reference_id);
    const email = normalizeEmail(body.email);
    const fullName = normalizeText(body.full_name);
    const phone = normalizeText(body.phone);
    const utr = normalizeText(body.utr).toUpperCase();
    const password = String(body.password || "");
    const course = normalizeText(body.course) || "BCA";
    const semester = Number(body.semester) || 1;

    if (!/^BV-[A-F0-9]{12}$/.test(referenceId)) {
      return response(req, { success: false, error: "Invalid payment reference." }, 400);
    }
    if (!email || !email.includes("@") || email.length > 320) {
      return response(req, { success: false, error: "Please use the email address submitted with your payment." }, 400);
    }
    if (!fullName || fullName.length > 120) {
      return response(req, { success: false, error: "Student name is required." }, 400);
    }
    if (password.length < 6 || password.length > 128) {
      return response(req, { success: false, error: "Password must be between 6 and 128 characters." }, 400);
    }
    if (semester < 1 || semester > 6) {
      return response(req, { success: false, error: "Invalid semester." }, 400);
    }

    const { data: payment, error: paymentError } = await admin
      .from("payment_submissions")
      .select("id, reference_id, user_id, bundle_id, full_name, email, phone, course, semester, utr, status")
      .eq("reference_id", referenceId)
      .maybeSingle();

    if (paymentError || !payment) {
      return response(req, { success: false, error: "Payment reference could not be found." }, 404);
    }

    if (normalizeEmail(payment.email) !== email) {
      return response(req, { success: false, error: "The email does not match the payment record." }, 403);
    }

    if (normalizeText(payment.utr).toUpperCase() !== utr) {
      return response(req, { success: false, error: "The transaction ID does not match the payment record." }, 403);
    }

    if (payment.user_id) {
      return response(req, {
        success: false,
        code: "ACCOUNT_ALREADY_LINKED",
        error: "This payment is already linked to a BCA Vault account. Please sign in with the payment email.",
      }, 409);
    }

    const { data: existingProfile } = await admin
      .from("profiles")
      .select("user_id")
      .ilike("email", email)
      .maybeSingle();

    if (existingProfile?.user_id) {
      return response(req, {
        success: false,
        code: "ACCOUNT_EXISTS",
        error: "An account already exists for this email. Please sign in instead.",
      }, 409);
    }

    const { data: existingAuth } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const authExists = existingAuth?.users?.some((u) => normalizeEmail(u.email) === email);
    if (authExists) {
      return response(req, {
        success: false,
        code: "ACCOUNT_EXISTS",
        error: "An account already exists for this email. Please sign in instead.",
      }, 409);
    }

    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        course,
        semester,
        phone: phone || payment.phone || undefined,
      },
    });

    if (createError || !created.user) {
      const message = createError?.message || "Unable to create your account.";
      console.error("[student-account-claim] createUser failed:", message);
      return response(req, { success: false, error: message }, 400);
    }

    const userId = created.user.id;

    // The handle_new_user trigger links the guest payment by email. The explicit
    // update makes the invariant immediate and keeps this endpoint safe if the
    // trigger is ever changed independently.
    const { error: linkError } = await admin
      .from("payment_submissions")
      .update({ user_id: userId })
      .eq("id", payment.id)
      .is("user_id", null);

    if (linkError) {
      console.error("[student-account-claim] payment link failed:", linkError);
      await admin.auth.admin.deleteUser(userId);
      return response(req, { success: false, error: "Account creation could not be linked to your payment. Please try again." }, 500);
    }

    return response(req, {
      success: true,
      user_id: userId,
      email,
      payment_reference: referenceId,
      email_confirmed: true,
    }, 201);
  } catch (error: any) {
    console.error("[student-account-claim] unexpected error:", error?.message || error);
    return response(req, { success: false, error: "Unable to create the account right now. Your payment remains recorded." }, 500);
  }
});
