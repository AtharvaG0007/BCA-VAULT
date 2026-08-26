-- Forward hardening for the already-applied Supabase-only model.
-- The existing admin_profiles SELECT-own RLS policy makes SECURITY INVOKER safe here.

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

create index if not exists access_permissions_bundle_id_idx on public.access_permissions (bundle_id);
create index if not exists access_permissions_granted_by_idx on public.access_permissions (granted_by);
create index if not exists notes_created_by_idx on public.notes (created_by);
create index if not exists payment_submissions_verified_by_idx on public.payment_submissions (verified_by);
