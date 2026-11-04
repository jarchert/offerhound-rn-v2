import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import ts from 'typescript';

const source = readFileSync(new URL('../src/lib/backendEnvironment.ts', import.meta.url), 'utf8');
const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText;
const { resolveBackendEnvironment } = await import('data:text/javascript;base64,' + Buffer.from(js).toString('base64'));
const production = { url: 'https://production.example', anonKey: 'public-production-fixture' };
const staging = { appEnv: 'staging', url: 'https://wrrfwvkixlzmnsztjfgg.supabase.co', anonKey: 'public-staging-fixture' };
assert.deepEqual(resolveBackendEnvironment({}, production), production);
assert.deepEqual(resolveBackendEnvironment(staging, production), { url: staging.url, anonKey: staging.anonKey });
assert.throws(() => resolveBackendEnvironment({ appEnv: 'staging' }, production));
assert.throws(() => resolveBackendEnvironment({ url: staging.url }, production));
assert.throws(() => resolveBackendEnvironment({ ...staging, url: production.url }, production));
assert.throws(() => resolveBackendEnvironment({ ...staging, url: 'https://abdzdcgsmdlnytkkhvtb.supabase.co' }, production));
const require = createRequire(import.meta.url);
const configure = require('../app.config.js');
const config = require('../app.json').expo;
const previous = process.env.APP_ENV;
try {
  delete process.env.APP_ENV;
  assert.deepEqual(configure({ config }), config);
  process.env.APP_ENV = 'staging';
  const qa = configure({ config });
  assert.notEqual(qa.ios.bundleIdentifier, config.ios.bundleIdentifier);
  assert.notEqual(qa.android.package, config.android.package);
  assert.equal(qa.scheme, 'offerhound-staging');
  assert.deepEqual(qa.android.intentFilters, []);
  assert.deepEqual(qa.ios.associatedDomains, []);
} finally {
  if (previous === undefined) delete process.env.APP_ENV;
  else process.env.APP_ENV = previous;
}
console.log('Staging backend and app isolation checks: PASS');
