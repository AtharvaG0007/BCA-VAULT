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
  BookOpen,
  HelpCircle,
  RotateCcw,
  Copy,
  Check,
  GraduationCap,
  FileQuestion,
  Calendar,
  CheckCircle2,
  ExternalLink,
} from "lucide-react";
import { supabase, supabaseUrl, publicAnonKey } from "@/lib/supabase/client";
import { useAuth } from "../auth/AuthContext";

interface Message {
  id: string;
  role: "user" | "model";
  content: string;
  timestamp: string;
}

const LEARNING_PROMPTS = [
  {
    label: "💡 Explain Concept",
    icon: Sparkles,
    query: "Explain Pointers in C with a simple beginner-friendly example and real-world analogy.",
  },
  {
    label: "📝 Revision Summary",
    icon: BookOpen,
    query: "Give me a concise revision summary of Functions and Recursion in C.",
  },
  {
    label: "🎯 Quiz Me (MCQs)",
    icon: FileQuestion,
    query: "Start an interactive quiz for BCA Semester 1. Ask me Question 1 with 4 options.",
  },
  {
    label: "📋 Exam Questions",
    icon: CheckCircle2,
    query: "What are the most important 5-mark and 10-mark exam questions for Foundations of Computing?",
  },
  {
    label: "📅 7-Day Study Plan",
    icon: Calendar,
    query: "Create a realistic 7-day study plan to prepare for my BCA semester exams.",
  },
  {
    label: "📖 Syllabus Guide",
    icon: GraduationCap,
    query: "What is my complete BCA Semester 1 syllabus breakdown and core subjects?",
  },
];

export function StudentLearningChat() {
  const { user, appUser } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const studentName = appUser?.name || user?.user_metadata?.full_name || null;
  const semester = appUser?.semester || 1;

  // Initialize personalized welcome message
  useEffect(() => {
    if (!user) return; // Only show for authenticated students

    const welcomeText = studentName
      ? `Hello **${studentName}**! 🎓 Welcome to your **BCA Vault AI Learning Assistant**.\n\nI have access to your **BCA Semester ${semester}** curriculum and notes. I can help you with:\n- 💡 **Step-by-step topic explanations**\n- 📝 **Chapter summaries & revision**\n- 🎯 **Interactive practice quizzes**\n- 📋 **Exam-oriented answers & PYQ trends**\n- 📅 **Custom study plans**\n\nWhat would you like to learn or revise today?`
      : `Hi there! 🎓 I am the **BCA Vault AI Learning Assistant**.\n\nI can help you with BCA theory, programming concepts, DBMS, Web Tech, practice MCQs, and exam preparation.\n\nWhat would you like to learn?`;

    setMessages([
      {
        id: "welcome",
        role: "model",
        content: welcomeText,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
    ]);
  }, [studentName, semester, user]);

  // Clear conversation on logout
  useEffect(() => {
    if (!user) {
      setMessages([]);
      setIsOpen(false);
      setInput("");
    }
  }, [user]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const handleCopy = async (id: string, text: string) => {
    await navigator.clipboard.writeText(text).catch(() => undefined);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleClearChat = () => {
    const initialText = studentName
      ? `Chat cleared! How can I assist you with your **Semester ${semester}** studies?`
      : "Chat cleared! How can I assist you today?";
    setMessages([
      {
        id: `m-${Date.now()}`,
        role: "model",
        content: initialText,
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
      // Get current auth session — REQUIRED for student AI
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      if (!token) {
        const errMsg: Message = {
          id: `err-${Date.now()}`,
          role: "model",
          content: "You need to be logged in to use the AI Learning Assistant. Please refresh the page or log in again.",
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        };
        setMessages((prev) => [...prev, errMsg]);
        setLoading(false);
        return;
      }

      const history = messages.slice(-8).map((m) => ({
        role: m.role,
        content: m.content,
      }));

      // Call the STUDENT-SPECIFIC Edge Function
      const res = await fetch(`${supabaseUrl}/functions/v1/student-learning-chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: publicAnonKey,
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          message: text,
          history,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (res.status === 401) {
        const errMsg: Message = {
          id: `err-${Date.now()}`,
          role: "model",
          content: "Your session has expired. Please log in again to continue using the AI Learning Assistant.",
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        };
        setMessages((prev) => [...prev, errMsg]);
        setLoading(false);
        return;
      }

      if (res.status === 403) {
        const errMsg: Message = {
          id: `err-${Date.now()}`,
          role: "model",
          content: data?.error || "Your account does not have permission to access the AI assistant. Please contact support at bcavault07@gmail.com.",
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        };
        setMessages((prev) => [...prev, errMsg]);
        setLoading(false);
        return;
      }

      if (res.status === 429) {
        const errMsg: Message = {
          id: `err-${Date.now()}`,
          role: "model",
          content: "You've been asking a lot of questions! Please wait a few minutes before trying again. 😊",
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        };
        setMessages((prev) => [...prev, errMsg]);
        setLoading(false);
        return;
      }

      const reply =
        data?.reply ||
        "I'm currently unable to reach the AI engine. You can ask syllabus questions or contact support at **bcavault07@gmail.com**.";

      const botMsg: Message = {
        id: `m-${Date.now()}`,
        role: "model",
        content: reply,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch (err) {
      console.error("Student AI request error:", err);
      const errMsg: Message = {
        id: `err-${Date.now()}`,
        role: "model",
        content:
          "Sorry, I encountered a temporary connection issue. Please try again or reach out at **bcavault07@gmail.com**.",
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

  // Don't render if user is not authenticated
  if (!user) return null;

  return (
    <>
      {/* Floating Chat Window Modal */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed bottom-5 right-5 sm:bottom-6 sm:right-6 z-50">
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="flex h-[560px] max-h-[85vh] w-[92vw] max-w-[410px] flex-col rounded-3xl border border-slate-200 bg-white shadow-2xl overflow-hidden sm:w-[410px]"
            >
              {/* Header */}
              <div className="flex items-center justify-between bg-gradient-to-r from-blue-700 via-indigo-700 to-indigo-900 px-5 py-3.5 text-white shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="relative grid h-10 w-10 place-items-center rounded-2xl bg-white/15 backdrop-blur-md">
                    <Sparkles className="h-5 w-5 text-amber-300" />
                    <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-400 ring-2 ring-indigo-900" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold leading-tight flex items-center gap-1.5">
                      <span>AI Learning Assistant</span>
                    </h3>
                    <p className="text-[11px] text-blue-200">
                      {studentName ? `${studentName} • Sem ${semester}` : "BVDU BCA Study Companion"}
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
                    title="Close assistant"
                    aria-label="Close chat"
                  >
                    <ChevronDown className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* Quick Action Learning Mode Chips */}
              <div className="flex gap-2 overflow-x-auto border-b border-slate-100 bg-slate-50/90 px-4 py-2.5 scrollbar-none">
                {LEARNING_PROMPTS.map((item, idx) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={idx}
                      onClick={() => void handleSend(item.query)}
                      className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold text-slate-700 hover:border-indigo-300 hover:bg-indigo-50/60 hover:text-indigo-700 transition shadow-2xs"
                    >
                      <Icon className="h-3 w-3 text-indigo-600" />
                      {item.label}
                    </button>
                  );
                })}
              </div>

              {/* Messages Body */}
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
                        className={`group relative max-w-[84%] rounded-2xl px-4 py-2.5 text-xs leading-relaxed shadow-sm ${
                          isBot
                            ? "bg-white text-slate-800 border border-slate-100 rounded-bl-sm"
                            : "bg-indigo-600 text-white rounded-br-sm"
                        }`}
                      >
                        <div className="whitespace-pre-wrap font-sans">{m.content}</div>

                        <div className="mt-1.5 flex items-center justify-between gap-2 border-t border-slate-100/40 pt-1">
                          <span
                            className={`text-[9px] ${
                              isBot ? "text-slate-400" : "text-indigo-200"
                            }`}
                          >
                            {m.timestamp}
                          </span>

                          {isBot && (
                            <button
                              onClick={() => handleCopy(m.id, m.content)}
                              className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-indigo-600 transition text-[10px] flex items-center gap-1"
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
                      <span className="text-[11px] text-slate-500 font-medium">
                        AI is generating your explanation…
                      </span>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input Area */}
              <div className="border-t border-slate-200 bg-white p-3">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask a question, topic, code, or test request..."
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
                  BCA Vault AI Learning Assistant • Powered by Gemini AI
                </p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Circular Floating AI Tutor Button */}
      {!isOpen && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.2 }}
          className="fixed bottom-[74px] right-5 sm:bottom-[88px] sm:right-6 z-40"
        >
          <button
            onClick={() => setIsOpen(true)}
            aria-label="Ask AI Tutor"
            title="Ask AI Tutor"
            className="group relative flex h-12 w-12 sm:h-13 sm:w-13 md:h-14 md:w-14 items-center justify-center rounded-full bg-gradient-to-tr from-blue-700 via-indigo-600 to-indigo-800 text-white shadow-lg shadow-indigo-600/30 hover:from-blue-600 hover:via-indigo-500 hover:to-indigo-700 hover:shadow-xl hover:shadow-indigo-600/40 hover:scale-105 active:scale-95 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2"
          >
            <Sparkles className="h-6 w-6 sm:h-7 sm:w-7 text-amber-300" />
            <span className="sr-only">Ask AI Tutor</span>

            {/* Sparkle Badge Dot */}
            <span className="absolute top-0.5 right-0.5 flex h-3 w-3">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
              <span className="relative inline-flex h-3 w-3 rounded-full bg-amber-400 border-2 border-indigo-800" />
            </span>
          </button>
        </motion.div>
      )}
    </>
  );
}
