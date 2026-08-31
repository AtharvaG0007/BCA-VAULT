-- ==============================================================================
-- BCA VAULT — ACADEMIC CMS SCHEMA (Sprint 2: Subjects, Units, Topics & Notes)
-- ==============================================================================

-- 1. Subjects Table
CREATE TABLE IF NOT EXISTS public.subjects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    short_title TEXT,
    semester INTEGER NOT NULL CHECK (semester BETWEEN 1 AND 6),
    course_type TEXT NOT NULL DEFAULT 'Core Course',
    description TEXT,
    status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('draft', 'review', 'published', 'archived')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2. Units Table
CREATE TABLE IF NOT EXISTS public.units (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
    unit_number INTEGER NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('draft', 'review', 'published', 'archived')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    UNIQUE (subject_id, unit_number)
);

-- 3. Topics Table
CREATE TABLE IF NOT EXISTS public.topics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
    unit_id UUID NOT NULL REFERENCES public.units(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'very_high')),
    status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('draft', 'review', 'published', 'archived')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 4. Extend Notes with Foreign Keys and Priority
ALTER TABLE public.notes 
  ADD COLUMN IF NOT EXISTS subject_id UUID REFERENCES public.subjects(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS unit_id UUID REFERENCES public.units(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS topic_id UUID REFERENCES public.topics(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'very_high')),
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'published' CHECK (status IN ('draft', 'review', 'published', 'archived'));

-- 5. Enable Row Level Security (RLS)
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.topics ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies for Subjects
DROP POLICY IF EXISTS "Public can view published subjects" ON public.subjects;
CREATE POLICY "Public can view published subjects"
ON public.subjects FOR SELECT
USING (status = 'published' OR public.is_active_admin());

DROP POLICY IF EXISTS "Admins have full access to subjects" ON public.subjects;
CREATE POLICY "Admins have full access to subjects"
ON public.subjects FOR ALL
TO authenticated
USING (public.is_active_admin())
WITH CHECK (public.is_active_admin());

-- 7. RLS Policies for Units
DROP POLICY IF EXISTS "Public can view published units" ON public.units;
CREATE POLICY "Public can view published units"
ON public.units FOR SELECT
USING (status = 'published' OR public.is_active_admin());

DROP POLICY IF EXISTS "Admins have full access to units" ON public.units;
CREATE POLICY "Admins have full access to units"
ON public.units FOR ALL
TO authenticated
USING (public.is_active_admin())
WITH CHECK (public.is_active_admin());

-- 8. RLS Policies for Topics
DROP POLICY IF EXISTS "Public can view published topics" ON public.topics;
CREATE POLICY "Public can view published topics"
ON public.topics FOR SELECT
USING (status = 'published' OR public.is_active_admin());

DROP POLICY IF EXISTS "Admins have full access to topics" ON public.topics;
CREATE POLICY "Admins have full access to topics"
ON public.topics FOR ALL
TO authenticated
USING (public.is_active_admin())
WITH CHECK (public.is_active_admin());

-- 9. Updated At Triggers
DROP TRIGGER IF EXISTS trg_subjects_updated_at ON public.subjects;
CREATE TRIGGER trg_subjects_updated_at
BEFORE UPDATE ON public.subjects
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_units_updated_at ON public.units;
CREATE TRIGGER trg_units_updated_at
BEFORE UPDATE ON public.units
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_topics_updated_at ON public.topics;
CREATE TRIGGER trg_topics_updated_at
BEFORE UPDATE ON public.topics
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 10. Performance Indexes
CREATE INDEX IF NOT EXISTS idx_subjects_semester ON public.subjects (semester);
CREATE INDEX IF NOT EXISTS idx_units_subject_id ON public.units (subject_id);
CREATE INDEX IF NOT EXISTS idx_topics_unit_id ON public.topics (unit_id);
CREATE INDEX IF NOT EXISTS idx_topics_subject_id ON public.topics (subject_id);
CREATE INDEX IF NOT EXISTS idx_notes_subject_id ON public.notes (subject_id);
CREATE INDEX IF NOT EXISTS idx_notes_unit_id ON public.notes (unit_id);
CREATE INDEX IF NOT EXISTS idx_notes_topic_id ON public.notes (topic_id);
