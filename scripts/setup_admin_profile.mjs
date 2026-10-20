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

const admin = createClient(supabaseUrl, secretKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const client = createClient(supabaseUrl, anonKey);

async function run() {
  console.log("Upserting gogawaleatharva@gmail.com into admin_profiles...");
  const { data: upsertData, error: upsertErr } = await admin.from("admin_profiles").upsert(
    {
      user_id: "d36d71bb-7077-47d9-be4a-6d8c3dbf5d89",
      email: "gogawaleatharva@gmail.com",
      role: "superadmin",
      status: "active",
    },
    { onConflict: "user_id" }
  ).select();

  console.log("Upsert result:", upsertData, "Error:", upsertErr);

  const { data: allAdmins } = await admin.from("admin_profiles").select("*");
  console.log("Current admin_profiles:", allAdmins);

  // Now test sign in and call exam-kits admin-list
  console.log("\nSigning in as gogawaleatharva@gmail.com...");
  const { data: auth, error: authErr } = await client.auth.signInWithPassword({
    email: "gogawaleatharva@gmail.com",
    password: "athgo7002",
  });

  if (authErr || !auth?.session) {
    console.error("Sign-in failed:", authErr);
    return;
  }

  const token = auth.session.access_token;
  console.log("Sign-in successful! Token length:", token.length);

  console.log("\nCalling exam-kits action: 'admin-list' with admin token...");
  const resp = await fetch(`${supabaseUrl}/functions/v1/exam-kits`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: anonKey,
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ action: "admin-list" }),
  });

  const resJson = await resp.json();
  console.log("Status:", resp.status);
  console.log("Response:", JSON.stringify(resJson, null, 2));

  console.log("\nCalling bca-admin /stats with admin token...");
  const bcaResp = await fetch(`${supabaseUrl}/functions/v1/bca-admin/stats`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: anonKey,
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({}),
  });
  console.log("bca-admin stats Status:", bcaResp.status);
  const bcaJson = await bcaResp.json().catch(() => ({}));
  console.log("bca-admin stats:", bcaJson);
}

run().catch(console.error);
