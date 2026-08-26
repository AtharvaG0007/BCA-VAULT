import type { VercelRequest, VercelResponse } from "@vercel/node";
import { authenticateCredentials, startAdminSession } from "../_adminSession";

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  try {
    const { email, password } = req.body ?? {};
    const role = authenticateCredentials(email, password);
    if (!role) return res.status(401).json({ error: "Invalid credentials" });
    const session = startAdminSession(res, role, email.trim().toLowerCase());
    return res.status(200).json({ authenticated: true, role: session.role });
  } catch (error) {
    console.error("[API/admin/login]", error instanceof Error ? error.message : "Configuration error");
    return res.status(500).json({ error: "Server configuration error" });
  }
}
