import { supabase, adminSupabase } from '@/lib/supabase/client';
export interface Competition { id: string; title: string; description: string; status: string; start_at: string | null; end_at: string | null; question_count: number; seconds_per_question: number; participants?: number; active?: number; blueprint?: BlueprintSlot[]; risk_weights?: Record<string, number> }
export interface BlueprintSlot { subject: string; difficulty: string; marks: number }
export interface QuizQuestion { id: string; position: number; question_text: string; options: {id: string; text: string}[]; started_at: string; deadline: string }
export interface Attempt { id: string; status: string; current_position: number; started_at: string; deadline: string; completed_at: string | null }
export interface QuizState { success: boolean; server_now: string; competition: Competition; attempt: Attempt | null; current_question: QuizQuestion | null; result: {score: number; total_marks: number; completion_ms: number; correct: number; incorrect: number; timeouts: number; review_status: string} | null; winner: {rank: number; redemption_id: string | null} | null; notice?: string }
export async function quizCall<T>(action: string, payload: Record<string, unknown> = {}, admin = false): Promise<T> {
 const {data, error} = await (admin ? adminSupabase : supabase).rpc('quiz_api', {p_action: action, p_payload: payload});
 if (error) throw new Error(error.code === 'PGRST202' ? 'Quiz setup is not available yet. Please try again later.' : error.message);
 if (!data?.success) throw new Error(data?.error || 'Unable to complete this quiz request.');
 return data as T;
}
export function quizCta(s: QuizState): string {
 if (s.winner) return 'Claim ₹299 Offer';
 if (s.competition.status === 'RESULTS_PUBLISHED') return 'View Results';
 if (s.attempt) return s.attempt.status === 'ACTIVE' ? 'Resume Quiz' : 'View Submission';
 if (s.competition.status === 'UNDER_REVIEW' || s.competition.status === 'CLOSED') return 'Results Under Review';
 return ['OPEN','LIVE'].includes(s.competition.status) ? 'Take the Quiz' : 'Coming Soon';
}
