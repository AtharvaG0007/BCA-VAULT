import { useEffect, useState } from "react";
import {
  Gift,
  Copy,
  Check,
  Share2,
  Users,
  Clock,
  CheckCircle2,
  Sparkles,
  BookOpen,
  FileText,
  Flame,
  Download,
  AlertCircle,
  Loader2,
  ShieldCheck,
  ExternalLink
} from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "../auth/AuthContext";
import { adminApi } from "@/lib/supabase/adminService";
import { Button } from "../ui/button";

interface ReferralRow {
  id: string;
  status: string;
  created_at: string;
  successful_at: string | null;
}

interface RewardRow {
  id: string;
  reward_type: string;
  status: string;
  unlocked_at: string | null;
}

interface NoteItem {
  id: string;
  title: string;
  subject: string | null;
  semester: number | null;
  description: string;
  storage_bucket: string;
  storage_path: string;
  priority?: string | null;
}

export function StudentReferralView({
  onOpenNote,
  openingId,
}: {
  onOpenNote: (note: NoteItem) => void;
  openingId: string | null;
}) {
  const { user, appUser } = useAuth();
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [referrals, setReferrals] = useState<ReferralRow[]>([]);
  const [reward, setReward] = useState<RewardRow | null>(null);
  const [rewardNotes, setRewardNotes] = useState<NoteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedMessage, setCopiedMessage] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const REWARD_NOTE_IDS = [
    "33cc389f-4a00-4d3e-89dd-670e514e2ed3", // Foundation of Computing
    "6d971cc5-5677-43f5-958f-add182553c87", // C Programming
    "20af0ae2-66e3-46cb-bbc2-4ae8e12f0500", // HTML + CSS + JavaScript
  ];

  useEffect(() => {
    async function fetchReferralData() {
      if (!user) return;
      setLoading(true);
      setError(null);

      try {
        // 1. Fetch user's referral code from referral_codes
        const { data: codeData, error: codeErr } = await supabase
          .from("referral_codes")
          .select("code, is_active")
          .eq("user_id", user.id)
          .maybeSingle();

        if (codeErr) {
          console.warn("[StudentReferralView] Error fetching referral code:", codeErr);
        }

        if (codeData?.code) {
          setReferralCode(codeData.code);
        } else {
          // If student doesn't have a code row yet, generate one
          const generatedCode = `BV-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
          const { data: newCode, error: insertErr } = await supabase
            .from("referral_codes")
            .insert({
              user_id: user.id,
              code: generatedCode,
              is_active: true,
            })
            .select("code")
            .maybeSingle();

          if (!insertErr && newCode?.code) {
            setReferralCode(newCode.code);
          } else {
            // In case of conflict or policy restriction, retry read
            const { data: retryData } = await supabase
              .from("referral_codes")
              .select("code")
              .eq("user_id", user.id)
              .maybeSingle();
            if (retryData?.code) setReferralCode(retryData.code);
          }
        }

        // 2. Fetch referrals where user is the referrer
        const { data: refs, error: refErr } = await supabase
          .from("referrals")
          .select("id, status, created_at, successful_at")
          .eq("referrer_user_id", user.id)
          .order("created_at", { ascending: false });

        if (!refErr && refs) {
          setReferrals(refs as ReferralRow[]);
        }

        // 3. Fetch user's referral reward status
        const { data: rewardData, error: rewardErr } = await supabase
          .from("referral_rewards")
          .select("id, reward_type, status, unlocked_at")
          .eq("user_id", user.id)
          .eq("reward_type", "most_repeated_questions")
          .maybeSingle();

        if (!rewardErr && rewardData) {
          setReward(rewardData as RewardRow);
        }

        // 4. Fetch the 3 specific Most Repeated Topics notes
        const { data: notesData } = await supabase
          .from("notes")
          .select("id, title, subject, semester, description, storage_bucket, storage_path, priority")
          .in("id", REWARD_NOTE_IDS);

        if (notesData) {
          // Order them logically: Foundation, C Programming, Web Dev
          const ordered = REWARD_NOTE_IDS.map((id) => notesData.find((n) => n.id === id)).filter(Boolean) as NoteItem[];
          setRewardNotes(ordered);
        }
      } catch (err: any) {
        console.error("[StudentReferralView] Load catch:", err);
        setError("Unable to load referral dashboard. Please refresh or try again later.");
      } finally {
        setLoading(false);
      }
    }

    void fetchReferralData();
  }, [user]);

  const copyCode = async () => {
    if (!referralCode) return;
    try {
      await navigator.clipboard.writeText(referralCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2200);
    } catch {
      // fallback
    }
  };

  const shareText = `Hey! Check out BCA Vault for BCA study resources and exam preparation. Use my referral code: ${referralCode || ""}\nhttps://bcavault.in/bundles`;

  const copyShareMessage = async () => {
    try {
      await navigator.clipboard.writeText(shareText);
      setCopiedMessage(true);
      setTimeout(() => setCopiedMessage(false), 2200);
    } catch {
      // fallback
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share && referralCode) {
      try {
        await navigator.share({
          title: "BCA Vault Referral",
          text: `Hey! Check out BCA Vault for BCA study resources. Use my referral code: ${referralCode}`,
          url: "https://bcavault.in/referral",
        });
      } catch {
        // Share cancelled or unsupported
      }
    } else {
      void copyShareMessage();
    }
  };

  const isRewardUnlocked = reward?.status === "unlocked";
  const pendingCount = referrals.filter((r) => r.status === "pending").length;
  const successfulCount = referrals.filter((r) => r.status === "successful").length;

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-12">
        <div className="flex flex-col items-center gap-3 text-slate-500">
          <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
          <p className="text-xs font-semibold">Loading your referral status…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl w-full px-4 py-8 sm:px-6 space-y-8">
      {/* Header */}
      <header className="space-y-1">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200/60 text-indigo-700 text-xs font-bold uppercase tracking-wider">
          <Gift className="w-3.5 h-3.5 text-indigo-600" />
          Student Referral Program
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
          Refer a Friend & Earn Free Study Resources
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 max-w-2xl leading-relaxed">
          Share your referral code with a friend. When they make an eligible BCA Semester 1 purchase and their payment is verified, your <strong className="text-slate-900 font-semibold">Most Repeated Questions</strong> reward is unlocked automatically.
        </p>
      </header>

      {error && (
        <div className="flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-xs font-medium text-red-700">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* ── Personal Referral Code & Share Card ──────────────────────── */}
      <section className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Your Personal Referral Code
            </span>
            <div className="flex items-center gap-3">
              <div className="bg-slate-50 border-2 border-indigo-100 rounded-2xl px-5 py-3 font-mono text-2xl sm:text-3xl font-black text-indigo-700 tracking-wider shadow-inner">
                {referralCode || "Generating…"}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={copyCode}
                disabled={!referralCode}
                className="h-12 px-4 rounded-xl border-slate-200 hover:bg-indigo-50 hover:text-indigo-700 text-xs font-bold gap-2 shadow-xs transition-all"
              >
                {copiedCode ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-600" />
                    <span className="text-emerald-700">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Copy Code</span>
                  </>
                )}
              </Button>
            </div>
            <p className="text-[11px] text-slate-500">
              Friends enter this code during their Semester 1 bundle checkout.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 md:self-end">
            <Button
              onClick={handleNativeShare}
              disabled={!referralCode}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-5 py-3 rounded-xl text-xs gap-2 shadow-md shadow-indigo-600/20"
            >
              <Share2 className="w-4 h-4" />
              <span>Share Code</span>
            </Button>
            <Button
              variant="outline"
              onClick={copyShareMessage}
              disabled={!referralCode}
              className="border-slate-200 hover:bg-slate-50 text-slate-700 font-bold px-4 py-3 rounded-xl text-xs gap-2"
            >
              {copiedMessage ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Message Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Message</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </section>

      {/* ── Status Metrics Overview ──────────────────────────────────── */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500">Total Referrals</span>
            <Users className="w-4 h-4 text-slate-400" />
          </div>
          <p className="text-2xl font-black text-slate-900" style={{ fontFamily: "var(--font-mono)" }}>
            {referrals.length}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">Friends who applied your code</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-amber-700">Awaiting Verification</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-black text-amber-700" style={{ fontFamily: "var(--font-mono)" }}>
            {pendingCount}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">Pending payment verification</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-emerald-700">Successful Referrals</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-black text-emerald-700" style={{ fontFamily: "var(--font-mono)" }}>
            {successfulCount}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">Eligible payments approved</p>
        </div>
      </section>

      {/* ── Reward Section (Most Repeated Questions) ────────────────── */}
      <section
        className={`rounded-3xl border p-6 sm:p-8 transition-all ${
          isRewardUnlocked
            ? "border-amber-300 bg-gradient-to-br from-amber-50/60 via-white to-amber-50/30 shadow-md"
            : "border-slate-200 bg-white shadow-xs"
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-5 border-b border-slate-100">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                  isRewardUnlocked ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-400"
                }`}
              >
                <Flame className="w-4 h-4" />
              </div>
              <h2 className="text-lg font-black text-slate-900">
                Reward: Most Repeated Questions
              </h2>
            </div>
            <p className="text-xs text-slate-500">
              High-frequency exam topics across Foundation of Computing, C Programming, and HTML + CSS + JavaScript.
            </p>
          </div>

          <div>
            {isRewardUnlocked ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800 border border-emerald-200">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Unlocked & Active
              </span>
            ) : pendingCount > 0 ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800 border border-amber-200">
                <Clock className="w-3.5 h-3.5 text-amber-600" /> Pending Verification
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600 border border-slate-200">
                Locked
              </span>
            )}
          </div>
        </div>

        {/* Resources list */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {rewardNotes.length > 0 ? (
            rewardNotes.map((note) => (
              <div
                key={note.id}
                className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="bg-amber-50 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-md border border-amber-200">
                      Most Repeated
                    </span>
                    <span className="text-[10px] font-semibold text-slate-400">
                      Semester 1
                    </span>
                  </div>
                  <h3 className="text-xs font-bold text-slate-900 mb-1.5 flex items-start gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-indigo-600 shrink-0 mt-0.5" />
                    <span>{note.title}</span>
                  </h3>
                  <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                    {note.description || note.subject || "Curated high-frequency exam questions."}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100">
                  {isRewardUnlocked ? (
                    <button
                      onClick={() => onOpenNote(note)}
                      disabled={openingId === note.id}
                      className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-amber-400 hover:bg-amber-500 text-slate-950 px-3 py-2 text-xs font-extrabold transition shadow-xs disabled:bg-slate-200"
                    >
                      {openingId === note.id ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" /> Opening…
                        </>
                      ) : (
                        <>
                          <Download className="w-3.5 h-3.5" /> Read Note
                        </>
                      )}
                    </button>
                  ) : (
                    <div className="text-center py-1.5 text-[11px] font-semibold text-slate-400 bg-slate-50 rounded-xl">
                      Unlocks after verified referral
                    </div>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-3 text-center py-6 text-xs text-slate-400">
              Most Repeated Topics materials are synchronized with your account.
            </div>
          )}
        </div>
      </section>

      {/* ── Referral History Table ───────────────────────────────────── */}
      <section className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs">
        <div className="flex items-center justify-between mb-5 pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-900">Referral Activity History</h2>
            <p className="text-xs text-slate-500">Live status of your referred purchases</p>
          </div>
          <span className="text-xs font-semibold text-slate-400">
            {referrals.length} {referrals.length === 1 ? "record" : "records"}
          </span>
        </div>

        {referrals.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 p-8 text-center">
            <Gift className="mx-auto h-8 w-8 text-slate-300" />
            <p className="mt-2 text-xs font-bold text-slate-700">No referrals yet</p>
            <p className="mt-1 text-[11px] text-slate-400 max-w-sm mx-auto">
              Share your referral code with friends preparing for BCA Semester 1 to get started.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 uppercase tracking-wider font-semibold text-[10px]">
                  <th className="pb-3 pl-2">Referral Entry</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3">Date</th>
                  <th className="pb-3 pr-2 text-right">Reward Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {referrals.map((item, idx) => (
                  <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 pl-2 font-medium text-slate-900">
                      Referral #{referrals.length - idx}
                    </td>
                    <td className="py-3.5">
                      {item.status === "successful" ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3" /> Successful
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-bold text-amber-700 border border-amber-200">
                          <Clock className="w-3 h-3" /> Pending Review
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 text-slate-500">
                      {item.created_at ? new Date(item.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—"}
                    </td>
                    <td className="py-3.5 pr-2 text-right">
                      {item.status === "successful" ? (
                        <span className="text-emerald-700 font-bold text-[11px]">
                          Reward Unlocked
                        </span>
                      ) : (
                        <span className="text-slate-400 font-medium text-[11px]">
                          Awaiting Payment Verification
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
