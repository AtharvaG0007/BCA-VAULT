import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

// Execute the real handler with an isolated backend double; no production writes.
function compile(file, context) {
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(code, context, { filename: file });
}
const corsModule = { exports: {}, URL };
compile('supabase/functions/_shared/note-cors.ts', corsModule);
const origin = 'https://bca-vault.portalbcavault.workers.dev';
let passed = 0;
async function test(name, fn) { await fn(); passed++; console.log(`PASS ${name}`); }
function fixture({ auth = 'valid', profile = { status: 'active' }, note = null } = {}) {
  let handler;
  let authCalls = 0;
  const admin = {
    auth: { async getUser() {
      authCalls++;
      if (auth === 'throw') throw new Error('simulated auth outage');
      return { data: { user: auth === 'valid' ? { id: 'student-test' } : null }, error: auth === 'valid' ? null : new Error('invalid') };
    } },
    from(table) {
      const query = {
        select() { return query; }, eq() { return query; }, or() { return query; },
        async maybeSingle() { return { data: table === 'profiles' ? profile : table === 'notes' ? note : null, error: null }; },
        async insert() { return { error: null }; },
      };
      return query;
    },
  };
  compile('supabase/functions/student-note-signed-url/index.ts', {
    exports: {}, Request, Response, URL, console: { error() {}, warn() {} },
    Deno: { env: { get() { return ''; } }, serve(fn) { handler = fn; } },
    require(name) {
      if (name.includes('supabase-js')) return { createClient: () => admin };
      if (name.includes('note-cors')) return corsModule.exports;
      if (name.includes('edge-runtime') || name.includes('pdf-lib')) return {};
      throw new Error(`Unexpected import ${name}`);
    },
  });
  return { handler, authCalls: () => authCalls };
}
function request(method = 'POST', source = origin, token = 'test-token', body = { noteId: 'test-note' }) {
  const headers = { 'Content-Type': 'application/json' };
  if (source !== null) headers.Origin = source;
  if (token) headers.Authorization = `Bearer ${token}`;
  return new Request('https://example.test/functions/v1/student-note-signed-url', {
    method, headers, ...(method === 'POST' ? { body: JSON.stringify(body) } : {}),
  });
}
await test('preflight succeeds before authentication and matches exact origin', async () => {
  const f = fixture({ auth: 'throw' });
  const r = await f.handler(request('OPTIONS'));
  assert.equal(r.status, 200); assert.equal(f.authCalls(), 0);
  assert.equal(r.headers.get('Access-Control-Allow-Origin'), origin);
  assert.equal(r.headers.get('Vary'), 'Origin');
  assert.match(r.headers.get('Access-Control-Allow-Methods'), /POST/);
  for (const h of ['authorization', 'apikey', 'content-type', 'x-client-info', 'x-retry-count', 'traceparent']) {
    assert.ok(r.headers.get('Access-Control-Allow-Headers').split(', ').includes(h));
  }
});
for (const source of ['https://evil.example', `${origin}.evil.example`, 'null', 'http://localhost:9999']) {
  await test(`unapproved origin denied: ${source}`, async () => {
    const f = fixture(); const r = await f.handler(request('OPTIONS', source));
    assert.equal(r.status, 403); assert.equal(r.headers.get('Access-Control-Allow-Origin'), null);
    assert.equal(f.authCalls(), 0);
  });
}
await test('preview origin needs exact explicit configuration', () => {
  const preview = 'https://release-bca-vault.portalbcavault.workers.dev';
  const req = request('OPTIONS', preview);
  assert.equal(corsModule.exports.getNoteCorsHeaders(req)['Access-Control-Allow-Origin'], undefined);
  assert.equal(corsModule.exports.getNoteCorsHeaders(req, preview)['Access-Control-Allow-Origin'], preview);
  assert.equal(corsModule.exports.getNoteCorsHeaders(req, '*')['Access-Control-Allow-Origin'], undefined);
});
for (const [name, options, req, status] of [
  ['missing authentication', {}, request('POST', origin, ''), 401],
  ['invalid authentication', { auth: 'invalid' }, request(), 401],
  ['authentication service exception', { auth: 'throw' }, request(), 500],
  ['missing note ID', {}, request('POST', origin, 'token', {}), 400],
  ['inactive account cannot access paid question pack', { profile: { status: 'inactive' }, note: { id: 'test-note', title: 'Most Repeated Questions', published: true } }, request(), 403],
  ['missing profile', { profile: null }, request(), 403],
  ['unknown note', {}, request(), 404],
  ['unpublished note', { note: { id: 'test-note', published: false } }, request(), 403],
  ['paid question note requires Exam Kit entitlement', { note: { id: 'test-note', title: 'Most Repeated Questions', published: true } }, request(), 403],
  ['unsupported HTTP method', {}, request('DELETE'), 405],
]) {
  await test(`${name} returns ${status} with CORS and JSON`, async () => {
    const r = await fixture(options).handler(req);
    assert.equal(r.status, status);
    assert.equal(r.headers.get('Access-Control-Allow-Origin'), origin);
    assert.equal((await r.json()).success, false);
  });
}
await test('non-browser requests still require authentication', async () => {
  const r = await fixture().handler(request('POST', null, ''));
  assert.equal(r.status, 401); assert.equal(r.headers.get('Access-Control-Allow-Origin'), null);
});
console.log(`${passed} isolated note-access regression checks passed.`);
