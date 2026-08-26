import { Navigate, useLocation } from "react-router";
import { useAuth } from "@/app/components/auth/AuthContext";
import type { UserRole } from "../auth/AuthContext";

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
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-[#1E40AF] border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-500">Verifying session...</p>
        </div>
      </div>
    );
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
