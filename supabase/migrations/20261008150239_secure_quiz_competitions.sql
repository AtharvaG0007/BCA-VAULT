-- Secure quiz: all data access goes through the authenticated RPC below.
create schema if not exists quiz_private;
revoke all on schema quiz_private from public, anon, authenticated;
create table public.quiz_competitions (
 id uuid primary key default gen_random_uuid(), title text not null check(length(title) between 3 and 160),
 description text not null default '', status text not null default 'DRAFT' check(status in ('DRAFT','UPCOMING','OPEN','LIVE','CLOSED','UNDER_REVIEW','RESULTS_PUBLISHED')),
 start_at timestamptz, end_at timestamptz, question_count int not null default 7 check(question_count between 1 and 30),
 seconds_per_question int not null default 10 check(seconds_per_question between 5 and 60), max_attempts int not null default 1 check(max_attempts=1),
 blueprint jsonb not null, scoring_rules jsonb not null default '{"correct":"marks","incorrect":0,"timeout":0}',
 tie_break_rules text not null default 'score_desc,duration_asc,manual_review',
 risk_weights jsonb not null default '{"TAB_HIDDEN":3,"WINDOW_BLUR":1,"FULLSCREEN_EXIT":2,"COPY_ATTEMPT":2,"PASTE_ATTEMPT":2,"CONTEXT_MENU_ATTEMPT":1,"KEYBOARD_SHORTCUT_ATTEMPT":2,"PAGE_REFRESH":1,"DUPLICATE_REQUEST":1,"LATE_REQUEST":1}',
 campaign_id uuid unique references public.coupon_campaigns(id), created_at timestamptz not null default now(),
 check(end_at is null or start_at < end_at), check(jsonb_typeof(blueprint)='array' and jsonb_array_length(blueprint)=question_count)
);
create table public.quiz_questions (
 id uuid primary key default gen_random_uuid(), competition_id uuid not null references public.quiz_competitions(id),
 subject text not null, difficulty text not null check(difficulty in ('very_easy','easy','medium','hard')), question_text text not null check(length(question_text) between 5 and 2000),
 options jsonb not null check(jsonb_typeof(options)='array' and jsonb_array_length(options)=4), correct_index int not null check(correct_index between 0 and 3),
 marks int not null default 1 check(marks between 1 and 10), active boolean not null default true, usage_count int not null default 0,
 created_at timestamptz not null default now()
);
create index quiz_question_pool on public.quiz_questions(competition_id,subject,difficulty,marks,usage_count) where active;
create table public.quiz_attempts (
 id uuid primary key default gen_random_uuid(), competition_id uuid not null references public.quiz_competitions(id), user_id uuid not null references auth.users(id),
 status text not null default 'ACTIVE' check(status in ('ACTIVE','COMPLETED','AUTO_SUBMITTED')),
 started_at timestamptz not null, deadline timestamptz not null, completed_at timestamptz, current_position int not null default 1,
 score int not null default 0, completion_ms bigint, risk_score int not null default 0,
 review_status text not null default 'PENDING' check(review_status in ('PENDING','FLAGGED','APPROVED','REJECTED')),
 review_reason text, reviewed_by uuid references auth.users(id), reviewed_at timestamptz,
 unique(competition_id,user_id)
);
create index quiz_attempt_monitor on public.quiz_attempts(competition_id,status);
create index quiz_attempt_user on public.quiz_attempts(user_id);
create table public.quiz_attempt_questions (
 id uuid primary key default gen_random_uuid(), attempt_id uuid not null references public.quiz_attempts(id), question_id uuid not null references public.quiz_questions(id),
 position int not null, question_text text not null, subject text not null, difficulty text not null, options jsonb not null, correct_option uuid not null, marks int not null,
 started_at timestamptz, deadline timestamptz, submitted_at timestamptz, selected_option uuid,
 state text not null default 'PENDING' check(state in ('PENDING','ACTIVE','ANSWERED','TIMED_OUT')), earned_marks int not null default 0,
 unique(attempt_id,position), unique(attempt_id,question_id)
);
create index quiz_assignment_question on public.quiz_attempt_questions(question_id);
create table public.quiz_events (
 id bigint generated always as identity primary key, attempt_id uuid not null references public.quiz_attempts(id), event_type text not null,
 source text not null check(source in ('server','browser')), created_at timestamptz not null default clock_timestamp()
);
create index quiz_event_timeline on public.quiz_events(attempt_id,id);
create table public.quiz_winners (
 competition_id uuid not null references public.quiz_competitions(id), user_id uuid not null references auth.users(id),
 attempt_id uuid not null unique references public.quiz_attempts(id), rank int not null check(rank between 1 and 3),
 approved_by uuid not null references auth.users(id), approved_at timestamptz not null default now(),
 redemption_id uuid unique references public.coupon_redemptions(id), primary key(competition_id,user_id), unique(competition_id,rank)
);
create index quiz_winner_user on public.quiz_winners(user_id);
create table quiz_private.rate_limits(user_id uuid primary key references auth.users(id), window_at timestamptz not null, requests int not null);
alter table quiz_private.rate_limits enable row level security;
DO $$ declare t text; begin
 foreach t in array array['quiz_competitions','quiz_questions','quiz_attempts','quiz_attempt_questions','quiz_events','quiz_winners'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('revoke all on public.%I from public, anon, authenticated',t);
 end loop;
end $$;

create function quiz_private.event(p_attempt uuid,p_type text,p_source text default 'server') returns void language plpgsql set search_path='' as $$
begin
 insert into public.quiz_events(attempt_id,event_type,source) values(p_attempt,p_type,p_source);
 update public.quiz_attempts a set risk_score=least(1000,a.risk_score+coalesce((c.risk_weights->>p_type)::int,0))
 from public.quiz_competitions c where a.id=p_attempt and c.id=a.competition_id;
end $$;

-- Caller locks competition before attempt. Expired slots retain their original deadlines.
create function quiz_private.sync(p_attempt uuid) returns void language plpgsql set search_path='' as $$
declare a public.quiz_attempts; c public.quiz_competitions; q public.quiz_attempt_questions; t timestamptz:=clock_timestamp(); finish timestamptz;
begin
 select * into a from public.quiz_attempts where id=p_attempt for update;
 if a.status<>'ACTIVE' then return; end if;
 select * into c from public.quiz_competitions where id=a.competition_id;
 loop
 select * into q from public.quiz_attempt_questions where attempt_id=a.id and position=a.current_position;
 if q.state='ACTIVE' and q.deadline>t then return; end if;
 if q.state='ACTIVE' then
 update public.quiz_attempt_questions set state='TIMED_OUT',submitted_at=q.deadline where id=q.id;
 perform quiz_private.event(a.id,'QUESTION_TIMEOUT');
 finish:=q.deadline;
 else finish:=q.submitted_at; end if;
 if a.current_position=c.question_count then
 update public.quiz_attempts set status=case when q.state='ANSWERED' then 'COMPLETED' else 'AUTO_SUBMITTED' end,
 completed_at=finish,completion_ms=greatest(0,floor(extract(epoch from (finish-started_at))*1000))::bigint,
 score=(select coalesce(sum(earned_marks),0) from public.quiz_attempt_questions where attempt_id=a.id)
 where id=a.id;
 perform quiz_private.event(a.id,case when q.state='ANSWERED' then 'QUIZ_SUBMITTED' else 'AUTO_SUBMITTED' end);
 return;
 end if;
 a.current_position:=a.current_position+1;
 update public.quiz_attempts set current_position=a.current_position where id=a.id;
 update public.quiz_attempt_questions set state='ACTIVE',started_at=finish,
 deadline=least(finish+make_interval(secs=>c.seconds_per_question),a.deadline)
 where attempt_id=a.id and position=a.current_position;
 perform quiz_private.event(a.id,'QUESTION_STARTED');
 end loop;
end $$;

create function quiz_private.present(p_competition uuid,p_user uuid) returns jsonb language plpgsql set search_path='' as $$
declare c public.quiz_competitions; a public.quiz_attempts; q public.quiz_attempt_questions; result jsonb; winner jsonb; t timestamptz:=clock_timestamp();
begin
 select * into c from public.quiz_competitions where id=p_competition;
 select * into a from public.quiz_attempts where competition_id=c.id and user_id=p_user;
 if a.status='ACTIVE' then select * into q from public.quiz_attempt_questions where attempt_id=a.id and position=a.current_position; end if;
 if c.status='RESULTS_PUBLISHED' and a.completed_at is not null then
 select jsonb_build_object('score',a.score,'completion_ms',a.completion_ms,'review_status',a.review_status,
 'correct',count(*) filter(where earned_marks>0),'incorrect',count(*) filter(where state='ANSWERED' and earned_marks=0),
 'timeouts',count(*) filter(where state='TIMED_OUT'),'total_marks',sum(marks)) into result from public.quiz_attempt_questions where attempt_id=a.id;
 select jsonb_build_object('rank',rank,'redemption_id',redemption_id) into winner from public.quiz_winners where competition_id=c.id and user_id=p_user;
 end if;
 return jsonb_build_object('success',true,'server_now',t,'competition',jsonb_build_object('id',c.id,'title',c.title,'description',c.description,'status',c.status,
 'start_at',c.start_at,'end_at',c.end_at,'question_count',c.question_count,'seconds_per_question',c.seconds_per_question,
 'participants',(select count(*) from public.quiz_attempts where competition_id=c.id),
 'active',(select count(*) from public.quiz_attempts where competition_id=c.id and status='ACTIVE' and deadline>t)),
 'attempt',case when a.id is null then null else jsonb_build_object('id',a.id,'status',a.status,'started_at',a.started_at,'deadline',a.deadline,'completed_at',a.completed_at,'current_position',a.current_position) end,
 'current_question',case when q.id is null then null else jsonb_build_object('id',q.id,'position',q.position,'question_text',q.question_text,'options',q.options,'started_at',q.started_at,'deadline',q.deadline) end,
 'result',result,'winner',winner);
end $$;

create or replace function public.quiz_api(p_action text,p_payload jsonb default '{}'::jsonb) returns jsonb
language plpgsql security definer set search_path='' set statement_timeout='8s' as $$
declare u uuid:=auth.uid(); admin_ok boolean; c public.quiz_competitions; a public.quiz_attempts; q public.quiz_questions; aq public.quiz_attempt_questions;
 cid uuid; aid uuid; t timestamptz; n int; slot jsonb; picked uuid[]:='{}'; opts jsonb; correct uuid; response jsonb; next_state text; reason text; rid uuid; campaign uuid; offset_n int;
begin
 if u is null then return jsonb_build_object('success',false,'error','Sign in to continue.'); end if;
 if p_payload is null or jsonb_typeof(p_payload)<>'object' or octet_length(p_payload::text)>20000 then return jsonb_build_object('success',false,'error','Invalid request.'); end if;
 if exists(select 1 from jsonb_object_keys(p_payload) k where k not in ('competition_id','attempt_id','question_id','option_id','event_type','title','description','start_at','end_at','blueprint','question_count','seconds_per_question','risk_weights','status','id','subject','difficulty','question_text','options','correct_index','marks','active','reason','offset')) then
 return jsonb_build_object('success',false,'error','Unexpected request fields.'); end if;
 -- Atomic fixed-window limiter, keyed by authenticated identity, never request headers.
 t:=clock_timestamp();
 insert into quiz_private.rate_limits as r values(u,t,1) on conflict(user_id) do update set
 requests=case when r.window_at < t-interval '10 seconds' then 1 else r.requests+1 end,
 window_at=case when r.window_at < t-interval '10 seconds' then t else r.window_at end returning requests into n;
 if n>60 then return jsonb_build_object('success',false,'error','Too many requests. Wait ten seconds.','code','RATE_LIMITED'); end if;
 admin_ok:=public.is_active_admin();
 if p_action like 'admin_%' and not admin_ok then return jsonb_build_object('success',false,'error','Administrator access required.'); end if;
 if not admin_ok and not exists(select 1 from public.profiles where user_id=u) then return jsonb_build_object('success',false,'error','Student profile required.'); end if;
 if p_action in ('list','admin_list') then
 select coalesce(jsonb_agg(x order by x->>'created_at' desc),'[]') into response from (
 select jsonb_build_object('id',id,'title',title,'description',description,'status',status,'start_at',start_at,'end_at',end_at,'question_count',question_count,'seconds_per_question',seconds_per_question,'created_at',created_at) x
 from public.quiz_competitions where status<>'DRAFT' or (p_action='admin_list' and admin_ok) order by created_at desc limit 50) s;
 return jsonb_build_object('success',true,'competitions',response,'server_now',clock_timestamp());
 end if;
 if p_action='admin_create' then
 insert into public.quiz_competitions(title,description,blueprint) values(coalesce(p_payload->>'title','Semester 1 Quiz'),coalesce(p_payload->>'description','Test your Semester 1 knowledge.'),
 '[{"subject":"C / Algorithms","difficulty":"easy","marks":1},{"subject":"C / Algorithms","difficulty":"medium","marks":1},{"subject":"Foundation of Computing","difficulty":"easy","marks":1},{"subject":"Foundation of Computing","difficulty":"medium","marks":1},{"subject":"Communication Skills","difficulty":"easy","marks":1},{"subject":"Client-Side Web Technologies","difficulty":"easy","marks":1},{"subject":"Client-Side Web Technologies","difficulty":"medium","marks":1}]') returning id into cid;
 insert into public.activity_logs(actor_id,action,target_type,target_id) values(u,'QUIZ_CREATED','quiz',cid::text);
 return jsonb_build_object('success',true,'competition_id',cid);
 end if;
 cid:=nullif(p_payload->>'competition_id','')::uuid;
 if p_action='claim' and cid is null then
 select w.competition_id into cid from public.quiz_winners w join public.quiz_competitions cc on cc.id=w.competition_id
 where w.user_id=u and cc.status='RESULTS_PUBLISHED' and not exists(select 1 from public.payment_submissions ps where ps.coupon_redemption_id=w.redemption_id)
 order by w.approved_at desc limit 1;
 end if;
 -- Configuration mutations and starts serialize; normal play shares the competition lock.
 if p_action like 'admin_%' or p_action in ('start','claim') then
 select * into c from public.quiz_competitions where id=cid for update;
 else select * into c from public.quiz_competitions where id=cid for share; end if;
 if c.id is null or (c.status='DRAFT' and not admin_ok) then return jsonb_build_object('success',false,'error','Competition unavailable.'); end if;
 if p_action='admin_save' then
 if c.status<>'DRAFT' then return jsonb_build_object('success',false,'error','Only drafts can be edited.'); end if;
 update public.quiz_competitions set title=coalesce(p_payload->>'title',title),description=coalesce(p_payload->>'description',description),
 start_at=(p_payload->>'start_at')::timestamptz,end_at=(p_payload->>'end_at')::timestamptz,
 question_count=coalesce((p_payload->>'question_count')::int,question_count),seconds_per_question=coalesce((p_payload->>'seconds_per_question')::int,seconds_per_question),
 blueprint=coalesce(p_payload->'blueprint',blueprint),risk_weights=coalesce(p_payload->'risk_weights',risk_weights) where id=cid;
 elsif p_action='admin_question' then
 if c.status<>'DRAFT' then return jsonb_build_object('success',false,'error','Question bank is frozen after scheduling.'); end if;
 if jsonb_typeof(p_payload->'options')<>'array' or exists(select 1 from jsonb_array_elements(p_payload->'options') v where jsonb_typeof(v)<>'string' or length(v#>>'{}') not between 1 and 500) then return jsonb_build_object('success',false,'error','Four nonempty text options required.'); end if;
 if p_payload->>'id' is not null then
 update public.quiz_questions set subject=p_payload->>'subject',difficulty=p_payload->>'difficulty',question_text=p_payload->>'question_text',options=p_payload->'options',correct_index=(p_payload->>'correct_index')::int,marks=(p_payload->>'marks')::int,active=coalesce((p_payload->>'active')::boolean,true) where id=(p_payload->>'id')::uuid and competition_id=cid;
 if not found then return jsonb_build_object('success',false,'error','Question not found.'); end if;
 else
 insert into public.quiz_questions(competition_id,subject,difficulty,question_text,options,correct_index,marks) values(cid,p_payload->>'subject',p_payload->>'difficulty',p_payload->>'question_text',p_payload->'options',(p_payload->>'correct_index')::int,(p_payload->>'marks')::int);
 end if;
 elsif p_action='admin_transition' then
 next_state:=p_payload->>'status';
 if not ((c.status='DRAFT' and next_state='UPCOMING') or (c.status='UPCOMING' and next_state='OPEN') or (c.status='OPEN' and next_state='LIVE') or (c.status in ('OPEN','LIVE') and next_state='CLOSED') or (c.status='CLOSED' and next_state='UNDER_REVIEW') or (c.status='UNDER_REVIEW' and next_state='RESULTS_PUBLISHED')) then return jsonb_build_object('success',false,'error','Invalid competition transition.'); end if;
 if next_state='UPCOMING' then
 if c.start_at is null or c.end_at is null or c.end_at<=clock_timestamp()+make_interval(secs=>c.question_count*c.seconds_per_question) then return jsonb_build_object('success',false,'error','Set a valid schedule first.'); end if;
 if exists(select 1 from jsonb_each(c.risk_weights) e where jsonb_typeof(e.value)<>'number' or (e.value::text)::numeric not between 0 and 25 or (e.value::text)::numeric<>trunc((e.value::text)::numeric)) then return jsonb_build_object('success',false,'error','Risk weights must be integers from 0 to 25.'); end if;
 for slot in select value from jsonb_array_elements(c.blueprint) loop
 if not (slot ?& array['subject','difficulty','marks']) or (slot->>'marks')::int not between 1 and 10 then return jsonb_build_object('success',false,'error','Invalid blueprint slot.'); end if;
 select count(*) into n from public.quiz_questions where competition_id=cid and active and subject=slot->>'subject' and difficulty=slot->>'difficulty' and marks=(slot->>'marks')::int;
 if n < 3*(select count(*) from jsonb_array_elements(c.blueprint) s where s=slot) then return jsonb_build_object('success',false,'error','Each blueprint slot needs at least three eligible questions.'); end if;
 end loop;
 end if;
 if next_state in ('CLOSED','UNDER_REVIEW','RESULTS_PUBLISHED') then
 for aid in select id from public.quiz_attempts where competition_id=cid and status='ACTIVE' order by id loop perform quiz_private.sync(aid); end loop;
 if next_state in ('UNDER_REVIEW','RESULTS_PUBLISHED') and exists(select 1 from public.quiz_attempts where competition_id=cid and status='ACTIVE') then return jsonb_build_object('success',false,'error','Wait for all active attempts to finish.'); end if;
 end if;
 if next_state='RESULTS_PUBLISHED' then
 if exists(select 1 from public.quiz_attempts where competition_id=cid and review_status in ('PENDING','FLAGGED')) then return jsonb_build_object('success',false,'error','Review every attempt before publication.'); end if;
 if exists (
 select 1 from (select score,completion_ms,row_number() over(order by score desc,completion_ms,id) rn from public.quiz_attempts where competition_id=cid and review_status='APPROVED') third
 join (select score,completion_ms,row_number() over(order by score desc,completion_ms,id) rn from public.quiz_attempts where competition_id=cid and review_status='APPROVED') fourth on third.score=fourth.score and third.completion_ms=fourth.completion_ms
 where third.rn=3 and fourth.rn=4) then return jsonb_build_object('success',false,'error','Exact tie crosses the Top 3 boundary. Resolve the tied candidates with a documented review before publication.'); end if;
 insert into public.coupon_campaigns(max_redemptions,is_active) values(3,true) returning id into campaign;
 update public.quiz_competitions set campaign_id=campaign where id=cid;
 insert into public.quiz_winners(competition_id,user_id,attempt_id,rank,approved_by)
 select cid,user_id,id,row_number() over(order by score desc,completion_ms asc,id)::int,u from public.quiz_attempts where competition_id=cid and review_status='APPROVED' order by score desc,completion_ms asc,id limit 3;
 end if;
 update public.quiz_competitions set status=next_state where id=cid;
 elsif p_action='admin_review' then
 if c.status<>'UNDER_REVIEW' or p_payload->>'status' not in ('APPROVED','REJECTED','FLAGGED') or length(trim(coalesce(p_payload->>'reason','')))<5 then return jsonb_build_object('success',false,'error','Review requires UNDER_REVIEW status and a reason of at least five characters.'); end if;
 update public.quiz_attempts set review_status=p_payload->>'status',review_reason=left(p_payload->>'reason',2000),reviewed_by=u,reviewed_at=clock_timestamp() where id=(p_payload->>'attempt_id')::uuid and competition_id=cid and status<>'ACTIVE';
 if not found then return jsonb_build_object('success',false,'error','Completed attempt not found.'); end if;
 elsif p_action='admin_detail' then
 for aid in select id from public.quiz_attempts where competition_id=cid and status='ACTIVE' and deadline<=clock_timestamp() order by id limit 500 loop perform quiz_private.sync(aid); end loop;
 offset_n:=greatest(0,least(coalesce((p_payload->>'offset')::int,0),100000));
 select jsonb_build_object('success',true,'competition',to_jsonb(c),
 'questions',(select coalesce(jsonb_agg(x),'[]') from (select * from public.quiz_questions where competition_id=cid order by created_at,id limit 500) x),
 'participants',(select coalesce(jsonb_agg(x),'[]') from (select att.*,p.full_name,p.email,p.semester,p.course,
 (select count(*) from public.quiz_attempt_questions where attempt_id=att.id and state='TIMED_OUT') timeouts,
 (select count(*) from public.quiz_events where attempt_id=att.id and event_type='TAB_HIDDEN') tab_events,
 count(*) over(partition by att.score,att.completion_ms)>1 as merit_tie,
 row_number() over(order by att.score desc,att.completion_ms asc nulls last,att.id) as rank
 from public.quiz_attempts att join public.profiles p on p.user_id=att.user_id where att.competition_id=cid order by att.score desc,att.completion_ms asc nulls last,att.id limit 100 offset offset_n) x),
 'analytics',(select jsonb_build_object('total',count(*),'active',count(*) filter(where status='ACTIVE' and deadline>clock_timestamp()),'completed',count(*) filter(where status<>'ACTIVE' or deadline<=clock_timestamp()),'average_score',avg(score),'highest_score',max(score),'lowest_score',min(score),'average_completion_ms',avg(completion_ms),'suspicious',count(*) filter(where risk_score>=10)) from public.quiz_attempts where competition_id=cid),
 'audit',(select coalesce(jsonb_agg(x),'[]') from (select action,actor_id,created_at,metadata from public.activity_logs where target_type='quiz' and target_id=cid::text order by created_at desc limit 100) x)) into response;
 return response;
 elsif p_action='admin_timeline' then
 aid:=(p_payload->>'attempt_id')::uuid;
 if not exists(select 1 from public.quiz_attempts where id=aid and competition_id=cid) then return jsonb_build_object('success',false,'error','Attempt not found.'); end if;
 return jsonb_build_object('success',true,'events',(select coalesce(jsonb_agg(x),'[]') from (select * from public.quiz_events where attempt_id=aid order by id limit 1000) x),
 'assignments',(select jsonb_agg(x order by position) from public.quiz_attempt_questions x where attempt_id=aid));
 elsif p_action='claim' then
 if c.status<>'RESULTS_PUBLISHED' or not exists(select 1 from public.quiz_winners where competition_id=cid and user_id=u) then return jsonb_build_object('success',false,'error','No published winner offer is available for this account.'); end if;
 select redemption_id into rid from public.quiz_winners where competition_id=cid and user_id=u;
 if exists(select 1 from public.payment_submissions where coupon_redemption_id=rid) then return jsonb_build_object('success',false,'error','This winner offer has already been used.'); end if;
 if rid is null then
 insert into public.coupon_redemptions(campaign_id,user_id) values(c.campaign_id,u) on conflict(campaign_id,user_id) do update set user_id=excluded.user_id returning id into rid;
 update public.quiz_winners set redemption_id=rid where competition_id=cid and user_id=u;
 insert into public.activity_logs(actor_id,action,target_type,target_id) values(u,'QUIZ_REWARD_CLAIMED','quiz',cid::text);
 end if;
 return jsonb_build_object('success',true,'redemption_id',rid,'final_price',299);
 else
 if p_action not in ('detail','start','current','answer','event','submit') then return jsonb_build_object('success',false,'error','Unknown operation.'); end if;
 select * into a from public.quiz_attempts where competition_id=cid and user_id=u for update;
 if p_payload->>'attempt_id' is not null and (a.id is null or a.id<>(p_payload->>'attempt_id')::uuid) then return jsonb_build_object('success',false,'error','Attempt not found.'); end if;
 if p_action='start' and a.id is null then
 t:=clock_timestamp();
 if admin_ok or c.status not in ('OPEN','LIVE') or c.start_at is null or t<c.start_at or t+make_interval(secs=>c.question_count*c.seconds_per_question)>c.end_at then return jsonb_build_object('success',false,'error','Competition is not accepting new attempts.'); end if;
 insert into public.quiz_attempts(competition_id,user_id,started_at,deadline) values(cid,u,t,t+make_interval(secs=>c.question_count*c.seconds_per_question)) returning * into a;
 n:=0;
 for slot in select value from jsonb_array_elements(c.blueprint) order by random() loop
 select * into q from public.quiz_questions where competition_id=cid and active and subject=slot->>'subject' and difficulty=slot->>'difficulty' and marks=(slot->>'marks')::int and not(id=any(picked)) order by usage_count,random() limit 1;
 if q.id is null then raise exception 'Insufficient question pool'; end if;
 picked:=array_append(picked,q.id); n:=n+1;
 select jsonb_agg(jsonb_build_object('id',oid,'text',value) order by shuffle), (array_agg(oid) filter(where ord-1=q.correct_index))[1]
 into opts,correct from (select value,ord,gen_random_uuid() oid,random() shuffle from jsonb_array_elements_text(q.options) with ordinality e(value,ord)) s;
 insert into public.quiz_attempt_questions(attempt_id,question_id,position,question_text,subject,difficulty,options,correct_option,marks,state,started_at,deadline)
 values(a.id,q.id,n,q.question_text,q.subject,q.difficulty,opts,correct,q.marks,case when n=1 then 'ACTIVE' else 'PENDING' end,case when n=1 then t end,case when n=1 then t+make_interval(secs=>c.seconds_per_question) end);
 update public.quiz_questions set usage_count=usage_count+1 where id=q.id;
 end loop;
 perform quiz_private.event(a.id,'QUIZ_STARTED'); perform quiz_private.event(a.id,'QUESTION_STARTED');
 end if;
 if a.id is null then
 if p_action not in ('detail','current') then return jsonb_build_object('success',false,'error','Start the quiz first.'); end if;
 return quiz_private.present(cid,u);
 end if;
 perform quiz_private.sync(a.id);
 select * into a from public.quiz_attempts where id=a.id;
 if p_action='answer' then
 select * into aq from public.quiz_attempt_questions where id=(p_payload->>'question_id')::uuid and attempt_id=a.id;
 if aq.id is null then return jsonb_build_object('success',false,'error','Question not found.'); end if;
 if aq.state in ('ANSWERED','TIMED_OUT') then
 perform quiz_private.event(a.id,case when aq.state='ANSWERED' then 'DUPLICATE_REQUEST' else 'LATE_REQUEST' end);
 return quiz_private.present(cid,u)||jsonb_build_object('answer_accepted',false,'notice','This question is already locked.');
 end if;
 t:=clock_timestamp();
 if a.status<>'ACTIVE' or aq.state<>'ACTIVE' or aq.position<>a.current_position or t>=aq.deadline or c.status not in ('OPEN','LIVE','CLOSED') then
 return jsonb_build_object('success',false,'error','Question is no longer active.'); end if;
 if not exists(select 1 from jsonb_array_elements(aq.options) v where v->>'id'=p_payload->>'option_id') then return jsonb_build_object('success',false,'error','Invalid option.'); end if;
 update public.quiz_attempt_questions set selected_option=(p_payload->>'option_id')::uuid,state='ANSWERED',submitted_at=t,earned_marks=case when correct_option=(p_payload->>'option_id')::uuid then marks else 0 end where id=aq.id;
 perform quiz_private.event(a.id,'QUESTION_ANSWERED'); perform quiz_private.sync(a.id);
 elsif p_action='event' then
 if a.status='ACTIVE' and p_payload->>'event_type' in ('TAB_HIDDEN','TAB_VISIBLE','WINDOW_BLUR','WINDOW_FOCUS','FULLSCREEN_ENTER','FULLSCREEN_EXIT','COPY_ATTEMPT','PASTE_ATTEMPT','CONTEXT_MENU_ATTEMPT','KEYBOARD_SHORTCUT_ATTEMPT','PAGE_REFRESH','NETWORK_RECONNECT') then
 if (select count(*) from public.quiz_events where attempt_id=a.id and source='browser')<200 then perform quiz_private.event(a.id,p_payload->>'event_type','browser'); end if;
 end if;
 elsif p_action='submit' and a.status='ACTIVE' then
 -- An early finish cannot improve tie-break time: unanswered time is charged in full.
 update public.quiz_attempt_questions set state='TIMED_OUT',started_at=coalesce(started_at,a.deadline-make_interval(secs=>c.seconds_per_question)),deadline=coalesce(deadline,a.deadline),submitted_at=coalesce(deadline,a.deadline) where attempt_id=a.id and state in ('PENDING','ACTIVE');
 update public.quiz_attempts set status='AUTO_SUBMITTED',completed_at=deadline,completion_ms=c.question_count*c.seconds_per_question*1000,
 score=(select coalesce(sum(earned_marks),0) from public.quiz_attempt_questions where attempt_id=a.id) where id=a.id;
 perform quiz_private.event(a.id,'AUTO_SUBMITTED');
 end if;
 return quiz_private.present(cid,u);
 end if;
 insert into public.activity_logs(actor_id,action,target_type,target_id,metadata) values(u,upper(p_action),'quiz',cid::text,jsonb_build_object('status',p_payload->>'status','attempt_id',p_payload->>'attempt_id','reason',p_payload->>'reason'));
 return jsonb_build_object('success',true,'competition_id',cid);
end $$;
revoke all on all functions in schema quiz_private from public,anon,authenticated;
revoke all on function public.quiz_api(text,jsonb) from public,anon;
grant execute on function public.quiz_api(text,jsonb) to authenticated;

-- Old shared-code APIs must not remain an alternate route into the winner price.
DO $$ declare f record; begin
 for f in select p.oid::regprocedure sig from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in ('redeem_top3_winner_coupon','redeem_winner_coupon','consume_winner_redemption') loop
 execute format('revoke all on function %s from public,anon,authenticated',f.sig);
 end loop;
end $$;

-- Payment authorization also runs for service-role inserts, atomically with the unique redemption index.
create function quiz_private.check_reward_payment() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.amount=299 then
 if new.user_id is null or new.semester<>1 or not exists(
 select 1 from public.quiz_winners w join public.quiz_competitions c on c.id=w.competition_id
 join public.coupon_redemptions r on r.id=w.redemption_id join public.coupon_campaigns cc on cc.id=r.campaign_id
 where w.user_id=new.user_id and w.redemption_id=new.coupon_redemption_id and r.user_id=new.user_id and r.campaign_id=c.campaign_id and cc.is_active and c.status='RESULTS_PUBLISHED') then
 raise exception 'Published account-bound quiz reward required' using errcode='42501'; end if;
 elsif new.coupon_redemption_id is not null then raise exception 'Winner redemption requires winner price'; end if;
 return new;
end $$;
revoke all on function quiz_private.check_reward_payment() from public,anon,authenticated;
create trigger quiz_reward_payment before insert or update of amount,user_id,semester,coupon_redemption_id on public.payment_submissions for each row execute function quiz_private.check_reward_payment();

-- Prepared draft: administrators must review the pool and schedule before opening.
DO $seed$ declare cid uuid; begin
insert into public.quiz_competitions(title,description,question_count,seconds_per_question,blueprint) values(
  'Semester 1 Knowledge Challenge',
  'A beginner-friendly revision test covering basic C programming, algorithms, computer fundamentals, and web technologies.',
  20,
  20,
  '[{"subject":"Algorithms and Program Design using C","difficulty":"very_easy","marks":1},{"subject":"Algorithms and Program Design using C","difficulty":"very_easy","marks":1},{"subject":"Algorithms and Program Design using C","difficulty":"very_easy","marks":1},{"subject":"Algorithms and Program Design using C","difficulty":"very_easy","marks":1},{"subject":"Algorithms and Program Design using C","difficulty":"very_easy","marks":1},{"subject":"Foundation of Computing","difficulty":"very_easy","marks":1},{"subject":"Foundation of Computing","difficulty":"very_easy","marks":1},{"subject":"Foundation of Computing","difficulty":"very_easy","marks":1},{"subject":"Foundation of Computing","difficulty":"very_easy","marks":1},{"subject":"Foundation of Computing","difficulty":"very_easy","marks":1},{"subject":"Client-Side Web Technologies","difficulty":"very_easy","marks":1},{"subject":"Client-Side Web Technologies","difficulty":"very_easy","marks":1},{"subject":"Client-Side Web Technologies","difficulty":"very_easy","marks":1},{"subject":"Client-Side Web Technologies","difficulty":"very_easy","marks":1},{"subject":"Client-Side Web Technologies","difficulty":"very_easy","marks":1},{"subject":"Algorithms and Program Design using C","difficulty":"easy","marks":1},{"subject":"Algorithms and Program Design using C","difficulty":"easy","marks":1},{"subject":"Foundation of Computing","difficulty":"easy","marks":1},{"subject":"Foundation of Computing","difficulty":"easy","marks":1},{"subject":"Client-Side Web Technologies","difficulty":"easy","marks":1}]'
) returning id into cid;
insert into public.quiz_questions(competition_id,subject,difficulty,question_text,options,correct_index,marks)
select cid,subject,difficulty,question_text,options,correct_index,marks
from jsonb_to_recordset('[{"subject":"Algorithms and Program Design using C","difficulty":"very_easy","question_text":"Who developed the C programming language?","options":["Dennis Ritchie","James Gosling","Guido van Rossum","Bjarne Stroustrup"],"correct_index":0,"marks":1},{"subject":"Algorithms and Program Design using C","difficulty":"very_easy","question_text":"What is a variable in C programming?","options":["A named memory location that stores data","A physical computer cable","A type of monitor screen","A hardware printer part"],"correct_index":0,"marks":1},{"subject":"Algorithms and Program Design using C","difficulty":"very_easy","question_text":"Which data type in C is used to store whole numbers (integers)?","options":["int","float","char","double"],"correct_index":0,"marks":1},{"subject":"Algorithms and Program Design using C","difficulty":"very_easy","question_text":"Which data type in C is used to store decimal numbers like 3.14?","options":["float","int","char","void"],"correct_index":0,"marks":1},{"subject":"Algorithms and Program Design using C","difficulty":"very_easy","question_text":"Which data type in C is used to store a single character like ''A''?","options":["char","int","float","void"],"correct_index":0,"marks":1},{"subject":"Algorithms and Program Design using C","difficulty":"very_easy","question_text":"Which standard library function is used to display output on the screen in C?","options":["printf()","scanf()","input()","print_screen()"],"correct_index":0,"marks":1},{"subject":"Algorithms and Program Design using C","difficulty":"very_easy","question_text":"Which standard library function is used to take input from the user in C?","options":["scanf()","printf()","output()","read_text()"],"correct_index":0,"marks":1},{"subject":"Algorithms and Program Design using C","difficulty":"very_easy","question_text":"What will this statement print on the screen?\nprintf(\"Hello\");","options":["Hello","Hi","Error","Nothing"],"correct_index":0,"marks":1},{"subject":"Algorithms and Program Design using C","difficulty":"very_easy","question_text":"Which character ends every executable statement in C?","options":["; (Semicolon)",": (Colon)",". (Dot)","# (Hash)"],"correct_index":0,"marks":1},{"subject":"Algorithms and Program Design using C","difficulty":"very_easy","question_text":"Which header file is required to use printf() and scanf() in C?","options":["stdio.h","math.h","string.h","conio.h"],"correct_index":0,"marks":1},{"subject":"Algorithms and Program Design using C","difficulty":"very_easy","question_text":"Which relational operator tests if two values are equal in C?","options":["==","=","!=","<="],"correct_index":0,"marks":1},{"subject":"Algorithms and Program Design using C","difficulty":"very_easy","question_text":"Which statement is used to execute code only when a condition is true?","options":["if","for","return","include"],"correct_index":0,"marks":1},{"subject":"Algorithms and Program Design using C","difficulty":"very_easy","question_text":"Which loop in C is commonly used when the number of iterations is known in advance?","options":["for loop","stop loop","jump loop","wait loop"],"correct_index":0,"marks":1},{"subject":"Algorithms and Program Design using C","difficulty":"very_easy","question_text":"Every standard C program begins its execution from which function?","options":["main()","start()","begin()","run()"],"correct_index":0,"marks":1},{"subject":"Algorithms and Program Design using C","difficulty":"very_easy","question_text":"What is an algorithm?","options":["A step-by-step procedure to solve a problem","A physical computer monitor","A programming language","A storage disk"],"correct_index":0,"marks":1},{"subject":"Algorithms and Program Design using C","difficulty":"very_easy","question_text":"What is the result produced by an algorithm called?","options":["Output","Keyboard error","Electrical power","Printed paper"],"correct_index":0,"marks":1},{"subject":"Algorithms and Program Design using C","difficulty":"very_easy","question_text":"What is the process of arranging data in ascending or descending order called?","options":["Sorting","Searching","Deleting","Typing"],"correct_index":0,"marks":1},{"subject":"Algorithms and Program Design using C","difficulty":"very_easy","question_text":"What does this pseudocode do?\n\nSTART\nINPUT A\nINPUT B\nSUM = A + B\nPRINT SUM\nEND","options":["Adds two numbers","Subtracts two numbers","Multiplies two numbers","Divides two numbers"],"correct_index":0,"marks":1},{"subject":"Algorithms and Program Design using C","difficulty":"easy","question_text":"Which arithmetic operator in C calculates the remainder of a division?","options":["% (Modulus)","/ (Division)","* (Multiplication)","+ (Addition)"],"correct_index":0,"marks":1},{"subject":"Algorithms and Program Design using C","difficulty":"easy","question_text":"In C, array indices start from which number by default?","options":["0","1","-1","2"],"correct_index":0,"marks":1},{"subject":"Algorithms and Program Design using C","difficulty":"easy","question_text":"Which symbol begins a single-line comment in modern C?","options":["//","/*","#","<!--"],"correct_index":0,"marks":1},{"subject":"Algorithms and Program Design using C","difficulty":"easy","question_text":"Which format specifier is used in printf() to display an integer value in C?","options":["%d","%f","%c","%s"],"correct_index":0,"marks":1},{"subject":"Algorithms and Program Design using C","difficulty":"easy","question_text":"Which format specifier is used in printf() to display a floating-point number in C?","options":["%f","%d","%c","%s"],"correct_index":0,"marks":1},{"subject":"Algorithms and Program Design using C","difficulty":"easy","question_text":"Which loop in C tests its condition before executing any statements in its body?","options":["while loop","do-while loop","repeat loop","until loop"],"correct_index":0,"marks":1},{"subject":"Algorithms and Program Design using C","difficulty":"easy","question_text":"What is an array in C?","options":["A collection of elements of the same data type","A text document file","A physical mouse button","A network cable"],"correct_index":0,"marks":1},{"subject":"Algorithms and Program Design using C","difficulty":"easy","question_text":"In pseudocode, which keyword is commonly used to take input from the user?","options":["INPUT","PRINT","DISPLAY","WRITE"],"correct_index":0,"marks":1},{"subject":"Algorithms and Program Design using C","difficulty":"easy","question_text":"What is the process of finding the position of a specific element in a list called?","options":["Searching","Sorting","Formatting","Compiling"],"correct_index":0,"marks":1},{"subject":"Algorithms and Program Design using C","difficulty":"easy","question_text":"Which keyword is used to return a result from a C function to its caller?","options":["return","send","output","give"],"correct_index":0,"marks":1},{"subject":"Foundation of Computing","difficulty":"very_easy","question_text":"What is a computer?","options":["An electronic device that accepts data, processes it, and produces output","A manual mechanical calculator","A television with a speaker","A printer that only prints paper"],"correct_index":0,"marks":1},{"subject":"Foundation of Computing","difficulty":"very_easy","question_text":"Which component is commonly called the \"Brain of the Computer\"?","options":["CPU (Central Processing Unit)","Keyboard","Monitor","Mouse"],"correct_index":0,"marks":1},{"subject":"Foundation of Computing","difficulty":"very_easy","question_text":"What does CPU stand for?","options":["Central Processing Unit","Central Power Utility","Computer Program Unit","Control Processing User"],"correct_index":0,"marks":1},{"subject":"Foundation of Computing","difficulty":"very_easy","question_text":"Which part of the CPU performs mathematical and logical operations?","options":["ALU (Arithmetic Logic Unit)","Monitor","Hard Disk","Power Supply"],"correct_index":0,"marks":1},{"subject":"Foundation of Computing","difficulty":"very_easy","question_text":"Which type of computer memory is temporary and loses data when power is switched off?","options":["RAM (Random Access Memory)","ROM (Read Only Memory)","Hard Disk","CD-ROM"],"correct_index":0,"marks":1},{"subject":"Foundation of Computing","difficulty":"very_easy","question_text":"Which memory permanently stores startup instructions (BIOS) and is non-volatile?","options":["ROM (Read Only Memory)","RAM","Cache Memory","Virtual Memory"],"correct_index":0,"marks":1},{"subject":"Foundation of Computing","difficulty":"very_easy","question_text":"How many bits make up one byte?","options":["8","4","16","32"],"correct_index":0,"marks":1},{"subject":"Foundation of Computing","difficulty":"very_easy","question_text":"Which device is used to enter text, numbers, and commands into a computer?","options":["Keyboard","Monitor","Printer","Speaker"],"correct_index":0,"marks":1},{"subject":"Foundation of Computing","difficulty":"very_easy","question_text":"Which device is an output device used to display visual graphics and text?","options":["Monitor","Keyboard","Mouse","Microphone"],"correct_index":0,"marks":1},{"subject":"Foundation of Computing","difficulty":"very_easy","question_text":"Which device produces a printed physical copy of a digital document on paper?","options":["Printer","Scanner","Keyboard","Webcam"],"correct_index":0,"marks":1},{"subject":"Foundation of Computing","difficulty":"very_easy","question_text":"Which device is a hand-held pointing input device used to click on screen items?","options":["Mouse","Speaker","Printer","Hard Disk"],"correct_index":0,"marks":1},{"subject":"Foundation of Computing","difficulty":"very_easy","question_text":"What type of software is an Operating System (such as Windows or Linux)?","options":["System Software","Application Software","Hardware Device","Game Software"],"correct_index":0,"marks":1},{"subject":"Foundation of Computing","difficulty":"very_easy","question_text":"What is the primary role of an Operating System?","options":["To manage computer hardware and run applications","To physically cool the CPU","To manufacture memory chips","To generate electric power"],"correct_index":0,"marks":1},{"subject":"Foundation of Computing","difficulty":"very_easy","question_text":"What are software applications created for end users (like MS Word or Chrome) called?","options":["Application Software","System Firmware","Hardware Components","BIOS Software"],"correct_index":0,"marks":1},{"subject":"Foundation of Computing","difficulty":"very_easy","question_text":"What do we call the physical, touchable electronic components of a computer?","options":["Hardware","Software","Freeware","Shareware"],"correct_index":0,"marks":1},{"subject":"Foundation of Computing","difficulty":"very_easy","question_text":"What is the worldwide network connecting millions of computers globally called?","options":["Internet","USB Cable","Motherboard","Floppy Disk"],"correct_index":0,"marks":1},{"subject":"Foundation of Computing","difficulty":"very_easy","question_text":"What does LAN stand for in computer networking?","options":["Local Area Network","Large Area Network","Link Access Node","Line Area Network"],"correct_index":0,"marks":1},{"subject":"Foundation of Computing","difficulty":"very_easy","question_text":"Which Microsoft Office software is used to create and edit text documents and letters?","options":["MS Word","MS Excel","MS PowerPoint","MS Access"],"correct_index":0,"marks":1},{"subject":"Foundation of Computing","difficulty":"easy","question_text":"Which component of the CPU directs and coordinates the flow of all computer operations?","options":["Control Unit (CU)","RAM","Monitor Screen","Keyboard"],"correct_index":0,"marks":1},{"subject":"Foundation of Computing","difficulty":"easy","question_text":"What does WAN stand for in computer networking?","options":["Wide Area Network","Wireless Area Node","Web Access Network","World Audio Net"],"correct_index":0,"marks":1},{"subject":"Foundation of Computing","difficulty":"easy","question_text":"Which Microsoft Office software is used for spreadsheets, calculations, and tables?","options":["MS Excel","MS Word","MS PowerPoint","MS Paint"],"correct_index":0,"marks":1},{"subject":"Foundation of Computing","difficulty":"easy","question_text":"Which Microsoft Office software is used to create slide presentations for talks?","options":["MS PowerPoint","MS Word","MS Excel","Notepad"],"correct_index":0,"marks":1},{"subject":"Foundation of Computing","difficulty":"easy","question_text":"What is a Hard Disk Drive (HDD) or SSD primarily used for in a computer?","options":["Permanent storage of files and programs","Temporary audio recording","Power generation","Displaying monitor pixels"],"correct_index":0,"marks":1},{"subject":"Foundation of Computing","difficulty":"easy","question_text":"Which keyboard shortcut is commonly used to copy selected content in Windows?","options":["Ctrl + C","Ctrl + V","Ctrl + Z","Ctrl + P"],"correct_index":0,"marks":1},{"subject":"Foundation of Computing","difficulty":"easy","question_text":"Which keyboard shortcut is commonly used to paste copied content in Windows?","options":["Ctrl + V","Ctrl + C","Ctrl + X","Ctrl + S"],"correct_index":0,"marks":1},{"subject":"Foundation of Computing","difficulty":"easy","question_text":"Which device is an input device used to convert physical paper documents into digital images?","options":["Scanner","Printer","Monitor","Speaker"],"correct_index":0,"marks":1},{"subject":"Foundation of Computing","difficulty":"easy","question_text":"The binary number system used by digital computers consists of which two digits?","options":["0 and 1","1 and 2","0 and 9","1 and 10"],"correct_index":0,"marks":1},{"subject":"Foundation of Computing","difficulty":"easy","question_text":"Which keyboard shortcut is used to quickly save the current file in Windows applications?","options":["Ctrl + S","Ctrl + O","Ctrl + N","Ctrl + W"],"correct_index":0,"marks":1},{"subject":"Client-Side Web Technologies","difficulty":"very_easy","question_text":"What does HTML stand for?","options":["HyperText Markup Language","HighText Machine Language","Hyperlink Text Maker","Home Tool Markup Language"],"correct_index":0,"marks":1},{"subject":"Client-Side Web Technologies","difficulty":"very_easy","question_text":"What is HTML primarily used for on the web?","options":["Structuring the content of a web page","Running computer hardware","Managing relational databases","Compiling C code"],"correct_index":0,"marks":1},{"subject":"Client-Side Web Technologies","difficulty":"very_easy","question_text":"Which HTML tag is used for the largest, main heading on a page?","options":["<h1>","<h6>","<p>","<head>"],"correct_index":0,"marks":1},{"subject":"Client-Side Web Technologies","difficulty":"very_easy","question_text":"Which HTML tag is used to create a paragraph of text?","options":["<p>","<para>","<text>","<b>"],"correct_index":0,"marks":1},{"subject":"Client-Side Web Technologies","difficulty":"very_easy","question_text":"Which HTML tag is used to insert a single line break?","options":["<br>","<break>","<lb>","<hr>"],"correct_index":0,"marks":1},{"subject":"Client-Side Web Technologies","difficulty":"very_easy","question_text":"Which HTML tag is used to create a clickable hyperlink?","options":["<a>","<link>","<href>","<url>"],"correct_index":0,"marks":1},{"subject":"Client-Side Web Technologies","difficulty":"very_easy","question_text":"Which attribute of the <a> tag specifies the web address destination?","options":["href","src","link","to"],"correct_index":0,"marks":1},{"subject":"Client-Side Web Technologies","difficulty":"very_easy","question_text":"Which HTML tag is used to display an image on a web page?","options":["<img>","<image>","<pic>","<photo>"],"correct_index":0,"marks":1},{"subject":"Client-Side Web Technologies","difficulty":"very_easy","question_text":"Which attribute of the <img> tag specifies the image file path or URL?","options":["src","href","file","path"],"correct_index":0,"marks":1},{"subject":"Client-Side Web Technologies","difficulty":"very_easy","question_text":"Which HTML tag contains all the visible content displayed to the user?","options":["<body>","<head>","<title>","<meta>"],"correct_index":0,"marks":1},{"subject":"Client-Side Web Technologies","difficulty":"very_easy","question_text":"Which HTML tag is used to create an unordered (bulleted) list?","options":["<ul>","<ol>","<li>","<bullet>"],"correct_index":0,"marks":1},{"subject":"Client-Side Web Technologies","difficulty":"very_easy","question_text":"What does CSS stand for?","options":["Cascading Style Sheets","Computer Style Sheets","Creative Style System","Color Style Software"],"correct_index":0,"marks":1},{"subject":"Client-Side Web Technologies","difficulty":"very_easy","question_text":"What is CSS mainly used for in web development?","options":["Styling and designing web page layouts","Managing database records","Writing operating system drivers","Processing computer memory"],"correct_index":0,"marks":1},{"subject":"Client-Side Web Technologies","difficulty":"very_easy","question_text":"Which CSS property is used to change the color of text?","options":["color","text-color","font-color","background-color"],"correct_index":0,"marks":1},{"subject":"Client-Side Web Technologies","difficulty":"very_easy","question_text":"Which CSS property is used to change the background color of an element?","options":["background-color","color","bg-color","canvas-color"],"correct_index":0,"marks":1},{"subject":"Client-Side Web Technologies","difficulty":"very_easy","question_text":"Which CSS property changes the size of the text font?","options":["font-size","text-size","font-weight","text-style"],"correct_index":0,"marks":1},{"subject":"Client-Side Web Technologies","difficulty":"very_easy","question_text":"Which CSS property is used to align text (e.g. center, left, right)?","options":["text-align","align-content","float","font-style"],"correct_index":0,"marks":1},{"subject":"Client-Side Web Technologies","difficulty":"very_easy","question_text":"Which language is used to add interactive behavior and logic to web pages?","options":["JavaScript","HTML alone","CSS alone","SQL"],"correct_index":0,"marks":1},{"subject":"Client-Side Web Technologies","difficulty":"easy","question_text":"Which HTML tag is used to create an ordered (numbered) list?","options":["<ol>","<ul>","<li>","<list>"],"correct_index":0,"marks":1},{"subject":"Client-Side Web Technologies","difficulty":"easy","question_text":"Which HTML tag defines an individual list item inside <ul> or <ol>?","options":["<li>","<item>","<list>","<point>"],"correct_index":0,"marks":1},{"subject":"Client-Side Web Technologies","difficulty":"easy","question_text":"Which HTML tag is used to create a row in an HTML table?","options":["<tr>","<td>","<th>","<row>"],"correct_index":0,"marks":1},{"subject":"Client-Side Web Technologies","difficulty":"easy","question_text":"Which HTML tag defines a standard data cell inside a table row?","options":["<td>","<tr>","<th>","<cell>"],"correct_index":0,"marks":1},{"subject":"Client-Side Web Technologies","difficulty":"easy","question_text":"In the CSS box model, what creates space inside an element between content and border?","options":["padding","margin","outline","border"],"correct_index":0,"marks":1},{"subject":"Client-Side Web Technologies","difficulty":"easy","question_text":"In the CSS box model, what creates space outside an element''s border?","options":["margin","padding","content","background"],"correct_index":0,"marks":1},{"subject":"Client-Side Web Technologies","difficulty":"easy","question_text":"Which HTML tag inside <head> is used to link an external CSS stylesheet file?","options":["<link>","<style>","<css>","<script>"],"correct_index":0,"marks":1},{"subject":"Client-Side Web Technologies","difficulty":"easy","question_text":"Which JavaScript function displays a popup message dialog in the browser?","options":["alert()","popup()","msgBox()","print()"],"correct_index":0,"marks":1},{"subject":"Client-Side Web Technologies","difficulty":"easy","question_text":"Which method writes a message into the browser developer console in JavaScript?","options":["console.log()","print()","system.out()","echo()"],"correct_index":0,"marks":1},{"subject":"Client-Side Web Technologies","difficulty":"easy","question_text":"Which keyword is commonly used to declare a variable in modern JavaScript?","options":["let","int","create","dim"],"correct_index":0,"marks":1}]')
as q(subject text,difficulty text,question_text text,options jsonb,correct_index int,marks int);
end $seed$;
