import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import ts from 'typescript';
import path from 'node:path';

const dashboardPath = 'src/app/components/dashboards/StudentDashboard.tsx';
const names = ['displayableNotes', 'mostRepeatedTopicNotes', 'filteredNotes', 'examRoadmapCards', 'examAnswerGuideNote'];

export function restoreDashboard(source, baseline) {
  const declarations = names.map(name => new RegExp(`\\bconst\\s+${name}\\s*=`).test(source));
  if (declarations.every(Boolean)) return source;
  if (declarations.some(Boolean)) throw new Error('Partially defined dashboard selectors: review manually to avoid duplicate declarations.');
  const start = baseline.indexOf('              const displayableNotes =');
  const end = baseline.indexOf('\n              return (', start);
  if (start < 0 || end < start) throw new Error('Known-good selector block not found.');
  const block = baseline.slice(start, end).replace(/^              /gm, '  ');
  if (!names.every(name => new RegExp(`\\bconst\\s+${name}\\s*=`).test(block))) throw new Error('Baseline selector block is incomplete.');
  const anchor = '  const isPaymentPending = false;';
  if (source.split(anchor).length !== 2) throw new Error('Unexpected dashboard structure: manual review required.');
  return source.replace(anchor, `${anchor}\n\n${block}`);
}

function restoreIcon(source, name) {
  const ast = ts.createSourceFile('component.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const imported = ast.statements.some(statement => ts.isImportDeclaration(statement)
    && statement.importClause?.namedBindings
    && ts.isNamedImports(statement.importClause.namedBindings)
    && statement.importClause.namedBindings.elements.some(element => element.name.text === name));
  if (imported || !new RegExp(`<${name}\\b`).test(source)) return source;
  return `import { ${name} } from "lucide-react";\n${source}`;
}

if (process.argv[2] === '--test-source') {
  const baseline = fs.readFileSync(dashboardPath, 'utf8');
  const source = restoreDashboard(fs.readFileSync(process.argv[3], 'utf8'), baseline);
  const config = ts.readConfigFile('tsconfig.json', ts.sys.readFile);
  const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, process.cwd());
  const host = ts.createCompilerHost(parsed.options);
  const original = host.getSourceFile.bind(host);
  host.getSourceFile = (file, languageVersion, onError, shouldCreateNewSourceFile) =>
    path.resolve(file) === path.resolve(dashboardPath)
      ? ts.createSourceFile(file, source, languageVersion, true, ts.ScriptKind.TSX)
      : original(file, languageVersion, onError, shouldCreateNewSourceFile);
  const program = ts.createProgram(parsed.fileNames, parsed.options, host);
  const errors = ts.getPreEmitDiagnostics(program);
  if (errors.length) {
    console.error(ts.formatDiagnosticsWithColorAndContext(errors, {
      getCanonicalFileName: file => file, getCurrentDirectory: () => process.cwd(), getNewLine: () => '\n',
    }));
    process.exitCode = 1;
  } else console.log('PASS repaired remote dashboard typechecks against local project dependencies (no source files replaced)');
} else if (process.argv[2] === '--test') {
  const assert = await import('node:assert/strict');
  const baseline = fs.readFileSync(dashboardPath, 'utf8');
  assert.equal(restoreDashboard(baseline, baseline), baseline);
  const fixture = `export function Dashboard() {\n  const isPaymentPending = false;\n  return <div>{filteredNotes.length}</div>;\n}`;
  const restored = restoreDashboard(fixture, baseline);
  for (const name of names) assert.match(restored, new RegExp(`\\bconst\\s+${name}\\s*=`));
  assert.equal(restoreDashboard(restored, baseline), restored);
  assert.throws(() => restoreDashboard('const filteredNotes = [];', baseline), /Partially/);
  assert.equal(restoreIcon('import { Award } from "lucide-react";\n<Award />', 'Award'), 'import { Award } from "lucide-react";\n<Award />');
  assert.match(restoreIcon('<Award />', 'Award'), /import \{ Award \}/);
  console.log('PASS selector restoration, idempotence, partial-state protection and icon restoration');
} else {
  // This commit belongs to this checkout and contains the working selectors.
  // Read history only; never reset, checkout or overwrite the dashboard wholesale.
  const baseline = execFileSync('git', ['show', `96118fc:${dashboardPath}`], { encoding: 'utf8' });
  const edits = [
    [dashboardPath, source => restoreDashboard(source, baseline)],
    ['src/app/components/dashboards/SuperAdminDashboard.tsx', source => restoreIcon(source, 'ClipboardCheck')],
    ['src/app/components/pages/ReferralPage.tsx', source => restoreIcon(source, 'Award')],
  ].map(([file, repair]) => {
    const before = fs.readFileSync(file, 'utf8');
    return { file, before, after: repair(before) };
  });
  for (const { file, before, after } of edits) {
    if (before === after) { console.log(`Already defined: ${file}`); continue; }
    fs.writeFileSync(file, after);
    console.log(`Repaired: ${file}`);
  }
  console.log('Next: npm run typecheck && npm run build. Commit only after both pass.');
}
