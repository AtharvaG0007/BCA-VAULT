import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Trophy,
  Play,
  Square,
  Plus,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Users,
  HelpCircle,
  Copy,
  Check,
  Eye,
  RefreshCw,
  FileText,
  Settings as SettingsIcon,
  Award,
  ArrowRight,
  ChevronRight,
  Search,
  Sparkles,
  ShieldCheck,
  ShieldAlert,
  BarChart3,
  ExternalLink,
  Edit3,
  Trash2,
  X
} from 'lucide-react';
import { Button } from '../ui/button';
import {
  SEMESTER_1_QUESTION_BANK,
  SEMESTER_1_SUBJECTS,
  generateSemester1Blueprint
} from '@/lib/quiz/semester1QuestionBank';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '../ui/alert-dialog';
import { quizCall, type Competition, type BlueprintSlot } from '@/lib/supabase/quizService';
import { toast } from 'sonner';
import { useAdminAuth } from '../auth/AdminAuthContext';

export type Participant = {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  semester: number;
  course: string;
  status: string;
  score: number;
  completion_ms: number | null;
  risk_score: number;
  review_status: string;
  review_reason: string | null;
  current_position: number;
  timeouts: number;
  tab_events: number;
  rank: number;
  merit_tie: boolean;
  started_at: string;
  completed_at: string | null;
  mode?: 'COMPETITION' | 'PRACTICE';
};

export type BankQuestion = {
  id?: string;
  subject: string;
  difficulty: string;
  question_text: string;
  options: string[];
  correct_index: number;
  marks: number;
  active: boolean;
};

export type Audit = {
  action: string;
  actor_id: string;
  created_at: string;
  metadata: { reason?: string; status?: string };
};

export type Detail = {
  competition: Competition;
  questions: BankQuestion[];
  participants: Participant[];
  analytics: {
    total: number;
    active: number;
    completed: number;
    average_score: number | null;
    highest_score: number | null;
    lowest_score: number | null;
    average_completion_ms: number | null;
    suspicious: number;
  };
  audit: Audit[];
};

export type Timeline = {
  events: { id: number; event_type: string; source: string; created_at: string }[];
  assignments: {
    id: string;
    position: number;
    question_text: string;
    options: { id: string; text: string }[];
    correct_option: string;
    selected_option: string | null;
    state: string;
    started_at: string;
    deadline: string;
    submitted_at: string;
    earned_marks: number;
  }[];
};

const SUBJECTS = SEMESTER_1_SUBJECTS;

const BLANK_QUESTION: BankQuestion = {
  subject: SUBJECTS[0],
  difficulty: 'very_easy',
  question_text: '',
  options: ['', '', '', ''],
  correct_index: 0,
  marks: 1,
  active: true
};


type ActiveTab = 'overview' | 'questions' | 'participants' | 'results' | 'settings';

export function AdminQuizManagement() {
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [data, setData] = useState<Detail | null>(null);
  const [tab, setTab] = useState<ActiveTab>('overview');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  // Modals & Sub-views
  const [showCreateWizard, setShowCreateWizard] = useState(false);
  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<BankQuestion>(BLANK_QUESTION);
  const [inspectingParticipant, setInspectingParticipant] = useState<Participant | null>(null);
  const [participantTimeline, setParticipantTimeline] = useState<Timeline | null>(null);
  const [reviewReason, setReviewReason] = useState('Identity and submission verified.');
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [seedingPool, setSeedingPool] = useState(false);

  // Authorized Admin check (Chunks 2 & 6)
  const adminAuth = useAdminAuth();
  const isAuthorizedAdmin = !!adminAuth?.user;

  // Delete Quiz modal & processing states (Chunks 2 & 3)
  const [quizToDelete, setQuizToDelete] = useState<Competition | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showAllQuizzesModal, setShowAllQuizzesModal] = useState(false);

  const handleDeleteQuiz = async () => {
    if (!quizToDelete) return;
    setIsDeleting(true);
    try {
      await quizCall('admin_delete', { competition_id: quizToDelete.id }, true);
      toast.success(`Quiz "${quizToDelete.title}" deleted successfully.`);

      const res = await quizCall<{ competitions: Competition[] }>('admin_list', {}, true);
      const updated = res.competitions || [];
      setCompetitions(updated);

      if (selectedId === quizToDelete.id) {
        if (updated.length > 0) {
          setSelectedId(updated[0].id);
        } else {
          setSelectedId('');
          setData(null);
        }
      } else if (selectedId) {
        await loadDetail(true);
      }
      setQuizToDelete(null);
      setTab('overview');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to delete quiz.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Confirmation dialog state
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    confirmLabel: string;
    destructive?: boolean;
    action: () => Promise<void>;
  }>({
    isOpen: false,
    title: '',
    description: '',
    confirmLabel: 'Confirm',
    destructive: false,
    action: async () => {}
  });

  // Load competitions list
  const loadCompetitions = useCallback(async (selectFirst = false) => {
    try {
      const res = await quizCall<{ competitions: Competition[] }>('admin_list', {}, true);
      setCompetitions(res.competitions || []);
      if (selectFirst && res.competitions?.length > 0) {
        setSelectedId(res.competitions[0].id);
      } else if (!selectedId && res.competitions?.length > 0) {
        setSelectedId(res.competitions[0].id);
      }
    } catch (err) {
      console.error('Failed to load competitions:', err);
    }
  }, [selectedId]);

  // Load active competition detail
  const loadDetail = useCallback(async (silent = false) => {
    if (!selectedId) return;
    if (!silent) setLoading(true);
    setRefreshing(true);
    try {
      const detail = await quizCall<Detail>('admin_detail', { competition_id: selectedId }, true);
      setData(detail);
      setError('');
    } catch (err: any) {
      setError(err?.message || 'Unable to load competition details.');
    } finally {
      if (!silent) setLoading(false);
      setRefreshing(false);
    }
  }, [selectedId]);

  useEffect(() => {
    void loadCompetitions(true);
  }, [loadCompetitions]);

  useEffect(() => {
    if (selectedId) {
      void loadDetail();
    }
  }, [selectedId, loadDetail]);

  // Auto-refresh when viewing live/active quiz
  useEffect(() => {
    if (!selectedId || !data) return;
    const isLive = ['OPEN', 'LIVE'].includes(data.competition.status);
    if (!isLive) return;

    const timer = setInterval(() => {
      if (!document.hidden) void loadDetail(true);
    }, 4000);
    return () => clearInterval(timer);
  }, [selectedId, data, loadDetail]);

  const comp = data?.competition;

  // Status computation for human understanding
  const statusInfo = useMemo(() => {
    if (!comp) return { label: 'Unknown', color: 'slate', desc: '' };
    switch (comp.status) {
      case 'DRAFT':
        return {
          label: 'DRAFT',
          display: 'Draft',
          badgeClass: 'bg-amber-950/80 text-amber-300 border-amber-800/80',
          desc: 'Quiz is being configured. Add questions and review before starting.'
        };
      case 'UPCOMING':
        return {
          label: 'READY',
          display: 'Ready to Start',
          badgeClass: 'bg-indigo-950/80 text-indigo-300 border-indigo-700/80',
          desc: 'Questions and schedule ready. Click Start Quiz when you are ready for students to join.'
        };
      case 'OPEN':
      case 'LIVE':
        return {
          label: 'LIVE',
          display: 'Live in Progress',
          badgeClass: 'bg-emerald-950/80 text-emerald-300 border-emerald-700/80 animate-pulse',
          desc: 'Students can currently join and submit answers in real time.'
        };
      case 'CLOSED':
      case 'UNDER_REVIEW':
        return {
          label: 'RESULTS_PENDING',
          display: 'Results Under Review',
          badgeClass: 'bg-purple-950/80 text-purple-300 border-purple-700/80',
          desc: 'Quiz has ended. Review participant submissions and approve Top 3 winners.'
        };
      case 'RESULTS_PUBLISHED':
        return {
          label: 'PUBLISHED',
          display: 'Results Published',
          badgeClass: 'bg-blue-950/80 text-blue-300 border-blue-700/80',
          desc: 'Final scores published. Verified Top 3 winners can claim their ₹299 offer.'
        };
      default:
        return {
          label: comp.status,
          display: comp.status,
          badgeClass: 'bg-slate-800 text-slate-300 border-slate-700',
          desc: ''
        };
    }
  }, [comp]);

  // Actions
  const handleStartQuiz = async () => {
    if (!comp) return;
    setBusy(true);
    try {
      const now = new Date();
      // Ensure schedule is valid for instant start
      const durationSeconds = (comp.question_count || 7) * (comp.seconds_per_question || 10);
      const end = new Date(now.getTime() + Math.max(durationSeconds + 7200, 7200) * 1000);

      if (comp.status === 'DRAFT') {
        await quizCall(
          'admin_save',
          {
            competition_id: comp.id,
            start_at: now.toISOString(),
            end_at: end.toISOString()
          },
          true
        );
        await quizCall('admin_transition', { competition_id: comp.id, status: 'UPCOMING' }, true);
        await quizCall('admin_transition', { competition_id: comp.id, status: 'OPEN' }, true);
      } else if (comp.status === 'UPCOMING') {
        await quizCall('admin_transition', { competition_id: comp.id, status: 'OPEN' }, true);
      }

      toast.success('Quiz is now LIVE! Students can now participate.');
      await loadDetail();
      setTab('overview');
    } catch (e: any) {
      toast.error(e?.message || 'Unable to start quiz.');
    } finally {
      setBusy(false);
      setConfirmModal((prev) => ({ ...prev, isOpen: false }));
    }
  };

  const handleEndQuiz = async () => {
    if (!comp) return;
    setBusy(true);
    try {
      await quizCall('admin_transition', { competition_id: comp.id, status: 'CLOSED' }, true);
      await quizCall('admin_transition', { competition_id: comp.id, status: 'UNDER_REVIEW' }, true);
      toast.success('Quiz has ended. Results are ready for review.');
      await loadDetail();
      setTab('results');
    } catch (e: any) {
      toast.error(e?.message || 'Unable to end quiz.');
    } finally {
      setBusy(false);
      setConfirmModal((prev) => ({ ...prev, isOpen: false }));
    }
  };

  const handleReviewCandidate = async (
    attemptId: string,
    status: 'APPROVED' | 'FLAGGED' | 'REJECTED',
    studentName: string
  ) => {
    if (!comp) return;
    setBusy(true);
    try {
      await quizCall(
        'admin_review',
        {
          competition_id: comp.id,
          attempt_id: attemptId,
          status,
          reason: reviewReason.trim() || `Candidate review marked as ${status.toLowerCase()}`
        },
        true
      );
      toast.success(`${studentName} marked as ${status}`);
      await loadDetail(true);
      setInspectingParticipant(null);
    } catch (e: any) {
      toast.error(e?.message || 'Unable to update review status.');
    } finally {
      setBusy(false);
    }
  };

  const handlePublishResults = async () => {
    if (!comp) return;
    setBusy(true);
    try {
      await quizCall('admin_transition', { competition_id: comp.id, status: 'RESULTS_PUBLISHED' }, true);
      toast.success('Official results published! Top 3 winners approved.');
      await loadDetail();
      setTab('results');
    } catch (e: any) {
      toast.error(e?.message || 'Unable to publish results.');
    } finally {
      setBusy(false);
      setConfirmModal((prev) => ({ ...prev, isOpen: false }));
    }
  };

  const handleSaveQuestion = async (q: BankQuestion) => {
    if (!comp) return;
    setBusy(true);
    try {
      await quizCall(
        'admin_question',
        {
          competition_id: comp.id,
          id: q.id,
          subject: q.subject,
          difficulty: q.difficulty,
          question_text: q.question_text,
          options: q.options,
          correct_index: q.correct_index,
          marks: q.marks,
          active: q.active
        },
        true
      );
      toast.success(q.id ? 'Question updated' : 'Question added to bank');
      setShowQuestionModal(false);
      setEditingQuestion(BLANK_QUESTION);
      await loadDetail(true);
    } catch (e: any) {
      toast.error(e?.message || 'Failed to save question.');
    } finally {
      setBusy(false);
    }
  };

  const handleLoadBeginnerPool = async () => {
    if (!comp) return;
    setSeedingPool(true);
    try {
      const blueprint = generateSemester1Blueprint();
      await quizCall(
        'admin_save',
        {
          competition_id: comp.id,
          blueprint,
          question_count: 20,
          seconds_per_question: 20
        },
        true
      );
      for (const q of SEMESTER_1_QUESTION_BANK) {
        await quizCall(
          'admin_question',
          {
            competition_id: comp.id,
            subject: q.subject,
            difficulty: q.difficulty,
            question_text: q.question_text,
            options: q.options,
            correct_index: q.correct_index,
            marks: q.marks
          },
          true
        );
      }
      toast.success('Successfully loaded 84 beginner Semester 1 questions!');
      await loadDetail(true);
    } catch (e: any) {
      toast.error(e?.message || 'Failed to load beginner questions.');
    } finally {
      setSeedingPool(false);
    }
  };

  const inspectParticipant = async (p: Participant) => {
    if (!comp) return;
    setInspectingParticipant(p);
    setReviewReason(p.review_reason || 'Verified submission and event timeline.');
    setParticipantTimeline(null);
    try {
      const res = await quizCall<Timeline>(
        'admin_timeline',
        { competition_id: comp.id, attempt_id: p.id },
        true
      );
      setParticipantTimeline(res);
    } catch (e: any) {
      toast.error(e?.message || 'Unable to load attempt timeline.');
    }
  };

  const copyQuizLink = () => {
    if (!comp) return;
    const url = `${window.location.origin}/app/quiz/${comp.id}`;
    void navigator.clipboard.writeText(url);
    setCopiedLink(true);
    toast.success('Quiz link copied to clipboard!');
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const copyJoinCode = () => {
    if (!comp) return;
    const code = comp.id.slice(0, 8).toUpperCase();
    void navigator.clipboard.writeText(code);
    setCopiedCode(true);
    toast.success(`Join code ${code} copied!`);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // Top 3 candidates sorted by score desc, time asc
  const candidates = useMemo(() => {
    if (!data?.participants) return [];
    return [...data.participants].sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return (a.completion_ms || 999999) - (b.completion_ms || 999999);
    });
  }, [data?.participants]);

  // Only official competition attempts contribute to official Top 3 rankings
  const top3 = candidates.filter((p) => p.mode !== 'PRACTICE').slice(0, 3);
  const activeParticipants = candidates.filter((p) => p.status === 'ACTIVE');
  const completedParticipants = candidates.filter((p) => p.status !== 'ACTIVE');

  return (
    <div className="space-y-6 text-slate-100">
      {/* ── TOP HEADER ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-indigo-600/30 text-indigo-400 border border-indigo-500/30">
              <Trophy className="h-4 w-4" />
            </span>
            <h1 className="text-2xl font-black tracking-tight text-white">Quiz Management</h1>
          </div>
          <p className="mt-1 text-xs text-slate-400">
            Create, start, monitor and publish BCA Vault student competitions
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {competitions.length > 0 && (
            <>
              <select
                aria-label="Select Competition"
                value={selectedId}
                onChange={(e) => setSelectedId(e.target.value)}
                className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-200 focus:border-indigo-500 focus:outline-none min-h-10"
              >
                {competitions.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title} ({c.status})
                  </option>
                ))}
              </select>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAllQuizzesModal(true)}
                className="border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 min-h-10 text-xs font-semibold"
              >
                <FileText className="h-3.5 w-3.5 mr-1.5 text-indigo-400" />
                All Quizzes ({competitions.length})
              </Button>
            </>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={() => void loadDetail()}
            disabled={refreshing || !selectedId}
            className="border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 min-h-10 text-xs font-semibold"
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          <Button
            size="sm"
            onClick={() => setShowCreateWizard(true)}
            className="bg-indigo-600 hover:bg-indigo-500 text-white min-h-10 text-xs font-bold shadow-md shadow-indigo-600/20"
          >
            <Plus className="h-4 w-4 mr-1.5" />
            Create New Quiz
          </Button>
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-2xl border border-rose-800 bg-rose-950/60 p-4 text-xs font-medium text-rose-300 flex items-center justify-between"
        >
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => void loadDetail()}
            className="text-xs text-rose-300 hover:bg-rose-900/40"
          >
            Retry
          </Button>
        </div>
      )}

      {/* ── NO QUIZ CREATED YET (EMPTY STATE) ───────────────────────────────── */}
      {!loading && competitions.length === 0 && (
        <div className="rounded-3xl border border-dashed border-slate-800 bg-slate-900/60 p-12 text-center max-w-2xl mx-auto my-12">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-indigo-950 text-indigo-400 border border-indigo-800 mb-4">
            <Trophy className="h-8 w-8" />
          </div>
          <h2 className="text-xl font-bold text-white">No quiz created yet</h2>
          <p className="mt-2 text-sm text-slate-400 max-w-md mx-auto">
            Create your first quiz competition to test student knowledge, monitor live attempts, and
            award the Top 3 ₹299 offer.
          </p>
          <Button
            onClick={() => setShowCreateWizard(true)}
            className="mt-6 bg-indigo-600 hover:bg-indigo-500 text-white min-h-11 px-6 rounded-xl font-bold"
          >
            <Plus className="h-4 w-4 mr-2" /> Create New Quiz
          </Button>
        </div>
      )}

      {/* ── ACTIVE QUIZ DASHBOARD ────────────────────────────────────────────── */}
      {comp && (
        <>
          {/* FOCAL CARD (CURRENT QUIZ STATUS & QUICK ACTIONS) */}
          <div className="relative overflow-hidden rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-900 via-slate-900/90 to-slate-950 p-6 sm:p-8 shadow-xl">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2.5">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-black uppercase tracking-wider border ${statusInfo.badgeClass}`}
                  >
                    {comp.status === 'LIVE' || comp.status === 'OPEN' ? (
                      <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
                    ) : null}
                    {statusInfo.display}
                  </span>
                  <span className="text-xs text-slate-500 font-mono">ID: {comp.id.slice(0, 8)}</span>
                </div>

                <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                  {comp.title}
                </h2>
                <p className="text-sm text-slate-400 max-w-2xl leading-relaxed">
                  {comp.description || 'No description provided.'}
                </p>

                {/* METRICS PILLS */}
                <div className="flex flex-wrap items-center gap-3 pt-1">
                  <span className="inline-flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-950/80 px-3 py-1.5 text-xs font-medium text-slate-300">
                    <FileText className="h-3.5 w-3.5 text-indigo-400" />
                    <strong>{comp.question_count}</strong> Questions in test
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-950/80 px-3 py-1.5 text-xs font-medium text-slate-300">
                    <Clock className="h-3.5 w-3.5 text-indigo-400" />
                    <strong>{comp.seconds_per_question}s</strong> per question (
                    {Math.round((comp.question_count * comp.seconds_per_question) / 60)}m total)
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-950/80 px-3 py-1.5 text-xs font-medium text-slate-300">
                    <Users className="h-3.5 w-3.5 text-indigo-400" />
                    <strong>{data?.participants?.length || 0}</strong> Participants
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-950/80 px-3 py-1.5 text-xs font-medium text-amber-300">
                    <Award className="h-3.5 w-3.5 text-amber-400" />
                    Top 3 Verified → <strong>₹299</strong>
                  </span>
                </div>
              </div>

              {/* PRIMARY ACTION BUTTONS BY STATUS */}
              <div className="flex flex-col sm:flex-row lg:flex-col items-stretch lg:items-end gap-3 shrink-0">
                {/* DRAFT STATE: REVIEW & START */}
                {comp.status === 'DRAFT' && (
                  <>
                    <Button
                      onClick={() =>
                        setConfirmModal({
                          isOpen: true,
                          title: 'Start Quiz Now?',
                          description:
                            'This will immediately transition the quiz to LIVE. Students can take the test with 1 attempt.',
                          confirmLabel: 'Start Quiz',
                          destructive: false,
                          action: handleStartQuiz
                        })
                      }
                      disabled={busy}
                      className="bg-indigo-600 hover:bg-indigo-500 text-white min-h-12 px-6 rounded-xl font-bold text-sm shadow-lg shadow-indigo-600/30"
                    >
                      <Play className="h-4 w-4 mr-2" /> Start Quiz Now
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setTab('questions')}
                      className="border-slate-700 bg-slate-800/80 hover:bg-slate-800 text-slate-200 min-h-10 text-xs font-semibold"
                    >
                      <FileText className="h-3.5 w-3.5 mr-1.5" /> Review Questions ({data?.questions?.length || 0})
                    </Button>
                  </>
                )}

                {/* UPCOMING / READY */}
                {comp.status === 'UPCOMING' && (
                  <>
                    <Button
                      onClick={() =>
                        setConfirmModal({
                          isOpen: true,
                          title: 'Launch Live Quiz?',
                          description: 'Students will now be able to start their attempt immediately.',
                          confirmLabel: 'Make Quiz Live',
                          destructive: false,
                          action: handleStartQuiz
                        })
                      }
                      disabled={busy}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white min-h-12 px-6 rounded-xl font-bold text-sm shadow-lg shadow-emerald-600/30"
                    >
                      <Play className="h-4 w-4 mr-2" /> Launch Quiz (Make Live)
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setTab('questions')}
                      className="border-slate-700 bg-slate-800/80 text-slate-200 min-h-10 text-xs font-semibold"
                    >
                      Questions ({data?.questions?.length || 0})
                    </Button>
                  </>
                )}

                {/* LIVE STATE: END QUIZ BUTTON */}
                {(comp.status === 'OPEN' || comp.status === 'LIVE') && (
                  <>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={copyQuizLink}
                        className="border-slate-700 bg-slate-800 text-slate-200 text-xs min-h-10 font-bold"
                      >
                        {copiedLink ? <Check className="h-3.5 w-3.5 mr-1 text-emerald-400" /> : <Copy className="h-3.5 w-3.5 mr-1" />}
                        {copiedLink ? 'Link Copied' : 'Copy Quiz Link'}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={copyJoinCode}
                        className="border-slate-700 bg-slate-800 text-slate-200 text-xs min-h-10 font-bold"
                      >
                        {copiedCode ? <Check className="h-3.5 w-3.5 mr-1 text-emerald-400" /> : <Copy className="h-3.5 w-3.5 mr-1" />}
                        {copiedCode ? 'Code Copied' : 'Copy Code'}
                      </Button>
                    </div>

                    <Button
                      onClick={() =>
                        setConfirmModal({
                          isOpen: true,
                          title: 'End Quiz Competition?',
                          description:
                            'This will lock further submissions and advance active attempts to review. Students will no longer be able to answer.',
                          confirmLabel: 'End Quiz Now',
                          destructive: true,
                          action: handleEndQuiz
                        })
                      }
                      disabled={busy}
                      className="bg-rose-600 hover:bg-rose-500 text-white min-h-12 px-6 rounded-xl font-bold text-sm shadow-lg shadow-rose-600/30"
                    >
                      <Square className="h-4 w-4 mr-2 fill-current" /> End Quiz Competition
                    </Button>
                  </>
                )}

                {/* RESULTS PENDING: REVIEW & PUBLISH */}
                {(comp.status === 'CLOSED' || comp.status === 'UNDER_REVIEW') && (
                  <>
                    <Button
                      onClick={() => setTab('results')}
                      className="bg-indigo-600 hover:bg-indigo-500 text-white min-h-12 px-6 rounded-xl font-bold text-sm shadow-lg shadow-indigo-600/30"
                    >
                      <Award className="h-4 w-4 mr-2" /> Review Top 3 Winners
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() =>
                        setConfirmModal({
                          isOpen: true,
                          title: 'Publish Results & Activate ₹299 Rewards?',
                          description:
                            'This will publish the leaderboard and award the account-bound ₹299 reward to the Top 3 approved candidates.',
                          confirmLabel: 'Publish Final Results',
                          destructive: false,
                          action: handlePublishResults
                        })
                      }
                      className="border-slate-700 bg-slate-800/80 text-emerald-400 min-h-10 text-xs font-bold"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5 mr-1.5 text-emerald-400" /> Publish Results
                    </Button>
                  </>
                )}

                {/* PUBLISHED */}
                {comp.status === 'RESULTS_PUBLISHED' && (
                  <Button
                    onClick={() => setTab('results')}
                    className="bg-blue-600 hover:bg-blue-500 text-white min-h-12 px-6 rounded-xl font-bold text-sm"
                  >
                    <Trophy className="h-4 w-4 mr-2" /> View Final Winners & Leaderboard
                  </Button>
                )}

                {/* AUTHORIZED ADMIN: DELETE QUIZ (CHUNKS 2 & 6) */}
                {isAuthorizedAdmin && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setQuizToDelete(comp)}
                    disabled={busy || isDeleting}
                    className="border-rose-900/60 bg-rose-950/40 text-rose-300 hover:bg-rose-900/60 hover:text-white min-h-10 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-colors shadow-sm"
                  >
                    <Trash2 className="h-3.5 w-3.5 text-rose-400" />
                    <span>Delete Quiz</span>
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* ── SIMPLIFIED 5 TABS NAVIGATION ───────────────────────────────────── */}
          <div className="flex items-center gap-2 overflow-x-auto border-b border-slate-800 pb-2">
            {[
              { key: 'overview', label: 'Overview', icon: BarChart3 },
              { key: 'questions', label: `Questions (${data?.questions?.length || 0})`, icon: FileText },
              {
                key: 'participants',
                label: `Live & Participants (${data?.participants?.length || 0})`,
                icon: Users
              },
              { key: 'results', label: 'Results & Winner Review', icon: Award },
              { key: 'settings', label: 'Settings', icon: SettingsIcon }
            ].map((t) => {
              const Icon = t.icon;
              const isActive = tab === t.key;
              return (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key as ActiveTab)}
                  className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition shrink-0 ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                      : 'text-slate-400 hover:bg-slate-800/70 hover:text-slate-200'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span>{t.label}</span>
                </button>
              );
            })}
          </div>

          {/* ── TAB 1: CONTEXTUAL OVERVIEW ───────────────────────────────────── */}
          {tab === 'overview' && (
            <div className="space-y-6">
              {/* LIVE MONITORING STRIP (ONLY WHEN LIVE) */}
              {(comp.status === 'OPEN' || comp.status === 'LIVE') && (
                <div className="rounded-2xl border border-emerald-800/80 bg-emerald-950/40 p-5">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <span className="relative flex h-3.5 w-3.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500"></span>
                      </span>
                      <div>
                        <h3 className="text-sm font-bold text-white">Quiz is Live</h3>
                        <p className="text-xs text-emerald-300">
                          Students are currently taking the exam. Live updates refresh every 4 seconds.
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => setTab('participants')}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold min-h-9"
                      >
                        Monitor Live Participants ({activeParticipants.length})
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* DRAFT SETUP CHECKLIST */}
              {comp.status === 'DRAFT' && (
                <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 space-y-4">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-amber-400" />
                    Quiz Setup Progress
                  </h3>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-400">1. Basic Details</span>
                        <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                      </div>
                      <p className="mt-2 text-sm font-bold text-white">{comp.title}</p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {comp.question_count} Qs · {comp.seconds_per_question}s each
                      </p>
                    </div>

                    <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-400">2. Question Bank</span>
                        {(data?.questions?.length || 0) >= (comp.question_count || 7) ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                        ) : (
                          <AlertTriangle className="h-4 w-4 text-amber-400" />
                        )}
                      </div>
                      <p className="mt-2 text-sm font-bold text-white">
                        {data?.questions?.length || 0} Questions Loaded
                      </p>
                      <button
                        onClick={() => setTab('questions')}
                        className="text-xs text-indigo-400 hover:underline mt-0.5 block text-left"
                      >
                        Manage Question Bank →
                      </button>
                    </div>

                    <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-400">3. Launch Quiz</span>
                        <Play className="h-4 w-4 text-indigo-400" />
                      </div>
                      <p className="mt-2 text-sm font-bold text-white">Ready for Students</p>
                      <button
                        onClick={() =>
                          setConfirmModal({
                            isOpen: true,
                            title: 'Start Quiz Now?',
                            description: 'Students will immediately be able to join and take the quiz.',
                            confirmLabel: 'Start Quiz',
                            action: handleStartQuiz
                          })
                        }
                        className="text-xs text-indigo-400 hover:underline mt-0.5 block text-left font-bold"
                      >
                        Click to Start Quiz →
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* MEANINGFUL STATS (ONLY DISPLAY NON-EMPTY DATA) */}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-400">Total Participants</span>
                    <Users className="h-4 w-4 text-indigo-400" />
                  </div>
                  <p className="mt-2 text-3xl font-black text-white">
                    {data?.participants?.length || 0}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {activeParticipants.length} active · {completedParticipants.length} completed
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-400">Average Score</span>
                    <BarChart3 className="h-4 w-4 text-emerald-400" />
                  </div>
                  <p className="mt-2 text-3xl font-black text-white">
                    {data?.analytics?.average_score != null
                      ? data.analytics.average_score.toFixed(1)
                      : '—'}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Highest: {data?.analytics?.highest_score ?? '—'} · Lowest:{' '}
                    {data?.analytics?.lowest_score ?? '—'}
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-400">Avg Completion Time</span>
                    <Clock className="h-4 w-4 text-blue-400" />
                  </div>
                  <p className="mt-2 text-3xl font-black text-white">
                    {data?.analytics?.average_completion_ms != null
                      ? `${(data.analytics.average_completion_ms / 1000).toFixed(1)}s`
                      : '—'}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">Server calculated</p>
                </div>

                <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-400">Suspicious Events</span>
                    <ShieldAlert className="h-4 w-4 text-amber-400" />
                  </div>
                  <p className="mt-2 text-3xl font-black text-white">
                    {data?.analytics?.suspicious || 0}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">Medium / High risk review</p>
                </div>
              </div>

              {/* WORKFLOW GUIDE FOR ADMIN */}
              <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 space-y-4">
                <h3 className="text-sm font-bold text-white">How This Competition Works</h3>
                <div className="grid gap-4 sm:grid-cols-4 text-xs text-slate-400">
                  <div className="space-y-1">
                    <strong className="block text-slate-200">1. Controlled Questions</strong>
                    <span>
                      Each attempt receives {comp.question_count} questions balanced across C,
                      Computing, Web, and Communication skills.
                    </span>
                  </div>
                  <div className="space-y-1">
                    <strong className="block text-slate-200">2. Server Timer</strong>
                    <span>
                      Strict {comp.seconds_per_question}s timer per question calculated on server.
                      Refreshing or closing browser does not extend time.
                    </span>
                  </div>
                  <div className="space-y-1">
                    <strong className="block text-slate-200">3. Anti-Cheat Detection</strong>
                    <span>
                      Tab switches and copy attempts are logged as review signals for the admin.
                    </span>
                  </div>
                  <div className="space-y-1">
                    <strong className="block text-slate-200">4. Top 3 Rewards</strong>
                    <span>
                      Admin approves the top 3 candidates. Approved accounts unlock the ₹299 offer
                      directly upon publication.
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── TAB 2: QUESTION BANK ────────────────────────────────────────── */}
          {tab === 'questions' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-lg font-bold text-white">Question Pool & Editor</h3>
                  <p className="text-xs text-slate-400">
                    Questions are server-assigned and randomized for each student to maintain fairness.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant="outline"
                    onClick={handleLoadBeginnerPool}
                    disabled={seedingPool || comp.status !== 'DRAFT'}
                    className="border-indigo-500/40 bg-indigo-950/40 hover:bg-indigo-900/60 text-indigo-300 min-h-10 text-xs font-bold"
                  >
                    <Sparkles className="h-4 w-4 mr-1.5 text-amber-400" />
                    {seedingPool ? 'Loading Questions…' : 'Load 84 Beginner Questions'}
                  </Button>
                  <Button
                    onClick={() => {
                      setEditingQuestion(BLANK_QUESTION);
                      setShowQuestionModal(true);
                    }}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white min-h-10 text-xs font-bold"
                  >
                    <Plus className="h-4 w-4 mr-1.5" /> Add Question
                  </Button>
                </div>
              </div>

              {/* QUESTIONS LIST */}
              {(!data?.questions || data.questions.length === 0) && (
                <div className="rounded-2xl border border-dashed border-slate-800 p-8 text-center bg-slate-900/40">
                  <HelpCircle className="h-10 w-10 text-slate-600 mx-auto mb-2" />
                  <p className="text-sm font-bold text-white">No questions in question bank</p>
                  <p className="text-xs text-slate-500 mt-1">Add questions or load the 84-question beginner bank before starting the quiz.</p>
                  <div className="flex justify-center gap-2 mt-4">
                    <Button
                      variant="outline"
                      onClick={handleLoadBeginnerPool}
                      disabled={seedingPool || comp.status !== 'DRAFT'}
                      className="border-indigo-500/40 bg-indigo-950/40 hover:bg-indigo-900/60 text-indigo-300 text-xs font-bold"
                    >
                      <Sparkles className="h-4 w-4 mr-1.5 text-amber-400" />
                      {seedingPool ? 'Loading…' : 'Load 84 Beginner Questions'}
                    </Button>
                    <Button
                      onClick={() => {
                        setEditingQuestion(BLANK_QUESTION);
                        setShowQuestionModal(true);
                      }}
                      className="bg-indigo-600 text-white text-xs font-bold"
                    >
                      + Add Question
                    </Button>
                  </div>
                </div>
              )}


              <div className="grid gap-3">
                {data?.questions?.map((q, idx) => (
                  <div
                    key={q.id || idx}
                    className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 hover:border-slate-700 transition"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2 text-xs">
                        <span className="font-bold text-indigo-400">Q{idx + 1}</span>
                        <span className="rounded-md bg-slate-800 px-2 py-0.5 font-medium text-slate-300">
                          {q.subject}
                        </span>
                        <span className="rounded-md bg-slate-800 px-2 py-0.5 font-medium text-slate-400">
                          {q.difficulty}
                        </span>
                        <span className="text-slate-500">{q.marks} mark</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditingQuestion(q);
                            setShowQuestionModal(true);
                          }}
                          className="text-xs text-slate-300 hover:text-white"
                        >
                          <Edit3 className="h-3.5 w-3.5 mr-1" /> Edit
                        </Button>
                      </div>
                    </div>

                    <p className="text-sm font-semibold text-white my-3 leading-relaxed">
                      {q.question_text}
                    </p>

                    <div className="grid sm:grid-cols-2 gap-2 mt-3 text-xs">
                      {q.options?.map((opt, optIdx) => (
                        <div
                          key={optIdx}
                          className={`rounded-xl border p-2.5 flex items-center gap-2 ${
                            q.correct_index === optIdx
                              ? 'border-emerald-800 bg-emerald-950/40 text-emerald-200 font-bold'
                              : 'border-slate-800 bg-slate-950/60 text-slate-300'
                          }`}
                        >
                          <span className="h-5 w-5 rounded-md bg-slate-800/80 grid place-items-center text-[10px] shrink-0 font-bold">
                            {String.fromCharCode(65 + optIdx)}
                          </span>
                          <span className="truncate">{opt}</span>
                          {q.correct_index === optIdx && (
                            <span className="ml-auto text-[10px] font-black text-emerald-400 shrink-0">
                              ✓ Correct
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── TAB 3: LIVE & ALL PARTICIPANTS ───────────────────────────────── */}
          {tab === 'participants' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-lg font-bold text-white">Live Monitoring & Participants</h3>
                  <p className="text-xs text-slate-400">
                    Real-time attempt tracking, progression, and risk event scoring
                  </p>
                </div>
                <div className="text-xs text-slate-400 font-mono">
                  {activeParticipants.length} Active · {completedParticipants.length} Completed
                </div>
              </div>

              {candidates.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-800 p-8 text-center bg-slate-900/40">
                  <Users className="h-10 w-10 text-slate-600 mx-auto mb-2" />
                  <p className="text-sm font-bold text-white">No participants yet</p>
                  <p className="text-xs text-slate-500 mt-1">
                    {comp.status === 'DRAFT' || comp.status === 'UPCOMING'
                      ? 'The quiz has not been started yet. Click Start Quiz so students can join.'
                      : 'Students have not joined the quiz yet. Share the link with students.'}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/60">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                      <tr>
                        <th className="p-3.5">Rank / Student</th>
                        <th className="p-3.5">Status</th>
                        <th className="p-3.5">Score / Time</th>
                        <th className="p-3.5">Risk Score</th>
                        <th className="p-3.5">Review</th>
                        <th className="p-3.5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {candidates.map((p, i) => (
                        <tr key={p.id} className="hover:bg-slate-800/40 transition">
                          <td className="p-3.5">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-slate-400 font-bold w-6">
                                #{p.rank || i + 1}
                              </span>
                              <div>
                                <strong className="text-white block text-sm">{p.full_name}</strong>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  <span className="text-[11px] text-slate-400">{p.email}</span>
                                  <span
                                    className={`inline-flex items-center rounded-full px-1.5 py-0.2 text-[9px] font-bold border ${
                                      p.mode === 'PRACTICE'
                                        ? 'bg-amber-950/80 text-amber-300 border-amber-800'
                                        : 'bg-indigo-950/80 text-indigo-300 border-indigo-800'
                                    }`}
                                  >
                                    {p.mode === 'PRACTICE' ? 'Practice' : 'Competition'}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="p-3.5">
                            <span
                              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-bold border ${
                                p.status === 'ACTIVE'
                                  ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                                  : 'bg-slate-800 text-slate-300 border-slate-700'
                              }`}
                            >
                              {p.status === 'ACTIVE' ? 'Answering (Live)' : 'Completed'}
                            </span>
                            <div className="text-[10px] text-slate-500 mt-1 font-mono">
                              Q{p.current_position}/{comp.question_count}
                            </div>
                          </td>
                          <td className="p-3.5">
                            <strong className="text-sm font-mono text-white">
                              {p.status === 'ACTIVE' ? 'In progress' : `${p.score} pts`}
                            </strong>
                            <div className="text-[10px] text-slate-400 font-mono">
                              {p.completion_ms != null
                                ? `${(p.completion_ms / 1000).toFixed(1)}s`
                                : '—'}
                            </div>
                          </td>
                          <td className="p-3.5">
                            <span
                              className={`inline-flex rounded-md px-2 py-0.5 text-[10px] font-bold ${
                                p.risk_score >= 20
                                  ? 'bg-rose-950 text-rose-300 border border-rose-800'
                                  : p.risk_score >= 10
                                    ? 'bg-amber-950 text-amber-300 border border-amber-800'
                                    : 'bg-slate-800 text-slate-400'
                              }`}
                            >
                              {p.risk_score >= 20
                                ? 'High Risk'
                                : p.risk_score >= 10
                                  ? 'Medium Risk'
                                  : 'Normal'} ({p.risk_score})
                            </span>
                            <div className="text-[10px] text-slate-500 mt-1">
                              {p.tab_events} tab switch(es)
                            </div>
                          </td>
                          <td className="p-3.5">
                            <span
                              className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                                p.review_status === 'APPROVED'
                                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                                  : p.review_status === 'FLAGGED'
                                    ? 'bg-amber-950 text-amber-300 border border-amber-800'
                                    : 'bg-slate-800 text-slate-400'
                              }`}
                            >
                              {p.review_status}
                            </span>
                          </td>
                          <td className="p-3.5 text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => void inspectParticipant(p)}
                              className="border-slate-700 bg-slate-800 text-slate-200 text-xs min-h-8 font-semibold"
                            >
                              <Eye className="h-3 w-3 mr-1" /> Inspect
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ── TAB 4: RESULTS & WINNER REVIEW ───────────────────────────────── */}
          {tab === 'results' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-lg font-bold text-white">Results & Top 3 Winner Selection</h3>
                  <p className="text-xs text-slate-400">
                    Highest score first. Ties broken by server completion time. Approved Top 3 unlock
                    the ₹299 offer.
                  </p>
                </div>

                {comp.status === 'UNDER_REVIEW' && (
                  <Button
                    onClick={() =>
                      setConfirmModal({
                        isOpen: true,
                        title: 'Publish Results and Activate ₹299 Rewards?',
                        description:
                          'This will publish final scores for students and activate the ₹299 bundle discount for verified Top 3 accounts.',
                        confirmLabel: 'Publish Results',
                        action: handlePublishResults
                      })
                    }
                    className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold min-h-10 px-5"
                  >
                    <CheckCircle2 className="h-4 w-4 mr-1.5" /> Publish Results & Rewards
                  </Button>
                )}
              </div>

              {/* 🏆 TOP 3 PODIUM / CANDIDATE CARDS */}
              <div className="grid gap-4 sm:grid-cols-3">
                {[
                  {
                    rank: 1,
                    title: '1st Place Winner',
                    badge: '🥇 1st Place',
                    color: 'from-amber-900/30 via-slate-900 to-slate-950 border-amber-700/80',
                    trophyColor: 'text-amber-400'
                  },
                  {
                    rank: 2,
                    title: '2nd Place Winner',
                    badge: '🥈 2nd Place',
                    color: 'from-slate-800/40 via-slate-900 to-slate-950 border-slate-700',
                    trophyColor: 'text-slate-300'
                  },
                  {
                    rank: 3,
                    title: '3rd Place Winner',
                    badge: '🥉 3rd Place',
                    color: 'from-amber-950/20 via-slate-900 to-slate-950 border-amber-800/60',
                    trophyColor: 'text-amber-600'
                  }
                ].map((podium) => {
                  const candidate = top3[podium.rank - 1];
                  return (
                    <div
                      key={podium.rank}
                      className={`relative overflow-hidden rounded-2xl border bg-gradient-to-br ${podium.color} p-5 flex flex-col justify-between`}
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black uppercase tracking-wider text-slate-300">
                            {podium.badge}
                          </span>
                          <Trophy className={`h-5 w-5 ${podium.trophyColor}`} />
                        </div>

                        {candidate ? (
                          <div className="mt-4 space-y-1">
                            <strong className="text-lg font-bold text-white block truncate">
                              {candidate.full_name}
                            </strong>
                            <p className="text-xs text-slate-400 truncate">{candidate.email}</p>
                            <div className="pt-2 flex items-center gap-3 text-xs font-mono">
                              <span className="text-emerald-400 font-bold">
                                {candidate.score} / {comp.question_count} pts
                              </span>
                              <span className="text-slate-400">
                                {candidate.completion_ms != null
                                  ? `${(candidate.completion_ms / 1000).toFixed(2)}s`
                                  : '—'}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div className="mt-4 py-3 text-xs text-slate-500 italic">
                            Waiting for qualifying submissions...
                          </div>
                        )}
                      </div>

                      {candidate && (
                        <div className="mt-4 pt-4 border-t border-slate-800/80 flex items-center justify-between gap-2">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              candidate.review_status === 'APPROVED'
                                ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                                : 'bg-amber-950 text-amber-300 border border-amber-800'
                            }`}
                          >
                            {candidate.review_status}
                          </span>

                          <div className="flex gap-1.5">
                            {candidate.review_status !== 'APPROVED' && (
                              <Button
                                size="sm"
                                onClick={() =>
                                  void handleReviewCandidate(
                                    candidate.id,
                                    'APPROVED',
                                    candidate.full_name
                                  )
                                }
                                disabled={busy}
                                className="bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold h-7 px-2.5"
                              >
                                Approve
                              </Button>
                            )}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => void inspectParticipant(candidate)}
                              className="border-slate-700 bg-slate-800 text-slate-300 text-[11px] h-7 px-2"
                            >
                              Inspect
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* FULL LEADERBOARD TABLE */}
              <div className="space-y-3">
                <h4 className="text-sm font-bold text-white">Full Results Leaderboard</h4>
                <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/60">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                      <tr>
                        <th className="p-3.5">Rank</th>
                        <th className="p-3.5">Student</th>
                        <th className="p-3.5">Score</th>
                        <th className="p-3.5">Time</th>
                        <th className="p-3.5">Review Status</th>
                        <th className="p-3.5 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {candidates.map((p, idx) => (
                        <tr key={p.id} className="hover:bg-slate-800/40">
                          <td className="p-3.5 font-mono font-bold text-slate-300">
                            #{p.rank || idx + 1}
                          </td>
                          <td className="p-3.5">
                            <strong className="text-white block">{p.full_name}</strong>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="text-[11px] text-slate-400">{p.email}</span>
                              <span
                                className={`inline-flex items-center rounded-full px-1.5 py-0.2 text-[9px] font-bold border ${
                                  p.mode === 'PRACTICE'
                                    ? 'bg-amber-950/80 text-amber-300 border-amber-800'
                                    : 'bg-indigo-950/80 text-indigo-300 border-indigo-800'
                                }`}
                              >
                                {p.mode === 'PRACTICE' ? 'Practice' : 'Competition'}
                              </span>
                            </div>
                          </td>
                          <td className="p-3.5 font-mono font-bold text-emerald-400">
                            {p.score} / {comp.question_count}
                          </td>
                          <td className="p-3.5 font-mono text-slate-300">
                            {p.completion_ms != null ? `${(p.completion_ms / 1000).toFixed(2)}s` : '—'}
                          </td>
                          <td className="p-3.5">
                            <span
                              className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                p.review_status === 'APPROVED'
                                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                                  : p.review_status === 'FLAGGED'
                                    ? 'bg-amber-950 text-amber-300 border border-amber-800'
                                    : 'bg-slate-800 text-slate-400'
                              }`}
                            >
                              {p.review_status}
                            </span>
                          </td>
                          <td className="p-3.5 text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => void inspectParticipant(p)}
                              className="border-slate-700 bg-slate-800 text-slate-200 text-xs min-h-7"
                            >
                              Inspect
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ── TAB 5: SETTINGS ─────────────────────────────────────────────── */}
          {tab === 'settings' && (
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 space-y-6">
              <div>
                <h3 className="text-base font-bold text-white">Competition Settings</h3>
                <p className="text-xs text-slate-400">
                  Settings are locked once a competition is launched to maintain fairness.
                </p>
              </div>

              <div className="grid sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-slate-400">Quiz Title</span>
                  <p className="mt-1 font-semibold text-white">{comp.title}</p>
                </div>
                <div>
                  <span className="text-slate-400">Status</span>
                  <p className="mt-1 font-semibold text-indigo-400">{comp.status}</p>
                </div>
                <div>
                  <span className="text-slate-400">Questions Count</span>
                  <p className="mt-1 font-semibold text-white">{comp.question_count} questions</p>
                </div>
                <div>
                  <span className="text-slate-400">Timer per Question</span>
                  <p className="mt-1 font-semibold text-white">{comp.seconds_per_question} seconds</p>
                </div>
              </div>

              {/* DANGER ZONE: DELETE QUIZ (CHUNKS 2, 5 & 6) */}
              {isAuthorizedAdmin && (
                <div className="rounded-2xl border border-rose-900/60 bg-rose-950/20 p-5 sm:p-6 space-y-3">
                  <div className="flex items-center gap-2 text-rose-400">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    <h4 className="text-sm font-bold text-rose-300">Danger Zone</h4>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Deleting this quiz will immediately revoke student access and remove it from active listings and the student dashboard. Historical attempt scores, winner records, and audit logs remain securely archived in the database.
                  </p>
                  <div className="pt-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-t border-rose-900/40">
                    <div className="text-xs text-slate-400">
                      Target: <strong className="text-white">{comp.title}</strong>
                    </div>
                    <Button
                      onClick={() => setQuizToDelete(comp)}
                      disabled={busy || isDeleting}
                      className="bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs min-h-10 px-4 rounded-xl shadow-lg shadow-rose-950/50 flex items-center gap-2"
                    >
                      <Trash2 className="h-4 w-4" />
                      <span>Delete This Quiz</span>
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* ── CREATE QUIZ MULTI-STEP WIZARD MODAL ────────────────────────────── */}
      {showCreateWizard && (
        <CreateQuizWizardModal
          onClose={() => setShowCreateWizard(false)}
          onCreated={async (newId) => {
            setShowCreateWizard(false);
            await loadCompetitions();
            setSelectedId(newId);
            setTab('questions');
          }}
        />
      )}

      {/* ── ADD / EDIT QUESTION MODAL ──────────────────────────────────────── */}
      {showQuestionModal && (
        <QuestionEditorModal
          question={editingQuestion}
          onClose={() => {
            setShowQuestionModal(false);
            setEditingQuestion(BLANK_QUESTION);
          }}
          onSave={handleSaveQuestion}
          busy={busy}
        />
      )}

      {/* ── PARTICIPANT INSPECTION MODAL ───────────────────────────────────── */}
      {inspectingParticipant && (
        <ParticipantInspectorModal
          participant={inspectingParticipant}
          timeline={participantTimeline}
          onClose={() => setInspectingParticipant(null)}
          onReview={(status) =>
            handleReviewCandidate(inspectingParticipant.id, status, inspectingParticipant.full_name)
          }
          reason={reviewReason}
          onReasonChange={setReviewReason}
          busy={busy}
        />
      )}

      {/* ── ALL QUIZZES MODAL (CHUNK 2) ─────────────────────────────────── */}
      {showAllQuizzesModal && (
        <AllQuizzesModal
          competitions={competitions}
          selectedId={selectedId}
          onSelect={(id) => {
            setSelectedId(id);
            setShowAllQuizzesModal(false);
          }}
          onDelete={(c) => {
            setShowAllQuizzesModal(false);
            setQuizToDelete(c);
          }}
          onClose={() => setShowAllQuizzesModal(false)}
          isAuthorizedAdmin={isAuthorizedAdmin}
          isDeleting={isDeleting}
        />
      )}

      {/* ── DELETE QUIZ CONFIRMATION DIALOG (CHUNK 3) ────────────────────────── */}
      {quizToDelete && (
        <AlertDialog
          open={!!quizToDelete}
          onOpenChange={(open) => {
            if (!open && !isDeleting) setQuizToDelete(null);
          }}
        >
          <AlertDialogContent className="border-rose-900/60 bg-slate-900 text-slate-100 rounded-3xl max-w-md shadow-2xl p-6">
            <AlertDialogHeader>
              <div className="flex items-center gap-2.5 text-rose-400 mb-1">
                <div className="grid h-9 w-9 place-items-center rounded-xl bg-rose-950/80 border border-rose-800/80">
                  <Trash2 className="h-5 w-5 text-rose-400" />
                </div>
                <AlertDialogTitle className="text-xl font-black text-white">Delete this quiz?</AlertDialogTitle>
              </div>
              <AlertDialogDescription className="text-slate-300 text-xs leading-relaxed mt-2">
                You are about to delete <strong className="text-white font-bold underline decoration-rose-500/50">{quizToDelete.title}</strong>. This quiz will no longer be visible or accessible to students. This action cannot be undone if permanent deletion is used.
              </AlertDialogDescription>
            </AlertDialogHeader>

            <div className="my-4 rounded-2xl border border-slate-800 bg-slate-950/70 p-3.5 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Quiz Title:</span>
                <span className="font-bold text-white truncate max-w-[220px]">{quizToDelete.title}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Status:</span>
                <span className="font-mono text-indigo-400 font-bold">{quizToDelete.status}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Questions:</span>
                <span className="text-slate-200">{quizToDelete.question_count} questions</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Identifier:</span>
                <span className="font-mono text-[11px] text-slate-500">{quizToDelete.id.slice(0, 8)}</span>
              </div>
            </div>

            <AlertDialogFooter className="flex-row justify-end gap-2.5 pt-2">
              <AlertDialogCancel
                disabled={isDeleting}
                onClick={() => setQuizToDelete(null)}
                className="border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs font-semibold rounded-xl min-h-10"
              >
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                disabled={isDeleting}
                onClick={(e) => {
                  e.preventDefault();
                  void handleDeleteQuiz();
                }}
                className="bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl min-h-10 px-4 shadow-lg shadow-rose-950/50 flex items-center gap-1.5"
              >
                {isDeleting ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    <span>Deleting…</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Delete Quiz</span>
                  </>
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {/* ── CONFIRMATION MODAL ─────────────────────────────────────────────── */}
      <AlertDialog
        open={confirmModal.isOpen}
        onOpenChange={(open) => {
          if (!open) setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        }}
      >
        <AlertDialogContent className="border-slate-800 bg-slate-900 text-slate-100 rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">{confirmModal.title}</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400 text-xs leading-relaxed">
              {confirmModal.description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={busy}
              className="border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={busy}
              onClick={(e) => {
                e.preventDefault();
                void confirmModal.action();
              }}
              className={
                confirmModal.destructive
                  ? 'bg-rose-600 hover:bg-rose-500 text-white font-bold'
                  : 'bg-indigo-600 hover:bg-indigo-500 text-white font-bold'
              }
            >
              {busy ? 'Processing…' : confirmModal.confirmLabel}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SUB-COMPONENT: ALL QUIZZES MANAGEMENT MODAL (CHUNK 2)
// ─────────────────────────────────────────────────────────────────────────────
function AllQuizzesModal({
  competitions,
  selectedId,
  onSelect,
  onDelete,
  onClose,
  isAuthorizedAdmin,
  isDeleting
}: {
  competitions: Competition[];
  selectedId: string;
  onSelect: (id: string) => void;
  onDelete: (comp: Competition) => void;
  onClose: () => void;
  isAuthorizedAdmin: boolean;
  isDeleting: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl max-h-[85vh] flex flex-col rounded-3xl border border-slate-800 bg-slate-900 text-slate-100 shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-indigo-600/30 text-indigo-400 border border-indigo-500/30">
              <Trophy className="h-4 w-4" />
            </span>
            <div>
              <h2 className="text-base font-bold text-white">All Quizzes</h2>
              <p className="text-xs text-slate-400">
                {competitions.length} quiz competition{competitions.length === 1 ? '' : 's'} in vault
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close All Quizzes"
            className="rounded-lg p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          {competitions.length === 0 ? (
            <div className="text-center py-10 space-y-2">
              <p className="text-sm font-semibold text-white">No active quizzes found.</p>
              <p className="text-xs text-slate-400">Create a quiz to get started.</p>
            </div>
          ) : (
            competitions.map((c) => {
              const isCurrent = c.id === selectedId;
              return (
                <div
                  key={c.id}
                  className={`rounded-2xl border p-4 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    isCurrent
                      ? 'border-indigo-500/60 bg-indigo-950/20 shadow-md'
                      : 'border-slate-800 bg-slate-950/60 hover:border-slate-700'
                  }`}
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="font-bold text-sm text-white truncate max-w-sm">{c.title}</h4>
                      <span className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide border bg-slate-800 text-slate-300 border-slate-700">
                        {c.status}
                      </span>
                      {isCurrent && (
                        <span className="rounded-full px-2 py-0.5 text-[10px] font-bold bg-indigo-600/30 text-indigo-300 border border-indigo-500/40">
                          Active Selection
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 pt-0.5">
                      <span>{c.question_count} questions</span>
                      <span>•</span>
                      <span>{c.seconds_per_question}s / question</span>
                      <span>•</span>
                      <span className="font-mono text-[11px] text-slate-500">ID: {c.id.slice(0, 8)}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800/80">
                    {!isCurrent && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          onSelect(c.id);
                          onClose();
                        }}
                        className="border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700 text-xs font-semibold h-8 px-3 rounded-xl"
                      >
                        Select
                      </Button>
                    )}
                    {isAuthorizedAdmin && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onDelete(c)}
                        disabled={isDeleting}
                        className="border-rose-900/60 bg-rose-950/40 text-rose-300 hover:bg-rose-900/60 hover:text-white text-xs font-bold h-8 px-3 rounded-xl flex items-center gap-1.5 transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5 text-rose-400" />
                        <span>Delete Quiz</span>
                      </Button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SUB-COMPONENT: CREATE QUIZ WIZARD (STEP 1 -> STEP 2 -> STEP 3)
// ─────────────────────────────────────────────────────────────────────────────
function CreateQuizWizardModal({
  onClose,
  onCreated
}: {
  onClose: () => void;
  onCreated: (newId: string) => void;
}) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [title, setTitle] = useState('Semester 1 Knowledge Challenge');
  const [description, setDescription] = useState(
    'A beginner-friendly revision test covering basic C programming, algorithms, computer fundamentals, and web technologies.'
  );
  const [questionCount, setQuestionCount] = useState(20);
  const [secondsPerQuestion, setSecondsPerQuestion] = useState(20);
  const [busy, setBusy] = useState(false);

  const handleFinishCreate = async () => {
    setBusy(true);
    try {
      const res = await quizCall<{ competition_id: string }>(
        'admin_create',
        {
          title,
          description
        },
        true
      );

      if (res?.competition_id) {
        // Apply settings & 20-slot blueprint
        const blueprint = generateSemester1Blueprint();
        await quizCall(
          'admin_save',
          {
            competition_id: res.competition_id,
            title,
            description,
            question_count: questionCount,
            seconds_per_question: secondsPerQuestion,
            blueprint
          },
          true
        );

        // Pre-populate with 84 beginner questions
        for (const q of SEMESTER_1_QUESTION_BANK) {
          await quizCall(
            'admin_question',
            {
              competition_id: res.competition_id,
              subject: q.subject,
              difficulty: q.difficulty,
              question_text: q.question_text,
              options: q.options,
              correct_index: q.correct_index,
              marks: q.marks
            },
            true
          );
        }

        toast.success('Quiz created with 84 beginner questions ready!');
        onCreated(res.competition_id);
      }

    } catch (e: any) {
      toast.error(e?.message || 'Failed to create quiz.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
      <div className="w-full max-w-xl rounded-3xl border border-slate-800 bg-slate-900 p-6 text-slate-100 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-5">
          <div className="flex items-center gap-2">
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-indigo-600/30 text-indigo-400 font-bold text-xs border border-indigo-500/30">
              {step}/3
            </span>
            <h2 className="text-base font-bold text-white">Create New Quiz Competition</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* STEP 1: BASIC DETAILS */}
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300">Quiz Title</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Semester 1 Knowledge Challenge"
                className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-xs text-white placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300">Description</label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Instructions or scope of the quiz..."
                className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2 text-xs text-white placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300">Questions in Attempt</label>
                <input
                  type="number"
                  min={1}
                  max={30}
                  value={questionCount}
                  onChange={(e) => setQuestionCount(Number(e.target.value))}
                  className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-xs text-white focus:border-indigo-500 focus:outline-none font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300">Seconds per Question</label>
                <input
                  type="number"
                  min={5}
                  max={60}
                  value={secondsPerQuestion}
                  onChange={(e) => setSecondsPerQuestion(Number(e.target.value))}
                  className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-xs text-white focus:border-indigo-500 focus:outline-none font-mono font-bold"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-slate-800 mt-6">
              <Button variant="ghost" onClick={onClose} className="text-xs text-slate-400">
                Cancel
              </Button>
              <Button
                onClick={() => setStep(2)}
                disabled={!title.trim()}
                className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-5"
              >
                Next: Configuration →
              </Button>
            </div>
          </div>
        )}

        {/* STEP 2: TIMING & BEHAVIOR */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 space-y-3">
              <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-emerald-400" />
                Built-in Competition Rules
              </h4>
              <ul className="text-xs text-slate-400 space-y-1.5 list-disc pl-4">
                <li>1 attempt enforced per authenticated student.</li>
                <li>One question at a time; no backward navigation.</li>
                <li>Server-authoritative timer: {secondsPerQuestion}s per question.</li>
                <li>Randomized question pool & randomized answer options.</li>
                <li>Top 3 approved winners receive the ₹299 offer.</li>
              </ul>
            </div>

            <div className="flex justify-between pt-4 border-t border-slate-800 mt-6">
              <Button variant="ghost" onClick={() => setStep(1)} className="text-xs text-slate-400">
                ← Back
              </Button>
              <Button
                onClick={() => setStep(3)}
                className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-5"
              >
                Next: Review Summary →
              </Button>
            </div>
          </div>
        )}

        {/* STEP 3: REVIEW & CREATE */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-5 space-y-2.5 text-xs">
              <h4 className="text-sm font-bold text-white">{title}</h4>
              <p className="text-slate-400">{description}</p>
              <div className="pt-2 border-t border-slate-800/80 grid grid-cols-2 gap-2 text-slate-300">
                <div>
                  <strong>Questions:</strong> {questionCount}
                </div>
                <div>
                  <strong>Time:</strong> {secondsPerQuestion}s each
                </div>
                <div>
                  <strong>Status:</strong> Draft (Ready to populate)
                </div>
                <div>
                  <strong>Reward:</strong> ₹299 for Top 3
                </div>
              </div>
            </div>

            <div className="flex justify-between pt-4 border-t border-slate-800 mt-6">
              <Button variant="ghost" onClick={() => setStep(2)} className="text-xs text-slate-400">
                ← Back
              </Button>
              <Button
                onClick={handleFinishCreate}
                disabled={busy}
                className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-6 shadow-md shadow-indigo-600/30"
              >
                {busy ? 'Creating Quiz…' : 'Create & Open Question Bank'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SUB-COMPONENT: QUESTION EDITOR MODAL
// ─────────────────────────────────────────────────────────────────────────────
function QuestionEditorModal({
  question,
  onClose,
  onSave,
  busy
}: {
  question: BankQuestion;
  onClose: () => void;
  onSave: (q: BankQuestion) => void;
  busy: boolean;
}) {
  const [form, setForm] = useState<BankQuestion>({ ...question });

  const handleOptionChange = (idx: number, val: string) => {
    const updated = [...form.options];
    updated[idx] = val;
    setForm({ ...form, options: updated });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
      <div className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-3xl border border-slate-800 bg-slate-900 p-6 text-slate-100 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
          <h3 className="text-base font-bold text-white">
            {form.id ? 'Edit Question' : 'Add New Question'}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSave(form);
          }}
          className="space-y-4 text-xs"
        >
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-300">Subject / Category</label>
              <select
                value={form.subject}
                onChange={(e) => setForm({ ...form, subject: e.target.value })}
                className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-slate-200 focus:outline-none"
              >
                {SUBJECTS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-300">Difficulty</label>
              <select
                value={form.difficulty}
                onChange={(e) => setForm({ ...form, difficulty: e.target.value })}
                className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-slate-200 focus:outline-none"
              >
                <option value="very_easy">Very Easy (Recommended)</option>
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>

            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-300">Question Text</label>
            <textarea
              required
              rows={3}
              value={form.question_text}
              onChange={(e) => setForm({ ...form, question_text: e.target.value })}
              placeholder="Type question text..."
              className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-white placeholder:text-slate-500 focus:outline-none"
            />
          </div>

          <div className="space-y-2">
            <label className="block font-semibold text-slate-300">
              Answer Options (Select the correct answer)
            </label>
            {form.options.map((opt, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  type="radio"
                  name="correct_index"
                  checked={form.correct_index === i}
                  onChange={() => setForm({ ...form, correct_index: i })}
                  className="h-4 w-4 accent-emerald-500 cursor-pointer"
                  title="Mark as correct answer"
                />
                <span className="font-bold text-slate-400 w-4">{String.fromCharCode(65 + i)}</span>
                <input
                  type="text"
                  required
                  value={opt}
                  onChange={(e) => handleOptionChange(i, e.target.value)}
                  placeholder={`Option ${String.fromCharCode(65 + i)}`}
                  className={`flex-1 rounded-xl border px-3 py-2 text-white focus:outline-none ${
                    form.correct_index === i
                      ? 'border-emerald-700 bg-emerald-950/30'
                      : 'border-slate-800 bg-slate-950'
                  }`}
                />
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-slate-800">
            <label className="flex items-center gap-2 cursor-pointer text-slate-300">
              <input
                type="checkbox"
                checked={form.active}
                onChange={(e) => setForm({ ...form, active: e.target.checked })}
                className="accent-indigo-600 rounded"
              />
              Active in question pool
            </label>

            <div className="flex gap-2">
              <Button type="button" variant="ghost" onClick={onClose} className="text-slate-400 text-xs">
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={busy}
                className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-5"
              >
                {busy ? 'Saving…' : 'Save Question'}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SUB-COMPONENT: PARTICIPANT TIMELINE & INSPECTION MODAL
// ─────────────────────────────────────────────────────────────────────────────
function ParticipantInspectorModal({
  participant,
  timeline,
  onClose,
  onReview,
  reason,
  onReasonChange,
  busy
}: {
  participant: Participant;
  timeline: Timeline | null;
  onClose: () => void;
  onReview: (status: 'APPROVED' | 'FLAGGED' | 'REJECTED') => void;
  reason: string;
  onReasonChange: (s: string) => void;
  busy: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl border border-slate-800 bg-slate-900 p-6 text-slate-100 shadow-2xl space-y-5">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div>
            <h3 className="text-base font-bold text-white">
              Participant Inspection: {participant.full_name}
            </h3>
            <p className="text-xs text-slate-400">{participant.email}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* METRICS STRIP */}
        <div className="grid grid-cols-3 gap-3 rounded-2xl border border-slate-800 bg-slate-950 p-4 text-xs font-mono">
          <div>
            <span className="text-slate-500">Score</span>
            <p className="text-base font-bold text-emerald-400">{participant.score} pts</p>
          </div>
          <div>
            <span className="text-slate-500">Completion Time</span>
            <p className="text-base font-bold text-slate-200">
              {participant.completion_ms != null
                ? `${(participant.completion_ms / 1000).toFixed(2)}s`
                : '—'}
            </p>
          </div>
          <div>
            <span className="text-slate-500">Risk Score</span>
            <p
              className={`text-base font-bold ${
                participant.risk_score >= 10 ? 'text-rose-400' : 'text-slate-300'
              }`}
            >
              {participant.risk_score} ({participant.tab_events} tab events)
            </p>
          </div>
        </div>

        {/* REVIEW ACTION BAR */}
        <div className="space-y-2 rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
          <label className="block text-xs font-semibold text-slate-300">
            Review Note / Decision Reason
          </label>
          <input
            type="text"
            value={reason}
            onChange={(e) => onReasonChange(e.target.value)}
            placeholder="Evidence verified, reason for approval or flagging..."
            className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white focus:outline-none"
          />
          <div className="flex gap-2 pt-2">
            <Button
              size="sm"
              onClick={() => onReview('APPROVED')}
              disabled={busy}
              className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold"
            >
              Approve Candidate
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onReview('FLAGGED')}
              disabled={busy}
              className="border-amber-700 bg-amber-950/60 text-amber-300 text-xs font-bold"
            >
              Flag for Review
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onReview('REJECTED')}
              disabled={busy}
              className="border-rose-700 bg-rose-950/60 text-rose-300 text-xs font-bold"
            >
              Reject
            </Button>
          </div>
        </div>

        {/* TIMELINE / ASSIGNMENTS */}
        {timeline ? (
          <div className="space-y-4 text-xs">
            <div>
              <h4 className="font-bold text-slate-200 mb-2">Assigned Questions & Responses</h4>
              <div className="space-y-2 max-h-56 overflow-y-auto">
                {timeline.assignments?.map((a) => (
                  <div key={a.id} className="rounded-xl border border-slate-800 bg-slate-950/80 p-3">
                    <div className="flex justify-between font-semibold text-slate-200">
                      <span>
                        Q{a.position}. {a.question_text}
                      </span>
                      <span className={a.earned_marks > 0 ? 'text-emerald-400' : 'text-slate-500'}>
                        {a.earned_marks} mark
                      </span>
                    </div>
                    <div className="mt-1.5 flex flex-wrap gap-2 text-[11px] text-slate-400">
                      <span>Status: {a.state}</span>
                      {a.submitted_at && <span>Submitted at {new Date(a.submitted_at).toLocaleTimeString()}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h4 className="font-bold text-slate-200 mb-2">Security Event Audit Trail</h4>
              <div className="space-y-1.5 max-h-40 overflow-y-auto font-mono text-[11px]">
                {timeline.events?.map((e) => (
                  <div
                    key={e.id}
                    className="flex justify-between rounded-lg bg-slate-950 px-2.5 py-1.5 border border-slate-800/80"
                  >
                    <span className="text-slate-300">{e.event_type}</span>
                    <span className="text-slate-500">
                      {new Date(e.created_at).toLocaleTimeString()} · {e.source}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <p className="text-xs text-slate-500 py-4 text-center">Loading participant timeline…</p>
        )}
      </div>
    </div>
  );
}
