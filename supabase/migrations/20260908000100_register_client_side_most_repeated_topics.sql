-- ==============================================================================
-- BCA VAULT: REGISTER CLIENT-SIDE WEB TECHNOLOGY MOST REPEATED TOPICS NOTE
-- Migration: 20260908000100_register_client_side_most_repeated_topics.sql
-- ==============================================================================

DO $$
DECLARE
  v_sem1_bundle_id uuid;
BEGIN
  -- Look up Semester 1 bundle
  SELECT id INTO v_sem1_bundle_id
  FROM public.bundles
  WHERE (title ILIKE '%sem%1%' OR title ILIKE '%semester 1%') AND published = TRUE
  LIMIT 1;

  IF v_sem1_bundle_id IS NULL THEN
    v_sem1_bundle_id := '5b36f72a-165c-4cd1-8458-d4f33fadd860';
  END IF;

  -- Register Client-Side Web Technology Most Repeated Topics Note
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
    'Most Repeated Topics — Client-Side Web Technology',
    'Client-Side Web Technology',
    1,
    'High-priority exam-oriented repeated topics and core concepts for Client-Side Web Technology (HTML, CSS, JavaScript).',
    'Bca_notes',
    'BCA SEM1/Client_Side_Web_Technologies_HTML_CSS_JS_Most_Repeated_Topics.pdf',
    TRUE,
    'high',
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
      priority = 'high',
      status = 'published',
      updated_at = NOW();

END $$;
