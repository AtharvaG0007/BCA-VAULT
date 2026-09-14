import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import { BookOpen, Menu, X, Search, ChevronDown, User, LogOut, LayoutDashboard, Gift, Home, FileText, Package } from "lucide-react";
import { Button } from "./ui/button";
import { cn } from "./ui/utils";
import { useAuth } from "./auth/AuthContext";

const navLinks = [
  { label: "Notes", href: "/notes", children: [{ label: "Semester 1 Notes", href: "/semester/1" }, { label: "All Subjects", href: "/notes" }, { label: "Semester 2 (Coming Soon)", href: "/notes" }] },
  { label: "PYQ", href: "/pyq", children: [{ label: "PYQ Papers", href: "/pyq" }, { label: "PYQ Analysis", href: "/pyq/analysis" }] },
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
  const studentName = appUser?.name?.trim() || (user?.user_metadata?.full_name as string | undefined)?.trim() || user?.email?.split("@")[0]?.trim() || "Student";
  const studentEmail = user?.email || "";
  const avatarLetter = (studentName[0] || "S").toUpperCase();

  const handleLogout = async () => { setUserMenuOpen(false); setMobileOpen(false); await logout(); navigate("/"); };

  return <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-100 shadow-xs">
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8"><div className="flex items-center justify-between h-16">
      <Link to="/" className="flex items-center gap-2 shrink-0"><div className="w-8 h-8 rounded-lg bg-[#1E40AF] flex items-center justify-center shadow-xs"><BookOpen className="w-4 h-4 text-white" /></div><span className="text-lg font-black text-[#111827] tracking-tight" style={{ fontFamily: "var(--font-display)" }}>BCA <span className="text-[#1E40AF]">Vault</span></span></Link>

      <nav className="hidden lg:flex items-center gap-1">{navLinks.map((link) => <div key={link.label} className="relative" onMouseEnter={() => link.children && setOpenDropdown(link.label)} onMouseLeave={() => setOpenDropdown(null)}>
        <Link to={link.href} className={cn("flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-gray-600 hover:text-[#1E40AF] rounded-lg hover:bg-blue-50 transition-colors")}><span>{link.label}</span>{link.badge && <span className="text-[10px] font-bold tracking-tight bg-blue-100 text-[#1E40AF] px-1.5 py-0.5 rounded-full border border-blue-200">{link.badge}</span>}{link.children && <ChevronDown className="w-3.5 h-3.5 opacity-60" />}</Link>
        {link.children && openDropdown === link.label && <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="absolute top-full left-0 mt-1 w-52 bg-white rounded-xl shadow-lg border border-gray-100 py-1.5 z-50">{link.children.map((child) => <Link key={child.label} to={child.href} className="block px-4 py-2 text-sm font-medium text-gray-700 hover:bg-blue-50 hover:text-[#1E40AF] transition-colors">{child.label}</Link>)}</motion.div>}
      </div>)}</nav>

      <div className="flex items-center gap-1.5 sm:gap-2">
        <button onClick={() => navigate("/search")} className="hidden sm:flex w-9 h-9 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-[#1E40AF] transition-colors" title="Search notes"><Search className="w-4 h-4" /></button>
        {isLoggedIn ? <>
          {/* One dashboard CTA only. The old tablet-specific CTA duplicated this button at 640–1023px. */}
          <button onClick={() => navigate("/app/dashboard")} className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#1E40AF] rounded-xl text-white hover:bg-[#1E3A8A] transition text-xs font-bold shadow-xs"><LayoutDashboard className="w-3.5 h-3.5" /><span>Dashboard</span></button>
          <div className="relative"><button onClick={() => setUserMenuOpen(!userMenuOpen)} className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-black hover:bg-[#1E40AF] transition shadow-xs" title={studentName}>{avatarLetter}</button>
            <AnimatePresence>{userMenuOpen && <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }} className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-gray-100 py-1.5 z-50">
              <div className="px-4 py-2.5 border-b border-gray-100"><p className="text-xs font-black text-gray-900 truncate">{studentName}</p><p className="text-[11px] text-gray-500 truncate">{studentEmail}</p></div>
              <Link to="/app/dashboard" onClick={() => setUserMenuOpen(false)} className="flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-blue-50 hover:text-[#1E40AF]"><LayoutDashboard className="w-3.5 h-3.5" /><span>Student Dashboard</span></Link>
              <Link to="/app/profile" onClick={() => setUserMenuOpen(false)} className="flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-blue-50 hover:text-[#1E40AF]"><User className="w-3.5 h-3.5" /><span>My Profile</span></Link>
              <Link to="/app/notices" onClick={() => setUserMenuOpen(false)} className="flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-blue-50 hover:text-[#1E40AF]"><BellIcon /><span>Notice Board</span></Link>
              <Link to="/app/referral" onClick={() => setUserMenuOpen(false)} className="flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-blue-50 hover:text-[#1E40AF]"><Gift className="w-3.5 h-3.5 text-indigo-600" /><span>Referral Program</span></Link>
              <div className="border-t border-gray-100 mt-1 pt-1"><button onClick={handleLogout} className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-bold text-red-600 hover:bg-red-50"><LogOut className="w-3.5 h-3.5" /><span>Sign out</span></button></div>
            </motion.div>}</AnimatePresence>
          </div>
        </> : <><Button variant="ghost" size="sm" className="px-2 sm:px-3 text-xs font-bold text-gray-700 hover:text-[#1E40AF] rounded-xl" onClick={() => navigate("/auth/login")}>Login</Button><Button size="sm" className="px-2 sm:px-3.5 text-xs font-bold bg-[#1E40AF] hover:bg-[#1E3A8A] text-white rounded-xl shrink-0" onClick={() => navigate("/auth/signup")}><span className="hidden sm:inline">Create Free Account</span><span className="sm:hidden">Sign Up</span></Button></>}
        <button className="lg:hidden w-9 h-9 flex items-center justify-center rounded-xl text-gray-700 hover:bg-gray-100" onClick={() => setMobileOpen(!mobileOpen)} aria-label="Toggle Menu">{mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}</button>
      </div>
    </div></div>

    <AnimatePresence>{mobileOpen && <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="lg:hidden border-t border-gray-100 bg-white overflow-hidden shadow-lg"><div className="px-4 py-4 space-y-4">
      <div><span className="text-[10px] font-black uppercase tracking-wider text-slate-400 px-2 block mb-1.5">Main Navigation</span><div className="space-y-0.5">
        <MobileLink to="/" icon={<Home className="w-3.5 h-3.5" />} label="Home" close={() => setMobileOpen(false)} />
        <MobileLink to="/notes" icon={<FileText className="w-3.5 h-3.5" />} label="Notes" close={() => setMobileOpen(false)} />
        <MobileLink to="/bundles" icon={<Package className="w-3.5 h-3.5" />} label="Semester 1 Bundle" close={() => setMobileOpen(false)} />
        {isLoggedIn && <MobileLink to="/app/notices" icon={<BellIcon />} label="Notice Board" close={() => setMobileOpen(false)} />}
        <MobileLink to="/referral" icon={<Gift className="w-3.5 h-3.5" />} label="Referral Program" close={() => setMobileOpen(false)} />
      </div></div>
      {isLoggedIn && <div className="pt-3 border-t border-gray-100"><span className="text-[10px] font-black uppercase tracking-wider text-slate-400 px-2 block mb-2">Account</span><div className="space-y-1.5"><div className="bg-slate-50 border border-slate-200 rounded-xl p-3"><p className="text-xs font-black text-slate-900 truncate">{studentName}</p><p className="text-[11px] text-slate-500 truncate">{studentEmail}</p></div><MobileLink to="/app/dashboard" icon={<LayoutDashboard className="w-3.5 h-3.5" />} label="Student Dashboard" close={() => setMobileOpen(false)} /><MobileLink to="/app/profile" icon={<User className="w-3.5 h-3.5" />} label="My Profile" close={() => setMobileOpen(false)} /><button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-red-600 bg-red-50"><LogOut className="w-3.5 h-3.5" />Sign out</button></div></div>}
      {!isLoggedIn && <div className="pt-3 border-t border-gray-100"><Button className="w-full mb-2" onClick={() => { navigate("/auth/signup"); setMobileOpen(false); }}>Create Free Account</Button><Button variant="outline" className="w-full" onClick={() => { navigate("/auth/login"); setMobileOpen(false); }}>Login</Button></div>}
    </div></motion.div>}</AnimatePresence>
  </header>;
}

function MobileLink({ to, icon, label, close }: { to: string; icon: React.ReactNode; label: string; close: () => void }) {
  return <Link to={to} onClick={close} className="flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-gray-700 rounded-xl hover:bg-blue-50 hover:text-[#1E40AF] transition"><span className="text-slate-400">{icon}</span><span>{label}</span></Link>;
}

function BellIcon() { return <span className="inline-flex h-3.5 w-3.5 items-center justify-center text-[11px]" aria-hidden="true">🔔</span>; }
