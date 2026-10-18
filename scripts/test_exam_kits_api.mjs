import assert from "node:assert/strict";

const endpoint = "https://dmxegktlxqsxaysqwswa.supabase.co/functions/v1/exam-kits";
const cases = [
  { action: "create-order", body: { subjects: ["foundation"], plan_type: "single", full_name: "Smoke Test", email: "nobody@example.invalid", phone: "9999999999" } },
  { action: "admin-list", body: {} },
  { action: "my-orders", body: {} },
  { action: "my-content", body: { subject_id: "foundation" } },
  { action: "admin-review", body: { order_id: "00000000-0000-0000-0000-000000000000", decision: "approved" } },
];
const options = await fetch(endpoint, { method: "OPTIONS", headers: { Origin: "https://bca-vault-exam-kits.portalbcavault.workers.dev" } });
assert.equal(options.status, 200, "CORS preflight should be accepted");
assert.ok(options.headers.get("access-control-allow-methods")?.includes("POST"), "CORS should allow POST");
for (const item of cases) {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: item.action, ...item.body }),
  });
  assert.equal(response.status, 401, `${item.action} must reject unauthenticated requests (received ${response.status})`);
  const data = await response.json();
  assert.equal(data.success, false, `${item.action} should return a safe error envelope`);
}
console.log(`Exam Kits live API smoke tests passed: CORS preflight + ${cases.length} unauthenticated-action checks.`);
