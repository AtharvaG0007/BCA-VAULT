import fs from 'node:fs';

const report = JSON.parse(fs.readFileSync('supabase/.temp/db_audit_report.json', 'utf8'));

console.log('=== 1. MISSING FOREIGN KEY INDEXES ===');
console.log(JSON.stringify(report.missingFks, null, 2));

console.log('\n=== 2. TABLE ROW COUNTS ===');
for (const row of report.counts || []) {
  console.log(`  ${row.table_name}: ~${row.approx_rows} rows`);
}

console.log('\n=== 3. ALL AUDITED TABLES & THEIR INDEXES ===');
const tables = [...new Set((report.columns || []).map(c => c.table_name))].sort();
console.log(`Total public tables: ${tables.length}`);

for (const t of tables) {
  const cols = (report.columns || []).filter(c => c.table_name === t).map(c => `${c.column_name} (${c.data_type})`);
  const tableIndexes = (report.indexes || []).filter(i => i.tablename === t);
  console.log(`\n==================================================`);
  console.log(`TABLE: ${t} [${cols.length} columns]`);
  console.log(`Columns: ${cols.join(', ')}`);
  console.log(`Existing Indexes (${tableIndexes.length}):`);
  for (const idx of tableIndexes) {
    console.log(`  - [${idx.indexname}]: ${idx.indexdef}`);
  }
}
