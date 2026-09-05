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
const secretKey = env["SUPABASE_SECRET_KEY"] || "";

const adminClient = createClient(supabaseUrl, secretKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  const { data: bundles } = await adminClient.from("bundles").select("*");
  const sem1Bundle = bundles?.find(b => b.title.toLowerCase().includes("sem") && b.title.includes("1")) || bundles?.[0];
  console.log("Semester 1 Bundle ID:", sem1Bundle?.id, sem1Bundle?.title);

  const noteData = {
    bundle_id: sem1Bundle?.id,
    title: "Most Repeated Questions & Topics — BCA Semester 1",
    subject: "Foundation of Computing • C Programming • HTML • CSS • JavaScript",
    semester: 1,
    description: "Exam-focused most repeated questions and topics for BCA Semester 1, covering Foundation of Computing, C Programming, HTML, CSS and JavaScript.",
    storage_bucket: "Bca_notes",
    storage_path: "BCA SEM1/bca_sem1_most_repeated_questions_complete.pdf",
    published: true,
    priority: "high",
    status: "published",
  };

  const { data: upsertedNote, error: upsertErr } = await adminClient
    .from("notes")
    .upsert(noteData, { onConflict: "storage_path" })
    .select()
    .single();

  if (upsertErr) {
    console.error("Upsert note error:", upsertErr);
  } else {
    console.log("Successfully upserted Most Repeated Questions note:", upsertedNote);
  }
}

main().catch(console.error);
