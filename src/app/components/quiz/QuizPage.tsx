import { Link, Navigate, useLocation, useParams } from 'react-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Trophy, Timer, ShieldCheck, ArrowRight, WifiOff } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { Button } from '../ui/button';
import { quizCall, quizCta, type Competition, type QuizState } from '@/lib/supabase/quizService';

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
    return () => { active = false; };
  }, [user]);

  const compId = competition?.id;
  let ctaText = 'Take the Quiz';
  let ctaLink = compId ? `/app/quiz/${compId}` : '/app/quiz';
  let ctaVariant: 'default' | 'outline' = 'default';

  if (detail) {
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
            <span>BCA Vault Quiz Competition</span>
            {competition && (
              <span className="rounded-full bg-blue-200/80 px-2 py-0.5 text-[10px] uppercase font-extrabold text-blue-900">
                {competition.status.replace(/_/g, ' ')}
              </span>
            )}
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Test your Semester 1 knowledge.
          </h2>
          <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
            A focused challenge. One attempt. Answer {questionCount} questions under server-authoritative timer. Top 3 verified winners unlock the exclusive ₹299 bundle offer.
          </p>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 pt-1">
            <span className="rounded-xl border border-slate-200 bg-white/90 px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs">
              ⚡ {questionCount} Questions
            </span>
            <span className="rounded-xl border border-slate-200 bg-white/90 px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs">
              ⏱️ {secondsEach} Seconds Each
            </span>
            <span className="rounded-xl border border-slate-200 bg-white/90 px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs">
              🎯 One Attempt
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
          <span className="text-[11px] text-slate-500 text-center lg:text-right font-medium">
            Fair server scoring · Anti-cheat verified
          </span>
        </div>
      </div>
    </section>
  );
}

export function QuizPage() {
 const {user, loading} = useAuth(); const location=useLocation();
 if (loading) return <div className="p-10" role="status">Loading your account…</div>;
 if (!user) return <Navigate to="/auth/login" state={{from:location}} replace/>;
 return <QuizContent key={user.id}/>;
}

function QuizContent() {
 const {competitionId}=useParams();
 const [competitions,setCompetitions]=useState<Competition[]>([]);
 const [state,setState]=useState<QuizState|null>(null); const [error,setError]=useState('');
 const [busy,setBusy]=useState(false); const [remaining,setRemaining]=useState(0); const [agreed,setAgreed]=useState(false);
 const [offline,setOffline]=useState(!navigator.onLine); const [loaded,setLoaded]=useState(false);
 const requestInFlight=useRef(false); const lastRequestAt=useRef(0); const countdown=useRef({at:0,ms:0}); const lastQuestion=useRef('');
 const active=state?.attempt?.status==='ACTIVE';
 const refresh=useCallback(async(action='current',payload:Record<string,unknown>={})=>{
  if (!competitionId || requestInFlight.current || (action==='current' && performance.now()-lastRequestAt.current<1000)) return;
  lastRequestAt.current=performance.now();
  requestInFlight.current=true; setBusy(true); const sent=performance.now();
  try {
   const next=await quizCall<QuizState>(action,{competition_id:competitionId,...payload});
   if (next.current_question) {
    // Subtract round-trip time conservatively; wall-clock changes cannot extend the display.
    const ms=Math.max(0,Date.parse(next.current_question.deadline)-Date.parse(next.server_now)-(performance.now()-sent));
    countdown.current={at:performance.now(),ms}; setRemaining(Math.ceil(ms/1000));
   }
   setState(next); setError(''); setLoaded(true);
  } catch(e) {setError(e instanceof Error?e.message:'Connection interrupted. The timer continues.');}
  finally {requestInFlight.current=false;setBusy(false);}
 },[competitionId]);
 useEffect(()=>{
  if(competitionId) {void refresh('detail'); return;}
  let cancelled=false;
  quizCall<{competitions:Competition[]}>('list').then(r=>{if(!cancelled){setCompetitions(r.competitions);setLoaded(true);}}).catch(e=>{if(!cancelled)setError(e.message);});
  return()=>{cancelled=true;};
 },[competitionId,refresh]);
 useEffect(()=>{
  if(!competitionId)return;
  const timer=setInterval(()=>{if(!document.hidden && navigator.onLine) void refresh();},active?2000:15000);
  return()=>clearInterval(timer);
 },[active,competitionId,refresh]);
 useEffect(()=>{
  if(!active)return;
  const id=setInterval(()=>{const ms=countdown.current.ms-(performance.now()-countdown.current.at);setRemaining(Math.max(0,Math.ceil(ms/1000)));if(ms<=0&&navigator.onLine)void refresh();},150);
  return()=>clearInterval(id);
 },[active,refresh]);
 const event=useCallback((event_type:string)=>{
  if(!competitionId || !active)return;
  void quizCall('event',{competition_id:competitionId,event_type}).catch(()=>undefined);
 },[competitionId,active]);
 useEffect(()=>{
  const online=()=>{setOffline(false);event('NETWORK_RECONNECT');void refresh();}; const off=()=>setOffline(true);
  window.addEventListener('online',online);window.addEventListener('offline',off);
  return()=>{window.removeEventListener('online',online);window.removeEventListener('offline',off);};
 },[event,refresh]);
 useEffect(()=>{
  if(!active)return;
  const visible=()=>{event(document.hidden?'TAB_HIDDEN':'TAB_VISIBLE');if(!document.hidden)void refresh();};
  const blur=()=>event('WINDOW_BLUR');const focus=()=>event('WINDOW_FOCUS');const full=()=>event(document.fullscreenElement?'FULLSCREEN_ENTER':'FULLSCREEN_EXIT');
  const key=(e:KeyboardEvent)=>{if((e.ctrlKey||e.metaKey)&&['c','v','u','s','p'].includes(e.key.toLowerCase())){e.preventDefault();event('KEYBOARD_SHORTCUT_ATTEMPT');}};
  document.addEventListener('visibilitychange',visible);document.addEventListener('fullscreenchange',full);window.addEventListener('blur',blur);window.addEventListener('focus',focus);window.addEventListener('keydown',key);
  if(!lastQuestion.current){event('PAGE_REFRESH');lastQuestion.current=state?.current_question?.id||'resumed';}
  return()=>{document.removeEventListener('visibilitychange',visible);document.removeEventListener('fullscreenchange',full);window.removeEventListener('blur',blur);window.removeEventListener('focus',focus);window.removeEventListener('keydown',key);};
 },[active,event,refresh,state?.current_question?.id]);
 const start=()=>{lastQuestion.current='started';void refresh('start');};
 const c=state?.competition;const question=state?.current_question;
 return <main className="min-h-screen bg-slate-50 px-4 py-6 sm:py-10"><div className="mx-auto max-w-3xl">
  <header className="mb-8 flex items-center justify-between gap-4"><Link to="/app/dashboard" className="text-sm font-semibold text-[#1E40AF]">← Dashboard</Link><span className="flex items-center gap-2 font-semibold text-slate-600"><Trophy className="h-5 w-5 text-amber-600"/> Quiz Competition</span></header>
  {offline&&<p role="alert" className="mb-4 rounded-xl bg-amber-50 border border-amber-200 p-4 text-amber-900 flex gap-2"><WifiOff/> You are offline. The server timer continues; reconnect to resume.</p>}
  {error&&<div role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-red-900">{error} <button className="underline font-semibold" onClick={()=>competitionId?void refresh('detail'):window.location.reload()}>Retry</button></div>}
  {!competitionId&&<><h1 className="text-3xl font-bold text-slate-900">Your next challenge</h1><p className="mt-3 mb-6 text-slate-600">Test what you know. Every competition has a balanced question set and independently reviewed results.</p>{!loaded&&!error&&<p role="status">Loading competitions…</p>}{loaded&&competitions.length===0&&<div className="bg-white border rounded-2xl p-8"><h2 className="text-xl font-bold">Coming soon</h2><p className="mt-2 text-slate-600">The next competition is being prepared. Check back here for the opening date.</p></div>}{competitions.map(item=><CompetitionCard key={item.id} competition={item}/>)}</>}
  {competitionId&&!state&&!error&&<p role="status">Loading competition…</p>}
  {c&&state&&<>
   {!active&&<div className="mb-6"><span className="rounded-full bg-blue-100 text-blue-900 px-3 py-1 text-xs font-bold">{c.status.replace(/_/g,' ')}</span><h1 className="mt-4 text-3xl font-bold text-slate-900">{c.title}</h1><p className="mt-3 text-slate-600">{c.description}</p><p className="mt-3 text-sm text-slate-500">{c.participants??0} participants · {c.active??0} currently active</p></div>}
   {!state.attempt&&<section className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8"><div className="grid grid-cols-3 gap-3 border-b pb-6 text-center">{[[c.question_count,'Questions'],[`${c.seconds_per_question}s`,'Each question'],['1','Attempt']].map(([value,label])=><div key={label}><strong className="block text-2xl text-[#1E40AF]">{value}</strong><span className="text-xs text-slate-600">{label}</span></div>)}</div><h2 className="font-bold text-lg mt-6 mb-3">Before you start</h2><ul className="list-disc pl-5 space-y-2 text-sm leading-relaxed text-slate-600"><li>One question at a time. Choosing an answer locks it and advances immediately.</li><li>You cannot go back. Unanswered questions time out automatically.</li><li>The {c.question_count*c.seconds_per_question}-second maximum timer continues through refreshes and network interruptions.</li><li>Tab switches and copy attempts are recorded for review. These signals alone do not prove cheating.</li><li>Final scores are available after official result publication.</li></ul><p className="mt-5 text-sm font-medium text-slate-800">Top 3 verified winners: ₹299 Semester 1 offer. Regular bundle: ₹349.</p>{c.start_at&&<p className="mt-3 text-sm text-slate-500">Opens {new Date(c.start_at).toLocaleString('en-IN')} · closes {c.end_at?new Date(c.end_at).toLocaleString('en-IN'):'—'}</p>}<label className="flex items-start gap-3 mt-6 text-sm text-slate-700"><input type="checkbox" className="mt-1 h-5 w-5" checked={agreed} onChange={e=>setAgreed(e.target.checked)}/> I understand the rules and am ready for my only attempt.</label><Button className="mt-5 min-h-12 w-full bg-[#1E40AF] text-white" disabled={!agreed||busy||offline||!['OPEN','LIVE'].includes(c.status)} onClick={start}>{busy?'Starting…':quizCta(state)}</Button></section>}
   {active&&question&&<section className="select-none rounded-2xl border bg-white p-5 sm:p-8 shadow-sm" onCopy={e=>{e.preventDefault();event('COPY_ATTEMPT');}} onPaste={e=>{e.preventDefault();event('PASTE_ATTEMPT');}} onContextMenu={e=>{e.preventDefault();event('CONTEXT_MENU_ATTEMPT');}}><div className="flex items-center justify-between gap-4"><span className="text-sm font-semibold text-slate-600">Question {question.position} of {c.question_count}</span><span role="timer" aria-label={`${remaining} seconds remaining`} className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xl font-bold tabular-nums ${remaining<=3?'bg-red-50 text-red-800':'bg-blue-50 text-[#1E40AF]'}`}><Timer className="h-5 w-5"/>{remaining}</span></div><div className="flex gap-2 mt-5" aria-label={`Progress ${question.position} of ${c.question_count}`}>{Array.from({length:c.question_count},(_,i)=><span key={i} className={`h-1.5 flex-1 rounded-full ${i<question.position?'bg-[#1E40AF]':'bg-slate-100'}`}/>)}</div><h1 className="text-xl sm:text-2xl font-semibold leading-relaxed my-8" aria-live="polite">{question.question_text}</h1><div className="space-y-3">{question.options.map((option,i)=><button key={option.id} disabled={busy||remaining===0||offline} onClick={()=>void refresh('answer',{question_id:question.id,option_id:option.id})} className="flex w-full items-center gap-4 rounded-xl border border-slate-200 p-4 min-h-16 text-left text-slate-800 hover:border-blue-500 hover:bg-blue-50 focus-visible:outline-2 focus-visible:outline-blue-600 disabled:opacity-50"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-sm font-bold">{String.fromCharCode(65+i)}</span><span>{option.text}</span></button>)}</div><p className="mt-5 text-xs text-slate-500" role="status">{remaining===0?'Time is up. Waiting for the next server question…':busy?'Saving your answer…':'Choose carefully. Your first accepted answer is final.'}</p><button className="mt-4 text-xs text-slate-500 underline" onClick={()=>{if(!document.fullscreenElement)void document.documentElement.requestFullscreen?.().catch(()=>undefined);}}>Enter fullscreen (optional)</button></section>}
   {state.attempt&&!active&&<section className="rounded-2xl border bg-white p-6 sm:p-8"><ShieldCheck className="h-10 w-10 text-emerald-600"/><h2 className="mt-4 text-2xl font-bold">{state.result?'Your results':'Quiz submitted'}</h2>{!state.result?<p className="mt-3 text-slate-600">Your attempt has been recorded. Final results will be announced after the competition closes and review is complete.</p>:<><div className="grid grid-cols-2 sm:grid-cols-4 gap-4 my-6">{[[`${state.result.score}/${state.result.total_marks}`,'Score'],[state.result.correct,'Correct'],[state.result.incorrect,'Incorrect'],[state.result.timeouts,'Timed out']].map(([v,l])=><div key={l} className="rounded-xl bg-slate-50 p-4"><strong className="block text-2xl">{v}</strong><span className="text-xs text-slate-600">{l}</span></div>)}</div><p className="text-sm text-slate-600">Completion time: {(state.result.completion_ms/1000).toFixed(2)} seconds.</p>{state.winner?<div className="mt-6 rounded-xl bg-amber-50 p-5"><h3 className="font-bold text-amber-900">🏆 Top 3 Winner · Place {state.winner.rank}</h3><p className="mt-2 text-sm text-amber-900">Your account has unlocked the ₹299 Semester 1 offer.</p><Button asChild className="mt-4 bg-[#1E40AF] text-white"><Link to="/purchase?quizReward=1">Claim ₹299 Offer</Link></Button></div>:<div className="mt-6 border-t pt-5"><p className="text-slate-700">Thank you for taking part. Keep building your Semester 1 knowledge.</p><Button asChild variant="outline" className="mt-4 min-h-12"><Link to="/purchase">Get Semester 1 Bundle · ₹349</Link></Button></div>}</>}</section>}
  </>}
  <p className="mt-8 text-xs leading-relaxed text-slate-500">Browser-based anti-cheat uses layered deterrence and detection. It is not an absolute guarantee against cheating. Activity signals support human review.</p>
 </div></main>;
}
function CompetitionCard({competition}:{competition:Competition}) {
 const [detail,setDetail]=useState<QuizState|null>(null);
 useEffect(()=>{let live=true;void quizCall<QuizState>('detail',{competition_id:competition.id}).then(s=>{if(live)setDetail(s);}).catch(()=>undefined);return()=>{live=false;};},[competition.id]);
 return <article className="mb-4 rounded-2xl border bg-white p-6"><p className="text-xs font-bold text-[#1E40AF]">{competition.status.replace(/_/g,' ')}</p><h2 className="mt-2 text-xl font-bold">{competition.title}</h2><p className="mt-2 text-sm text-slate-600">{competition.question_count} questions · {competition.seconds_per_question} seconds each · One attempt</p><Button asChild className="mt-5 min-h-12 bg-[#1E40AF] text-white"><Link to={`/app/quiz/${competition.id}`}>{detail?quizCta(detail):'View Competition'}</Link></Button></article>;
}
