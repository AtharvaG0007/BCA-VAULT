import { execSync } from 'node:child_process';
import fs from 'node:fs';

function runSql(sql) {
  const tempPath = 'supabase/.temp/audit_query.sql';
  fs.writeFileSync(tempPath, sql, 'utf8');
  try {
    const raw = execSync(`npx supabase db query --linked --output-format json -f "${tempPath}"`, {
      encoding: 'utf8',
      maxBuffer: 20 * 1024 * 1024
    });
    const firstBrace = raw.indexOf('{');
    const lastBrace = raw.lastIndexOf('}');
    if (firstBrace >= 0 && lastBrace > firstBrace) {
      const jsonStr = raw.slice(firstBrace, lastBrace + 1);
      const parsed = JSON.parse(jsonStr);
      return parsed.rows || [];
    }
    return [];
  } finally {
    if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
  }
}

console.log('--- 1. AUDITING ALL TABLES & COLUMNS ---');
const columns = runSql(`
  select table_name, column_name, data_type, is_nullable
  from information_schema.columns
  where table_schema = 'public'
  order by table_name, ordinal_position;
`);

console.log('--- 2. AUDITING EXISTING INDEXES ---');
const indexes = runSql(`
  select tablename, indexname, indexdef
  from pg_indexes
  where schemaname = 'public'
  order by tablename, indexname;
`);

console.log('--- 3. AUDITING MISSING FOREIGN KEY INDEXES ---');
const missingFks = runSql(`
  select
    c.conrelid::regclass::text as table_name,
    a.attname as fk_column,
    c.conname as fk_constraint_name,
    c.confrelid::regclass::text as referenced_table
  from pg_constraint c
  join pg_attribute a on a.attrelid = c.conrelid and a.attnum = any(c.conkey)
  where c.contype = 'f'
    and c.connamespace = 'public'::regnamespace
    and not exists (
      select 1 from pg_index i
      where i.indrelid = c.conrelid and a.attnum = any(i.indkey)
    )
  order by table_name, fk_column;
`);

console.log('--- 4. AUDITING RLS POLICIES ---');
const policies = runSql(`
  select tablename, policyname, permissive, roles, cmd, qual, with_check
  from pg_policies
  where schemaname = 'public'
  order by tablename, policyname;
`);

console.log('--- 5. AUDITING TABLE ROW COUNTS ---');
const counts = runSql(`
  select
    relname as table_name,
    n_live_tup as approximate_row_count
  from pg_stat_user_tables
  where schemaname = 'public'
  order by n_live_tup desc;
`);

const report = {
  columns,
  indexes,
  missingFks,
  policies,
  counts
};

fs.writeFileSync('supabase/.temp/db_audit_report.json', JSON.stringify(report, null, 2), 'utf8');
console.log('Audit completed and saved to supabase/.temp/db_audit_report.json');
console.log(`Audited ${new Set(columns.map(c => c.table_name)).size} tables, ${indexes.length} existing indexes, ${missingFks.length} unindexed foreign keys, ${policies.length} RLS policies.`);
