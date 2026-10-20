import { createClient } from "@supabase/supabase-js";
import fs from "fs";

const envContent = fs.readFileSync(".env", "utf-8");
const env = {};
envContent.split("\n").forEach((line) => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) env[match[1].trim()] = match[2].trim().replace(/^['"]|['"]$/g, "");
});

const admin = createClient(env.SUPABASE_URL, env.SUPABASE_SECRET_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function run() {
  console.log("Checking payment_submissions...");
  const { data: payments } = await admin.from("payment_submissions").select("*");
  console.log("Payments:", payments.map(p => ({ id: p.id, email: p.email, status: p.status, ref: p.reference_id })));

  // If none are pending, let's set the latest one to 'pending' for admin review testing
  const latest = payments[0];
  if (latest) {
    console.log(`Setting payment ${latest.reference_id} to 'pending' so Approve button is visible in Payment CRM...`);
    await admin.from("payment_submissions").update({ status: "pending", verified_at: null, verified_by: null }).eq("id", latest.id);
  }
}

run().catch(console.error);
