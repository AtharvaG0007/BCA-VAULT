import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function normalizeEmail(value: unknown) {
  return String(value ?? "").trim().toLowerCase();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed." }, 405);

  try {
    const body = await req.json();
    const email = normalizeEmail(body.email);
    const password = String(body.password ?? "");
    const fullName = String(body.fullName ?? "").trim();
    const phone = String(body.phone ?? "").trim();
    const semester = Number(body.semester) || 1;

    if (!email || !email.includes("@") || email.length > 254) return json({ error: "Please enter a valid email address." }, 400);
    if (password.length < 6 || password.length > 128) return json({ error: "Password must be between 6 and 128 characters." }, 400);
    if (fullName.length < 2 || fullName.length > 120) return json({ error: "Please enter your full name." }, 400);
    if (semester < 1 || semester > 6) return json({ error: "Invalid semester." }, 400);

    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    if (!serviceRoleKey || !supabaseUrl) return json({ error: "Account service is not configured." }, 500);

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: existing } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const duplicate = existing?.users?.find((u) => u.email?.toLowerCase() === email);
    if (duplicate) return json({ error: "An account with this email already exists. Please sign in instead.", code: "account_exists" }, 409);

    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        name: fullName,
        phone: phone || undefined,
        course: "BCA",
        semester,
      },
    });

    if (error || !data.user) {
      console.error("[student-account-create] createUser error", error);
      return json({ error: error?.message || "Unable to create your account." }, 400);
    }

    // Keep profile creation explicit so the dashboard has a student profile immediately.
    const { error: profileError } = await admin.from("profiles").upsert({
      user_id: data.user.id,
      full_name: fullName,
      email,
      phone: phone || null,
      course: "BCA",
      semester,
      status: "inactive",
    }, { onConflict: "user_id" });

    if (profileError) {
      await admin.auth.admin.deleteUser(data.user.id);
      console.error("[student-account-create] profile error", profileError);
      return json({ error: "Account could not be completed. Please try again." }, 500);
    }

    return json({ success: true, user: { id: data.user.id, email } });
  } catch (error) {
    console.error("[student-account-create] unexpected error", error);
    return json({ error: "Unable to create your account right now. Please try again." }, 500);
  }
});
