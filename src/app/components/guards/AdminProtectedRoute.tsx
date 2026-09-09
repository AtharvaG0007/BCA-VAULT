import { Navigate, useLocation } from "react-router";
import type { AdminRole } from "@/app/components/auth/AdminAuthContext";
import { useAdminAuth } from "@/app/components/auth/AdminAuthContext";
import { AdminShellSkeleton } from "@/app/components/admin/AdminSkeletons";

export function AdminProtectedRoute({
  allowedRoles,
  children,
}: {
  allowedRoles: AdminRole[];
  children: React.ReactNode;
}) {
  const { user, role, loading } = useAdminAuth();
  const location = useLocation();

  if (loading) {
    return <AdminShellSkeleton pathname={location.pathname} />;
  }

  if (!user || !role || !allowedRoles.includes(role)) {
    return <Navigate to="/admin-root-login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}
