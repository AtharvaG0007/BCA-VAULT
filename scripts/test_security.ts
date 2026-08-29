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

async function testSecurityScenarios() {
  const adminClient = createClient(supabaseUrl, secretKey);
  const anonClient = createClient(supabaseUrl, anonKey);

  // Scenario 1: Request with no auth token
  const res1 = await fetch(`${supabaseUrl}/functions/v1/make-server-6704fe8f/downloads`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": anonKey,
    },
    body: JSON.stringify({
      bucket: "Bca_notes",
      fileRef: "BCA SEM1/C_Programming_Complete_Notes.pdf",
    }),
  });
  console.log("No token request status:", res1.status); // Expect 401

  // Scenario 2: Request with fake token
  const res2 = await fetch(`${supabaseUrl}/functions/v1/make-server-6704fe8f/downloads`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": anonKey,
      "Authorization": "Bearer fake_invalid_jwt_token_12345",
    },
    body: JSON.stringify({
      bucket: "Bca_notes",
      fileRef: "BCA SEM1/C_Programming_Complete_Notes.pdf",
    }),
  });
  console.log("Fake token request status:", res2.status); // Expect 401

  // Scenario 3: Request for non-existent file with valid student session
  const { data: linkData } = await adminClient.auth.admin.generateLink({
    type: "magiclink",
    email: "gogawaleatharva997@gmai.com",
  });
  const { data: sessionData } = await anonClient.auth.verifyOtp({
    token_hash: linkData.properties!.hashed_token,
    type: "magiclink",
  });
  const token = sessionData.session!.access_token;

  const res3 = await fetch(`${supabaseUrl}/functions/v1/make-server-6704fe8f/downloads`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": anonKey,
      "Authorization": `Bearer ${token}`,
    },
    body: JSON.stringify({
      bucket: "Bca_notes",
      fileRef: "BCA SEM1/non_existent_file.pdf",
    }),
  });
  console.log("Non-existent file request status:", res3.status, await res3.json().catch(() => ({})));
}

testSecurityScenarios().catch(console.error);
