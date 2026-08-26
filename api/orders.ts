import type { VercelRequest, VercelResponse } from "@vercel/node";
import { requireAdmin } from "./_adminSession";

const SCRIPT_URL   = process.env.APPS_SCRIPT_URL    ?? "";
const ADMIN_SECRET = process.env.APPS_SCRIPT_SECRET ?? "";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const caller = requireAdmin(req, res);
  if (!caller) return;

  if (!SCRIPT_URL) {
    return res.status(200).json({ orders: [] });
  }

  try {
    const url = `${SCRIPT_URL}?action=getOrders&secret=${encodeURIComponent(ADMIN_SECRET)}`;
    const upstream = await fetch(url);
    if (!upstream.ok) throw new Error("Failed to fetch orders from Google Sheets");
    const data = await upstream.json();
    return res.status(200).json({ orders: data.orders ?? [] });
  } catch (err: any) {
    console.error("[API/orders]", err);
    return res.status(500).json({ error: err.message ?? "Internal server error" });
  }
}
