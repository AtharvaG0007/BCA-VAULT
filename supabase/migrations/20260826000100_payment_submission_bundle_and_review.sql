-- The Supabase CLI is unavailable in this workspace; this file mirrors the
-- reviewed live migration applied for the selected-bundle payment flow.
alter table public.payment_submissions
  add column if not exists bundle_id uuid;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'payment_submissions_bundle_id_fkey'
      and conrelid = 'public.payment_submissions'::regclass
  ) then
    alter table public.payment_submissions
      add constraint payment_submissions_bundle_id_fkey
      foreign key (bundle_id) references public.bundles(id) on delete restrict;
  end if;
end $$;

create index if not exists payment_submissions_bundle_id_idx
  on public.payment_submissions(bundle_id);

alter table public.payment_submissions
  alter column bundle_id set not null;

create or replace function public.review_payment_submission(
  p_payment_id uuid,
  p_status public.payment_status,
  p_admin_notes text,
  p_verified_by uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_payment public.payment_submissions;
begin
  if p_status not in ('approved', 'rejected') then
    raise exception 'Invalid payment review status';
  end if;

  if not exists (
    select 1 from public.admin_profiles
    where user_id = p_verified_by and role = 'superadmin' and status = 'active'
  ) then
    raise exception 'Super Admin access required';
  end if;

  select * into v_payment
  from public.payment_submissions
  where id = p_payment_id and status = 'pending'
  for update;

  if not found then
    raise exception 'Payment submission is not pending';
  end if;

  update public.payment_submissions
  set status = p_status, verified_by = p_verified_by, verified_at = now(), admin_notes = nullif(trim(p_admin_notes), '')
  where id = v_payment.id;

  if p_status = 'approved' then
    insert into public.access_permissions (user_id, bundle_id, status, granted_by, granted_at, expires_at)
    values (v_payment.user_id, v_payment.bundle_id, 'active', p_verified_by, now(), null)
    on conflict (user_id, bundle_id) do update
      set status = 'active', granted_by = excluded.granted_by, granted_at = excluded.granted_at, expires_at = null;
  end if;

  insert into public.activity_logs (actor_id, action, target_type, target_id, metadata)
  values (p_verified_by, 'payment_' || p_status, 'payment', v_payment.id::text, jsonb_build_object('bundle_id', v_payment.bundle_id));

  return jsonb_build_object('id', v_payment.id, 'status', p_status, 'bundle_id', v_payment.bundle_id);
end;
$$;

revoke all on function public.review_payment_submission(uuid, public.payment_status, text, uuid) from public, anon, authenticated;
grant execute on function public.review_payment_submission(uuid, public.payment_status, text, uuid) to service_role;
