import { Navigate, useLocation } from "react-router";
import type { AdminRole } from "@/app/components/auth/AdminAuthContext";
import { useAdminAuth } from "@/app/components/auth/AdminAuthContext";

export function AdminProtectedRoute({ allowedRoles, children }: { allowedRoles: AdminRole[]; children: React.ReactNode }) {
  const { user, role, loading } = useAdminAuth();
  const location = useLocation();
  if (loading) return <div className="min-h-screen grid place-items-center bg-gray-50 text-sm text-gray-500">Restoring admin session…</div>;
  if (!user || !role) return <Navigate to="/admin-root/login" replace />;
  if (!allowedRoles.includes(role)) return <Navigate to="/admin-root/login" replace />;
  return <>{children}</>;
}
