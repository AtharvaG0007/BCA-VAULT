import { motion } from "motion/react";
import { MessageCircle } from "lucide-react";

const WHATSAPP_NUMBER = "919326342123";
const WHATSAPP_URL = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
  "Hello BCA Vault team, I need help with study notes / payment verification."
)}`;

export function WhatsAppFloatingButton() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2 }}
      className="fixed bottom-5 right-5 sm:bottom-6 sm:right-6 z-40"
    >
      <a
        href={WHATSAPP_URL}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="WhatsApp Support"
        title="WhatsApp Support"
        className="group relative flex h-12 w-12 sm:h-13 sm:w-13 md:h-14 md:w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg shadow-green-600/30 hover:bg-[#20bd5a] hover:shadow-xl hover:shadow-green-600/40 hover:scale-105 active:scale-95 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-offset-2"
      >
        <MessageCircle className="h-6 w-6 sm:h-7 sm:w-7 fill-current" />
        <span className="sr-only">WhatsApp Support</span>

        {/* Online Indicator */}
        <span className="absolute top-0.5 right-0.5 flex h-3 w-3">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
          <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-200 border-2 border-[#25D366]" />
        </span>
      </a>
    </motion.div>
  );
}
