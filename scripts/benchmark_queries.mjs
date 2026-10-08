import { execSync } from 'node:child_process';
import fs from 'node:fs';

const queries = [
  {
    name: '1. Profiles pagination by created_at DESC',
    sql: 'EXPLAIN (BUFFERS, COSTS) SELECT user_id, full_name, email FROM public.profiles ORDER BY created_at DESC LIMIT 50;'
  },
  {
    name: '2. Profiles trigram ILIKE search',
    sql: "EXPLAIN (BUFFERS, COSTS) SELECT user_id, full_name, email FROM public.profiles WHERE full_name ILIKE '%john%' LIMIT 50;"
  },
  {
    name: '3. Payment submissions status=pending filter',
    sql: "EXPLAIN (BUFFERS, COSTS) SELECT id, reference_id, amount FROM public.payment_submissions WHERE status = 'pending' ORDER BY created_at DESC LIMIT 50;"
  },
  {
    name: '4. Payment submissions all payments ordered by created_at DESC',
    sql: 'EXPLAIN (BUFFERS, COSTS) SELECT id, reference_id, amount FROM public.payment_submissions ORDER BY created_at DESC LIMIT 50;'
  },
  {
    name: '5. Notes semester-wise browser',
    sql: "EXPLAIN (BUFFERS, COSTS) SELECT id, title FROM public.notes WHERE bundle_id = '00000000-0000-0000-0000-000000000000' AND semester = 1 AND published = true;"
  },
  {
    name: '6. Notes trigram title search',
    sql: "EXPLAIN (BUFFERS, COSTS) SELECT id, title FROM public.notes WHERE title ILIKE '%database%' LIMIT 50;"
  },
  {
    name: '7. Quiz attempts competition leaderboard ranking',
    sql: "EXPLAIN (BUFFERS, COSTS) SELECT id, user_id, score, completion_ms FROM public.quiz_attempts WHERE competition_id = '00000000-0000-0000-0000-000000000000' AND status IN ('submitted', 'evaluated') ORDER BY score DESC, completion_ms ASC LIMIT 10;"
  },
  {
    name: '8. Activity logs ordered by created_at DESC',
    sql: 'EXPLAIN (BUFFERS, COSTS) SELECT id, action, target_type FROM public.activity_logs ORDER BY created_at DESC LIMIT 50;'
  },
  {
    name: '9. Referrals by referrer and status',
    sql: "EXPLAIN (BUFFERS, COSTS) SELECT id, referred_user_id FROM public.referrals WHERE referrer_user_id = '00000000-0000-0000-0000-000000000000' AND status = 'successful';"
  }
];

console.log('=== FORCING INDEX SCANS (enable_seqscan = off) ===\n');

for (const q of queries) {
  const combinedSql = `BEGIN; SET LOCAL enable_seqscan = off; ${q.sql} COMMIT;`;
  fs.writeFileSync('supabase/.temp/test_query.sql', combinedSql);
  try {
    const raw = execSync(`npx supabase db query --linked --output-format json -f supabase/.temp/test_query.sql`, {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe']
    });
    const firstBrace = raw.indexOf('{');
    const lastBrace = raw.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1) {
      const json = JSON.parse(raw.slice(firstBrace, lastBrace + 1));
      const plan = (json.rows || []).map(r => r['QUERY PLAN']).filter(Boolean).join('\n');
      console.log(`--- ${q.name} ---`);
      console.log(plan || JSON.stringify(json.rows));
      console.log('\n');
    }
  } catch (err) {
    console.error(`Error in ${q.name}:`, err.message);
  }
}
