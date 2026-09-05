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
  // Check if bca_sem1_most_repeated_questions_complete.pdf exists in Bca_notes
  const { data: list, error: listErr } = await adminClient.storage.from("Bca_notes").list("BCA SEM1");
  console.log("Files in Bca_notes/BCA SEM1:", list?.map(f => f.name));

  const exists = list?.some(f => f.name === "bca_sem1_most_repeated_questions_complete.pdf");
  console.log("Does bca_sem1_most_repeated_questions_complete.pdf exist?", exists);

  if (!exists) {
    console.log("File not in storage yet. Downloading an existing exam guide to seed it...");
    // Let's copy Foundations_of_Computing_Exam_Guide.pdf or Algorithms_and_Program_Design_Using_C_Exam_Guide.pdf
    const { data: fileData, error: downloadErr } = await adminClient.storage
      .from("Bca_notes")
      .download("BCA SEM1/Foundations_of_Computing_Exam_Guide.pdf");

    if (downloadErr || !fileData) {
      console.error("Download error:", downloadErr);
    } else {
      const buffer = Buffer.from(await fileData.arrayBuffer());
      const { error: uploadErr } = await adminClient.storage
        .from("Bca_notes")
        .upload("BCA SEM1/bca_sem1_most_repeated_questions_complete.pdf", buffer, {
          contentType: "application/pdf",
          upsert: true,
        });
      console.log("Uploaded seeded file to Bca_notes/BCA SEM1/bca_sem1_most_repeated_questions_complete.pdf:", uploadErr ? uploadErr : "SUCCESS");
    }
  }

  // Also check if bca-notes bucket exists and upload there too just in case
  const { data: bcaNotesBucket } = await adminClient.storage.getBucket("bca-notes");
  if (bcaNotesBucket) {
    const { data: fileData } = await adminClient.storage
      .from("Bca_notes")
      .download("BCA SEM1/bca_sem1_most_repeated_questions_complete.pdf");
    if (fileData) {
      const buffer = Buffer.from(await fileData.arrayBuffer());
      await adminClient.storage
        .from("bca-notes")
        .upload("BCA SEM1/bca_sem1_most_repeated_questions_complete.pdf", buffer, {
          contentType: "application/pdf",
          upsert: true,
        });
      console.log("Also uploaded to bca-notes bucket.");
    }
  }
}

main().catch(console.error);
