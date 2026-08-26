-- BCA Vault: additive Supabase-only application model.
-- Live-schema compatibility: public.admin_profiles already exists and is preserved.

create extension if not exists pgcrypto;

do $$ begin create type public.account_status as enum ('active', 'inactive'); exception when duplicate_object then null; end $$;
do $$ begin create type public.payment_status as enum ('pending', 'approved', 'rejected'); exception when duplicate_object then null; end $$;
do $$ begin create type public.access_status as enum ('active', 'revoked'); exception when duplicate_object then null; end $$;

create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  full_name text not null,
  phone text,
  course text,
  semester smallint check (semester between 1 and 6),
  status public.account_status not null default 'inactive',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.bundles (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null default '',
  price numeric(10, 2) not null check (price >= 0),
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.payment_submissions (
  id uuid primary key default gen_random_uuid(),
  reference_id text not null unique,
  user_id uuid references auth.users(id) on delete set null,
  full_name text not null,
  email text not null,
  phone text not null,
  course text not null,
  semester smallint not null check (semester between 1 and 6),
  amount numeric(10, 2) not null check (amount > 0),
  utr text not null unique,
  screenshot_bucket text not null,
  screenshot_path text not null,
  status public.payment_status not null default 'pending',
  admin_notes text,
  verified_at timestamptz,
  verified_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.access_permissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  bundle_id uuid not null references public.bundles(id) on delete cascade,
  status public.access_status not null default 'active',
  granted_at timestamptz not null default now(),
  granted_by uuid references auth.users(id) on delete set null,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, bundle_id)
);

create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  bundle_id uuid not null references public.bundles(id) on delete cascade,
  title text not null,
  subject text,
  semester smallint check (semester between 1 and 6),
  description text not null default '',
  storage_bucket text not null,
  storage_path text not null unique,
  published boolean not null default false,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.activity_logs (
  id bigint generated always as identity primary key,
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  target_type text,
  target_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.legal_acceptances (
  user_id uuid primary key references auth.users(id) on delete cascade,
  terms_version text not null,
  privacy_version text not null,
  accepted_at timestamptz not null default now()
);

create index if not exists payment_submissions_status_created_at_idx on public.payment_submissions (status, created_at desc);
create index if not exists payment_submissions_user_id_idx on public.payment_submissions (user_id);
create index if not exists access_permissions_user_status_idx on public.access_permissions (user_id, status);
create index if not exists notes_bundle_published_idx on public.notes (bundle_id, published);
create index if not exists activity_logs_actor_created_at_idx on public.activity_logs (actor_id, created_at desc);

create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end;
$$;

create trigger profiles_set_updated_at before update on public.profiles for each row execute procedure public.set_updated_at();
create trigger bundles_set_updated_at before update on public.bundles for each row execute procedure public.set_updated_at();
create trigger notes_set_updated_at before update on public.notes for each row execute procedure public.set_updated_at();

-- This uses the existing text role/status fields on public.admin_profiles.
create or replace function public.is_active_admin()
returns boolean language sql stable set search_path = public, pg_temp as $$
  select exists (
    select 1 from public.admin_profiles
    where user_id = (select auth.uid())
      and role = 'superadmin'
      and status = 'active'
  );
$$;
revoke all on function public.is_active_admin() from public, anon;
grant execute on function public.is_active_admin() to authenticated;

alter table public.profiles enable row level security;
alter table public.bundles enable row level security;
alter table public.payment_submissions enable row level security;
alter table public.access_permissions enable row level security;
alter table public.notes enable row level security;
alter table public.activity_logs enable row level security;
alter table public.legal_acceptances enable row level security;

revoke all on table public.profiles, public.bundles, public.payment_submissions, public.access_permissions, public.notes, public.activity_logs, public.legal_acceptances from anon, authenticated;
grant select on public.bundles to anon, authenticated;
grant select, update (full_name, phone, course, semester) on public.profiles to authenticated;
grant select, insert, update on public.legal_acceptances to authenticated;
grant select, insert, update, delete on public.profiles, public.bundles, public.payment_submissions, public.access_permissions, public.notes, public.activity_logs to authenticated;

create policy "profiles_select_own" on public.profiles for select to authenticated using ((select auth.uid()) = user_id);
create policy "profiles_update_own_safe_fields" on public.profiles for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "published_bundles_are_readable" on public.bundles for select to anon, authenticated using (published or (select public.is_active_admin()));
create policy "payment_select_own" on public.payment_submissions for select to authenticated using ((select auth.uid()) = user_id);
create policy "access_select_own" on public.access_permissions for select to authenticated using ((select auth.uid()) = user_id);
create policy "notes_select_with_active_access" on public.notes for select to authenticated using (
  published and exists (
    select 1 from public.access_permissions ap join public.profiles p on p.user_id = ap.user_id
    where ap.user_id = (select auth.uid()) and ap.bundle_id = notes.bundle_id
      and ap.status = 'active' and p.status = 'active'
      and (ap.expires_at is null or ap.expires_at > now())
  )
);
create policy "legal_acceptance_own" on public.legal_acceptances for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create policy "superadmin_profiles_manage" on public.profiles for all to authenticated using ((select public.is_active_admin())) with check ((select public.is_active_admin()));
create policy "superadmin_bundles_manage" on public.bundles for all to authenticated using ((select public.is_active_admin())) with check ((select public.is_active_admin()));
create policy "superadmin_payments_manage" on public.payment_submissions for all to authenticated using ((select public.is_active_admin())) with check ((select public.is_active_admin()));
create policy "superadmin_access_manage" on public.access_permissions for all to authenticated using ((select public.is_active_admin())) with check ((select public.is_active_admin()));
create policy "superadmin_notes_manage" on public.notes for all to authenticated using ((select public.is_active_admin())) with check ((select public.is_active_admin()));
create policy "superadmin_activity_logs_manage" on public.activity_logs for all to authenticated using ((select public.is_active_admin())) with check ((select public.is_active_admin()));
create policy "superadmin_legal_acceptances_read" on public.legal_acceptances for select to authenticated using ((select public.is_active_admin()));

-- Table grants must permit Super Admin updates. This trigger prevents an
-- ordinary student from changing identity or account-activation fields.
create or replace function public.prevent_student_profile_sensitive_changes()
returns trigger language plpgsql set search_path = public, pg_temp as $$
begin
  if not public.is_active_admin()
     and (new.user_id is distinct from old.user_id
       or new.email is distinct from old.email
       or new.status is distinct from old.status) then
    raise exception 'Students may only update their contact and course details';
  end if;
  return new;
end;
$$;
create trigger profiles_prevent_student_sensitive_updates
before update on public.profiles
for each row execute procedure public.prevent_student_profile_sensitive_changes();

insert into storage.buckets (id, name, public, allowed_mime_types)
values ('bca-notes', 'bca-notes', false, array['application/pdf'])
on conflict (id) do update set public = false, allowed_mime_types = excluded.allowed_mime_types;

update storage.buckets
set public = false, allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']
where id = 'bca-payment-evidence';

-- Object access remains server-authorized through short-lived signed URLs:
-- student payment uploads are signed server-side; note downloads require an active access permission.
