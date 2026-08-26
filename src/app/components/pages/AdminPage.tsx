import { useState } from "react";
import { motion } from "motion/react";
import {
  LayoutDashboard, Package, Users, ShoppingCart, Coins, BarChart3,
  TrendingUp, TrendingDown, Plus, Download, Filter,
  AlertTriangle, ArrowUpRight, ArrowDownRight,
  Star, Search
} from "lucide-react";
import { Button } from "../ui/button";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, AreaChart, Area
} from "recharts";

const revenueData = [
  { day: "Mon", gmv: 2840, orders: 18 },
  { day: "Tue", gmv: 3920, orders: 24 },
  { day: "Wed", gmv: 3150, orders: 20 },
  { day: "Thu", gmv: 4780, orders: 31 },
  { day: "Fri", gmv: 5210, orders: 35 },
  { day: "Sat", gmv: 6890, orders: 44 },
  { day: "Sun", gmv: 5940, orders: 38 },
];

const creditData = [
  { month: "Jan", earned: 4200, spent: 2100, expired: 380 },
  { month: "Feb", earned: 5600, spent: 3200, expired: 420 },
  { month: "Mar", earned: 6800, spent: 4100, expired: 310 },
  { month: "Apr", earned: 7200, spent: 4800, expired: 290 },
  { month: "May", earned: 8900, spent: 5900, expired: 410 },
  { month: "Jun", earned: 10200, spent: 7200, expired: 350 },
];

const topProducts = [
  { title: "BCA Vault — Complete Theory Bundle", revenue: 0, downloads: 0, rating: 0 },
];

const recentOrders = [
  { id: "ORD-8421", user: "Priya S.", product: "BCA Vault — Complete Theory Bundle", amount: 249, status: "paid", date: "Jun 3" },
  { id: "ORD-8420", user: "Rahul V.", product: "Algorithms and Program Design using C", amount: 49, status: "paid", date: "Jun 3" },
  { id: "ORD-8419", user: "Anjali P.", product: "Database Management Systems", amount: 49, status: "paid", date: "Jun 2" },
  { id: "ORD-8418", user: "Karan M.", product: "BCA Vault — Complete Theory Bundle", amount: 999, status: "paid", date: "Jun 2" },
  { id: "ORD-8417", user: "Sneha R.", product: "Previous Year Questions", amount: 39, status: "failed", date: "Jun 2" },
];

const adminNav = [
  { key: "overview", label: "Overview", icon: LayoutDashboard },
  { key: "products", label: "Products", icon: Package },
  { key: "orders", label: "Orders", icon: ShoppingCart },
  { key: "users", label: "Users", icon: Users },
  { key: "credits", label: "Credits", icon: Coins },
  { key: "analytics", label: "Analytics", icon: BarChart3 },
];

export function AdminPage() {
  const [activeTab, setActiveTab] = useState("overview");

  const kpis = [
    { label: "GMV Today", value: "₹5,940", change: "+12.4%", positive: true, icon: TrendingUp, color: "text-emerald-600", bg: "bg-emerald-50" },
    { label: "Orders Today", value: "38", change: "+8.6%", positive: true, icon: ShoppingCart, color: "text-blue-600", bg: "bg-blue-50" },
    { label: "Credits in Circulation", value: "48,200", change: "+5.2%", positive: true, icon: Coins, color: "text-amber-600", bg: "bg-amber-50" },
    { label: "Conversion Rate", value: "3.8%", change: "-0.4%", positive: false, icon: BarChart3, color: "text-indigo-600", bg: "bg-indigo-50" },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Admin Sidebar */}
      <aside className="hidden lg:flex w-56 shrink-0 flex-col bg-[#111827] sticky top-16 h-[calc(100vh-4rem)]">
        <div className="p-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#1E40AF] flex items-center justify-center">
              <LayoutDashboard className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-sm font-semibold text-white">Admin Panel</span>
          </div>
          <span className="text-xs text-gray-500 mt-1 block">BCA Vault v2.0</span>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {adminNav.map((item) => (
            <button
              key={item.key}
              onClick={() => setActiveTab(item.key)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors ${
                activeTab === item.key
                  ? 'bg-[#1E40AF] text-white'
                  : 'text-gray-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-white/10">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-[#1E40AF] flex items-center justify-center text-xs font-bold text-white">SA</div>
            <div>
              <p className="text-xs font-semibold text-white">Super Admin</p>
              <p className="text-xs text-gray-500">admin@bcavault.in</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 min-w-0 p-4 lg:p-8">
        {/* Mobile Nav */}
        <div className="flex gap-2 overflow-x-auto pb-4 mb-6 lg:hidden" style={{ scrollbarWidth: "none" }}>
          {adminNav.map((item) => (
            <button
              key={item.key}
              onClick={() => setActiveTab(item.key)}
              className={`shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium ${
                activeTab === item.key ? 'bg-[#1E40AF] text-white' : 'bg-white text-gray-600 border border-gray-200'
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
            <div className="mb-8 flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'var(--font-display)' }}>Dashboard Overview</h1>
                <p className="text-gray-500 text-sm mt-1">Thursday, June 4, 2026</p>
              </div>
              <Button size="sm" className="bg-[#1E40AF] hover:bg-[#1E3A8A] text-white">
                <Download className="w-4 h-4" /> Export Report
              </Button>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              {kpis.map((kpi) => (
                <div key={kpi.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div className={`w-9 h-9 rounded-xl ${kpi.bg} flex items-center justify-center`}>
                      <kpi.icon className={`w-4 h-4 ${kpi.color}`} />
                    </div>
                    <span className={`text-xs font-semibold flex items-center gap-0.5 ${kpi.positive ? 'text-emerald-600' : 'text-rose-500'}`}>
                      {kpi.positive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                      {kpi.change}
                    </span>
                  </div>
                  <p className="text-xl font-black text-gray-900 mb-0.5" style={{ fontFamily: 'var(--font-mono)' }}>{kpi.value}</p>
                  <p className="text-xs text-gray-500">{kpi.label}</p>
                </div>
              ))}
            </div>

            {/* Revenue Chart */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6">
              <h2 className="text-base font-bold text-gray-900 mb-5" style={{ fontFamily: 'var(--font-display)' }}>
                7-Day Revenue (GMV)
              </h2>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={revenueData}>
                  <defs>
                    <linearGradient id="gmvGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#1E40AF" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#1E40AF" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis dataKey="day" tick={{ fontSize: 12, fill: '#9ca3af' }} />
                  <YAxis tick={{ fontSize: 12, fill: '#9ca3af' }} tickFormatter={(v) => `₹${(v/1000).toFixed(1)}k`} />
                  <Tooltip formatter={(v: number) => [`₹${v.toLocaleString()}`, "GMV"]} />
                  <Area type="monotone" dataKey="gmv" stroke="#1E40AF" strokeWidth={2} fill="url(#gmvGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Bottom Row: Top Products + Recent Orders */}
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Top Products */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <h2 className="text-base font-bold text-gray-900 mb-5" style={{ fontFamily: 'var(--font-display)' }}>
                  Top Products by Revenue
                </h2>
                <div className="space-y-3">
                  {topProducts.map((product, i) => (
                    <div key={product.title} className="flex items-center gap-3">
                      <span className="text-sm font-black text-gray-300 w-5" style={{ fontFamily: 'var(--font-mono)' }}>{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">{product.title}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-gray-500">{product.downloads.toLocaleString()} downloads</span>
                          <span className="flex items-center gap-0.5 text-xs text-amber-600">
                            <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                            {product.rating}
                          </span>
                        </div>
                      </div>
                      <span className="text-sm font-bold text-gray-900" style={{ fontFamily: 'var(--font-mono)' }}>
                        ₹{(product.revenue / 1000).toFixed(1)}k
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recent Orders */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <h2 className="text-base font-bold text-gray-900 mb-5" style={{ fontFamily: 'var(--font-display)' }}>
                  Recent Orders
                </h2>
                <div className="space-y-3">
                  {recentOrders.map((order) => (
                    <div key={order.id} className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full shrink-0 ${order.status === 'paid' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">{order.user}</p>
                        <p className="text-xs text-gray-500 truncate">{order.product}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-bold text-gray-900" style={{ fontFamily: 'var(--font-mono)' }}>₹{order.amount}</p>
                        <p className="text-xs text-gray-400">{order.date}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Credits Admin Tab */}
        {activeTab === "credits" && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
            <h1 className="text-2xl font-bold text-gray-900 mb-8" style={{ fontFamily: 'var(--font-display)' }}>Credit Economy</h1>

            {/* Credit Health KPIs */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              {[
                { label: "Total in Circulation", value: "48,200", icon: Coins, color: "text-amber-600", bg: "bg-amber-50" },
                { label: "Daily Burn Rate", value: "1,240", icon: TrendingDown, color: "text-rose-500", bg: "bg-rose-50" },
                { label: "Top-up Revenue", value: "₹8,400", icon: TrendingUp, color: "text-emerald-600", bg: "bg-emerald-50" },
                { label: "Abuse Flags", value: "3", icon: AlertTriangle, color: "text-orange-500", bg: "bg-orange-50" },
              ].map((kpi) => (
                <div key={kpi.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                  <div className={`w-9 h-9 rounded-xl ${kpi.bg} flex items-center justify-center mb-3`}>
                    <kpi.icon className={`w-4 h-4 ${kpi.color}`} />
                  </div>
                  <p className="text-xl font-black text-gray-900 mb-0.5" style={{ fontFamily: 'var(--font-mono)' }}>{kpi.value}</p>
                  <p className="text-xs text-gray-500">{kpi.label}</p>
                </div>
              ))}
            </div>

            {/* Credit Economy Chart */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6">
              <h2 className="text-base font-bold text-gray-900 mb-5" style={{ fontFamily: 'var(--font-display)' }}>
                Credit Economy — Last 6 Months
              </h2>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={creditData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#9ca3af' }} />
                  <YAxis tick={{ fontSize: 12, fill: '#9ca3af' }} />
                  <Tooltip />
                  <Bar dataKey="earned" name="Earned" fill="#10B981" radius={[4,4,0,0]} />
                  <Bar dataKey="spent" name="Spent" fill="#1E40AF" radius={[4,4,0,0]} />
                  <Bar dataKey="expired" name="Expired" fill="#F59E0B" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Transaction Ledger */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-base font-bold text-gray-900" style={{ fontFamily: 'var(--font-display)' }}>Transaction Ledger</h2>
                <Button size="sm" variant="outline" className="gap-1.5">
                  <Filter className="w-3.5 h-3.5" /> Filter
                </Button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left text-xs font-semibold text-gray-500 pb-3 pr-4">User</th>
                      <th className="text-left text-xs font-semibold text-gray-500 pb-3 pr-4">Type</th>
                      <th className="text-left text-xs font-semibold text-gray-500 pb-3 pr-4">Amount</th>
                      <th className="text-left text-xs font-semibold text-gray-500 pb-3 pr-4">Reason</th>
                      <th className="text-left text-xs font-semibold text-gray-500 pb-3">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { user: "arjun@ex.com", type: "earn", amount: +50, reason: "signup", date: "Jun 3" },
                      { user: "priya@ex.com", type: "earn", amount: +100, reason: "referral", date: "May 30" },
                      { user: "rahul@ex.com", type: "spend", amount: -74, reason: "purchase", date: "May 28" },
                      { user: "anjali@ex.com", type: "earn", amount: +20, reason: "email_verify", date: "May 26" },
                      { user: "karan@ex.com", type: "topup", amount: +250, reason: "topup_pack", date: "May 24" },
                    ].map((row, i) => (
                      <tr key={i} className="border-b border-gray-100 last:border-0">
                        <td className="py-3 pr-4 text-gray-700">{row.user}</td>
                        <td className="py-3 pr-4">
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                            row.type === 'earn' ? 'bg-emerald-100 text-emerald-700' :
                            row.type === 'spend' ? 'bg-rose-100 text-rose-700' :
                            'bg-amber-100 text-amber-700'
                          }`}>
                            {row.type}
                          </span>
                        </td>
                        <td className="py-3 pr-4">
                          <span className={`font-bold ${row.amount > 0 ? 'text-emerald-600' : 'text-rose-500'}`} style={{ fontFamily: 'var(--font-mono)' }}>
                            {row.amount > 0 ? '+' : ''}{row.amount}
                          </span>
                        </td>
                        <td className="py-3 pr-4 text-gray-500">{row.reason}</td>
                        <td className="py-3 text-gray-500">{row.date}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}

        {/* Placeholder tabs */}
        {["products", "orders", "users", "analytics"].includes(activeTab) && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
            <div className="flex items-center justify-between mb-8">
              <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'var(--font-display)' }}>
                {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
              </h1>
              <Button size="sm" className="bg-[#1E40AF] hover:bg-[#1E3A8A] text-white">
                <Plus className="w-4 h-4" /> Add New
              </Button>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <div className="flex gap-3 mb-5">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input className="w-full h-9 pl-9 pr-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-[#1E40AF]" placeholder={`Search ${activeTab}...`} />
                </div>
                <Button size="sm" variant="outline" className="gap-1.5">
                  <Filter className="w-3.5 h-3.5" /> Filter
                </Button>
              </div>
              <p className="text-center text-gray-400 py-16">
                {activeTab === "products" ? "1,200 products in database" :
                 activeTab === "orders" ? "8,421 total orders" :
                 activeTab === "users" ? "2,400 registered users" :
                 "Revenue & conversion analytics"}
              </p>
            </div>
          </motion.div>
        )}
      </main>
    </div>
  );
}
