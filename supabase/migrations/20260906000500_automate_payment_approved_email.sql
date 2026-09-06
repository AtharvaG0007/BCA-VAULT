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

    v_amount_text := CASE 
      WHEN v_payment.amount IS NULL THEN '₹0'
      WHEN (v_payment.amount::text) LIKE '₹%' THEN v_payment.amount::text
      ELSE '₹' || v_payment.amount::text
    END;

    -- 9. Render fixed email subject
    v_subject := 'BCA Vault — Payment Approved & Access Activated';

    -- 10. Render deterministic fixed plain-text body
    v_text_body := 'Hi ' || v_student_name || E',\n\n' ||
      E'Your payment for BCA Vault has been successfully verified and approved.\n\n' ||
      E'Payment Details\n\n' ||
      E'• Student: ' || v_student_name || E'\n' ||
      E'• Email: ' || v_student_email || E'\n' ||
      E'• Payment Reference: ' || v_payment_reference || E'\n' ||
      E'• Amount Paid: ' || v_amount_text || E'\n' ||
      E'• Payment Status: Approved\n\n' ||
      E'Access Details\n\n' ||
      E'• Bundle: ' || v_bundle_title || E'\n' ||
      E'• Access Status: Activated\n' ||
      E'• Your BCA Vault resources are now available in your account.\n\n' ||
      E'You can now log in to BCA Vault and access your assigned study materials.\n\n' ||
      E'Regards,\n\n' ||
      E'BCA Vault Team\n' ||
      E'bcavault07@gmail.com';

    -- 11. Render clean equivalent HTML body (with HTML escaping)
    v_html_body := '<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>BCA Vault — Payment Approved &amp; Access Activated</title></head>' ||
      '<body style="margin: 0; padding: 0; background-color: #0b0f19; font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, Helvetica, Arial, sans-serif; color: #f3f4f6;">' ||
      '<table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #0b0f19; padding: 40px 16px;">' ||
      '<tr><td align="center">' ||
      '<table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 580px; background-color: #111827; border: 1px solid #1f2937; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.5);">' ||
      '<tr><td style="padding: 28px 32px 20px; background: linear-gradient(135deg, #1e1b4b 0%, #0f172a 100%); border-bottom: 1px solid #1f2937;">' ||
      '<table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0"><tr>' ||
      '<td><span style="font-size: 20px; font-weight: 800; letter-spacing: -0.5px; color: #ffffff;">BCA <span style="color: #6366f1;">VAULT</span></span></td>' ||
      '<td align="right"><span style="display: inline-block; padding: 4px 12px; font-size: 11px; font-weight: 700; color: #10b981; background-color: rgba(16, 185, 129, 0.12); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 9999px; text-transform: uppercase; letter-spacing: 0.5px;">Approved</span></td>' ||
      '</tr></table>' ||
      '<h1 style="margin: 20px 0 0; font-size: 20px; font-weight: 700; color: #ffffff; line-height: 1.3;">Payment Approved &amp; Access Activated</h1>' ||
      '</td></tr>' ||
      '<tr><td style="padding: 32px;">' ||
      '<p style="margin: 0 0 16px; font-size: 15px; line-height: 1.6; color: #e5e7eb;">Hi <strong style="color: #ffffff;">' || public.escape_html(v_student_name) || '</strong>,</p>' ||
      '<p style="margin: 0 0 24px; font-size: 14px; line-height: 1.6; color: #9ca3af;">Your payment for BCA Vault has been successfully verified and approved.</p>' ||
      '<div style="margin-bottom: 20px; background-color: #1a2234; border: 1px solid #283548; border-radius: 8px; padding: 18px 20px;">' ||
      '<h2 style="margin: 0 0 14px; font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #818cf8;">Payment Details</h2>' ||
      '<table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="font-size: 13px; line-height: 1.8;">' ||
      '<tr><td style="color: #9ca3af; width: 42%; padding: 3px 0;">• Student:</td><td style="color: #f3f4f6; font-weight: 600; padding: 3px 0;">' || public.escape_html(v_student_name) || '</td></tr>' ||
      '<tr><td style="color: #9ca3af; padding: 3px 0;">• Email:</td><td style="color: #f3f4f6; padding: 3px 0;">' || public.escape_html(v_student_email) || '</td></tr>' ||
      '<tr><td style="color: #9ca3af; padding: 3px 0;">• Payment Reference:</td><td style="color: #f3f4f6; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; padding: 3px 0;">' || public.escape_html(v_payment_reference) || '</td></tr>' ||
      '<tr><td style="color: #9ca3af; padding: 3px 0;">• Amount Paid:</td><td style="color: #34d399; font-weight: 700; padding: 3px 0;">' || public.escape_html(v_amount_text) || '</td></tr>' ||
      '<tr><td style="color: #9ca3af; padding: 3px 0;">• Payment Status:</td><td style="color: #10b981; font-weight: 700; padding: 3px 0;">Approved</td></tr>' ||
      '</table></div>' ||
      '<div style="margin-bottom: 24px; background-color: #1a2234; border: 1px solid #283548; border-radius: 8px; padding: 18px 20px;">' ||
      '<h2 style="margin: 0 0 14px; font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #818cf8;">Access Details</h2>' ||
      '<table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="font-size: 13px; line-height: 1.8;">' ||
      '<tr><td style="color: #9ca3af; width: 42%; padding: 3px 0;">• Bundle:</td><td style="color: #f3f4f6; font-weight: 600; padding: 3px 0;">' || public.escape_html(v_bundle_title) || '</td></tr>' ||
      '<tr><td style="color: #9ca3af; padding: 3px 0;">• Access Status:</td><td style="color: #10b981; font-weight: 700; padding: 3px 0;">Activated</td></tr>' ||
      '</table>' ||
      '<p style="margin: 12px 0 0; font-size: 13px; color: #9ca3af; line-height: 1.5;">• Your BCA Vault resources are now available in your account.</p>' ||
      '</div>' ||
      '<p style="margin: 0 0 24px; font-size: 14px; line-height: 1.6; color: #e5e7eb;">You can now log in to BCA Vault and access your assigned study materials.</p>' ||
      '<table role="presentation" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 28px;"><tr>' ||
      '<td align="center" style="border-radius: 6px; background-color: #4f46e5;">' ||
      '<a href="https://bca-vault.portalbcavault.workers.dev" target="_blank" style="display: inline-block; padding: 12px 24px; font-size: 14px; font-weight: 600; color: #ffffff; text-decoration: none; border-radius: 6px;">Go to BCA Vault</a>' ||
      '</td></tr></table>' ||
      '<div style="border-top: 1px solid #1f2937; padding-top: 20px; font-size: 13px; line-height: 1.6; color: #9ca3af;">' ||
      '<p style="margin: 0;">Regards,<br><strong style="color: #ffffff;">BCA Vault Team</strong><br><a href="mailto:bcavault07@gmail.com" style="color: #818cf8; text-decoration: none;">bcavault07@gmail.com</a></p>' ||
      '</div></td></tr></table></td></tr></table></body></html>';

    -- 12. Construct authoritative verified payment payload (clean: no PDF receipt fields)
    v_email_payload := jsonb_build_object(
      'payment_id', v_payment.id,
      'user_id', v_target_user_id,
      'bundle_id', v_payment.bundle_id,
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
