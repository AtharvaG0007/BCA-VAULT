import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import {
  BookOpen,
  Menu,
  X,
  ShoppingBag,
  Search,
  ChevronDown,
  User,
  LogOut,
  LayoutDashboard,
  Gift,
  Home,
  FileText,
  Package,
} from "lucide-react";
import { Button } from "./ui/button";
import { cn } from "./ui/utils";
import { useAuth } from "./auth/AuthContext";

const navLinks = [
  {
    label: "Notes",
    href: "/notes",
    children: [
      { label: "Semester 1 Notes", href: "/semester/1" },
      { label: "All Subjects", href: "/notes" },
      { label: "Semester 2 (Coming Soon)", href: "/notes" },
    ],
  },
  {
    label: "PYQ",
    href: "/pyq",
    children: [
      { label: "PYQ Papers", href: "/pyq" },
      { label: "PYQ Analysis", href: "/pyq/analysis" },
    ],
  },
  { label: "Bundles", href: "/bundles" },
  { label: "Referral Program", href: "/referral", badge: "Unlock Qs" },
];

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const navigate = useNavigate();
  const { user, appUser, logout } = useAuth();
  const isLoggedIn = Boolean(user);

  const studentName =
    appUser?.name?.trim() ||
    (user?.user_metadata?.full_name as string | undefined)?.trim() ||
    user?.email?.split("@")[0]?.trim() ||
    "Student";
  const studentEmail = user?.email || "";
  const avatarLetter = (studentName[0] || "S").toUpperCase();

  const handleLogout = async () => {
    setUserMenuOpen(false);
    setMobileOpen(false);
    await logout();
    navigate("/");
  };

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-100 shadow-xs">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 shrink-0">
            <div className="w-8 h-8 rounded-lg bg-[#1E40AF] flex items-center justify-center shadow-xs">
              <BookOpen className="w-4 h-4 text-white" />
            </div>
            <span className="text-lg font-black text-[#111827] tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
              BCA <span className="text-[#1E40AF]">Vault</span>
            </span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden lg:flex items-center gap-1">
            {navLinks.map((link) => (
              <div
                key={link.label}
                className="relative"
                onMouseEnter={() => link.children && setOpenDropdown(link.label)}
                onMouseLeave={() => setOpenDropdown(null)}
              >
                <Link
                  to={link.href}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-gray-600 hover:text-[#1E40AF] rounded-lg hover:bg-blue-50 transition-colors",
                  )}
                >
                  <span>{link.label}</span>
                  {(link as any).badge && (
                    <span className="text-[10px] font-bold tracking-tight bg-blue-100 text-[#1E40AF] px-1.5 py-0.2 rounded-full border border-blue-200">
                      {(link as any).badge}
                    </span>
                  )}
                  {link.children && <ChevronDown className="w-3.5 h-3.5 opacity-60" />}
                </Link>
                {link.children && openDropdown === link.label && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    className="absolute top-full left-0 mt-1 w-52 bg-white rounded-xl shadow-lg border border-gray-100 py-1.5 z-50"
                  >
                    {link.children.map((child) => (
                      <Link
                        key={child.label}
                        to={child.href}
                        className="block px-4 py-2 text-sm font-medium text-gray-700 hover:bg-blue-50 hover:text-[#1E40AF] transition-colors"
                      >
                        {child.label}
                      </Link>
                    ))}
                  </motion.div>
                )}
              </div>
            ))}
          </nav>

          {/* Right Side Controls */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              onClick={() => navigate("/search")}
              className="hidden sm:flex w-9 h-9 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-[#1E40AF] transition-colors"
              title="Search notes"
            >
              <Search className="w-4 h-4" />
            </button>

            {isLoggedIn ? (
              <>
                {/* Desktop/Tablet: Dashboard CTA */}
                <button
                  onClick={() => navigate("/app/dashboard")}
                  className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#1E40AF] rounded-xl text-white hover:bg-[#1E3A8A] transition text-xs font-bold shadow-xs"
                >
                  <LayoutDashboard className="w-3.5 h-3.5" />
                  <span>Dashboard</span>
                </button>

                {/* User Dropdown / Avatar */}
                <div className="relative">
                  <button
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                    className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-black hover:bg-[#1E40AF] transition shadow-xs cursor-pointer"
                    title={studentName}
                  >
                    {avatarLetter}
                  </button>
                  <AnimatePresence>
                    {userMenuOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 8 }}
                        className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-gray-100 py-1.5 z-50"
                      >
                        <div className="px-4 py-2.5 border-b border-gray-100">
                          <p className="text-xs font-black text-gray-900 truncate">{studentName}</p>
                          <p className="text-[11px] text-gray-500 truncate">{studentEmail}</p>
                        </div>
                        <Link
                          to="/app/dashboard"
                          className="flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-blue-50 hover:text-[#1E40AF] transition"
                          onClick={() => setUserMenuOpen(false)}
                        >
                          <LayoutDashboard className="w-3.5 h-3.5" />
                          <span>Student Dashboard</span>
                        </Link>
                        <Link
                          to="/app/profile"
                          className="flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-blue-50 hover:text-[#1E40AF] transition"
                          onClick={() => setUserMenuOpen(false)}
                        >
                          <User className="w-3.5 h-3.5" />
                          <span>My Profile</span>
                        </Link>
                        <Link
                          to="/app/referral"
                          className="flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-blue-50 hover:text-[#1E40AF] transition"
                          onClick={() => setUserMenuOpen(false)}
                        >
                          <Gift className="w-3.5 h-3.5 text-indigo-600" />
                          <span>Referral Program</span>
                        </Link>
                        <div className="border-t border-gray-100 mt-1 pt-1">
                          <button
                            onClick={handleLogout}
                            className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-bold text-red-600 hover:bg-red-50 transition"
                          >
                            <LogOut className="w-3.5 h-3.5" />
                            <span>Sign out</span>
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </>
            ) : (
              <>
                {/* ── VISIBLE AUTH ACTIONS (DESKTOP & MOBILE) ── */}
                {/* Mobile & Desktop visible: Login Button */}
                <Button
                  variant="ghost"
                  size="sm"
                  className="px-2 sm:px-3 text-xs font-bold text-gray-700 hover:text-[#1E40AF] hover:bg-blue-50 rounded-xl"
                  onClick={() => navigate("/auth/login")}
                >
                  Login
                </Button>

                {/* Mobile & Desktop visible: Create Account Button */}
                <Button
                  size="sm"
                  className="px-2 sm:px-3.5 text-xs font-bold bg-[#1E40AF] hover:bg-[#1E3A8A] text-white rounded-xl shadow-xs shrink-0"
                  onClick={() => navigate("/auth/signup")}
                >
                  <span className="hidden sm:inline">Create Free Account</span>
                  <span className="sm:hidden">Sign Up</span>
                </Button>
              </>
            )}

            {/* Mobile hamburger menu toggle */}
            <button
              className="lg:hidden w-9 h-9 flex items-center justify-center rounded-xl text-gray-700 hover:bg-gray-100 transition"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label="Toggle Menu"
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu (Categorized into MAIN and ACCOUNT) */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="lg:hidden border-t border-gray-100 bg-white overflow-hidden shadow-lg"
          >
            <div className="px-4 py-4 space-y-4">
              {/* ── MAIN SECTION ── */}
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 px-2 block mb-1.5">
                  Main Navigation
                </span>
                <div className="space-y-0.5">
                  <Link
                    to="/"
                    className="flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-gray-700 rounded-xl hover:bg-blue-50 hover:text-[#1E40AF] transition"
                    onClick={() => setMobileOpen(false)}
                  >
                    <Home className="w-3.5 h-3.5 text-slate-400" />
                    <span>Home</span>
                  </Link>

                  <Link
                    to="/notes"
                    className="flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-gray-700 rounded-xl hover:bg-blue-50 hover:text-[#1E40AF] transition"
                    onClick={() => setMobileOpen(false)}
                  >
                    <FileText className="w-3.5 h-3.5 text-slate-400" />
                    <span>Notes</span>
                  </Link>

                  <Link
                    to="/bundles"
                    className="flex items-center justify-between px-3 py-2 text-xs font-bold text-gray-700 rounded-xl hover:bg-blue-50 hover:text-[#1E40AF] transition"
                    onClick={() => setMobileOpen(false)}
                  >
                    <div className="flex items-center gap-2.5">
                      <Package className="w-3.5 h-3.5 text-slate-400" />
                      <span>Semester 1 Bundle</span>
                    </div>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      ₹499
                    </span>
                  </Link>

                  <Link
                    to="/referral"
                    className="flex items-center justify-between px-3 py-2 text-xs font-bold text-gray-700 rounded-xl hover:bg-blue-50 hover:text-[#1E40AF] transition"
                    onClick={() => setMobileOpen(false)}
                  >
                    <div className="flex items-center gap-2.5">
                      <Gift className="w-3.5 h-3.5 text-indigo-500" />
                      <span>Referral Program</span>
                    </div>
                    <span className="text-[10px] font-bold bg-blue-100 text-[#1E40AF] px-2 py-0.5 rounded-full border border-blue-200">
                      Unlock Qs
                    </span>
                  </Link>
                </div>
              </div>

              {/* ── ACCOUNT SECTION ── */}
              <div className="pt-3 border-t border-gray-100">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 px-2 block mb-2">
                  Account
                </span>

                {isLoggedIn ? (
                  <div className="space-y-2">
                    <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3">
                      <p className="text-xs font-black text-slate-900 truncate">{studentName}</p>
                      <p className="text-[11px] text-slate-500 truncate">{studentEmail}</p>
                    </div>

                    <div className="space-y-0.5">
                      <Link
                        to="/app/dashboard"
                        className="flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-indigo-700 bg-indigo-50/70 rounded-xl hover:bg-indigo-100 transition"
                        onClick={() => setMobileOpen(false)}
                      >
                        <LayoutDashboard className="w-3.5 h-3.5" />
                        <span>Student Dashboard</span>
                      </Link>

                      <Link
                        to="/app/profile"
                        className="flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-gray-700 rounded-xl hover:bg-blue-50 hover:text-[#1E40AF] transition"
                        onClick={() => setMobileOpen(false)}
                      >
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        <span>My Profile</span>
                      </Link>
                    </div>

                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 transition"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Log Out</span>
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    <Button
                      size="sm"
                      className="w-full bg-[#1E40AF] hover:bg-[#1E3A8A] text-white text-xs font-bold rounded-xl py-2.5"
                      onClick={() => {
                        navigate("/auth/signup");
                        setMobileOpen(false);
                      }}
                    >
                      Create Free Account
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full text-xs font-bold border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl py-2.5"
                      onClick={() => {
                        navigate("/auth/login");
                        setMobileOpen(false);
                      }}
                    >
                      Login to Existing Account
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
