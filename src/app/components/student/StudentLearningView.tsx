import React, { useState, useRef, useEffect } from "react";
import {
  ArrowLeft,
  Award,
  Bot,
  Check,
  Code2,
  Copy,
  Database,
  FileQuestion,
  HelpCircle,
  Lightbulb,
  Loader2,
  RefreshCw,
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
  isStreaming?: boolean;
}

interface StudentLearningViewProps {
  onBackToDashboard: () => void;
}

const STARTER_PROMPTS = [
  {
    title: "Why use CSS when HTML exists?",
    subject: "Client-Side Web Tech",
    icon: Code2,
    prompt: "Why do we use CSS when HTML already exists? Explain the separation of structure vs styling with a simple analogy.",
  },
  {
    title: "Why does duplicate data cause problems?",
    subject: "DBMS Unit 1 & 3",
    icon: Database,
    prompt: "Why does duplicate data cause problems in database systems? Connect this to Data Redundancy and Normalization.",
  },
  {
    title: "Explain Pointers in C with memory diagram",
    subject: "C Programming",
    icon: Lightbulb,
    prompt: "Explain Pointers in C with a beginner-friendly real-world analogy, memory address concept, and code example.",
  },
  {
    title: "Most repeated 10-mark exam questions",
    subject: "Exam Preparation",
    icon: Award,
    prompt: "What are the most repeated 5-mark and 10-mark exam questions across BCA Semester 1 and Semester 2?",
  },
];

const QUICK_ACTIONS = [
  { label: "💡 Explain Simpler", promptSuffix: "Can you explain the previous concept in even simpler beginner terms with a real-life analogy?" },
  { label: "💻 Give Code Example", promptSuffix: "Please provide a complete, clean, commented code example for this concept." },
  { label: "📋 5-Mark Exam Format", promptSuffix: "Format this answer specifically as a standard 5-mark university exam answer with key points." },
  { label: "🎯 Quiz Me on This", promptSuffix: "Start an interactive quiz on this topic. Ask me Question 1 with 4 options (A, B, C, D)." },
  { label: "📝 Summarize in 3 Points", promptSuffix: "Summarize this entire topic into exactly 3 high-yield bullet points for quick revision." },
];

export function StudentLearningView({ onBackToDashboard }: StudentLearningViewProps) {
  const { user, appUser } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const studentName = appUser?.name || user?.user_metadata?.full_name || "Student";
  const semester = appUser?.semester || 1;

  // Auto-scroll logic
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  // Adjust textarea height automatically
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 140)}px`;
    }
  }, [input]);

  const handleCopy = async (id: string, text: string) => {
    await navigator.clipboard.writeText(text).catch(() => undefined);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleClearChat = () => {
    setMessages([]);
    setInput("");
  };

  const handleSelectStarter = (promptText: string) => {
    void handleSend(promptText);
  };

  const handleQuickAction = (actionPrompt: string) => {
    void handleSend(actionPrompt);
  };

  async function handleSend(customText?: string, isRegenerate = false) {
    const textToSend = (customText ?? input).trim();
    if (!textToSend || loading) return;

    let currentHistory = [...messages];

    if (isRegenerate) {
      // Remove last assistant message if regenerating
      if (currentHistory.length > 0 && currentHistory[currentHistory.length - 1].role === "model") {
        currentHistory.pop();
      }
    } else {
      const userMsg: Message = {
        id: `u-${Date.now()}`,
        role: "user",
        content: textToSend,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      currentHistory.push(userMsg);
      setMessages(currentHistory);
      setInput("");
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
    }

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

      const historyForApi = currentHistory.slice(-8).map((m) => ({
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
          message: textToSend,
          history: historyForApi,
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

      if (res.status === 403) {
        setMessages((prev) => [
          ...prev,
          {
            id: `err-${Date.now()}`,
            role: "model",
            content: data?.error || "Your account does not have permission to access the AI assistant. Please contact support at bcavault07@gmail.com.",
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
            content: "You've sent several requests in a short time. Please wait a moment before sending another question.",
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          },
        ]);
        return;
      }

      const fullReply =
        data?.reply ||
        "I am currently unable to reach the AI engine. You can ask syllabus questions or contact support at bcavault07@gmail.com.";

      // Progressive typing reveal for smooth conversational feel
      const botMsgId = `m-${Date.now()}`;
      const botMsg: Message = {
        id: botMsgId,
        role: "model",
        content: fullReply,
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

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  }

  const lastUserMessage = [...messages].reverse().find((m) => m.role === "user");

  return (
    <div className="flex flex-col h-full min-h-[calc(100vh-4rem)] bg-slate-50 text-slate-900">
      {/* ── Top Header ─────────────────────────────────────────────── */}
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur-md px-4 py-3 sm:px-6">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={onBackToDashboard}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition shadow-2xs"
              title="Return to Student Dashboard"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Back to Dashboard</span>
            </button>

            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-black text-slate-900 leading-tight">
                  BCA Vault AI Tutor
                </h2>
                <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Syllabus Aware
                </span>
              </div>
              <p className="text-[11px] text-slate-500 hidden sm:block">
                Concept breakdown • Code examples • PYQ & 5/10-mark exam answers
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleClearChat}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition shadow-2xs"
              title="Clear Conversation"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">New Topic</span>
            </button>
          </div>
        </div>
      </header>

      {/* ── Main Conversation Area ─────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-6">
        <div className="mx-auto max-w-4xl space-y-6">
          {/* Empty State */}
          {messages.length === 0 && (
            <div className="py-6 sm:py-10 text-center">
              <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-3xl bg-indigo-600 text-white shadow-lg shadow-indigo-600/30">
                <Sparkles className="h-7 w-7 text-amber-300" />
              </div>
              <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                How can I help your BCA studies today?
              </h3>
              <p className="mt-1 text-xs sm:text-sm font-semibold text-indigo-700">
                Trained on BCA Semester 1 & Semester 2 University Syllabus
              </p>
              <p className="mt-2 text-xs text-slate-500 max-w-lg mx-auto leading-relaxed">
                Ask about programming in C, Java, Python, DBMS normalization, operating systems, web technologies, or request 5-mark and 10-mark model answers.
              </p>

              {/* Starter Question Cards */}
              <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl mx-auto text-left">
                {STARTER_PROMPTS.map((item, idx) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={idx}
                      onClick={() => handleSelectStarter(item.prompt)}
                      className="group flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-2xs hover:border-indigo-400 hover:bg-indigo-50/40 hover:shadow-xs transition"
                    >
                      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition">
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-600 group-hover:bg-indigo-100 group-hover:text-indigo-800 transition">
                          {item.subject}
                        </span>
                        <p className="mt-1.5 text-xs font-bold text-slate-900 group-hover:text-indigo-900 transition leading-snug">
                          {item.title}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Messages Feed */}
          {messages.map((m, idx) => {
            const isBot = m.role === "model";
            const isLastBotMessage = isBot && idx === messages.length - 1;

            return (
              <div key={m.id} className="space-y-2">
                <div className={`flex items-start gap-3 ${isBot ? "justify-start" : "justify-end"}`}>
                  {isBot && (
                    <div className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-indigo-600 text-white text-xs font-bold shadow-xs mt-1">
                      <Bot className="h-4 w-4" />
                    </div>
                  )}

                  <div
                    className={`group relative max-w-2xl rounded-2xl p-4 sm:p-5 shadow-2xs ${
                      isBot
                        ? "bg-white text-slate-800 border border-slate-200 rounded-tl-sm w-full"
                        : "bg-indigo-600 text-white rounded-tr-sm"
                    }`}
                  >
                    {isBot ? (
                      <MarkdownMessage content={m.content} />
                    ) : (
                      <p className="text-xs sm:text-[13px] leading-relaxed whitespace-pre-wrap font-medium text-white">
                        {m.content}
                      </p>
                    )}

                    {/* Bottom Metadata & Response Controls */}
                    <div className="mt-3 flex items-center justify-between gap-3 border-t border-slate-100/60 pt-2 text-[10px]">
                      <span className={isBot ? "text-slate-400" : "text-indigo-200"}>
                        {m.timestamp}
                      </span>

                      {isBot && (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleCopy(m.id, m.content)}
                            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition"
                            title="Copy answer"
                          >
                            {copiedId === m.id ? (
                              <>
                                <Check className="h-3 w-3 text-emerald-600" />
                                <span className="text-emerald-600 font-bold">Copied</span>
                              </>
                            ) : (
                              <>
                                <Copy className="h-3 w-3" />
                                <span>Copy</span>
                              </>
                            )}
                          </button>

                          {isLastBotMessage && lastUserMessage && !loading && (
                            <button
                              onClick={() => void handleSend(lastUserMessage.content, true)}
                              className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-slate-500 hover:bg-slate-100 hover:text-indigo-600 transition"
                              title="Regenerate answer"
                            >
                              <RefreshCw className="h-3 w-3" />
                              <span>Regenerate</span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {!isBot && (
                    <div className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-slate-800 text-white text-xs font-bold shadow-xs mt-1">
                      <User className="h-4 w-4" />
                    </div>
                  )}
                </div>

                {/* Quick Follow-up Chips after the latest AI Response */}
                {isLastBotMessage && !loading && (
                  <div className="pl-11 pt-1 flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mr-1">
                      Next Step:
                    </span>
                    {QUICK_ACTIONS.map((action, actionIdx) => (
                      <button
                        key={actionIdx}
                        onClick={() => handleQuickAction(action.promptSuffix)}
                        className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:border-indigo-300 hover:bg-indigo-50/60 hover:text-indigo-800 transition shadow-2xs"
                      >
                        {action.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {/* Loading Indicator */}
          {loading && (
            <div className="flex items-start gap-3">
              <div className="grid h-8 w-8 place-items-center rounded-xl bg-indigo-600 text-white">
                <Bot className="h-4 w-4" />
              </div>
              <div className="inline-flex items-center gap-2.5 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-2xs">
                <Loader2 className="h-4 w-4 animate-spin text-indigo-600" />
                <span className="text-xs text-slate-600 font-semibold">
                  Analyzing syllabus and generating structured answer…
                </span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </main>

      {/* ── Fixed Chat Input Area ──────────────────────────────────── */}
      <footer className="sticky bottom-0 z-20 border-t border-slate-200 bg-white p-3 sm:p-4 shadow-lg">
        <div className="mx-auto max-w-4xl">
          <div className="flex items-end gap-2 rounded-2xl border border-slate-300 bg-slate-50/90 p-2 focus-within:border-indigo-600 focus-within:bg-white focus-within:ring-3 focus-within:ring-indigo-100 transition shadow-2xs">
            <textarea
              ref={textareaRef}
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything about your BCA subjects (e.g. pointers in C, normalization, OOP)..."
              className="flex-1 bg-transparent px-3 py-1.5 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none resize-none max-h-36 leading-relaxed"
            />
            <button
              onClick={() => void handleSend()}
              disabled={!input.trim() || loading}
              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl bg-indigo-600 px-4 text-xs font-bold text-white shadow-md shadow-indigo-600/20 hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none transition shrink-0"
              aria-label="Send prompt"
            >
              <Send className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Send</span>
            </button>
          </div>

          <div className="mt-2 flex items-center justify-between px-1 text-[10px] text-slate-400">
            <span>Press <strong>Enter</strong> to send, <strong>Shift + Enter</strong> for new line</span>
            <span className="hidden sm:inline">BCA Vault AI Academic Companion</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
