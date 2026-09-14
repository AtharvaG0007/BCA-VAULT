-- =============================================================================
-- Notice Board Schema
-- =============================================================================
-- Creates the notices table and RLS policies for the BCA Vault notice board.
-- Students can only read published notices.
-- Superadmins (via admin_profiles) have full CRUD access.
-- =============================================================================

-- 1. Create the notices table
CREATE TABLE IF NOT EXISTS public.notices (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title       text NOT NULL,
  message     text NOT NULL,
  notice_type text NOT NULL DEFAULT 'general'
    CHECK (notice_type IN ('general', 'academic', 'payment', 'study', 'important')),
  priority    text NOT NULL DEFAULT 'normal'
    CHECK (priority IN ('normal', 'important')),
  published   boolean NOT NULL DEFAULT false,
  created_by  uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- 2. Enable RLS
ALTER TABLE public.notices ENABLE ROW LEVEL SECURITY;

-- 3. Student SELECT policy — only published notices
CREATE POLICY "Students can view published notices"
  ON public.notices
  FOR SELECT
  TO authenticated
  USING (published = true);

-- 4. Superadmin full-access policies
CREATE POLICY "Superadmin full access to notices"
  ON public.notices
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_profiles ap
      WHERE ap.user_id = auth.uid()
        AND ap.role = 'superadmin'
        AND ap.status = 'active'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.admin_profiles ap
      WHERE ap.user_id = auth.uid()
        AND ap.role = 'superadmin'
        AND ap.status = 'active'
    )
  );

-- 5. Auto-update updated_at on modification
CREATE OR REPLACE FUNCTION public.notices_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER notices_updated_at
  BEFORE UPDATE ON public.notices
  FOR EACH ROW
  EXECUTE FUNCTION public.notices_set_updated_at();

-- 6. Index for student queries (published notices, newest first)
CREATE INDEX IF NOT EXISTS idx_notices_published_created
  ON public.notices (published, created_at DESC)
  WHERE published = true;
