import { useNavigate } from "react-router";
import { motion } from "motion/react";
import { QrCode, CheckCircle, ArrowRight, ShieldCheck, Clock, BookOpen } from "lucide-react";
import { Button } from "../ui/button";

const steps = [
  { icon: BookOpen,     label: "Pick the Bundle",    desc: "Click Get Complete Bundle on the bundles page" },
  { icon: QrCode,       label: "Pay via UPI",         desc: "Scan the QR code or use UPI ID to pay ₹899" },
  { icon: CheckCircle,  label: "Submit Payment Evidence",  desc: "Enter your email, UPI ref, and upload screenshot" },
  { icon: ShieldCheck,  label: "Admin Verifies",      desc: "Our team verifies your payment within a few hours" },
  { icon: Clock,        label: "Access Granted",      desc: "Bundle appears in My Library within 24 hours" },
];

export function CreditSpotlight() {
  const navigate = useNavigate();

  return (
    <section className="py-20 bg-[#111827] relative overflow-hidden">
      <div className="absolute inset-0">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#1E40AF]/15 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-indigo-900/30 rounded-full blur-[100px]" />
      </div>

      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-14"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#1E40AF]/20 border border-[#1E40AF]/30 rounded-full mb-6">
            <ShieldCheck className="w-4 h-4 text-blue-400" />
            <span className="text-sm font-semibold text-blue-300">Simple Manual Payment — No Gateway</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-black text-white mb-4" style={{ fontFamily: "var(--font-display)" }}>
            How to Get Your Bundle
          </h2>
          <p className="text-gray-400 text-lg max-w-xl mx-auto">
            Pay via UPI, fill a quick form, and our admin will authorize your access within 24 hours.
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-12">
          {steps.map((step, i) => (
            <motion.div
              key={step.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="relative"
            >
              {i < steps.length - 1 && (
                <div className="hidden lg:block absolute top-7 left-full w-full h-px bg-gradient-to-r from-white/20 to-transparent z-0" />
              )}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-5 text-center relative z-10">
                <div className="w-10 h-10 rounded-full bg-[#1E40AF] flex items-center justify-center mx-auto mb-3">
                  <step.icon className="w-5 h-5 text-white" />
                </div>
                <p className="text-xs font-bold text-white/60 mb-1">{String(i + 1).padStart(2, "0")}</p>
                <p className="text-sm font-bold text-white mb-1.5" style={{ fontFamily: "var(--font-display)" }}>
                  {step.label}
                </p>
                <p className="text-xs text-gray-400 leading-relaxed">{step.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="text-center">
          <Button
            size="lg"
            className="bg-[#1E40AF] hover:bg-[#1E3A8A] text-white px-10 h-13 rounded-2xl"
            onClick={() => navigate("/bundles")}
          >
            Get Complete Bundle — ₹899
            <ArrowRight className="w-4 h-4" />
          </Button>
          <p className="text-gray-500 text-sm mt-3">No payment gateway · Manual UPI verification · 24h access</p>
        </div>
      </div>
    </section>
  );
}
