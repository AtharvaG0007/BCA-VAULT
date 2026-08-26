import { supabase } from "./client";
export const TERMS_VERSION = "1.0.0";
export const PRIVACY_VERSION = "1.0.0";
export const LEGAL_STORAGE_KEY = `bca-vault-legal-v${TERMS_VERSION}`;
export async function saveLegalAcceptance(userId: string) {
  const { error } = await supabase.from("legal_acceptances").upsert({ user_id: userId, terms_version: TERMS_VERSION, privacy_version: PRIVACY_VERSION, accepted_at: new Date().toISOString() });
  if (error) throw error;
}
export function checkLocalAcceptance() { try { return localStorage.getItem(LEGAL_STORAGE_KEY) === "accepted"; } catch { return false; } }
export function setLocalAcceptance() { try { localStorage.setItem(LEGAL_STORAGE_KEY, "accepted"); } catch { /* unavailable */ } }
