import fs from 'node:fs';import assert from 'node:assert/strict';import ts from 'typescript';import vm from 'node:vm';
const code=ts.transpileModule(fs.readFileSync('src/lib/purchaseReadiness.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;const exports={};vm.runInNewContext(code,{exports,AbortSignal,AbortController,setTimeout,clearTimeout,fetch});
for(const status of [404,401,500])await assert.rejects(exports.requirePurchaseService('https://qa.example','qa',async()=>({ok:false,status})),/No purchase was started/);
await assert.rejects(exports.requirePurchaseService('https://qa.example','qa',async()=>{throw Error('offline')}),/No purchase was started/);
await exports.requirePurchaseService('https://qa.example','qa',async(url,opts)=>{assert.match(url,/validate-iap-receipt$/);assert.equal(opts.method,'OPTIONS');return {ok:true};});
for(const f of ['src/screens/shared/MessagesScreen.tsx','src/components/MessageThread.tsx']){const t=fs.readFileSync(f,'utf8');assert(!/\bsender_id\b/.test(t));assert(t.includes('sender_user_id'));}
const composer=fs.readFileSync('src/components/MessageComposer.tsx','utf8');assert(composer.includes("invoke('send-direct-message'"));assert(!composer.includes(".from('messages').insert"));assert(composer.includes('finally { setSending(false); }'));
const letter=fs.readFileSync('src/components/letters/LetterComposer.tsx','utf8');assert(letter.includes("invoke('generate-coach-scout-letter'"));assert(!letter.includes('Bearer ${supabaseKey}'));
console.log('PASS: missing/offline receipt service blocks purchase before store request; inbox uses deployed sender schema; composer uses server policy; AI letters use authenticated SDK. No store purchase or provider delivery claimed.');
