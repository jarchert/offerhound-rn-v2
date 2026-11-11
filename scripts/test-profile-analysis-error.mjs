import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';import ts from 'typescript';
const code=ts.transpileModule(fs.readFileSync('src/lib/profileAnalysisError.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;
const exports={};vm.runInNewContext(code,{exports});
assert.match(exports.profileAnalysisError({context:{status:404}}),/not available.*view and edit/);
assert.match(exports.profileAnalysisError({context:{status:401}}),/Sign in again/);
assert.match(exports.profileAnalysisError({context:{status:429}}),/try again later/);
assert(!exports.profileAnalysisError(new Error('private backend detail')).includes('private'));
const component=fs.readFileSync('src/components/ProfileAnalyzer.tsx','utf8');assert(!component.includes('toast.error'));assert(component.includes('accessibilityRole="alert"'));assert(component.includes('Retry profile analysis'));
console.log('PASS: missing-service, session, capacity and unknown errors have safe card-scoped messages and retry, without generic navigation-obscuring toast.');
