-- ==============================================================================
-- BCA Vault: Secure Quiz Deletion Feature & Lifecycle Hardening
-- ==============================================================================
-- Adds deleted_at support to quiz_competitions, soft-delete action in quiz_api,
-- and strict server-side authorization ensuring students cannot access or delete quizzes.
-- ==============================================================================

-- 1. Add deleted_at column to public.quiz_competitions if not exists
ALTER TABLE public.quiz_competitions
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;

-- 2. Partial index for active (non-deleted) competitions for fast retrieval
CREATE INDEX IF NOT EXISTS idx_quiz_competitions_active
  ON public.quiz_competitions (status, created_at DESC)
  WHERE deleted_at IS NULL;

-- 3. Replace public.quiz_api with full delete support, access checks, and audit logging
CREATE OR REPLACE FUNCTION public.quiz_api(p_action text, p_payload jsonb DEFAULT '{}'::jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
SET statement_timeout = '8s' AS $$
DECLARE
  u uuid := auth.uid();
  admin_ok boolean;
  c public.quiz_competitions;
  a public.quiz_attempts;
  q public.quiz_questions;
  aq public.quiz_attempt_questions;
  cid uuid;
  aid uuid;
  t timestamptz;
  n int;
  slot jsonb;
  picked uuid[] := '{}';
  opts jsonb;
  correct uuid;
  response jsonb;
  next_state text;
  rid uuid;
  campaign uuid;
  offset_n int;
BEGIN
  IF u IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Sign in to continue.');
  END IF;

  IF p_payload IS NULL OR jsonb_typeof(p_payload) <> 'object' OR octet_length(p_payload::text) > 20000 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid request.');
  END IF;

  -- Whitelist payload parameters including hard_delete & include_deleted
  IF EXISTS(
    SELECT 1 FROM jsonb_object_keys(p_payload) k
    WHERE k NOT IN (
      'competition_id', 'attempt_id', 'question_id', 'option_id', 'event_type',
      'title', 'description', 'start_at', 'end_at', 'blueprint', 'question_count',
      'seconds_per_question', 'risk_weights', 'status', 'id', 'subject', 'difficulty',
      'question_text', 'options', 'correct_index', 'marks', 'active', 'reason',
      'offset', 'hard_delete', 'include_deleted'
    )
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unexpected request fields.');
  END IF;

  -- Atomic fixed-window limiter keyed by authenticated identity
  t := clock_timestamp();
  INSERT INTO quiz_private.rate_limits AS r VALUES(u, t, 1)
  ON CONFLICT(user_id) DO UPDATE SET
    requests = CASE WHEN r.window_at < t - interval '10 seconds' THEN 1 ELSE r.requests + 1 END,
    window_at = CASE WHEN r.window_at < t - interval '10 seconds' THEN t ELSE r.window_at END
  RETURNING requests INTO n;

  IF n > 60 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Too many requests. Wait ten seconds.', 'code', 'RATE_LIMITED');
  END IF;

  admin_ok := public.is_active_admin();

  IF p_action LIKE 'admin_%' AND NOT admin_ok THEN
    RETURN jsonb_build_object('success', false, 'error', 'Administrator access required.');
  END IF;

  IF NOT admin_ok AND NOT EXISTS(SELECT 1 FROM public.profiles WHERE user_id = u) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Student profile required.');
  END IF;

  -- Competition list: students only see active non-deleted quizzes.
  -- Admin sees non-deleted by default; can pass include_deleted: true if needed.
  IF p_action IN ('list', 'admin_list') THEN
    SELECT coalesce(jsonb_agg(x ORDER BY x->>'created_at' DESC), '[]') INTO response FROM (
      SELECT jsonb_build_object(
        'id', id, 'title', title, 'description', description, 'status', status,
        'start_at', start_at, 'end_at', end_at, 'question_count', question_count,
        'seconds_per_question', seconds_per_question, 'created_at', created_at,
        'deleted_at', deleted_at
      ) x
      FROM public.quiz_competitions
      WHERE (
        deleted_at IS NULL OR
        (p_action = 'admin_list' AND admin_ok AND coalesce((p_payload->>'include_deleted')::boolean, false))
      )
      AND (status <> 'DRAFT' OR (p_action = 'admin_list' AND admin_ok))
      ORDER BY created_at DESC LIMIT 50
    ) s;
    RETURN jsonb_build_object('success', true, 'competitions', response, 'server_now', clock_timestamp());
  END IF;

  IF p_action = 'admin_create' THEN
    INSERT INTO public.quiz_competitions(title, description, blueprint)
    VALUES(
      coalesce(p_payload->>'title', 'Semester 1 Quiz'),
      coalesce(p_payload->>'description', 'Test your Semester 1 knowledge.'),
      '[{"subject":"C / Algorithms","difficulty":"easy","marks":1},{"subject":"C / Algorithms","difficulty":"medium","marks":1},{"subject":"Foundation of Computing","difficulty":"easy","marks":1},{"subject":"Foundation of Computing","difficulty":"medium","marks":1},{"subject":"Communication Skills","difficulty":"easy","marks":1},{"subject":"Client-Side Web Technologies","difficulty":"easy","marks":1},{"subject":"Client-Side Web Technologies","difficulty":"medium","marks":1}]'
    ) RETURNING id INTO cid;

    INSERT INTO public.activity_logs(actor_id, action, target_type, target_id)
    VALUES(u, 'QUIZ_CREATED', 'quiz', cid::text);

    RETURN jsonb_build_object('success', true, 'competition_id', cid);
  END IF;

  cid := nullif(p_payload->>'competition_id', '')::uuid;

  IF p_action = 'claim' AND cid IS NULL THEN
    SELECT w.competition_id INTO cid
    FROM public.quiz_winners w
    JOIN public.quiz_competitions cc ON cc.id = w.competition_id
    WHERE w.user_id = u
      AND cc.status = 'RESULTS_PUBLISHED'
      AND cc.deleted_at IS NULL
      AND NOT EXISTS(SELECT 1 FROM public.payment_submissions ps WHERE ps.coupon_redemption_id = w.redemption_id)
    ORDER BY w.approved_at DESC LIMIT 1;
  END IF;

  IF cid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Quiz ID is required.');
  END IF;

  -- Configuration mutations, starts, and deletes serialize
  IF p_action LIKE 'admin_%' OR p_action IN ('start', 'claim') THEN
    SELECT * INTO c FROM public.quiz_competitions WHERE id = cid FOR UPDATE;
  ELSE
    SELECT * INTO c FROM public.quiz_competitions WHERE id = cid FOR SHARE;
  END IF;

  -- Not found check
  IF c.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Competition unavailable.');
  END IF;

  -- Deleted check: strictly block student access to deleted quizzes
  IF c.deleted_at IS NOT NULL AND NOT admin_ok THEN
    RETURN jsonb_build_object('success', false, 'error', 'Competition unavailable.');
  END IF;

  -- Draft check: students cannot access drafts
  IF c.status = 'DRAFT' AND NOT admin_ok THEN
    RETURN jsonb_build_object('success', false, 'error', 'Competition unavailable.');
  END IF;

  -- ── ADMIN DELETE ACTION ─────────────────────────────────────────────────
  IF p_action = 'admin_delete' THEN
    IF c.deleted_at IS NOT NULL THEN
      RETURN jsonb_build_object('success', false, 'error', 'Quiz is already deleted.');
    END IF;

    -- Sync any active attempts before closing/deleting
    FOR aid IN SELECT id FROM public.quiz_attempts WHERE competition_id = cid AND status = 'ACTIVE' ORDER BY id LOOP
      PERFORM quiz_private.sync(aid);
    END LOOP;

    -- Permanent deletion branch (only permitted if zero attempts exist)
    IF coalesce((p_payload->>'hard_delete')::boolean, false) IS TRUE THEN
      IF EXISTS(SELECT 1 FROM public.quiz_attempts WHERE competition_id = cid) THEN
        RETURN jsonb_build_object(
          'success', false,
          'error', 'Cannot permanently delete a quiz with student attempts. Soft deletion must be used to preserve historical results.'
        );
      END IF;

      DELETE FROM public.quiz_questions WHERE competition_id = cid;
      DELETE FROM public.quiz_competitions WHERE id = cid;

      INSERT INTO public.activity_logs(actor_id, action, target_type, target_id, metadata)
      VALUES(u, 'QUIZ_PERMANENTLY_DELETED', 'quiz', cid::text, jsonb_build_object('title', c.title));

      RETURN jsonb_build_object('success', true, 'message', 'Quiz permanently deleted.', 'competition_id', cid);
    ELSE
      -- Default: Safe soft deletion preserves all attempts, questions, and rankings
      UPDATE public.quiz_competitions
      SET deleted_at = clock_timestamp(),
          status = CASE WHEN status IN ('OPEN', 'LIVE') THEN 'CLOSED' ELSE status END
      WHERE id = cid;

      INSERT INTO public.activity_logs(actor_id, action, target_type, target_id, metadata)
      VALUES(u, 'QUIZ_DELETED', 'quiz', cid::text, jsonb_build_object('title', c.title, 'status', c.status, 'deleted_at', clock_timestamp()));

      RETURN jsonb_build_object('success', true, 'message', 'Quiz deleted successfully.', 'competition_id', cid);
    END IF;

  ELSIF p_action = 'admin_save' THEN
    IF c.deleted_at IS NOT NULL THEN
      RETURN jsonb_build_object('success', false, 'error', 'Quiz has been deleted.');
    END IF;
    IF c.status <> 'DRAFT' THEN
      RETURN jsonb_build_object('success', false, 'error', 'Only drafts can be edited.');
    END IF;
    UPDATE public.quiz_competitions
    SET title = coalesce(p_payload->>'title', title),
        description = coalesce(p_payload->>'description', description),
        start_at = (p_payload->>'start_at')::timestamptz,
        end_at = (p_payload->>'end_at')::timestamptz,
        question_count = coalesce((p_payload->>'question_count')::int, question_count),
        seconds_per_question = coalesce((p_payload->>'seconds_per_question')::int, seconds_per_question),
        blueprint = coalesce(p_payload->'blueprint', blueprint),
        risk_weights = coalesce(p_payload->'risk_weights', risk_weights)
    WHERE id = cid;

  ELSIF p_action = 'admin_question' THEN
    IF c.deleted_at IS NOT NULL THEN
      RETURN jsonb_build_object('success', false, 'error', 'Quiz has been deleted.');
    END IF;
    IF c.status <> 'DRAFT' THEN
      RETURN jsonb_build_object('success', false, 'error', 'Question bank is frozen after scheduling.');
    END IF;
    IF jsonb_typeof(p_payload->'options') <> 'array' OR EXISTS(
      SELECT 1 FROM jsonb_array_elements(p_payload->'options') v
      WHERE jsonb_typeof(v) <> 'string' OR length(v#>>'{}') NOT BETWEEN 1 AND 500
    ) THEN
      RETURN jsonb_build_object('success', false, 'error', 'Four nonempty text options required.');
    END IF;

    IF p_payload->>'id' IS NOT NULL THEN
      UPDATE public.quiz_questions
      SET subject = p_payload->>'subject',
          difficulty = p_payload->>'difficulty',
          question_text = p_payload->>'question_text',
          options = p_payload->'options',
          correct_index = (p_payload->>'correct_index')::int,
          marks = (p_payload->>'marks')::int,
          active = coalesce((p_payload->>'active')::boolean, true)
      WHERE id = (p_payload->>'id')::uuid AND competition_id = cid;
      IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Question not found.');
      END IF;
    ELSE
      INSERT INTO public.quiz_questions(competition_id, subject, difficulty, question_text, options, correct_index, marks)
      VALUES(cid, p_payload->>'subject', p_payload->>'difficulty', p_payload->>'question_text', p_payload->'options', (p_payload->>'correct_index')::int, (p_payload->>'marks')::int);
    END IF;

  ELSIF p_action = 'admin_transition' THEN
    IF c.deleted_at IS NOT NULL THEN
      RETURN jsonb_build_object('success', false, 'error', 'Quiz has been deleted.');
    END IF;
    next_state := p_payload->>'status';
    IF NOT (
      (c.status = 'DRAFT' AND next_state = 'UPCOMING') OR
      (c.status = 'UPCOMING' AND next_state = 'OPEN') OR
      (c.status = 'OPEN' AND next_state = 'LIVE') OR
      (c.status IN ('OPEN', 'LIVE') AND next_state = 'CLOSED') OR
      (c.status = 'CLOSED' AND next_state = 'UNDER_REVIEW') OR
      (c.status = 'UNDER_REVIEW' AND next_state = 'RESULTS_PUBLISHED')
    ) THEN
      RETURN jsonb_build_object('success', false, 'error', 'Invalid competition transition.');
    END IF;

    IF next_state = 'UPCOMING' THEN
      IF c.start_at IS NULL OR c.end_at IS NULL OR c.end_at <= clock_timestamp() + make_interval(secs => c.question_count * c.seconds_per_question) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Set a valid schedule first.');
      END IF;
      IF EXISTS(
        SELECT 1 FROM jsonb_each(c.risk_weights) e
        WHERE jsonb_typeof(e.value) <> 'number'
           OR (e.value::text)::numeric NOT BETWEEN 0 AND 25
           OR (e.value::text)::numeric <> trunc((e.value::text)::numeric)
      ) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Risk weights must be integers from 0 to 25.');
      END IF;
      FOR slot IN SELECT value FROM jsonb_array_elements(c.blueprint) LOOP
        IF NOT (slot ?& array['subject', 'difficulty', 'marks']) OR (slot->>'marks')::int NOT BETWEEN 1 AND 10 THEN
          RETURN jsonb_build_object('success', false, 'error', 'Invalid blueprint slot.');
        END IF;
        SELECT count(*) INTO n FROM public.quiz_questions
        WHERE competition_id = cid AND active AND subject = slot->>'subject' AND difficulty = slot->>'difficulty' AND marks = (slot->>'marks')::int;
        IF n < 3 * (SELECT count(*) FROM jsonb_array_elements(c.blueprint) s WHERE s = slot) THEN
          RETURN jsonb_build_object('success', false, 'error', 'Each blueprint slot needs at least three eligible questions.');
        END IF;
      END LOOP;
    END IF;

    IF next_state IN ('CLOSED', 'UNDER_REVIEW', 'RESULTS_PUBLISHED') THEN
      FOR aid IN SELECT id FROM public.quiz_attempts WHERE competition_id = cid AND status = 'ACTIVE' ORDER BY id LOOP
        PERFORM quiz_private.sync(aid);
      END LOOP;
      IF next_state IN ('UNDER_REVIEW', 'RESULTS_PUBLISHED') AND EXISTS(SELECT 1 FROM public.quiz_attempts WHERE competition_id = cid AND status = 'ACTIVE') THEN
        RETURN jsonb_build_object('success', false, 'error', 'Wait for all active attempts to finish.');
      END IF;
    END IF;

    IF next_state = 'RESULTS_PUBLISHED' THEN
      IF EXISTS(SELECT 1 FROM public.quiz_attempts WHERE competition_id = cid AND review_status IN ('PENDING', 'FLAGGED')) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Review every attempt before publication.');
      END IF;
      IF EXISTS (
        SELECT 1 FROM (
          SELECT score, completion_ms, row_number() OVER(ORDER BY score DESC, completion_ms, id) rn
          FROM public.quiz_attempts WHERE competition_id = cid AND review_status = 'APPROVED'
        ) third
        JOIN (
          SELECT score, completion_ms, row_number() OVER(ORDER BY score DESC, completion_ms, id) rn
          FROM public.quiz_attempts WHERE competition_id = cid AND review_status = 'APPROVED'
        ) fourth ON third.score = fourth.score AND third.completion_ms = fourth.completion_ms
        WHERE third.rn = 3 AND fourth.rn = 4
      ) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Exact tie crosses the Top 3 boundary. Resolve the tied candidates with a documented review before publication.');
      END IF;

      INSERT INTO public.coupon_campaigns(max_redemptions, is_active) VALUES(3, true) RETURNING id INTO campaign;
      UPDATE public.quiz_competitions SET campaign_id = campaign WHERE id = cid;
      INSERT INTO public.quiz_winners(competition_id, user_id, attempt_id, rank, approved_by)
      SELECT cid, user_id, id, row_number() OVER(ORDER BY score DESC, completion_ms ASC, id)::int, u
      FROM public.quiz_attempts WHERE competition_id = cid AND review_status = 'APPROVED'
      ORDER BY score DESC, completion_ms ASC, id LIMIT 3;
    END IF;

    UPDATE public.quiz_competitions SET status = next_state WHERE id = cid;

  ELSIF p_action = 'admin_review' THEN
    IF c.deleted_at IS NOT NULL THEN
      RETURN jsonb_build_object('success', false, 'error', 'Quiz has been deleted.');
    END IF;
    IF c.status <> 'UNDER_REVIEW' OR p_payload->>'status' NOT IN ('APPROVED', 'REJECTED', 'FLAGGED') OR length(trim(coalesce(p_payload->>'reason', ''))) < 5 THEN
      RETURN jsonb_build_object('success', false, 'error', 'Review requires UNDER_REVIEW status and a reason of at least five characters.');
    END IF;
    UPDATE public.quiz_attempts
    SET review_status = p_payload->>'status',
        review_reason = left(p_payload->>'reason', 2000),
        reviewed_by = u,
        reviewed_at = clock_timestamp()
    WHERE id = (p_payload->>'attempt_id')::uuid AND competition_id = cid AND status <> 'ACTIVE';
    IF NOT FOUND THEN
      RETURN jsonb_build_object('success', false, 'error', 'Completed attempt not found.');
    END IF;

  ELSIF p_action = 'admin_detail' THEN
    FOR aid IN SELECT id FROM public.quiz_attempts WHERE competition_id = cid AND status = 'ACTIVE' AND deadline <= clock_timestamp() ORDER BY id LIMIT 500 LOOP
      PERFORM quiz_private.sync(aid);
    END LOOP;
    offset_n := greatest(0, least(coalesce((p_payload->>'offset')::int, 0), 100000));
    SELECT jsonb_build_object(
      'success', true,
      'competition', to_jsonb(c),
      'questions', (SELECT coalesce(jsonb_agg(x), '[]') FROM (SELECT * FROM public.quiz_questions WHERE competition_id = cid ORDER BY created_at, id LIMIT 500) x),
      'participants', (SELECT coalesce(jsonb_agg(x), '[]') FROM (
        SELECT att.*, p.full_name, p.email, p.semester, p.course,
          (SELECT count(*) FROM public.quiz_attempt_questions WHERE attempt_id = att.id AND state = 'TIMED_OUT') timeouts,
          (SELECT count(*) FROM public.quiz_events WHERE attempt_id = att.id AND event_type = 'TAB_HIDDEN') tab_events,
          count(*) OVER(PARTITION BY att.score, att.completion_ms) > 1 AS merit_tie,
          row_number() OVER(ORDER BY att.score DESC, att.completion_ms ASC NULLS LAST, att.id) AS rank
        FROM public.quiz_attempts att
        JOIN public.profiles p ON p.user_id = att.user_id
        WHERE att.competition_id = cid
        ORDER BY att.score DESC, att.completion_ms ASC NULLS LAST, att.id
        LIMIT 100 OFFSET offset_n
      ) x),
      'analytics', (SELECT jsonb_build_object(
        'total', count(*),
        'active', count(*) FILTER(WHERE status = 'ACTIVE' AND deadline > clock_timestamp()),
        'completed', count(*) FILTER(WHERE status <> 'ACTIVE' OR deadline <= clock_timestamp()),
        'average_score', avg(score),
        'highest_score', max(score),
        'lowest_score', min(score),
        'average_completion_ms', avg(completion_ms),
        'suspicious', count(*) FILTER(WHERE risk_score >= 10)
      ) FROM public.quiz_attempts WHERE competition_id = cid),
      'audit', (SELECT coalesce(jsonb_agg(x), '[]') FROM (
        SELECT action, actor_id, created_at, metadata
        FROM public.activity_logs
        WHERE target_type = 'quiz' AND target_id = cid::text
        ORDER BY created_at DESC LIMIT 100
      ) x)
    ) INTO response;
    RETURN response;

  ELSIF p_action = 'admin_timeline' THEN
    aid := (p_payload->>'attempt_id')::uuid;
    IF NOT EXISTS(SELECT 1 FROM public.quiz_attempts WHERE id = aid AND competition_id = cid) THEN
      RETURN jsonb_build_object('success', false, 'error', 'Attempt not found.');
    END IF;
    RETURN jsonb_build_object(
      'success', true,
      'events', (SELECT coalesce(jsonb_agg(x), '[]') FROM (SELECT * FROM public.quiz_events WHERE attempt_id = aid ORDER BY id LIMIT 1000) x),
      'assignments', (SELECT jsonb_agg(x ORDER BY position) FROM public.quiz_attempt_questions x WHERE attempt_id = aid)
    );

  ELSIF p_action = 'claim' THEN
    IF c.deleted_at IS NOT NULL OR c.status <> 'RESULTS_PUBLISHED' OR NOT EXISTS(SELECT 1 FROM public.quiz_winners WHERE competition_id = cid AND user_id = u) THEN
      RETURN jsonb_build_object('success', false, 'error', 'No published winner offer is available for this account.');
    END IF;
    SELECT redemption_id INTO rid FROM public.quiz_winners WHERE competition_id = cid AND user_id = u;
    IF EXISTS(SELECT 1 FROM public.payment_submissions WHERE coupon_redemption_id = rid) THEN
      RETURN jsonb_build_object('success', false, 'error', 'This winner offer has already been used.');
    END IF;
    IF rid IS NULL THEN
      INSERT INTO public.coupon_redemptions(campaign_id, user_id) VALUES(c.campaign_id, u)
      ON CONFLICT(campaign_id, user_id) DO UPDATE SET user_id = excluded.user_id RETURNING id INTO rid;
      UPDATE public.quiz_winners SET redemption_id = rid WHERE competition_id = cid AND user_id = u;
      INSERT INTO public.activity_logs(actor_id, action, target_type, target_id) VALUES(u, 'QUIZ_REWARD_CLAIMED', 'quiz', cid::text);
    END IF;
    RETURN jsonb_build_object('success', true, 'redemption_id', rid, 'final_price', 299);

  ELSE
    -- Student player actions
    IF p_action NOT IN ('detail', 'start', 'current', 'answer', 'event', 'submit') THEN
      RETURN jsonb_build_object('success', false, 'error', 'Unknown operation.');
    END IF;

    -- If competition was deleted, reject player action
    IF c.deleted_at IS NOT NULL THEN
      RETURN jsonb_build_object('success', false, 'error', 'Competition unavailable.');
    END IF;

    SELECT * INTO a FROM public.quiz_attempts WHERE competition_id = cid AND user_id = u FOR UPDATE;
    IF p_payload->>'attempt_id' IS NOT NULL AND (a.id IS NULL OR a.id <> (p_payload->>'attempt_id')::uuid) THEN
      RETURN jsonb_build_object('success', false, 'error', 'Attempt not found.');
    END IF;

    IF p_action = 'start' AND a.id IS NULL THEN
      t := clock_timestamp();
      IF admin_ok OR c.status NOT IN ('OPEN', 'LIVE') OR c.start_at IS NULL OR t < c.start_at OR t + make_interval(secs => c.question_count * c.seconds_per_question) > c.end_at THEN
        RETURN jsonb_build_object('success', false, 'error', 'Competition is not accepting new attempts.');
      END IF;
      INSERT INTO public.quiz_attempts(competition_id, user_id, started_at, deadline)
      VALUES(cid, u, t, t + make_interval(secs => c.question_count * c.seconds_per_question))
      RETURNING * INTO a;
      n := 0;
      FOR slot IN SELECT value FROM jsonb_array_elements(c.blueprint) ORDER BY random() LOOP
        SELECT * INTO q FROM public.quiz_questions
        WHERE competition_id = cid AND active AND subject = slot->>'subject' AND difficulty = slot->>'difficulty' AND marks = (slot->>'marks')::int AND NOT(id = ANY(picked))
        ORDER BY usage_count, random() LIMIT 1;
        IF q.id IS NULL THEN
          RAISE EXCEPTION 'Insufficient question pool';
        END IF;
        picked := array_append(picked, q.id);
        n := n + 1;
        SELECT jsonb_agg(jsonb_build_object('id', oid, 'text', value) ORDER BY shuffle),
               (array_agg(oid) FILTER(WHERE ord - 1 = q.correct_index))[1]
        INTO opts, correct
        FROM (SELECT value, ord, gen_random_uuid() oid, random() shuffle FROM jsonb_array_elements_text(q.options) WITH ORDINALITY e(value, ord)) s;

        INSERT INTO public.quiz_attempt_questions(attempt_id, question_id, position, question_text, subject, difficulty, options, correct_option, marks, state, started_at, deadline)
        VALUES(a.id, q.id, n, q.question_text, q.subject, q.difficulty, opts, correct, q.marks, CASE WHEN n = 1 THEN 'ACTIVE' ELSE 'PENDING' END, CASE WHEN n = 1 THEN t END, CASE WHEN n = 1 THEN t + make_interval(secs => c.seconds_per_question) END);
        UPDATE public.quiz_questions SET usage_count = usage_count + 1 WHERE id = q.id;
      END LOOP;
      PERFORM quiz_private.event(a.id, 'QUIZ_STARTED');
      PERFORM quiz_private.event(a.id, 'QUESTION_STARTED');
    END IF;

    IF a.id IS NULL THEN
      IF p_action NOT IN ('detail', 'current') THEN
        RETURN jsonb_build_object('success', false, 'error', 'Start the quiz first.');
      END IF;
      RETURN quiz_private.present(cid, u);
    END IF;

    PERFORM quiz_private.sync(a.id);
    SELECT * INTO a FROM public.quiz_attempts WHERE id = a.id;

    IF p_action = 'answer' THEN
      SELECT * INTO aq FROM public.quiz_attempt_questions WHERE id = (p_payload->>'question_id')::uuid AND attempt_id = a.id;
      IF aq.id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Question not found.');
      END IF;
      IF aq.state IN ('ANSWERED', 'TIMED_OUT') THEN
        PERFORM quiz_private.event(a.id, CASE WHEN aq.state = 'ANSWERED' THEN 'DUPLICATE_REQUEST' ELSE 'LATE_REQUEST' END);
        RETURN quiz_private.present(cid, u) || jsonb_build_object('answer_accepted', false, 'notice', 'This question is already locked.');
      END IF;
      t := clock_timestamp();
      IF a.status <> 'ACTIVE' OR aq.state <> 'ACTIVE' OR aq.position <> a.current_position OR t >= aq.deadline OR c.status NOT IN ('OPEN', 'LIVE', 'CLOSED') THEN
        RETURN jsonb_build_object('success', false, 'error', 'Question is no longer active.');
      END IF;
      IF NOT EXISTS(SELECT 1 FROM jsonb_array_elements(aq.options) v WHERE v->>'id' = p_payload->>'option_id') THEN
        RETURN jsonb_build_object('success', false, 'error', 'Invalid option.');
      END IF;
      UPDATE public.quiz_attempt_questions
      SET selected_option = (p_payload->>'option_id')::uuid,
          state = 'ANSWERED',
          submitted_at = t,
          earned_marks = CASE WHEN correct_option = (p_payload->>'option_id')::uuid THEN marks ELSE 0 END
      WHERE id = aq.id;
      PERFORM quiz_private.event(a.id, 'QUESTION_ANSWERED');
      PERFORM quiz_private.sync(a.id);

    ELSIF p_action = 'event' THEN
      IF a.status = 'ACTIVE' AND p_payload->>'event_type' IN (
        'TAB_HIDDEN', 'TAB_VISIBLE', 'WINDOW_BLUR', 'WINDOW_FOCUS',
        'FULLSCREEN_ENTER', 'FULLSCREEN_EXIT', 'COPY_ATTEMPT', 'PASTE_ATTEMPT',
        'CONTEXT_MENU_ATTEMPT', 'KEYBOARD_SHORTCUT_ATTEMPT', 'PAGE_REFRESH', 'NETWORK_RECONNECT'
      ) THEN
        IF (SELECT count(*) FROM public.quiz_events WHERE attempt_id = a.id AND source = 'browser') < 200 THEN
          PERFORM quiz_private.event(a.id, p_payload->>'event_type', 'browser');
        END IF;
      END IF;

    ELSIF p_action = 'submit' AND a.status = 'ACTIVE' THEN
      UPDATE public.quiz_attempt_questions
      SET state = 'TIMED_OUT',
          started_at = coalesce(started_at, a.deadline - make_interval(secs => c.seconds_per_question)),
          deadline = coalesce(deadline, a.deadline),
          submitted_at = coalesce(deadline, a.deadline)
      WHERE attempt_id = a.id AND state IN ('PENDING', 'ACTIVE');

      UPDATE public.quiz_attempts
      SET status = 'AUTO_SUBMITTED',
          completed_at = deadline,
          completion_ms = c.question_count * c.seconds_per_question * 1000,
          score = (SELECT coalesce(sum(earned_marks), 0) FROM public.quiz_attempt_questions WHERE attempt_id = a.id)
      WHERE id = a.id;
      PERFORM quiz_private.event(a.id, 'AUTO_SUBMITTED');
    END IF;

    RETURN quiz_private.present(cid, u);
  END IF;

  INSERT INTO public.activity_logs(actor_id, action, target_type, target_id, metadata)
  VALUES(u, upper(p_action), 'quiz', cid::text, jsonb_build_object('status', p_payload->>'status', 'attempt_id', p_payload->>'attempt_id', 'reason', p_payload->>'reason'));

  RETURN jsonb_build_object('success', true, 'competition_id', cid);
END $$;

REVOKE ALL ON FUNCTION public.quiz_api(text, jsonb) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.quiz_api(text, jsonb) TO authenticated;
