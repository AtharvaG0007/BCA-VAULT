-- ==============================================================================
-- BCA VAULT — PROTECTED PDF SCHEMA & STORAGE HARDENING
-- Migration: 20260903000100_protected_pdf_schema.sql
-- ==============================================================================

-- 1. Add is_protected flag to notes table (defaults to true for educational material)
ALTER TABLE public.notes
  ADD COLUMN IF NOT EXISTS is_protected BOOLEAN NOT NULL DEFAULT true;

-- Index on is_protected for optimized filtering
CREATE INDEX IF NOT EXISTS idx_notes_is_protected ON public.notes (is_protected);

-- 2. Optional Granular Per-Document Student Access Table
-- Enables direct note-level access grants alongside bundle-level access permissions
CREATE TABLE IF NOT EXISTS public.student_document_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  note_id UUID NOT NULL REFERENCES public.notes(id) ON DELETE CASCADE,
  granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  granted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, note_id)
);

-- Indexes on student_document_access for optimal RLS lookup performance
CREATE INDEX IF NOT EXISTS idx_student_document_access_lookup
  ON public.student_document_access (user_id, note_id, expires_at);
CREATE INDEX IF NOT EXISTS idx_student_document_access_note_id
  ON public.student_document_access (note_id);

-- 3. Enable RLS on student_document_access
ALTER TABLE public.student_document_access ENABLE ROW LEVEL SECURITY;

-- Revoke default public permissions
REVOKE ALL ON TABLE public.student_document_access FROM anon, authenticated;
GRANT SELECT ON public.student_document_access TO authenticated;
GRANT ALL ON public.student_document_access TO authenticated;

-- Student can read their own document grants (auth.uid() wrapped in select per best practice)
DROP POLICY IF EXISTS "student_document_access_select_own" ON public.student_document_access;
CREATE POLICY "student_document_access_select_own"
  ON public.student_document_access
  FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

-- Superadmin full management on student_document_access
DROP POLICY IF EXISTS "superadmin_student_document_access_manage" ON public.student_document_access;
CREATE POLICY "superadmin_student_document_access_manage"
  ON public.student_document_access
  FOR ALL
  TO authenticated
  USING ((select public.is_active_admin()))
  WITH CHECK ((select public.is_active_admin()));

-- 4. Update public.notes RLS Policy for Active Access
-- Supports both bundle access and direct per-document access grants
DROP POLICY IF EXISTS "notes_select_with_active_access" ON public.notes;
CREATE POLICY "notes_select_with_active_access"
  ON public.notes
  FOR SELECT
  TO authenticated
  USING (
    published AND (
      -- 1) Has active bundle access with active student profile
      EXISTS (
        SELECT 1 FROM public.access_permissions ap
        JOIN public.profiles p ON p.user_id = ap.user_id
        WHERE ap.user_id = (select auth.uid())
          AND ap.bundle_id = notes.bundle_id
          AND ap.status = 'active'
          AND p.status = 'active'
          AND (ap.expires_at IS NULL OR ap.expires_at > now())
      )
      OR
      -- 2) Has direct per-document grant with active student profile
      EXISTS (
        SELECT 1 FROM public.student_document_access sda
        JOIN public.profiles p ON p.user_id = sda.user_id
        WHERE sda.user_id = (select auth.uid())
          AND sda.note_id = notes.id
          AND p.status = 'active'
          AND (sda.expires_at IS NULL OR sda.expires_at > now())
      )
      OR
      -- 3) Active Super Admin
      (select public.is_active_admin())
    )
  );

-- 5. Storage Hardening: Confirm private bucket configuration
INSERT INTO storage.buckets (id, name, public, allowed_mime_types)
VALUES ('bca-notes', 'bca-notes', false, array['application/pdf'])
ON CONFLICT (id) DO UPDATE
SET public = false, allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Ensure secondary/legacy casing bucket is also private if it exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'Bca_notes') THEN
    UPDATE storage.buckets
    SET public = false, allowed_mime_types = array['application/pdf']
    WHERE id = 'Bca_notes';
  END IF;
END $$;
