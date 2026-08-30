import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  X,
  Send,
  Bot,
  User,
  Loader2,
  ChevronDown,
  RotateCcw,
  Copy,
  Check,
  HelpCircle,
  MessageCircle,
  CreditCard,
  Phone,
  BookOpen,
  ShieldCheck,
} from "lucide-react";
import { supabaseUrl, publicAnonKey } from "@/lib/supabase/client";

interface Message {
  id: string;
  role: "user" | "model";
  content: string;
  timestamp: string;
}

const SUPPORT_PROMPTS = [
  {
    label: "📦 What's in the bundle?",
    icon: BookOpen,
    query: "What is included in the BCA Vault All-Access Bundle?",
  },
  {
    label: "💰 Pricing & Offers",
    icon: CreditCard,
    query: "What is the current price and are there any active coupon codes?",
  },
  {
    label: "💳 How to Pay",
    icon: ShieldCheck,
    query: "How do I make the payment and purchase the bundle?",
  },
  {
    label: "🔐 Get My Login",
    icon: HelpCircle,
    query: "How do I get my login credentials after purchasing?",
  },
  {
    label: "📞 Contact Support",
    icon: Phone,
    query: "How can I contact BCA Vault support?",
  },
];

export function PublicSupportChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize welcome message
  useEffect(() => {
    setMessages([
      {
        id: "welcome",
        role: "model",
        content: `👋 Hello! I'm the **BCA Vault Support Assistant**.\n\nI can help you with:\n- 📦 Bundle details & what's included\n- 💰 Pricing & coupon codes\n- 💳 Payment & purchase process\n- 🔐 Login & credential setup\n- 📞 Contact information\n- 🌐 Website navigation\n\nHow can I help you today?`,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
    ]);
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) scrollToBottom();
  }, [messages, isOpen]);

  const handleCopy = async (id: string, text: string) => {
    await navigator.clipboard.writeText(text).catch(() => undefined);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleClearChat = () => {
    setMessages([
      {
        id: `m-${Date.now()}`,
        role: "model",
        content: "Chat cleared! How can I help you with BCA Vault?",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
    ]);
  };

  async function handleSend(textToSend?: string) {
    const text = (textToSend || input).trim();
    if (!text || loading) return;

    const userMsg: Message = {
      id: `u-${Date.now()}`,
      role: "user",
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const history = messages.slice(-6).map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await fetch(`${supabaseUrl}/functions/v1/public-support-chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: publicAnonKey,
        },
        body: JSON.stringify({
          message: text,
          history,
        }),
      });

      const data = await res.json().catch(() => ({}));
      const reply =
        data?.reply ||
        "I'm having trouble connecting right now. Please try again or contact support at **bcavault07@gmail.com** or WhatsApp **+91 93263 42123**.";

      const botMsg: Message = {
        id: `m-${Date.now()}`,
        role: "model",
        content: reply,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch (err) {
      console.error("Support chat error:", err);
      const errMsg: Message = {
        id: `err-${Date.now()}`,
        role: "model",
        content:
          "Sorry, I encountered a connection issue. Please try again or contact support at **bcavault07@gmail.com**.",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  }

  return (
    <>
      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed bottom-5 right-5 sm:bottom-6 sm:right-6 z-50">
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="flex h-[520px] max-h-[85vh] w-[92vw] max-w-[400px] flex-col rounded-3xl border border-slate-200 bg-white shadow-2xl overflow-hidden sm:w-[400px]"
            >
              {/* Header — teal/green to distinguish from student AI */}
              <div className="flex items-center justify-between bg-gradient-to-r from-teal-600 via-emerald-600 to-teal-700 px-5 py-3.5 text-white shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="relative grid h-10 w-10 place-items-center rounded-2xl bg-white/15 backdrop-blur-md">
                    <MessageCircle className="h-5 w-5 text-emerald-200" />
                    <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-400 ring-2 ring-teal-700" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold leading-tight">
                      BCA Vault Support
                    </h3>
                    <p className="text-[11px] text-emerald-200">
                      Bundles • Pricing • Payments • Help
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={handleClearChat}
                    className="grid h-8 w-8 place-items-center rounded-xl bg-white/10 text-white/80 hover:bg-white/20 hover:text-white transition"
                    title="Clear conversation"
                    aria-label="Clear chat"
                  >
                    <RotateCcw className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="grid h-8 w-8 place-items-center rounded-xl bg-white/10 text-white/80 hover:bg-white/20 hover:text-white transition"
                    title="Close"
                    aria-label="Close chat"
                  >
                    <ChevronDown className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* Quick Support Prompts */}
              <div className="flex gap-2 overflow-x-auto border-b border-slate-100 bg-slate-50/90 px-4 py-2.5 scrollbar-none">
                {SUPPORT_PROMPTS.map((item, idx) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={idx}
                      onClick={() => void handleSend(item.query)}
                      className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold text-slate-700 hover:border-emerald-300 hover:bg-emerald-50/60 hover:text-emerald-700 transition shadow-2xs"
                    >
                      <Icon className="h-3 w-3 text-emerald-600" />
                      {item.label}
                    </button>
                  );
                })}
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-slate-50/40">
                {messages.map((m) => {
                  const isBot = m.role === "model";
                  return (
                    <div
                      key={m.id}
                      className={`flex items-end gap-2 ${isBot ? "justify-start" : "justify-end"}`}
                    >
                      {isBot && (
                        <div className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold">
                          <Bot className="h-4 w-4" />
                        </div>
                      )}
                      <div
                        className={`group relative max-w-[84%] rounded-2xl px-4 py-2.5 text-xs leading-relaxed shadow-sm ${
                          isBot
                            ? "bg-white text-slate-800 border border-slate-100 rounded-bl-sm"
                            : "bg-emerald-600 text-white rounded-br-sm"
                        }`}
                      >
                        <div className="whitespace-pre-wrap font-sans">{m.content}</div>

                        <div className="mt-1.5 flex items-center justify-between gap-2 border-t border-slate-100/40 pt-1">
                          <span
                            className={`text-[9px] ${
                              isBot ? "text-slate-400" : "text-emerald-200"
                            }`}
                          >
                            {m.timestamp}
                          </span>

                          {isBot && (
                            <button
                              onClick={() => handleCopy(m.id, m.content)}
                              className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-emerald-600 transition text-[10px] flex items-center gap-1"
                              title="Copy text"
                            >
                              {copiedId === m.id ? (
                                <>
                                  <Check className="h-3 w-3 text-emerald-600" />
                                  <span className="text-emerald-600">Copied</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="h-3 w-3" />
                                  <span>Copy</span>
                                </>
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                      {!isBot && (
                        <div className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-emerald-600 text-white text-xs">
                          <User className="h-3.5 w-3.5" />
                        </div>
                      )}
                    </div>
                  );
                })}

                {loading && (
                  <div className="flex items-center gap-2 text-slate-500 text-xs">
                    <div className="grid h-7 w-7 place-items-center rounded-full bg-emerald-100 text-emerald-700">
                      <Bot className="h-4 w-4" />
                    </div>
                    <div className="inline-flex items-center gap-1.5 rounded-2xl border border-slate-100 bg-white px-3.5 py-2 shadow-sm">
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-600" />
                      <span className="text-[11px] text-slate-500 font-medium">
                        Looking up your answer…
                      </span>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="border-t border-slate-200 bg-white p-3">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask about bundles, pricing, payments..."
                    className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:outline-none transition"
                  />
                  <button
                    onClick={() => void handleSend()}
                    disabled={!input.trim() || loading}
                    className="grid h-9 w-9 place-items-center rounded-xl bg-emerald-600 text-white shadow-sm hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-400 transition"
                    aria-label="Send message"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </div>
                <p className="mt-1.5 text-center text-[10px] text-slate-400">
                  BCA Vault Customer Support
                </p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Floating Support Button */}
      {!isOpen && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.2 }}
          className="fixed bottom-[74px] right-5 sm:bottom-[88px] sm:right-6 z-40"
        >
          <button
            onClick={() => setIsOpen(true)}
            aria-label="BCA Support"
            title="BCA Support"
            className="group relative flex h-12 w-12 sm:h-13 sm:w-13 md:h-14 md:w-14 items-center justify-center rounded-full bg-gradient-to-tr from-teal-600 via-emerald-500 to-emerald-600 text-white shadow-lg shadow-emerald-600/30 hover:from-teal-500 hover:via-emerald-400 hover:to-emerald-500 hover:shadow-xl hover:shadow-emerald-600/40 hover:scale-105 active:scale-95 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2"
          >
            <MessageCircle className="h-6 w-6 sm:h-7 sm:w-7" />
            <span className="sr-only">BCA Support</span>

            {/* Dot indicator */}
            <span className="absolute top-0.5 right-0.5 flex h-3 w-3">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-300 opacity-75" />
              <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-300 border-2 border-emerald-700" />
            </span>
          </button>
        </motion.div>
      )}
    </>
  );
}
