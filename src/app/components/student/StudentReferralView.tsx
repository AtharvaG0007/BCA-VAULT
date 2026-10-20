import { useEffect, useState } from "react";
import {
  Gift,
  Users,
  Clock,
  CheckCircle2,
  Sparkles,
  FileText,
  Flame,
  AlertCircle,
  Loader2,
  Copy,
  Lock,
} from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "../auth/AuthContext";
import { StudentReferralSkeleton } from "./StudentSkeletons";

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
  const [referrals, setReferrals] = useState<ReferralRow[]>([]);
  const [reward, setReward] = useState<RewardRow | null>(null);
  const [rewardNotes, setRewardNotes] = useState<NoteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const studentName =
    appUser?.name?.trim() ||
    (user?.user_metadata?.full_name as string | undefined)?.trim() ||
    user?.email?.split("@")[0]?.trim() ||
    "Student";
  const studentDms = `${studentName} DMS`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(studentDms);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback if clipboard API is restricted
    }
  };

  const REFERRAL_REWARD_NOTE_IDS = [
    "6d971cc5-5677-43f5-958f-add182553c87", // C Programming — Most Repeated Questions
    "33cc389f-4a00-4d3e-89dd-670e514e2ed3", // Foundation of Computing — Most Repeated Questions
    "20af0ae2-66e3-46cb-bbc2-4ae8e12f0500", // Client-Side Web Technologies — Most Repeated Questions
  ];

  const REFERRAL_REWARD_META: Record<
    string,
    { title: string; subject: string; description: string }
  > = {
    "6d971cc5-5677-43f5-958f-add182553c87": {
      title: "C Programming — Most Repeated Questions",
      subject: "C Programming",
      description: "Curated high-frequency exam questions for C Programming & Algorithm Design.",
    },
    "33cc389f-4a00-4d3e-89dd-670e514e2ed3": {
      title: "Foundation of Computing — Most Repeated Questions",
      subject: "Foundation of Computing",
      description: "Curated high-frequency exam questions for Foundation of Computing.",
    },
    "20af0ae2-66e3-46cb-bbc2-4ae8e12f0500": {
      title: "HTML + CSS + JavaScript — Most Repeated Questions",
      subject: "HTML + CSS + JavaScript",
      description: "Curated high-frequency exam questions for Client-Side Web Technologies (HTML, CSS, JS).",
    },
  };

  useEffect(() => {
    async function fetchReferralData() {
      if (!user) return;
      setLoading(true);
      setError(null);

      try {
        // 1. Fetch referrals where user is the referrer
        const { data: refs, error: refErr } = await supabase
          .from("referrals")
          .select("id, status, created_at, successful_at")
          .eq("referrer_user_id", user.id)
          .order("created_at", { ascending: false });

        if (!refErr && refs) {
          setReferrals(refs as ReferralRow[]);
        }

        // 2. Fetch user's referral reward status
        const { data: rewardData, error: rewardErr } = await supabase
          .from("referral_rewards")
          .select("id, reward_type, status, unlocked_at")
          .eq("user_id", user.id)
          .eq("reward_type", "most_repeated_questions")
          .maybeSingle();

        if (!rewardErr && rewardData) {
          setReward(rewardData as RewardRow);
        }

        // 3. Fetch the 3 specific referral Most Repeated Questions resources
        const { data: notesData } = await supabase
          .from("notes")
          .select("id, title, subject, semester, description, storage_bucket, storage_path, priority")
          .in("id", REFERRAL_REWARD_NOTE_IDS);

        if (notesData) {
          // Order them logically: C Programming, Foundation of Computing, HTML + CSS + JavaScript
          const ordered = REFERRAL_REWARD_NOTE_IDS.map((id) => {
            const raw = notesData.find((n) => n.id === id);
            if (!raw) return null;
            const meta = REFERRAL_REWARD_META[id];
            return {
              ...raw,
              title: meta?.title || raw.title,
              subject: meta?.subject || raw.subject,
              description: meta?.description || raw.description,
            };
          }).filter(Boolean) as NoteItem[];
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

  const successfulCount = referrals.filter((r) => r.status === "successful").length;
  const pendingCount = referrals.filter((r) => r.status === "pending").length;
  const isRewardUnlocked = Boolean(reward?.status === "unlocked");



  if (loading) {
    return <StudentReferralSkeleton />;
  }

  return (
    <div className="mx-auto max-w-5xl w-full px-4 py-8 sm:px-6 space-y-8">
      {/* Header */}
      <header className="space-y-1.5">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200/60 text-indigo-700 text-xs font-bold uppercase tracking-wider">
          <Gift className="w-3.5 h-3.5 text-indigo-600" />
          Referral Tracking
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
          Track Your Successful Referrals
        </h1>
        <p className="text-xs sm:text-sm text-slate-600 max-w-2xl leading-relaxed">
          Share your identifier with friends. Referral status updates when an eligible Semester 1 payment is approved by an admin.
        </p>
      </header>

      {error && (
        <div className="flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-xs font-medium text-red-700">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* ── Student Identifier Card ──────────────────────── */}
      <section className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="space-y-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Your Referral Identifier
            </span>
            <div className="flex flex-wrap items-center gap-3">
              <div className="bg-slate-50 border-2 border-indigo-100 rounded-2xl px-5 py-3 font-mono text-2xl sm:text-3xl font-black text-indigo-700 tracking-tight shadow-inner">
                {studentDms}
              </div>
              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-3 text-xs font-bold text-white shadow-sm hover:bg-indigo-700 transition"
              >
                {copied ? <CheckCircle2 className="h-4 w-4 text-emerald-300" /> : <Copy className="h-4 w-4" />}
                {copied ? "Copied ✓" : "Copy Identifier"}
              </button>
            </div>
            <p className="text-[11px] text-slate-500">
              Have your friends enter <strong className="text-slate-700">{studentDms}</strong> during Semester 1 purchase checkout.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-center bg-indigo-50/70 border border-indigo-100 rounded-2xl px-4 py-3 text-xs text-indigo-800">
            <Sparkles className="w-4 h-4 text-indigo-600 shrink-0" />
            <span className="font-semibold">Counts only approved eligible purchases</span>
          </div>
        </div>
      </section>

      {/* ── Referral rewards status ──────────────────────── */}
      <section className="rounded-3xl border border-indigo-200 bg-gradient-to-br from-indigo-50 via-white to-violet-50 p-6 sm:p-8 shadow-xs">
        <div className="flex items-start gap-4">
          <div className="rounded-2xl bg-indigo-100 p-3 text-indigo-700">
            <Gift className="h-6 w-6" />
          </div>
          <div className="space-y-2">
            <span className="inline-flex rounded-full border border-indigo-200 bg-white px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-indigo-700">
              Rewards launching soon
            </span>
            <h2 className="text-xl font-black text-slate-900">A new referral reward program is in the works</h2>
            <p className="max-w-2xl text-sm leading-relaxed text-slate-600">
              Your referral activity is tracked here. The updated reward program is not active yet, so no new reward is promised or unlocked through referrals today. We’ll share the details when it launches.
            </p>
            <p className="text-xs text-slate-500">
              {successfulCount} successful {successfulCount === 1 ? "referral" : "referrals"} recorded · {pendingCount} pending approval
            </p>
          </div>
        </div>
      </section>

      {/* ── How Referral Works (5-Step Explanation) ───────────── */}
      <section className="rounded-3xl border border-slate-200 bg-slate-50/60 p-6 sm:p-8">
        <div className="mb-5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600">
            Clear Referral Workflow
          </span>
          <h2 className="text-lg font-black text-slate-900 mt-0.5">
            How Referral Tracking Works
          </h2>
          <p className="text-xs text-slate-500">
            A referral counts only when your friend purchases Semester 1 and payment is approved by admin.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-col justify-between">
            <div>
              <span className="text-[10px] font-black uppercase text-indigo-600 tracking-wider">Step 1</span>
              <h3 className="text-xs font-bold text-slate-900 mt-1 mb-1">Share Identifier</h3>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Share your Student DMS identifier (<strong className="text-slate-700">{studentDms}</strong>) with friends.
              </p>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-col justify-between">
            <div>
              <span className="text-[10px] font-black uppercase text-indigo-600 tracking-wider">Step 2</span>
              <h3 className="text-xs font-bold text-slate-900 mt-1 mb-1">Enter Code</h3>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Your friend enters your identifier in &quot;Have a Referral Code?&quot; during checkout.
              </p>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-col justify-between">
            <div>
              <span className="text-[10px] font-black uppercase text-indigo-600 tracking-wider">Step 3</span>
              <h3 className="text-xs font-bold text-slate-900 mt-1 mb-1">Semester 1 Purchase</h3>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Friend submits an eligible BCA Semester 1 purchase and payment screenshot.
              </p>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-col justify-between">
            <div>
              <span className="text-[10px] font-black uppercase text-indigo-600 tracking-wider">Step 4</span>
              <h3 className="text-xs font-bold text-slate-900 mt-1 mb-1">Payment Approved</h3>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Admin approves the payment in Payment CRM. Referral status becomes Successful (+1).
              </p>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-col justify-between">
            <div>
              <span className="text-[10px] font-black uppercase text-emerald-600 tracking-wider">Step 5</span>
              <h3 className="text-xs font-bold text-slate-900 mt-1 mb-1">Referral Recorded</h3>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                The purchase is recorded as a successful referral. Free-content rewards are no longer granted for new referrals.
              </p>
            </div>
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
          <p className="text-[11px] text-slate-400 mt-1">Referred students total</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-amber-700">Awaiting Verification</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-black text-amber-700" style={{ fontFamily: "var(--font-mono)" }}>
            {pendingCount}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">Pending admin payment review</p>
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

      {/* ── Reward Section (Semester 1 Most Repeated Questions) ────────────────── */}
      <section
        id="referral-rewards"
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
                {isRewardUnlocked ? <Flame className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
              </div>
              <h2 className="text-lg font-black text-slate-900">
                {isRewardUnlocked ? "Previously Unlocked Reward" : "Most Repeated Questions"}
              </h2>
            </div>
            <p className="text-xs text-slate-500">
              {isRewardUnlocked
                ? "Your previously unlocked Semester 1 resources remain available."
                : "The referral reward program is being updated and has not launched yet."}
            </p>
          </div>

          <div>
            {isRewardUnlocked ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3.5 py-1 text-xs font-bold text-emerald-800 border border-emerald-200">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Previously Unlocked
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3.5 py-1 text-xs font-bold text-slate-600 border border-slate-200">
                <Lock className="w-3.5 h-3.5 text-slate-500" /> Rewards launching soon
              </span>
            )}
          </div>
        </div>

        {/* Subjects Included Breakdown */}
        {isRewardUnlocked && (
          <div className="mb-6 p-4 rounded-2xl bg-emerald-50/80 border border-emerald-200/80 flex flex-wrap items-center gap-4 text-xs font-bold text-emerald-900">
            <span className="text-[11px] uppercase tracking-wider text-emerald-700">Your existing reward includes:</span>
            <span className="inline-flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> C Programming</span>
            <span className="inline-flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Foundation of Computing</span>
            <span className="inline-flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> HTML + CSS + JavaScript</span>
          </div>
        )}

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
                      Most Repeated Questions
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
                      className="w-full inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-amber-400 hover:bg-amber-500 text-slate-950 px-3 py-2.5 text-xs font-extrabold transition shadow-xs disabled:bg-slate-200 cursor-pointer"
                    >
                      {openingId === note.id ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" /> Opening Reward…
                        </>
                      ) : (
                        <>
                          <FileText className="w-3.5 h-3.5" /> Open Reward
                        </>
                      )}
                    </button>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-2 px-3 text-[11px] font-semibold text-slate-400 bg-slate-50 rounded-xl border border-slate-150 gap-1 text-center">
                      <div className="inline-flex items-center gap-1 font-bold text-slate-500">
                        <Lock className="w-3 h-3" /> Rewards launching soon
                      </div>
                      <span className="text-[10px] text-slate-400">
                        Updated rewards are not active yet
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-3 text-center py-6 text-xs text-slate-400">
              Most Repeated Questions materials are synchronized with your account.
            </div>
          )}
        </div>
      </section>

      {/* ── Referral History Table ───────────────────────────────────── */}
      <section className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs">
        <div className="flex items-center justify-between mb-5 pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-900">Referral Activity History</h2>
            <p className="text-xs text-slate-500">
              Successful referrals: <strong className="text-slate-800">{successfulCount}</strong>
            </p>
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
              Share your identifier with friends preparing for BCA Semester 1.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto touch-scroll">
            <table className="w-full min-w-[500px] text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 uppercase tracking-wider font-semibold text-[10px]">
                  <th className="pb-3 pl-2">Referral Entry</th>
                  <th className="pb-3">Payment Status</th>
                  <th className="pb-3">Date</th>
                  <th className="pb-3 pr-2 text-right">Counter Contribution</th>
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
                          <CheckCircle2 className="w-3 h-3" /> Payment Approved (✓ Successful)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-bold text-amber-700 border border-amber-200">
                          <Clock className="w-3 h-3" /> Payment Pending (⏳ Pending)
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 text-slate-500">
                      {item.created_at ? new Date(item.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—"}
                    </td>
                    <td className="py-3.5 pr-2 text-right">
                      {item.status === "successful" ? (
                        <span className="text-emerald-700 font-bold text-[11px] inline-flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          {isRewardUnlocked ? "Legacy Reward Available" : "Counted"}
                        </span>
                      ) : (
                        <span className="text-slate-400 font-medium text-[11px]">
                          Pending Approval (Does not count yet)
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
