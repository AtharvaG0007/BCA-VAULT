import { useNavigate } from "react-router";
import { motion } from "motion/react";
import { ArrowRight, Star, Check, FileText, Shield, BookOpen, Zap, BadgeCheck, Sparkles } from "lucide-react";
import { Button } from "../ui/button";


export function Hero() {
  const navigate = useNavigate();

  return (
    <section className="relative overflow-hidden bg-white">
      {/* Gradient mesh background */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-blue-100/60 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-indigo-100/60 rounded-full blur-[100px]" />
        <div className="absolute top-1/2 left-0 w-[400px] h-[400px] bg-emerald-100/40 rounded-full blur-[100px]" />
        {/* Grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: "linear-gradient(#1E40AF 1px, transparent 1px), linear-gradient(90deg, #1E40AF 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left: Copy */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 border border-blue-100 mb-6">
              <Sparkles className="w-3.5 h-3.5 text-[#1E40AF]" />
              <span className="text-xs font-semibold text-[#1E40AF]">India's #1 BCA Study Marketplace</span>
            </div>

            <h1
              className="text-4xl sm:text-5xl lg:text-6xl font-bold text-[#111827] leading-[1.1] mb-6"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              Score Better.{" "}
              <span className="relative">
                <span className="text-[#1E40AF]">Study</span>
              </span>{" "}
              Smarter.
            </h1>

            <p className="text-lg text-[#6B7280] leading-relaxed mb-6 max-w-lg">
              Study smarter with the latest BCA syllabus. Complete theory-focused preparation for Semester 1 & Semester 2.
            </p>

            {/* Mini feature list */}
            <div className="flex flex-col gap-2 mb-8">
              {[
                "Theory Notes for Semester 1 & 2",
                "Previous Year Questions + PYQ Analysis",
                "Most Repeated Questions & Important Topics",
              ].map((f) => (
                <div key={f} className="flex items-center gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                    <Check className="w-3 h-3 text-emerald-600" />
                  </div>
                  <span className="text-sm text-gray-700">{f}</span>
                </div>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row gap-3 mb-10">
              <Button
                size="lg"
                className="bg-[#1E40AF] hover:bg-[#1E3A8A] text-white px-8 h-12 rounded-xl shadow-lg shadow-blue-200"
                onClick={() => navigate("/bundles")}
              >
                Get Complete Bundle — ₹899
                <ArrowRight className="w-4 h-4" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-gray-200 text-gray-700 hover:bg-gray-50 h-12 rounded-xl"
                onClick={() => navigate("/pricing")}
              >
                Learn More
              </Button>
            </div>

            {/* Trust Bar */}
            <div className="flex flex-wrap items-center gap-6 pt-6 border-t border-gray-100">
              <div className="flex items-center gap-2">
                <div className="flex">
                  {[1,2,3,4,5].map(i => (
                    <Star key={i} className="w-4 h-4 text-amber-400 fill-amber-400" />
                  ))}
                </div>
                <span className="text-sm font-semibold text-gray-700">4.9/5</span>
                <span className="text-sm text-gray-500">from 2,400+ students</span>
              </div>
              <div className="w-px h-5 bg-gray-200" />
              <div className="flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-[#1E40AF]" />
                <span className="text-sm font-semibold text-gray-700">1,200+</span>
                <span className="text-sm text-gray-500">notes</span>
              </div>
              <div className="w-px h-5 bg-gray-200" />
              <div className="flex items-center gap-1.5">
                <Shield className="w-4 h-4 text-[#10B981]" />
                <span className="text-sm text-gray-500">Secure downloads</span>
              </div>
            </div>
          </motion.div>

          {/* Right: Floating Cards */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="relative h-[460px] hidden lg:block"
          >
            {/* Center Hero Visual */}
            <div className="absolute inset-8 rounded-3xl bg-gradient-to-br from-[#1E40AF] to-[#4F46E5] shadow-2xl shadow-blue-300/40 overflow-hidden">
              <div className="absolute inset-0 opacity-10"
                style={{
                  backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)",
                  backgroundSize: "24px 24px",
                }}
              />
              <div className="flex flex-col items-center justify-center h-full text-white p-8 text-center">
                <div className="w-20 h-20 rounded-2xl bg-white/10 backdrop-blur-sm flex items-center justify-center mb-4 border border-white/20">
                  <BookOpen className="w-10 h-10 text-white" />
                </div>
                <p className="text-2xl font-bold mb-1" style={{ fontFamily: 'var(--font-display)' }}>BCA Vault</p>
                <p className="text-blue-200 text-sm mb-6">Your exam success partner</p>
                <div className="grid grid-cols-3 gap-4 w-full">
                  {[
                    { label: "Available Semesters", value: "2" },
                    { label: "Students", value: "2,400+" },
                    { label: "Downloads", value: "18K+" },
                  ].map((stat) => (
                    <div key={stat.label} className="bg-white/10 rounded-xl p-3">
                      <p className="text-lg font-bold" style={{ fontFamily: 'var(--font-mono)' }}>{stat.value}</p>
                      <p className="text-xs text-blue-200">{stat.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Floating Card 1 — Theory Notes */}
            <motion.div
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              className="absolute top-6 -left-6 bg-white rounded-2xl shadow-xl border border-gray-100 p-4 w-56"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                  <BookOpen className="w-5 h-5 text-[#1E40AF]" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">Complete Theory Notes</p>
                  <p className="text-xs text-gray-500">Semester 1 & 2 · Theory Only</p>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-3 h-3 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <span className="text-xs text-emerald-600 font-semibold">Included</span>
              </div>
            </motion.div>

            {/* Floating Card 2 — PYQ */}
            <motion.div
              animate={{ y: [0, 8, 0] }}
              transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
              className="absolute bottom-8 -right-6 bg-white rounded-2xl shadow-xl border border-gray-100 p-4 w-52"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-[#4F46E5]" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">PYQ Analysis</p>
                  <p className="text-xs text-gray-500">Most Repeated Questions</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center">
                  <Check className="w-3 h-3 text-emerald-600" />
                </div>
                <span className="text-xs text-gray-500">Inside the Bundle</span>
              </div>
            </motion.div>

            {/* Floating Card 3 — Access granted */}
            <motion.div
              animate={{ y: [0, -6, 0] }}
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
              className="absolute top-1/3 -right-8 bg-white rounded-2xl shadow-xl border border-gray-100 p-3 w-44"
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                  <BadgeCheck className="w-4 h-4 text-emerald-600" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-900">Access Granted!</p>
                  <p className="text-xs text-emerald-600 font-bold">Bundle Authorized</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-gray-400">
                <Zap className="w-3 h-3 text-amber-400" />
                Priya from Pune
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
