-- Grant notes-only access to every existing registered student profile,
-- including inactive profiles. This does not change profile status or grant bundles.
-- Most Repeated Questions/Topics remain excluded and are blocked by the signed-URL function.

DROP POLICY IF EXISTS "notes_select_with_active_access" ON public.notes;

CREATE POLICY "notes_select_registered_students_notes_only"
  ON public.notes
  FOR SELECT
  TO authenticated
  USING (
    published = TRUE
    AND NOT (
      COALESCE(title, '') ~* 'most[[:space:]_-]*repeated[[:space:]_-]*(questions|topics)'
      OR COALESCE(storage_path, '') ~* 'most[[:space:]_-]*repeated[[:space:]_-]*(questions|topics)|repted[[:space:]_-]*(questions|topics)|refral_bouns|referral_bonus|questions_complete|question.*answer'
    )
    AND EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.user_id = (SELECT auth.uid())
    )
  );

COMMENT ON POLICY "notes_select_registered_students_notes_only" ON public.notes
  IS 'Any authenticated existing registered student profile can read published standard notes only; account status and paid bundle entitlements are unchanged.';
