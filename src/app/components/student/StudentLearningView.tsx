import { useState, useRef, useEffect } from "react";
import {
  ArrowLeft,
  Bot,
  Check,
  Copy,
  FileQuestion,
  HelpCircle,
  Lightbulb,
  Loader2,
  RotateCcw,
  Send,
  Sparkles,
  User,
} from "lucide-react";
import { supabase, supabaseUrl, publicAnonKey } from "@/lib/supabase/client";
import { useAuth } from "../auth/AuthContext";
import { MarkdownMessage } from "./MarkdownMessage";

interface Message {
  id: string;
  role: "user" | "model";
  content: string;
  timestamp: string;
}

interface StudentLearningViewProps {
  onBackToDashboard: () => void;
}

const SUGGESTIONS = [
  {
    title: "Explain a concept",
    icon: Lightbulb,
    prompt: "Explain Pointers in C with a simple real-world analogy and beginner-friendly code example.",
  },
  {
    title: "Summarize a topic",
    icon: Sparkles,
    prompt: "Give me a concise revision summary of Functions and Recursion in C for exam prep.",
  },
  {
    title: "Give exam questions",
    icon: FileQuestion,
    prompt: "What are the most repeated 5-mark and 10-mark exam questions for Foundations of Computing?",
  },
  {
    title: "Test me",
    icon: HelpCircle,
    prompt: "Start an interactive quiz for BCA Semester 1. Ask me Question 1 with 4 options.",
  },
];

export function StudentLearningView({ onBackToDashboard }: StudentLearningViewProps) {
  const { user, appUser } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const studentName = appUser?.name || user?.user_metadata?.full_name || "Student";
  const semester = appUser?.semester || 1;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleCopy = async (id: string, text: string) => {
    await navigator.clipboard.writeText(text).catch(() => undefined);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleClearChat = () => {
    setMessages([]);
    setInput("");
  };

  const handleSuggestionClick = (promptText: string) => {
    setInput(promptText);
    inputRef.current?.focus();
  };

  async function handleSend(customText?: string) {
    const text = (customText ?? input).trim();
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
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;

      if (!token) {
        setMessages((prev) => [
          ...prev,
          {
            id: `err-${Date.now()}`,
            role: "model",
            content: "Authentication required. Please sign in again to chat with the AI assistant.",
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          },
        ]);
        setLoading(false);
        return;
      }

      const history = messages.slice(-8).map((m) => ({
        role: m.role,
        content: m.content,
      }));

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
        setMessages((prev) => [
          ...prev,
          {
            id: `err-${Date.now()}`,
            role: "model",
            content: "Your session has expired. Please sign in again to continue.",
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          },
        ]);
        return;
      }

      if (res.status === 429) {
        setMessages((prev) => [
          ...prev,
          {
            id: `err-${Date.now()}`,
            role: "model",
            content: "You have reached the rate limit. Please wait a moment before sending your next question.",
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          },
        ]);
        return;
      }

      const reply =
        data?.reply ||
        "I am currently unable to reach the AI engine. You can ask syllabus questions or contact support at bcavault07@gmail.com.";

      const botMsg: Message = {
        id: `m-${Date.now()}`,
        role: "model",
        content: reply,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch (err) {
      console.error("Student AI request error:", err);
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: "model",
          content: "Sorry, I encountered a temporary connection issue. Please try asking again.",
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
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
    <div className="flex flex-col h-full min-h-[calc(100vh-4rem)] bg-slate-50">
      {/* Top Header */}
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur-sm px-4 py-3 sm:px-6">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={onBackToDashboard}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
              title="Return to Student Dashboard"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Back to Dashboard</span>
            </button>

            <div>
              <h2 className="text-sm sm:text-base font-black text-slate-900 flex items-center gap-1.5">
                <span>BCA Vault AI Learning Assistant</span>
              </h2>
              <p className="text-[11px] text-slate-500 hidden sm:block">
                Ask questions. Understand concepts. Prepare better.
              </p>
            </div>
          </div>

          <button
            onClick={handleClearChat}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
            title="Clear Conversation"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Clear Chat</span>
          </button>
        </div>
      </header>

      {/* Main Conversation Scrollable Area */}
      <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-6">
        <div className="mx-auto max-w-4xl space-y-6">
          {/* Empty State */}
          {messages.length === 0 && (
            <div className="py-8 sm:py-12 text-center">
              <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-100 shadow-sm">
                <Sparkles className="h-7 w-7 text-indigo-600" />
              </div>
              <h3 className="text-xl font-black text-slate-900">BCA VAULT AI</h3>
              <p className="mt-1 text-sm font-semibold text-indigo-700">
                Your personal BCA learning assistant.
              </p>
              <p className="mt-2 text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                "Ask me to explain, compare, summarize or practise any BCA concept."
              </p>

              {/* 4 Compact Suggestion Buttons */}
              <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl mx-auto text-left">
                {SUGGESTIONS.map((item, idx) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={idx}
                      onClick={() => handleSuggestionClick(item.prompt)}
                      className="group flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-2xs hover:border-indigo-300 hover:bg-indigo-50/40 hover:shadow-xs transition"
                    >
                      <div className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition">
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-slate-900 group-hover:text-indigo-900 transition">
                          {item.title}
                        </p>
                        <p className="mt-0.5 text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                          {item.prompt}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Message List */}
          {messages.map((m) => {
            const isBot = m.role === "model";
            return (
              <div
                key={m.id}
                className={`flex items-start gap-3 ${isBot ? "justify-start" : "justify-end"}`}
              >
                {isBot && (
                  <div className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-indigo-100 text-indigo-700 text-xs font-bold mt-1">
                    <Bot className="h-4 w-4" />
                  </div>
                )}

                <div
                  className={`group relative max-w-2xl rounded-2xl p-4 shadow-2xs ${
                    isBot
                      ? "bg-white text-slate-800 border border-slate-200 rounded-tl-sm"
                      : "bg-indigo-600 text-white rounded-tr-sm"
                  }`}
                >
                  {isBot ? (
                    <MarkdownMessage content={m.content} />
                  ) : (
                    <p className="text-xs leading-relaxed whitespace-pre-wrap font-medium text-white">
                      {m.content}
                    </p>
                  )}

                  <div className="mt-3 flex items-center justify-between gap-3 border-t border-slate-100/60 pt-2 text-[10px]">
                    <span className={isBot ? "text-slate-400" : "text-indigo-200"}>
                      {m.timestamp}
                    </span>

                    {isBot && (
                      <button
                        onClick={() => handleCopy(m.id, m.content)}
                        className="inline-flex items-center gap-1 text-slate-400 hover:text-indigo-600 transition"
                        title="Copy message"
                      >
                        {copiedId === m.id ? (
                          <>
                            <Check className="h-3 w-3 text-emerald-600" />
                            <span className="text-emerald-600 font-semibold">Copied</span>
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
                  <div className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-indigo-600 text-white text-xs font-bold mt-1">
                    <User className="h-4 w-4" />
                  </div>
                )}
              </div>
            );
          })}

          {/* Loading Indicator */}
          {loading && (
            <div className="flex items-center gap-3">
              <div className="grid h-8 w-8 place-items-center rounded-xl bg-indigo-100 text-indigo-700">
                <Bot className="h-4 w-4" />
              </div>
              <div className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-2xs">
                <Loader2 className="h-4 w-4 animate-spin text-indigo-600" />
                <span className="text-xs text-slate-600 font-medium">
                  Explaining step-by-step for you…
                </span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </main>

      {/* Bottom Fixed Chat Input Bar */}
      <footer className="sticky bottom-0 z-20 border-t border-slate-200 bg-white p-3 sm:p-4">
        <div className="mx-auto max-w-4xl">
          <div className="flex items-center gap-2 rounded-2xl border border-slate-300 bg-slate-50/80 p-1.5 focus-within:border-indigo-500 focus-within:bg-white focus-within:ring-2 focus-within:ring-indigo-100 transition shadow-2xs">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything about your BCA subjects..."
              className="flex-1 bg-transparent px-3 py-2 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
            />
            <button
              onClick={() => void handleSend()}
              disabled={!input.trim() || loading}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-400 transition"
              aria-label="Send prompt"
            >
              <Send className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Send</span>
            </button>
          </div>
          <p className="mt-1.5 text-center text-[10px] text-slate-400">
            BCA Vault Academic AI • Tailored for BCA course concepts
          </p>
        </div>
      </footer>
    </div>
  );
}
