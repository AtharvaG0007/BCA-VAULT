import fs from 'node:fs';

const report = JSON.parse(fs.readFileSync('supabase/.temp/db_audit_report.json', 'utf8'));

console.log('=== 1. UNINDEXED FOREIGN KEYS ===');
console.log(JSON.stringify(report.unindexedForeignKeys, null, 2));

console.log('\n=== 2. TABLES AND THEIR ROW COUNTS ===');
const tables = Object.keys(report.tables || {}).sort();
console.log(`Audited tables (${tables.length}):`, tables.join(', '));
for (const t of tables) {
  const colCount = report.tables[t].length;
  const rowCount = (report.rowCounts || []).find(r => r.table_name === t)?.approx_rows ?? 'unknown';
  console.log(`  - ${t}: ${colCount} cols, ~${rowCount} rows`);
}


console.log('\n=== 3. TABLES WITH EXISTING INDEXES ===');
const indexesByTable = {};
for (const idx of report.indexes) {
  if (!indexesByTable[idx.tablename]) indexesByTable[idx.tablename] = [];
  indexesByTable[idx.tablename].push({
    name: idx.indexname,
    def: idx.indexdef
  });
}
for (const [t, idxs] of Object.entries(indexesByTable)) {
  console.log(`\nTable: ${t} (${idxs.length} indexes)`);
  idxs.forEach(i => console.log(`  - ${i.name}: ${i.def}`));
}

console.log('\n=== 4. RLS POLICIES ===');
if (Array.isArray(report.rlsPolicies)) {
  for (const pol of report.rlsPolicies) {
    console.log(`Table: ${pol.tablename} | Policy: ${pol.policyname} | Perm: ${pol.permissive} | Roles: ${pol.roles} | Cmd: ${pol.cmd}`);
    console.log(`  Qual: ${pol.qual}`);
    if (pol.with_check) console.log(`  With Check: ${pol.with_check}`);
  }
} else {
  console.log('rlsPolicies:', typeof report.rlsPolicies, report.rlsPolicies);
}

