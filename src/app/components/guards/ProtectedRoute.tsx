import { Navigate, useLocation } from "react-router";
import { useAuth } from "@/app/components/auth/AuthContext";
import type { UserRole } from "../auth/AuthContext";

import { AdminShellSkeleton } from "@/app/components/admin/AdminSkeletons";
import { StudentShellSkeleton } from "@/app/components/student/StudentSkeletons";

interface Props {
  allowedRoles: UserRole[];
  children: React.ReactNode;
}

const roleHome: Record<UserRole, string> = {
  superadmin: "/admin-root/dashboard",
  admin: "/admin/dashboard",
  member: "/app/dashboard",
};

export function ProtectedRoute({ allowedRoles, children }: Props) {
  const { user, role, appUser, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    if (location.pathname.startsWith("/admin") || allowedRoles.includes("superadmin")) {
      return <AdminShellSkeleton pathname={location.pathname} />;
    }
    return <StudentShellSkeleton pathname={location.pathname} />;
  }

  if (!user) {
    return <Navigate to="/auth/login" state={{ from: location }} replace />;
  }

  if (!role || !allowedRoles.includes(role)) {
    const home = role ? roleHome[role] : "/auth/login";
    return <Navigate to={home} replace />;
  }

  if (role === "member" && appUser?.status === "suspended") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 text-center shadow-lg border border-gray-100">
          <div className="w-12 h-12 mx-auto mb-4 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold text-xl">
            !
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2" style={{ fontFamily: "var(--font-display)" }}>
            Account Suspended
          </h2>
          <p className="text-sm text-gray-600 mb-6 leading-relaxed">
            Your student account is currently suspended or pending verification. Please contact support via WhatsApp or email to resolve this.
          </p>
          <a
            href="/"
            className="inline-flex items-center justify-center px-5 py-2.5 bg-[#1E40AF] text-white rounded-xl text-xs font-bold hover:bg-[#1E3A8A] transition shadow-sm"
          >
            Return Home
          </a>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
