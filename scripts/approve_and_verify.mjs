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
const client = createClient(supabaseUrl, anonKey);

async function run() {
  console.log("Signing in as gogawaleatharva@gmail.com...");
  const { data: auth, error: authErr } = await client.auth.signInWithPassword({
    email: "gogawaleatharva@gmail.com",
    password: "athgo7002",
  });

  if (authErr || !auth?.session) {
    console.error("Sign in failed:", authErr);
    return;
  }

  const token = auth.session.access_token;
  console.log("Sign-in OK!");

  // Approve the single subject order: e16a8760-f9a5-4a8e-a350-906617816f5e
  console.log("\nApproving order e16a8760-f9a5-4a8e-a350-906617816f5e (Single Subject)...");
  const reviewResp = await fetch(`${supabaseUrl}/functions/v1/exam-kits`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: anonKey,
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      action: "admin-review",
      order_id: "e16a8760-f9a5-4a8e-a350-906617816f5e",
      decision: "approved",
      admin_notes: "Verified payment via UPI UTR 12345678910",
    }),
  });

  const reviewJson = await reviewResp.json();
  console.log("Review status:", reviewResp.status);
  console.log("Review result:", JSON.stringify(reviewJson, null, 2));

  // Now check student's my-orders
  console.log("\nChecking student's my-orders...");
  const ordersResp = await fetch(`${supabaseUrl}/functions/v1/exam-kits`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: anonKey,
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ action: "my-orders" }),
  });
  const ordersJson = await ordersResp.json();
  console.log("my-orders:", JSON.stringify(ordersJson, null, 2));

  // Now check student's my-content for all subjects
  for (const subj of ["foundation", "algorithms", "client-side", "mathematics"]) {
    const contentResp = await fetch(`${supabaseUrl}/functions/v1/exam-kits`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: anonKey,
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ action: "my-content", subject_id: subj }),
    });
    const contentJson = await contentResp.json();
    console.log(`Content for ${subj}: status ${contentResp.status}, items: ${contentJson.content?.length ?? 0}`);
  }
}

run().catch(console.error);
