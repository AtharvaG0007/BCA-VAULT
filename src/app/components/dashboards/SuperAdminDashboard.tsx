import { useEffect, useState, useCallback } from "react";
import { Link, useLocation } from "react-router";
import {
  AlertCircle,
  BarChart3,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Clock,
  ClipboardCheck,
  Copy,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  LogOut,
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

/** Generate a cryptographically strong random password (16 chars, mixed case + digits + symbols). */
function generateStrongPassword(): string {
  const charset = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%&*";
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, (b) => charset[b % charset.length]).join("");
}

type Row = Record<string, any>;

const PAGES = [
  { key: "dashboard", label: "Dashboard", icon: BarChart3 },
  { key: "payments", label: "Payment CRM", icon: ShieldCheck },
  { key: "students", label: "Students", icon: Users },
  { key: "access", label: "Access Control", icon: KeyRound },
  { key: "notes", label: "Study Notes", icon: BookOpen },
  { key: "bundles", label: "Bundles", icon: Package },
  { key: "activity", label: "Activity Logs", icon: Clock },
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

export function SuperAdminDashboard() {
  const { logout, appUser } = useAdminAuth();
  const location = useLocation();
  const pathSegment = location.pathname.split("/").pop() || "dashboard";
  const activeTab = PAGES.some((p) => p.key === pathSegment) ? pathSegment : "dashboard";

  const [data, setData] = useState<Record<string, Row[]>>({});
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<any>(null);
  const [actionLoading, setActionLoading] = useState(false);

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
    setLoading(true);
    setError("");
    try {
      const [p, s, a, b, n, l] = await Promise.all([
        adminApi.listPayments(paymentFilter, search),
        adminApi.listStudents(activeTab === "students" ? search : ""),
        adminApi.listAccess(),
        adminApi.listBundles(),
        adminApi.listNotes(),
        adminApi.listActivity(),
      ]);

      const errors = [p.error, s.error, a.error, b.error, n.error, l.error].filter(Boolean);
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
      });
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
      <aside className="w-full lg:w-64 bg-slate-950 border-b lg:border-b-0 lg:border-r border-slate-800 p-5 flex flex-col justify-between shrink-0">
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

          <nav className="space-y-1">
            {PAGES.map((page) => {
              const Icon = page.icon;
              const isActive = activeTab === page.key;
              return (
                <Link
                  key={page.key}
                  to={`/admin/${page.key}`}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition ${
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

        {loading && !Object.keys(data).length ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
          </div>
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
                      <table className="w-full text-left text-xs">
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
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-slate-800 text-slate-400 font-semibold">
                            <th className="pb-3">Student Name</th>
                            <th className="pb-3">Email & Phone</th>
                            <th className="pb-3">Course / Sem</th>
                            <th className="pb-3">Amount</th>
                            <th className="pb-3">UTR / Ref</th>
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

            {/* Students Tab */}
            {activeTab === "students" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <input
                    type="text"
                    placeholder="Search students..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && loadData()}
                    className="rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-1.5 text-xs text-white placeholder-slate-500 outline-none focus:border-indigo-500"
                  />
                  <button
                    onClick={openCreateStudentModal}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-indigo-500 transition"
                  >
                    <Plus className="h-3.5 w-3.5" /> Add Student
                  </button>
                </div>

                <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5">
                  {students.length === 0 ? (
                    <div className="py-12 text-center text-xs text-slate-500">No registered students found.</div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-slate-800 text-slate-400 font-semibold">
                            <th className="pb-3">Student Name</th>
                            <th className="pb-3">Email & User ID</th>
                            <th className="pb-3">Course / Sem</th>
                            <th className="pb-3">Account Status</th>
                            <th className="pb-3">Payment</th>
                            <th className="pb-3">Assigned Bundles</th>
                            <th className="pb-3">Registered</th>
                            <th className="pb-3 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60 text-slate-300">
                          {students.map((s) => {
                            const assignedBundles: string[] = s.assigned_bundles || [];
                            const paymentStatus = s.payment_status || "unpaid";
                            return (
                              <tr key={s.user_id} className="hover:bg-slate-900/50">
                                <td className="py-3">
                                  <p className="font-bold text-white">{s.full_name}</p>
                                  {s.phone && <p className="text-[10px] text-slate-500">{s.phone}</p>}
                                </td>
                                <td className="py-3">
                                  <p className="text-slate-300 font-medium">{s.email}</p>
                                  <div className="flex items-center gap-1 mt-0.5">
                                    <code className="text-[10px] font-mono text-slate-500 select-all">
                                      {s.user_id.slice(0, 8)}...{s.user_id.slice(-4)}
                                    </code>
                                    <button
                                      type="button"
                                      onClick={() => handleCopyPassword(s.user_id)}
                                      title="Copy full User UUID"
                                      className="text-slate-500 hover:text-slate-300 transition"
                                    >
                                      <Copy className="h-2.5 w-2.5" />
                                    </button>
                                  </div>
                                </td>
                                <td className="py-3 text-slate-400">
                                  {s.course || "BCA"} · Sem {s.semester || 1}
                                </td>
                                <td className="py-3">
                                  <StatusBadge status={s.status} />
                                </td>
                                <td className="py-3">
                                  <StatusBadge status={paymentStatus} />
                                </td>
                                <td className="py-3">
                                  {assignedBundles.length > 0 ? (
                                    <div className="flex flex-wrap gap-1 max-w-[180px]">
                                      {assignedBundles.map((bTitle, idx) => (
                                        <span
                                          key={idx}
                                          className="inline-block rounded-md bg-indigo-950/80 border border-indigo-800/80 px-2 py-0.5 text-[10px] font-bold text-indigo-300 truncate max-w-[160px]"
                                          title={bTitle}
                                        >
                                          {bTitle}
                                        </span>
                                      ))}
                                    </div>
                                  ) : (
                                    <span className="text-slate-500 text-[11px]">No bundles</span>
                                  )}
                                </td>
                                <td className="py-3 text-slate-500">{formatDate(s.created_at)}</td>
                                <td className="py-3 text-right">
                                  <div className="inline-flex items-center gap-1.5">
                                    <button
                                      onClick={async () => {
                                        await adminApi.updateProfile(
                                          s.user_id,
                                          s.status === "active" ? "inactive" : "active"
                                        );
                                        await loadData();
                                      }}
                                      className="rounded-lg bg-slate-800 px-2 py-1 text-xs font-bold text-slate-300 hover:bg-slate-700 transition"
                                    >
                                      {s.status === "active" ? "Deactivate" : "Activate"}
                                    </button>
                                    <button
                                      onClick={() => setModal({ kind: "grant_access", initialUserId: s.user_id })}
                                      className="rounded-lg bg-indigo-950/60 border border-indigo-800/70 px-2 py-1 text-xs font-bold text-indigo-300 hover:bg-indigo-900/50 transition"
                                      title="Grant Bundle Access"
                                    >
                                      + Bundle
                                    </button>
                                    <button
                                      onClick={async () => {
                                        if (confirm(`Send password reset email to ${s.email}?`)) {
                                          await adminApi.resetPassword(s.email);
                                          alert("Password reset email sent successfully.");
                                        }
                                      }}
                                      className="rounded-lg bg-slate-800 px-2 py-1 text-xs font-bold text-indigo-400 hover:bg-indigo-950/50 transition"
                                    >
                                      Reset PW
                                    </button>
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
                      <table className="w-full text-left text-xs">
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
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-slate-800 text-slate-400 font-semibold">
                            <th className="pb-3">Title</th>
                            <th className="pb-3">Subject</th>
                            <th className="pb-3">Semester</th>
                            <th className="pb-3">Storage Location</th>
                            <th className="pb-3">Linked Bundle</th>
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
                    <table className="w-full text-left text-xs">
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
          </>
        )}

        {/* Modals */}
        {modal && (
          <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4" role="dialog">
            <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-3xl border border-slate-800 bg-slate-950 p-6 text-white shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-5">
                <h3 className="text-lg font-bold text-white capitalize">
                  {modal.kind === "payment_details" ? "Review Payment Submission" : modal.kind.replace("_", " ")}
                </h3>
                <button
                  onClick={() => setModal(null)}
                  className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

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
                      <p className="text-slate-500 font-semibold">Current Status</p>
                      <div className="mt-1">
                        <StatusBadge status={modal.payment.status} />
                      </div>
                    </div>
                  </div>

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
                      <label className="flex items-center gap-2 pt-2 cursor-pointer">
                        <input
                          type="checkbox"
                          name="published"
                          defaultChecked
                          className="h-4 w-4 rounded accent-indigo-600"
                        />
                        <span className="text-slate-300 font-bold">Publish note immediately</span>
                      </label>
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
