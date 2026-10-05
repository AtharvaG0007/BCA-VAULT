-- ==============================================================================
-- Migration: 20260915000100_secure_winner_coupons_and_redemptions.sql
-- Description: Synchronizes local schema with production secure coupon architecture.
--              Implements hashed winner coupons, one-per-user redemptions,
--              and payment submission linkage with RLS enforcement.
-- ==============================================================================

-- 1. Create winner_coupons table (stores hashed coupon secret codes)
CREATE TABLE IF NOT EXISTS public.winner_coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code_hash TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL DEFAULT 'Top 3 Quiz Winner Special Access (₹299)',
  discount_amount NUMERIC(10, 2) NOT NULL DEFAULT 50.00,
  target_price NUMERIC(10, 2) NOT NULL DEFAULT 299.00,
  max_redemptions INT NOT NULL DEFAULT 100,
  times_redeemed INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Create winner_redemptions table (tracks per-user verified redemptions)
CREATE TABLE IF NOT EXISTS public.winner_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id UUID REFERENCES public.winner_coupons(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  target_price NUMERIC(10, 2) NOT NULL DEFAULT 299.00,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'consumed', 'expired', 'revoked')),
  used_in_submission_id TEXT,
  redeemed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  consumed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_winner_redemption_user_coupon UNIQUE (coupon_id, user_id)
);

-- 3. Add winner_redemption_id column to payment_submissions if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'payment_submissions'
      AND column_name = 'winner_redemption_id'
  ) THEN
    ALTER TABLE public.payment_submissions
      ADD COLUMN winner_redemption_id UUID REFERENCES public.winner_redemptions(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 4. Enable RLS on both tables
ALTER TABLE public.winner_coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.winner_redemptions ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies
-- winner_coupons: only service_role and superadmin can view/modify
DROP POLICY IF EXISTS "winner_coupons_admin_access" ON public.winner_coupons;
CREATE POLICY "winner_coupons_admin_access" ON public.winner_coupons
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_profiles
      WHERE admin_profiles.user_id = auth.uid()
        AND admin_profiles.role IN ('admin', 'superadmin')
        AND admin_profiles.status = 'active'
    )
  );

-- winner_redemptions: user can view their own redemptions; admins can view all
DROP POLICY IF EXISTS "winner_redemptions_user_select" ON public.winner_redemptions;
CREATE POLICY "winner_redemptions_user_select" ON public.winner_redemptions
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.admin_profiles
      WHERE admin_profiles.user_id = auth.uid()
        AND admin_profiles.role IN ('admin', 'superadmin')
        AND admin_profiles.status = 'active'
    )
  );

-- 6. RPC: redeem_winner_coupon
-- Verifies secret coupon code against hashed DB records, ensures 1 redemption per user,
-- returns valid redemption_id for use in checkout.
CREATE OR REPLACE FUNCTION public.redeem_winner_coupon(p_coupon_code TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
  v_user_id UUID;
  v_user_email TEXT;
  v_code_clean TEXT;
  v_code_hash TEXT;
  v_coupon RECORD;
  v_existing RECORD;
  v_redemption_id UUID;
BEGIN
  -- Authenticate caller
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Authentication required to redeem winner coupons.');
  END IF;

  SELECT email INTO v_user_email FROM auth.users WHERE id = v_user_id;

  -- Clean and hash input coupon
  v_code_clean := upper(trim(p_coupon_code));
  IF length(v_code_clean) < 4 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid coupon code format.');
  END IF;

  v_code_hash := encode(digest(v_code_clean, 'sha256'), 'hex');

  -- Find active coupon
  SELECT * INTO v_coupon
  FROM public.winner_coupons
  WHERE code_hash = v_code_hash
    AND is_active = true
    AND (expires_at IS NULL OR expires_at > now())
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid, expired, or deactivated coupon code.');
  END IF;

  -- Check max redemptions
  IF v_coupon.times_redeemed >= v_coupon.max_redemptions THEN
    RETURN jsonb_build_object('success', false, 'error', 'This winner coupon has reached its maximum redemption limit.');
  END IF;

  -- Check if user already has an active or consumed redemption for this coupon
  SELECT * INTO v_existing
  FROM public.winner_redemptions
  WHERE coupon_id = v_coupon.id
    AND user_id = v_user_id;

  IF FOUND THEN
    IF v_existing.status = 'consumed' THEN
      RETURN jsonb_build_object('success', false, 'error', 'You have already used this winner code for a previous purchase.');
    ELSE
      -- Return existing active redemption
      RETURN jsonb_build_object(
        'success', true,
        'redemption_id', v_existing.id,
        'target_price', v_existing.target_price,
        'message', 'Winner code verified.'
      );
    END IF;
  END IF;

  -- Create new redemption
  INSERT INTO public.winner_redemptions (
    coupon_id,
    user_id,
    email,
    target_price,
    status
  ) VALUES (
    v_coupon.id,
    v_user_id,
    v_user_email,
    v_coupon.target_price,
    'active'
  ) RETURNING id INTO v_redemption_id;

  -- Increment count
  UPDATE public.winner_coupons
  SET times_redeemed = times_redeemed + 1,
      updated_at = now()
  WHERE id = v_coupon.id;

  RETURN jsonb_build_object(
    'success', true,
    'redemption_id', v_redemption_id,
    'target_price', v_coupon.target_price,
    'message', 'Winner code redeemed successfully. Special ₹299 pricing unlocked!'
  );
END;
$$;

-- Grant execution to authenticated users
GRANT EXECUTE ON FUNCTION public.redeem_winner_coupon(TEXT) TO authenticated;

-- 7. RPC: consume_winner_redemption
-- Atomically transitions an active redemption to consumed, enforcing user ownership.
CREATE OR REPLACE FUNCTION public.consume_winner_redemption(
  p_redemption_id UUID,
  p_user_id UUID,
  p_submission_id TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
  v_updated RECORD;
BEGIN
  IF p_user_id IS NULL OR p_redemption_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid redemption parameters.');
  END IF;

  UPDATE public.winner_redemptions
  SET status = 'consumed',
      consumed_at = now(),
      used_in_submission_id = p_submission_id
  WHERE id = p_redemption_id
    AND user_id = p_user_id
    AND status = 'active'
  RETURNING id, coupon_id, target_price INTO v_updated;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Redemption not found, already consumed, or unauthorized.');
  END IF;

  RETURN jsonb_build_object('success', true, 'redemption_id', v_updated.id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.consume_winner_redemption(UUID, UUID, TEXT) TO authenticated, service_role;

