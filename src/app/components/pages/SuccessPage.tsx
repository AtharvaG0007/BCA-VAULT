import { motion } from "motion/react";
import { CheckCircle2, Mail, Phone, Clock, ArrowLeft } from "lucide-react";
import { Link } from "react-router";

const SUPPORT_EMAIL = "gogawaleatharva26@gmail.com";
const SUPPORT_PHONE = "9326342123";

export function SuccessPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50/30 to-teal-50/20 flex items-center justify-center px-4 py-16">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="bg-white rounded-3xl shadow-xl border border-gray-100 max-w-md w-full p-8 text-center"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 300 }}
          className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6"
        >
          <CheckCircle2 className="w-10 h-10 text-emerald-600" />
        </motion.div>

        <h1 className="text-2xl font-black text-gray-900 mb-3" style={{ fontFamily: "var(--font-display)" }}>
          Order Submitted!
        </h1>
        <p className="text-gray-500 text-sm mb-6 leading-relaxed">
          Thank you for your purchase. We have received your payment details and screenshot.
          Your study materials will be sent to you within <strong className="text-gray-800">24 hours</strong> via
          WhatsApp or Email.
        </p>

        <div className="bg-amber-50 border border-amber-100 rounded-2xl p-5 mb-6 text-left space-y-3">
          <div className="flex items-center gap-2 text-amber-800">
            <Clock className="w-4 h-4 shrink-0" />
            <span className="text-sm font-semibold">What happens next?</span>
          </div>
          {[
            "Our team will verify your payment screenshot (usually within a few hours)",
            "Once verified, you'll receive the Google Drive link on WhatsApp/Email",
            "The link will contain all study materials from your bundle",
          ].map((step, i) => (
            <div key={i} className="flex gap-2.5 text-sm text-amber-700">
              <span className="shrink-0 w-5 h-5 rounded-full bg-amber-200 text-amber-800 text-xs font-bold flex items-center justify-center mt-0.5">
                {i + 1}
              </span>
              {step}
            </div>
          ))}
        </div>

        <div className="space-y-2 mb-7">
          <p className="text-xs text-gray-500 font-semibold">Need help? Reach out to us:</p>
          <a
            href={`mailto:${SUPPORT_EMAIL}`}
            className="flex items-center justify-center gap-2 text-sm text-[#1E40AF] hover:underline"
          >
            <Mail className="w-4 h-4" /> {SUPPORT_EMAIL}
          </a>
          <a
            href={`tel:+91${SUPPORT_PHONE}`}
            className="flex items-center justify-center gap-2 text-sm text-[#1E40AF] hover:underline"
          >
            <Phone className="w-4 h-4" /> +91 {SUPPORT_PHONE}
          </a>
        </div>

        <Link
          to="/bundles"
          className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Bundles
        </Link>
      </motion.div>
    </div>
  );
}
