import fs from 'node:fs';
function edit(path,fn){const s=fs.readFileSync(path,'utf8');fs.writeFileSync(path,fn(s));}
edit('src/app/App.tsx',s=>s.replace('const HomePage = lazy','const QuizPage = lazy(() => import("./components/quiz/QuizPage").then(m => ({default:m.QuizPage})));\nconst HomePage = lazy').replace('  const isStudentRoute =','  const isQuizRoute = location.pathname.startsWith("/app/quiz");\n  const isStudentRoute =').replace('{isStudentRoute && <StudentAdminNotice />}', '{isStudentRoute && !isQuizRoute && <StudentAdminNotice />}').replace('{!isAdminRoute && <WhatsAppFloatingButton />}', '{!isAdminRoute && !isQuizRoute && <WhatsAppFloatingButton />}').replace('              <Route path="/app/dashboard"', '              <Route path="/app/quiz" element={<QuizPage />} />\n              <Route path="/app/quiz/:competitionId" element={<QuizPage />} />\n              <Route path="/app/dashboard"'));
edit('src/app/components/dashboards/StudentDashboard.tsx',s=>'import { QuizDiscovery } from "../quiz/QuizPage";\n'+s.replace('            {message && (','            <QuizDiscovery />\n            {message && ('));
edit('src/app/components/pages/HomePage.tsx',s=>'import { QuizDiscovery } from "../quiz/QuizPage";\n'+s.replace('      <SocialProof />','      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8"><QuizDiscovery /></div>\n      <SocialProof />'));
edit('src/app/components/dashboards/SuperAdminDashboard.tsx',s=>s.replace('import { useEffect, useState, useCallback }','import { lazy, Suspense, useEffect, useState, useCallback }').replace('const PAGES = [','const AdminQuizManagement = lazy(() => import("../quiz/AdminQuizManagement").then(m => ({default:m.AdminQuizManagement})));\n\nconst PAGES = [\n  { key: "quiz", label: "Quiz Management", icon: ClipboardCheck, group: "CONTENT" },').replace('  const loadData = async () => {','  const loadData = async () => {\n    if (activeTab === "quiz") { setLoading(false); setError(""); return; }').replace('        {loading && !Object.keys(data).length ? (','        {activeTab === "quiz" && <Suspense fallback={<p>Loading quiz management…</p>}><AdminQuizManagement /></Suspense>}\n        {loading && !Object.keys(data).length ? ('));
edit('src/app/components/pages/PaymentPage.tsx',s=>{
 s='import { quizCall } from "@/lib/supabase/quizService";\n'+s;
 s=s.replace('  const [winnerCodeInput, setWinnerCodeInput] = useState("");','').replace('    setWinnerCodeInput("");','');
 const start=s.indexOf('  /**\n   * Redeem winner code');const crlfStart=s.indexOf('  /**\r\n   * Redeem winner code');const begin=start>=0?start:crlfStart;const end=s.indexOf('  const handleApplyReferral',begin);
 if(begin<0||end<0)throw Error('Missing payment handler');
 s=s.slice(0,begin)+`  const handleClaimWinner = async () => {
    setWinnerError(null);
    if (!user) { setWinnerError("Sign in with your winning account to check eligibility."); return; }
    setWinnerRedeeming(true);
    try {
      const data = await quizCall<{redemption_id:string}>('claim');
      setWinnerRedemptionId(data.redemption_id);
    } catch (error) { setWinnerError(error instanceof Error ? error.message : "Unable to check reward eligibility."); }
    finally { setWinnerRedeeming(false); }
  };

`+s.slice(end);
 const bs=s.indexOf('            {/* Winner Code Redemption');const be=s.indexOf('            {/* Referral Identifier',bs);
 if(bs<0||be<0)throw Error('Missing winner UI');
 s=s.slice(0,bs)+`            <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <h3 className="flex items-center gap-2 font-bold text-amber-900"><Trophy className="h-4 w-4" /> Top 3 Quiz Winner Offer</h3>
              <p className="mt-2 text-sm text-amber-900">After official results are published, verified winners can unlock ₹299 using their winning account.</p>
              {winnerRedemptionId ? <p className="mt-3 text-sm font-semibold text-emerald-800">Winner offer verified · ₹299</p> : <button type="button" disabled={winnerRedeeming} onClick={() => void handleClaimWinner()} className="mt-3 min-h-11 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{winnerRedeeming ? "Checking…" : "Check My Winner Offer"}</button>}
              {winnerError && <p role="alert" className="mt-3 text-sm text-red-800">{winnerError}</p>}
            </div>

`+s.slice(be);
 return s;
});
edit('src/app/components/viewer/hooks/usePdfDocument.ts',s=>s.replace(/^.*@ts-expect-error[^\r\n]*\r?\n/m,''));
// The migration is still unshipped: strengthen it before database validation.
edit('supabase/migrations/20261008150239_secure_quiz_competitions.sql',s=>s.replace(" insert into public.coupon_campaigns(max_redemptions,is_active) values(3,true) returning id into campaign;",` if exists (
 select 1 from (select score,completion_ms,row_number() over(order by score desc,completion_ms,id) rn from public.quiz_attempts where competition_id=cid and review_status='APPROVED') third
 join (select score,completion_ms,row_number() over(order by score desc,completion_ms,id) rn from public.quiz_attempts where competition_id=cid and review_status='APPROVED') fourth on third.score=fourth.score and third.completion_ms=fourth.completion_ms
 where third.rn=3 and fourth.rn=4) then return jsonb_build_object('success',false,'error','Exact tie crosses the Top 3 boundary. Resolve the tied candidates with a documented review before publication.'); end if;
 insert into public.coupon_campaigns(max_redemptions,is_active) values(3,true) returning id into campaign;`));
const packageFile=JSON.parse(fs.readFileSync('package.json','utf8'));
packageFile.scripts['test:quiz']='node scripts/test_quiz_database.mjs';
packageFile.scripts['typecheck:edge']='tsc -p supabase/functions/tsconfig.json --noEmit';
fs.writeFileSync('package.json',JSON.stringify(packageFile,null,2)+'\n');
