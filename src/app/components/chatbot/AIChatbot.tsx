import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  MessageSquare,
  X,
  Send,
  Sparkles,
  Bot,
  User,
  Loader2,
  ChevronDown,
  ExternalLink,
  BookOpen,
  CreditCard,
  Mail,
} from "lucide-react";
import { supabaseUrl, publicAnonKey } from "@/lib/supabase/client";

interface Message {
  id: string;
  role: "user" | "model";
  content: string;
  timestamp: string;
}

const QUICK_PROMPTS = [
  { label: "How to purchase bundles?", icon: CreditCard, query: "How do I purchase a course bundle on BCA Vault?" },
  { label: "Semester syllabus", icon: BookOpen, query: "What subjects and semesters are available on BCA Vault?" },
  { label: "Contact Support", icon: Mail, query: "How can I contact BCA Vault support team?" },
];

export function AIChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "model",
      content:
        "Hi there! 👋 I am the **BCA Vault AI Assistant**. How can I assist you with BCA study notes, PYQs, semester bundles, or payments today?",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

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

      const res = await fetch(`${supabaseUrl}/functions/v1/gemini-chat`, {
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
        "I'm currently unable to connect to the assistant server. Please check back shortly or email bcavault07@gmail.com for assistance.";

      const botMsg: Message = {
        id: `m-${Date.now()}`,
        role: "model",
        content: reply,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch (err) {
      console.error("Chatbot request error:", err);
      const errMsg: Message = {
        id: `err-${Date.now()}`,
        role: "model",
        content: "Sorry, I ran into a connection issue. You can reach out to our team at **bcavault07@gmail.com** for direct support.",
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
    <div className="fixed bottom-6 right-6 z-50">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="mb-4 flex h-[520px] w-[92vw] max-w-[390px] flex-col rounded-3xl border border-slate-200 bg-white shadow-2xl overflow-hidden sm:w-[380px]"
          >
            {/* Header */}
            <div className="flex items-center justify-between bg-gradient-to-r from-blue-700 via-indigo-700 to-indigo-800 px-5 py-4 text-white shadow-sm">
              <div className="flex items-center gap-3">
                <div className="relative grid h-10 w-10 place-items-center rounded-2xl bg-white/15 backdrop-blur-md">
                  <Sparkles className="h-5 w-5 text-amber-300" />
                  <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-400 ring-2 ring-indigo-900" />
                </div>
                <div>
                  <h3 className="text-sm font-bold leading-tight">BCA Vault AI</h3>
                  <p className="text-[11px] text-blue-200">BVDU & BCA Study Assistant</p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="grid h-8 w-8 place-items-center rounded-xl bg-white/10 text-white/80 hover:bg-white/20 hover:text-white transition"
                aria-label="Close chat"
              >
                <ChevronDown className="h-5 w-5" />
              </button>
            </div>

            {/* Quick action chips */}
            <div className="flex gap-2 overflow-x-auto border-b border-slate-100 bg-slate-50/80 px-4 py-2.5 scrollbar-none">
              {QUICK_PROMPTS.map((item, idx) => {
                const Icon = item.icon;
                return (
                  <button
                    key={idx}
                    onClick={() => void handleSend(item.query)}
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold text-slate-700 hover:border-indigo-300 hover:bg-indigo-50/50 hover:text-indigo-700 transition"
                  >
                    <Icon className="h-3 w-3 text-indigo-500" />
                    {item.label}
                  </button>
                );
              })}
            </div>

            {/* Messages body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-slate-50/40">
              {messages.map((m) => {
                const isBot = m.role === "model";
                return (
                  <div
                    key={m.id}
                    className={`flex items-end gap-2 ${isBot ? "justify-start" : "justify-end"}`}
                  >
                    {isBot && (
                      <div className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold">
                        <Bot className="h-4 w-4" />
                      </div>
                    )}
                    <div
                      className={`max-w-[82%] rounded-2xl px-4 py-2.5 text-xs leading-relaxed shadow-sm ${
                        isBot
                          ? "bg-white text-slate-800 border border-slate-100 rounded-bl-sm"
                          : "bg-indigo-600 text-white rounded-br-sm"
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{m.content}</p>
                      <span
                        className={`mt-1 block text-[9px] ${
                          isBot ? "text-slate-400" : "text-indigo-200 text-right"
                        }`}
                      >
                        {m.timestamp}
                      </span>
                    </div>
                    {!isBot && (
                      <div className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-indigo-600 text-white text-xs">
                        <User className="h-3.5 w-3.5" />
                      </div>
                    )}
                  </div>
                );
              })}

              {loading && (
                <div className="flex items-center gap-2 text-slate-500 text-xs">
                  <div className="grid h-7 w-7 place-items-center rounded-full bg-indigo-100 text-indigo-700">
                    <Bot className="h-4 w-4" />
                  </div>
                  <div className="inline-flex items-center gap-1.5 rounded-2xl border border-slate-100 bg-white px-3.5 py-2 shadow-sm">
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-indigo-600" />
                    <span className="text-[11px] text-slate-500 font-medium">Assistant is typing…</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input area */}
            <div className="border-t border-slate-200 bg-white p-3">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask a question about BCA notes, PYQs..."
                  className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none transition"
                />
                <button
                  onClick={() => void handleSend()}
                  disabled={!input.trim() || loading}
                  className="grid h-9 w-9 place-items-center rounded-xl bg-indigo-600 text-white shadow-sm hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-400 transition"
                  aria-label="Send message"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
              <p className="mt-1.5 text-center text-[10px] text-slate-400">
                Official BCA Vault Assistant • AI-generated responses
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating trigger button */}
      {!isOpen && (
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsOpen(true)}
          className="group relative flex items-center gap-2.5 rounded-full bg-gradient-to-r from-blue-700 via-indigo-600 to-indigo-700 px-4 py-3 text-white shadow-xl shadow-indigo-600/30 hover:shadow-indigo-600/40 transition"
        >
          <div className="relative">
            <Sparkles className="h-5 w-5 text-amber-300" />
            <span className="absolute -top-1 -right-1 flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-400" />
            </span>
          </div>
          <span className="text-xs font-bold tracking-wide">Ask BCA Assistant</span>
        </motion.button>
      )}
    </div>
  );
}
