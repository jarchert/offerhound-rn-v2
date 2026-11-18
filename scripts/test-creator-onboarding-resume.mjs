import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import assert from 'node:assert/strict';
const compile=path=>ts.transpileModule(fs.readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const urls={};vm.runInNewContext(compile('src/lib/creatorSchedule.ts'),{exports:urls,URL});
let exists=false,profileError=false,linkError=true,writes=[],privateWrites=0;
const privateApi={creatorWebhookUrl:value=>{if(value&&!value.startsWith('https://'))throw Error('HTTPS required');return value||null;},saveCreatorSyndication:async()=>privateWrites++};
const out={};vm.runInNewContext(compile('src/lib/creatorOnboarding.ts'),{exports:out,require:n=>n==='@/lib/creatorSchedule'?urls:privateApi});
const client={from:table=>{
 assert(['influencer_profiles','influencer_social_links'].includes(table));
 const chain={
  select(){return this;},eq(){return this;},
  insert:p=>{writes.push([table,'insert',p]);return chain;},
  update:p=>{writes.push([table,'update',p]);return chain;},
  maybeSingle:async()=>table==='influencer_profiles'?(profileError?{error:Error('offline')}:{data:exists?{id:'creator'}:null}):{data:null},
  single:async()=>{if(table==='influencer_profiles'){exists=true;return {data:{id:'creator'}};}return linkError?{error:Error('denied')}:{data:{id:'link'}};},
 };return chain;
}};
const fields={display_name:'Synthetic',handle:'synthetic',bio:'Synthetic',unexpected:'discard'};
await assert.rejects(()=>out.saveCreatorOnboarding(client,'owner',fields,[{platform:'x',profile_url:'https://example.test/qa'}],'https://example.test/private'),/profile saved, but/);
assert.equal(writes[0][0],'influencer_profiles');assert.equal(writes[0][1],'insert');assert(!('unexpected' in writes[0][2]));assert(!('syndication_webhook_url' in writes[0][2]));assert.equal(privateWrites,0);
writes=[];linkError=false;await out.saveCreatorOnboarding(client,'owner',fields,[{platform:'x',profile_url:'https://example.test/qa'}],'https://example.test/private');assert.equal(writes[0][1],'update');assert.equal(privateWrites,1);
profileError=true;writes=[];await assert.rejects(()=>out.saveCreatorOnboarding(client,'owner',fields,[],''),/offline/);assert.equal(writes.length,0);
profileError=false;await assert.rejects(()=>out.saveCreatorOnboarding(client,'owner',fields,[{platform:'x',profile_url:'javascript:alert(1)'}],''),/valid/);assert.equal(writes.length,0);
console.log('PASS: actual creator setup resumes its confirmed profile after secondary failure, whitelists profile fields, separates private webhook settings, and rejects failed preflight/unsafe links before writes. Mock transport only.');
