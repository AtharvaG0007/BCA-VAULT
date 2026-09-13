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

const ROADMAP_RECORDS = [
  {
    title: "BCA Vault — C Programming Exam Roadmap",
    subject: "Algorithms and Program Design using C",
    semester: 1,
    description:
      "Complete Semester 1 exam preparation roadmap for Algorithms and Program Design using C. Includes syllabus order, priority topics, study method, 15-day, 7-day, 3-day and final revision plans.",
    storage_bucket: "Bca_notes",
    storage_path: "BCA SEM1/BCA_Vault_C_Programming_Exam_Roadmap_Sem1.pdf",
    published: true,
    bundle_id: EXPECTED_BUNDLE_ID,
    priority: "critical",
    status: "published",
  },
  {
    title: "BCA Vault — Foundations of Computing Exam Roadmap",
    subject: "Foundation of Computing",
    semester: 1,
    description:
      "Complete Semester 1 exam preparation roadmap for Foundations of Computing. Includes syllabus order, priority topics, study method, 15-day, 7-day, 3-day and final revision plans.",
    storage_bucket: "Bca_notes",
    storage_path: "BCA SEM1/BCA_Vault_Foundations_of_Computing_Exam_Roadmap_Sem1.pdf",
    published: true,
    bundle_id: EXPECTED_BUNDLE_ID,
    priority: "critical",
    status: "published",
  },
  {
    title: "BCA Vault — Client-Side Web Technologies Exam Roadmap",
    subject: "Client-Side Web Technology",
    semester: 1,
    description:
      "Complete Semester 1 exam preparation roadmap for Client-Side Web Technologies covering HTML, CSS and JavaScript. Includes syllabus order, priority topics, study method, 15-day, 7-day, 3-day and final revision plans.",
    storage_bucket: "Bca_notes",
    storage_path: "BCA SEM1/BCA_Vault_Client_Side_Web_Technologies_Exam_Roadmap_Sem1.pdf",
    published: true,
    bundle_id: EXPECTED_BUNDLE_ID,
    priority: "critical",
    status: "published",
  },
];

async function main() {
  console.log("==================================================");
  console.log("STEP 1: Verify bundle existence");
  console.log("==================================================");
  const { data: bundle, error: bundleErr } = await adminClient
    .from("bundles")
    .select("id, title, price, published")
    .eq("id", EXPECTED_BUNDLE_ID)
    .single();

  if (bundleErr || !bundle) {
    console.error("Bundle verification failed:", bundleErr);
    process.exit(1);
  }
  console.log(`Verified Bundle: "${bundle.title}" (ID: ${bundle.id}, Price: ₹${bundle.price}, Published: ${bundle.published})`);

  console.log("\n==================================================");
  console.log("STEP 2: Verify storage files in bucket 'Bca_notes'");
  console.log("==================================================");
  for (const record of ROADMAP_RECORDS) {
    const fileName = record.storage_path.replace("BCA SEM1/", "");
    const { data: fileList, error: listErr } = await adminClient.storage
      .from(record.storage_bucket)
      .list("BCA SEM1", { search: fileName });

    if (listErr) {
      console.error(`Storage list error for ${record.storage_path}:`, listErr);
      process.exit(1);
    }
    const exists = fileList?.some((f) => f.name === fileName);
    if (!exists) {
      console.error(`FATAL: File ${record.storage_path} does not exist in bucket ${record.storage_bucket}!`);
      process.exit(1);
    }
    console.log(`✓ Storage file exists: ${record.storage_bucket}/${record.storage_path}`);
  }

  console.log("\n==================================================");
  console.log("STEP 3: Register/Upsert notes into public.notes");
  console.log("==================================================");
  for (const record of ROADMAP_RECORDS) {
    // Check by storage_path first
    const { data: existing } = await adminClient
      .from("notes")
      .select("id, title, storage_path")
      .eq("storage_path", record.storage_path)
      .maybeSingle();

    if (existing) {
      console.log(`Record already exists for path "${record.storage_path}" (ID: ${existing.id}). Updating to ensure consistency...`);
    } else {
      console.log(`Inserting new record for path "${record.storage_path}"...`);
    }

    const { data: upserted, error: upsertErr } = await adminClient
      .from("notes")
      .upsert(record, { onConflict: "storage_path" })
      .select()
      .single();

    if (upsertErr) {
      console.error(`Failed to upsert note "${record.title}":`, upsertErr);
      process.exit(1);
    }
    console.log(`✓ Note registered successfully: ID=${upserted.id} | Title="${upserted.title}" | Path="${upserted.storage_path}"`);
  }

  console.log("\n==================================================");
  console.log("STEP 4: Verify exactly 3 roadmap records in public.notes");
  console.log("==================================================");
  const { data: verifiedNotes, error: verifyErr } = await adminClient
    .from("notes")
    .select("id, title, subject, semester, storage_bucket, storage_path, published, bundle_id, priority, status")
    .in(
      "storage_path",
      ROADMAP_RECORDS.map((r) => r.storage_path)
    )
    .order("title");

  if (verifyErr) {
    console.error("Verification query error:", verifyErr);
    process.exit(1);
  }

  console.log(`Found ${verifiedNotes?.length} roadmap records:`);
  console.table(verifiedNotes);

  if (verifiedNotes?.length !== 3) {
    console.error(`Expected exactly 3 records, found ${verifiedNotes?.length}!`);
    process.exit(1);
  }

  // Double check all fields
  for (const note of verifiedNotes) {
    if (note.semester !== 1) throw new Error(`Invalid semester for ${note.title}: ${note.semester}`);
    if (note.published !== true) throw new Error(`Note not published: ${note.title}`);
    if (note.status !== "published") throw new Error(`Invalid status: ${note.status}`);
    if (note.priority !== "critical") throw new Error(`Invalid priority: ${note.priority}`);
    if (note.bundle_id !== EXPECTED_BUNDLE_ID) throw new Error(`Invalid bundle_id: ${note.bundle_id}`);
    if (note.storage_bucket !== "Bca_notes") throw new Error(`Invalid storage_bucket: ${note.storage_bucket}`);
  }

  console.log("\n==================================================");
  console.log("STEP 5: Test signed URL generation for all 3 roadmaps");
  console.log("==================================================");
  for (const note of verifiedNotes) {
    const { data: signed, error: signErr } = await adminClient.storage
      .from(note.storage_bucket)
      .createSignedUrl(note.storage_path, 180);

    if (signErr || !signed?.signedUrl) {
      console.error(`Signed URL generation failed for ${note.title}:`, signErr);
      process.exit(1);
    }
    console.log(`✓ Signed URL generated for "${note.title}": expires in 180s`);
  }

  console.log("\nALL DATABASE AND STORAGE CHECKS PASSED PERFECTLY!");
}

main().catch((err) => {
  console.error("Script execution failed:", err);
  process.exit(1);
});
