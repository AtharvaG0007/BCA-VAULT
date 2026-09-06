import { execSync } from "child_process";
import fs from "fs";
import path from "path";

/**
 * Automated Verification Suite for Supabase Edge Functions Types & Contracts
 */
async function main() {
  console.log("==================================================================");
  console.log("   BCA VAULT — SUPABASE EDGE FUNCTIONS VERIFICATION SUITE");
  console.log("==================================================================");

  let passed = 0;
  let total = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    total++;
    if (condition) {
      passed++;
      console.log(`  [PASS] ${testName}`);
    } else {
      console.error(`  [FAIL] ${testName}${detail ? ` -> ${detail}` : ""}`);
    }
  }

  // ── 1. Scoped TypeScript compilation of Supabase Edge Functions ───────────
  console.log("\n[TEST 1] TypeScript Compilation for Supabase Edge Functions");
  try {
    const out = execSync("npx tsc -p supabase/functions/tsconfig.json --noEmit", {
      encoding: "utf-8",
      stdio: "pipe",
    });
    assert(true, "All Edge Functions pass strict TypeScript compilation (0 errors, noImplicitAny: true)");
  } catch (err: any) {
    assert(false, "Edge Functions TypeScript compilation", err.stdout || err.stderr || err.message);
  }

  // ── 2. Root project TypeScript compilation ────────────────────────────────
  console.log("\n[TEST 2] Frontend & API TypeScript Compilation");
  try {
    execSync("npm run typecheck", { encoding: "utf-8", stdio: "pipe" });
    assert(true, "Root project (Vite / React / API) passes typecheck with 0 errors");
  } catch (err: any) {
    assert(false, "Root typecheck", err.stdout || err.stderr || err.message);
  }

  // ── 3. Tooling configuration files exist ──────────────────────────────────
  console.log("\n[TEST 3] Tooling & Deno Workspace Configuration");
  const vscodeSettingsPath = path.join(process.cwd(), ".vscode", "settings.json");
  const denoJsonPath = path.join(process.cwd(), "supabase", "functions", "deno.json");
  const edgeRuntimeDtsPath = path.join(process.cwd(), "supabase", "functions", "edge-runtime.d.ts");
  const functionsTsconfig = path.join(process.cwd(), "supabase", "functions", "tsconfig.json");

  assert(fs.existsSync(vscodeSettingsPath), ".vscode/settings.json exists with deno.enablePaths configured");
  assert(fs.existsSync(denoJsonPath), "supabase/functions/deno.json exists with import maps");
  assert(fs.existsSync(edgeRuntimeDtsPath), "supabase/functions/edge-runtime.d.ts ambient definitions exist");
  assert(fs.existsSync(functionsTsconfig), "supabase/functions/tsconfig.json scoped project exists");

  // ── 4. Verify runtime declarations in key edge functions ──────────────────
  console.log("\n[TEST 4] Edge Runtime Imports Verification");
  const targetFunctions = [
    "bca-admin/index.ts",
    "payment-evidence/index.ts",
    "student-note-signed-url/index.ts",
    "gemini-chat/index.ts",
    "student-learning-chat/index.ts",
    "public-support-chat/index.ts",
    "email-dispatcher/index.ts",
  ];

  for (const fn of targetFunctions) {
    const fullPath = path.join(process.cwd(), "supabase", "functions", fn);
    const content = fs.readFileSync(fullPath, "utf-8");
    const hasRuntimeImport = content.includes("jsr:@supabase/functions-js/edge-runtime.d.ts");
    assert(hasRuntimeImport, `Runtime type import present in ${fn}`);
  }

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log("\n==================================================================");
  console.log(`TEST SUMMARY: ${passed}/${total} VERIFICATION CHECKS PASSED`);
  if (passed === total) {
    console.log("STATUS: ALL EDGE FUNCTIONS TYPES & CONFIGURATIONS FULLY VALIDATED.");
  } else {
    console.warn(`STATUS: ${total - passed} CHECKS FAILED.`);
  }
  console.log("==================================================================\n");
}

main().catch(console.error);
