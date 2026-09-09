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

  if (!role || !allowedRoles.includes(role) || (role === "member" && appUser?.status !== "active")) {
    const home = role ? roleHome[role] : "/auth/login";
    return <Navigate to={home} replace />;
  }

  return <>{children}</>;
}
