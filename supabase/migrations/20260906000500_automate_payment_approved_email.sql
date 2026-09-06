-- ==============================================================================
-- Migration: 20260906000500_automate_payment_approved_email.sql
-- Description:
--   Automates payment-approved transactional email generation directly inside
--   public.review_payment_submission().
--
-- Key changes:
--   1. Fixed deterministic email template rendered with authoritative DB values.
--   2. Subject, plain-text body, and HTML body pre-rendered into public.email_outbox.
--   3. Removed obsolete PDF receipt metadata ('receipt_filename') from outbox payload.
--   4. Eliminates Gemini/AI dependency for transactional payment confirmation.
--   5. Idempotent outbox insertion: preserves already-sent records on retry.
--   6. Transactional integrity: email draft is only queued after payment approval,
--      profile activation, bundle access, combo access, and referral qualification succeed.
-- ==============================================================================

-- Safe HTML entity escaping helper for transactional emails
CREATE OR REPLACE FUNCTION public.escape_html(p_text text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public, pg_temp
AS $$
  SELECT replace(
    replace(
      replace(
        replace(
          replace(COALESCE(p_text, ''), '&', '&amp;'),
          '<', '&lt;'
        ),
        '>', '&gt;'
      ),
      '"', '&quot;'
    ),
    '''', '&#39;'
  );
$$;

REVOKE ALL ON FUNCTION public.escape_html(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.escape_html(text) TO authenticated, service_role;

-- Update review_payment_submission with automated fixed-template email queuing
CREATE OR REPLACE FUNCTION public.review_payment_submission(
  p_payment_id uuid,
  p_status public.payment_status,
  p_admin_notes text,
  p_verified_by uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_payment public.payment_submissions;
  v_target_user_id uuid;
  v_student_name text;
  v_student_email text;
  v_bundle public.bundles;
  v_bundle_title text := 'BCA Vault Bundle';
  v_course text := 'BCA';
  v_sem1_bundle_id uuid;
  v_sem2_bundle_id uuid;
  v_is_sem1_eligible boolean := false;
  v_event_key text;
  v_payment_reference text;
  v_amount_text text;
  v_subject text;
  v_text_body text;
  v_html_body text;
  v_email_payload jsonb;
  v_verified_at timestamptz;
BEGIN
  -- 1. Validate payment review status
  IF p_status NOT IN ('approved', 'rejected') THEN
    RAISE EXCEPTION 'Invalid payment review status';
  END IF;

  -- 2. Validate Super Admin authorization
  IF NOT EXISTS (
    SELECT 1 FROM public.admin_profiles
    WHERE user_id = p_verified_by AND role = 'superadmin' AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'Super Admin access required';
  END IF;

  -- 3. Atomically acquire pending payment record
  SELECT * INTO v_payment
  FROM public.payment_submissions
  WHERE id = p_payment_id AND status = 'pending'
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Payment submission is not pending';
  END IF;

  -- 4. If user_id is null, attempt to link with existing profile by email
  v_target_user_id := v_payment.user_id;
  IF v_target_user_id IS NULL THEN
    SELECT user_id INTO v_target_user_id
    FROM public.profiles
    WHERE LOWER(email) = LOWER(v_payment.email)
    LIMIT 1;
  END IF;

  v_verified_at := NOW();

  -- 5. Update payment submission status
  UPDATE public.payment_submissions
  SET
    status = p_status,
    user_id = COALESCE(v_payment.user_id, v_target_user_id),
    verified_by = p_verified_by,
    verified_at = v_verified_at,
    admin_notes = NULLIF(TRIM(p_admin_notes), '')
  WHERE id = v_payment.id;

  -- 6. Execute access and email workflow on approval
  IF p_status = 'approved' AND v_target_user_id IS NOT NULL THEN
    -- Automatically activate student account in public.profiles
    UPDATE public.profiles
    SET status = 'active'::public.account_status, updated_at = NOW()
    WHERE user_id = v_target_user_id;

    -- Grant access permission to the designated bundle for the student
    IF v_payment.bundle_id IS NOT NULL THEN
      INSERT INTO public.access_permissions (user_id, bundle_id, status, granted_by, granted_at, expires_at)
      VALUES (v_target_user_id, v_payment.bundle_id, 'active', p_verified_by, NOW(), NULL)
      ON CONFLICT (user_id, bundle_id) DO UPDATE
        SET status = 'active', granted_by = EXCLUDED.granted_by, granted_at = EXCLUDED.granted_at, expires_at = NULL;
    END IF;

    -- Look up bundle title
    SELECT * INTO v_bundle FROM public.bundles WHERE id = v_payment.bundle_id;
    IF FOUND AND v_bundle.title IS NOT NULL THEN
      v_bundle_title := v_bundle.title;
    END IF;

    -- If bundle title implies "Complete" / "Both" / "All Semesters", grant access to Semester 1 and Semester 2 bundles
    IF FOUND AND (v_bundle.title ILIKE '%complete%' OR v_bundle.title ILIKE '%both%' OR v_bundle.title ILIKE '%all%') THEN
      FOR v_sem1_bundle_id IN (
        SELECT id FROM public.bundles
        WHERE published = TRUE AND (title ILIKE '%sem%1%' OR title ILIKE '%semester 1%')
      ) LOOP
        INSERT INTO public.access_permissions (user_id, bundle_id, status, granted_by, granted_at, expires_at)
        VALUES (v_target_user_id, v_sem1_bundle_id, 'active', p_verified_by, NOW(), NULL)
        ON CONFLICT (user_id, bundle_id) DO UPDATE
          SET status = 'active', granted_by = EXCLUDED.granted_by, granted_at = EXCLUDED.granted_at, expires_at = NULL;
      END LOOP;

      FOR v_sem2_bundle_id IN (
        SELECT id FROM public.bundles
        WHERE published = TRUE AND (title ILIKE '%sem%2%' OR title ILIKE '%semester 2%')
      ) LOOP
        INSERT INTO public.access_permissions (user_id, bundle_id, status, granted_by, granted_at, expires_at)
        VALUES (v_target_user_id, v_sem2_bundle_id, 'active', p_verified_by, NOW(), NULL)
        ON CONFLICT (user_id, bundle_id) DO UPDATE
          SET status = 'active', granted_by = EXCLUDED.granted_by, granted_at = EXCLUDED.granted_at, expires_at = NULL;
      END LOOP;
    END IF;

    -- Check if payment is an eligible Semester 1 qualifying purchase for referral reward
    IF v_payment.semester = 1 
       OR v_payment.bundle_id = '5b36f72a-165c-4cd1-8458-d4f33fadd860' 
       OR (v_bundle.title IS NOT NULL AND (v_bundle.title ILIKE '%sem%1%' OR v_bundle.title ILIKE '%semester 1%')) THEN
      v_is_sem1_eligible := true;
    END IF;

    -- If qualifying purchase, qualify pending referral and unlock reward for referrer
    IF v_is_sem1_eligible THEN
      PERFORM public.qualify_referral_on_payment_approval(v_target_user_id);
    END IF;

    -- 7. Resolve authoritative student name and email
    SELECT COALESCE(NULLIF(TRIM(full_name), ''), v_payment.full_name, 'Student'),
           COALESCE(NULLIF(TRIM(email), ''), v_payment.email)
    INTO v_student_name, v_student_email
    FROM public.profiles
    WHERE user_id = v_target_user_id;

    IF v_student_email IS NULL OR v_student_email = '' THEN
      v_student_email := v_payment.email;
    END IF;
    IF v_student_name IS NULL OR v_student_name = '' THEN
      v_student_name := COALESCE(NULLIF(TRIM(v_payment.full_name), ''), 'Student');
    END IF;

    -- 8. Resolve authoritative payment reference and amount
    v_payment_reference := COALESCE(NULLIF(TRIM(v_payment.reference_id), ''), NULLIF(TRIM(v_payment.utr), ''), v_payment.id::text);

    IF v_payment.course IS NOT NULL AND TRIM(v_payment.course) <> '' THEN
      v_course := TRIM(v_payment.course);
    END IF;

    v_amount_text := CASE 
      WHEN v_payment.amount IS NULL THEN '₹0'
      WHEN (v_payment.amount::text) LIKE '₹%' THEN v_payment.amount::text
      ELSE '₹' || v_payment.amount::text
    END;

    -- 9. Render fixed email subject
    v_subject := 'BCA Vault — Payment Approved & Access Activated';

    -- 10. Render deterministic fixed plain-text body
    v_text_body := 'Dear ' || v_student_name || E',\n\n' ||
      E'We are pleased to inform you that your payment has been successfully approved.\n\n' ||
      E'Payment Details\n\n' ||
      E'• Course: ' || v_course || E'\n' ||
      E'• Bundle: ' || v_bundle_title || E'\n' ||
      E'• Amount: ' || v_amount_text || E'\n' ||
      E'• Status: Approved\n\n' ||
      E'Thank you for choosing BCA Vault for your studies.\n\n' ||
      E'Warm regards,\n\n' ||
      E'BCA Vault Team';

    -- 11. Render clean equivalent HTML body (with HTML escaping)
    v_html_body := '<div style="font-family: Arial, sans-serif; color: #333333; line-height: 1.6; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">' || E'\n' ||
      '  <h2 style="color: #2e7d32; margin-top: 0;">Payment Approved</h2>' || E'\n\n' ||
      '  <p>Dear ' || public.escape_html(v_student_name) || ',</p>' || E'\n\n' ||
      '  <p>We are pleased to inform you that your payment has been successfully approved.</p>' || E'\n\n' ||
      '  <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">' || E'\n' ||
      '    <p style="margin: 5px 0;"><strong>Course:</strong> ' || public.escape_html(v_course) || '</p>' || E'\n' ||
      '    <p style="margin: 5px 0;"><strong>Bundle:</strong> ' || public.escape_html(v_bundle_title) || '</p>' || E'\n' ||
      '    <p style="margin: 5px 0;"><strong>Amount:</strong> ' || public.escape_html(v_amount_text) || '</p>' || E'\n' ||
      '    <p style="margin: 5px 0;">' || E'\n' ||
      '      <strong>Status:</strong>' || E'\n' ||
      '      <span style="color: #2e7d32; font-weight: bold;">Approved</span>' || E'\n' ||
      '    </p>' || E'\n' ||
      '  </div>' || E'\n\n' ||
      '  <p>Thank you for choosing BCA Vault for your studies.</p>' || E'\n\n' ||
      '  <p style="margin-bottom: 0;">' || E'\n' ||
      '    Warm regards,<br>' || E'\n' ||
      '    <strong>BCA Vault Team</strong>' || E'\n' ||
      '  </p>' || E'\n' ||
      '</div>';

    -- 12. Construct authoritative verified payment payload (clean: no PDF receipt fields)
    v_email_payload := jsonb_build_object(
      'payment_id', v_payment.id,
      'user_id', v_target_user_id,
      'bundle_id', v_payment.bundle_id,
      'course', v_course,
      'semester', v_payment.semester,
      'student_name', v_student_name,
      'student_email', v_student_email,
      'payment_reference', v_payment_reference,
      'amount_paid', v_amount_text,
      'bundle_name', v_bundle_title,
      'approved_at', v_verified_at,
      'verified_by', p_verified_by,
      'access_granted', true
    );

    -- 13. Deterministically upsert pending email draft into public.email_outbox
    v_event_key := 'payment-approved:' || v_payment.id;
    INSERT INTO public.email_outbox (
      event_key,
      event_type,
      recipient_user_id,
      recipient_email,
      sender_name,
      sender_email,
      status,
      subject,
      html_body,
      text_body,
      payload,
      approved_at,
      approved_by,
      created_at
    )
    VALUES (
      v_event_key,
      'payment_approved',
      v_target_user_id,
      v_student_email,
      'BCA Vault',
      'bcavault07@gmail.com',
      'pending',
      v_subject,
      v_html_body,
      v_text_body,
      v_email_payload,
      v_verified_at,
      p_verified_by,
      NOW()
    )
    ON CONFLICT (event_key) DO UPDATE
      SET payload = EXCLUDED.payload,
          recipient_email = EXCLUDED.recipient_email,
          recipient_user_id = EXCLUDED.recipient_user_id,
          subject = EXCLUDED.subject,
          text_body = EXCLUDED.text_body,
          html_body = EXCLUDED.html_body
      WHERE public.email_outbox.status != 'sent';
  END IF;

  RETURN jsonb_build_object(
    'id', v_payment.id,
    'reference_id', v_payment.reference_id,
    'user_id', v_target_user_id,
    'status', p_status,
    'verified_at', v_verified_at,
    'verified_by', p_verified_by,
    'bundle_id', v_payment.bundle_id,
    'semester', v_payment.semester
  );
END;
$$;

REVOKE ALL ON FUNCTION public.review_payment_submission(uuid, public.payment_status, text, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.review_payment_submission(uuid, public.payment_status, text, uuid) TO service_role;
