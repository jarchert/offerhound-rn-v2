import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';import ts from 'typescript';
const code=ts.transpileModule(fs.readFileSync('src/hooks/useLocalDraft.ts','utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,esModuleInterop:true}}).outputText;
const disk=new Map();let reads=[],failWrites=false;
function module(){let states=[],refs=[],effects=[],i=0,j=0,dependencies=[];const pending=[];
const react={useRef:v=>{const n=j++;return refs[n]??(refs[n]={current:v});},useState:v=>{const n=i++;if(!(n in states))states[n]=typeof v==='function'?v():v;return[states[n],next=>states[n]=typeof next==='function'?next(states[n]):next];},useEffect:(fn,deps)=>{const n=pending.length;pending.push(null);if(!dependencies[n]||deps.some((d,k)=>d!==dependencies[n][k])){effects.push(()=>{pending[n]?.();pending[n]=fn();});dependencies[n]=deps;}}};
const imports={react,'@/integrations/supabase/client':{SUPABASE_URL:'https://staging.example'},'@react-native-async-storage/async-storage':{__esModule:true,default:{getItem:key=>new Promise(resolve=>reads.push(()=>resolve(disk.get(key)||null))),setItem:async(key,value)=>{if(failWrites)throw Error('disk unavailable');disk.set(key,value);}}}};
const out={};vm.runInNewContext(code,{exports:out,require:n=>imports[n],console});
// This runner maintains hook slots and effect cleanup across key changes.
let cleanups=[];react.useEffect=(fn,deps)=>{const n=j++;if(!dependencies[n]||deps.some((d,k)=>d!==dependencies[n][k])){effects.push(()=>{cleanups[n]?.();cleanups[n]=fn();});dependencies[n]=deps;}};
return{render:(user,destination='thread:one',initial='')=>{i=0;j=0;const r=out.useLocalDraft(user,destination,initial);effects.splice(0).forEach(fn=>fn());return r;},unmount:()=>cleanups.forEach(fn=>fn?.()),remount:()=>{cleanups.forEach(fn=>fn?.());states=[];refs=[];dependencies=[];cleanups=[];}};}
async function settle(){await new Promise(resolve=>setImmediate(resolve));}
let a=module(),r=a.render('alice');r[1]('new text before load');reads.splice(0).forEach(fn=>fn());await settle();assert.equal(a.render('alice')[0],'new text before load');a.unmount();
// Fresh module approximates process restart, reading persisted values rather than cache.
a=module();r=a.render('alice');assert.equal(r[0],'');assert.equal(r[3],false);reads.splice(0).forEach(fn=>fn());await settle();assert.equal(a.render('alice')[0],'new text before load');assert.equal(a.render('alice')[3],true);
r=a.render('bob');assert.equal(r[0],'');reads.splice(0).forEach(fn=>fn());await settle();assert.equal(a.render('bob')[0],'');
r=a.render('alice','thread:two');assert.equal(r[0],'');r[1]('second thread');await settle();assert.equal(a.render('alice','thread:two')[0],'second thread');
// Rapid edits must serialize, so old writes cannot replace newest text.
r[1]('old');r[1]('latest');await settle();a.unmount();a=module();a.render('alice','thread:two');reads.splice(0).forEach(fn=>fn());await settle();assert.equal(a.render('alice','thread:two')[0],'latest');
failWrites=true;r=a.render('alice','thread:two');r[1]('keep on failure');await settle();r=a.render('alice','thread:two');assert.equal(r[0],'keep on failure');assert.equal(r[2],true);failWrites=false;
console.log('PASS: actual local-draft hook restores after fresh module/remount, isolates accounts and threads, preserves edits during pending hydration, serializes rapid writes, and retains text with visible storage-error state. Storage transport mocked; installed-device persistence remains separate.');

const old=a.render('alice','gallery-edit');old[1]('submitted text');const oldCompletion=old[1];a.remount();let fresh=a.render('alice','gallery-edit');fresh[1]('newer edit');oldCompletion(previous=>previous==='submitted text'?'':previous);await settle();a.remount();assert.equal(a.render('alice','gallery-edit')[0],'newer edit');console.log('PASS: a late callback from an unmounted editor cannot clear a newer draft from the replacement editor.');
