import type { VercelRequest, VercelResponse } from "@vercel/node";
import { requireAdmin } from "./_adminSession";

const SCRIPT_URL   = process.env.APPS_SCRIPT_URL    ?? "";
const ADMIN_SECRET = process.env.APPS_SCRIPT_SECRET ?? "";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const caller = requireAdmin(req, res);
  if (!caller) return;

  const { orderId, status } = req.body as { orderId?: string; status?: string };

  if (!orderId || !status) {
    return res.status(400).json({ error: "orderId and status are required" });
  }

  const allowedStatuses = ["Approved", "Rejected", "NotesSent"];
  if (!allowedStatuses.includes(status)) {
    return res.status(400).json({ error: `status must be one of: ${allowedStatuses.join(", ")}` });
  }

  if (!SCRIPT_URL) {
    return res.status(200).json({ success: true });
  }

  try {
    const upstream = await fetch(SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ action: "updateStatus", orderId, status, secret: ADMIN_SECRET }),
    });
    if (!upstream.ok) throw new Error("Failed to update order status");
    return res.status(200).json({ success: true });
  } catch (err: any) {
    console.error("[API/update-order]", err);
    return res.status(500).json({ error: err.message ?? "Internal server error" });
  }
}
