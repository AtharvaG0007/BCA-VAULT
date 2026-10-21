import { useEffect, useState } from "react";
import {
  LogOut,
  User,
  XCircle,
} from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import { StudentProfileSkeleton } from "./StudentSkeletons";

export function StudentProfileView() {
  const { user, appUser, logout } = useAuth();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(false);
  }, []);

  const studentName = appUser?.name || user?.user_metadata?.full_name || "Student";
  const studentEmail = appUser?.email || user?.email || "—";
  const studentSemester = appUser?.semester || 1;

  if (loading) {
    return <StudentProfileSkeleton />;
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-slate-900">My Profile</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Your student account and enrollment information
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

          {/* Account Status */}
          <section className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-7 shadow-2xs">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-50 text-emerald-600">
                {appUser?.status === "active" ? <User className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">Account status</h2>
                <p className="text-xs text-slate-500">Status of your BCA Vault student account</p>
              </div>
            </div>
            <div className="mt-6 rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <p className="text-slate-500 text-xs font-semibold">Status</p>
              <p className={`mt-2 text-sm font-bold ${appUser?.status === "active" ? "text-emerald-700" : "text-rose-700"}`}>
                {appUser?.status === "active" ? "Active" : "Inactive — contact support if you think this is a mistake"}
              </p>
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
