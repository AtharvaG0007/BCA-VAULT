create or replace function public.review_exam_kit_order(
 p_order_id uuid,
 p_decision text,
 p_admin_notes text,
 p_admin_id uuid
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare v_order public.exam_kit_orders%rowtype; v_result jsonb;
begin
 if p_decision not in ('approved','rejected') then raise exception 'Invalid decision' using errcode='22023'; end if;
 if not exists(select 1 from public.admin_profiles a where a.user_id=p_admin_id and a.status='active' and a.role in ('admin','superadmin')) then raise exception 'Administrator access required' using errcode='42501'; end if;
 select * into v_order from public.exam_kit_orders where id=p_order_id and status='pending_review' for update;
 if not found then raise exception 'Pending order not found or already reviewed' using errcode='P0002'; end if;
 if p_decision='approved' then
  insert into public.exam_kit_entitlements(user_id,subject_id,order_id,granted_by)
  select v_order.user_id,s.subject_id,v_order.id,p_admin_id from unnest(v_order.selected_subjects) as s(subject_id)
  on conflict(user_id,subject_id) do nothing;
 end if;
 update public.exam_kit_orders set status=p_decision,admin_notes=nullif(left(coalesce(p_admin_notes,''),1000),''),verified_by=p_admin_id,verified_at=now(),updated_at=now() where id=v_order.id;
 select jsonb_build_object('id',id,'order_code',order_code,'status',status,'user_id',user_id,'selected_subjects',selected_subjects,'amount',amount,'admin_notes',admin_notes,'verified_at',verified_at) into v_result from public.exam_kit_orders where id=v_order.id;
 return v_result;
end;
$$;
revoke all on function public.review_exam_kit_order(uuid,text,text,uuid) from public,anon,authenticated;
grant execute on function public.review_exam_kit_order(uuid,text,text,uuid) to service_role;
