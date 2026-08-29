import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

const envPath = path.resolve(process.cwd(), ".env");
const envContent = fs.readFileSync(envPath, "utf-8");
const env: Record<string, string> = {};
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

async function testStudentSession() {
  const adminClient = createClient(supabaseUrl, secretKey);
  const studentClient = createClient(supabaseUrl, anonKey);

  // Generate magic link for the student
  const { data: linkData, error: linkErr } = await adminClient.auth.admin.generateLink({
    type: "magiclink",
    email: "gogawaleatharva997@gmai.com",
  });

  if (linkErr || !linkData.properties?.hashed_token) {
    console.error("Magic link error:", linkErr);
    return;
  }

  // Verify OTP to get real student session token
  const { data: sessionData, error: sessionErr } = await studentClient.auth.verifyOtp({
    token_hash: linkData.properties.hashed_token,
    type: "magiclink",
  });

  if (sessionErr || !sessionData.session) {
    console.error("Session error:", sessionErr);
    return;
  }

  const accessToken = sessionData.session.access_token;
  console.log("Authenticated as student! User ID:", sessionData.user?.id);

  // 1. Test fetching bundles with student client
  const { data: bundles, error: bundlesErr } = await studentClient.from("bundles").select("id,title,price,published");
  console.log("\nStudent fetch bundles:", bundles, bundlesErr);

  // 2. Test fetching access permissions with student client
  const { data: access, error: accessErr } = await studentClient.from("access_permissions").select("id,bundle_id,status,bundles(title,price)");
  console.log("\nStudent fetch access permissions:", access, accessErr);

  // 3. Test fetching notes with student client (RLS policy check)
  const { data: notes, error: notesErr } = await studentClient.from("notes").select("id,title,subject,semester,storage_bucket,storage_path,published");
  console.log("\nStudent fetch notes:", notes, notesErr);

  // 4. Test calling make-server-6704fe8f/downloads with student access token
  const dlRes = await fetch(`${supabaseUrl}/functions/v1/make-server-6704fe8f/downloads`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": anonKey,
      "Authorization": `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      bucket: "Bca_notes",
      fileRef: "BCA SEM1/C_Programming_Complete_Notes.pdf",
    }),
  });
  console.log("\nmake-server /downloads status:", dlRes.status);
  console.log("make-server /downloads body:", await dlRes.json().catch(() => ({})));

  // 5. Test direct storage createSignedUrl with student client
  const { data: signDirect, error: signDirectErr } = await studentClient.storage
    .from("Bca_notes")
    .createSignedUrl("BCA SEM1/C_Programming_Complete_Notes.pdf", 300);
  console.log("\nDirect studentClient.storage.createSignedUrl:", signDirect, signDirectErr);
}

testStudentSession().catch(console.error);
