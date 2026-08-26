import type { VercelRequest, VercelResponse } from "@vercel/node";
import { publicError, requireAdmin, supabaseAdmin } from "../_supabaseAdmin";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const caller = await requireAdmin(req, res);
  if (!caller) return;
  const client = supabaseAdmin();
  try {
    if (req.method === "GET") {
      const { data, error } = await client.from("payment_submissions").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return res.status(200).json({ submissions: data ?? [] });
    }
    if (req.method !== "PATCH") return res.status(405).json({ error: "Method not allowed" });
    const { id, status, adminNotes } = req.body ?? {};
    if (typeof id !== "string" || (status !== "approved" && status !== "rejected")) return res.status(400).json({ error: "A payment id and an approved or rejected status are required." });
    const { data, error } = await client.from("payment_submissions").update({ status, admin_notes: typeof adminNotes === "string" ? adminNotes.slice(0, 1000) : null, verified_at: new Date().toISOString(), verified_by: caller.user.id }).eq("id", id).select().single();
    if (error) throw error;
    await client.from("activity_logs").insert({ actor_id: caller.user.id, action: `payment_${status}`, target_type: "payment_submission", target_id: id });
    return res.status(200).json({ submission: data });
  } catch (error) { return res.status(500).json({ error: publicError(error) }); }
}
