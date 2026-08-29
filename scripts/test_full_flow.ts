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

async function testFullFlow() {
  const adminClient = createClient(supabaseUrl, secretKey);
  const studentClient = createClient(supabaseUrl, anonKey);

  // Authenticate student
  const { data: linkData } = await adminClient.auth.admin.generateLink({
    type: "magiclink",
    email: "gogawaleatharva997@gmai.com",
  });
  const { data: sessionData } = await studentClient.auth.verifyOtp({
    token_hash: linkData.properties!.hashed_token,
    type: "magiclink",
  });

  const studentToken = sessionData.session!.access_token;
  console.log("Logged in as student:", sessionData.user?.email);

  // 1. Fetch authorized notes
  const { data: notes, error: notesErr } = await studentClient
    .from("notes")
    .select("id,title,storage_bucket,storage_path")
    .eq("published", true);
  console.log("Notes fetched by student:", notes, notesErr);

  // 2. Open each note using /downloads endpoint
  for (const n of notes || []) {
    console.log(`\nOpening note: ${n.title}`);
    const res = await fetch(`${supabaseUrl}/functions/v1/make-server-6704fe8f/downloads`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": anonKey,
        "Authorization": `Bearer ${studentToken}`,
      },
      body: JSON.stringify({
        bucket: n.storage_bucket,
        fileRef: n.storage_path,
      }),
    });

    const json = await res.json();
    console.log(`Status: ${res.status}`);
    console.log(`Signed URL returned: ${json.signedUrl ? "YES (" + json.signedUrl.slice(0, 70) + "...)" : "NO"}`);

    if (json.signedUrl) {
      // 3. Verify that fetching the signed URL returns the PDF content
      const pdfRes = await fetch(json.signedUrl, { method: "HEAD" });
      console.log(`PDF HEAD status: ${pdfRes.status}, Content-Type: ${pdfRes.headers.get("content-type")}, Content-Length: ${pdfRes.headers.get("content-length")}`);
    }
  }
}

testFullFlow().catch(console.error);
