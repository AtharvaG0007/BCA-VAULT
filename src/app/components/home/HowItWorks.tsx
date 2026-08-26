import { motion } from "motion/react";
import { BookOpen, QrCode, ClipboardList, BadgeCheck } from "lucide-react";

const steps = [
  {
    step: "01",
    icon: BookOpen,
    title: "Choose Your Bundle",
    description: "Visit the Bundles page and click Get Complete Bundle to start the purchase process.",
    iconBg: "bg-[#1E40AF]/10",
    iconColor: "text-[#1E40AF]",
  },
  {
    step: "02",
    icon: QrCode,
    title: "Pay via UPI",
    description: "Scan the QR code or copy the UPI ID. Pay exactly ₹899 and take a screenshot of the confirmation.",
    iconBg: "bg-[#4F46E5]/10",
    iconColor: "text-[#4F46E5]",
  },
  {
    step: "03",
    icon: ClipboardList,
    title: "Submit the Form",
    description: "Submit payment evidence in BCA Vault with your registered email, transaction ID, and payment screenshot.",
    iconBg: "bg-emerald-100",
    iconColor: "text-[#10B981]",
  },
  {
    step: "04",
    icon: BadgeCheck,
    title: "Get Access",
    description: "Our admin verifies your payment and authorizes your bundle. Access appears in My Library within 24 hours.",
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
          <p className="text-sm font-semibold text-[#4F46E5] uppercase tracking-wider mb-3">How It Works</p>
          <h2 className="text-3xl sm:text-4xl font-black text-[#111827] mb-4" style={{ fontFamily: "var(--font-display)" }}>
            From payment to access in 4 steps
          </h2>
          <p className="text-lg text-gray-500 max-w-xl mx-auto">
            Simple, manual, and transparent. No payment gateway complexity.
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
      </div>
    </section>
  );
}
