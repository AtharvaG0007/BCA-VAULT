import { createClient } from "@supabase/supabase-js";
import fs from "fs";

const envContent = fs.readFileSync(".env", "utf-8");
const env = {};
envContent.split("\n").forEach((line) => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) env[match[1].trim()] = match[2].trim().replace(/^['"]|['"]$/g, "");
});

const admin = createClient(env.SUPABASE_URL, env.SUPABASE_SECRET_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function run() {
  const mathItems = [
    {
      subject_id: "mathematics",
      title: "Discrete Mathematics & BCA Semester 1 Exam Master Guide",
      description: "Exam answer writing framework and high-scoring structure for BCA Semester 1 Mathematics",
      storage_bucket: "Bca_notes",
      storage_path: "BCA SEM1/BCA_Vault_How_to_Write_Answers_in_Exams.pdf",
      published: true,
    },
    {
      subject_id: "mathematics",
      title: "Most Repeated Topics & Questions — BCA Semester 1",
      description: "Essential repeated questions and exam patterns for BCA Semester 1 subjects",
      storage_bucket: "Bca_notes",
      storage_path: "BCA SEM1/bca_sem1_most_repeated_questions_complete.pdf",
      published: true,
    },
  ];

  const { data, error } = await admin.from("exam_kit_content").upsert(mathItems, {
    onConflict: "subject_id,storage_bucket,storage_path",
  }).select();

  console.log("Seeded mathematics items:", data?.length, "error:", error);
}

run().catch(console.error);
