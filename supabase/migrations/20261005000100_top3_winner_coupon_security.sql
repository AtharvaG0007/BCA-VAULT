-- Top 3 winner coupon: server-side, one redemption per signed-in student, maximum 3 students.
create extension if not exists pgcrypto with schema extensions;

create table if not exists public.coupon_campaigns (
  id uuid primary key default gen_random_uuid(),
  max_redemptions integer not null check (max_redemptions > 0),
  created_at timestamptz not null default now(),
  is_active boolean not null default true,
  code_hash text
);

create table if not exists public.coupon_redemptions (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.coupon_campaigns(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  redeemed_at timestamptz not null default now(),
  unique (campaign_id, user_id)
);

alter table public.coupon_campaigns enable row level security;
alter table public.coupon_redemptions enable row level security;

revoke all on public.coupon_campaigns from anon, authenticated;
revoke all on public.coupon_redemptions from anon, authenticated;

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'coupon_campaigns' and column_name = 'code'
  ) then
    update public.coupon_campaigns
    set code_hash = extensions.encode(extensions.digest(upper(trim(code)), 'sha256'), 'hex')
    where code_hash is null;
    alter table public.coupon_campaigns drop column code;
  end if;
end
$$;

update public.coupon_campaigns
set max_redemptions = 3, is_active = true
where code_hash = '4fe53ca1f3aa59448112e9f2756a5f7606eb9d5e552d54ba19b37b1f896c6244';

insert into public.coupon_campaigns (max_redemptions, is_active, code_hash)
select 3, true, '4fe53ca1f3aa59448112e9f2756a5f7606eb9d5e552d54ba19b37b1f896c6244'
where not exists (
  select 1 from public.coupon_campaigns
  where code_hash = '4fe53ca1f3aa59448112e9f2756a5f7606eb9d5e552d54ba19b37b1f896c6244'
);

create unique index if not exists coupon_campaigns_code_hash_unique
  on public.coupon_campaigns(code_hash);

alter table public.payment_submissions
  add column if not exists coupon_redemption_id uuid references public.coupon_redemptions(id);

create unique index if not exists payment_submissions_coupon_redemption_unique
  on public.payment_submissions(coupon_redemption_id)
  where coupon_redemption_id is not null;

create or replace function public.redeem_top3_winner_coupon(p_code text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_campaign public.coupon_campaigns%rowtype;
  v_redemption public.coupon_redemptions%rowtype;
  v_used integer;
begin
  if v_user_id is null then
    return jsonb_build_object('success', false, 'error', 'Please sign in before using the Top 3 winner offer.');
  end if;

  select * into v_campaign
  from public.coupon_campaigns
  where code_hash = extensions.encode(extensions.digest(upper(trim(p_code)), 'sha256'), 'hex')
    and is_active = true
  for update;

  if not found then
    return jsonb_build_object('success', false, 'error', 'Invalid or expired winner code.');
  end if;

  if exists (
    select 1 from public.coupon_redemptions
    where campaign_id = v_campaign.id and user_id = v_user_id
  ) then
    select * into v_redemption
    from public.coupon_redemptions
    where campaign_id = v_campaign.id and user_id = v_user_id
    limit 1;

    select count(*)::integer into v_used
    from public.coupon_redemptions
    where campaign_id = v_campaign.id;

    return jsonb_build_object(
      'success', true,
      'redemption_id', v_redemption.id,
      'final_price', 299,
      'remaining', greatest(v_campaign.max_redemptions - v_used, 0)
    );
  end if;

  select count(*)::integer into v_used
  from public.coupon_redemptions
  where campaign_id = v_campaign.id;

  if v_used >= v_campaign.max_redemptions then
    return jsonb_build_object('success', false, 'error', 'The Top 3 winner offer has already been claimed by 3 students.');
  end if;

  insert into public.coupon_redemptions (campaign_id, user_id)
  values (v_campaign.id, v_user_id)
  returning * into v_redemption;

  v_used := v_used + 1;

  return jsonb_build_object(
    'success', true,
    'redemption_id', v_redemption.id,
    'final_price', 299,
    'remaining', greatest(v_campaign.max_redemptions - v_used, 0)
  );
end;
$$;

revoke execute on function public.redeem_top3_winner_coupon(text) from public, anon;
grant execute on function public.redeem_top3_winner_coupon(text) to authenticated;
