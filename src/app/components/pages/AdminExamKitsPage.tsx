import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router";
import {
  ArrowLeft,
  CheckCircle2,
  ExternalLink,
  FileImage,
  Loader2,
  RefreshCw,
  Search,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import { adminSupabase } from "@/lib/supabase/client";

type Order = {
  id: string;
  order_code: string;
  user_id: string;
  full_name: string;
  email: string;
  phone: string;
  selected_subjects: string[];
  plan_type: string;
  amount: number;
  status: "pending_review" | "approved" | "rejected";
  utr: string | null;
  screenshot_url: string | null;
  admin_notes: string | null;
  created_at: string;
};

const subjectNames: Record<string, string> = {
  foundation: "Foundations of Computing",
  algorithms: "Algorithms & Program Design using C",
  "client-side": "Client-side Web Technologies",
  mathematics: "Mathematics",
};

async function getAdminToken() {
  const { data, error } = await adminSupabase.auth.getSession();
  const token = data.session?.access_token;
  if (error || !token) throw new Error("Your Super Admin session expired. Sign in again to review payments.");
  return token;
}

async function getResponseError(error: unknown) {
  const context = (error as { context?: Response } | null)?.context;
  if (context && typeof context.clone === "function") {
    try {
      const payload = await context.clone().json();
      if (typeof payload?.error === "string") return payload.error;
    } catch {
      // Use the SDK message if the response does not contain JSON.
    }
  }
  return error instanceof Error ? error.message : "Request failed.";
}

export function AdminExamKitsPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"pending_review" | "approved" | "rejected">("pending_review");
  const [notes, setNotes] = useState<Record<string, string>>({});

  const loadOrders = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const token = await getAdminToken();
      const { data, error: invokeError } = await adminSupabase.functions.invoke("exam-kits", {
        body: { action: "admin-list" },
        headers: { Authorization: `Bearer ${token}` },
      });
      if (invokeError || !data?.success) throw new Error(await getResponseError(invokeError));
      setOrders((data.orders ?? []) as Order[]);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to load question pack payments.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadOrders();
  }, [loadOrders]);

  const review = async (order: Order, decision: "approved" | "rejected") => {
    if (decision === "approved") {
      const subjectLabel = order.selected_subjects.map((id) => subjectNames[id] ?? id).join(", ");
      if (!window.confirm(`Confirm the payment is visible in your bank/UPI statement, then grant ${order.full_name} access to ${subjectLabel}?`)) return;
    } else if (!window.confirm(`Reject payment ${order.order_code}? The student will not get access to the question pack.`)) {
      return;
    }

    setBusyId(order.id);
    setError("");
    try {
      const token = await getAdminToken();
      const { data, error: invokeError } = await adminSupabase.functions.invoke("exam-kits", {
        body: {
          action: "admin-review",
          order_id: order.id,
          decision,
          admin_notes: notes[order.id] || "",
        },
        headers: { Authorization: `Bearer ${token}` },
      });
      if (invokeError || !data?.success) throw new Error(await getResponseError(invokeError));
      await loadOrders();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to update this payment.");
    } finally {
      setBusyId("");
    }
  };

  const counts = {
    pending_review: orders.filter((order) => order.status === "pending_review").length,
    approved: orders.filter((order) => order.status === "approved").length,
    rejected: orders.filter((order) => order.status === "rejected").length,
  };
  const filteredOrders = orders.filter((order) => {
    if (order.status !== filter) return false;
    return [order.order_code, order.full_name, order.email, order.phone, order.utr ?? ""]
      .join(" ")
      .toLowerCase()
      .includes(search.trim().toLowerCase());
  });

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6">
      <div className="mx-auto max-w-7xl">
        <Link to="/admin/dashboard" className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold text-slate-600 hover:bg-white">
          <ArrowLeft className="h-4 w-4" /> Admin dashboard
        </Link>

        <section className="mt-4 rounded-3xl bg-gradient-to-br from-slate-950 via-indigo-950 to-indigo-700 p-6 text-white sm:p-9">
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-white/10"><ShieldCheck className="h-6 w-6" /></div>
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-indigo-200">Question pack sales</p>
              <h1 className="text-2xl font-black sm:text-3xl">Payment verification</h1>
            </div>
          </div>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-indigo-100">
            Review the student, amount, UTR and uploaded image. Confirm the payment in your bank or UPI account before granting the Most Repeated Questions and Answers bundle.
          </p>
          <button onClick={() => void loadOrders()} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2 text-sm font-bold hover:bg-white/20">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh queue
          </button>
        </section>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          {([
            ["pending_review", "Needs review", "text-amber-700"],
            ["approved", "Access granted", "text-emerald-700"],
            ["rejected", "Rejected", "text-rose-700"],
          ] as const).map(([status, label, color]) => (
            <div key={status} className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-sm font-semibold text-slate-500">{label}</p>
              <p className={`mt-1 text-3xl font-black ${color}`}>{counts[status]}</p>
            </div>
          ))}
        </div>

        {error && <div role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div>}

        <section className="mt-5 rounded-3xl border border-slate-200 bg-white p-5 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap gap-2">
              {([
                ["pending_review", "Needs review"],
                ["approved", "Granted"],
                ["rejected", "Rejected"],
              ] as const).map(([status, label]) => (
                <button key={status} onClick={() => setFilter(status)} className={`rounded-xl px-3 py-2 text-xs font-bold ${filter === status ? "bg-indigo-700 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
                  {label} <span className="ml-1 opacity-75">{counts[status]}</span>
                </button>
              ))}
            </div>
            <label className="relative block">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search student, order or UTR" className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-sm sm:w-72" />
            </label>
          </div>

          {loading ? (
            <div className="flex items-center gap-2 py-12 text-sm text-slate-500"><Loader2 className="h-5 w-5 animate-spin" /> Loading payments…</div>
          ) : filteredOrders.length === 0 ? (
            <p className="py-12 text-center text-sm text-slate-500">No {filter.replace(/_/g, " ")} orders found.</p>
          ) : (
            <div className="mt-5 space-y-4">
              {filteredOrders.map((order) => (
                <article key={order.id} className="rounded-2xl border border-slate-200 p-4 sm:p-5">
                  <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.8fr)]">
                    <div>
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="font-mono text-xs font-bold text-indigo-700">{order.order_code}</p>
                          <h2 className="mt-1 text-lg font-black text-slate-900">{order.full_name}</h2>
                          <p className="mt-1 text-sm text-slate-600">{order.email} · {order.phone}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-black text-slate-900">₹{order.amount}</p>
                          <span className={`mt-1 inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${order.status === "approved" ? "bg-emerald-50 text-emerald-700" : order.status === "rejected" ? "bg-rose-50 text-rose-700" : "bg-amber-50 text-amber-800"}`}>
                            {order.status === "approved" ? "Access granted" : order.status.replace(/_/g, " ")}
                          </span>
                        </div>
                      </div>

                      <div className="mt-4 rounded-xl bg-slate-50 p-4">
                        <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Question pack</p>
                        <p className="mt-1 text-sm font-semibold text-slate-800">{order.selected_subjects.map((subject) => subjectNames[subject] ?? subject).join(" · ")}</p>
                        <p className="mt-3 text-[11px] font-bold uppercase tracking-wide text-slate-500">UPI reference / UTR</p>
                        <p className="mt-1 break-all font-mono text-sm font-bold text-slate-900">{order.utr || "Not submitted"}</p>
                        <p className="mt-3 text-xs text-slate-500">Submitted {new Date(order.created_at).toLocaleString("en-IN")}</p>
                      </div>

                      {order.status === "pending_review" && (
                        <div className="mt-4">
                          <label className="block text-xs font-bold text-slate-600">
                            Review note <span className="font-normal text-slate-400">(optional)</span>
                            <textarea value={notes[order.id] ?? ""} onChange={(event) => setNotes((current) => ({ ...current, [order.id]: event.target.value }))} maxLength={1000} rows={2} className="mt-1 w-full rounded-xl border border-slate-200 p-3 text-sm" placeholder="Add a brief verification note" />
                          </label>
                          <div className="mt-3 flex flex-wrap gap-2">
                            <button disabled={Boolean(busyId)} onClick={() => void review(order, "approved")} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-50">
                              {busyId === order.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                              Verify payment & grant access
                            </button>
                            <button disabled={Boolean(busyId)} onClick={() => void review(order, "rejected")} className="inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-bold text-rose-700 hover:bg-rose-100 disabled:opacity-50">
                              <XCircle className="h-4 w-4" /> Reject payment
                            </button>
                          </div>
                        </div>
                      )}

                      {order.admin_notes && <p className="mt-3 rounded-xl bg-slate-50 p-3 text-sm text-slate-600">Review note: {order.admin_notes}</p>}
                    </div>

                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Uploaded payment image</p>
                        {order.screenshot_url && <a href={order.screenshot_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-bold text-indigo-700 hover:text-indigo-900">Open full size <ExternalLink className="h-3.5 w-3.5" /></a>}
                      </div>
                      {order.screenshot_url ? (
                        <a href={order.screenshot_url} target="_blank" rel="noreferrer" className="mt-2 flex min-h-48 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50 p-2">
                          <img src={order.screenshot_url} alt={`Payment evidence for ${order.order_code}`} className="max-h-80 w-full rounded-lg object-contain" />
                        </a>
                      ) : (
                        <div className="mt-2 flex min-h-48 flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
                          <FileImage className="h-8 w-8 text-slate-400" />
                          <p className="mt-2 text-sm font-semibold text-slate-600">No payment image available</p>
                          <p className="mt-1 text-xs text-slate-500">Verify the transaction reference in your bank or UPI statement before granting access.</p>
                        </div>
                      )}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
