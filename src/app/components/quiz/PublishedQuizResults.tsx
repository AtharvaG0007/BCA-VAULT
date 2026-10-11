import { useEffect, useState } from 'react';
import { Trophy, Medal, Award, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';

type Winner = { rank: number; display_name: string; score: number; total_marks: number };
type MyResult = { score: number; total_marks: number; review_status: string; rank: number } | null;
type PublishedPayload = { success: boolean; error?: string; winners: Winner[]; my_result: MyResult };

export function PublishedQuizResults({ competitionId }: { competitionId: string }) {
  const [data, setData] = useState<PublishedPayload | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const { data: response, error: rpcError } = await supabase.rpc('get_quiz_published_results', {
          p_competition_id: competitionId,
        });
        if (rpcError) throw rpcError;
        if (!response?.success) throw new Error(response?.error || 'Published results are unavailable.');
        if (active) setData(response as PublishedPayload);
      } catch (e) {
        if (active) setError(e instanceof Error ? e.message : 'Could not load published results.');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [competitionId]);

  if (loading) return <section className="my-6 rounded-2xl border border-slate-200 bg-white p-5" role="status"><Loader2 className="inline h-4 w-4 animate-spin mr-2" />Loading published results…</section>;
  if (error) return <section className="my-6 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900"><strong>Results are published, but could not be loaded.</strong><p className="mt-1">{error}</p><button className="mt-2 underline font-semibold" onClick={() => window.location.reload()}>Refresh page</button></section>;
  if (!data) return null;

  return (
    <section className="my-6 space-y-4" aria-labelledby="published-results-title">
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
        <div className="flex items-center gap-2 text-emerald-900"><Trophy className="h-6 w-6" /><span className="text-xs font-extrabold uppercase tracking-wider">Results Published</span></div>
        <h2 id="published-results-title" className="mt-2 text-2xl font-extrabold text-slate-900">Semester 1 Knowledge Challenge Results</h2>
        {data.my_result ? (
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="rounded-xl border border-white bg-white p-4"><span className="text-xs text-slate-500">Your score</span><strong className="mt-1 block text-2xl text-slate-900">{data.my_result.score}/{data.my_result.total_marks}</strong></div>
            <div className="rounded-xl border border-white bg-white p-4"><span className="text-xs text-slate-500">Your rank</span><strong className="mt-1 block text-2xl text-slate-900">#{data.my_result.rank}</strong></div>
            <div className="rounded-xl border border-white bg-white p-4 col-span-2 sm:col-span-1"><span className="text-xs text-slate-500">Review status</span><strong className="mt-1 block text-base text-emerald-800">{data.my_result.review_status.replace(/_/g, ' ')}</strong></div>
          </div>
        ) : <p className="mt-3 text-sm text-slate-700">Your account has no approved attempt for this competition.</p>}
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
        <h3 className="flex items-center gap-2 text-lg font-extrabold text-slate-900"><Medal className="h-5 w-5 text-amber-500" /> Top 3 Winners</h3>
        {data.winners.length ? <ol className="mt-4 space-y-3">{data.winners.map((winner) => <li key={winner.rank} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-amber-100 text-amber-900 font-extrabold">{winner.rank === 1 ? <Trophy className="h-5 w-5" /> : winner.rank === 2 ? <Medal className="h-5 w-5" /> : <Award className="h-5 w-5" />}</span><div className="min-w-0 flex-1"><p className="font-bold text-slate-900">{winner.display_name}</p><p className="text-xs text-slate-500">Place {winner.rank}</p></div><strong className="text-sm text-emerald-800">{winner.score}/{winner.total_marks}</strong></li>)}</ol> : <p className="mt-3 text-sm text-slate-600">No approved winners were found.</p>}
        <p className="mt-4 text-xs text-slate-500">Only approved scores and public winner names are shown. Private student details are not displayed.</p>
      </div>
    </section>
  );
}
