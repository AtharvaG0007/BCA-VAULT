import type { VercelRequest, VercelResponse } from "@vercel/node";
import { clearAdminSession } from "../_adminSession";

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  clearAdminSession(res);
  return res.status(200).json({ authenticated: false });
}
