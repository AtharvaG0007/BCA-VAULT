import { useEffect } from "react";
import { useLocation } from "react-router";

/**
 * Adds the destructive user-management action to the existing Super Admin sidebar
 * without changing the dashboard's existing navigation component.
 */
export function AdminSystemDeletionNav() {
  const location = useLocation();

  useEffect(() => {
    if (!location.pathname.startsWith("/admin")) return;

    const sidebarEmailLink = document.querySelector<HTMLAnchorElement>('a[href="/admin/email"]');
    const sidebarGroup = sidebarEmailLink?.parentElement?.parentElement;
    if (!sidebarGroup) return;

    const existing = document.querySelector<HTMLAnchorElement>('a[data-admin-delete-users="true"]');
    if (existing) {
      existing.classList.toggle("bg-rose-600", location.pathname === "/admin/delete-users");
      existing.classList.toggle("text-white", location.pathname === "/admin/delete-users");
      existing.classList.toggle("bg-rose-50", location.pathname !== "/admin/delete-users");
      existing.classList.toggle("text-rose-700", location.pathname !== "/admin/delete-users");
      return;
    }

    const emailLink = sidebarEmailLink;
    if (!emailLink) return;

    const link = document.createElement("a");
    link.href = "/admin/delete-users";
    link.dataset.adminDeleteUsers = "true";
    link.className = "flex items-center gap-3 px-3.5 py-2 rounded-xl text-xs font-bold transition bg-transparent text-slate-400 hover:bg-rose-950/40 hover:text-rose-300";
    link.setAttribute("aria-label", "Permanent User Deletion");
    link.innerHTML = `
      <span class="inline-flex h-4 w-4 items-center justify-center" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4">
          <path d="M3 6h18"></path><path d="M8 6V4h8v2"></path><path d="M19 6l-1 14H6L5 6"></path><path d="M10 11v5"></path><path d="M14 11v5"></path>
        </svg>
      </span>
      <span>Permanent User Deletion</span>
    `;

    emailLink.parentElement?.insertAdjacentElement("afterend", link);

    const cleanup = () => link.remove();
    return cleanup;
  }, [location.pathname]);

  return null;
}
