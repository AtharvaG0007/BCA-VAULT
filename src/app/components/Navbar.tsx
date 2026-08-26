import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import { BookOpen, Menu, X, ShoppingBag, Search, ChevronDown, User, LogOut, Settings, LayoutDashboard, Sparkles } from "lucide-react";
import { Button } from "./ui/button";
import { cn } from "./ui/utils";

const navLinks = [
  {
    label: "Notes",
    href: "/notes",
    children: [
      { label: "All Notes", href: "/notes" },
      { label: "Semester 1", href: "/semester/1" },
      { label: "Semester 2", href: "/semester/2" },
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
];

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const navigate = useNavigate();
  const [isLoggedIn] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-100 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 shrink-0">
            <div className="w-8 h-8 rounded-lg bg-[#1E40AF] flex items-center justify-center">
              <BookOpen className="w-4 h-4 text-white" />
            </div>
            <span className="text-lg font-bold text-[#111827]" style={{ fontFamily: 'var(--font-display)' }}>
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
                    "flex items-center gap-1 px-3 py-2 text-sm font-medium text-gray-600 hover:text-[#1E40AF] rounded-lg hover:bg-blue-50 transition-colors",
                  )}
                >
                  {link.label}
                  {link.children && <ChevronDown className="w-3.5 h-3.5" />}
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
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-[#1E40AF] transition-colors"
                      >
                        {child.label}
                      </Link>
                    ))}
                  </motion.div>
                )}
              </div>
            ))}
          </nav>

          {/* Right Side */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate("/search")}
              className="hidden sm:flex w-9 h-9 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-[#1E40AF] transition-colors"
            >
              <Search className="w-4 h-4" />
            </button>

            {isLoggedIn ? (
              <>
                {/* Bundles CTA */}
                <button
                  onClick={() => navigate("/bundles")}
                  className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-[#1E40AF]/10 rounded-full border border-[#1E40AF]/20 text-[#1E40AF] hover:bg-[#1E40AF]/20 transition-colors text-xs font-semibold"
                >
                  <ShoppingBag className="w-3.5 h-3.5" /> Get Bundle
                </button>

                {/* User Menu */}
                <div className="relative">
                  <button
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                    className="w-8 h-8 rounded-full bg-[#1E40AF] text-white flex items-center justify-center text-sm font-semibold hover:bg-[#1E3A8A] transition-colors"
                  >
                    A
                  </button>
                  <AnimatePresence>
                    {userMenuOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 8 }}
                        className="absolute right-0 mt-2 w-52 bg-white rounded-xl shadow-lg border border-gray-100 py-1.5 z-50"
                      >
                        <div className="px-4 py-2 border-b border-gray-100">
                          <p className="text-sm font-semibold text-gray-900">Arjun Kumar</p>
                          <p className="text-xs text-gray-500">arjun@example.com</p>
                        </div>
                        {[
                          { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard" },
                          { icon: User,            label: "Profile",   href: "/dashboard/settings" },
                          { icon: Settings,        label: "Settings",  href: "/dashboard/settings" },
                        ].map((item) => (
                          <Link
                            key={item.label}
                            to={item.href}
                            className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-[#1E40AF] transition-colors"
                            onClick={() => setUserMenuOpen(false)}
                          >
                            <item.icon className="w-4 h-4" />
                            {item.label}
                          </Link>
                        ))}
                        <div className="border-t border-gray-100 mt-1 pt-1">
                          <button className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors">
                            <LogOut className="w-4 h-4" />
                            Sign out
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </>
            ) : (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  className="hidden sm:inline-flex text-gray-700 hover:text-[#1E40AF] hover:bg-blue-50"
                  onClick={() => navigate("/auth/login")}
                >
                  Sign in
                </Button>
                <Button
                  size="sm"
                  className="bg-[#1E40AF] hover:bg-[#1E3A8A] text-white hidden sm:inline-flex"
                  onClick={() => navigate("/auth/login")}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Get Started
                </Button>
              </>
            )}

            {/* Mobile menu toggle */}
            <button
              className="lg:hidden w-9 h-9 flex items-center justify-center rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
              onClick={() => setMobileOpen(!mobileOpen)}
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="lg:hidden border-t border-gray-100 bg-white overflow-hidden"
          >
            <div className="px-4 py-3 space-y-1">
              {navLinks.map((link) => (
                <div key={link.label}>
                  <Link
                    to={link.href}
                    className="block px-3 py-2 text-sm font-medium text-gray-700 rounded-lg hover:bg-blue-50 hover:text-[#1E40AF] transition-colors"
                    onClick={() => setMobileOpen(false)}
                  >
                    {link.label}
                  </Link>
                  {link.children && (
                    <div className="ml-4 mt-1 space-y-1">
                      {link.children.map((child) => (
                        <Link
                          key={child.label}
                          to={child.href}
                          className="block px-3 py-1.5 text-sm text-gray-500 rounded-lg hover:bg-blue-50 hover:text-[#1E40AF] transition-colors"
                          onClick={() => setMobileOpen(false)}
                        >
                          {child.label}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              <div className="pt-2 border-t border-gray-100 flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => { navigate("/auth/login"); setMobileOpen(false); }}
                >
                  Sign in
                </Button>
                <Button
                  size="sm"
                  className="flex-1 bg-[#1E40AF] hover:bg-[#1E3A8A] text-white"
                  onClick={() => { navigate("/auth/login"); setMobileOpen(false); }}
                >
                  Get Started
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
