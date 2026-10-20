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
  console.log("Setting order EK-18E31F0DB356 to pending_review for testing...");
  const { data, error } = await admin
    .from("exam_kit_orders")
    .update({
      status: "pending_review",
      verified_by: null,
      verified_at: null,
      admin_notes: null,
    })
    .eq("order_code", "EK-18E31F0DB356")
    .select();
  console.log("Result:", data, "Error:", error);

  // Also remove the single-subject foundation entitlement for this test order
  await admin
    .from("exam_kit_entitlements")
    .delete()
    .eq("order_id", "e16a8760-f9a5-4a8e-a350-906617816f5e");
}

run().catch(console.error);
