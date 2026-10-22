-- Exam Kit PDFs are separate paid content. Keep the published content area
-- private and prevent old standard-note metadata from being exposed as kits.
create table if not exists public.exam_kit_subjects (
  id text primary key check (id ~ '^[a-z0-9-]{1,80}$'),
  title text not null check (length(btrim(title)) between 1 and 160),
  short_description text not null default '',
  description text not null default '',
  topics text[] not null default '{}',
  sort_order smallint not null default 0,
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.exam_kit_plans (
  id text primary key check (id in ('single', 'double', 'all')),
  title text not null check (length(btrim(title)) between 1 and 100),
  detail text not null default '',
  badge text not null default '',
  price integer not null check (price >= 0),
  selection_mode text not null check (selection_mode in ('any', 'all')),
  subject_count smallint,
  sort_order smallint not null default 0,
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint exam_kit_plan_selection_count check (
    (selection_mode = 'all' and subject_count is null)
    or (selection_mode = 'any' and subject_count between 1 and 4)
  )
);

alter table public.exam_kit_subjects enable row level security;
alter table public.exam_kit_plans enable row level security;
revoke all on public.exam_kit_subjects, public.exam_kit_plans from anon, authenticated;
grant select on public.exam_kit_subjects, public.exam_kit_plans to anon, authenticated;
drop policy if exists "published exam kit subjects are public" on public.exam_kit_subjects;
create policy "published exam kit subjects are public"
  on public.exam_kit_subjects for select to anon, authenticated using (published = true);
drop policy if exists "published exam kit plans are public" on public.exam_kit_plans;
create policy "published exam kit plans are public"
  on public.exam_kit_plans for select to anon, authenticated using (published = true);

-- Seed the catalog with the subjects and plan prices already used by the
-- Exam Kits page and order service. This moves configuration out of the UI.
insert into public.exam_kit_subjects (id, title, short_description, description, topics, sort_order)
values
  ('foundation', 'Foundations of Computing', 'Computer fundamentals', 'Core computing concepts, organised for focused revision.', array['Computer fundamentals', 'Hardware & software', 'Data representation'], 1),
  ('algorithms', 'Algorithms & Program Design using C', 'Logic and C programming', 'Algorithm design, problem-solving and C programming concepts.', array['Algorithms & flowcharts', 'C fundamentals', 'Control structures'], 2),
  ('client-side', 'Client-side Web Technologies (HTML, CSS & JavaScript)', 'HTML, CSS and JavaScript in one combined subject', 'A single combined kit covering web page structure, styling and client-side scripting.', array['HTML structure, elements and forms', 'CSS selectors, box model and layouts', 'JavaScript variables, functions, events and DOM'], 3),
  ('mathematics', 'Mathematics', 'Problems with solutions', 'Topic-wise practice with step-by-step solutions where prepared.', array['Key formulas', 'Worked examples', 'Practice problems with solutions'], 4)
on conflict (id) do update
set title = excluded.title,
    short_description = excluded.short_description,
    description = excluded.description,
    topics = excluded.topics,
    sort_order = excluded.sort_order,
    updated_at = now();

insert into public.exam_kit_plans (id, title, detail, badge, price, selection_mode, subject_count, sort_order)
values
  ('single', 'Single Subject', 'Choose any one subject', '', 49, 'any', 1, 1),
  ('double', 'Any 2 Subjects', 'Pick any two subject kits · ₹19 less than buying separately', 'SAVE ₹19', 79, 'any', 2, 2),
  ('all', 'Complete Exam Combo', 'All four subject kits · ₹67 less than buying separately', 'BEST VALUE', 129, 'all', null, 3)
on conflict (id) do update
set title = excluded.title,
    detail = excluded.detail,
    badge = excluded.badge,
    price = excluded.price,
    selection_mode = excluded.selection_mode,
    subject_count = excluded.subject_count,
    sort_order = excluded.sort_order,
    updated_at = now();

alter table public.exam_kit_entitlements drop constraint if exists exam_kit_entitlements_subject_id_check;
alter table public.exam_kit_content drop constraint if exists exam_kit_content_subject_id_check;
alter table public.exam_kit_entitlements
  add constraint exam_kit_entitlements_subject_id_fkey
  foreign key (subject_id) references public.exam_kit_subjects(id) on delete restrict;
alter table public.exam_kit_content
  add constraint exam_kit_content_subject_id_fkey
  foreign key (subject_id) references public.exam_kit_subjects(id) on delete restrict;

insert into storage.buckets (id, name, public, allowed_mime_types)
values (
  'most-repeated-questions',
  'most-repeated-questions',
  false,
  array['application/pdf']::text[]
)
on conflict (id) do update
set public = false,
    allowed_mime_types = array['application/pdf']::text[];

-- The existing rows were imported from the standard-notes bucket. Keep the
-- metadata for auditing, but never publish those files through Exam Kits.
update public.exam_kit_content
set published = false
where storage_bucket <> 'most-repeated-questions'
  and published = true;

drop policy if exists "published exam kit content readable by authenticated" on public.exam_kit_content;
drop policy if exists "published exam kit content readable by entitled students" on public.exam_kit_content;
create policy "published exam kit content readable by entitled students"
  on public.exam_kit_content
  for select
  to authenticated
  using (
    published = true
    and storage_bucket = 'most-repeated-questions'
    and exists (
      select 1
      from public.exam_kit_entitlements e
      where e.user_id = auth.uid()
        and e.subject_id = exam_kit_content.subject_id
    )
  );

-- Browser clients must not write Exam Kit metadata. Admin changes go through
-- the authenticated exam-kits Edge Function using the server-only key.
revoke insert, update, delete on public.exam_kit_content from anon, authenticated;

create index if not exists exam_kit_content_published_subject_idx
  on public.exam_kit_content (subject_id, created_at desc)
  where published = true;

-- Require a reason on rejection and keep approval plus entitlement creation
-- atomic, locked to one pending order, and restricted to active admins.
create or replace function public.review_exam_kit_order(
  p_order_id uuid,
  p_decision text,
  p_admin_notes text,
  p_admin_id uuid
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order public.exam_kit_orders%rowtype;
  v_result jsonb;
begin
  if p_decision is null or p_decision not in ('approved', 'rejected') then
    raise exception 'Invalid decision' using errcode = '22023';
  end if;
  if p_decision = 'rejected' and nullif(pg_catalog.btrim(coalesce(p_admin_notes, '')), '') is null then
    raise exception 'Rejection reason required' using errcode = '22023';
  end if;
  if not exists (
    select 1
    from public.admin_profiles a
    where a.user_id = p_admin_id
      and a.status = 'active'
      and a.role in ('admin', 'superadmin')
  ) then
    raise exception 'Administrator access required' using errcode = '42501';
  end if;

  select *
  into v_order
  from public.exam_kit_orders
  where id = p_order_id and status = 'pending_review'
  for update;
  if not found then
    raise exception 'Pending order not found or already reviewed' using errcode = 'P0002';
  end if;

  if p_decision = 'approved' then
    insert into public.exam_kit_entitlements (user_id, subject_id, order_id, granted_by)
    select v_order.user_id, s.subject_id, v_order.id, p_admin_id
    from pg_catalog.unnest(v_order.selected_subjects) as s(subject_id)
    on conflict (user_id, subject_id) do nothing;
  end if;

  update public.exam_kit_orders
  set status = p_decision,
      admin_notes = nullif(pg_catalog.left(coalesce(p_admin_notes, ''), 1000), ''),
      verified_by = p_admin_id,
      verified_at = pg_catalog.now(),
      updated_at = pg_catalog.now()
  where id = v_order.id;

  select pg_catalog.jsonb_build_object(
    'id', id,
    'order_code', order_code,
    'status', status,
    'user_id', user_id,
    'selected_subjects', selected_subjects,
    'amount', amount,
    'admin_notes', admin_notes,
    'verified_at', verified_at
  )
  into v_result
  from public.exam_kit_orders
  where id = v_order.id;
  return v_result;
end;
$$;

revoke all on function public.review_exam_kit_order(uuid, text, text, uuid) from public, anon, authenticated;
grant execute on function public.review_exam_kit_order(uuid, text, text, uuid) to service_role;
