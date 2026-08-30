import { motion } from "motion/react";
import { MessageCircle, ExternalLink } from "lucide-react";

const WHATSAPP_NUMBER = "919326342123";
const WHATSAPP_URL = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
  "Hello BCA Vault team, I need help with study notes / payment verification."
)}`;

export function WhatsAppFloatingButton() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      className="fixed bottom-6 left-6 z-40"
    >
      <a
        href={WHATSAPP_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="group relative flex items-center gap-2 rounded-full bg-[#25D366] px-4 py-3 text-white shadow-xl shadow-green-600/30 hover:bg-[#20bd5a] hover:shadow-green-600/40 transition duration-200"
        title="Chat with BCA Vault on WhatsApp (+91 93263 42123)"
      >
        <MessageCircle className="h-5 w-5 fill-current" />
        <span className="text-xs font-bold tracking-wide hidden sm:inline">
          WhatsApp Support
        </span>
        <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-300" />
        </span>
      </a>
    </motion.div>
  );
}
