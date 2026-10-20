import { createClient } from "@supabase/supabase-js";
import fs from "fs";

const envContent = fs.readFileSync(".env", "utf-8");
const env = {};
envContent.split("\n").forEach((line) => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    const key = match[1].trim();
    const val = match[2].trim().replace(/^["']|["']$/g, "");
    env[key] = val;
  }
});

const supabaseUrl = env["SUPABASE_URL"] || "https://dmxegktlxqsxaysqwswa.supabase.co";
const anonKey = env["VITE_SUPABASE_PUBLISHABLE_KEY"] || "";
const secretKey = env["SUPABASE_SECRET_KEY"] || "";

console.log("Supabase URL:", supabaseUrl);
console.log("Has anonKey:", Boolean(anonKey), "Has secretKey:", Boolean(secretKey));

const admin = createClient(supabaseUrl, secretKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const client = createClient(supabaseUrl, anonKey);

async function run() {
  console.log("\n--- Checking admin_profiles ---");
  const { data: admins, error: adminErr } = await admin.from("admin_profiles").select("*");
  console.log("admin_profiles:", admins, "error:", adminErr);

  console.log("\n--- Checking recent payment_submissions ---");
  const { data: payments, error: payErr } = await admin
    .from("payment_submissions")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(10);
  console.log("payment_submissions count:", payments?.length, "error:", payErr);
  if (payments?.length) {
    console.log("Latest payments:", JSON.stringify(payments.map(p => ({
      id: p.id,
      reference_id: p.reference_id,
      email: p.email,
      full_name: p.full_name,
      amount: p.amount,
      status: p.status,
      created_at: p.created_at,
      utr: p.utr,
      user_id: p.user_id,
      bundle_id: p.bundle_id
    })), null, 2));
  }

  console.log("\n--- Checking recent access_permissions ---");
  const { data: access, error: accErr } = await admin
    .from("access_permissions")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(5);
  console.log("access_permissions count:", access?.length, "error:", accErr);
  if (access?.length) {
    console.log("Recent access:", access);
  }

  console.log("\n--- Checking recent exam_kit_orders (if table exists) ---");
  const { data: examOrders, error: examErr } = await admin
    .from("exam_kit_orders")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(5);
  console.log("exam_kit_orders count:", examOrders?.length, "error:", examErr);
  if (examOrders?.length) {
    console.log("Recent exam kit orders:", examOrders);
  }

  console.log("\n--- Testing Auth Sign-In for gogawaleatharva@gmail.com ---");
  const { data: authData, error: authErr } = await client.auth.signInWithPassword({
    email: "gogawaleatharva@gmail.com",
    password: "athgo7002",
  });
  console.log("Sign-in result with gogawaleatharva@gmail.com:", authData?.user?.id ? "SUCCESS (UID: " + authData.user.id + ")" : "FAILED", "error:", authErr?.message);

  console.log("\n--- Registered users in Supabase Auth ---");
  const { data: usersData, error: usersErr } = await admin.auth.admin.listUsers();
  console.log("Total users:", usersData?.users?.length, "error:", usersErr);
  if (usersData?.users?.length) {
    console.log("Users:", usersData.users.map(u => ({ id: u.id, email: u.email, confirmed: Boolean(u.email_confirmed_at) })));
  }
}

run().catch(console.error);
