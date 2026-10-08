import fs from 'node:fs';
import { SEMESTER_1_QUESTION_BANK, generateSemester1Blueprint } from '../src/lib/quiz/semester1QuestionBank.ts';

const blueprint = generateSemester1Blueprint();
const questions = SEMESTER_1_QUESTION_BANK;

console.log(`Loaded ${questions.length} questions.`);
console.log(`Blueprint has ${blueprint.length} slots:`);
console.log(`- Very Easy: ${blueprint.filter(b => b.difficulty === 'very_easy').length}`);
console.log(`- Easy: ${blueprint.filter(b => b.difficulty === 'easy').length}`);

const sql = `-- ==============================================================================
-- BCA Vault: Semester 1 Beginner-Friendly Knowledge Challenge Seed
-- ==============================================================================
-- 72 Very Easy & Easy Questions across:
--   1. Algorithms and Program Design using C
--   2. Foundation of Computing
--   3. Client-Side Web Technologies
--
-- Blueprint: 20 Questions (15 Very Easy + 5 Easy) randomly mixed on each attempt.
-- Time: 20 seconds per question.
-- ==============================================================================

-- Update difficulty constraint to support 'very_easy'
ALTER TABLE public.quiz_questions DROP CONSTRAINT IF EXISTS quiz_questions_difficulty_check;
ALTER TABLE public.quiz_questions ADD CONSTRAINT quiz_questions_difficulty_check
  CHECK (difficulty = ANY (ARRAY['very_easy'::text, 'easy'::text, 'medium'::text, 'hard'::text]));

DO $quiz_seed$

DECLARE
  cid uuid;
  blueprint_json jsonb := '${JSON.stringify(blueprint).replaceAll("'", "''")}'::jsonb;
  questions_json jsonb := '${JSON.stringify(questions).replaceAll("'", "''")}'::jsonb;
BEGIN
  -- Look for existing competition
  SELECT id INTO cid FROM public.quiz_competitions WHERE title = 'Semester 1 Knowledge Challenge' LIMIT 1;

  IF cid IS NULL THEN
    INSERT INTO public.quiz_competitions (
      title,
      description,
      question_count,
      seconds_per_question,
      blueprint,
      status
    ) VALUES (
      'Semester 1 Knowledge Challenge',
      'A beginner-friendly revision test covering basic C programming, algorithms, computer fundamentals, and web technologies.',
      20,
      20,
      blueprint_json,
      'OPEN'
    ) RETURNING id INTO cid;
  ELSE
    -- Reset test attempts and events for clean student participation
    DELETE FROM public.quiz_events WHERE attempt_id IN (SELECT id FROM public.quiz_attempts WHERE competition_id = cid);
    DELETE FROM public.quiz_attempt_questions WHERE attempt_id IN (SELECT id FROM public.quiz_attempts WHERE competition_id = cid);
    DELETE FROM public.quiz_winners WHERE competition_id = cid;
    DELETE FROM public.quiz_attempts WHERE competition_id = cid;

    -- Update competition metadata & blueprint
    UPDATE public.quiz_competitions
    SET
      description = 'A beginner-friendly revision test covering basic C programming, algorithms, computer fundamentals, and web technologies.',
      question_count = 20,
      seconds_per_question = 20,
      blueprint = blueprint_json,
      status = 'OPEN',
      start_at = COALESCE(start_at, clock_timestamp() - interval '1 minute'),
      end_at = COALESCE(end_at, clock_timestamp() + interval '30 days')
    WHERE id = cid;
  END IF;

  -- Refresh questions pool with 72 beginner-friendly questions
  DELETE FROM public.quiz_questions WHERE competition_id = cid;

  INSERT INTO public.quiz_questions (
    competition_id,
    subject,
    difficulty,
    question_text,
    options,
    correct_index,
    marks,
    active
  )
  SELECT
    cid,
    (q->>'subject')::text,
    (q->>'difficulty')::text,
    (q->>'question_text')::text,
    (q->'options')::jsonb,
    (q->>'correct_index')::int,
    (q->>'marks')::int,
    true
  FROM jsonb_array_elements(questions_json) AS q;

  RAISE NOTICE 'Successfully seeded 72 beginner questions for competition %', cid;
END $quiz_seed$;
`;

fs.writeFileSync('supabase/migrations/20261008223000_beginner_semester1_quiz_pool.sql', sql);
console.log('Written migration: supabase/migrations/20261008223000_beginner_semester1_quiz_pool.sql');
