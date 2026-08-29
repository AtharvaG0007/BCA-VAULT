import { Navigate, useLocation } from "react-router";
import type { AdminRole } from "@/app/components/auth/AdminAuthContext";
import { useAdminAuth } from "@/app/components/auth/AdminAuthContext";

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
    return (
      <div className="min-h-screen grid place-items-center bg-gray-950 text-sm text-gray-400">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p>Restoring admin session…</p>
        </div>
      </div>
    );
  }

  if (!user || !role || !allowedRoles.includes(role)) {
    return <Navigate to="/admin-root-login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}
