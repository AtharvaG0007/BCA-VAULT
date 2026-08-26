import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { motion } from "motion/react";
import {
  LayoutDashboard, Download, ShoppingBag, Heart, Coins, Users, Settings,
  TrendingUp, Star, FileText, Package, ArrowRight, Copy, Share2,
  CheckCircle, Clock, ChevronRight, BookOpen, Bell, LogOut
} from "lucide-react";
import { Button } from "../ui/button";

const navItems = [
  { icon: LayoutDashboard, label: "Overview", key: "overview" },
  { icon: ShoppingBag, label: "Purchases", key: "purchases" },
  { icon: Download, label: "Downloads", key: "downloads" },
  { icon: Heart, label: "Wishlist", key: "wishlist" },
  { icon: Coins, label: "Credits", key: "credits" },
  { icon: Users, label: "Referrals", key: "referrals" },
  { icon: Settings, label: "Settings", key: "settings" },
];

const recentPurchases = [
  { id: 1, title: "BCA Vault — Complete Theory Bundle", type: "bundle", semester: 1, date: "—", price: 899, status: "pending" },
];

const creditTransactions = [
  { label: "Signup bonus", amount: +50, date: "Jun 3", positive: true, type: "earn" },
  { label: "Email verified", amount: +20, date: "Jun 3", positive: true, type: "earn" },
  { label: "Complete Theory Bundle", amount: -49, date: "Jun 3", positive: false, type: "spend" },
  { label: "Referral: Priya Sharma", amount: +100, date: "May 30", positive: true, type: "earn" },
  { label: "BCA Vault — Complete Theory Bundle", amount: -74, date: "May 28", positive: false, type: "spend" },
];

export function DashboardPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("overview");
  const [creditsCopied, setCreditsCopied] = useState(false);

  const referralCode = "ARJUN847";

  const copyReferral = () => {
    setCreditsCopied(true);
    setTimeout(() => setCreditsCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className="hidden lg:flex w-64 shrink-0 flex-col bg-white border-r border-gray-100 sticky top-16 h-[calc(100vh-4rem)]">
        <div className="flex-1 p-4 overflow-y-auto">
          {/* User Card */}
          <div className="bg-gradient-to-br from-[#1E40AF] to-[#4F46E5] rounded-2xl p-4 mb-6 text-white">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-sm font-bold">A</div>
              <div>
                <p className="text-sm font-semibold">Arjun Kumar</p>
                <p className="text-xs text-blue-200">BCA Syllabus 2026–27</p>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Coins className="w-4 h-4 text-amber-300" />
                <span className="text-lg font-black" style={{ fontFamily: 'var(--font-mono)' }}>170</span>
                <span className="text-xs text-blue-200">credits</span>
              </div>
              <span className="text-xs text-amber-300 font-semibold bg-amber-500/20 px-2 py-0.5 rounded-full border border-amber-500/30">
                ₹170 value
              </span>
            </div>
          </div>

          <nav className="space-y-1">
            {navItems.map((item) => (
              <button
                key={item.key}
                onClick={() => setActiveTab(item.key)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors ${
                  activeTab === item.key
                    ? 'bg-[#1E40AF]/10 text-[#1E40AF] font-semibold'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-4 border-t border-gray-100">
          <button
            onClick={() => navigate("/")}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-red-500 hover:bg-red-50 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 min-w-0 p-4 lg:p-8">
        {/* Mobile Tab Bar */}
        <div className="flex gap-2 overflow-x-auto pb-4 mb-6 lg:hidden" style={{ scrollbarWidth: "none" }}>
          {navItems.map((item) => (
            <button
              key={item.key}
              onClick={() => setActiveTab(item.key)}
              className={`shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                activeTab === item.key
                  ? 'bg-[#1E40AF] text-white'
                  : 'bg-white text-gray-600 border border-gray-200'
              }`}
            >
              <item.icon className="w-3.5 h-3.5" />
              {item.label}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === "overview" && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
            <div className="mb-8">
              <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'var(--font-display)' }}>
                Good morning, Arjun! 👋
              </h1>
              <p className="text-gray-500 mt-1">Here's your study progress overview.</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              {[
                { label: "Vault Credits", value: "170", icon: Coins, color: "bg-amber-50 text-amber-600", iconBg: "bg-amber-100" },
                { label: "Purchases", value: "3", icon: ShoppingBag, color: "bg-blue-50 text-blue-600", iconBg: "bg-blue-100" },
                { label: "Downloads", value: "8", icon: Download, color: "bg-indigo-50 text-indigo-600", iconBg: "bg-indigo-100" },
                { label: "Referrals", value: "2", icon: Users, color: "bg-emerald-50 text-emerald-600", iconBg: "bg-emerald-100" },
              ].map((stat) => (
                <div key={stat.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                  <div className={`w-10 h-10 rounded-xl ${stat.iconBg} flex items-center justify-center mb-3`}>
                    <stat.icon className={`w-5 h-5 ${stat.color.split(' ')[1]}`} />
                  </div>
                  <p className="text-2xl font-black text-gray-900 mb-0.5" style={{ fontFamily: 'var(--font-mono)' }}>
                    {stat.value}
                  </p>
                  <p className="text-sm text-gray-500">{stat.label}</p>
                </div>
              ))}
            </div>

            {/* Recent Purchases */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-base font-bold text-gray-900" style={{ fontFamily: 'var(--font-display)' }}>
                  Recent Purchases
                </h2>
                <button
                  onClick={() => setActiveTab("purchases")}
                  className="text-sm text-[#4F46E5] hover:underline flex items-center gap-1"
                >
                  View all <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="space-y-3">
                {recentPurchases.map((purchase) => (
                  <div key={purchase.id} className="flex items-center gap-4 py-3 border-b last:border-0 border-gray-100">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                      {purchase.type === "bundle" ? <Package className="w-5 h-5 text-[#1E40AF]" /> : <FileText className="w-5 h-5 text-[#1E40AF]" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{purchase.title}</p>
                      <p className="text-xs text-gray-500">Sem {purchase.semester} · {purchase.date}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold text-gray-900" style={{ fontFamily: 'var(--font-mono)' }}>₹{purchase.price}</p>
                      <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-[#1E40AF] hover:bg-blue-50">
                        <Download className="w-3.5 h-3.5 mr-1" /> Download
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Referral Card */}
            <div className="bg-gradient-to-br from-[#111827] to-[#1E40AF] rounded-2xl p-6 text-white">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-bold text-lg mb-1" style={{ fontFamily: 'var(--font-display)' }}>Invite friends, earn ₹100</h3>
                  <p className="text-sm text-blue-200">Share your referral code and earn 100 credits per friend</p>
                </div>
                <Users className="w-8 h-8 text-blue-300" />
              </div>
              <div className="flex items-center gap-3">
                <div className="flex-1 bg-white/10 rounded-xl px-4 py-2.5 border border-white/20">
                  <span className="text-base font-bold tracking-widest" style={{ fontFamily: 'var(--font-mono)' }}>
                    {referralCode}
                  </span>
                </div>
                <Button
                  size="sm"
                  className="bg-amber-500 hover:bg-amber-600 text-black font-semibold shrink-0"
                  onClick={copyReferral}
                >
                  {creditsCopied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {creditsCopied ? "Copied!" : "Copy"}
                </Button>
              </div>
            </div>
          </motion.div>
        )}

        {/* Credits Tab */}
        {activeTab === "credits" && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
            <h1 className="text-2xl font-bold text-gray-900 mb-8" style={{ fontFamily: 'var(--font-display)' }}>Credit Wallet</h1>

            {/* Balance Card */}
            <div className="bg-gradient-to-br from-[#111827] to-[#1E40AF] rounded-3xl p-8 mb-6 text-white relative overflow-hidden">
              <div className="absolute top-0 right-0 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl" />
              <p className="text-sm text-blue-200 mb-2">Current Balance</p>
              <div className="flex items-end gap-3 mb-1">
                <p className="text-6xl font-black" style={{ fontFamily: 'var(--font-mono)' }}>170</p>
                <div className="flex items-center gap-1 mb-3">
                  <Coins className="w-5 h-5 text-amber-400" />
                  <span className="text-amber-400 font-semibold">credits</span>
                </div>
              </div>
              <p className="text-blue-200 mb-6">= ₹170.00 off at checkout</p>
              <div className="grid grid-cols-3 gap-4">
                {[
                  { label: "Lifetime Earned", value: "320" },
                  { label: "Total Spent", value: "123" },
                  { label: "Expires in", value: "165d" },
                ].map((s) => (
                  <div key={s.label} className="bg-white/10 rounded-xl p-3 text-center border border-white/20">
                    <p className="text-xl font-bold" style={{ fontFamily: 'var(--font-mono)' }}>{s.value}</p>
                    <p className="text-xs text-blue-200 mt-0.5">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Transaction History */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h2 className="text-base font-bold text-gray-900 mb-5" style={{ fontFamily: 'var(--font-display)' }}>
                Transaction History
              </h2>
              <div className="space-y-0">
                {creditTransactions.map((txn, i) => (
                  <div key={i} className={`flex items-center justify-between py-4 ${i !== creditTransactions.length - 1 ? 'border-b border-gray-100' : ''}`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${txn.positive ? 'bg-emerald-100' : 'bg-rose-100'}`}>
                        {txn.positive ? <TrendingUp className="w-4 h-4 text-emerald-600" /> : <Download className="w-4 h-4 text-rose-500" />}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{txn.label}</p>
                        <p className="text-xs text-gray-400">{txn.date}</p>
                      </div>
                    </div>
                    <span className={`text-sm font-bold ${txn.positive ? 'text-emerald-600' : 'text-rose-500'}`} style={{ fontFamily: 'var(--font-mono)' }}>
                      {txn.positive ? '+' : ''}{txn.amount}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* Referrals Tab */}
        {activeTab === "referrals" && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
            <h1 className="text-2xl font-bold text-gray-900 mb-8" style={{ fontFamily: 'var(--font-display)' }}>Referral Hub</h1>

            <div className="bg-gradient-to-br from-[#1E40AF] to-[#4F46E5] rounded-3xl p-8 text-white mb-8">
              <h2 className="text-2xl font-bold mb-2" style={{ fontFamily: 'var(--font-display)' }}>
                Earn ₹100 per referral
              </h2>
              <p className="text-blue-200 mb-6">
                Share your unique link. When a friend signs up and makes their first purchase, you both earn credits.
              </p>
              <div className="bg-white/10 rounded-2xl p-4 border border-white/20 mb-4">
                <p className="text-xs text-blue-200 mb-2">Your referral code</p>
                <div className="flex items-center gap-3">
                  <span className="text-2xl font-black tracking-widest flex-1" style={{ fontFamily: 'var(--font-mono)' }}>
                    {referralCode}
                  </span>
                  <Button size="sm" className="bg-white text-[#1E40AF] hover:bg-blue-50 shrink-0">
                    <Copy className="w-4 h-4 mr-1" /> Copy
                  </Button>
                </div>
              </div>
              <div className="flex gap-3">
                <Button className="bg-white/20 hover:bg-white/30 text-white border border-white/30 flex-1">
                  <Share2 className="w-4 h-4 mr-2" /> Share via WhatsApp
                </Button>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h3 className="text-base font-bold text-gray-900 mb-4" style={{ fontFamily: 'var(--font-display)' }}>My Referrals</h3>
              {[
                { name: "Priya Sharma", status: "completed", credits: 100, date: "May 30" },
                { name: "Rahul Verma", status: "pending", credits: 0, date: "Jun 1" },
              ].map((ref) => (
                <div key={ref.name} className="flex items-center justify-between py-4 border-b last:border-0 border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-sm font-bold text-blue-700">
                      {ref.name[0]}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{ref.name}</p>
                      <p className="text-xs text-gray-500">{ref.date}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                      ref.status === "completed" ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                    }`}>
                      {ref.status === "completed" ? "Completed" : "Pending"}
                    </span>
                    {ref.credits > 0 && (
                      <p className="text-xs text-emerald-600 font-bold mt-1" style={{ fontFamily: 'var(--font-mono)' }}>+{ref.credits} credits</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Settings Tab */}
        {activeTab === "settings" && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
            <h1 className="text-2xl font-bold text-gray-900 mb-8" style={{ fontFamily: 'var(--font-display)' }}>Account Settings</h1>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 max-w-xl">
              <div className="space-y-5">
                {[
                  { label: "Full Name", value: "Arjun Kumar", type: "text" },
                  { label: "Email", value: "arjun@example.com", type: "email" },
                  { label: "University", value: "Mumbai University", type: "text" },
                  { label: "Current Semester", value: "4", type: "number" },
                ].map((field) => (
                  <div key={field.label}>
                    <label className="text-sm font-medium text-gray-700 mb-1.5 block">{field.label}</label>
                    <input
                      type={field.type}
                      defaultValue={field.value}
                      className="w-full h-10 px-3 rounded-xl border border-gray-200 text-sm text-gray-900 focus:outline-none focus:border-[#1E40AF] bg-white"
                    />
                  </div>
                ))}
                <Button className="bg-[#1E40AF] hover:bg-[#1E3A8A] text-white w-full mt-2">
                  Save Changes
                </Button>
              </div>
            </div>
          </motion.div>
        )}

        {/* Other Tabs placeholder */}
        {["purchases", "downloads", "wishlist"].includes(activeTab) && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="text-center py-20">
            <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center mx-auto mb-4">
              <BookOpen className="w-8 h-8 text-[#1E40AF]" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2" style={{ fontFamily: 'var(--font-display)' }}>
              {activeTab === "purchases" ? "Purchase History" : activeTab === "downloads" ? "Your Downloads" : "Saved Items"}
            </h2>
            <p className="text-gray-500 mb-6">
              {recentPurchases.length} items available
            </p>
            <Button onClick={() => navigate("/notes")} className="bg-[#1E40AF] hover:bg-[#1E3A8A] text-white">
              Browse Notes
            </Button>
          </motion.div>
        )}
      </main>
    </div>
  );
}
