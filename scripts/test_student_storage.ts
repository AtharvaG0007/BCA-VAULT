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

async function testStudentClient() {
  const adminClient = createClient(supabaseUrl, secretKey);
  
  // 1. Generate an auth token for the student (or sign in as student)
  // Let's generate a custom access token or sign in via admin auth api
  const { data: linkData, error: linkErr } = await adminClient.auth.admin.generateLink({
    type: "magiclink",
    email: "gogawaleatharva997@gmai.com",
  });
  console.log("Magic link gen:", linkErr || "Success");

  // Let's check storage RLS policies in pg_catalog or storage.objects
  const { data: storagePolicies, error: polErr } = await adminClient
    .from("pg_policies")
    .select("*")
    .eq("schemaname", "storage");
  console.log("Storage policies:", storagePolicies, polErr);

  // Let's test client storage createSignedUrl with anon client vs student client
  const studentClient = createClient(supabaseUrl, anonKey);
  
  // Test direct storage sign with anon client
  const { data: anonSigned, error: anonSignErr } = await studentClient.storage
    .from("Bca_notes")
    .createSignedUrl("BCA SEM1/C_Programming_Complete_Notes.pdf", 300);
  console.log("Anon client createSignedUrl:", anonSigned, anonSignErr);
}

testStudentClient().catch(console.error);
