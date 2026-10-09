import { Link, Navigate, useLocation, useParams, useSearchParams } from 'react-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Trophy,
  Timer,
  ShieldCheck,
  ArrowRight,
  WifiOff,
  CheckCircle2,
  XCircle,
  Sparkles,
  RotateCcw,
  BookOpen,
  Lock,
  ChevronRight,
  GraduationCap,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { Button } from '../ui/button';
import { quizCall, quizCta, type Competition, type QuizState } from '@/lib/supabase/quizService';
import {
  SEMESTER_1_QUESTION_BANK,
  type QuestionDefinition
} from '@/lib/quiz/semester1QuestionBank';

// ============================================================================
// PRACTICE QUESTION DEFINITIONS & SHUFFLE
// ============================================================================

export interface ShuffledPracticeQuestion {
  id: string;
  subject: string;
  difficulty: 'very_easy' | 'easy';
  question_text: string;
  options: string[];
  correct_index: number;
  marks: number;
}

const CORRECT_MESSAGES = [
  '🎉 Correct! Great job!',
  "🔥 Correct! You're doing great!",
  '🌟 Spot on! Excellent work!',
  '👏 Brilliant answer! Keep it going.'
];

const INCORRECT_MESSAGES = [
  'Nice try! Keep going 💪',
  'Not quite — keep going! 🚀',
  "Good attempt! Let's get the next one.",
  'Every mistake is a step forward! Keep learning 🌱'
];

function shufflePracticeQuestions(count = 15): ShuffledPracticeQuestion[] {
  const pool = [...SEMESTER_1_QUESTION_BANK];
  // Fisher-Yates shuffle
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }

  const selected = pool.slice(0, count);

  return selected.map((q, idx) => {
    const correctText = q.options[q.correct_index];
    const shuffledOpts = [...q.options];
    for (let i = shuffledOpts.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffledOpts[i], shuffledOpts[j]] = [shuffledOpts[j], shuffledOpts[i]];
    }
    const newCorrectIndex = shuffledOpts.indexOf(correctText);

    return {
      id: `practice-${idx}-${Date.now()}`,
      subject: q.subject,
      difficulty: q.difficulty,
      question_text: q.question_text,
      options: shuffledOpts,
      correct_index: newCorrectIndex,
      marks: q.marks
    };
  });
}

// ============================================================================
// QUIZ DISCOVERY BANNER (HomePage & StudentDashboard)
// ============================================================================

export function QuizDiscovery() {
  const { user } = useAuth();
  const [competition, setCompetition] = useState<Competition | null>(null);
  const [detail, setDetail] = useState<QuizState | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await quizCall<{ competitions: Competition[] }>('list');
        const comp = res.competitions?.[0] || null;
        if (!active) return;
        setCompetition(comp);
        if (comp && user) {
          try {
            const det = await quizCall<QuizState>('detail', { competition_id: comp.id });
            if (active) setDetail(det);
          } catch {
            // fallback for student profile not ready
          }
        }
      } catch {
        // silent fallback
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [user]);

  const compId = competition?.id;
  let ctaText = 'Take the Quiz';
  let ctaLink = compId ? `/app/quiz/${compId}` : '/app/quiz?mode=practice';
  let ctaVariant: 'default' | 'outline' = 'default';

  if (!competition) {
    ctaText = 'Start Practice Mode';
    ctaLink = '/app/quiz?mode=practice';
    ctaVariant = 'default';
  } else if (detail) {
    if (detail.winner) {
      ctaText = 'Claim ₹299 Offer';
      ctaLink = '/purchase?quizReward=1';
    } else if (detail.competition.status === 'RESULTS_PUBLISHED') {
      ctaText = 'Get Semester 1 Bundle · ₹349';
      ctaLink = '/purchase';
      ctaVariant = 'outline';
    } else if (detail.attempt) {
      ctaText = detail.attempt.status === 'ACTIVE' ? 'Resume Quiz' : 'View Submission';
      ctaLink = `/app/quiz/${compId}`;
    } else if (detail.competition.status === 'UNDER_REVIEW' || detail.competition.status === 'CLOSED') {
      ctaText = 'Results Under Review';
      ctaLink = `/app/quiz/${compId}`;
    } else if (['OPEN', 'LIVE'].includes(detail.competition.status)) {
      ctaText = 'Take the Quiz';
      ctaLink = `/app/quiz/${compId}`;
    } else if (detail.competition.status === 'UPCOMING') {
      ctaText = 'Coming Soon';
      ctaLink = `/app/quiz/${compId}`;
    }
  } else if (competition) {
    if (['OPEN', 'LIVE'].includes(competition.status)) {
      ctaText = 'Take the Quiz';
    } else if (competition.status === 'UPCOMING') {
      ctaText = 'Coming Soon';
    } else if (['CLOSED', 'UNDER_REVIEW'].includes(competition.status)) {
      ctaText = 'Results Under Review';
    } else if (competition.status === 'RESULTS_PUBLISHED') {
      ctaText = 'View Results';
    }
  }

  const questionCount = competition?.question_count ?? 20;
  const secondsEach = competition?.seconds_per_question ?? 20;

  return (
    <section className="relative overflow-hidden rounded-3xl border border-blue-200/80 bg-gradient-to-br from-white via-blue-50/40 to-indigo-50/50 p-6 sm:p-8 my-6 shadow-sm">
      <div className="absolute top-0 right-0 -mt-10 -mr-10 h-44 w-44 rounded-full bg-blue-500/10 blur-2xl pointer-events-none" />
      <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="space-y-3 max-w-2xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-100/70 px-3 py-1 text-xs font-bold text-[#1E40AF]">
            <Trophy className="h-4 w-4 text-amber-500" />
            <span>BCA Vault Quiz & Practice</span>
            {competition && (
              <span className="rounded-full bg-blue-200/80 px-2 py-0.5 text-[10px] uppercase font-extrabold text-blue-900">
                {competition.status.replace(/_/g, ' ')}
              </span>
            )}
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            {competition ? 'Test your Semester 1 knowledge.' : 'Practice your Semester 1 knowledge.'}
          </h2>
          <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
            {competition
              ? 'Practice with instant feedback to learn, or take the official timed challenge. Top 3 verified winners unlock the exclusive ₹299 bundle offer.'
              : 'Prepare and master Semester 1 concepts with instant answer feedback. New official competitions will be announced soon!'}
          </p>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 pt-1">
            <span className="rounded-xl border border-slate-200 bg-white/90 px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs">
              ⚡ {questionCount} Questions
            </span>
            <span className="rounded-xl border border-slate-200 bg-white/90 px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs">
              ⏱️ {secondsEach}s Official Timer
            </span>
            <span className="rounded-xl border border-emerald-300 bg-emerald-50/90 px-3 py-1.5 text-xs font-bold text-emerald-900 shadow-2xs">
              🎯 Instant Feedback Practice
            </span>
            <span className="rounded-xl border border-amber-300 bg-amber-50/90 px-3 py-1.5 text-xs font-bold text-amber-900 shadow-2xs">
              🏆 Top 3 Winners → ₹299
            </span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row lg:flex-col items-stretch sm:items-center lg:items-end gap-3 shrink-0">
          <Button
            asChild
            variant={ctaVariant}
            className={`min-h-12 px-6 rounded-xl font-bold shadow-sm transition text-base ${
              ctaVariant === 'default'
                ? 'bg-[#1E40AF] text-white hover:bg-[#1E3A8A]'
                : 'border-slate-300 bg-white text-slate-800 hover:bg-slate-50'
            }`}
          >
            <Link to={ctaLink} className="flex items-center justify-center gap-2">
              <span>{loading ? 'Take the Quiz' : ctaText}</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>

          <Button
            asChild
            variant="outline"
            className="min-h-10 px-5 rounded-xl font-bold border-blue-200 bg-white/90 hover:bg-blue-50 text-[#1E40AF] text-sm"
          >
            <Link to="/app/quiz?mode=practice" className="flex items-center justify-center gap-2">
              <Sparkles className="h-4 w-4 text-amber-500" />
              <span>Practice Mode (Instant Feedback)</span>
            </Link>
          </Button>

          <span className="text-[11px] text-slate-500 text-center lg:text-right font-medium">
            Fair server scoring · Anti-cheat verified
          </span>
        </div>
      </div>
    </section>
  );
}

// ============================================================================
// MAIN PAGE ROUTE
// ============================================================================

export function QuizPage() {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <div className="p-10" role="status">Loading your account…</div>;
  if (!user) return <Navigate to="/auth/login" state={{ from: location }} replace />;
  return <QuizContent key={user.id} />;
}

// ============================================================================
// QUIZ CONTENT CONTAINER (Handles Practice vs Competition Modes)
// ============================================================================

function QuizContent() {
  const { competitionId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeMode = searchParams.get('mode') === 'practice' ? 'PRACTICE' : 'COMPETITION';

  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [state, setState] = useState<QuizState | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [remaining, setRemaining] = useState(0);
  const [agreed, setAgreed] = useState(false);
  const [offline, setOffline] = useState(!navigator.onLine);
  const [loaded, setLoaded] = useState(false);

  // Competition mode selected option locking
  const [lockedOptionId, setLockedOptionId] = useState<string | null>(null);

  const requestInFlight = useRef(false);
  const lastRequestAt = useRef(0);
  const countdown = useRef({ at: 0, ms: 0 });
  const lastQuestion = useRef('');
  const active = state?.attempt?.status === 'ACTIVE';

  const setMode = (mode: 'PRACTICE' | 'COMPETITION') => {
    if (active) return; // Prevent switching out during an active competition attempt
    const next = new URLSearchParams(searchParams);
    if (mode === 'PRACTICE') {
      next.set('mode', 'practice');
    } else {
      next.delete('mode');
    }
    setSearchParams(next);
  };

  const refresh = useCallback(
    async (action = 'current', payload: Record<string, unknown> = {}) => {
      if (
        !competitionId ||
        requestInFlight.current ||
        (action === 'current' && performance.now() - lastRequestAt.current < 1000)
      )
        return;
      lastRequestAt.current = performance.now();
      requestInFlight.current = true;
      setBusy(true);
      const sent = performance.now();
      try {
        const next = await quizCall<QuizState>(action, {
          competition_id: competitionId,
          ...payload
        });
        if (next.current_question) {
          const ms = Math.max(
            0,
            Date.parse(next.current_question.deadline) -
              Date.parse(next.server_now) -
              (performance.now() - sent)
          );
          countdown.current = { at: performance.now(), ms };
          setRemaining(Math.ceil(ms / 1000));
        }
        // If question changed, reset locked option
        if (next.current_question?.id !== state?.current_question?.id) {
          setLockedOptionId(null);
        }
        setState(next);
        setError('');
        setLoaded(true);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Connection interrupted. The timer continues.');
      } finally {
        requestInFlight.current = false;
        setBusy(false);
      }
    },
    [competitionId, state?.current_question?.id]
  );

  useEffect(() => {
    if (competitionId) {
      void refresh('detail');
      return;
    }
    let cancelled = false;
    quizCall<{ competitions: Competition[] }>('list')
      .then((r) => {
        if (!cancelled) {
          setCompetitions(r.competitions);
          setLoaded(true);
        }
      })
      .catch((e) => {
        if (!cancelled) setError(e.message);
      });
    return () => {
      cancelled = true;
    };
  }, [competitionId, refresh]);

  useEffect(() => {
    if (!competitionId) return;
    const timer = setInterval(() => {
      if (!document.hidden && navigator.onLine) void refresh();
    }, active ? 2000 : 15000);
    return () => clearInterval(timer);
  }, [active, competitionId, refresh]);

  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => {
      const ms = countdown.current.ms - (performance.now() - countdown.current.at);
      setRemaining(Math.max(0, Math.ceil(ms / 1000)));
      if (ms <= 0 && navigator.onLine) void refresh();
    }, 150);
    return () => clearInterval(id);
  }, [active, refresh]);

  const event = useCallback(
    (event_type: string) => {
      if (!competitionId || !active) return;
      void quizCall('event', { competition_id: competitionId, event_type }).catch(() => undefined);
    },
    [competitionId, active]
  );

  useEffect(() => {
    const online = () => {
      setOffline(false);
      event('NETWORK_RECONNECT');
      void refresh();
    };
    const off = () => setOffline(true);
    window.addEventListener('online', online);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', online);
      window.removeEventListener('offline', off);
    };
  }, [event, refresh]);

  useEffect(() => {
    if (!active) return;
    const visible = () => {
      event(document.hidden ? 'TAB_HIDDEN' : 'TAB_VISIBLE');
      if (!document.hidden) void refresh();
    };
    const blur = () => event('WINDOW_BLUR');
    const focus = () => event('WINDOW_FOCUS');
    const full = () => event(document.fullscreenElement ? 'FULLSCREEN_ENTER' : 'FULLSCREEN_EXIT');
    const key = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && ['c', 'v', 'u', 's', 'p'].includes(e.key.toLowerCase())) {
        e.preventDefault();
        event('KEYBOARD_SHORTCUT_ATTEMPT');
      }
    };
    document.addEventListener('visibilitychange', visible);
    document.addEventListener('fullscreenchange', full);
    window.addEventListener('blur', blur);
    window.addEventListener('focus', focus);
    window.addEventListener('keydown', key);
    if (!lastQuestion.current) {
      event('PAGE_REFRESH');
      lastQuestion.current = state?.current_question?.id || 'resumed';
    }
    return () => {
      document.removeEventListener('visibilitychange', visible);
      document.removeEventListener('fullscreenchange', full);
      window.removeEventListener('blur', blur);
      window.removeEventListener('focus', focus);
      window.removeEventListener('keydown', key);
    };
  }, [active, event, refresh, state?.current_question?.id]);

  const startCompetition = () => {
    lastQuestion.current = 'started';
    void refresh('start');
  };

  const handleCompetitionAnswer = (questionId: string, optionId: string) => {
    if (lockedOptionId || busy || remaining === 0 || offline) return;
    // Immediately lock option on frontend to prevent double clicking
    setLockedOptionId(optionId);
    void refresh('answer', { question_id: questionId, option_id: optionId });
  };

  const c = state?.competition;
  const question = state?.current_question;

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 sm:py-10">
      <div className="mx-auto max-w-3xl">
        {/* Navigation Bar */}
        <header className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <Link
            to="/app/dashboard"
            className="text-sm font-semibold text-[#1E40AF] hover:underline inline-flex items-center gap-1"
          >
            ← Dashboard
          </Link>

          {/* Mode Switcher Tabs */}
          {!active && (
            <div className="inline-flex rounded-xl bg-slate-200/80 p-1 border border-slate-300/80 shadow-2xs">
              <button
                type="button"
                onClick={() => setMode('PRACTICE')}
                className={`flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-bold transition ${
                  activeMode === 'PRACTICE'
                    ? 'bg-white text-[#1E40AF] shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                <span>Practice Mode (Instant Feedback)</span>
              </button>
              <button
                type="button"
                onClick={() => setMode('COMPETITION')}
                className={`flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-bold transition ${
                  activeMode === 'COMPETITION'
                    ? 'bg-white text-[#1E40AF] shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Trophy className="h-3.5 w-3.5 text-amber-600" />
                <span>Official Competition</span>
              </button>
            </div>
          )}
        </header>

        {offline && (
          <p
            role="alert"
            className="mb-4 rounded-xl bg-amber-50 border border-amber-200 p-4 text-amber-900 flex items-center gap-2"
          >
            <WifiOff className="h-5 w-5 shrink-0" />
            <span>You are offline. The timer continues; reconnect to resume.</span>
          </p>
        )}

        {error && (!competitionId || state) && (
          <div
            role="alert"
            className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-red-900 flex items-center justify-between"
          >
            <span>{error}</span>
            <button
              className="underline font-semibold text-sm ml-3"
              onClick={() => (competitionId ? void refresh('detail') : window.location.reload())}
            >
              Retry
            </button>
          </div>
        )}

        {/* ── PRACTICE / TEST MODE ────────────────────────────────────────── */}
        {activeMode === 'PRACTICE' && !active && (
          <PracticeQuizView onSwitchToCompetition={() => setMode('COMPETITION')} />
        )}

        {/* ── COMPETITION MODE ────────────────────────────────────────────── */}
        {activeMode === 'COMPETITION' && (
          <>
            {!competitionId && (
              <>
                <h1 className="text-3xl font-bold text-slate-900">Your next challenge</h1>
                <p className="mt-3 mb-6 text-slate-600">
                  Test what you know. Every competition has a balanced question set and independently reviewed results.
                </p>
                {!loaded && !error && <p role="status">Loading competitions…</p>}
                {loaded && competitions.length === 0 && (
                  <div className="bg-white border rounded-2xl p-8">
                    <h2 className="text-xl font-bold">Coming soon</h2>
                    <p className="mt-2 text-slate-600">
                      The next competition is being prepared. Check back here for the opening date.
                    </p>
                  </div>
                )}
                {competitions.map((item) => (
                  <CompetitionCard key={item.id} competition={item} />
                ))}
              </>
            )}

            {competitionId && !state && !error && <p role="status">Loading competition…</p>}

            {/* DELETED OR UNAVAILABLE QUIZ FALLBACK CARD (CHUNK 4 & 7) */}
            {competitionId && !state && error && (
              <div className="rounded-3xl border border-slate-200 bg-white p-8 sm:p-12 text-center max-w-lg mx-auto shadow-sm my-8">
                <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-amber-50 text-amber-600 border border-amber-200 mb-4">
                  <AlertCircle className="h-8 w-8" />
                </div>
                <h2 className="text-2xl font-bold text-slate-900">Quiz Unavailable</h2>
                <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                  This quiz competition is no longer available or has been removed. You can practice with semester questions or check back for upcoming competitions.
                </p>
                <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
                  <Button asChild className="bg-[#1E40AF] hover:bg-blue-800 text-white font-bold w-full sm:w-auto min-h-11 px-5">
                    <Link to="/app/quiz?mode=practice">
                      <Sparkles className="h-4 w-4 mr-1.5 text-amber-400" /> Start Practice Mode
                    </Link>
                  </Button>
                  <Button asChild variant="outline" className="border-slate-300 text-slate-700 w-full sm:w-auto min-h-11 px-5">
                    <Link to="/app/quiz">View Quizzes</Link>
                  </Button>
                </div>
              </div>
            )}

            {c && state && (
              <>
                {!active && (
                  <div className="mb-6">
                    <span className="rounded-full bg-blue-100 text-blue-900 px-3 py-1 text-xs font-bold">
                      {c.status.replace(/_/g, ' ')}
                    </span>
                    <h1 className="mt-4 text-3xl font-bold text-slate-900">{c.title}</h1>
                    <p className="mt-3 text-slate-600">{c.description}</p>
                    <p className="mt-3 text-sm text-slate-500">
                      {c.participants ?? 0} participants · {c.active ?? 0} currently active
                    </p>
                  </div>
                )}

                {/* Competition Intro & Rules (before start) */}
                {!state.attempt && (
                  <section className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm">
                    <div className="grid grid-cols-3 gap-3 border-b pb-6 text-center">
                      {[
                        [c.question_count, 'Questions'],
                        [`${c.seconds_per_question}s`, 'Each question'],
                        ['1', 'Attempt']
                      ].map(([value, label]) => (
                        <div key={label}>
                          <strong className="block text-2xl text-[#1E40AF]">{value}</strong>
                          <span className="text-xs text-slate-600">{label}</span>
                        </div>
                      ))}
                    </div>

                    <div className="my-6 rounded-xl border border-amber-200 bg-amber-50/70 p-4">
                      <div className="flex items-center gap-2 text-sm font-bold text-amber-900">
                        <Sparkles className="h-4 w-4 text-amber-600 shrink-0" />
                        <span>Want to practice first?</span>
                      </div>
                      <p className="mt-1 text-xs text-amber-800">
                        The official competition allows only <strong>1 attempt</strong>. Take Practice Mode to test questions with instant answer feedback without affecting your official attempt.
                      </p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setMode('PRACTICE')}
                        className="mt-3 text-xs bg-white text-amber-900 border-amber-300 font-bold hover:bg-amber-100"
                      >
                        Start Practice Mode →
                      </Button>
                    </div>

                    <h2 className="font-bold text-lg mt-4 mb-3">Official Competition Rules</h2>
                    <ul className="list-disc pl-5 space-y-2 text-sm leading-relaxed text-slate-600">
                      <li>One question at a time. Choosing an answer locks it and records it server-side.</li>
                      <li>
                        <strong>Competition Security:</strong> Correct answers and live scores are never exposed during the competition to ensure fairness.
                      </li>
                      <li>You cannot go back. Unanswered questions time out automatically.</li>
                      <li>
                        The {c.question_count * c.seconds_per_question}-second maximum timer continues strictly through refreshes and network interruptions.
                      </li>
                      <li>Tab switches and copy attempts are logged for administrator review.</li>
                      <li>Final scores and verified Top 3 winners are published after official review.</li>
                    </ul>

                    <p className="mt-5 text-sm font-medium text-slate-800">
                      🏆 Top 3 verified winners: ₹299 Semester 1 offer. Regular bundle: ₹349.
                    </p>

                    {c.start_at && (
                      <p className="mt-3 text-sm text-slate-500">
                        Opens {new Date(c.start_at).toLocaleString('en-IN')} · closes{' '}
                        {c.end_at ? new Date(c.end_at).toLocaleString('en-IN') : '—'}
                      </p>
                    )}

                    <label className="flex items-start gap-3 mt-6 text-sm text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        className="mt-1 h-5 w-5 rounded border-slate-300"
                        checked={agreed}
                        onChange={(e) => setAgreed(e.target.checked)}
                      />
                      <span>I understand the competition rules and am ready for my only official attempt.</span>
                    </label>

                    <Button
                      className="mt-5 min-h-12 w-full bg-[#1E40AF] text-white font-bold"
                      disabled={!agreed || busy || offline || !['OPEN', 'LIVE'].includes(c.status)}
                      onClick={startCompetition}
                    >
                      {busy ? 'Starting…' : quizCta(state)}
                    </Button>
                  </section>
                )}

                {/* Competition Active Question */}
                {active && question && (
                  <section
                    className="select-none rounded-2xl border bg-white p-5 sm:p-8 shadow-sm"
                    onCopy={(e) => {
                      e.preventDefault();
                      event('COPY_ATTEMPT');
                    }}
                    onPaste={(e) => {
                      e.preventDefault();
                      event('PASTE_ATTEMPT');
                    }}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      event('CONTEXT_MENU_ATTEMPT');
                    }}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-2">
                        <span className="rounded-full bg-blue-100 text-[#1E40AF] px-2.5 py-0.5 text-[11px] font-extrabold uppercase tracking-wider">
                          Competition Mode
                        </span>
                        <span className="text-sm font-semibold text-slate-600">
                          Question {question.position} of {c.question_count}
                        </span>
                      </div>

                      <span
                        role="timer"
                        aria-label={`${remaining} seconds remaining`}
                        className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xl font-bold tabular-nums ${
                          remaining <= 3 ? 'bg-red-50 text-red-800' : 'bg-blue-50 text-[#1E40AF]'
                        }`}
                      >
                        <Timer className="h-5 w-5" />
                        {remaining}s
                      </span>
                    </div>

                    <div
                      className="flex gap-2 mt-5"
                      aria-label={`Progress ${question.position} of ${c.question_count}`}
                    >
                      {Array.from({ length: c.question_count }, (_, i) => (
                        <span
                          key={i}
                          className={`h-1.5 flex-1 rounded-full ${
                            i < question.position ? 'bg-[#1E40AF]' : 'bg-slate-100'
                          }`}
                        />
                      ))}
                    </div>

                    <h1
                      className="text-xl sm:text-2xl font-bold text-slate-900 leading-relaxed my-8"
                      aria-live="polite"
                    >
                      {question.question_text}
                    </h1>

                    <div className="space-y-3">
                      {question.options.map((option, i) => {
                        const isSelected = lockedOptionId === option.id;
                        const isLocked = Boolean(lockedOptionId);

                        let cardStyle =
                          'border-slate-200 bg-white text-slate-800 hover:border-blue-500 hover:bg-blue-50/60';

                        if (isSelected) {
                          cardStyle = 'border-2 border-[#1E40AF] bg-blue-50/80 text-blue-950 font-semibold shadow-xs';
                        } else if (isLocked) {
                          cardStyle = 'border-slate-200 bg-slate-50/60 text-slate-400 opacity-60 cursor-not-allowed';
                        }

                        return (
                          <button
                            key={option.id}
                            disabled={busy || remaining === 0 || offline || isLocked}
                            onClick={() => handleCompetitionAnswer(question.id, option.id)}
                            className={`flex w-full items-center justify-between gap-4 rounded-xl border p-4 min-h-16 text-left transition focus-visible:outline-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed ${cardStyle}`}
                          >
                            <div className="flex items-center gap-3 sm:gap-4">
                              <span
                                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm font-bold ${
                                  isSelected ? 'bg-[#1E40AF] text-white' : 'bg-slate-100 text-slate-700'
                                }`}
                              >
                                {String.fromCharCode(65 + i)}
                              </span>
                              <span className="text-sm sm:text-base leading-snug">{option.text}</span>
                            </div>

                            {isSelected && (
                              <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 text-[#1E40AF] px-2.5 py-1 text-xs font-bold shrink-0">
                                <Lock className="h-3 w-3" />
                                <span>Locked</span>
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>

                    <p className="mt-5 text-xs text-slate-500" role="status">
                      {remaining === 0
                        ? 'Time is up. Loading the next question…'
                        : lockedOptionId
                          ? '✓ Answer recorded! Advancing under the competition timer…'
                          : busy
                            ? 'Saving your answer…'
                            : 'Choose carefully. Your first answer is immediately locked and recorded.'}
                    </p>

                    <button
                      className="mt-4 text-xs text-slate-500 underline"
                      onClick={() => {
                        if (!document.fullscreenElement)
                          void document.documentElement.requestFullscreen?.().catch(() => undefined);
                      }}
                    >
                      Enter fullscreen (optional)
                    </button>
                  </section>
                )}

                {/* Competition Completed / Results */}
                {state.attempt && !active && (
                  <section className="rounded-2xl border bg-white p-6 sm:p-8 shadow-sm">
                    <ShieldCheck className="h-10 w-10 text-emerald-600" />
                    <h2 className="mt-4 text-2xl font-bold">
                      {state.result ? 'Your results' : 'Quiz submitted'}
                    </h2>
                    {!state.result ? (
                      <p className="mt-3 text-slate-600 leading-relaxed">
                        Your attempt has been recorded. Final results and Top 3 winners will be announced after the competition closes and human review is complete.
                      </p>
                    ) : (
                      <>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 my-6">
                          {[
                            [`${state.result.score}/${state.result.total_marks}`, 'Score'],
                            [state.result.correct, 'Correct'],
                            [state.result.incorrect, 'Incorrect'],
                            [state.result.timeouts, 'Timed out']
                          ].map(([v, l]) => (
                            <div key={l} className="rounded-xl bg-slate-50 p-4">
                              <strong className="block text-2xl text-slate-900">{v}</strong>
                              <span className="text-xs text-slate-600">{l}</span>
                            </div>
                          ))}
                        </div>
                        <p className="text-sm text-slate-600">
                          Completion time: {(state.result.completion_ms / 1000).toFixed(2)} seconds.
                        </p>
                        {state.winner ? (
                          <div className="mt-6 rounded-xl bg-amber-50 border border-amber-200 p-5">
                            <h3 className="font-bold text-amber-900 text-lg">
                              🏆 Top 3 Winner · Place {state.winner.rank}
                            </h3>
                            <p className="mt-2 text-sm text-amber-900">
                              Congratulations! Your account has unlocked the exclusive ₹299 Semester 1 offer.
                            </p>
                            <Button asChild className="mt-4 bg-[#1E40AF] text-white font-bold">
                              <Link to="/purchase?quizReward=1">Claim ₹299 Offer</Link>
                            </Button>
                          </div>
                        ) : (
                          <div className="mt-6 border-t pt-5">
                            <p className="text-slate-700">
                              Thank you for taking part. Keep building your Semester 1 knowledge.
                            </p>
                            <Button asChild variant="outline" className="mt-4 min-h-12 font-bold">
                              <Link to="/purchase">Get Semester 1 Bundle · ₹349</Link>
                            </Button>
                          </div>
                        )}
                      </>
                    )}
                  </section>
                )}
              </>
            )}
          </>
        )}

        <p className="mt-8 text-xs leading-relaxed text-slate-500">
          Browser-based anti-cheat uses layered deterrence and detection. It is not an absolute guarantee against cheating. Activity signals support human review.
        </p>
      </div>
    </main>
  );
}

// ============================================================================
// PRACTICE / TEST MODE COMPONENT (INSTANT FEEDBACK EXPERIENCE)
// ============================================================================

function PracticeQuizView({
  onSwitchToCompetition
}: {
  onSwitchToCompetition: () => void;
}) {
  const [phase, setPhase] = useState<'SETUP' | 'ACTIVE' | 'SUMMARY'>('SETUP');
  const [questionCount, setQuestionCount] = useState<10 | 15 | 20>(15);
  const [timerSetting, setTimerSetting] = useState<'untimed' | 15 | 20 | 30>('untimed');

  const [questions, setQuestions] = useState<ShuffledPracticeQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isEvaluated, setIsEvaluated] = useState(false);
  const [score, setScore] = useState(0);
  const [encouragingMsg, setEncouragingMsg] = useState('');
  const [remainingSeconds, setRemainingSeconds] = useState(20);
  const [stats, setStats] = useState<{ correct: number; incorrect: number; timedOut: number }>({
    correct: 0,
    incorrect: 0,
    timedOut: 0
  });

  const continueButtonRef = useRef<HTMLButtonElement | null>(null);

  // Initialize fresh practice quiz
  const startPractice = () => {
    const fresh = shufflePracticeQuestions(questionCount);
    setQuestions(fresh);
    setCurrentIndex(0);
    setSelectedOption(null);
    setIsEvaluated(false);
    setScore(0);
    setEncouragingMsg('');
    setStats({ correct: 0, incorrect: 0, timedOut: 0 });
    if (timerSetting !== 'untimed') {
      setRemainingSeconds(timerSetting);
    }
    setPhase('ACTIVE');
  };

  const currentQ = questions[currentIndex];

  // Timer countdown during active practice question
  useEffect(() => {
    if (phase !== 'ACTIVE' || isEvaluated || timerSetting === 'untimed') return;

    const interval = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          // Auto evaluate timeout
          handleTimeout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [phase, isEvaluated, timerSetting, currentIndex]);

  const handleTimeout = () => {
    if (isEvaluated) return;
    setIsEvaluated(true);
    setSelectedOption(-1); // -1 indicates timed out
    setEncouragingMsg("Time's up! Check the correct answer above. Let's keep going!");
    setStats((s) => ({ ...s, timedOut: s.timedOut + 1 }));
  };

  // Evaluate selected answer immediately
  const handleSelectAnswer = (optionIdx: number) => {
    if (isEvaluated || !currentQ) return;

    setSelectedOption(optionIdx);
    setIsEvaluated(true);

    const isCorrect = optionIdx === currentQ.correct_index;

    if (isCorrect) {
      setScore((s) => s + 1);
      setStats((s) => ({ ...s, correct: s.correct + 1 }));
      const msg = CORRECT_MESSAGES[Math.floor(Math.random() * CORRECT_MESSAGES.length)];
      setEncouragingMsg(msg);
    } else {
      setStats((s) => ({ ...s, incorrect: s.incorrect + 1 }));
      const msg = INCORRECT_MESSAGES[Math.floor(Math.random() * INCORRECT_MESSAGES.length)];
      setEncouragingMsg(msg);
    }
  };

  // Keyboard accessibility: 1-4 / A-D to select; Enter / Space to continue
  useEffect(() => {
    if (phase !== 'ACTIVE') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // If currently evaluated, Enter / Space triggers Continue
      if (isEvaluated) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleContinue();
        }
        return;
      }

      // If unanswered, 1-4 or A-D selects option
      const key = e.key.toUpperCase();
      if (['1', 'A'].includes(key)) handleSelectAnswer(0);
      else if (['2', 'B'].includes(key)) handleSelectAnswer(1);
      else if (['3', 'C'].includes(key)) handleSelectAnswer(2);
      else if (['4', 'D'].includes(key)) handleSelectAnswer(3);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [phase, isEvaluated, currentIndex]);

  // Focus Continue button when evaluated
  useEffect(() => {
    if (isEvaluated) {
      continueButtonRef.current?.focus();
    }
  }, [isEvaluated]);

  const handleContinue = () => {
    if (currentIndex + 1 < questions.length) {
      setCurrentIndex((prev) => prev + 1);
      setSelectedOption(null);
      setIsEvaluated(false);
      setEncouragingMsg('');
      if (timerSetting !== 'untimed') {
        setRemainingSeconds(timerSetting);
      }
    } else {
      setPhase('SUMMARY');
    }
  };

  // ── 1. SETUP SCREEN ───────────────────────────────────────────────────────
  if (phase === 'SETUP') {
    return (
      <section className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
        <div className="flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-emerald-100 text-emerald-800 border border-emerald-200">
            <Sparkles className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
              Practice & Revision Mode
            </h1>
            <p className="text-sm text-slate-600">
              Learn faster with instant answer feedback and clear explanations.
            </p>
          </div>
        </div>

        {/* Highlights */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 mb-1" />
            <strong className="block text-sm font-bold text-emerald-950">Instant Feedback</strong>
            <span className="text-xs text-emerald-800">
              Green/Red evaluation the exact moment you pick an answer.
            </span>
          </div>

          <div className="rounded-2xl border border-blue-200 bg-blue-50/70 p-4">
            <BookOpen className="h-5 w-5 text-blue-600 mb-1" />
            <strong className="block text-sm font-bold text-blue-950">Semester 1 Syllabus</strong>
            <span className="text-xs text-blue-800">
              Covers C Programming, Fundamentals, and Web Tech.
            </span>
          </div>

          <div className="rounded-2xl border border-indigo-200 bg-indigo-50/70 p-4">
            <RotateCcw className="h-5 w-5 text-indigo-600 mb-1" />
            <strong className="block text-sm font-bold text-indigo-950">Unlimited Retries</strong>
            <span className="text-xs text-indigo-800">
              Practice as many times as you like. Does not affect competition attempt.
            </span>
          </div>
        </div>

        {/* Configurations */}
        <div className="space-y-4 border-t border-slate-100 pt-5">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
              Number of Questions
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[10, 15, 20].map((count) => (
                <button
                  key={count}
                  type="button"
                  onClick={() => setQuestionCount(count as 10 | 15 | 20)}
                  className={`py-2.5 px-3 rounded-xl border text-sm font-bold transition ${
                    questionCount === count
                      ? 'border-[#1E40AF] bg-blue-50 text-[#1E40AF]'
                      : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {count} Questions
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
              Practice Timer Pace
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { val: 'untimed', label: 'Untimed (Study Pace)' },
                { val: 15, label: '15s / Question' },
                { val: 20, label: '20s / Question' },
                { val: 30, label: '30s / Question' }
              ].map((opt) => (
                <button
                  key={opt.val}
                  type="button"
                  onClick={() => setTimerSetting(opt.val as 'untimed' | 15 | 20 | 30)}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold transition text-center ${
                    timerSetting === opt.val
                      ? 'border-[#1E40AF] bg-blue-50 text-[#1E40AF]'
                      : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row gap-3">
          <Button
            type="button"
            onClick={startPractice}
            className="flex-1 min-h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-base shadow-sm"
          >
            Start Practice Quiz Now →
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={onSwitchToCompetition}
            className="border-slate-300 text-slate-700 font-semibold rounded-xl min-h-12"
          >
            Official Competition Mode
          </Button>
        </div>
      </section>
    );
  }

  // ── 2. SUMMARY SCREEN ─────────────────────────────────────────────────────
  if (phase === 'SUMMARY') {
    const percentage = Math.round((score / questions.length) * 100);

    return (
      <section className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6 text-center">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-emerald-100 text-emerald-800 border border-emerald-200">
          <GraduationCap className="h-8 w-8" />
        </div>

        <div>
          <span className="rounded-full bg-emerald-100 text-emerald-900 px-3 py-1 text-xs font-bold uppercase tracking-wider">
            Practice Completed
          </span>
          <h1 className="text-3xl font-extrabold text-slate-900 mt-3">Great Practice Session!</h1>
          <p className="text-sm text-slate-600 mt-1">
            Here is your instant feedback performance summary.
          </p>
        </div>

        {/* Score Card */}
        <div className="max-w-md mx-auto rounded-2xl border border-blue-200 bg-blue-50/70 p-6">
          <span className="text-xs font-bold text-[#1E40AF] uppercase tracking-wider">Your Score</span>
          <div className="text-5xl font-extrabold text-[#1E40AF] my-2">
            {score} <span className="text-2xl text-slate-500 font-medium">/ {questions.length}</span>
          </div>
          <div className="text-sm font-bold text-slate-700">Accuracy: {percentage}%</div>
        </div>

        {/* Breakdown */}
        <div className="grid grid-cols-3 gap-3 max-w-md mx-auto text-center">
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
            <strong className="block text-xl text-emerald-900">{stats.correct}</strong>
            <span className="text-xs text-emerald-700 font-medium">Correct</span>
          </div>
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-3">
            <strong className="block text-xl text-rose-900">{stats.incorrect}</strong>
            <span className="text-xs text-rose-700 font-medium">Incorrect</span>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <strong className="block text-xl text-slate-900">{stats.timedOut}</strong>
            <span className="text-xs text-slate-600 font-medium">Timed Out</span>
          </div>
        </div>

        <div className="pt-4 flex flex-col sm:flex-row gap-3 justify-center max-w-md mx-auto">
          <Button
            type="button"
            onClick={startPractice}
            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl min-h-12 shadow-sm"
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Practice Again
          </Button>

          <Button
            type="button"
            onClick={onSwitchToCompetition}
            className="flex-1 bg-[#1E40AF] hover:bg-blue-800 text-white font-bold rounded-xl min-h-12 shadow-sm"
          >
            <Trophy className="h-4 w-4 mr-2 text-amber-400" />
            Take Official Quiz
          </Button>
        </div>
      </section>
    );
  }

  // ── 3. ACTIVE PRACTICE QUESTION SCREEN ────────────────────────────────────
  const isCorrectAnswer = selectedOption === currentQ.correct_index;

  return (
    <section className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-8 shadow-sm space-y-6">
      {/* Top Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-emerald-100 text-emerald-900 px-3 py-1 text-xs font-extrabold uppercase tracking-wider inline-flex items-center gap-1.5">
            <Sparkles className="h-3 w-3 text-amber-500" />
            <span>Practice Mode</span>
          </span>
          <span className="text-sm font-semibold text-slate-600">
            Question {currentIndex + 1} of {questions.length}
          </span>
        </div>

        <div className="flex items-center gap-3">
          {/* Live Score Display */}
          <span className="inline-flex items-center rounded-xl bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
            Score: {score} / {currentIndex + (isEvaluated && isCorrectAnswer ? 1 : 0)}
          </span>

          {/* Configurable Timer (if active) */}
          {timerSetting !== 'untimed' && (
            <span
              role="timer"
              aria-label={`${remainingSeconds} seconds remaining`}
              className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1 text-sm font-bold tabular-nums ${
                remainingSeconds <= 3
                  ? 'bg-rose-50 text-rose-800 border border-rose-200'
                  : 'bg-blue-50 text-[#1E40AF]'
              }`}
            >
              <Timer className="h-4 w-4" />
              <span>{remainingSeconds}s</span>
            </span>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      <div
        className="flex gap-1.5"
        aria-label={`Progress ${currentIndex + 1} of ${questions.length}`}
      >
        {questions.map((_, i) => (
          <span
            key={i}
            className={`h-1.5 flex-1 rounded-full transition-colors ${
              i <= currentIndex ? 'bg-emerald-500' : 'bg-slate-100'
            }`}
          />
        ))}
      </div>

      {/* Subject Badge & Question Text */}
      <div>
        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">
          {currentQ.subject} · {currentQ.difficulty.replace('_', ' ')}
        </span>
        <h1
          className="text-xl sm:text-2xl font-bold text-slate-900 leading-relaxed"
          aria-live="polite"
        >
          {currentQ.question_text}
        </h1>
      </div>

      {/* 4 Answer Option Cards */}
      <div className="space-y-3" role="radiogroup" aria-label="Answer options">
        {currentQ.options.map((optText, idx) => {
          const isSelected = selectedOption === idx;
          const isCorrectCard = idx === currentQ.correct_index;

          let cardClasses =
            'border-slate-200 bg-white text-slate-800 hover:border-blue-500 hover:bg-blue-50/50 cursor-pointer shadow-2xs';
          let badge: React.ReactNode = null;

          if (isEvaluated) {
            if (isSelected) {
              if (isCorrectAnswer) {
                // Selected Correct Answer -> GREEN
                cardClasses =
                  'border-2 border-emerald-500 bg-emerald-50/80 text-emerald-950 font-semibold shadow-xs animate-subtle-pulse';
                badge = (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 text-emerald-800 px-2.5 py-1 text-xs font-bold shrink-0">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                    <span>✓ Correct!</span>
                  </span>
                );
              } else {
                // Selected Wrong Answer -> RED
                cardClasses =
                  'border-2 border-rose-500 bg-rose-50/80 text-rose-950 font-semibold shadow-xs animate-subtle-shake';
                badge = (
                  <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 text-rose-800 px-2.5 py-1 text-xs font-bold shrink-0">
                    <XCircle className="h-3.5 w-3.5 text-rose-600" />
                    <span>✕ Incorrect</span>
                  </span>
                );
              }
            } else if (isCorrectCard) {
              // Highlight Authoritative Correct Answer in GREEN when student made a mistake
              cardClasses =
                'border-2 border-emerald-500 bg-emerald-50/60 text-emerald-950 font-semibold shadow-xs';
              badge = (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 text-emerald-800 px-2.5 py-1 text-xs font-bold shrink-0">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                  <span>✓ Correct answer</span>
                </span>
              );
            } else {
              // Other unselected options -> Dimmed
              cardClasses =
                'border-slate-200 bg-slate-50/60 text-slate-400 opacity-40 cursor-not-allowed';
            }
          }

          return (
            <button
              key={idx}
              type="button"
              disabled={isEvaluated}
              onClick={() => handleSelectAnswer(idx)}
              className={`flex w-full items-center justify-between gap-4 rounded-2xl border p-4 min-h-16 text-left transition-all duration-150 focus-visible:outline-2 focus-visible:outline-blue-600 ${cardClasses}`}
              aria-checked={isSelected}
              role="radio"
            >
              <div className="flex items-center gap-3 sm:gap-4">
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-sm font-bold ${
                    isSelected && isCorrectAnswer
                      ? 'bg-emerald-600 text-white'
                      : isSelected && !isCorrectAnswer
                        ? 'bg-rose-600 text-white'
                        : isEvaluated && isCorrectCard
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  {String.fromCharCode(65 + idx)}
                </span>
                <span className="text-sm sm:text-base leading-snug">{optText}</span>
              </div>

              {badge}
            </button>
          );
        })}
      </div>

      {/* Feedback Panel (Displayed below options once evaluated) */}
      {isEvaluated && (
        <div
          role="status"
          aria-live="polite"
          className={`rounded-2xl border p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all duration-200 ${
            isCorrectAnswer
              ? 'border-emerald-300 bg-emerald-50 text-emerald-950'
              : 'border-rose-300 bg-rose-50 text-rose-950'
          }`}
        >
          <div className="flex items-start gap-3">
            <div
              className={`p-2 rounded-xl shrink-0 ${
                isCorrectAnswer ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
              }`}
            >
              {isCorrectAnswer ? (
                <CheckCircle2 className="h-6 w-6" />
              ) : (
                <XCircle className="h-6 w-6" />
              )}
            </div>

            <div>
              <strong className="block text-base font-bold">
                {isCorrectAnswer ? '✓ Correct! 🎉' : '✕ Not quite!'}
              </strong>
              <p className="text-xs sm:text-sm text-slate-700 mt-0.5 leading-relaxed">
                {encouragingMsg}
              </p>
              {!isCorrectAnswer && (
                <p className="text-xs font-semibold text-emerald-800 mt-1">
                  Correct answer:{' '}
                  <span className="font-bold underline">
                    {String.fromCharCode(65 + currentQ.correct_index)}. {currentQ.options[currentQ.correct_index]}
                  </span>
                </p>
              )}
            </div>
          </div>

          <Button
            ref={continueButtonRef}
            type="button"
            onClick={handleContinue}
            className="bg-[#1E40AF] hover:bg-blue-800 text-white font-bold px-6 py-2.5 rounded-xl text-sm shrink-0 shadow-sm"
          >
            <span>Continue</span>
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      )}

      {/* Helpful Hint */}
      {!isEvaluated && (
        <p className="text-xs text-slate-500" role="status">
          Tip: Click an option or press keys 1–4 / A–D on your keyboard. Instant evaluation will appear immediately.
        </p>
      )}
    </section>
  );
}

// ============================================================================
// COMPETITION CARD
// ============================================================================

function CompetitionCard({ competition }: { competition: Competition }) {
  const [detail, setDetail] = useState<QuizState | null>(null);
  useEffect(() => {
    let live = true;
    void quizCall<QuizState>('detail', { competition_id: competition.id })
      .then((s) => {
        if (live) setDetail(s);
      })
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [competition.id]);

  return (
    <article className="mb-4 rounded-2xl border bg-white p-6 shadow-sm">
      <p className="text-xs font-bold text-[#1E40AF]">{competition.status.replace(/_/g, ' ')}</p>
      <h2 className="mt-2 text-xl font-bold">{competition.title}</h2>
      <p className="mt-2 text-sm text-slate-600">
        {competition.question_count} questions · {competition.seconds_per_question} seconds each · One attempt
      </p>
      <div className="flex items-center gap-3 mt-5">
        <Button asChild className="min-h-11 bg-[#1E40AF] text-white font-bold">
          <Link to={`/app/quiz/${competition.id}`}>
            {detail ? quizCta(detail) : 'View Competition'}
          </Link>
        </Button>
        <Button asChild variant="outline" className="min-h-11 border-blue-200 text-[#1E40AF] font-bold">
          <Link to={`/app/quiz?mode=practice`}>
            Practice First 🎯
          </Link>
        </Button>
      </div>
    </article>
  );
}
