import {
  BrowserRouter,
  Routes,
  Route,
  useLocation,
  Navigate,
} from "react-router";
import { AnimatePresence, motion } from "motion/react";
import { Toaster } from "./components/ui/sonner";
import {
  AuthProvider,
  useAuth,
} from "@/app/components/auth/AuthContext";
import {
  LegalProvider,
  useLegal,
} from "./components/legal/LegalContext";
import { DisclaimerModal } from "./components/legal/DisclaimerModal";
import { ProtectedRoute } from "./components/guards/ProtectedRoute";
import { Navbar } from "./components/Navbar";
import { Footer } from "./components/Footer";
import { HomePage } from "./components/pages/HomePage";
import { NotesPage } from "./components/pages/NotesPage";
import { PYQPage } from "./components/pages/PYQPage";
import { BundlesPage } from "./components/pages/BundlesPage";
import { PricingPage } from "./components/pages/PricingPage";
import { ReferralPage } from "./components/pages/ReferralPage";
import { LoginPage } from "./components/pages/LoginPage";
import { SuperAdminDashboard } from "./components/dashboards/SuperAdminDashboard";
import { StudentDashboard } from "./components/dashboards/StudentDashboard";
import { TermsPage } from "./components/pages/TermsPage";
import { PrivacyPage } from "./components/pages/PrivacyPage";
import { LegalConsentPage } from "./components/pages/LegalConsentPage";
import { SuccessPage } from "./components/pages/SuccessPage";
import { PaymentPage } from "./components/pages/PaymentPage";
import { AdminLoginPage } from "./components/pages/AdminLoginPage";
import { AdminEmailPage } from "./components/pages/AdminEmailPage";
import { AdminAuthProvider } from "@/app/components/auth/AdminAuthContext";
import { AdminProtectedRoute } from "./components/guards/AdminProtectedRoute";
import { PublicSupportChat } from "./components/chatbot/PublicSupportChat";
import { WhatsAppFloatingButton } from "./components/support/WhatsAppFloatingButton";
import { ReferralFloatingPromo } from "./components/marketing/ReferralFloatingPromo";
import { StudentShellSkeleton } from "./components/student/StudentSkeletons";

function PageWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}

// After login: redirect user to their role-specific dashboard
function RoleRedirect() {
  const { user, role, loading } = useAuth();
  const { hasAccepted } = useLegal();

  if (loading) return <StudentShellSkeleton />;
  if (!user) return <Navigate to="/auth/login" replace />;
  if (!hasAccepted)
    return <Navigate to="/legal-consent" replace />;
  if (role === "superadmin")
    return <Navigate to="/admin/dashboard" replace />;
  return <Navigate to="/app/dashboard" replace />;
}

// Routes that hide the public Navbar/Footer
const noNavRoutes = [
  "/auth/",
  "/admin",
  "/admin-root",
  "/admin-root-login",
  "/admin-login",
  "/app",
  "/legal-consent",
];

// Routes where the disclaimer modal is suppressed (legal pages accessible pre-acceptance)
const noDisclaimerRoutes = [
  "/terms-and-conditions",
  "/privacy-policy",
  "/legal-consent",
];

function AppLayout() {
  const location = useLocation();
  const { hasAccepted } = useLegal();
  const hideNav = noNavRoutes.some((p) =>
    location.pathname.startsWith(p),
  );
  const isStudentRoute = location.pathname.startsWith("/app");
  const isAdminRoute =
    location.pathname.startsWith("/admin") ||
    location.pathname.startsWith("/admin-root");
  const showDisclaimer =
    !hasAccepted &&
    !noDisclaimerRoutes.some((p) =>
      location.pathname.startsWith(p),
    );

  return (
    <div className="min-h-screen flex flex-col">
      {showDisclaimer && <DisclaimerModal />}
      {!hideNav && <Navbar />}
      <div className="flex-1">
        <AnimatePresence mode="wait">
          <Routes location={location} key={location.pathname}>
            {/* ── Public pages ─────────────────────────────────────────── */}
            <Route
              path="/"
              element={
                <PageWrapper>
                  <HomePage />
                </PageWrapper>
              }
            />
            <Route
              path="/notes"
              element={
                <PageWrapper>
                  <NotesPage />
                </PageWrapper>
              }
            />
            <Route
              path="/pyq"
              element={
                <PageWrapper>
                  <PYQPage />
                </PageWrapper>
              }
            />
            <Route
              path="/pyq/analysis"
              element={
                <PageWrapper>
                  <PYQPage />
                </PageWrapper>
              }
            />
            <Route
              path="/bundles"
              element={
                <PageWrapper>
                  <BundlesPage />
                </PageWrapper>
              }
            />
            <Route
              path="/referral"
              element={
                <PageWrapper>
                  <ReferralPage />
                </PageWrapper>
              }
            />
            <Route
              path="/referral-program"
              element={<Navigate to="/referral" replace />}
            />
            <Route
              path="/pricing"
              element={
                <PageWrapper>
                  <PricingPage />
                </PageWrapper>
              }
            />
            <Route
              path="/semester/:sem"
              element={
                <PageWrapper>
                  <NotesPage />
                </PageWrapper>
              }
            />
            <Route
              path="/success"
              element={
                <PageWrapper>
                  <SuccessPage />
                </PageWrapper>
              }
            />
            <Route
              path="/purchase"
              element={
                <PageWrapper>
                  <PaymentPage />
                </PageWrapper>
              }
            />

            {/* ── Auth ─────────────────────────────────────────────────── */}
            <Route
              path="/auth/login"
              element={
                <PageWrapper>
                  <LoginPage />
                </PageWrapper>
              }
            />
            <Route
              path="/auth/signup"
              element={
                <PageWrapper>
                  <LoginPage initialMode="signup" />
                </PageWrapper>
              }
            />
            <Route
              path="/auth/register"
              element={
                <PageWrapper>
                  <LoginPage initialMode="signup" />
                </PageWrapper>
              }
            />

            {/* ── Super Admin Login (/admin-root-login) ────────────────── */}
            <Route path="/admin-root-login" element={<AdminLoginPage />} />
            <Route path="/admin-root/login" element={<Navigate to="/admin-root-login" replace />} />
            <Route path="/admin-login" element={<Navigate to="/admin-root-login" replace />} />
            <Route path="/admin/login" element={<Navigate to="/admin-root-login" replace />} />

            {/* ── Post-login role redirect ──────────────────────────────── */}
            <Route
              path="/dashboard"
              element={<RoleRedirect />}
            />
            <Route
              path="/dashboard/*"
              element={<RoleRedirect />}
            />

            {/* ── Super Admin Dashboard (/admin & /admin-root) ─────────── */}
            <Route
              path="/admin"
              element={
                <AdminProtectedRoute allowedRoles={["superadmin"]}>
                  <SuperAdminDashboard />
                </AdminProtectedRoute>
              }
            />
            <Route
              path="/admin/dashboard"
              element={
                <AdminProtectedRoute allowedRoles={["superadmin"]}>
                  <SuperAdminDashboard />
                </AdminProtectedRoute>
              }
            />
            <Route
              path="/admin/email"
              element={
                <AdminProtectedRoute allowedRoles={["superadmin"]}>
                  <AdminEmailPage />
                </AdminProtectedRoute>
              }
            />
            <Route
              path="/admin/:subpage"
              element={
                <AdminProtectedRoute allowedRoles={["superadmin"]}>
                  <SuperAdminDashboard />
                </AdminProtectedRoute>
              }
            />
            <Route
              path="/admin-root"
              element={
                <AdminProtectedRoute allowedRoles={["superadmin"]}>
                  <SuperAdminDashboard />
                </AdminProtectedRoute>
              }
            />
            <Route
              path="/admin-root/email"
              element={
                <AdminProtectedRoute allowedRoles={["superadmin"]}>
                  <AdminEmailPage />
                </AdminProtectedRoute>
              }
            />
            <Route
              path="/admin-root/dashboard"
              element={
                <AdminProtectedRoute allowedRoles={["superadmin"]}>
                  <SuperAdminDashboard />
                </AdminProtectedRoute>
              }
            />
            <Route
              path="/admin-root/:subpage"
              element={
                <AdminProtectedRoute allowedRoles={["superadmin"]}>
                  <SuperAdminDashboard />
                </AdminProtectedRoute>
              }
            />

            {/* Legacy aliases */}
            <Route
              path="/superadmin"
              element={
                <Navigate to="/admin/dashboard" replace />
              }
            />
            <Route
              path="/superadmin/*"
              element={
                <Navigate to="/admin/dashboard" replace />
              }
            />

            {/* ── Student Dashboard (/app/dashboard & /student) ──────────── */}
            <Route
              path="/app/dashboard"
              element={
                <ProtectedRoute allowedRoles={["member"]}>
                  <StudentDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/app/*"
              element={
                <ProtectedRoute allowedRoles={["member"]}>
                  <StudentDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/student"
              element={<Navigate to="/app/dashboard" replace />}
            />
            <Route
              path="/student/*"
              element={<Navigate to="/app/dashboard" replace />}
            />

            {/* ── Legal ─────────────────────────────────────────────────── */}
            <Route
              path="/terms-and-conditions"
              element={<TermsPage />}
            />
            <Route
              path="/privacy-policy"
              element={<PrivacyPage />}
            />
            <Route
              path="/legal-consent"
              element={<LegalConsentPage />}
            />

            {/* ── 404 ───────────────────────────────────────────────────── */}
            <Route
              path="*"
              element={
                <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                  <div className="text-center">
                    <p
                      className="text-8xl font-black text-gray-100 mb-4"
                      style={{ fontFamily: "var(--font-mono)" }}
                    >
                      404
                    </p>
                    <h1
                      className="text-2xl font-bold text-gray-900 mb-2"
                      style={{
                        fontFamily: "var(--font-display)",
                      }}
                    >
                      Page not found
                    </h1>
                    <a
                      href="/"
                      className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#1E40AF] text-white rounded-xl text-sm font-semibold hover:bg-[#1E3A8A] transition-colors mt-4"
                    >
                      Go back home
                    </a>
                  </div>
                </div>
              }
            />
          </Routes>
        </AnimatePresence>
      </div>
      {!hideNav && <Footer />}
      {!isAdminRoute && <WhatsAppFloatingButton />}
      {/* Public pages → Support AI & Referral Promo | Admin & Student → none */}
      {!isAdminRoute && !isStudentRoute && (
        <>
          <PublicSupportChat />
          <ReferralFloatingPromo />
        </>
      )}
      <Toaster />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AdminAuthProvider>
          <LegalProvider>
            <AppLayout />
          </LegalProvider>
        </AdminAuthProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
