-- ==============================================================================
-- BCA VAULT: REGISTER SEMESTER 1 EXAM ANSWER WRITING GUIDE NOTE
-- Migration: 20260913000200_register_exam_answer_writing_guide.sql
-- ==============================================================================

DO $$
DECLARE
  v_sem1_bundle_id uuid;
BEGIN
  -- Look up Semester 1 bundle
  SELECT id INTO v_sem1_bundle_id
  FROM public.bundles
  WHERE id = '5b36f72a-165c-4cd1-8458-d4f33fadd860'
  LIMIT 1;

  IF v_sem1_bundle_id IS NULL THEN
    SELECT id INTO v_sem1_bundle_id
    FROM public.bundles
    WHERE (title ILIKE '%sem%1%' OR title ILIKE '%semester 1%') AND published = TRUE
    LIMIT 1;
  END IF;

  IF v_sem1_bundle_id IS NULL THEN
    v_sem1_bundle_id := '5b36f72a-165c-4cd1-8458-d4f33fadd860';
  END IF;

  -- Register Exam Answer Writing Guide Note
  INSERT INTO public.notes (
    bundle_id,
    title,
    subject,
    semester,
    description,
    storage_bucket,
    storage_path,
    published,
    priority,
    status
  )
  VALUES (
    v_sem1_bundle_id,
    'BCA Vault — How to Write Answers in Exams',
    'BCA Semester 1 Exam Preparation',
    1,
    'A simple guide to writing clear and well-structured answers in BCA Semester 1 exams, including theory answers, programming questions, short notes, examples, diagrams, presentation and answer-writing techniques.',
    'Bca_notes',
    'BCA SEM1/BCA_Vault_How_to_Write_Answers_in_Exams.pdf',
    TRUE,
    'critical',
    'published'
  )
  ON CONFLICT (storage_path) DO UPDATE
    SET
      bundle_id = EXCLUDED.bundle_id,
      title = EXCLUDED.title,
      subject = EXCLUDED.subject,
      semester = EXCLUDED.semester,
      description = EXCLUDED.description,
      storage_bucket = EXCLUDED.storage_bucket,
      published = TRUE,
      priority = 'critical',
      status = 'published',
      updated_at = NOW();

END $$;
