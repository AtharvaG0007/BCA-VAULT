import { lazy, Suspense, useEffect, useState, useCallback } from "react";
import { Link, useLocation } from "react-router";
import { toast } from "sonner";
import {
  AlertCircle,
  BarChart3,
  Bell,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Clock,
  ClipboardCheck,
  Copy,
  Eye,
  EyeOff,
  Gift,
  KeyRound,
  Loader2,
  LogOut,
  Mail,
  Menu,
  MoreVertical,
  Package,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
  Upload,
  Users,
  X,
  XCircle,
} from "lucide-react";
import { adminApi } from "@/lib/supabase/adminService";
import { supabase } from "@/lib/supabase/client";
import { useAdminAuth } from "../auth/AdminAuthContext";
import { availableSubjects } from "../../data/syllabus";
import { AdminEmailPage } from "../pages/AdminEmailPage";
import {
  DashboardSkeleton,
  StudentsTableSkeleton,
  PaymentsTableSkeleton,
  ReferralsSkeleton,
  BundlesSkeleton,
  NotesTableSkeleton,
  AccessTableSkeleton,
  ActivityLogsSkeleton,
  EmailConsoleSkeleton,
} from "../admin/AdminSkeletons";

/** Generate a cryptographically strong random password (16 chars, mixed case + digits + symbols). */
function generateStrongPassword(): string {
  const charset = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%&*";
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, (b) => charset[b % charset.length]).join("");
}

type Row = Record<string, any>;

const AdminQuizManagement = lazy(() => import("../quiz/AdminQuizManagement").then(m => ({default:m.AdminQuizManagement})));

const PAGES = [
  { key: "quiz", label: "Quiz Management", icon: ClipboardCheck, group: "CONTENT" },
  { key: "dashboard", label: "Dashboard", icon: BarChart3, group: "DASHBOARD" },
  { key: "students", label: "Students", icon: Users, group: "STUDENTS" },
  { key: "payments", label: "Payment CRM", icon: ShieldCheck, group: "PAYMENTS" },
  { key: "referrals", label: "Referral Management", icon: Gift, group: "REFERRALS" },
  { key: "notices", label: "Notice Board", icon: Bell, group: "NOTICES" },
  { key: "bundles", label: "Bundles", icon: Package, group: "CONTENT" },
  { key: "notes", label: "Study Notes", icon: BookOpen, group: "CONTENT" },
  { key: "access", label: "Access Control", icon: KeyRound, group: "CONTENT" },
  { key: "email", label: "Email Console", icon: Mail, group: "SYSTEM" },
  { key: "activity", label: "Activity Logs", icon: Clock, group: "SYSTEM" },
] as const;

const formatDate = (v: any) =>
  v ? new Date(v).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";

const formatMoney = (v: any) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(
    Number(v || 0)
  );

function StatusBadge({ status }: { status: string }) {
  const s = String(status || "").toLowerCase();
  if (s === "approved" || s === "active" || s === "published") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-700 border border-emerald-200">
        <CheckCircle2 className="h-3 w-3" /> {status}
      </span>
    );
  }
  if (s === "pending" || s === "review" || s === "draft") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-bold text-amber-700 border border-amber-200">
        <Clock className="h-3 w-3" /> {status}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-0.5 text-xs font-bold text-rose-700 border border-rose-200">
      <XCircle className="h-3 w-3" /> {status}
    </span>
  );
}

function AuthStatusBadge({ isVerified, confirmedAt }: { isVerified?: boolean; confirmedAt?: string | null }) {
  const verified = Boolean(isVerified || confirmedAt);
  if (verified) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-950/80 px-2.5 py-0.5 text-xs font-bold text-emerald-300 border border-emerald-700/80">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400"></span>
        🟢 Verified
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-950/80 px-2.5 py-0.5 text-xs font-bold text-amber-300 border border-amber-700/80">
      <span className="h-1.5 w-1.5 rounded-full bg-amber-400"></span>
      🟡 Email Unverified
    </span>
  );
}

// ── Admin Notice Board Management ─────────────────────────────────────────────
const NOTICE_TYPES = ["general", "academic", "payment", "study", "important"] as const;
const NOTICE_PRIORITIES = ["normal", "important"] as const;

interface AdminNotice {
  id: string;
  title: string;
  message: string;
  notice_type: string;
  priority: string;
  published: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

function AdminNoticeBoard() {
  const [notices, setNotices] = useState<AdminNotice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  // Form state
  const [formTitle, setFormTitle] = useState("");
  const [formMessage, setFormMessage] = useState("");
  const [formType, setFormType] = useState<string>("general");
  const [formPriority, setFormPriority] = useState<string>("normal");
  const [formPublished, setFormPublished] = useState(false);

  const resetForm = () => {
    setFormTitle("");
    setFormMessage("");
    setFormType("general");
    setFormPriority("normal");
    setFormPublished(false);
    setEditId(null);
    setShowForm(false);
  };

  const loadNotices = async () => {
    setLoading(true);
    setError("");
    try {
      const { data, error: fetchErr } = await adminApi.listAllNotices();
      if (fetchErr) {
        // Table might not exist yet
        if (fetchErr.code === "42P01" || fetchErr.message?.includes("does not exist")) {
          setNotices([]);
        } else {
          throw fetchErr;
        }
      } else {
        setNotices((data ?? []) as AdminNotice[]);
      }
    } catch (err: any) {
      console.error("[AdminNoticeBoard] load error:", err);
      setError(err.message || "Failed to load notices.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadNotices();
  }, []);

  const startEdit = (n: AdminNotice) => {
    setFormTitle(n.title);
    setFormMessage(n.message);
    setFormType(n.notice_type);
    setFormPriority(n.priority);
    setFormPublished(n.published);
    setEditId(n.id);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!formTitle.trim() || !formMessage.trim()) {
      setError("Title and message are required.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      if (editId) {
        await adminApi.updateNotice(editId, {
          title: formTitle.trim(),
          message: formMessage.trim(),
          notice_type: formType,
          priority: formPriority,
          published: formPublished,
        });
        toast.success("Notice updated.");
      } else {
        await adminApi.createNotice({
          title: formTitle.trim(),
          message: formMessage.trim(),
          notice_type: formType,
          priority: formPriority,
          published: formPublished,
        });
        toast.success("Notice created.");
      }
      resetForm();
      await loadNotices();
    } catch (err: any) {
      console.error("[AdminNoticeBoard] save error:", err);
      setError(err.message || "Failed to save notice.");
    } finally {
      setSaving(false);
    }
  };

  const togglePublish = async (n: AdminNotice) => {
    try {
      await adminApi.updateNotice(n.id, { published: !n.published });
      toast.success(n.published ? "Notice hidden." : "Notice published.");
      await loadNotices();
    } catch (err: any) {
      toast.error(err.message || "Failed to update notice.");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Permanently delete this notice?")) return;
    try {
      await adminApi.deleteNoticeById(id);
      toast.success("Notice deleted.");
      await loadNotices();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete notice.");
    }
  };

  const typeBadgeClass: Record<string, string> = {
    general: "bg-slate-700 text-slate-200 border-slate-600",
    academic: "bg-indigo-900 text-indigo-200 border-indigo-700",
    payment: "bg-emerald-900 text-emerald-200 border-emerald-700",
    study: "bg-blue-900 text-blue-200 border-blue-700",
    important: "bg-amber-900 text-amber-200 border-amber-700",
  };

  return (
    <div className="space-y-6">
      {/* Action Bar */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-400">
          {notices.length} notice{notices.length !== 1 ? "s" : ""} total
        </p>
        <button
          onClick={() => { resetForm(); setShowForm(true); }}
          className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-500 transition"
        >
          <Plus className="h-3.5 w-3.5" />
          Create Notice
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-800 bg-rose-950/60 p-3 text-xs text-rose-300">
          {error}
        </div>
      )}

      {/* Create / Edit Form */}
      {showForm && (
        <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5 space-y-4">
          <h3 className="text-sm font-bold text-white">
            {editId ? "Edit Notice" : "Create New Notice"}
          </h3>
          <div className="space-y-3">
            <label className="block">
              <span className="text-xs font-bold text-slate-400">Title</span>
              <input
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900 p-2.5 text-sm text-white outline-none focus:border-indigo-500"
                placeholder="Notice title"
              />
            </label>
            <label className="block">
              <span className="text-xs font-bold text-slate-400">Message</span>
              <textarea
                value={formMessage}
                onChange={(e) => setFormMessage(e.target.value)}
                rows={4}
                className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900 p-2.5 text-sm text-white outline-none focus:border-indigo-500 resize-y"
                placeholder="Notice message content"
              />
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="block">
                <span className="text-xs font-bold text-slate-400">Type</span>
                <select
                  value={formType}
                  onChange={(e) => setFormType(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900 p-2.5 text-sm text-white outline-none"
                >
                  {NOTICE_TYPES.map((t) => (
                    <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="text-xs font-bold text-slate-400">Priority</span>
                <select
                  value={formPriority}
                  onChange={(e) => setFormPriority(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900 p-2.5 text-sm text-white outline-none"
                >
                  {NOTICE_PRIORITIES.map((p) => (
                    <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
                  ))}
                </select>
              </label>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formPublished}
                onChange={(e) => setFormPublished(e.target.checked)}
                className="h-4 w-4 rounded accent-indigo-600"
              />
              <span className="text-xs font-bold text-slate-300">Publish immediately (visible to students)</span>
            </label>
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
            <button
              onClick={resetForm}
              className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-bold text-slate-300 hover:bg-slate-700"
            >
              Cancel
            </button>
            <button
              onClick={() => void handleSave()}
              disabled={saving}
              className="rounded-xl bg-indigo-600 px-5 py-2 text-xs font-bold text-white hover:bg-indigo-500 disabled:opacity-50"
            >
              {saving ? "Saving…" : editId ? "Update Notice" : "Create Notice"}
            </button>
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-7 w-7 animate-spin text-indigo-400" />
        </div>
      )}

      {/* Notices Table */}
      {!loading && notices.length === 0 && !showForm && (
        <div className="rounded-2xl border border-slate-800 bg-slate-950 p-8 text-center">
          <Bell className="h-10 w-10 text-slate-600 mx-auto mb-3" />
          <p className="text-sm font-bold text-slate-400">No notices yet</p>
          <p className="text-xs text-slate-500 mt-1">Create your first notice to communicate with students.</p>
        </div>
      )}

      {!loading && notices.length > 0 && (
        <div className="rounded-2xl border border-slate-800 bg-slate-950 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-left">
                  <th className="px-4 py-3 text-slate-400 font-bold">Title</th>
                  <th className="px-4 py-3 text-slate-400 font-bold">Type</th>
                  <th className="px-4 py-3 text-slate-400 font-bold">Priority</th>
                  <th className="px-4 py-3 text-slate-400 font-bold">Status</th>
                  <th className="px-4 py-3 text-slate-400 font-bold">Date</th>
                  <th className="px-4 py-3 text-slate-400 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {notices.map((n) => (
                  <tr key={n.id} className="hover:bg-slate-900/50">
                    <td className="px-4 py-3 font-semibold text-white max-w-[200px] truncate">
                      {n.title}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-bold border ${typeBadgeClass[n.notice_type] || typeBadgeClass.general}`}>
                        {n.notice_type}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {n.priority === "important" ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-900 px-2.5 py-0.5 text-[11px] font-bold text-amber-200 border border-amber-700">
                          <AlertCircle className="h-3 w-3" /> Important
                        </span>
                      ) : (
                        <span className="text-slate-500">Normal</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {n.published ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-950 px-2.5 py-0.5 text-[11px] font-bold text-emerald-300 border border-emerald-700">
                          <Eye className="h-3 w-3" /> Published
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-800 px-2.5 py-0.5 text-[11px] font-bold text-slate-400 border border-slate-700">
                          <EyeOff className="h-3 w-3" /> Hidden
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-500">{formatDate(n.created_at)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => startEdit(n)}
                          className="rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-[11px] font-bold text-slate-300 hover:bg-slate-700 transition"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => void togglePublish(n)}
                          className={`rounded-lg border px-2.5 py-1.5 text-[11px] font-bold transition ${
                            n.published
                              ? "border-amber-700 bg-amber-950 text-amber-300 hover:bg-amber-900"
                              : "border-emerald-700 bg-emerald-950 text-emerald-300 hover:bg-emerald-900"
                          }`}
                        >
                          {n.published ? "Hide" : "Publish"}
                        </button>
                        <button
                          onClick={() => void handleDelete(n.id)}
                          className="rounded-lg border border-rose-700 bg-rose-950 px-2.5 py-1.5 text-[11px] font-bold text-rose-300 hover:bg-rose-900 transition"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export function SuperAdminDashboard() {
  const { logout, appUser } = useAdminAuth();
  const location = useLocation();
  const pathSegment = location.pathname.split("/").pop() || "dashboard";
  const activeTab = PAGES.some((p) => p.key === pathSegment) ? pathSegment : "dashboard";

  const [data, setData] = useState<Record<string, Row[]>>({});
  const [referralMetrics, setReferralMetrics] = useState({
    total_referrals: 0,
    pending_referrals: 0,
    successful_referrals: 0,
    rewards_unlocked: 0,
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<any>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMenuStudentId, setActionMenuStudentId] = useState<string | null>(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    setMobileNavOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!mobileNavOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileNavOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [mobileNavOpen]);

  useEffect(() => {
    if (!actionMenuStudentId) return;
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest(`[data-action-menu="${actionMenuStudentId}"]`)) {
        setActionMenuStudentId(null);
      }
    };
    window.addEventListener("click", handleOutsideClick);
    return () => window.removeEventListener("click", handleOutsideClick);
  }, [actionMenuStudentId]);

  // --- Create Student form state ---
  const [csPassword, setCsPassword] = useState("");
  const [csShowPassword, setCsShowPassword] = useState(false);
  const [csCopied, setCsCopied] = useState(false);
  const [csSuccess, setCsSuccess] = useState<{ email: string; password: string } | null>(null);
  const [csError, setCsError] = useState<string | null>(null);

  const handleGeneratePassword = useCallback(() => {
    const pw = generateStrongPassword();
    setCsPassword(pw);
    setCsShowPassword(true);
    setCsCopied(false);
  }, []);

  const handleCopyPassword = useCallback(async (pw: string) => {
    try {
      await navigator.clipboard.writeText(pw);
      setCsCopied(true);
      setTimeout(() => setCsCopied(false), 2000);
    } catch { /* clipboard permission denied */ }
  }, []);

  // Reset create-student state when modal opens/closes
  const openCreateStudentModal = useCallback(() => {
    setCsPassword("");
    setCsShowPassword(false);
    setCsCopied(false);
    setCsSuccess(null);
    setCsError(null);
    setModal({ kind: "create_student" });
  }, []);

  const loadData = async () => {
    if (activeTab === "quiz") { setLoading(false); setError(""); return; }
    setLoading(true);
    setError("");
    try {
      const [p, s, a, b, n, l, ref] = await Promise.all([
        adminApi.listPayments(paymentFilter, search),
        adminApi.listStudents(activeTab === "students" ? search : ""),
        adminApi.listAccess(),
        adminApi.listBundles(),
        adminApi.listNotes(),
        adminApi.listActivity(),
        adminApi.listReferrals(),
      ]);

      const errors = [p.error, s.error, a.error, b.error, n.error, l.error, ref?.error].filter(Boolean);
      if (errors.length > 0) {
        throw errors[0];
      }

      setData({
        payments: p.data || [],
        students: s.data || [],
        access: a.data || [],
        bundles: b.data || [],
        notes: n.data || [],
        activity: l.data || [],
        referrals: ref?.data?.referrals || [],
        rewards: ref?.data?.rewards || [],
      });

      if (ref?.data?.metrics) {
        setReferralMetrics(ref.data.metrics);
      }
    } catch (err: any) {
      console.error("[SuperAdmin] load error:", err);
      setError(err.message || "Unable to load data from Supabase.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, [activeTab, paymentFilter]);

  const payments = data.payments || [];
  const students = data.students || [];
  const access = data.access || [];
  const bundles = data.bundles || [];
  const notes = data.notes || [];
  const activity = data.activity || [];
  const adminReferrals = data.referrals || [];
  const adminRewards = data.rewards || [];

  const approvedPayments = payments.filter((x) => x.status === "approved");
  const totalRevenue = approvedPayments.reduce((acc, x) => acc + Number(x.amount || 0), 0);

  const reviewPayment = async (id: string, status: "approved" | "rejected", note = "") => {
    setActionLoading(true);
    try {
      await adminApi.reviewPayment(id, status, note);
      setModal(null);
      await loadData();
    } catch (err: any) {
      setError(err.message || "Failed to update payment status.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleVerifyEmail = async (userId: string) => {
    setActionLoading(true);
    try {
      const res = await adminApi.verifyStudentEmail(userId);
      toast.success(res?.message || "Student email verified successfully.");
      setModal(null);
      await loadData();
    } catch (err: any) {
      console.error("Email verification error:", err);
      toast.error(err.message || "Failed to verify student email.");
    } finally {
      setActionLoading(false);
    }
  };

  const showPaymentDetails = async (x: Row) => {
    let imageUrl = "";
    if (x.screenshot_path) {
      try {
        const res = await adminApi.paymentUrl(x.screenshot_bucket || "bca-payment-evidence", x.screenshot_path);
        imageUrl = res.url;
      } catch (err) {
        console.error("Screenshot URL error:", err);
      }
    }
    setModal({ kind: "payment_details", payment: x, imageUrl });
  };

  const handleCreateStudentSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setCsError(null);
    if (!csPassword || csPassword.length < 6) {
      setCsError("Password must be at least 6 characters.");
      return;
    }
    setActionLoading(true);
    try {
      const f = new FormData(e.currentTarget);
      const payload = {
        full_name: String(f.get("full_name") || "").trim(),
        email: String(f.get("email") || "").trim().toLowerCase(),
        phone: String(f.get("phone") || "").trim(),
        course: String(f.get("course") || "BCA").trim(),
        semester: Number(f.get("semester") || 1),
        password: csPassword,
      };
      const result = await adminApi.createStudent(payload);
      setCsSuccess({ email: payload.email, password: result.student.temporary_password || csPassword });
      await loadData();
    } catch (err: any) {
      const msg = err.message || "Failed to create student.";
      setCsError(msg.includes("already") ? "A user with this email already exists." : msg);
    } finally {
      setActionLoading(false);
    }
  };

  const handleModalSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setActionLoading(true);
    setError("");
    const f = new FormData(e.currentTarget);
    try {
      if (modal.kind === "grant_access") {
        await adminApi.grantAccess(
          String(f.get("user_id")),
          String(f.get("bundle_id")),
          String(f.get("expires_at") || "")
        );
      } else if (modal.kind === "create_bundle") {
        await adminApi.saveBundle({
          title: String(f.get("title")),
          description: String(f.get("description") || ""),
          price: Number(f.get("price")),
          published: f.get("published") === "on",
        });
      } else if (modal.kind === "upload_note") {
        const file = f.get("file") as File;
        if (!file || file.type !== "application/pdf") {
          throw new Error("Only PDF files are allowed.");
        }
        const semester = Number(f.get("semester") || 1);
        const title = String(f.get("title") || "").trim();
        const description = String(f.get("description") || "").trim();
        const subject = String(f.get("subject") || "").trim();
        const bundleId = String(f.get("bundle_id") || "").trim();
        const published = f.get("published") === "on" || f.get("published") === "true";
        const isProtected = f.get("is_protected") === "on" || f.get("is_protected") === "true";

        if (!title || !description || !bundleId) {
          throw new Error("Title, description, and bundle are required.");
        }

        // 1. Get signed upload URL for Bca_notes bucket (targeting BCA SEM{semester}/...)
        const uploadAuth = await adminApi.noteUploadUrl(file.name, semester);

        // 2. Upload file to Supabase storage
        const { error: uploadError } = await supabase.storage
          .from(uploadAuth.bucket)
          .uploadToSignedUrl(uploadAuth.path, uploadAuth.token, file, {
            contentType: "application/pdf",
          });

        if (uploadError) {
          console.error("[Storage Upload Error]:", uploadError);
          throw new Error(`Storage upload failed: ${uploadError.message}`);
        }

        // 3. Insert into notes table (only with columns that exist in the database)
        try {
          await adminApi.saveNote({
            title,
            description,
            subject: subject || null,
            semester,
            bundle_id: bundleId,
            storage_bucket: uploadAuth.bucket,
            storage_path: uploadAuth.path,
            published,
            is_protected: isProtected,
          });
        } catch (dbErr: any) {
          console.error("[Database Insert Error]:", dbErr);
          // Safely remove the newly uploaded file to avoid orphaned storage
          try {
            await supabase.storage.from(uploadAuth.bucket).remove([uploadAuth.path]);
          } catch (cleanErr) {
            console.warn("Orphaned file cleanup error:", cleanErr);
          }
          throw new Error(dbErr.message || "Failed to save note record in database.");
        }
      }
      setModal(null);
      await loadData();
    } catch (err: any) {
      console.error("[Admin Modal Submit Error]:", err);
      setError(err.message || "Operation failed.");
    } finally {
      setActionLoading(false);
    }
  };

  const currentTabObj = PAGES.find((p) => p.key === activeTab) || PAGES[0];

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col lg:flex-row">
      {/* Sidebar */}
      {/* Mobile Top Header */}
      <header className="lg:hidden sticky top-0 z-40 bg-slate-950 border-b border-slate-800 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setMobileNavOpen(true)}
            className="flex h-11 w-11 min-h-[44px] min-w-[44px] items-center justify-center rounded-xl bg-slate-900 border border-slate-800 text-slate-200 hover:text-white transition cursor-pointer"
            aria-label="Open Admin Navigation Menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-indigo-600 text-white font-black text-xs shadow-md shadow-indigo-600/30">
              BV
            </div>
            <div>
              <p className="font-black text-xs tracking-tight text-white leading-none">BCA VAULT</p>
              <p className="text-[9px] font-bold uppercase tracking-widest text-indigo-400 mt-0.5">Admin</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="rounded-full bg-slate-800 px-2.5 py-1 text-[11px] font-bold text-indigo-300 border border-slate-700">
            {currentTabObj.label}
          </span>
          <button
            onClick={() => void loadData()}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-700 bg-slate-800 text-slate-300 hover:text-white transition"
            title="Refresh"
            aria-label="Refresh data"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </header>

      {/* Mobile Drawer Overlay and Drawer */}
      {mobileNavOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileNavOpen(false)}
            aria-hidden="true"
          />
          <aside
            role="dialog"
            aria-modal="true"
            aria-label="Admin Navigation Drawer"
            className="fixed inset-y-0 left-0 w-72 max-w-[85vw] bg-slate-950 border-r border-slate-800 p-5 flex flex-col justify-between overflow-y-auto shadow-2xl z-50"
          >
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-slate-800/80 mb-5">
                <div className="flex items-center gap-2.5">
                  <div className="grid h-8 w-8 place-items-center rounded-xl bg-indigo-600 text-white font-black text-xs shadow-md shadow-indigo-600/30">
                    BV
                  </div>
                  <div>
                    <h2 className="font-black text-sm tracking-tight text-white">BCA VAULT</h2>
                    <p className="text-[9px] font-bold uppercase tracking-widest text-indigo-400">Super Admin</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setMobileNavOpen(false)}
                  className="flex h-11 w-11 min-h-[44px] min-w-[44px] items-center justify-center rounded-xl text-slate-400 hover:text-white hover:bg-slate-900 transition"
                  aria-label="Close Navigation Drawer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <nav className="space-y-4">
                {["DASHBOARD", "STUDENTS", "PAYMENTS", "REFERRALS", "NOTICES", "CONTENT", "SYSTEM"].map((groupName) => {
                  const groupPages = PAGES.filter((p) => p.group === groupName);
                  if (!groupPages.length) return null;
                  return (
                    <div key={groupName} className="space-y-1">
                      <p className="px-3.5 text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                        {groupName}
                      </p>
                      {groupPages.map((page) => {
                        const Icon = page.icon;
                        const isActive = activeTab === page.key;
                        return (
                          <Link
                            key={page.key}
                            to={`/admin/${page.key}`}
                            onClick={() => setMobileNavOpen(false)}
                            className={`flex min-h-[44px] items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition ${
                              isActive
                                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20"
                                : "text-slate-400 hover:bg-slate-900 hover:text-white"
                            }`}
                          >
                            <Icon className="h-4 w-4 shrink-0" />
                            <span>{page.label}</span>
                          </Link>
                        );
                      })}
                    </div>
                  );
                })}
              </nav>
            </div>

            <div className="mt-8 pt-4 border-t border-slate-800/80 px-2">
              <div className="mb-3">
                <p className="text-[11px] font-semibold text-slate-400 truncate">{appUser?.email}</p>
                <p className="text-[10px] text-emerald-400 font-bold">● Active Session</p>
              </div>
              <button
                onClick={() => { setMobileNavOpen(false); void logout(); }}
                className="flex min-h-[44px] items-center gap-2 w-full px-3 py-2.5 rounded-xl text-xs font-bold text-rose-400 hover:bg-rose-950/40 hover:text-rose-300 transition"
              >
                <LogOut className="h-4 w-4" />
                <span>Sign Out</span>
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Desktop Persistent Sidebar */}
      <aside className="hidden lg:flex lg:w-64 bg-slate-950 border-r border-slate-800 p-5 flex-col justify-between shrink-0">
        <div>
          <div className="flex items-center gap-3 px-2 py-3 border-b border-slate-800/80 mb-6">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-indigo-600 text-white font-black shadow-lg shadow-indigo-600/30">
              BV
            </div>
            <div>
              <h1 className="font-black text-sm tracking-tight text-white">BCA VAULT</h1>
              <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-400">Super Admin</p>
            </div>
          </div>

          <nav className="space-y-4">
          {["DASHBOARD", "STUDENTS", "PAYMENTS", "REFERRALS", "NOTICES", "CONTENT", "SYSTEM"].map((groupName) => {
              const groupPages = PAGES.filter((p) => p.group === groupName);
              if (!groupPages.length) return null;
              return (
                <div key={groupName} className="space-y-1">
                  <p className="px-3.5 text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                    {groupName}
                  </p>
                  {groupPages.map((page) => {
                    const Icon = page.icon;
                    const isActive = activeTab === page.key;
                    return (
                      <Link
                        key={page.key}
                        to={`/admin/${page.key}`}
                        className={`flex items-center gap-3 px-3.5 py-2 rounded-xl text-xs font-bold transition ${
                          isActive
                            ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20"
                            : "text-slate-400 hover:bg-slate-900 hover:text-white"
                        }`}
                      >
                        <Icon className="h-4 w-4 shrink-0" />
                        <span>{page.label}</span>
                      </Link>
                    );
                  })}
                </div>
              );
            })}
          </nav>
        </div>

        <div className="mt-8 pt-4 border-t border-slate-800/80 px-2">
          <div className="mb-3">
            <p className="text-[11px] font-semibold text-slate-400 truncate">{appUser?.email}</p>
            <p className="text-[10px] text-emerald-400 font-bold">● Active Session</p>
          </div>
          <button
            onClick={() => void logout()}
            className="flex items-center gap-2 w-full px-3 py-2 rounded-xl text-xs font-bold text-rose-400 hover:bg-rose-950/40 hover:text-rose-300 transition"
          >
            <LogOut className="h-4 w-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 min-w-0 p-5 lg:p-8 bg-slate-900">
        {/* Header */}
        <header className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
              <span>Admin Portal</span>
              <ChevronRight className="h-3 w-3" />
              <span className="text-indigo-400 capitalize">{currentTabObj.label}</span>
            </div>
            <h2 className="text-2xl font-black text-white mt-1 capitalize">{currentTabObj.label}</h2>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => void loadData()}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-3.5 py-2 text-xs font-bold text-slate-200 hover:bg-slate-700 transition"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              <span>Refresh</span>
            </button>
          </div>
        </header>

        {error && (
          <div
            role="alert"
            className="mb-6 flex items-center gap-3 rounded-2xl border border-rose-800 bg-rose-950/60 p-4 text-xs font-medium text-rose-300"
          >
            <AlertCircle className="h-5 w-5 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        {activeTab === "quiz" && <Suspense fallback={<p>Loading quiz management…</p>}><AdminQuizManagement /></Suspense>}
        {loading && !Object.keys(data).length ? (
          <>
            {activeTab === "dashboard" && <DashboardSkeleton />}
            {activeTab === "students" && <StudentsTableSkeleton />}
            {activeTab === "payments" && <PaymentsTableSkeleton />}
            {activeTab === "referrals" && <ReferralsSkeleton />}
            {activeTab === "bundles" && <BundlesSkeleton />}
            {activeTab === "notes" && <NotesTableSkeleton />}
            {activeTab === "access" && <AccessTableSkeleton />}
            {activeTab === "email" && <EmailConsoleSkeleton />}
            {activeTab === "activity" && <ActivityLogsSkeleton />}
          </>
        ) : (
          <>
            {/* Dashboard Tab */}
            {activeTab === "dashboard" && (
              <div className="space-y-6">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {[
                    { label: "Total Students", value: students.length },
                    {
                      label: "Pending Payments",
                      value: payments.filter((x) => x.status === "pending").length,
                    },
                    {
                      label: "Approved Access",
                      value: access.filter((x) => x.status === "active").length,
                    },
                    { label: "Total Revenue", value: formatMoney(totalRevenue) },
                    { label: "Total Referrals", value: referralMetrics.total_referrals },
                    { label: "Pending Referrals", value: referralMetrics.pending_referrals },
                    { label: "Successful Referrals", value: referralMetrics.successful_referrals },
                    { label: "Unlocked Rewards", value: referralMetrics.rewards_unlocked },
                  ].map((stat) => (
                    <div
                      key={stat.label}
                      className="rounded-2xl border border-slate-800 bg-slate-950 p-5 shadow-xl shadow-black/20"
                    >
                      <p className="text-xs font-bold text-slate-400">{stat.label}</p>
                      <p className="mt-2 text-3xl font-black text-white">{stat.value}</p>
                    </div>
                  ))}
                </div>

                <div className="rounded-2xl border border-slate-800 bg-slate-950 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-base font-bold text-white">Recent Payment Submissions</h3>
                    <Link
                      to="/admin/payments"
                      className="text-xs font-bold text-indigo-400 hover:text-indigo-300"
                    >
                      View All Payments →
                    </Link>
                  </div>
                  {payments.length === 0 ? (
                    <p className="py-8 text-center text-xs text-slate-500">No payment submissions recorded yet.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[640px] text-left text-xs">
                        <thead>
                          <tr className="border-b border-slate-800 text-slate-400 font-semibold">
                            <th className="pb-3">Student</th>
                            <th className="pb-3">Email</th>
                            <th className="pb-3">Amount</th>
                            <th className="pb-3">UTR</th>
                            <th className="pb-3">Status</th>
                            <th className="pb-3">Date</th>
                            <th className="pb-3 text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60 text-slate-300">
                          {payments.slice(0, 6).map((p) => (
                            <tr key={p.id} className="hover:bg-slate-900/50">
                              <td className="py-3 font-bold text-white">{p.full_name}</td>
                              <td className="py-3 text-slate-400">{p.email}</td>
                              <td className="py-3 font-bold text-indigo-400">{formatMoney(p.amount)}</td>
                              <td className="py-3 font-mono text-slate-400">{p.utr}</td>
                              <td className="py-3">
                                <StatusBadge status={p.status} />
                              </td>
                              <td className="py-3 text-slate-500">{formatDate(p.created_at)}</td>
                              <td className="py-3 text-right">
                                <button
                                  onClick={() => showPaymentDetails(p)}
                                  className="rounded-lg bg-slate-800 px-2.5 py-1 text-xs font-bold text-slate-200 hover:bg-indigo-600 hover:text-white transition"
                                >
                                  Review
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Payments Tab */}
            {activeTab === "payments" && (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    {["all", "pending", "approved", "rejected"].map((f) => (
                      <button
                        key={f}
                        onClick={() => setPaymentFilter(f)}
                        className={`rounded-xl px-3 py-1.5 text-xs font-bold capitalize transition ${
                          paymentFilter === f
                            ? "bg-indigo-600 text-white"
                            : "border border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700"
                        }`}
                      >
                        {f}
                      </button>
                    ))}
                  </div>

                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search name, email, UTR..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && loadData()}
                      className="rounded-xl border border-slate-700 bg-slate-950 pl-9 pr-4 py-1.5 text-xs text-white placeholder-slate-500 outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5 overflow-hidden">
                  {payments.length === 0 ? (
                    <div className="py-12 text-center text-xs text-slate-500">
                      No payments found matching filter "{paymentFilter}".
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[640px] text-left text-xs">
                        <thead>
                          <tr className="border-b border-slate-800 text-slate-400 font-semibold">
                            <th className="pb-3">Student Name</th>
                            <th className="pb-3">Email & Phone</th>
                            <th className="pb-3">Course / Sem</th>
                            <th className="pb-3">Amount</th>
                            <th className="pb-3">UTR / Ref</th>
                            <th className="pb-3">Referral Code</th>
                            <th className="pb-3">Bundle</th>
                            <th className="pb-3">Status</th>
                            <th className="pb-3">Date</th>
                            <th className="pb-3 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60 text-slate-300">
                          {payments.map((p) => {
                            const bundleTitle = p.bundles?.title || "Complete Bundle";
                            return (
                              <tr key={p.id} className="hover:bg-slate-900/50">
                                <td className="py-3 font-bold text-white">{p.full_name}</td>
                                <td className="py-3">
                                  <p className="text-slate-200">{p.email}</p>
                                  <p className="text-[10px] text-slate-500">{p.phone}</p>
                                </td>
                                <td className="py-3 text-slate-400">
                                  {p.course} · Sem {p.semester}
                                </td>
                                <td className="py-3 font-bold text-indigo-400">{formatMoney(p.amount)}</td>
                                <td className="py-3">
                                  <p className="font-mono text-[11px] text-slate-300 font-semibold">{p.utr}</p>
                                  <p className="font-mono text-[10px] text-slate-500">{p.reference_id}</p>
                                </td>
                                <td className="py-3">
                                  {p.referral_code ? (
                                    <span className="inline-flex items-center gap-1 rounded-md bg-indigo-950/80 border border-indigo-700/60 px-2 py-0.5 font-mono text-[11px] font-bold text-indigo-300">
                                      <Gift className="w-3 h-3 text-indigo-400" />
                                      {p.referral_code}
                                    </span>
                                  ) : (
                                    <span className="text-slate-600 text-[11px]">—</span>
                                  )}
                                </td>
                                <td className="py-3">
                                  <span className="inline-block max-w-[140px] truncate font-medium text-slate-300" title={bundleTitle}>
                                    {bundleTitle}
                                  </span>
                                </td>
                                <td className="py-3">
                                  <StatusBadge status={p.status} />
                                </td>
                                <td className="py-3 text-slate-500">{formatDate(p.created_at)}</td>
                                <td className="py-3 text-right">
                                  <div className="inline-flex items-center gap-1.5">
                                    <button
                                      onClick={() => showPaymentDetails(p)}
                                      className="rounded-lg bg-slate-800 px-2.5 py-1 text-xs font-bold text-slate-200 hover:bg-slate-700"
                                    >
                                      Details
                                    </button>
                                    {p.status === "pending" && (
                                      <>
                                        <button
                                          onClick={() => reviewPayment(p.id, "approved")}
                                          disabled={actionLoading}
                                          className="rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-bold text-white hover:bg-emerald-500 transition"
                                        >
                                          Approve
                                        </button>
                                        <button
                                          onClick={() => {
                                            const notes = prompt("Reason for rejection (optional):");
                                            if (notes !== null) {
                                              void reviewPayment(p.id, "rejected", notes);
                                            }
                                          }}
                                          disabled={actionLoading}
                                          className="rounded-lg bg-rose-600 px-2.5 py-1 text-xs font-bold text-white hover:bg-rose-500 transition"
                                        >
                                          Reject
                                        </button>
                                      </>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Referrals Tab */}
            {activeTab === "referrals" && (
              <div className="space-y-6">
                {/* Metrics */}
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5 shadow-xl shadow-black/20">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold text-slate-400">Total Referrals</p>
                      <Users className="w-4 h-4 text-slate-400" />
                    </div>
                    <p className="mt-2 text-3xl font-black text-white">{referralMetrics.total_referrals}</p>
                    <p className="text-[11px] text-slate-500 mt-1">Codes applied across orders</p>
                  </div>

                  <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5 shadow-xl shadow-black/20">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold text-amber-400">Pending Referrals</p>
                      <Clock className="w-4 h-4 text-amber-400" />
                    </div>
                    <p className="mt-2 text-3xl font-black text-amber-400">{referralMetrics.pending_referrals}</p>
                    <p className="text-[11px] text-slate-500 mt-1">Awaiting payment verification</p>
                  </div>

                  <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5 shadow-xl shadow-black/20">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold text-emerald-400">Successful Referrals</p>
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    </div>
                    <p className="mt-2 text-3xl font-black text-emerald-400">{referralMetrics.successful_referrals}</p>
                    <p className="text-[11px] text-slate-500 mt-1">Qualified via payment approval</p>
                  </div>

                  <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5 shadow-xl shadow-black/20">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold text-indigo-400">Rewards Unlocked</p>
                      <Gift className="w-4 h-4 text-indigo-400" />
                    </div>
                    <p className="mt-2 text-3xl font-black text-indigo-400">{referralMetrics.rewards_unlocked}</p>
                    <p className="text-[11px] text-slate-500 mt-1">Most Repeated Questions unlocked</p>
                  </div>
                </div>

                {/* Referrals Table */}
                <div className="rounded-2xl border border-slate-800 bg-slate-950 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-base font-bold text-white">Referrals Table</h3>
                      <p className="text-xs text-slate-400">Track student referrals and their qualifying status</p>
                    </div>
                    <span className="text-xs text-slate-500 font-semibold">{adminReferrals.length} referrals</span>
                  </div>

                  {adminReferrals.length === 0 ? (
                    <div className="py-10 text-center text-xs text-slate-500">
                      No referral records recorded yet.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[640px] text-left text-xs">
                        <thead>
                          <tr className="border-b border-slate-800 text-slate-400 font-semibold">
                            <th className="pb-3">Referrer</th>
                            <th className="pb-3">Referred Student</th>
                            <th className="pb-3">Referral Code</th>
                            <th className="pb-3">Status</th>
                            <th className="pb-3">Created Date</th>
                            <th className="pb-3">Successful Date</th>
                            <th className="pb-3 text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60 text-slate-300">
                          {adminReferrals.map((r: any) => (
                            <tr key={r.id} className="hover:bg-slate-900/50">
                              <td className="py-3">
                                <p className="font-bold text-white">{r.referrer_name}</p>
                                <p className="text-[11px] text-slate-400">{r.referrer_email}</p>
                              </td>
                              <td className="py-3">
                                <p className="font-bold text-white">{r.referred_name}</p>
                                <p className="text-[11px] text-slate-400">{r.referred_email}</p>
                              </td>
                              <td className="py-3">
                                <span className="font-mono bg-indigo-950 border border-indigo-800/80 text-indigo-300 px-2 py-0.5 rounded-md font-bold text-[11px]">
                                  {r.referral_code}
                                </span>
                              </td>
                              <td className="py-3">
                                <StatusBadge status={r.status} />
                              </td>
                              <td className="py-3 text-slate-400">{formatDate(r.created_at)}</td>
                              <td className="py-3 text-slate-400">{formatDate(r.successful_at)}</td>
                              <td className="py-3 text-right">
                                <button
                                  onClick={() => setModal({ kind: "referral_detail", item: r })}
                                  className="rounded-lg bg-slate-800 px-2.5 py-1 text-xs font-bold text-slate-200 hover:bg-indigo-600 hover:text-white transition"
                                >
                                  View Flow
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Rewards Table */}
                <div className="rounded-2xl border border-slate-800 bg-slate-950 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-base font-bold text-white">Unlocked Rewards Table</h3>
                      <p className="text-xs text-slate-400">Most Repeated Questions reward access grants</p>
                    </div>
                    <span className="text-xs text-slate-500 font-semibold">{adminRewards.length} rewards</span>
                  </div>

                  {adminRewards.length === 0 ? (
                    <div className="py-10 text-center text-xs text-slate-500">
                      No rewards unlocked yet.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[640px] text-left text-xs">
                        <thead>
                          <tr className="border-b border-slate-800 text-slate-400 font-semibold">
                            <th className="pb-3">Student</th>
                            <th className="pb-3">Reward Type</th>
                            <th className="pb-3">Status</th>
                            <th className="pb-3">Unlocked At</th>
                            <th className="pb-3 text-right">Claimed At</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60 text-slate-300">
                          {adminRewards.map((rw: any) => (
                            <tr key={rw.id} className="hover:bg-slate-900/50">
                              <td className="py-3">
                                <p className="font-bold text-white">{rw.student_name}</p>
                                <p className="text-[11px] text-slate-400">{rw.student_email}</p>
                              </td>
                              <td className="py-3">
                                <span className="inline-flex items-center gap-1.5 text-indigo-300 font-semibold">
                                  <Gift className="w-3.5 h-3.5 text-indigo-400" />
                                  {rw.reward_type}
                                </span>
                              </td>
                              <td className="py-3">
                                <StatusBadge status={rw.status} />
                              </td>
                              <td className="py-3 text-slate-400">{formatDate(rw.unlocked_at)}</td>
                              <td className="py-3 text-slate-500 text-right">{formatDate(rw.claimed_at)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Students Tab */}
            {activeTab === "students" && (
              <div className="space-y-4">
                {/* Compact and organized header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <h2 className="text-base sm:text-lg font-bold text-white">Students</h2>
                    <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[11px] font-semibold text-slate-400">
                      {students.length}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <div className="relative">
                      <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
                      <input
                        type="text"
                        placeholder="Search students..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && loadData()}
                        className="rounded-xl border border-slate-700 bg-slate-950 pl-8 pr-3.5 py-1.5 text-xs text-white placeholder-slate-500 outline-none focus:border-indigo-500 w-44 sm:w-56"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => loadData()}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-slate-800 hover:text-white transition"
                      title="Refresh students list"
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                      <span>Refresh</span>
                    </button>
                    <button
                      type="button"
                      onClick={openCreateStudentModal}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-indigo-500 transition shadow-sm"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>Add Student</span>
                    </button>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5">
                  {students.length === 0 ? (
                    <div className="py-12 text-center text-xs text-slate-500">No registered students found.</div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[640px] text-left text-xs">
                        <thead>
                          <tr className="border-b border-slate-800 text-slate-400 font-semibold tracking-wide">
                            <th className="pb-3 pr-4">STUDENT</th>
                            <th className="pb-3 pr-4">ACCOUNT</th>
                            <th className="pb-3 pr-4">PAYMENT</th>
                            <th className="pb-3 pr-4">BUNDLE</th>
                            <th className="pb-3 pr-4">REGISTERED</th>
                            <th className="pb-3 text-right">ACTIONS</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60 text-slate-300">
                          {students.map((s) => {
                            const assignedBundles: string[] = s.assigned_bundles || [];
                            const rawPaymentStatus = String(s.payment_status || "unpaid").toLowerCase();
                            const paymentDisplay =
                              rawPaymentStatus === "approved"
                                ? "Approved"
                                : rawPaymentStatus === "pending"
                                ? "Pending"
                                : "Unpaid";
                            const isVerified = Boolean(s.is_verified || s.email_confirmed_at);
                            const isActive = s.status === "active";
                            const isMenuOpen = actionMenuStudentId === s.user_id;

                            return (
                              <tr key={s.user_id} className="hover:bg-slate-900/50">
                                {/* STUDENT */}
                                <td className="py-3.5 pr-4">
                                  <p className="font-bold text-white text-sm">{s.full_name || "—"}</p>
                                  <p className="text-xs text-slate-400 mt-0.5">{s.email || "—"}</p>
                                  {s.user_id && (
                                    <div className="flex items-center gap-1 mt-0.5">
                                      <code className="text-[10px] font-mono text-slate-500 select-all">
                                        {s.user_id.slice(0, 8)}...{s.user_id.slice(-4)}
                                      </code>
                                      <button
                                        type="button"
                                        onClick={() => handleCopyPassword(s.user_id)}
                                        title="Copy User ID"
                                        className="text-slate-500 hover:text-slate-300 transition"
                                      >
                                        <Copy className="h-2.5 w-2.5" />
                                      </button>
                                    </div>
                                  )}
                                </td>

                                {/* ACCOUNT */}
                                <td className="py-3.5 pr-4">
                                  <div className="space-y-1">
                                    <div className="flex items-center gap-1.5 text-xs font-semibold">
                                      {isVerified ? (
                                        <span className="inline-flex items-center gap-1 text-emerald-400">
                                          <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                                          <span>Verified</span>
                                        </span>
                                      ) : (
                                        <span className="inline-flex items-center gap-1 text-amber-400">
                                          <Clock className="h-3 w-3 text-amber-400" />
                                          <span>Unverified</span>
                                        </span>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-1.5 text-xs font-medium">
                                      <span
                                        className={`h-1.5 w-1.5 rounded-full ${
                                          isActive ? "bg-emerald-400" : "bg-rose-400"
                                        }`}
                                      />
                                      <span className={isActive ? "text-slate-300 capitalize" : "text-rose-400 capitalize"}>
                                        {isActive ? "Active" : s.status || "Inactive"}
                                      </span>
                                    </div>
                                  </div>
                                </td>

                                {/* PAYMENT */}
                                <td className="py-3.5 pr-4">
                                  <StatusBadge status={paymentDisplay} />
                                </td>

                                {/* BUNDLE */}
                                <td className="py-3.5 pr-4">
                                  {assignedBundles.length > 0 ? (
                                    <div className="flex flex-wrap gap-1 max-w-[240px] line-clamp-2">
                                      {assignedBundles.map((bTitle, idx) => (
                                        <span
                                          key={idx}
                                          className="inline-block rounded-md bg-indigo-950/80 border border-indigo-800/80 px-2 py-0.5 text-[11px] font-bold text-indigo-300 truncate max-w-[220px]"
                                          title={bTitle}
                                        >
                                          {bTitle}
                                        </span>
                                      ))}
                                    </div>
                                  ) : (
                                    <span className="text-slate-500 text-xs">No bundle</span>
                                  )}
                                </td>

                                {/* REGISTERED */}
                                <td className="py-3.5 pr-4 text-slate-400 text-xs whitespace-nowrap">
                                  {formatDate(s.created_at)}
                                </td>

                                {/* ACTIONS */}
                                <td className="py-3.5 text-right">
                                  <div
                                    className="inline-flex items-center justify-end gap-2 relative"
                                    data-action-menu={s.user_id}
                                  >
                                    <button
                                      type="button"
                                      onClick={async () => {
                                        await adminApi.updateProfile(
                                          s.user_id,
                                          s.status === "active" ? "inactive" : "active"
                                        );
                                        await loadData();
                                      }}
                                      className={`rounded-lg px-2.5 py-1.5 text-xs font-bold transition shadow-xs ${
                                        isActive
                                          ? "bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white"
                                          : "bg-emerald-950/80 text-emerald-300 border border-emerald-700/80 hover:bg-emerald-900/80"
                                      }`}
                                    >
                                      {isActive ? "Deactivate" : "Activate"}
                                    </button>

                                    <div className="relative">
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setActionMenuStudentId(isMenuOpen ? null : s.user_id);
                                        }}
                                        className="inline-flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-800 px-2 py-1.5 text-xs font-bold text-slate-300 hover:bg-slate-750 hover:text-white transition"
                                        title="More actions"
                                      >
                                        <MoreVertical className="h-3.5 w-3.5" />
                                        <span>More</span>
                                      </button>

                                      {isMenuOpen && (
                                        <div
                                          className="absolute right-0 top-full mt-1.5 w-44 rounded-xl border border-slate-700 bg-slate-900 py-1.5 shadow-2xl z-30 text-left"
                                          onClick={(e) => e.stopPropagation()}
                                        >
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setActionMenuStudentId(null);
                                              setModal({ kind: "grant_access", initialUserId: s.user_id });
                                            }}
                                            className="flex w-full items-center gap-2 px-3 py-2 text-xs font-medium text-slate-200 hover:bg-slate-800 transition"
                                          >
                                            <Package className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
                                            <span>Manage Bundles</span>
                                          </button>

                                          <button
                                            type="button"
                                            onClick={async () => {
                                              setActionMenuStudentId(null);
                                              if (confirm(`Send password reset email to ${s.email}?`)) {
                                                await adminApi.resetPassword(s.email);
                                                toast.success("Password reset email sent successfully.");
                                              }
                                            }}
                                            className="flex w-full items-center gap-2 px-3 py-2 text-xs font-medium text-slate-200 hover:bg-slate-800 transition"
                                          >
                                            <KeyRound className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                                            <span>Reset Password</span>
                                          </button>

                                          {!isVerified && (
                                            <button
                                              type="button"
                                              onClick={() => {
                                                setActionMenuStudentId(null);
                                                setModal({ kind: "verify_student_email", student: s });
                                              }}
                                              className="flex w-full items-center gap-2 px-3 py-2 text-xs font-semibold text-emerald-300 hover:bg-slate-800 transition border-t border-slate-800/80"
                                            >
                                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                                              <span>Verify Email</span>
                                            </button>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Access Control Tab */}
            {activeTab === "access" && (
              <div className="space-y-4">
                <div className="flex justify-end">
                  <button
                    onClick={() => setModal({ kind: "grant_access" })}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-indigo-500 transition"
                  >
                    <Plus className="h-3.5 w-3.5" /> Grant Bundle Access
                  </button>
                </div>

                <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5">
                  {access.length === 0 ? (
                    <div className="py-12 text-center text-xs text-slate-500">No active access records found.</div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[640px] text-left text-xs">
                        <thead>
                          <tr className="border-b border-slate-800 text-slate-400 font-semibold">
                            <th className="pb-3">Student Name</th>
                            <th className="pb-3">Student Email</th>
                            <th className="pb-3">Authorized Bundle</th>
                            <th className="pb-3">Status</th>
                            <th className="pb-3">Granted On</th>
                            <th className="pb-3 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60 text-slate-300">
                          {access.map((item) => {
                            const profile = item.profiles;
                            const bundle = item.bundles;
                            return (
                              <tr key={item.id} className="hover:bg-slate-900/50">
                                <td className="py-3 font-bold text-white">{profile?.full_name || "—"}</td>
                                <td className="py-3 text-slate-400">{profile?.email || "—"}</td>
                                <td className="py-3 font-bold text-indigo-400">{bundle?.title || "—"}</td>
                                <td className="py-3">
                                  <StatusBadge status={item.status} />
                                </td>
                                <td className="py-3 text-slate-500">{formatDate(item.granted_at)}</td>
                                <td className="py-3 text-right">
                                  {item.status === "active" && (
                                    <button
                                      onClick={async () => {
                                        if (confirm("Revoke access for this student?")) {
                                          await adminApi.revokeAccess(item.id);
                                          await loadData();
                                        }
                                      }}
                                      className="rounded-lg bg-rose-950/60 border border-rose-800 px-2.5 py-1 text-xs font-bold text-rose-300 hover:bg-rose-900 transition"
                                    >
                                      Revoke
                                    </button>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Notes Tab */}
            {activeTab === "notes" && (
              <div className="space-y-4">
                <div className="flex justify-end">
                  <button
                    onClick={() => setModal({ kind: "upload_note" })}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-indigo-500 transition"
                  >
                    <Upload className="h-3.5 w-3.5" /> Upload Note PDF
                  </button>
                </div>

                <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5">
                  {notes.length === 0 ? (
                    <div className="py-12 text-center text-xs text-slate-500">No notes found in Supabase.</div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[640px] text-left text-xs">
                        <thead>
                          <tr className="border-b border-slate-800 text-slate-400 font-semibold">
                            <th className="pb-3">Title</th>
                            <th className="pb-3">Subject</th>
                            <th className="pb-3">Semester</th>
                            <th className="pb-3">Storage Location</th>
                            <th className="pb-3">Linked Bundle</th>
                            <th className="pb-3">Security</th>
                            <th className="pb-3">Status</th>
                            <th className="pb-3 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60 text-slate-300">
                          {notes.map((n) => (
                            <tr key={n.id} className="hover:bg-slate-900/50">
                              <td className="py-3 font-bold text-white">{n.title}</td>
                              <td className="py-3 text-slate-300">{n.subject || "—"}</td>
                              <td className="py-3 text-slate-400">Sem {n.semester}</td>
                              <td className="py-3 font-mono text-[11px] text-slate-400">
                                <span className="text-indigo-400 font-semibold">{n.storage_bucket}</span>
                                <span className="text-slate-600"> / </span>
                                <span>{n.storage_path}</span>
                              </td>
                              <td className="py-3 text-indigo-400">{n.bundles?.title || "—"}</td>
                              <td className="py-3">
                                {n.is_protected !== false ? (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-indigo-500/15 border border-indigo-500/30 px-2 py-0.5 text-[10px] font-bold text-indigo-300">
                                    <ShieldCheck className="h-3 w-3 text-indigo-400" /> Protected
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-slate-800 border border-slate-700 px-2 py-0.5 text-[10px] font-medium text-slate-400">
                                    Standard
                                  </span>
                                )}
                              </td>
                              <td className="py-3">
                                <StatusBadge status={n.published ? "published" : "draft"} />
                              </td>
                              <td className="py-3 text-right">
                                <button
                                  onClick={async () => {
                                    if (confirm(`Delete "${n.title}" permanently?`)) {
                                      await adminApi.deleteNote(n.id);
                                      await loadData();
                                    }
                                  }}
                                  className="rounded-lg p-1 text-slate-400 hover:text-rose-400 transition"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Bundles Tab */}
            {activeTab === "bundles" && (
              <div className="space-y-4">
                <div className="flex justify-end">
                  <button
                    onClick={() => setModal({ kind: "create_bundle" })}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-indigo-500 transition"
                  >
                    <Plus className="h-3.5 w-3.5" /> Create Bundle
                  </button>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {bundles.map((b) => (
                    <div
                      key={b.id}
                      className="rounded-2xl border border-slate-800 bg-slate-950 p-5 flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="font-bold text-white text-base">{b.title}</h4>
                          <span className="text-lg font-black text-indigo-400 font-mono">
                            {formatMoney(b.price)}
                          </span>
                        </div>
                        <p className="mt-2 text-xs text-slate-400 leading-relaxed">{b.description}</p>
                      </div>
                      <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-500">
                        <span>{b.published ? "● Active" : "○ Draft"}</span>
                        <button
                          onClick={() => setModal({ kind: "delete_bundle", bundle: b })}
                          className="text-rose-400 hover:text-rose-300"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Activity Logs Tab */}
            {activeTab === "activity" && (
              <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5">
                {activity.length === 0 ? (
                  <div className="py-12 text-center text-xs text-slate-500">No activity logs recorded.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[640px] text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-800 text-slate-400 font-semibold">
                          <th className="pb-3">Action</th>
                          <th className="pb-3">Target Type</th>
                          <th className="pb-3">Target ID</th>
                          <th className="pb-3">Date & Time</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 text-slate-300">
                        {activity.map((l) => (
                          <tr key={l.id} className="hover:bg-slate-900/50">
                            <td className="py-3 font-mono font-bold text-indigo-300">{l.action}</td>
                            <td className="py-3 text-slate-400">{l.target_type || "—"}</td>
                            <td className="py-3 font-mono text-[11px] text-slate-500">{l.target_id || "—"}</td>
                            <td className="py-3 text-slate-500">
                              {new Date(l.created_at).toLocaleString("en-IN")}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {activeTab === "email" && (
              <AdminEmailPage embedded />
            )}

            {/* ── NOTICE BOARD MANAGEMENT ────────────────────────────── */}
            {activeTab === "notices" && (
              <AdminNoticeBoard />
            )}
          </>
        )}

        {/* Modals */}
        {modal && (
          <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4" role="dialog">
            <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-3xl border border-slate-800 bg-slate-950 p-6 text-white shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-5">
                <h3 className="text-lg font-bold text-white capitalize">
                  {modal.kind === "payment_details"
                    ? "Review Payment Submission"
                    : modal.kind === "verify_student_email"
                    ? "Verify Student Email"
                    : modal.kind.replace("_", " ")}
                </h3>
                <button
                  onClick={() => setModal(null)}
                  className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {modal.kind === "verify_student_email" && (
                <div className="space-y-4 text-xs">
                  <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 text-amber-200">
                    <p className="font-semibold text-sm text-amber-300 mb-1">Verify this student's email?</p>
                    <p className="text-xs text-amber-200/90 leading-relaxed">
                      This will securely verify the student's Supabase Auth email and allow them to log in without needing email confirmation.
                    </p>
                  </div>

                  <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 space-y-2.5">
                    <div className="flex justify-between items-center py-1 border-b border-slate-800/60">
                      <span className="text-slate-400 font-semibold">Student Name:</span>
                      <span className="font-bold text-white text-sm">{modal.student?.full_name || "—"}</span>
                    </div>
                    <div className="flex justify-between items-center py-1 border-b border-slate-800/60">
                      <span className="text-slate-400 font-semibold">Email:</span>
                      <span className="font-medium text-slate-200">{modal.student?.email}</span>
                    </div>
                    <div className="flex justify-between items-center py-1">
                      <span className="text-slate-400 font-semibold">Auth UID:</span>
                      <code className="text-[11px] font-mono text-slate-400 select-all">{modal.student?.user_id}</code>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-800 flex justify-end gap-2">
                    <button
                      type="button"
                      disabled={actionLoading}
                      onClick={() => setModal(null)}
                      className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-bold text-slate-300 hover:bg-slate-700 disabled:opacity-50 transition"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={actionLoading}
                      onClick={() => handleVerifyEmail(modal.student.user_id)}
                      className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2 text-xs font-bold text-white hover:bg-emerald-500 disabled:opacity-50 transition shadow-sm"
                    >
                      {actionLoading ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Verifying...
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="h-3.5 w-3.5" /> Verify Email
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {modal.kind === "delete_bundle" && (
                <div className="space-y-4 text-sm text-white">
                  <p className="mb-2"><strong>Bundle:</strong> {modal.bundle.title}</p>
                  <p className="mb-2"><strong>Notes attached:</strong> {notes.filter((n) => n.bundle_id === modal.bundle.id).length}</p>
                  <p className="mb-2"><strong>Students with access:</strong> {access.filter((a) => a.bundle_id === modal.bundle.id).length}</p>
                  <p className="text-rose-400 mb-4">This action may remove the bundle and its associated access records. This cannot be undone.</p>
                  <div className="flex justify-end space-x-2">
                    <button
                      onClick={() => setModal(null)}
                      className="px-3 py-1 rounded bg-slate-700 hover:bg-slate-600 text-sm"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={async () => {
                        setActionLoading(true);
                        try {
                          await adminApi.deleteBundle(modal.bundle.id);
                          setModal(null);
                          await loadData();
                          alert("Bundle deleted successfully.");
                        } catch (err: any) {
                          setError(err.message || "Failed to delete bundle.");
                        } finally {
                          setActionLoading(false);
                        }
                      }}
                      disabled={actionLoading}
                      className="px-3 py-1 rounded bg-rose-600 hover:bg-rose-500 text-sm"
                    >
                      Delete Bundle
                    </button>
                  </div>
                </div>
              )}

              {modal.kind === "payment_details" && (
                <div className="space-y-4 text-xs">
                  <div className="grid grid-cols-2 gap-3 bg-slate-900 p-4 rounded-2xl border border-slate-800">
                    <div>
                      <p className="text-slate-500 font-semibold">Student Name</p>
                      <p className="font-bold text-white mt-0.5">{modal.payment.full_name}</p>
                    </div>
                    <div>
                      <p className="text-slate-500 font-semibold">Email</p>
                      <p className="font-bold text-white mt-0.5">{modal.payment.email}</p>
                    </div>
                    <div>
                      <p className="text-slate-500 font-semibold">Phone</p>
                      <p className="font-bold text-white mt-0.5">{modal.payment.phone}</p>
                    </div>
                    <div>
                      <p className="text-slate-500 font-semibold">Course & Sem</p>
                      <p className="font-bold text-white mt-0.5">
                        {modal.payment.course} · Sem {modal.payment.semester}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-500 font-semibold">Amount Paid</p>
                      <p className="font-bold text-indigo-400 text-sm mt-0.5">
                        {formatMoney(modal.payment.amount)}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-500 font-semibold">UTR / Transaction ID</p>
                      <p className="font-mono font-bold text-white mt-0.5">{modal.payment.utr}</p>
                    </div>
                    <div>
                      <p className="text-slate-500 font-semibold">Reference ID</p>
                      <p className="font-mono text-slate-400 mt-0.5">{modal.payment.reference_id}</p>
                    </div>
                    <div>
                      <p className="text-slate-500 font-semibold">Referral Code</p>
                      <p className="font-mono font-bold text-indigo-400 mt-0.5">
                        {modal.payment.referral_code || "None (Direct Purchase)"}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-500 font-semibold">Current Status</p>
                      <div className="mt-1">
                        <StatusBadge status={modal.payment.status} />
                      </div>
                    </div>
                  </div>

                  {/* Informational referral notice for eligible Sem 1 payment with referral code */}
                  {modal.payment.referral_code && (modal.payment.semester === 1 || String(modal.payment.course).toUpperCase().includes("BCA")) && (
                    <div className="rounded-xl border border-indigo-500/40 bg-indigo-950/40 p-3 text-xs text-indigo-200 space-y-1">
                      <div className="flex items-center gap-1.5 font-bold text-indigo-300">
                        <Gift className="w-4 h-4 text-indigo-400" />
                        <span>Referral Linked: {modal.payment.referral_code}</span>
                      </div>
                      <p className="text-[11px] leading-relaxed text-slate-300">
                        Approving this payment will qualify the referral and unlock the referrer's <strong>Most Repeated Questions</strong> reward.
                      </p>
                    </div>
                  )}

                  <div>
                    <p className="text-xs font-bold text-slate-400 mb-2">Uploaded Payment Screenshot</p>
                    {modal.imageUrl ? (
                      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-2 overflow-hidden">
                        <img
                          src={modal.imageUrl}
                          alt="Payment Evidence"
                          className="max-h-72 w-full object-contain rounded-xl"
                        />
                      </div>
                    ) : (
                      <p className="p-6 text-center text-slate-500 rounded-xl bg-slate-900">
                        Screenshot unavailable or path expired.
                      </p>
                    )}
                  </div>

                  {modal.payment.status === "pending" && (
                    <div className="flex gap-3 pt-4 border-t border-slate-800">
                      <button
                        onClick={() => reviewPayment(modal.payment.id, "approved")}
                        disabled={actionLoading}
                        className="flex-1 rounded-xl bg-emerald-600 py-3 text-xs font-bold text-white hover:bg-emerald-500 transition"
                      >
                        Approve Payment & Grant Access
                      </button>
                      <button
                        onClick={() => {
                          const note = prompt("Enter rejection reason:");
                          if (note !== null) {
                            void reviewPayment(modal.payment.id, "rejected", note);
                          }
                        }}
                        disabled={actionLoading}
                        className="flex-1 rounded-xl bg-rose-600 py-3 text-xs font-bold text-white hover:bg-rose-500 transition"
                      >
                        Reject Payment
                      </button>
                    </div>
                  )}
                </div>
              )}

              {modal.kind === "referral_detail" && (
                <div className="space-y-6 text-xs">
                  {/* Visual Flow Timeline */}
                  <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 space-y-4">
                    <p className="text-[11px] font-bold text-indigo-400 uppercase tracking-wider">
                      Visual Operational Lifecycle
                    </p>
                    
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 relative">
                      {/* Step 1: Payment */}
                      <div className="flex-1 bg-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-slate-500 uppercase">1. Referred Student</span>
                          <span className="text-[10px] font-bold text-emerald-400">Step 1</span>
                        </div>
                        <p className="font-bold text-white text-xs truncate">{modal.item.referred_name}</p>
                        <p className="text-[10px] text-slate-400 truncate">{modal.item.referred_email}</p>
                      </div>

                      <div className="hidden md:block text-slate-600 font-black">→</div>

                      {/* Step 2: Referral */}
                      <div className="flex-1 bg-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-slate-500 uppercase">2. Referral Code</span>
                          <span className="text-[10px] font-bold text-indigo-400">Step 2</span>
                        </div>
                        <p className="font-mono font-bold text-indigo-300 text-xs">{modal.item.referral_code}</p>
                        <p className="text-[10px] text-slate-400">Status: {modal.item.status}</p>
                      </div>

                      <div className="hidden md:block text-slate-600 font-black">→</div>

                      {/* Step 3: Reward */}
                      <div className="flex-1 bg-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-slate-500 uppercase">3. Referrer Reward</span>
                          <span className="text-[10px] font-bold text-amber-400">Step 3</span>
                        </div>
                        <p className="font-bold text-white text-xs truncate">{modal.item.referrer_name}</p>
                        <p className="text-[10px] font-semibold">
                          {modal.item.reward_status === "unlocked" ? (
                            <span className="text-emerald-400">✓ Unlocked (3/3)</span>
                          ) : modal.item.status === "successful" ? (
                            <span className="text-indigo-300">✓ Counted (Toward 3/3)</span>
                          ) : (
                            <span className="text-amber-400">⏳ Pending Approval</span>
                          )}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Summary Attributes */}
                  <div className="grid grid-cols-2 gap-3 bg-slate-900 p-4 rounded-2xl border border-slate-800">
                    <div>
                      <p className="text-slate-500 font-semibold">Referrer Name & Email</p>
                      <p className="font-bold text-white mt-0.5">{modal.item.referrer_name}</p>
                      <p className="text-[11px] text-slate-400">{modal.item.referrer_email}</p>
                    </div>
                    <div>
                      <p className="text-slate-500 font-semibold">Referred Student</p>
                      <p className="font-bold text-white mt-0.5">{modal.item.referred_name}</p>
                      <p className="text-[11px] text-slate-400">{modal.item.referred_email}</p>
                    </div>
                    <div>
                      <p className="text-slate-500 font-semibold">Referral Code</p>
                      <p className="font-mono font-bold text-indigo-400 mt-0.5">{modal.item.referral_code}</p>
                    </div>
                    <div>
                      <p className="text-slate-500 font-semibold">Referral Status</p>
                      <div className="mt-1">
                        <StatusBadge status={modal.item.status} />
                      </div>
                    </div>
                    <div>
                      <p className="text-slate-500 font-semibold">Reward Designation</p>
                      <p className="font-semibold text-indigo-300 mt-0.5">Semester 1 Most Repeated Questions</p>
                    </div>
                    <div>
                      <p className="text-slate-500 font-semibold">Reward Access Status</p>
                      <p className="font-bold mt-0.5">
                        {modal.item.reward_status === "unlocked" ? (
                          <span className="text-emerald-400">Reward Unlocked (3/3 Referrals)</span>
                        ) : modal.item.status === "successful" ? (
                          <span className="text-indigo-300">Successful Referral (Requires 3 for Reward)</span>
                        ) : (
                          <span className="text-amber-400">Waiting for payment verification</span>
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Clarification Notice */}
                  <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3 text-slate-300 text-[11px] leading-relaxed">
                    {modal.item.reward_status === "unlocked" ? (
                      <span className="text-emerald-300">
                        ✓ 3 successful referrals reached. Referrer has active authorization to the three Semester 1 Most Repeated Questions PDFs (C Programming, Foundation of Computing, HTML + CSS + JavaScript).
                      </span>
                    ) : modal.item.status === "successful" ? (
                      <span className="text-indigo-300">
                        ✓ This referral is successful (payment approved). It contributes toward the 3 successful referrals required to unlock the Semester 1 Most Repeated Questions pack.
                      </span>
                    ) : (
                      <span className="text-amber-300">
                        ⏳ Waiting for eligible payment verification. Once an admin approves Student B's eligible Semester 1 payment in Payment CRM, this referral will become successful.
                      </span>
                    )}
                  </div>

                  <div className="pt-2 border-t border-slate-800 flex justify-end">
                    <button
                      type="button"
                      onClick={() => setModal(null)}
                      className="rounded-xl bg-slate-800 px-5 py-2.5 text-xs font-bold text-white hover:bg-slate-700 transition"
                    >
                      Close Details
                    </button>
                  </div>
                </div>
              )}

              {modal.kind === "create_student" && (
                csSuccess ? (
                  /* ── Success view ── */
                  <div className="space-y-5 text-xs">
                    <div className="flex flex-col items-center gap-3 py-4">
                      <div className="grid h-14 w-14 place-items-center rounded-full bg-emerald-950/60 border border-emerald-800">
                        <CheckCircle2 className="h-7 w-7 text-emerald-400" />
                      </div>
                      <h4 className="text-base font-bold text-white">Student Created Successfully</h4>
                    </div>

                    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4 space-y-3">
                      <div>
                        <p className="text-slate-500 font-semibold text-[11px]">Email Address</p>
                        <p className="font-bold text-white mt-0.5">{csSuccess.email}</p>
                      </div>
                      <div>
                        <p className="text-slate-500 font-semibold text-[11px]">Temporary Password</p>
                        <div className="flex items-center gap-2 mt-1">
                          <code className="flex-1 rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 font-mono text-sm text-indigo-300 select-all break-all">{csSuccess.password}</code>
                          <button
                            type="button"
                            onClick={() => handleCopyPassword(csSuccess.password)}
                            className="shrink-0 inline-flex items-center gap-1.5 rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-xs font-bold text-slate-200 hover:bg-slate-700 transition"
                          >
                            {csCopied ? <ClipboardCheck className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                            {csCopied ? "Copied" : "Copy"}
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-start gap-2 rounded-xl bg-amber-950/40 border border-amber-800/60 px-3 py-2.5 text-amber-300">
                      <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                      <p className="leading-relaxed">This is a <strong>temporary password</strong>. Instruct the student to change it immediately after their first sign-in.</p>
                    </div>

                    <div className="pt-3 border-t border-slate-800 flex justify-end">
                      <button
                        type="button"
                        onClick={() => { setCsSuccess(null); setModal(null); }}
                        className="rounded-xl bg-indigo-600 px-5 py-2 text-xs font-bold text-white hover:bg-indigo-500 transition"
                      >
                        Done
                      </button>
                    </div>
                  </div>
                ) : (
                  /* ── Create student form with password ── */
                  <form onSubmit={handleCreateStudentSubmit} className="space-y-4 text-xs">
                    {csError && (
                      <div className="flex items-center gap-2 rounded-xl bg-rose-950/60 border border-rose-800 px-3 py-2.5 text-rose-300 text-xs">
                        <AlertCircle className="h-4 w-4 shrink-0" />
                        <span>{csError}</span>
                      </div>
                    )}

                    <label className="block">
                      <span className="text-slate-400 font-bold">Full Name</span>
                      <input
                        required
                        name="full_name"
                        className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-900 p-3 text-white outline-none focus:border-indigo-500"
                      />
                    </label>
                    <label className="block">
                      <span className="text-slate-400 font-bold">Email Address</span>
                      <input
                        required
                        name="email"
                        type="email"
                        className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-900 p-3 text-white outline-none focus:border-indigo-500"
                      />
                    </label>

                    {/* ── Password Section ── */}
                    <div className="block">
                      <span className="text-slate-400 font-bold">Password</span>
                      <div className="relative mt-1">
                        <input
                          required
                          type={csShowPassword ? "text" : "password"}
                          value={csPassword}
                          onChange={(e) => { setCsPassword(e.target.value); setCsCopied(false); }}
                          placeholder="Enter or generate a password"
                          minLength={6}
                          className="w-full rounded-xl border border-slate-800 bg-slate-900 p-3 pr-10 text-white outline-none focus:border-indigo-500 font-mono"
                        />
                        <button
                          type="button"
                          onClick={() => setCsShowPassword(!csShowPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition"
                          tabIndex={-1}
                        >
                          {csShowPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <button
                          type="button"
                          onClick={handleGeneratePassword}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600/20 border border-indigo-500/40 px-3 py-1.5 text-xs font-bold text-indigo-300 hover:bg-indigo-600/30 transition"
                        >
                          <KeyRound className="h-3 w-3" /> Generate Password
                        </button>
                        {csPassword && (
                          <button
                            type="button"
                            onClick={() => handleCopyPassword(csPassword)}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-slate-800 border border-slate-700 px-3 py-1.5 text-xs font-bold text-slate-300 hover:bg-slate-700 transition"
                          >
                            {csCopied ? <ClipboardCheck className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                            {csCopied ? "Copied!" : "Copy"}
                          </button>
                        )}
                      </div>
                    </div>

                    <label className="block">
                      <span className="text-slate-400 font-bold">Phone</span>
                      <input
                        name="phone"
                        className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-900 p-3 text-white outline-none focus:border-indigo-500"
                      />
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <label className="block">
                        <span className="text-slate-400 font-bold">Course</span>
                        <input
                          name="course"
                          defaultValue="BCA"
                          className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-900 p-3 text-white outline-none focus:border-indigo-500"
                        />
                      </label>
                      <label className="block">
                        <span className="text-slate-400 font-bold">Semester (1-6)</span>
                        <input
                          required
                          name="semester"
                          type="number"
                          min={1}
                          max={6}
                          defaultValue={1}
                          className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-900 p-3 text-white outline-none focus:border-indigo-500"
                        />
                      </label>
                    </div>

                    <div className="pt-4 border-t border-slate-800 flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setModal(null)}
                        className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-bold text-slate-300 hover:bg-slate-700"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={actionLoading || !csPassword}
                        className="rounded-xl bg-indigo-600 px-5 py-2 text-xs font-bold text-white hover:bg-indigo-500 disabled:opacity-50 transition"
                      >
                        {actionLoading ? (
                          <span className="flex items-center gap-2">
                            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Creating…
                          </span>
                        ) : "Save Record"}
                      </button>
                    </div>
                  </form>
                )
              )}

              {(modal.kind === "grant_access" ||
                modal.kind === "create_bundle" ||
                modal.kind === "upload_note") && (
                <form onSubmit={handleModalSubmit} className="space-y-4 text-xs">
                  {modal.kind === "grant_access" && (
                    <>
                      <label className="block">
                        <span className="text-slate-400 font-bold">Student User ID (UUID)</span>
                        <input
                          required
                          name="user_id"
                          defaultValue={modal.initialUserId || ""}
                          placeholder="User UUID from students list"
                          className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-900 p-3 font-mono text-white outline-none focus:border-indigo-500"
                        />
                      </label>
                      <label className="block">
                        <span className="text-slate-400 font-bold">Bundle</span>
                        <select
                          required
                          name="bundle_id"
                          className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-900 p-3 text-white outline-none focus:border-indigo-500"
                        >
                          {bundles.map((b) => (
                            <option key={b.id} value={b.id}>
                              {b.title} (₹{b.price})
                            </option>
                          ))}
                        </select>
                      </label>
                    </>
                  )}

                  {modal.kind === "create_bundle" && (
                    <>
                      <label className="block">
                        <span className="text-slate-400 font-bold">Bundle Title</span>
                        <input
                          required
                          name="title"
                          placeholder="e.g. BCA Semester 1 Complete Notes"
                          className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-900 p-3 text-white outline-none focus:border-indigo-500"
                        />
                      </label>
                      <label className="block">
                        <span className="text-slate-400 font-bold">Description</span>
                        <textarea
                          name="description"
                          rows={3}
                          className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-900 p-3 text-white outline-none focus:border-indigo-500"
                        />
                      </label>
                      <label className="block">
                        <span className="text-slate-400 font-bold">Price (₹)</span>
                        <input
                          required
                          name="price"
                          type="number"
                          defaultValue={899}
                          className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-900 p-3 text-white outline-none focus:border-indigo-500"
                        />
                      </label>
                      <label className="flex items-center gap-2 pt-2 cursor-pointer">
                        <input
                          type="checkbox"
                          name="published"
                          defaultChecked
                          className="h-4 w-4 rounded accent-indigo-600"
                        />
                        <span className="text-slate-300 font-bold">Publish bundle immediately</span>
                      </label>
                    </>
                  )}

                  {modal.kind === "upload_note" && (
                    <>
                      <label className="block">
                        <span className="text-slate-400 font-bold">Note Title</span>
                        <input
                          required
                          name="title"
                          placeholder="e.g. Algorithms and Programming Design using C Notes"
                          className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-900 p-3 text-white outline-none focus:border-indigo-500"
                        />
                      </label>
                      <label className="block">
                        <span className="text-slate-400 font-bold">Description</span>
                        <textarea
                          required
                          name="description"
                          rows={2}
                          placeholder="Summary of syllabus units and topics covered..."
                          className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-900 p-3 text-white outline-none focus:border-indigo-500"
                        />
                      </label>
                      <div className="grid grid-cols-2 gap-3">
                        <label className="block">
                          <span className="text-slate-400 font-bold">Semester</span>
                          <select
                            name="semester"
                            defaultValue={1}
                            className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-900 p-3 text-white outline-none focus:border-indigo-500"
                          >
                            <option value={1}>Semester 1</option>
                            <option value={2}>Semester 2</option>
                          </select>
                        </label>
                        <label className="block">
                          <span className="text-slate-400 font-bold">Subject</span>
                          <select
                            name="subject"
                            className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-900 p-3 text-white outline-none focus:border-indigo-500"
                          >
                            {availableSubjects.map((s) => (
                              <option key={s.courseCode} value={s.officialTitle}>
                                {s.officialTitle} (Sem {s.semester})
                              </option>
                            ))}
                          </select>
                        </label>
                      </div>
                      <label className="block">
                        <span className="text-slate-400 font-bold">Linked Bundle</span>
                        <select
                          required
                          name="bundle_id"
                          defaultValue="5b36f72a-165c-4cd1-8458-d4f33fadd860"
                          className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-900 p-3 text-white outline-none focus:border-indigo-500"
                        >
                          {bundles.map((b) => (
                            <option key={b.id} value={b.id}>
                              {b.title} (₹{b.price})
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="block">
                        <span className="text-slate-400 font-bold">PDF Document File</span>
                        <input
                          required
                          name="file"
                          type="file"
                          accept="application/pdf"
                          className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-900 p-3 text-white outline-none file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-indigo-600 file:text-white"
                        />
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            name="published"
                            defaultChecked
                            className="h-4 w-4 rounded accent-indigo-600"
                          />
                          <span className="text-slate-300 font-bold">Publish note immediately</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            name="is_protected"
                            defaultChecked
                            className="h-4 w-4 rounded accent-indigo-600"
                          />
                          <span className="text-slate-300 font-bold">Protected PDF (Watermarked)</span>
                        </label>
                      </div>
                    </>
                  )}

                  <div className="pt-4 border-t border-slate-800 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setModal(null)}
                      className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-bold text-slate-300 hover:bg-slate-700"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={actionLoading}
                      className="rounded-xl bg-indigo-600 px-5 py-2 text-xs font-bold text-white hover:bg-indigo-500 disabled:opacity-50"
                    >
                      {actionLoading ? "Saving…" : "Save Record"}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
