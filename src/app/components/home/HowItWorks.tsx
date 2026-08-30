import { motion } from "motion/react";
import { BookOpen, QrCode, ClipboardList, BadgeCheck, MessageCircle } from "lucide-react";

const steps = [
  {
    step: "01",
    icon: BookOpen,
    title: "Choose Your Bundle",
    description: "Select the BCA Vault theory bundle.",
    iconBg: "bg-[#1E40AF]/10",
    iconColor: "text-[#1E40AF]",
  },
  {
    step: "02",
    icon: QrCode,
    title: "Make Payment",
    description: "Pay using the official BCA Vault UPI option.",
    iconBg: "bg-[#4F46E5]/10",
    iconColor: "text-[#4F46E5]",
  },
  {
    step: "03",
    icon: ClipboardList,
    title: "Submit Payment Evidence",
    description: "Submit your UTR/transaction details and payment screenshot.",
    iconBg: "bg-emerald-100",
    iconColor: "text-[#10B981]",
  },
  {
    step: "04",
    icon: BadgeCheck,
    title: "Get Access",
    description: "After manual verification, your bundle appears in your Student Dashboard / My Library.",
    iconBg: "bg-amber-100",
    iconColor: "text-amber-600",
  },
];

export function HowItWorks() {
  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-14"
        >
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#4F46E5] mb-3">Simple 4-Step Process</p>
          <h2 className="text-3xl sm:text-4xl font-black text-[#111827] mb-4" style={{ fontFamily: "var(--font-display)" }}>
            How It Works
          </h2>
          <p className="text-base text-gray-500 max-w-xl mx-auto leading-relaxed">
            From payment to verified access in 4 clear, transparent steps.
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 relative">
          {/* Connector lines on desktop */}
          <div className="hidden lg:block absolute top-12 left-[25%] right-[25%] h-px bg-gradient-to-r from-[#1E40AF]/20 via-[#4F46E5]/30 to-emerald-300/20" />

          {steps.map((step, i) => (
            <motion.div
              key={step.step}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.12 }}
            >
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-7 hover:shadow-md transition-all hover:-translate-y-1 duration-300 h-full">
                <div className="flex items-start justify-between mb-6">
                  <div className={`w-14 h-14 rounded-2xl ${step.iconBg} flex items-center justify-center`}>
                    <step.icon className={`w-7 h-7 ${step.iconColor}`} />
                  </div>
                  <span className="text-5xl font-black text-gray-100" style={{ fontFamily: "var(--font-display)" }}>
                    {step.step}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2" style={{ fontFamily: "var(--font-display)" }}>
                  {step.title}
                </h3>
                <p className="text-gray-500 text-sm leading-relaxed">{step.description}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Support Help Line */}
        <div className="mt-12 text-center">
          <a
            href="https://wa.me/919326342123"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm font-semibold text-[#1E40AF] hover:text-[#1E3A8A] transition"
          >
            <MessageCircle className="w-4 h-4 text-[#25D366]" />
            Need help? Contact BCA Vault support on WhatsApp (+91 93263 42123)
          </a>
        </div>
      </div>
    </section>
  );
}
