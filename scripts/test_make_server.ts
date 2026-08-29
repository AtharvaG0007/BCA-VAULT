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

async function testDownloadEndpoint() {
  const adminClient = createClient(supabaseUrl, secretKey);

  // Sign in as student or create a session for the student
  // Student ID: 321fae2e-515f-4512-8016-881a4b165c16, email: gogawaleatharva997@gmai.com
  // We can generate a token using admin auth
  const { data: user, error: userErr } = await adminClient.auth.admin.getUserById("321fae2e-515f-4512-8016-881a4b165c16");
  console.log("User:", user?.user?.email, "Error:", userErr);

  // Let's test calling make-server-6704fe8f/downloads with the secret key / token
  // Let's see if we can sign a token for the user or test with secret key
  const response = await fetch(`${supabaseUrl}/functions/v1/make-server-6704fe8f/downloads`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": anonKey,
      "Authorization": `Bearer ${secretKey}`,
    },
    body: JSON.stringify({
      bucket: "Bca_notes",
      fileRef: "BCA SEM1/C_Programming_Complete_Notes.pdf",
    }),
  });

  const status = response.status;
  const json = await response.json().catch(() => ({}));
  console.log("make-server /downloads response status:", status);
  console.log("make-server /downloads response body:", json);
}

testDownloadEndpoint().catch(console.error);
