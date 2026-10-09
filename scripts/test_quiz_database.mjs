import assert from 'node:assert/strict';
import fs from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
const db=new PGlite(); let passed=0;
const test=(name,condition)=>{assert.ok(condition,name);passed++;console.log(`PASS ${name}`);};
const admin='00000000-0000-4000-8000-000000000001', alice='00000000-0000-4000-8000-000000000002', bob='00000000-0000-4000-8000-000000000003';
await db.exec(`
 create role anon; create role authenticated; create schema auth;
 create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
 grant usage on schema auth to authenticated,anon; grant execute on function auth.uid() to authenticated,anon;
 create table auth.users(id uuid primary key);
 create table public.profiles(user_id uuid primary key references auth.users(id),full_name text,email text,semester int,course text);
 create table public.admin_profiles(user_id uuid primary key,role text,status text);
 create function public.is_active_admin() returns boolean language sql security definer set search_path='' as $$select exists(select 1 from public.admin_profiles where user_id=auth.uid() and role='superadmin' and status='active')$$;
 create table public.activity_logs(id bigint generated always as identity primary key,actor_id uuid,action text,target_type text,target_id text,metadata jsonb default '{}',created_at timestamptz default now());
 create table public.coupon_campaigns(id uuid primary key default gen_random_uuid(),max_redemptions int,is_active boolean,code_hash text);
 create table public.coupon_redemptions(id uuid primary key default gen_random_uuid(),campaign_id uuid references public.coupon_campaigns(id),user_id uuid references auth.users(id), unique(campaign_id,user_id));
 create table public.payment_submissions(id uuid primary key default gen_random_uuid(),user_id uuid,semester int,amount numeric,coupon_redemption_id uuid references public.coupon_redemptions(id));
 create unique index payment_submissions_coupon_redemption_unique on public.payment_submissions(coupon_redemption_id) where coupon_redemption_id is not null;
 insert into auth.users values('${admin}'),('${alice}'),('${bob}');
 insert into public.profiles values('${admin}','Admin','admin@test',1,'BCA'),('${alice}','Alice','alice@test',1,'BCA'),('${bob}','Bob','bob@test',1,'BCA');
 insert into public.admin_profiles values('${admin}','superadmin','active');
`);
await db.exec(fs.readFileSync('supabase/migrations/20261008150239_secure_quiz_competitions.sql','utf8').replace(/^\uFEFF/,''));
await db.exec(fs.readFileSync('supabase/migrations/20261009120000_secure_quiz_deletion.sql','utf8').replace(/^\uFEFF/,''));
const cid=(await db.query('select id from quiz_competitions')).rows[0].id;
async function api(user,action,payload={}) {
 await db.exec('reset role'); await db.query("select set_config('request.jwt.claim.sub',$1,false)",[user??'']); await db.exec('set role authenticated');
 try {return (await db.query('select public.quiz_api($1,$2::jsonb) as data',[action,JSON.stringify({competition_id:cid,...payload})])).rows[0].data;}
 finally {await db.exec('reset role');}
}
async function denied(sql,role='authenticated') {await db.exec(`set role ${role}`);let blocked=false;try{await db.exec(sql);}catch{blocked=true;}finally{await db.exec('reset role');}return blocked;}
try {
 test('migration compiles and seeds 84 questions',(await db.query('select count(*)::int n from quiz_questions')).rows[0].n===84);
 test('unauthenticated RPC denied',!(await api(null,'list')).success);
 test('draft hidden from student',!(await api(alice,'detail')).success);
 test('admin endpoint denied to student',!(await api(alice,'admin_detail')).success);
 for(const table of ['quiz_questions','quiz_attempts','quiz_attempt_questions','quiz_events','quiz_winners','quiz_competitions']) test(`direct ${table} read denied`,await denied(`select * from public.${table}`));
 test('private helpers inaccessible',await denied(`select quiz_private.sync(gen_random_uuid())`));
 test('direct score update denied',await denied('update quiz_attempts set score=999'));
 test('anon RPC execute denied',await denied("select quiz_api('list','{}')",'anon'));
 test('client score payload rejected',!(await api(alice,'start',{score:999})).success);
 test('invalid transition denied',!(await api(admin,'admin_transition',{status:'RESULTS_PUBLISHED'})).success);
 test('schedule required',!(await api(admin,'admin_transition',{status:'UPCOMING'})).success);
 const now=Date.now();
 test('save schedule',(await api(admin,'admin_save',{start_at:new Date(now-60000).toISOString(),end_at:new Date(now+3600000).toISOString()})).success);
 test('schedule draft',(await api(admin,'admin_transition',{status:'UPCOMING'})).success);
 test('open competition',(await api(admin,'admin_transition',{status:'OPEN'})).success);
 test('configuration frozen',!(await api(admin,'admin_save',{title:'Changed title'})).success);
 let a=await api(alice,'start'); test('start accepted',a.success&&a.current_question&&a.attempt.status==='ACTIVE');
 test('correct answer and score hidden',!JSON.stringify(a).includes('correct_option')&&!JSON.stringify(a).includes('earned_marks')&&a.result===null);
 const again=await api(alice,'start');test('one attempt and refresh preserve deadline',again.attempt.id===a.attempt.id&&again.current_question.deadline===a.current_question.deadline);
 const assignments=(await db.query('select * from quiz_attempt_questions where attempt_id=$1 order by position',[a.attempt.id])).rows;
 test('twenty immutable assignments',assignments.length===20&&new Set(assignments.map(x=>x.question_id)).size===20);
 test('four randomized opaque options',assignments.every(x=>x.options.length===4&&x.options.some(o=>o.id===x.correct_option)));
 let b=await api(bob,'start');
 test('different participants have different assignment',b.current_question.id!==a.current_question.id);
 test('another student attempt rejected',!(await api(bob,'current',{attempt_id:a.attempt.id})).success);
 test('another student question rejected',!(await api(bob,'answer',{question_id:a.current_question.id,option_id:a.current_question.options[0].id})).success);
 const first=a.current_question;
 test('forged option rejected',!(await api(alice,'answer',{question_id:first.id,option_id:crypto.randomUUID()})).success);
 a=await api(alice,'answer',{question_id:first.id,option_id:assignments[0].correct_option});
 test('valid answer advances once',a.current_question.position===2);
 const replay=await api(alice,'answer',{question_id:first.id,option_id:first.options[0].id});
 test('duplicate answer cannot overwrite',replay.current_question.position===2&&replay.answer_accepted===false);
 test('answer score is server computed',(await db.query('select earned_marks from quiz_attempt_questions where id=$1',[first.id])).rows[0].earned_marks===1);
 await db.query("update quiz_attempt_questions set deadline=clock_timestamp()-interval '1 second' where id=$1",[a.current_question.id]);
 const late=await api(alice,'answer',{question_id:a.current_question.id,option_id:a.current_question.options[0].id});
 test('late answer times out',late.answer_accepted===false&&late.current_question.position===3);
 test('timeout advances from old deadline',Date.parse(late.current_question.started_at)<Date.now());
 test('event accepted',(await api(alice,'event',{event_type:'TAB_HIDDEN'})).success);
 test('event does not disqualify',(await db.query('select review_status,risk_score from quiz_attempts where id=$1',[a.attempt.id])).rows[0].review_status==='PENDING');
 for(let i=0;i<18;i++) {
  a=await api(alice,'current'); if(!a.current_question)break;
  const answer=(await db.query('select correct_option from quiz_attempt_questions where id=$1',[a.current_question.id])).rows[0].correct_option;
  a=await api(alice,'answer',{question_id:a.current_question.id,option_id:answer});
 }
 test('completed attempt cannot restart',(await api(alice,'start')).attempt.status==='COMPLETED');
 test('unpublished results remain hidden',a.result===null);
 b=await api(bob,'submit'); test('early submit charges full duration',(await db.query('select completion_ms from quiz_attempts where id=$1',[b.attempt.id])).rows[0].completion_ms===400000);

 test('nonwinner cannot claim',!(await api(bob,'claim')).success);
 test('forged payment denied',await db.query("insert into payment_submissions(user_id,semester,amount) values($1,1,299)",[bob]).then(()=>false,()=>true));
 test('close competition',(await api(admin,'admin_transition',{status:'CLOSED'})).success);
 test('enter review',(await api(admin,'admin_transition',{status:'UNDER_REVIEW'})).success);
 test('cannot publish unreviewed attempts',!(await api(admin,'admin_transition',{status:'RESULTS_PUBLISHED'})).success);
 test('review requires reason',!(await api(admin,'admin_review',{attempt_id:a.attempt.id,status:'APPROVED'})).success);
 test('approve eligible attempt',(await api(admin,'admin_review',{attempt_id:a.attempt.id,status:'APPROVED',reason:'Timeline and identity verified.'})).success);
 test('reject candidate',(await api(admin,'admin_review',{attempt_id:b.attempt.id,status:'REJECTED',reason:'Test rejection after review.'})).success);
 test('publication accepted',(await api(admin,'admin_transition',{status:'RESULTS_PUBLISHED'})).success);
 const result=await api(alice,'detail');test('own published results visible',result.result.score===19&&result.result.timeouts===1&&result.winner.rank===1);
 test('rejected student no reward',!(await api(bob,'claim')).success);
 const claim=await api(alice,'claim');test('winner gets account bound reward',claim.success&&claim.final_price===299&&claim.redemption_id);
 test('repeat claim returns same unused redemption',(await api(alice,'claim')).redemption_id===claim.redemption_id);
 test('other account cannot use redemption',await db.query('insert into payment_submissions(user_id,semester,amount,coupon_redemption_id) values($1,1,299,$2)',[bob,claim.redemption_id]).then(()=>false,()=>true));
 test('wrong semester reward denied',await db.query('insert into payment_submissions(user_id,semester,amount,coupon_redemption_id) values($1,2,299,$2)',[alice,claim.redemption_id]).then(()=>false,()=>true));
 await db.query('insert into payment_submissions(user_id,semester,amount,coupon_redemption_id) values($1,1,299,$2)',[alice,claim.redemption_id]);
 test('duplicate redemption payment denied',await db.query('insert into payment_submissions(user_id,semester,amount,coupon_redemption_id) values($1,1,299,$2)',[alice,claim.redemption_id]).then(()=>false,()=>true));
 test('consumed claim denied',!(await api(alice,'claim')).success);
 test('regular 349 payment preserved',await db.query('insert into payment_submissions(user_id,semester,amount) values($1,1,349)',[bob]).then(()=>true,()=>false));
 test('published results immutable',!(await api(admin,'admin_review',{attempt_id:a.attempt.id,status:'REJECTED',reason:'Cannot change published result'})).success);
 await db.exec('delete from quiz_private.rate_limits');let limited=false;for(let i=0;i<61;i++){const r=await api(bob,'detail');if(r.code==='RATE_LIMITED')limited=true;}
 test('identity based rate limiting',limited);

 // === SECURE QUIZ DELETION TESTS (Chunk 1-6) ===
 // 1. Student cannot delete quiz
 test('student cannot delete quiz',!(await api(alice,'admin_delete')).success);
 test('unauthorized anon cannot delete quiz',!(await api(null,'admin_delete')).success);

 // 2. Admin can create a second quiz (testing isolation)
 const created=await api(admin,'admin_create',{title:'Draft Practice Quiz'});
 test('admin can create draft quiz',created.success&&created.competition_id);
 const cid2=created.competition_id;

 // 3. Admin can permanently delete a quiz with zero attempts
 const permDel=await api(admin,'admin_delete',{competition_id:cid2,hard_delete:true});
 test('zero-attempt quiz can be permanently deleted',permDel.success);
 test('permanently deleted quiz removed from database',(await db.query('select count(*)::int n from quiz_competitions where id=$1',[cid2])).rows[0].n===0);

 // 4. Existing quiz cid remains unaffected
 test('first quiz remains unaffected',(await db.query('select count(*)::int n from quiz_competitions where id=$1',[cid])).rows[0].n===1);

 // 5. Admin cannot hard_delete a quiz with attempts (historical protection)
 const blockedHardDel=await api(admin,'admin_delete',{competition_id:cid,hard_delete:true});
 test('quiz with recorded student attempts blocks permanent delete',!blockedHardDel.success&&blockedHardDel.error.includes('student attempts'));

 // 6. Admin can safely soft_delete the quiz
 const softDel=await api(admin,'admin_delete',{competition_id:cid});
 test('admin can delete quiz via soft delete',softDel.success);

 // 7. Repeated deletion request handled safely
 const repeatDel=await api(admin,'admin_delete',{competition_id:cid});
 test('repeated delete handled safely',!repeatDel.success&&repeatDel.error==='Quiz is already deleted.');

 // 8. Deleted quiz disappears from student-facing list
 const studentList=await api(alice,'list');
 test('deleted quiz disappears from student list',studentList.success&&!studentList.competitions.some(c=>c.id===cid));

 // 9. Deleted quiz disappears from admin_list by default
 const adminList=await api(admin,'admin_list');
 test('deleted quiz excluded from default admin list',adminList.success&&!adminList.competitions.some(c=>c.id===cid));

 // 10. Student direct access via URL denied
 test('student direct detail on deleted quiz denied',!(await api(alice,'detail',{competition_id:cid})).success);
 test('student direct start on deleted quiz denied',!(await api(alice,'start',{competition_id:cid})).success);
 test('student direct answer on deleted quiz denied',!(await api(alice,'answer',{competition_id:cid,question_id:crypto.randomUUID(),option_id:crypto.randomUUID()})).success);
 test('student direct claim on deleted quiz denied',!(await api(alice,'claim',{competition_id:cid})).success);

 // 11. Historical records remain fully intact in database
 const attemptsCount=(await db.query('select count(*)::int n from quiz_attempts where competition_id=$1',[cid])).rows[0].n;
 test('historical attempts preserved in database',attemptsCount>=2);
 const questionsCount=(await db.query('select count(*)::int n from quiz_questions where competition_id=$1',[cid])).rows[0].n;
 test('historical questions preserved in database',questionsCount===84);
 const winnersCount=(await db.query('select count(*)::int n from quiz_winners where competition_id=$1',[cid])).rows[0].n;
 test('historical winners preserved in database',winnersCount>0);

 // 12. Audit log recorded
 const auditLogs=(await db.query("select count(*)::int n from activity_logs where target_type='quiz' and action='QUIZ_DELETED' and target_id=$1",[cid])).rows[0].n;
 test('audit log created for deletion',auditLogs>=1);

 console.log(`\n${passed} database security checks passed (isolated PGlite Postgres).`);
} finally {await db.close();}
