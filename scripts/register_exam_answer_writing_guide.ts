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

const EXPECTED_BUNDLE_ID = "5b36f72a-165c-4cd1-8458-d4f33fadd860";
const STORAGE_BUCKET = "Bca_notes";
const STORAGE_PATH = "BCA SEM1/BCA_Vault_How_to_Write_Answers_in_Exams.pdf";

const RECORD = {
  title: "BCA Vault — How to Write Answers in Exams",
  subject: "BCA Semester 1 Exam Preparation",
  semester: 1,
  description:
    "A simple guide to writing clear and well-structured answers in BCA Semester 1 exams, including theory answers, programming questions, short notes, examples, diagrams, presentation and answer-writing techniques.",
  storage_bucket: STORAGE_BUCKET,
  storage_path: STORAGE_PATH,
  published: true,
  bundle_id: EXPECTED_BUNDLE_ID,
  priority: "critical",
  status: "published",
};

async function main() {
  console.log("==================================================");
  console.log("STEP 1: Verify storage file in bucket 'Bca_notes'");
  console.log("==================================================");
  const { data: fileList, error: listErr } = await adminClient.storage
    .from(STORAGE_BUCKET)
    .list("BCA SEM1", { limit: 100 });

  if (listErr) {
    console.error("Storage list error:", listErr);
    process.exit(1);
  }

  const fileName = "BCA_Vault_How_to_Write_Answers_in_Exams.pdf";
  const exists = fileList?.some((f) => f.name === fileName);
  if (!exists) {
    console.error(`FATAL: File ${fileName} not found in ${STORAGE_BUCKET}/BCA SEM1!`);
    process.exit(1);
  }
  console.log(`✓ Storage file exists: ${STORAGE_BUCKET}/${STORAGE_PATH}`);

  console.log("\n==================================================");
  console.log("STEP 2: Register/Upsert note into public.notes");
  console.log("==================================================");
  const { data: existing } = await adminClient
    .from("notes")
    .select("id, title, storage_path")
    .eq("storage_path", STORAGE_PATH)
    .maybeSingle();

  if (existing) {
    console.log(`Record already exists with ID ${existing.id}. Updating...`);
  } else {
    console.log("Inserting new note record...");
  }

  const { data: upserted, error: upsertErr } = await adminClient
    .from("notes")
    .upsert(RECORD, { onConflict: "storage_path" })
    .select()
    .single();

  if (upsertErr) {
    console.error("Upsert error:", upsertErr);
    process.exit(1);
  }

  console.log(`✓ Note registered successfully: ID=${upserted.id} | Title="${upserted.title}"`);

  console.log("\n==================================================");
  console.log("STEP 3: Verify single note in public.notes");
  console.log("==================================================");
  const { data: verified, error: verifyErr } = await adminClient
    .from("notes")
    .select("id, title, subject, semester, storage_bucket, storage_path, published, bundle_id, priority, status")
    .eq("storage_path", STORAGE_PATH);

  if (verifyErr || !verified || verified.length !== 1) {
    console.error(`Expected exactly 1 record, found ${verified?.length}:`, verifyErr);
    process.exit(1);
  }

  const note = verified[0];
  console.table([note]);

  if (note.semester !== 1) throw new Error("Semester is not 1");
  if (!note.published) throw new Error("Note is not published");
  if (note.status !== "published") throw new Error("Status is not published");
  if (note.priority !== "critical") throw new Error("Priority is not critical");
  if (note.bundle_id !== EXPECTED_BUNDLE_ID) throw new Error("Bundle ID mismatch");
  if (note.storage_bucket !== STORAGE_BUCKET) throw new Error("Storage bucket mismatch");

  console.log("\n==================================================");
  console.log("STEP 4: Test signed URL generation");
  console.log("==================================================");
  const { data: signed, error: signErr } = await adminClient.storage
    .from(STORAGE_BUCKET)
    .createSignedUrl(STORAGE_PATH, 180);

  if (signErr || !signed?.signedUrl) {
    console.error("Signed URL creation failed:", signErr);
    process.exit(1);
  }
  console.log(`✓ Signed URL verified: expires in 180s (${signed.signedUrl.slice(0, 60)}...)`);

  console.log("\nALL VERIFICATIONS PASSED PERFECTLY!");
}

main().catch((err) => {
  console.error("Script failed:", err);
  process.exit(1);
});
