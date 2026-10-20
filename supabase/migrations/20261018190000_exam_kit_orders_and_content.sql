-- Exam Kits standalone orders, private payment evidence, entitlements and protected content.
create table if not exists public.exam_kit_orders (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 order_code text not null unique,
 selected_subjects text[] not null,
 plan_type text not null check (plan_type in ('single','double','all')),
 amount integer not null check (amount in (49,79,129)),
 status text not null default 'awaiting_payment' check (status in ('awaiting_payment','pending_review','approved','rejected','cancelled')),
 full_name text not null, email text not null, phone text not null, utr text unique,
 screenshot_bucket text, screenshot_path text, admin_notes text,
 verified_by uuid references auth.users(id), verified_at timestamptz,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 constraint exam_kit_subject_count check (
  (plan_type='single' and cardinality(selected_subjects)=1) or
  (plan_type='double' and cardinality(selected_subjects)=2) or
  (plan_type='all' and cardinality(selected_subjects)=4))
);
create table if not exists public.exam_kit_entitlements (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 subject_id text not null check (subject_id in ('foundation','algorithms','client-side','mathematics')),
 order_id uuid not null references public.exam_kit_orders(id) on delete cascade,
 granted_at timestamptz not null default now(), granted_by uuid references auth.users(id),
 unique(user_id,subject_id)
);
create table if not exists public.exam_kit_content (
 id uuid primary key default gen_random_uuid(),
 subject_id text not null check (subject_id in ('foundation','algorithms','client-side','mathematics')),
 title text not null, description text not null default '',
 storage_bucket text not null, storage_path text not null,
 published boolean not null default false, created_at timestamptz not null default now(),
 unique(subject_id,storage_bucket,storage_path)
);
alter table public.exam_kit_orders enable row level security;
alter table public.exam_kit_entitlements enable row level security;
alter table public.exam_kit_content enable row level security;
revoke all on public.exam_kit_orders from anon,authenticated;
revoke all on public.exam_kit_entitlements from anon,authenticated;
revoke all on public.exam_kit_content from anon,authenticated;
grant select on public.exam_kit_orders to authenticated;
grant select on public.exam_kit_entitlements to authenticated;
grant select on public.exam_kit_content to authenticated;
drop policy if exists "students read own exam kit orders" on public.exam_kit_orders;
create policy "students read own exam kit orders" on public.exam_kit_orders for select to authenticated using(auth.uid()=user_id);
drop policy if exists "students read own exam kit entitlements" on public.exam_kit_entitlements;
create policy "students read own exam kit entitlements" on public.exam_kit_entitlements for select to authenticated using(auth.uid()=user_id);
drop policy if exists "published exam kit content readable by entitled students" on public.exam_kit_content;
create policy "published exam kit content readable by entitled students" on public.exam_kit_content for select to authenticated using(published=true and exists(select 1 from public.exam_kit_entitlements e where e.user_id=auth.uid() and e.subject_id=exam_kit_content.subject_id));
create index if not exists exam_kit_orders_user_created_idx on public.exam_kit_orders(user_id,created_at desc);
create index if not exists exam_kit_orders_status_created_idx on public.exam_kit_orders(status,created_at desc);
create index if not exists exam_kit_entitlements_user_idx on public.exam_kit_entitlements(user_id);
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('exam-kit-payment-evidence','exam-kit-payment-evidence',false,5242880,array['image/jpeg','image/png','image/webp'])
on conflict(id) do update set public=false,file_size_limit=5242880,allowed_mime_types=array['image/jpeg','image/png','image/webp'];
