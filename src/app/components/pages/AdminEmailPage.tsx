import React, { useState, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router";
import {
  Mail,
  RefreshCw,
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
  Plus,
} from "lucide-react";
import { toast } from "sonner";
import { supabase, adminSupabase, supabaseUrl, publicAnonKey } from "@/lib/supabase/client";

export interface OutboxItem {
  id: string;
  event_key: string;
  event_type: "test_email" | "payment_approved" | "payment_rejected" | "referral_reward_unlocked" | string;
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
const REQUIRED_SENDER = "bcavault07@gmail.com";

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
    case "test_email":
      return "Test Email";
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

const DEFAULT_COMPOSER_SUBJECT = "Payment Approved";

const DEFAULT_COMPOSER_HTML = `<div style="font-family: Arial, sans-serif; color: #333333; line-height: 1.6; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
  <h2 style="color: #2e7d32; margin-top: 0;">Payment Approved</h2>
  <p>Dear Student,</p>
  <p>We are pleased to inform you that your payment has been successfully approved.</p>

  <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
    <p style="margin: 5px 0;"><strong>Course:</strong> BCA</p>
    <p style="margin: 5px 0;"><strong>Bundle:</strong> BCA Vault Bundle</p>
    <p style="margin: 5px 0;"><strong>Amount:</strong> ₹349</p>
    <p style="margin: 5px 0;"><strong>Status:</strong> <span style="color: #2e7d32; font-weight: bold;">Approved</span></p>
  </div>

  <p>Thank you for choosing BCA Vault for your studies.</p>

  <p style="margin-bottom: 0;">
    Warm regards,<br>
    <strong>BCA Vault Team</strong>
  </p>
</div>`;

const DEFAULT_COMPOSER_TEXT = `Payment Approved

Dear Student,

We are pleased to inform you that your payment has been successfully approved.

Course: BCA

Bundle: BCA Vault Bundle

Amount: ₹ 349

Status: Approved

Thank you for choosing BCA Vault for your studies.

Warm regards,
BCA Vault Team`;

const DEFAULT_PAYMENT_APPROVED_SUBJECT = "BCA Vault — Payment Approved & Access Activated";

const DEFAULT_PAYMENT_APPROVED_HTML = `<div style="font-family: Arial, sans-serif; color: #333333; line-height: 1.6; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
  <h2 style="color: #2e7d32; margin-top: 0;">Payment Approved</h2>

  <p>Dear Student,</p>

  <p>We are pleased to inform you that your payment has been successfully approved.</p>

  <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
    <p style="margin: 5px 0;"><strong>Course:</strong> BCA</p>
    <p style="margin: 5px 0;"><strong>Bundle:</strong> BCA Vault Bundle</p>
    <p style="margin: 5px 0;"><strong>Amount:</strong> ₹349</p>
    <p style="margin: 5px 0;">
      <strong>Status:</strong>
      <span style="color: #2e7d32; font-weight: bold;">Approved</span>
    </p>
  </div>

  <p>Thank you for choosing BCA Vault for your studies.</p>

  <p style="margin-bottom: 0;">
    Warm regards,<br>
    <strong>BCA Vault Team</strong>
  </p>
</div>`;

const DEFAULT_PAYMENT_APPROVED_TEXT = `Dear Student,

We are pleased to inform you that your payment has been successfully approved.

Payment Details

• Course: BCA
• Bundle: BCA Vault Bundle
• Amount: ₹499
• Status: Approved

Thank you for choosing BCA Vault for your studies.

Warm regards,

BCA Vault Team`;

function getPaymentApprovedHtml(studentName = "Student", course = "BCA", bundle = "BCA Vault Bundle", amount = "₹499") {
  return `<div style="font-family: Arial, sans-serif; color: #333333; line-height: 1.6; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
  <h2 style="color: #2e7d32; margin-top: 0;">Payment Approved</h2>

  <p>Dear ${studentName},</p>

  <p>We are pleased to inform you that your payment has been successfully approved.</p>

  <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
    <p style="margin: 5px 0;"><strong>Course:</strong> ${course}</p>
    <p style="margin: 5px 0;"><strong>Bundle:</strong> ${bundle}</p>
    <p style="margin: 5px 0;"><strong>Amount:</strong> ${amount}</p>
    <p style="margin: 5px 0;">
      <strong>Status:</strong>
      <span style="color: #2e7d32; font-weight: bold;">Approved</span>
    </p>
  </div>

  <p>Thank you for choosing BCA Vault for your studies.</p>

  <p style="margin-bottom: 0;">
    Warm regards,<br>
    <strong>BCA Vault Team</strong>
  </p>
</div>`;
}

function getPaymentApprovedText(studentName = "Student", course = "BCA", bundle = "BCA Vault Bundle", amount = "₹499") {
  return `Dear ${studentName},\n\nWe are pleased to inform you that your payment has been successfully approved.\n\nPayment Details\n\n• Course: ${course}\n• Bundle: ${bundle}\n• Amount: ${amount}\n• Status: Approved\n\nThank you for choosing BCA Vault for your studies.\n\nWarm regards,\n\nBCA Vault Team`;
}

export function AdminEmailPage({ embedded = false }: { embedded?: boolean }) {
  const navigate = useNavigate();
  const [queue, setQueue] = useState<OutboxItem[]>([]);
  const [selectedJob, setSelectedJob] = useState<OutboxItem | null>(null);

  // Compose mode state
  const [isComposing, setIsComposing] = useState(false);
  const [composeRecipient, setComposeRecipient] = useState("");
  const [composeEventType, setComposeEventType] = useState<string>("payment_approved");

  const [subject, setSubject] = useState("");
  const [htmlBody, setHtmlBody] = useState("");
  const [textBody, setTextBody] = useState("");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [senderAccount, setSenderAccount] = useState<string | null>(REQUIRED_SENDER);
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
        .then((v) => setSenderAccount(v.from || REQUIRED_SENDER))
        .catch(() => setSenderAccount(REQUIRED_SENDER));

      // Keep selection in sync
      if (selectedJob) {
        const found = list.find((j) => j.id === selectedJob.id);
        if (found) {
          setSelectedJob(found);
          setSubject(found.subject || "");
          setHtmlBody(found.html_body || "");
          setTextBody(found.text_body || "");
        }
      } else if (!isComposing && list.length > 0) {
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
    setIsComposing(false);
    setSelectedJob(job);
    setSubject(job.subject || (job.event_type === "payment_approved" ? DEFAULT_PAYMENT_APPROVED_SUBJECT : ""));

    if (job.html_body) {
      setHtmlBody(job.html_body);
    } else if (job.event_type === "payment_approved") {
      const studentName = job.payload?.student_name || "Student";
      const course = job.payload?.course || "BCA";
      const bundle = job.payload?.bundle_name || "BCA Vault Bundle";
      const rawAmt = job.payload?.amount_paid || (job.payload?.amount ? `₹${job.payload.amount}` : "₹499");
      const amount = String(rawAmt).startsWith("₹") ? String(rawAmt) : `₹${rawAmt}`;
      setHtmlBody(getPaymentApprovedHtml(studentName, course, bundle, amount));
    } else {
      setHtmlBody("");
    }

    if (job.text_body) {
      setTextBody(job.text_body);
    } else if (job.event_type === "payment_approved") {
      const studentName = job.payload?.student_name || "Student";
      const course = job.payload?.course || "BCA";
      const bundle = job.payload?.bundle_name || "BCA Vault Bundle";
      const rawAmt = job.payload?.amount_paid || (job.payload?.amount ? `₹${job.payload.amount}` : "₹499");
      const amount = String(rawAmt).startsWith("₹") ? String(rawAmt) : `₹${rawAmt}`;
      setTextBody(getPaymentApprovedText(studentName, course, bundle, amount));
    } else {
      setTextBody("");
    }
  };

  const startCompose = (type: string = "payment_approved") => {
    setIsComposing(true);
    setSelectedJob(null);
    setComposeEventType(type);
    setComposeRecipient("");
    setSubject(DEFAULT_COMPOSER_SUBJECT);
    setHtmlBody(DEFAULT_COMPOSER_HTML);
    setTextBody(DEFAULT_COMPOSER_TEXT);
  };

  const loadDefaultTemplate = () => {
    if (isComposing) {
      setSubject(DEFAULT_COMPOSER_SUBJECT);
      setHtmlBody(DEFAULT_COMPOSER_HTML);
      setTextBody(DEFAULT_COMPOSER_TEXT);
      toast.success("Loaded default email template.");
    }
  };

  const handleSaveDraft = async () => {
    if (!subject.trim() || !htmlBody.trim() || !textBody.trim()) {
      toast.error("Please enter Subject, HTML body, and text body before saving.");
      return;
    }

    setActionLoading(true);
    try {
      if (isComposing) {
        if (!composeRecipient.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(composeRecipient.trim())) {
          toast.error("Please enter a valid recipient email address.");
          setActionLoading(false);
          return;
        }

        const res = await apiCall("/save", {
          recipient_email: composeRecipient.trim(),
          event_type: composeEventType,
          subject: subject.trim(),
          html_body: htmlBody.trim(),
          text_body: textBody.trim(),
        });
        const savedItem: OutboxItem = res.data;
        setQueue((prev) => [savedItem, ...prev]);
        selectJob(savedItem);
        toast.success("Draft saved to queue (Pending).");
      } else if (selectedJob) {
        const res = await apiCall("/save", {
          id: selectedJob.id,
          subject: subject.trim(),
          html_body: htmlBody.trim(),
          text_body: textBody.trim(),
        });
        const updated: OutboxItem = res.data;
        selectJob(updated);
        setQueue((prev) => prev.map((j) => (j.id === updated.id ? updated : j)));
        toast.success("Draft saved successfully.");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to save draft.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleSend = async () => {
    const targetRecipient = isComposing ? composeRecipient.trim() : selectedJob?.recipient_email;

    if (!targetRecipient || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(targetRecipient)) {
      toast.error("A valid recipient email address is required.");
      return;
    }

    if (!subject.trim() || !htmlBody.trim() || !textBody.trim()) {
      toast.error("Please enter the email subject, HTML, and text before sending.");
      return;
    }

    const isPaymentApproved = (selectedJob?.event_type === "payment_approved") || (isComposing && composeEventType === "payment_approved");
    const confirmMessage = isPaymentApproved
      ? `Send this payment approval email to ${targetRecipient}?`
      : `Are you sure you want to send this email via Gmail API to ${targetRecipient}?`;

    const confirmed = window.confirm(confirmMessage);
    if (!confirmed) return;

    setActionLoading(true);
    try {
      let jobId = selectedJob?.id;

      // If in compose mode, save draft first to create the outbox record
      if (isComposing || !jobId) {
        const saveRes = await apiCall("/save", {
          recipient_email: targetRecipient,
          event_type: composeEventType,
          subject: subject.trim(),
          html_body: htmlBody.trim(),
          text_body: textBody.trim(),
        });
        jobId = saveRes.data.id;
      }

      // Now send via Gmail API
      const res = await apiCall("/send", { id: jobId });
      const updated: OutboxItem = res.data;
      selectJob(updated);
      setQueue((prev) => {
        const exists = prev.some((j) => j.id === updated.id);
        return exists ? prev.map((j) => (j.id === updated.id ? updated : j)) : [updated, ...prev];
      });
      toast.success("✓ Email sent successfully via Gmail API!");
    } catch (err: any) {
      toast.error(err.message || "Failed to send email via Gmail.");
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
                  Deterministic email automation • Gmail API delivery • Full outbox audit logs
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Sender Identity Badge */}
            <div className="flex items-center gap-2 rounded-xl bg-slate-900 border border-slate-800 px-3.5 py-2 text-xs text-slate-300">
              <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400/50"></span>
              <div className="flex items-center gap-1.5">
                <span className="text-slate-400 font-medium">From:</span>
                <span className="font-bold text-white">{REQUIRED_SENDER}</span>
                <span className="text-slate-600">•</span>
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                  Gmail API
                </span>
              </div>
            </div>

            {/* Create New Email Button */}
            <button
              onClick={() => startCompose()}
              className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 px-3.5 py-2 text-xs font-black text-white shadow-md shadow-indigo-600/20 transition"
            >
              <Plus className="h-4 w-4" />
              Create New Email
            </button>

            {/* Refresh Button */}
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
          {loading && queue.length === 0 ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 space-y-2 animate-pulse">
                <div className="h-2.5 w-20 bg-slate-800/80 rounded" />
                <div className="h-7 w-12 bg-slate-800/80 rounded" />
              </div>
            ))
          ) : (
            <>
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
            </>
          )}
        </div>

        {/* Main Console Workspace: Left Queue + Right Editor */}
        <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
          {/* Left Column: Email Queue */}
          <section className="flex flex-col rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-slate-400">
                Email Queue ({filteredQueue.length})
              </span>
              <button
                onClick={() => startCompose()}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-400 hover:text-indigo-300 transition"
              >
                <Plus className="h-3 w-3" /> New
              </button>
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
                  <option value="test_email">Test Email</option>
                  <option value="payment_approved">Payment Approved</option>
                  <option value="payment_rejected">Payment Rejected</option>
                  <option value="referral_reward_unlocked">Referral Reward</option>
                </select>
              </div>
            </div>

            {/* Queue List */}
            <div className="flex-1 space-y-2 max-h-[640px] overflow-y-auto pr-1">
              {loading && filteredQueue.length === 0 ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="rounded-xl border border-slate-800/80 bg-slate-950/60 p-3.5 space-y-2 animate-pulse">
                    <div className="flex justify-between items-center">
                      <div className="h-3.5 w-24 bg-slate-800/70 rounded" />
                      <div className="h-4 w-12 bg-slate-800/70 rounded-full" />
                    </div>
                    <div className="h-3 w-40 bg-slate-800/70 rounded" />
                    <div className="h-2.5 w-28 bg-slate-800/70 rounded" />
                  </div>
                ))
              ) : filteredQueue.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-800 p-8 text-center text-xs text-slate-500">
                  <Mail className="h-8 w-8 mx-auto mb-2 text-slate-700" />
                  <p className="font-semibold text-slate-400">Queue is empty</p>
                  <p className="mt-1 text-slate-500">No emails match this filter or outbox is clear.</p>
                  <button
                    onClick={() => startCompose()}
                    className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-indigo-500 transition"
                  >
                    <Plus className="h-3.5 w-3.5" /> Create New Email
                  </button>
                </div>
              ) : (
                filteredQueue.map((job) => {
                  const isSelected = !isComposing && selectedJob?.id === job.id;
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
                          <span className="text-emerald-400 font-semibold">Delivered</span>
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
            {isComposing ? (
              /* COMPOSE TEST EMAIL INTERFACE */
              <div className="space-y-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between border-b border-slate-800/80 pb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full border border-indigo-500/20">
                        <Plus className="h-3 w-3" /> New Message
                      </span>
                      <span className="text-xs text-slate-500 font-semibold">Super Admin Compose</span>
                    </div>
                    <h2 className="text-xl font-black text-white mt-1">Create New Email</h2>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Draft a test message or notification, preview, and dispatch via Gmail API.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => loadDefaultTemplate()}
                      disabled={actionLoading}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-slate-800 border border-slate-700 px-3.5 py-2 text-xs font-bold text-slate-200 hover:bg-slate-700 disabled:opacity-50 transition shadow-sm"
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                      Load Default Template
                    </button>
                  </div>
                </div>

                {/* Sender, Recipient & Type Fields */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Sender (Locked to bcavault07@gmail.com) */}
                  <div>
                    <label className="mb-1.5 block text-xs font-black uppercase tracking-wider text-slate-400">
                      Sender Account
                    </label>
                    <div className="rounded-xl border border-slate-800 bg-slate-950/80 px-3.5 py-2 text-xs text-slate-300 font-semibold flex items-center justify-between">
                      <span className="truncate">{REQUIRED_SENDER}</span>
                      <span className="text-[10px] text-emerald-400 font-black uppercase">Gmail API</span>
                    </div>
                  </div>

                  {/* Recipient Email Input */}
                  <div>
                    <label className="mb-1.5 block text-xs font-black uppercase tracking-wider text-slate-400">
                      Recipient Email <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="email"
                      placeholder="e.g. your-email@gmail.com"
                      value={composeRecipient}
                      onChange={(e) => setComposeRecipient(e.target.value)}
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2 text-xs font-semibold text-white outline-none focus:border-indigo-500 transition"
                    />
                  </div>

                  {/* Email Type */}
                  <div>
                    <label className="mb-1.5 block text-xs font-black uppercase tracking-wider text-slate-400">
                      Email Type
                    </label>
                    <select
                      value={composeEventType}
                      onChange={(e) => {
                        const val = e.target.value;
                        setComposeEventType(val);
                        if (val === "payment_approved") {
                          if (!subject) setSubject(DEFAULT_COMPOSER_SUBJECT);
                          if (!htmlBody) setHtmlBody(DEFAULT_COMPOSER_HTML);
                          if (!textBody) setTextBody(DEFAULT_COMPOSER_TEXT);
                        }
                      }}
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2 text-xs font-semibold text-white outline-none focus:border-indigo-500 transition"
                    >
                      <option value="payment_approved">Payment Approval</option>
                      <option value="test_email">Test Email (Operational Check)</option>
                    </select>
                  </div>
                </div>

                {/* Subject Input */}
                <div>
                  <label className="mb-1.5 block text-xs font-black uppercase tracking-wider text-slate-400">
                    Subject <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="e.g. BCA Vault — Gmail API Test Email"
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-2.5 text-xs font-semibold text-white outline-none focus:border-indigo-500 transition"
                  />
                </div>

                {/* HTML Body and Live Preview */}
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <label className="text-xs font-black uppercase tracking-wider text-slate-400">
                      Email Body Content <span className="text-rose-400">*</span>
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
                        placeholder="Enter HTML email content here, or click 'Load Default Template'..."
                        className="h-72 w-full rounded-xl border border-slate-700 bg-slate-950 p-3 font-mono text-[11px] leading-relaxed text-slate-300 outline-none focus:border-indigo-500"
                      />
                    </div>

                    {/* Live Preview Iframe */}
                    <div className={viewMode === "code" ? "hidden md:block" : "block col-span-2 md:col-span-1"}>
                      <div className="h-72 overflow-hidden rounded-xl border border-slate-700 bg-white flex flex-col">
                        <div className="border-b border-slate-200 bg-slate-100 px-3 py-1.5 text-[10px] text-slate-600 flex items-center justify-between">
                          <span className="truncate"><strong>From:</strong> {REQUIRED_SENDER}</span>
                          <span className="truncate"><strong>To:</strong> {composeRecipient || "recipient"}</span>
                        </div>
                        <iframe
                          title="Email Preview"
                          sandbox=""
                          srcDoc={
                            htmlBody ||
                            "<p style='font-family: Arial, sans-serif; padding: 24px; color: #64748b;'>Enter HTML on the left or click 'Load Default Template'.</p>"
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
                    Plain-Text Fallback <span className="text-rose-400">*</span>
                  </label>
                  <textarea
                    value={textBody}
                    onChange={(e) => setTextBody(e.target.value)}
                    placeholder="Plain-text version for email clients that do not render HTML..."
                    className="h-20 w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-xs leading-relaxed text-slate-300 outline-none focus:border-indigo-500"
                  />
                </div>

                {/* Bottom Actions */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-800/80 pt-4">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => loadDefaultTemplate()}
                      disabled={actionLoading}
                      className="inline-flex items-center gap-2 rounded-xl bg-slate-800 border border-slate-700 px-4 py-2 text-xs font-bold text-slate-200 hover:bg-slate-700 disabled:opacity-50 transition"
                    >
                      <RefreshCw className="h-4 w-4" /> Load Template
                    </button>

                    <button
                      onClick={() => void handleSaveDraft()}
                      disabled={actionLoading || !composeRecipient.trim() || !subject.trim()}
                      className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-black text-slate-200 hover:bg-slate-700 disabled:opacity-50 transition"
                    >
                      <Save className="h-4 w-4" /> Save Draft
                    </button>
                  </div>

                  <button
                    onClick={() => void handleSend()}
                    disabled={
                      actionLoading ||
                      !composeRecipient.trim() ||
                      !subject.trim() ||
                      !htmlBody.trim() ||
                      !textBody.trim()
                    }
                    className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2 text-xs font-black text-white shadow-lg shadow-emerald-600/20 hover:bg-emerald-500 disabled:opacity-50 transition"
                  >
                    <Send className="h-4 w-4" />
                    Send Email via Gmail API
                  </button>
                </div>
              </div>
            ) : selectedJob ? (
              /* VIEW / EDIT SELECTED OUTBOX JOB */
              <div className="space-y-5">
                {/* Successful Delivery Banner */}
                {selectedJob.status === "sent" && (
                  <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-emerald-300">
                    <div className="flex items-center gap-2 font-black text-sm text-emerald-400">
                      <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                      ✓ Email sent successfully via Gmail API
                    </div>
                    <div className="mt-2.5 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-emerald-200/90 font-mono">
                      <div><span className="text-emerald-400 font-sans font-semibold">From:</span> {REQUIRED_SENDER}</div>
                      <div><span className="text-emerald-400 font-sans font-semibold">To:</span> {selectedJob.recipient_email}</div>
                      <div><span className="text-emerald-400 font-sans font-semibold">Provider:</span> Gmail API</div>
                      <div><span className="text-emerald-400 font-sans font-semibold">Message ID:</span> {selectedJob.provider_message_id}</div>
                      {selectedJob.sent_at && (
                        <div className="sm:col-span-2">
                          <span className="text-emerald-400 font-sans font-semibold">Sent:</span> {new Date(selectedJob.sent_at).toLocaleString("en-IN")}
                        </div>
                      )}
                    </div>
                  </div>
                )}

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
                      onClick={() => void loadQueue()}
                      disabled={loading}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-slate-800 border border-slate-700 px-3.5 py-2 text-xs font-bold text-slate-200 hover:bg-slate-700 disabled:opacity-50 transition"
                    >
                      <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
                      Refresh
                    </button>
                  </div>
                </div>

                {/* Event Facts / Payload summary */}
                {selectedJob.payload && Object.keys(selectedJob.payload).length > 0 && (
                  <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3.5 text-xs text-slate-300">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                        Verified Event Parameters (Database-Derived)
                      </p>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                      {selectedJob.payload.student_name && (
                        <div>
                          <span className="text-slate-500 block text-[10px] uppercase font-bold">Student</span>
                          <span className="font-bold text-white">{selectedJob.payload.student_name}</span>
                        </div>
                      )}
                      {selectedJob.recipient_email && (
                        <div>
                          <span className="text-slate-500 block text-[10px] uppercase font-bold">Email</span>
                          <span className="font-medium text-slate-200 truncate block">{selectedJob.recipient_email}</span>
                        </div>
                      )}
                      {selectedJob.payload.course && (
                        <div>
                          <span className="text-slate-500 block text-[10px] uppercase font-bold">Course</span>
                          <span className="font-bold text-white">{selectedJob.payload.course}</span>
                        </div>
                      )}
                      {selectedJob.payload.semester !== undefined && selectedJob.payload.semester !== null && (
                        <div>
                          <span className="text-slate-500 block text-[10px] uppercase font-bold">Semester</span>
                          <span className="font-bold text-white">Sem {selectedJob.payload.semester}</span>
                        </div>
                      )}
                      {selectedJob.payload.bundle_name && (
                        <div>
                          <span className="text-slate-500 block text-[10px] uppercase font-bold">Bundle</span>
                          <span className="font-bold text-white">{selectedJob.payload.bundle_name}</span>
                        </div>
                      )}
                      {selectedJob.payload.amount !== undefined && selectedJob.payload.amount !== null && (
                        <div>
                          <span className="text-slate-500 block text-[10px] uppercase font-bold">Amount</span>
                          <span className="font-bold text-emerald-400">₹{selectedJob.payload.amount}</span>
                        </div>
                      )}
                      {(selectedJob.payload.reference_id || selectedJob.payload.reference_last4) && (
                        <div>
                          <span className="text-slate-500 block text-[10px] uppercase font-bold">Reference</span>
                          <span className="font-mono font-bold text-slate-200">
                            {selectedJob.payload.reference_id || `••••${selectedJob.payload.reference_last4}`}
                          </span>
                        </div>
                      )}
                      {selectedJob.payload.utr && (
                        <div>
                          <span className="text-slate-500 block text-[10px] uppercase font-bold">UTR</span>
                          <span className="font-mono text-slate-300">{selectedJob.payload.utr}</span>
                        </div>
                      )}
                      {selectedJob.payload.approved_at && (
                        <div>
                          <span className="text-slate-500 block text-[10px] uppercase font-bold">Approved</span>
                          <span className="text-slate-300">
                            {new Date(selectedJob.payload.approved_at).toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" })}
                          </span>
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
                    placeholder="e.g. BCA Vault — Payment Approved & Access Activated"
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
                        placeholder="Email HTML content..."
                        className="h-72 w-full rounded-xl border border-slate-700 bg-slate-950 p-3 font-mono text-[11px] leading-relaxed text-slate-300 outline-none focus:border-indigo-500"
                      />
                    </div>

                    {/* Live Preview Iframe */}
                    <div className={viewMode === "code" ? "hidden md:block" : "block col-span-2 md:col-span-1"}>
                      <div className="h-72 overflow-hidden rounded-xl border border-slate-700 bg-white flex flex-col">
                        <div className="border-b border-slate-200 bg-slate-100 px-3 py-1.5 text-[10px] text-slate-600 flex items-center justify-between">
                          <span className="truncate"><strong>From:</strong> {REQUIRED_SENDER}</span>
                          <span className="truncate"><strong>To:</strong> {selectedJob.recipient_email}</span>
                        </div>
                        <iframe
                          title="Email Preview"
                          sandbox=""
                          srcDoc={
                            htmlBody ||
                            "<p style='font-family: Arial, sans-serif; padding: 24px; color: #64748b;'>HTML content will render here.</p>"
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
                    {selectedJob.status === "sent" ? "Email Already Sent" : selectedJob.status === "failed" ? "Retry via Gmail API" : "Send via Gmail API"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex min-h-[480px] flex-col items-center justify-center text-center text-slate-500">
                <Mail className="h-12 w-12 text-slate-700 mb-3" />
                <p className="text-sm font-bold text-slate-400">No Email Selected</p>
                <p className="text-xs text-slate-600 mt-1 max-w-sm">
                  Select an email from the queue on the left, or compose a new test email to verify Gmail API delivery.
                </p>
                <button
                  onClick={() => startCompose("test_email")}
                  className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-500 transition shadow-md shadow-indigo-600/20"
                >
                  <Plus className="h-4 w-4" /> Compose Test Email
                </button>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
