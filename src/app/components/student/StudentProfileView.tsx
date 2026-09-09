import { useEffect, useState } from "react";
import {
  CheckCircle2,
  Clock,
  CreditCard,
  GraduationCap,
  KeyRound,
  Loader2,
  LogOut,
  Mail,
  Package,
  ShieldAlert,
  User,
  XCircle,
} from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "../auth/AuthContext";
import { StudentProfileSkeleton } from "./StudentSkeletons";

interface PaymentRecord {
  id: string;
  reference_id?: string;
  amount?: number;
  utr?: string;
  status?: string;
  created_at?: string;
}

interface AccessRecord {
  id: string;
  status: string;
  bundles: { title: string; price: number } | { title: string; price: number }[] | null;
}

export function StudentProfileView() {
  const { user, appUser, logout } = useAuth();
  const [payment, setPayment] = useState<PaymentRecord | null>(null);
  const [accessList, setAccessList] = useState<AccessRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadAccountData() {
      if (!user) return;
      setLoading(true);
      try {
        const [payRes, accRes] = await Promise.all([
          supabase
            .from("payment_submissions")
            .select("id,reference_id,amount,utr,status,created_at")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle(),
          supabase
            .from("access_permissions")
            .select("id,status,bundles(title,price)")
            .eq("user_id", user.id),
        ]);

        if (payRes.data) {
          setPayment(payRes.data as PaymentRecord);
        } else {
          setPayment(null);
        }

        if (accRes.data) {
          setAccessList((accRes.data as unknown as AccessRecord[]) || []);
        }
      } catch (err) {
        console.error("Profile load error:", err);
      } finally {
        setLoading(false);
      }
    }

    void loadAccountData();
  }, [user]);

  const studentName = appUser?.name || user?.user_metadata?.full_name || "Student";
  const studentEmail = appUser?.email || user?.email || "—";
  const studentSemester = appUser?.semester || 1;

  const hasActiveAccess = accessList.some((a) => a.status === "active");

  const authorizedBundles = accessList
    .filter((a) => a.status === "active")
    .map((a) => {
      const b = Array.isArray(a.bundles) ? a.bundles[0] : a.bundles;
      return b?.title || "BCA Course Bundle";
    });

  const formatMoney = (val?: number) =>
    val
      ? new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(
          Number(val)
        )
      : "—";

  const formatDate = (val?: string) =>
    val ? new Date(val).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";

  if (loading) {
    return <StudentProfileSkeleton />;
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-slate-900">My Profile</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Your student account, enrollment and subscription status
        </p>
      </div>

      {/* Student Profile Card */}
          <section className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-7 shadow-2xs">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-indigo-50 text-indigo-600">
                <User className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">Profile Details</h2>
                <p className="text-xs text-slate-500">Personal information associated with your account</p>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-5 text-xs">
              <div className="rounded-2xl bg-slate-50 p-4 border border-slate-100">
                <p className="text-slate-500 font-semibold">Student Full Name</p>
                <p className="mt-1 text-sm font-bold text-slate-900">{studentName}</p>
              </div>

              <div className="rounded-2xl bg-slate-50 p-4 border border-slate-100">
                <p className="text-slate-500 font-semibold">Registered Email</p>
                <p className="mt-1 text-sm font-bold text-slate-900 truncate">{studentEmail}</p>
              </div>

              <div className="rounded-2xl bg-slate-50 p-4 border border-slate-100">
                <p className="text-slate-500 font-semibold">Degree Program</p>
                <p className="mt-1 text-sm font-bold text-slate-900">Bachelor of Computer Applications (BCA)</p>
              </div>

              <div className="rounded-2xl bg-slate-50 p-4 border border-slate-100">
                <p className="text-slate-500 font-semibold">Current Semester</p>
                <p className="mt-1 text-sm font-bold text-slate-900">Semester {studentSemester}</p>
              </div>
            </div>
          </section>

          {/* Account & Access Card */}
          <section className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-7 shadow-2xs">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-50 text-emerald-600">
                <CreditCard className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">Account & Subscription</h2>
                <p className="text-xs text-slate-500">Access permission and payment verification details</p>
              </div>
            </div>

            <div className="mt-6 space-y-6">
              {/* Access Status & Authorized Bundle */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 text-xs">
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <p className="text-slate-500 font-semibold">Library Access Status</p>
                  <div className="mt-2 flex items-center gap-2">
                    {hasActiveAccess ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 border border-emerald-200">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Active Access
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700 border border-amber-200">
                        <Clock className="h-3.5 w-3.5" /> Inactive / Pending Verification
                      </span>
                    )}
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <p className="text-slate-500 font-semibold">Authorized Bundle</p>
                  <div className="mt-1.5">
                    {authorizedBundles.length > 0 ? (
                      <div className="space-y-1">
                        {authorizedBundles.map((bTitle, idx) => (
                          <div key={idx} className="flex items-center gap-1.5 font-bold text-indigo-900 text-xs">
                            <Package className="h-3.5 w-3.5 text-indigo-600" />
                            <span>{bTitle}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs font-medium text-slate-600">No active bundles linked</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Payment Details Section */}
              <div className="border-t border-slate-100 pt-5">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                  Payment Details
                </h3>

                {payment ? (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 rounded-2xl bg-slate-50 p-4 border border-slate-100 text-xs">
                    <div>
                      <p className="text-slate-400 font-semibold">Status</p>
                      <p className="mt-1 font-bold capitalize text-slate-900">
                        {payment.status === "approved"
                          ? "Verified"
                          : payment.status === "pending"
                          ? "Pending Review"
                          : payment.status || "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-400 font-semibold">Amount</p>
                      <p className="mt-1 font-bold text-indigo-600">{formatMoney(payment.amount)}</p>
                    </div>
                    <div>
                      <p className="text-slate-400 font-semibold">UTR / Txn ID</p>
                      <p className="mt-1 font-mono font-medium text-slate-700 truncate">
                        {payment.utr || "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-400 font-semibold">Submitted On</p>
                      <p className="mt-1 font-medium text-slate-700">{formatDate(payment.created_at)}</p>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 p-5 text-center text-xs text-slate-500">
                    Payment details unavailable
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Sign Out Action */}
          <div className="pt-2 flex justify-start">
            <button
              onClick={() => void logout()}
              className="inline-flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-3 text-xs font-bold text-rose-700 hover:bg-rose-100 hover:border-rose-300 transition shadow-2xs"
            >
              <LogOut className="h-4 w-4" />
              <span>Sign Out of Account</span>
            </button>
          </div>
        </div>
      );
    }
