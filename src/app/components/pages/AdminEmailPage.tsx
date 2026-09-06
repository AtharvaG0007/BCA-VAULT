import React, { useState, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router";
import {
  Mail,
  RefreshCw,
  Sparkles,
  Save,
  Send,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowLeft,
  Shield,
  Search,
  ExternalLink,
  Eye,
  Code2,
} from "lucide-react";
import { toast } from "sonner";
import { supabase, adminSupabase, supabaseUrl, publicAnonKey } from "@/lib/supabase/client";

export interface OutboxItem {
  id: string;
  event_key: string;
  event_type: "payment_approved" | "payment_rejected" | "referral_reward_unlocked" | string;
  recipient_user_id: string | null;
  recipient_email: string;
  sender_name: string;
  sender_email?: string;
  status: "pending" | "processing" | "sent" | "failed";
  subject: string | null;
  html_body: string | null;
  text_body: string | null;
  generated_at: string | null;
  generated_by: string | null;
  approved_at: string | null;
  approved_by: string | null;
  attempt_count: number;
  last_error: string | null;
  provider_message_id: string | null;
  created_at: string;
  sent_at: string | null;
  failed_at: string | null;
  payload?: Record<string, any>;
}

const EMAIL_ADMIN_URL = `${supabaseUrl}/functions/v1/email-admin`;

async function getAdminToken(): Promise<string> {
  const { data: adminSession } = await adminSupabase.auth.getSession();
  if (adminSession.session?.access_token) return adminSession.session.access_token;
  const { data: standardSession } = await supabase.auth.getSession();
  return standardSession.session?.access_token || "";
}

async function apiCall(endpoint: string, body: Record<string, any> = {}) {
  const token = await getAdminToken();
  const res = await fetch(`${EMAIL_ADMIN_URL}${endpoint}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: publicAnonKey,
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.success) {
    throw new Error(json.error || `Request failed with status ${res.status}`);
  }
  return json;
}

function formatEventType(type: string) {
  switch (type) {
    case "payment_approved":
      return "Payment Approved";
    case "payment_rejected":
      return "Payment Rejected";
    case "referral_reward_unlocked":
      return "Referral Reward";
    default:
      return type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  }
}

function StatusBadge({ status }: { status: string }) {
  if (status === "sent") {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
        <CheckCircle2 className="h-3 w-3" /> sent
      </span>
    );
  }
  if (status === "failed") {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/20">
        <AlertCircle className="h-3 w-3" /> failed
      </span>
    );
  }
  if (status === "processing") {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full border border-blue-500/20">
        <RefreshCw className="h-3 w-3 animate-spin" /> sending
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
      <Clock className="h-3 w-3" /> pending
    </span>
  );
}

export function AdminEmailPage({ embedded = false }: { embedded?: boolean }) {
  const navigate = useNavigate();
  const [queue, setQueue] = useState<OutboxItem[]>([]);
  const [selectedJob, setSelectedJob] = useState<OutboxItem | null>(null);
  const [subject, setSubject] = useState("");
  const [htmlBody, setHtmlBody] = useState("");
  const [textBody, setTextBody] = useState("");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [senderAccount, setSenderAccount] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"preview" | "code">("preview");

  const loadQueue = async () => {
    setLoading(true);
    try {
      const res = await apiCall("/list");
      const list: OutboxItem[] = res.data || [];
      setQueue(list);

      // Verify Gmail connection
      apiCall("/verify-gmail")
        .then((v) => setSenderAccount(v.from))
        .catch(() => setSenderAccount(null));

      // Keep selection in sync
      if (selectedJob) {
        const found = list.find((j) => j.id === selectedJob.id);
        if (found) {
          setSelectedJob(found);
          setSubject(found.subject || "");
          setHtmlBody(found.html_body || "");
          setTextBody(found.text_body || "");
        }
      } else if (list.length > 0) {
        // Select first pending item by default, or first item
        const firstPending = list.find((j) => j.status === "pending") || list[0];
        setSelectedJob(firstPending);
        setSubject(firstPending.subject || "");
        setHtmlBody(firstPending.html_body || "");
        setTextBody(firstPending.text_body || "");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to load email queue.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQueue();
  }, []);

  const selectJob = (job: OutboxItem) => {
    setSelectedJob(job);
    setSubject(job.subject || "");
    setHtmlBody(job.html_body || "");
    setTextBody(job.text_body || "");
  };

  const handleGenerate = async () => {
    if (!selectedJob) return;
    setActionLoading(true);
    try {
      const res = await apiCall("/generate", { id: selectedJob.id });
      const updated: OutboxItem = res.data;
      selectJob(updated);
      setQueue((prev) => prev.map((j) => (j.id === updated.id ? updated : j)));
      toast.success("Gemini generated the email draft.");
    } catch (err: any) {
      toast.error(err.message || "Gemini email generation failed.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleSaveDraft = async () => {
    if (!selectedJob) return;
    setActionLoading(true);
    try {
      const res = await apiCall("/save", {
        id: selectedJob.id,
        subject,
        html_body: htmlBody,
        text_body: textBody,
      });
      const updated: OutboxItem = res.data;
      selectJob(updated);
      setQueue((prev) => prev.map((j) => (j.id === updated.id ? updated : j)));
      toast.success("Draft saved successfully.");
    } catch (err: any) {
      toast.error(err.message || "Failed to save draft.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleSend = async () => {
    if (!selectedJob) return;
    if (!subject.trim() || !htmlBody.trim() || !textBody.trim()) {
      toast.error("Please generate or enter the email subject, HTML, and text before sending.");
      return;
    }
    const confirmed = window.confirm(
      `Are you sure you want to send this email to ${selectedJob.recipient_email}?`
    );
    if (!confirmed) return;

    setActionLoading(true);
    try {
      const res = await apiCall("/send", { id: selectedJob.id });
      const updated: OutboxItem = res.data;
      selectJob(updated);
      setQueue((prev) => prev.map((j) => (j.id === updated.id ? updated : j)));
      toast.success("Email sent successfully via Gmail API!");
    } catch (err: any) {
      toast.error(err.message || "Failed to send email.");
      await loadQueue();
    } finally {
      setActionLoading(false);
    }
  };

  const filteredQueue = useMemo(() => {
    return queue.filter((j) => {
      if (filterStatus !== "all" && j.status !== filterStatus) return false;
      if (filterType !== "all" && j.event_type !== filterType) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          j.recipient_email.toLowerCase().includes(q) ||
          (j.subject && j.subject.toLowerCase().includes(q)) ||
          j.event_type.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [queue, filterStatus, filterType, searchQuery]);

  const stats = useMemo(() => {
    return {
      total: queue.length,
      pending: queue.filter((j) => j.status === "pending").length,
      sent: queue.filter((j) => j.status === "sent").length,
      failed: queue.filter((j) => j.status === "failed").length,
    };
  }, [queue]);

  return (
    <div className={embedded ? "text-white" : "min-h-screen bg-slate-950 text-white p-4 md:p-8"}>
      <div className="mx-auto max-w-7xl">
        {/* Top Header */}
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b border-slate-800/80 pb-6">
          <div>
            {!embedded && (
              <Link
                to="/admin/dashboard"
                className="inline-flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-white transition mb-2"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Back to Dashboard
              </Link>
            )}
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600/20 border border-indigo-500/30">
                <Mail className="h-5 w-5 text-indigo-400" />
              </div>
              <div>
                <h1 className="text-2xl font-black tracking-tight">Super Admin Email Console</h1>
                <p className="text-xs text-slate-400 mt-0.5">
                  Gemini-generated drafts • Gmail API delivery • Full outbox audit logs
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {senderAccount ? (
              <div className="flex items-center gap-2 rounded-xl bg-slate-900 border border-slate-800 px-3.5 py-2 text-xs text-slate-300">
                <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400/50"></span>
                <span className="font-semibold">{senderAccount}</span>
              </div>
            ) : (
              <a
                href={`${EMAIL_ADMIN_URL}/google/start`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs font-bold text-amber-300 hover:bg-amber-500/20 transition"
              >
                <ExternalLink className="h-3.5 w-3.5" /> Connect Gmail OAuth
              </a>
            )}

            <button
              onClick={() => void loadQueue()}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900/80 px-4 py-2 text-xs font-bold hover:bg-slate-800 disabled:opacity-50 transition"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">Total in Outbox</p>
            <p className="text-2xl font-black mt-1 text-white">{stats.total}</p>
          </div>
          <div className="rounded-xl border border-amber-900/30 bg-amber-950/20 p-4">
            <p className="text-[10px] font-black uppercase tracking-wider text-amber-400">Waiting / Pending</p>
            <p className="text-2xl font-black mt-1 text-amber-300">{stats.pending}</p>
          </div>
          <div className="rounded-xl border border-emerald-900/30 bg-emerald-950/20 p-4">
            <p className="text-[10px] font-black uppercase tracking-wider text-emerald-400">Delivered / Sent</p>
            <p className="text-2xl font-black mt-1 text-emerald-300">{stats.sent}</p>
          </div>
          <div className="rounded-xl border border-rose-900/30 bg-rose-950/20 p-4">
            <p className="text-[10px] font-black uppercase tracking-wider text-rose-400">Failed / Errors</p>
            <p className="text-2xl font-black mt-1 text-rose-300">{stats.failed}</p>
          </div>
        </div>

        {/* Main Console Workspace: Left Queue + Right Editor */}
        <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
          {/* Left Column: Email Queue */}
          <section className="flex flex-col rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-slate-400">
                Email Queue ({filteredQueue.length})
              </span>
              <span className="rounded-full bg-indigo-500/15 px-2.5 py-0.5 text-xs font-bold text-indigo-300">
                {stats.pending} pending
              </span>
            </div>

            {/* Filter controls */}
            <div className="space-y-2 mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
                <input
                  type="text"
                  placeholder="Search recipient or subject..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950/80 pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex gap-2 text-[11px]">
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="flex-1 rounded-lg border border-slate-800 bg-slate-950 px-2 py-1.5 text-slate-300 outline-none"
                >
                  <option value="all">All Statuses</option>
                  <option value="pending">Pending</option>
                  <option value="sent">Sent</option>
                  <option value="failed">Failed</option>
                </select>

                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="flex-1 rounded-lg border border-slate-800 bg-slate-950 px-2 py-1.5 text-slate-300 outline-none"
                >
                  <option value="all">All Events</option>
                  <option value="payment_approved">Payment Approved</option>
                  <option value="payment_rejected">Payment Rejected</option>
                  <option value="referral_reward_unlocked">Referral Reward</option>
                </select>
              </div>
            </div>

            {/* Queue List */}
            <div className="flex-1 space-y-2 max-h-[640px] overflow-y-auto pr-1">
              {filteredQueue.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-800 p-8 text-center text-xs text-slate-500">
                  {queue.length === 0 ? "No emails found in the outbox." : "No emails match this filter."}
                </div>
              ) : (
                filteredQueue.map((job) => {
                  const isSelected = selectedJob?.id === job.id;
                  return (
                    <button
                      key={job.id}
                      onClick={() => selectJob(job)}
                      className={`w-full rounded-xl border p-3.5 text-left transition ${
                        isSelected
                          ? "border-indigo-500 bg-indigo-500/10 shadow-lg shadow-indigo-500/5"
                          : "border-slate-800/80 bg-slate-950/60 hover:border-slate-700 hover:bg-slate-900/60"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] font-black text-indigo-300">
                          {formatEventType(job.event_type)}
                        </span>
                        <StatusBadge status={job.status} />
                      </div>

                      <p className="mt-1.5 truncate text-xs font-bold text-slate-200">
                        {job.recipient_email}
                      </p>

                      {job.subject && (
                        <p className="mt-0.5 truncate text-[11px] text-slate-400">
                          {job.subject}
                        </p>
                      )}

                      <div className="mt-2 flex items-center justify-between text-[10px] text-slate-500">
                        <span>{new Date(job.created_at).toLocaleDateString("en-IN", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                        {job.status === "sent" && job.sent_at && (
                          <span className="text-emerald-400">Delivered</span>
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </section>

          {/* Right Column: Email Detail & Composer */}
          <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
            {selectedJob ? (
              <div className="space-y-5">
                {/* Recipient & Job Header */}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between border-b border-slate-800/80 pb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black uppercase tracking-wider text-slate-500">Recipient</span>
                      <StatusBadge status={selectedJob.status} />
                    </div>
                    <p className="text-lg font-black text-white mt-0.5">{selectedJob.recipient_email}</p>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400 mt-1">
                      <span><strong>Event:</strong> {formatEventType(selectedJob.event_type)}</span>
                      <span>•</span>
                      <span><strong>Created:</strong> {new Date(selectedJob.created_at).toLocaleString("en-IN")}</span>
                      {selectedJob.provider_message_id && (
                        <>
                          <span>•</span>
                          <span className="font-mono text-[11px] text-slate-500">
                            ID: {selectedJob.provider_message_id.slice(0, 16)}...
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Quick Action in Header */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => void handleGenerate()}
                      disabled={actionLoading || selectedJob.status === "sent"}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-indigo-500 disabled:opacity-50 transition"
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      Generate with Gemini
                    </button>
                  </div>
                </div>

                {/* Event Facts / Payload summary */}
                {selectedJob.payload && Object.keys(selectedJob.payload).length > 0 && (
                  <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3.5 text-xs text-slate-300">
                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5">
                      Event Parameters (Supplied Facts)
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                      {selectedJob.payload.student_name && (
                        <div>
                          <span className="text-slate-500">Student:</span>{" "}
                          <span className="font-bold">{selectedJob.payload.student_name}</span>
                        </div>
                      )}
                      {selectedJob.payload.bundle_name && (
                        <div>
                          <span className="text-slate-500">Bundle:</span>{" "}
                          <span className="font-bold">{selectedJob.payload.bundle_name}</span>
                        </div>
                      )}
                      {selectedJob.payload.amount && (
                        <div>
                          <span className="text-slate-500">Amount:</span>{" "}
                          <span className="font-bold">₹{selectedJob.payload.amount}</span>
                        </div>
                      )}
                      {selectedJob.payload.reference_last4 && (
                        <div>
                          <span className="text-slate-500">Reference:</span>{" "}
                          <span className="font-mono font-bold">••••{selectedJob.payload.reference_last4}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Last Error Notice */}
                {selectedJob.last_error && (
                  <div className="flex gap-2 rounded-xl border border-rose-800/50 bg-rose-950/40 p-3.5 text-xs text-rose-300">
                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                    <div>
                      <strong className="font-bold">Last Error:</strong> {selectedJob.last_error}
                    </div>
                  </div>
                )}

                {/* Subject Input */}
                <div>
                  <label className="mb-1.5 block text-xs font-black uppercase tracking-wider text-slate-400">
                    Subject
                  </label>
                  <input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="e.g. Payment Approved: BCA Sem 2 Notes"
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-2.5 text-xs font-semibold text-white outline-none focus:border-indigo-500 transition"
                  />
                </div>

                {/* HTML Body and Live Preview */}
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <label className="text-xs font-black uppercase tracking-wider text-slate-400">
                      Email Body Content
                    </label>
                    <div className="flex items-center rounded-lg border border-slate-800 bg-slate-950 p-0.5 text-xs">
                      <button
                        onClick={() => setViewMode("preview")}
                        className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-bold transition ${
                          viewMode === "preview" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white"
                        }`}
                      >
                        <Eye className="h-3 w-3" /> Live Preview
                      </button>
                      <button
                        onClick={() => setViewMode("code")}
                        className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-bold transition ${
                          viewMode === "code" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white"
                        }`}
                      >
                        <Code2 className="h-3 w-3" /> HTML Code
                      </button>
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    {/* HTML Editor */}
                    <div className={viewMode === "preview" ? "hidden md:block" : "block col-span-2"}>
                      <textarea
                        value={htmlBody}
                        onChange={(e) => setHtmlBody(e.target.value)}
                        placeholder="Generate with Gemini or enter HTML here..."
                        className="h-72 w-full rounded-xl border border-slate-700 bg-slate-950 p-3 font-mono text-[11px] leading-relaxed text-slate-300 outline-none focus:border-indigo-500"
                      />
                    </div>

                    {/* Live Preview Iframe */}
                    <div className={viewMode === "code" ? "hidden md:block" : "block col-span-2 md:col-span-1"}>
                      <div className="h-72 overflow-hidden rounded-xl border border-slate-700 bg-white">
                        <iframe
                          title="Email Preview"
                          sandbox=""
                          srcDoc={
                            htmlBody ||
                            "<p style='font-family: Arial, sans-serif; padding: 24px; color: #64748b;'>Click 'Generate with Gemini' to generate email content, or type HTML on the left.</p>"
                          }
                          className="h-full w-full border-0"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Plain-Text Fallback */}
                <div>
                  <label className="mb-1.5 block text-xs font-black uppercase tracking-wider text-slate-400">
                    Plain-Text Fallback
                  </label>
                  <textarea
                    value={textBody}
                    onChange={(e) => setTextBody(e.target.value)}
                    placeholder="Plain-text version for email clients that do not render HTML..."
                    className="h-24 w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-xs leading-relaxed text-slate-300 outline-none focus:border-indigo-500"
                  />
                </div>

                {/* Bottom Actions */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-800/80 pt-4">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => void handleGenerate()}
                      disabled={actionLoading || selectedJob.status === "sent"}
                      className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-black text-white hover:bg-indigo-500 disabled:opacity-50 transition"
                    >
                      <Sparkles className="h-4 w-4" /> Generate with Gemini
                    </button>

                    <button
                      onClick={() => void handleSaveDraft()}
                      disabled={actionLoading || selectedJob.status === "sent"}
                      className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-black text-slate-200 hover:bg-slate-700 disabled:opacity-50 transition"
                    >
                      <Save className="h-4 w-4" /> Save Draft
                    </button>
                  </div>

                  <button
                    onClick={() => void handleSend()}
                    disabled={
                      actionLoading ||
                      selectedJob.status === "sent" ||
                      !subject.trim() ||
                      !htmlBody.trim() ||
                      !textBody.trim()
                    }
                    className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2 text-xs font-black text-white shadow-lg shadow-emerald-600/20 hover:bg-emerald-500 disabled:opacity-50 transition"
                  >
                    <Send className="h-4 w-4" />
                    {selectedJob.status === "sent" ? "Email Already Sent" : "Send via Gmail"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex min-h-[480px] flex-col items-center justify-center text-center text-slate-500">
                <Mail className="h-12 w-12 text-slate-700 mb-3" />
                <p className="text-sm font-bold text-slate-400">No Email Selected</p>
                <p className="text-xs text-slate-600 mt-1 max-w-sm">
                  Select an email from the queue on the left to review, generate content with Gemini, and dispatch via Gmail.
                </p>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
