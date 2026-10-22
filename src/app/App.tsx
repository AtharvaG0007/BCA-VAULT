import { BrowserRouter, Routes, Route, useLocation, Navigate } from "react-router";
import { AnimatePresence, motion } from "motion/react";
import { AuthProvider, useAuth } from "@/app/components/auth/AuthContext";
import { LegalProvider, useLegal } from "./components/legal/LegalContext";
import { DisclaimerModal } from "./components/legal/DisclaimerModal";
import { ProtectedRoute } from "./components/guards/ProtectedRoute";
import { lazy, Suspense } from "react";
import { Navbar } from "./components/Navbar";
import { Footer } from "./components/Footer";
import { AdminAuthProvider } from "@/app/components/auth/AdminAuthContext";
import { AdminProtectedRoute } from "./components/guards/AdminProtectedRoute";
import { PublicSupportChat } from "./components/chatbot/PublicSupportChat";
import { WhatsAppFloatingButton } from "./components/support/WhatsAppFloatingButton";
import { ReferralFloatingPromo } from "./components/marketing/ReferralFloatingPromo";
import { StudentShellSkeleton } from "./components/student/StudentSkeletons";
import { AdminSystemDeletionNav } from "./components/admin/AdminSystemDeletionNav";
import { Toaster } from "./components/ui/sonner";
import { ErrorBoundary } from "./components/ErrorBoundary";

function safeLazy<T extends React.ComponentType<any>>(factory: () => Promise<{ default: T }>, retries = 2) {
  return lazy(async () => {
    let attempt = 0;
    while (true) {
      try {
        return await factory();
      } catch (err: any) {
        attempt++;
        const msg = String(err?.message || "");
        const isChunkError =
          msg.includes("Failed to fetch dynamically imported module") ||
          msg.includes("Importing a module script failed") ||
          msg.includes("error loading dynamically imported module") ||
          msg.includes("Expected a JavaScript-or-Wasm module script");

        if (isChunkError && attempt <= retries) {
          // Backoff before retrying the dynamic import
          await new Promise((resolve) => setTimeout(resolve, attempt * 600));
          continue;
        }

        if (isChunkError) {
          const key = "bca_lazy_chunk_reload";
          const last = sessionStorage.getItem(key);
          const now = Date.now();
          // Only reload as a last resort if retries failed and no recent reload occurred
          if (!last || now - parseInt(last, 10) > 30000) {
            sessionStorage.setItem(key, now.toString());
            window.location.reload();
          }
        }
        throw err;
      }
    }
  });
}

const HomePage = safeLazy(() => import("./components/pages/HomePage").then((m) => ({ default: m.HomePage })));
const NotesPage = safeLazy(() => import("./components/pages/NotesPage").then((m) => ({ default: m.NotesPage })));
const PYQPage = safeLazy(() => import("./components/pages/PYQPage").then((m) => ({ default: m.PYQPage })));
const BundlesPage = safeLazy(() => import("./components/pages/BundlesPage").then((m) => ({ default: m.BundlesPage })));
const ExamKitsPage = safeLazy(() => import("./components/pages/ExamKitsPage").then((m) => ({ default: m.ExamKitsPage })));
const BootcampsPage = safeLazy(() => import("./components/pages/BootcampsPage").then((m) => ({ default: m.BootcampsPage })));
const StudentExamKitsPortal = safeLazy(() => import("./components/pages/StudentExamKitsPortal").then((m) => ({ default: m.StudentExamKitsPortal })));
const AdminExamKitsPage = safeLazy(() => import("./components/pages/AdminExamKitsPage").then((m) => ({ default: m.AdminExamKitsPage })));
const PricingPage = safeLazy(() => import("./components/pages/PricingPage").then((m) => ({ default: m.PricingPage })));
const ReferralPage = safeLazy(() => import("./components/pages/ReferralPage").then((m) => ({ default: m.ReferralPage })));
const LoginPage = safeLazy(() => import("./components/pages/LoginPage").then((m) => ({ default: m.LoginPage })));
const SuperAdminDashboard = safeLazy(() => import("./components/dashboards/SuperAdminDashboard").then((m) => ({ default: m.SuperAdminDashboard })));
const AdminUserDeletionPage = safeLazy(() => import("./components/pages/AdminUserDeletionPage").then((m) => ({ default: m.AdminUserDeletionPage })));
const AdminNoticeBoardPage = safeLazy(() => import("./components/pages/AdminNoticeBoardPage").then((m) => ({ default: m.AdminNoticeBoardPage })));
const StudentNoticeBoardPage = safeLazy(() => import("./components/pages/StudentNoticeBoardPage").then((m) => ({ default: m.StudentNoticeBoardPage })));
const StudentDashboard = safeLazy(() => import("./components/dashboards/StudentDashboard").then((m) => ({ default: m.StudentDashboard })));
const TermsPage = safeLazy(() => import("./components/pages/TermsPage").then((m) => ({ default: m.TermsPage })));
const PrivacyPage = safeLazy(() => import("./components/pages/PrivacyPage").then((m) => ({ default: m.PrivacyPage })));
const LegalConsentPage = safeLazy(() => import("./components/pages/LegalConsentPage").then((m) => ({ default: m.LegalConsentPage })));
const SuccessPage = safeLazy(() => import("./components/pages/SuccessPage").then((m) => ({ default: m.SuccessPage })));
const PaymentPage = safeLazy(() => import("./components/pages/PaymentPage").then((m) => ({ default: m.PaymentPage })));
const AdminLoginPage = safeLazy(() => import("./components/pages/AdminLoginPage").then((m) => ({ default: m.AdminLoginPage })));

function PageWrapper({ children }: { children: React.ReactNode }) {
  return <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }} transition={{ duration: 0.22, ease: "easeOut" }} className="w-full max-w-full min-w-0">{children}</motion.div>;
}

function RoleRedirect() {
  const { user, role, loading } = useAuth();
  const { hasAccepted } = useLegal();
  if (loading) return <StudentShellSkeleton />;
  if (!user) return <Navigate to="/auth/login" replace />;
  if (!hasAccepted) return <Navigate to="/legal-consent" replace />;
  if (role === "superadmin") return <Navigate to="/admin/dashboard" replace />;
  return <Navigate to="/app/dashboard" replace />;
}

const noNavRoutes = ["/auth/", "/admin", "/admin-root", "/admin-root-login", "/admin-login", "/app", "/legal-consent"];
const noDisclaimerRoutes = ["/terms-and-conditions", "/privacy-policy", "/legal-consent"];

function AppLayout() {
  const location = useLocation();
  const { hasAccepted } = useLegal();
  const hideNav = noNavRoutes.some((p) => location.pathname.startsWith(p));
  const isAuthRoute = location.pathname.startsWith("/auth");
  const isStudentRoute = location.pathname.startsWith("/app");
  const isPurchaseRoute = location.pathname.startsWith("/purchase") || location.pathname.startsWith("/payment");
  const isAdminRoute = location.pathname.startsWith("/admin") || location.pathname.startsWith("/admin-root");
  const showDisclaimer = !hasAccepted && !noDisclaimerRoutes.some((p) => location.pathname.startsWith(p));

  return (
    <div className="min-h-screen flex flex-col w-full max-w-full overflow-x-hidden">
      {showDisclaimer && <DisclaimerModal />}
      {!hideNav && <Navbar />}
      <div className="flex-1 w-full min-w-0">
        {isAdminRoute && <AdminSystemDeletionNav />}

        <Suspense fallback={<StudentShellSkeleton />}>
          <AnimatePresence mode="wait">
            <Routes location={location} key={location.pathname}>
              <Route path="/" element={<PageWrapper><HomePage /></PageWrapper>} />
              <Route path="/notes" element={<PageWrapper><NotesPage /></PageWrapper>} />
              <Route path="/pyq" element={<PageWrapper><PYQPage /></PageWrapper>} />
              <Route path="/pyq/analysis" element={<PageWrapper><PYQPage /></PageWrapper>} />
              <Route path="/bundles" element={<PageWrapper><BundlesPage /></PageWrapper>} />
              <Route path="/exam-kits" element={<PageWrapper><ExamKitsPage /></PageWrapper>} />
              <Route path="/app/exam-kits" element={<ProtectedRoute allowedRoles={["member"]}><ExamKitsPage /></ProtectedRoute>} />
              <Route path="/app/bootcamps" element={<ProtectedRoute allowedRoles={["member"]}><BootcampsPage /></ProtectedRoute>} />
              <Route path="/app/exam-kits/portal" element={<ProtectedRoute allowedRoles={["member"]}><StudentExamKitsPortal /></ProtectedRoute>} />
              <Route path="/referral" element={<PageWrapper><ReferralPage /></PageWrapper>} />
              <Route path="/referral-program" element={<Navigate to="/referral" replace />} />
              <Route path="/pricing" element={<PageWrapper><PricingPage /></PageWrapper>} />
              <Route path="/semester/:sem" element={<PageWrapper><NotesPage /></PageWrapper>} />
              <Route path="/success" element={<PageWrapper><SuccessPage /></PageWrapper>} />
              <Route path="/purchase" element={<PageWrapper><PaymentPage /></PageWrapper>} />
              <Route path="/payment" element={<PageWrapper><PaymentPage /></PageWrapper>} />
              <Route path="/auth/login" element={<PageWrapper><LoginPage /></PageWrapper>} />
              <Route path="/auth/signup" element={<PageWrapper><LoginPage initialMode="signup" /></PageWrapper>} />
              <Route path="/auth/register" element={<PageWrapper><LoginPage initialMode="signup" /></PageWrapper>} />
              <Route path="/admin-root-login" element={<AdminLoginPage />} />
              <Route path="/admin-root/login" element={<Navigate to="/admin-root-login" replace />} />
              <Route path="/admin-login" element={<Navigate to="/admin-root-login" replace />} />
              <Route path="/admin/login" element={<Navigate to="/admin-root-login" replace />} />
              <Route path="/dashboard" element={<RoleRedirect />} />
              <Route path="/dashboard/*" element={<RoleRedirect />} />
              <Route path="/admin" element={<AdminProtectedRoute allowedRoles={["superadmin"]}><SuperAdminDashboard /></AdminProtectedRoute>} />
              <Route path="/admin/dashboard" element={<AdminProtectedRoute allowedRoles={["superadmin"]}><SuperAdminDashboard /></AdminProtectedRoute>} />
              <Route path="/admin/exam-kits" element={<AdminProtectedRoute allowedRoles={["superadmin"]}><AdminExamKitsPage /></AdminProtectedRoute>} />
              <Route path="/admin/delete-users" element={<AdminProtectedRoute allowedRoles={["superadmin"]}><AdminUserDeletionPage /></AdminProtectedRoute>} />
              <Route path="/admin/notices" element={<AdminProtectedRoute allowedRoles={["superadmin"]}><AdminNoticeBoardPage /></AdminProtectedRoute>} />
              <Route path="/admin/:subpage" element={<AdminProtectedRoute allowedRoles={["superadmin"]}><SuperAdminDashboard /></AdminProtectedRoute>} />
              <Route path="/admin-root" element={<AdminProtectedRoute allowedRoles={["superadmin"]}><SuperAdminDashboard /></AdminProtectedRoute>} />
              <Route path="/admin-root/dashboard" element={<AdminProtectedRoute allowedRoles={["superadmin"]}><SuperAdminDashboard /></AdminProtectedRoute>} />
              <Route path="/admin-root/:subpage" element={<AdminProtectedRoute allowedRoles={["superadmin"]}><SuperAdminDashboard /></AdminProtectedRoute>} />
              <Route path="/superadmin" element={<Navigate to="/admin/dashboard" replace />} />
              <Route path="/superadmin/*" element={<Navigate to="/admin/dashboard" replace />} />
              <Route path="/app/referral" element={<ProtectedRoute allowedRoles={["member"]}><StudentDashboard /></ProtectedRoute>} />
              <Route path="/app/dashboard" element={<ProtectedRoute allowedRoles={["member"]}><StudentDashboard /></ProtectedRoute>} />
              <Route path="/app/notices" element={<ProtectedRoute allowedRoles={["member"]}><StudentNoticeBoardPage /></ProtectedRoute>} />
              <Route path="/app/*" element={<ProtectedRoute allowedRoles={["member"]}><StudentDashboard /></ProtectedRoute>} />
              <Route path="/student/exam-kits" element={<ProtectedRoute allowedRoles={["member"]}><StudentExamKitsPortal /></ProtectedRoute>} />
              <Route path="/student/exam-kits/*" element={<ProtectedRoute allowedRoles={["member"]}><StudentExamKitsPortal /></ProtectedRoute>} />
              <Route path="/student" element={<Navigate to="/app/dashboard" replace />} />
              <Route path="/student/*" element={<Navigate to="/app/dashboard" replace />} />
              <Route path="/terms-and-conditions" element={<TermsPage />} />
              <Route path="/privacy-policy" element={<PrivacyPage />} />
              <Route path="/legal-consent" element={<LegalConsentPage />} />
              <Route path="*" element={<div className="min-h-screen bg-gray-50 flex items-center justify-center"><div className="text-center"><p className="text-8xl font-black text-gray-100 mb-4" style={{ fontFamily: "var(--font-mono)" }}>404</p><h1 className="text-2xl font-bold text-gray-900 mb-2" style={{ fontFamily: "var(--font-display)" }}>Page not found</h1><a href="/" className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#1E40AF] text-white rounded-xl text-sm font-semibold hover:bg-[#1E3A8A] transition-colors mt-4">Go back home</a></div></div>} />
            </Routes>
          </AnimatePresence>
        </Suspense>
      </div>
      {!hideNav && <Footer />}
      {!isAdminRoute && <WhatsAppFloatingButton />}
      {!isAdminRoute && !isStudentRoute && !isAuthRoute && <><PublicSupportChat />{!isPurchaseRoute && <ReferralFloatingPromo />}</>}
      <Toaster />
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <AdminAuthProvider>
            <LegalProvider>
              <AppLayout />
            </LegalProvider>
          </AdminAuthProvider>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
