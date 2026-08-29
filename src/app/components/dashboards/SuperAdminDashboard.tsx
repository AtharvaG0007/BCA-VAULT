import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router";
import {
  AlertCircle,
  BarChart3,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Clock,
  Eye,
  FileText,
  KeyRound,
  Layers,
  Loader2,
  LogOut,
  Package,
  Plus,
  RefreshCw,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  Upload,
  UserCheck,
  Users,
  UserX,
  X,
  XCircle,
} from "lucide-react";
import { adminApi } from "@/lib/supabase/adminService";
import { supabase } from "@/lib/supabase/client";
import { useAdminAuth } from "../auth/AdminAuthContext";

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
  if (s === "approved" || s === "active") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-700 border border-emerald-200">
        <CheckCircle2 className="h-3 w-3" /> {status}
      </span>
    );
  }
  if (s === "pending") {
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

  const handleModalSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setActionLoading(true);
    setError("");
    const f = new FormData(e.currentTarget);
    try {
      if (modal.kind === "create_student") {
        await adminApi.createStudent(Object.fromEntries(f));
      } else if (modal.kind === "grant_access") {
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
        const uploadAuth = await adminApi.noteUploadUrl(file.name);
        const { error: uploadError } = await supabase.storage
          .from(uploadAuth.bucket)
          .uploadToSignedUrl(uploadAuth.path, uploadAuth.token, file, {
            contentType: "application/pdf",
          });
        if (uploadError) throw uploadError;

        await adminApi.saveNote({
          title: f.get("title"),
          description: f.get("description") || "",
          subject: f.get("subject") || null,
          semester: Number(f.get("semester")),
          bundle_id: f.get("bundle_id"),
          storage_bucket: uploadAuth.bucket,
          storage_path: uploadAuth.path,
          published: f.get("published") === "on",
        });
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
                    { label: "Total Students", value: students.length, color: "from-blue-600 to-indigo-600" },
                    {
                      label: "Pending Payments",
                      value: payments.filter((x) => x.status === "pending").length,
                      color: "from-amber-600 to-orange-600",
                    },
                    {
                      label: "Approved Access",
                      value: access.filter((x) => x.status === "active").length,
                      color: "from-emerald-600 to-teal-600",
                    },
                    { label: "Total Revenue", value: formatMoney(totalRevenue), color: "from-purple-600 to-indigo-600" },
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
                      to="/admin-root/payments"
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
                            <th className="pb-3">UTR</th>
                            <th className="pb-3">Status</th>
                            <th className="pb-3">Date</th>
                            <th className="pb-3 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60 text-slate-300">
                          {payments.map((p) => (
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
                              <td className="py-3 font-mono text-[11px] text-slate-400">{p.utr}</td>
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
                    onClick={() => setModal({ kind: "create_student" })}
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
                            <th className="pb-3">Full Name</th>
                            <th className="pb-3">Email</th>
                            <th className="pb-3">Phone</th>
                            <th className="pb-3">Course / Sem</th>
                            <th className="pb-3">Account Status</th>
                            <th className="pb-3">Joined</th>
                            <th className="pb-3 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60 text-slate-300">
                          {students.map((s) => (
                            <tr key={s.user_id} className="hover:bg-slate-900/50">
                              <td className="py-3 font-bold text-white">{s.full_name}</td>
                              <td className="py-3 text-slate-300">{s.email}</td>
                              <td className="py-3 text-slate-400">{s.phone || "—"}</td>
                              <td className="py-3 text-slate-400">
                                {s.course} · Sem {s.semester}
                              </td>
                              <td className="py-3">
                                <StatusBadge status={s.status} />
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
                                    className="rounded-lg bg-slate-800 px-2 py-1 text-xs font-bold text-slate-300 hover:bg-slate-700"
                                  >
                                    {s.status === "active" ? "Deactivate" : "Activate"}
                                  </button>
                                  <button
                                    onClick={async () => {
                                      if (confirm(`Send password reset email to ${s.email}?`)) {
                                        await adminApi.resetPassword(s.email);
                                        alert("Password reset email sent successfully.");
                                      }
                                    }}
                                    className="rounded-lg bg-slate-800 px-2 py-1 text-xs font-bold text-indigo-400 hover:bg-indigo-950/50"
                                  >
                                    Reset PW
                                  </button>
                                </div>
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
                            <th className="pb-3">Linked Bundle</th>
                            <th className="pb-3">Published</th>
                            <th className="pb-3 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60 text-slate-300">
                          {notes.map((n) => (
                            <tr key={n.id} className="hover:bg-slate-900/50">
                              <td className="py-3 font-bold text-white">{n.title}</td>
                              <td className="py-3 text-slate-300">{n.subject || "—"}</td>
                              <td className="py-3 text-slate-400">Sem {n.semester}</td>
                              <td className="py-3 text-indigo-400">{n.bundles?.title || "—"}</td>
                              <td className="py-3">
                                <span
                                  className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                                    n.published ? "bg-emerald-950 text-emerald-400" : "bg-slate-800 text-slate-400"
                                  }`}
                                >
                                  {n.published ? "Published" : "Draft"}
                                </span>
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
              {modal.kind === "payment_details" ? (
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
              ) : (
                <form onSubmit={handleModalSubmit} className="space-y-4 text-xs">
                  {modal.kind === "create_student" && (
                    <>
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
                    </>
                  )}

                  {modal.kind === "grant_access" && (
                    <>
                      <label className="block">
                        <span className="text-slate-400 font-bold">Student User ID (UUID)</span>
                        <input
                          required
                          name="user_id"
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
                          placeholder="e.g. BCA Semester 1 & 2 Theory"
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
                          placeholder="e.g. Unit 1 Data Structures Notes"
                          className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-900 p-3 text-white outline-none focus:border-indigo-500"
                        />
                      </label>
                      <div className="grid grid-cols-2 gap-3">
                        <label className="block">
                          <span className="text-slate-400 font-bold">Subject</span>
                          <input
                            name="subject"
                            placeholder="e.g. Data Structures"
                            className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-900 p-3 text-white outline-none focus:border-indigo-500"
                          />
                        </label>
                        <label className="block">
                          <span className="text-slate-400 font-bold">Semester</span>
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
                      <label className="block">
                        <span className="text-slate-400 font-bold">Linked Bundle</span>
                        <select
                          required
                          name="bundle_id"
                          className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-900 p-3 text-white outline-none focus:border-indigo-500"
                        >
                          {bundles.map((b) => (
                            <option key={b.id} value={b.id}>
                              {b.title}
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
                        <span className="text-slate-300 font-bold">Publish immediately</span>
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
