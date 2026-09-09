import React from "react";
import { LayoutDashboard, Sparkles, User, Gift, LogOut, Menu } from "lucide-react";

export function StudentSkeleton({
  className = "",
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`animate-pulse rounded-xl bg-slate-200/80 ${className}`}
      {...props}
    />
  );
}

/** Dashboard Tab Content Skeleton */
export function StudentDashboardSkeleton() {
  return (
    <div className="space-y-8">
      {/* AI Learning Assistant Hero Card Skeleton */}
      <div className="rounded-3xl border border-indigo-100 bg-gradient-to-br from-indigo-50/70 via-white to-blue-50/40 p-6 sm:p-7 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-2">
            <StudentSkeleton className="h-5 w-36 bg-indigo-100 rounded-full" />
            <StudentSkeleton className="h-6 w-64 bg-slate-200" />
            <StudentSkeleton className="h-3.5 w-80 max-w-full bg-slate-200/70" />
          </div>
          <StudentSkeleton className="h-10 w-28 rounded-2xl bg-indigo-200/60 shrink-0" />
        </div>
      </div>

      {/* Active Courses Section Skeleton */}
      <section className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-7 shadow-2xs">
        <div className="flex items-center gap-3 mb-5 border-b border-slate-100 pb-4">
          <div className="h-10 w-10 rounded-xl bg-emerald-50 animate-pulse" />
          <div className="space-y-1.5">
            <StudentSkeleton className="h-4 w-32" />
            <StudentSkeleton className="h-3 w-56 bg-slate-200/70" />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {Array.from({ length: 2 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50/60 p-4"
            >
              <div className="space-y-2">
                <StudentSkeleton className="h-3.5 w-20 bg-indigo-100 rounded-md" />
                <StudentSkeleton className="h-4 w-44" />
              </div>
              <StudentSkeleton className="h-6 w-20 rounded-full bg-emerald-100/70" />
            </div>
          ))}
        </div>
      </section>

      {/* Most Repeated Topics Section Skeleton */}
      <section className="rounded-3xl border border-amber-200/80 bg-gradient-to-br from-amber-50/40 via-white to-orange-50/20 p-6 sm:p-8 shadow-2xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-amber-100 pb-5">
          <div className="space-y-2">
            <StudentSkeleton className="h-5 w-60 bg-amber-100 rounded-full" />
            <StudentSkeleton className="h-6 w-48 bg-slate-300/80" />
            <StudentSkeleton className="h-3.5 w-72 max-w-full bg-slate-200/70" />
          </div>
          <StudentSkeleton className="h-7 w-44 rounded-xl bg-amber-100/70" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="flex flex-col justify-between rounded-2xl border border-amber-200 bg-white p-5 shadow-2xs space-y-4"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <StudentSkeleton className="h-4 w-24 bg-amber-100 rounded-md" />
                  <StudentSkeleton className="h-3 w-16 bg-slate-200" />
                </div>
                <StudentSkeleton className="h-4 w-40" />
                <StudentSkeleton className="h-3 w-32 bg-amber-100/70" />
                <div className="space-y-1.5 pt-1">
                  <StudentSkeleton className="h-3 w-full bg-slate-100" />
                  <StudentSkeleton className="h-3 w-4/5 bg-slate-100" />
                </div>
              </div>
              <StudentSkeleton className="h-9 w-full rounded-xl bg-amber-300/60 mt-4" />
            </div>
          ))}
        </div>
      </section>

      {/* Referral Reward Callout Skeleton */}
      <div className="rounded-2xl border border-indigo-100 bg-indigo-50/40 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-indigo-100 animate-pulse shrink-0" />
          <div className="space-y-1.5">
            <StudentSkeleton className="h-4 w-52" />
            <StudentSkeleton className="h-3 w-72 max-w-full bg-slate-200/70" />
          </div>
        </div>
        <StudentSkeleton className="h-8 w-36 rounded-xl bg-indigo-100/70 shrink-0" />
      </div>

      {/* Study Materials Hub Section Skeleton */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1.5">
            <StudentSkeleton className="h-5 w-48" />
            <StudentSkeleton className="h-3 w-64 bg-slate-200/70" />
          </div>
          <StudentSkeleton className="h-4 w-28 bg-slate-200/60" />
        </div>

        {/* Filter Pills and Search */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <StudentSkeleton className="h-8 w-16 rounded-xl" />
            <StudentSkeleton className="h-8 w-28 rounded-xl bg-amber-100/60" />
            <StudentSkeleton className="h-8 w-24 rounded-xl" />
          </div>
          <StudentSkeleton className="h-8 w-full md:w-64 rounded-xl" />
        </div>

        {/* 6 Notes Cards Skeleton */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 pt-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs space-y-4"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="h-9 w-9 rounded-xl bg-indigo-50 animate-pulse" />
                  <StudentSkeleton className="h-4 w-16 rounded-full bg-slate-100" />
                </div>
                <StudentSkeleton className="h-4 w-44" />
                <StudentSkeleton className="h-3 w-28 bg-indigo-50" />
                <div className="space-y-1.5 pt-1">
                  <StudentSkeleton className="h-3 w-full bg-slate-100" />
                  <StudentSkeleton className="h-3 w-2/3 bg-slate-100" />
                </div>
              </div>
              <StudentSkeleton className="h-8 w-full rounded-xl bg-slate-100 mt-2" />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

/** Student Profile Tab Skeleton */
export function StudentProfileSkeleton() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 space-y-8">
      <div className="space-y-1.5">
        <StudentSkeleton className="h-7 w-36" />
        <StudentSkeleton className="h-3.5 w-64 bg-slate-200/70" />
      </div>

      {/* Profile Details Card */}
      <section className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-7 shadow-2xs space-y-6">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
          <div className="h-10 w-10 rounded-xl bg-indigo-50 animate-pulse" />
          <div className="space-y-1.5">
            <StudentSkeleton className="h-4 w-32" />
            <StudentSkeleton className="h-3 w-56 bg-slate-200/70" />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-2xl bg-slate-50 p-4 border border-slate-100 space-y-2">
              <StudentSkeleton className="h-3 w-24 bg-slate-200/70" />
              <StudentSkeleton className="h-4 w-40" />
            </div>
          ))}
        </div>
      </section>

      {/* Subscription Card */}
      <section className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-7 shadow-2xs space-y-6">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
          <div className="h-10 w-10 rounded-xl bg-emerald-50 animate-pulse" />
          <div className="space-y-1.5">
            <StudentSkeleton className="h-4 w-40" />
            <StudentSkeleton className="h-3 w-64 bg-slate-200/70" />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div className="rounded-2xl bg-slate-50 p-4 border border-slate-100 space-y-2">
            <StudentSkeleton className="h-3 w-32 bg-slate-200/70" />
            <StudentSkeleton className="h-5 w-24 rounded-full bg-emerald-100/70" />
          </div>
          <div className="rounded-2xl bg-slate-50 p-4 border border-slate-100 space-y-2">
            <StudentSkeleton className="h-3 w-28 bg-slate-200/70" />
            <StudentSkeleton className="h-4 w-36" />
          </div>
        </div>
      </section>
    </div>
  );
}

/** Student Referral Tab Skeleton */
export function StudentReferralSkeleton() {
  return (
    <div className="mx-auto max-w-5xl w-full px-4 py-8 sm:px-6 space-y-8">
      <header className="space-y-2">
        <StudentSkeleton className="h-5 w-44 rounded-full bg-indigo-50 border border-indigo-100" />
        <StudentSkeleton className="h-8 w-80 max-w-full" />
        <StudentSkeleton className="h-3.5 w-96 max-w-full bg-slate-200/70" />
      </header>

      {/* Referral Identifier Box */}
      <section className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="space-y-3">
            <StudentSkeleton className="h-3 w-28 bg-slate-200/70" />
            <div className="flex items-center gap-3">
              <StudentSkeleton className="h-12 w-48 rounded-2xl bg-slate-100" />
              <StudentSkeleton className="h-10 w-20 rounded-xl bg-indigo-200/60" />
            </div>
            <StudentSkeleton className="h-3 w-64 bg-slate-200/60" />
          </div>
          <StudentSkeleton className="h-10 w-56 rounded-2xl bg-indigo-50 border border-indigo-100" />
        </div>
      </section>

      {/* 3 Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-2.5">
            <div className="flex items-center justify-between">
              <StudentSkeleton className="h-3.5 w-24" />
              <div className="h-4 w-4 rounded bg-slate-200 animate-pulse" />
            </div>
            <StudentSkeleton className="h-7 w-12" />
            <StudentSkeleton className="h-3 w-32 bg-slate-200/70" />
          </div>
        ))}
      </div>

      {/* Rewards Overview Skeleton */}
      <section className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <StudentSkeleton className="h-5 w-48" />
          <StudentSkeleton className="h-7 w-28 rounded-xl bg-slate-100" />
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-slate-100 bg-slate-50 p-4 space-y-2">
              <StudentSkeleton className="h-4 w-32" />
              <StudentSkeleton className="h-3 w-20 bg-emerald-100 rounded" />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

/** Full Progressive Student Shell Skeleton for initial page load or session restore */
export function StudentShellSkeleton({ pathname = "" }: { pathname?: string }) {
  const isProfile = pathname.includes("profile");
  const isReferral = pathname.includes("referral");

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col md:flex-row">
      {/* Desktop Navigation Sidebar Skeleton */}
      <aside className="hidden md:flex w-64 bg-white border-r border-slate-200 p-6 flex-col justify-between shrink-0 shadow-2xs">
        <div>
          {/* Brand Header */}
          <div className="flex items-center gap-3 pb-6 border-b border-slate-100 mb-6">
            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-indigo-600 text-white font-black shadow-md shadow-indigo-600/20 text-sm">
              BV
            </div>
            <div>
              <h1 className="font-black text-sm tracking-tight text-slate-900 leading-tight">
                BCA VAULT
              </h1>
              <p className="text-[11px] font-bold text-indigo-600 uppercase tracking-wider">
                Student Portal
              </p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1.5">
            <div className={`flex items-center gap-3 w-full px-3.5 py-2.5 rounded-2xl text-xs font-bold ${!isProfile && !isReferral ? "bg-indigo-600/90 text-white shadow-md shadow-indigo-600/20" : "text-slate-600"}`}>
              <LayoutDashboard className="h-4 w-4 shrink-0" />
              <span>Dashboard</span>
            </div>
            <div className="flex items-center gap-3 w-full px-3.5 py-2.5 rounded-2xl text-xs font-bold text-slate-600">
              <Sparkles className="h-4 w-4 shrink-0 text-amber-500" />
              <span>AI Learning Assistant</span>
            </div>
            <div className={`flex items-center gap-3 w-full px-3.5 py-2.5 rounded-2xl text-xs font-bold ${isProfile ? "bg-indigo-600/90 text-white shadow-md shadow-indigo-600/20" : "text-slate-600"}`}>
              <User className="h-4 w-4 shrink-0" />
              <span>My Profile</span>
            </div>
            <div className={`flex items-center gap-3 w-full px-3.5 py-2.5 rounded-2xl text-xs font-bold ${isReferral ? "bg-indigo-600/90 text-white shadow-md shadow-indigo-600/20" : "text-slate-600"}`}>
              <Gift className="h-4 w-4 shrink-0 text-emerald-500" />
              <span>Referral Program</span>
            </div>
          </nav>
        </div>

        {/* Bottom Profile Info */}
        <div className="pt-6 border-t border-slate-100 space-y-2">
          <div className="px-2 space-y-1.5">
            <StudentSkeleton className="h-3.5 w-28" />
            <StudentSkeleton className="h-2.5 w-16 bg-slate-200/70" />
          </div>
          <div className="flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-slate-400">
            <LogOut className="h-4 w-4" />
            <span>Sign Out</span>
          </div>
        </div>
      </aside>

      {/* Mobile Navigation Header */}
      <div className="md:hidden border-b border-slate-200 bg-white sticky top-0 z-30 px-4 py-3 shadow-2xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="grid h-8 w-8 place-items-center rounded-xl bg-indigo-600 text-white font-black text-xs">
              BV
            </div>
            <div>
              <span className="font-black text-xs text-slate-900">BCA VAULT</span>
              <span className="block text-[10px] text-indigo-600 font-bold uppercase tracking-wider">
                Student Portal
              </span>
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 p-2 text-slate-400">
            <Menu className="h-4 w-4" />
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 p-4 sm:p-6 md:p-8 max-w-7xl mx-auto w-full">
        {/* Header Bar */}
        <header className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <StudentSkeleton className="h-6 w-52 sm:w-64" />
            <StudentSkeleton className="h-3.5 w-36 bg-slate-200/70" />
          </div>
          <StudentSkeleton className="h-8 w-24 rounded-xl self-start sm:self-auto" />
        </header>

        {isProfile ? (
          <StudentProfileSkeleton />
        ) : isReferral ? (
          <StudentReferralSkeleton />
        ) : (
          <StudentDashboardSkeleton />
        )}
      </main>
    </div>
  );
}
