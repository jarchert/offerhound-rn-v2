import fs from 'node:fs';import vm from 'node:vm';import ts from 'typescript';import assert from 'node:assert/strict';
const api={};vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/lib/agencyInvitations.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports:api});
let payload,filters=[],response={data:{id:'invite',user_id:'invitee',organization_id:'agency',invitation_accepted:true}};
const q={update(p){payload=p;return q},eq(k,v){filters.push([k,v]);return q},select(){return q},single:async()=>response};const client={from:t=>{assert.equal(t,'organization_members');return q}};
await api.acceptAgencyInvitation(client,'invitee','invite');assert.deepEqual(Object.keys(payload).sort(),['invitation_accepted','joined_at']);assert.equal(JSON.stringify(filters),JSON.stringify([['id','invite'],['user_id','invitee'],['invitation_accepted',false]]));
for(const data of [null,{id:'invite',user_id:'other',organization_id:'agency',invitation_accepted:true},{id:'invite',user_id:'invitee',organization_id:'agency',invitation_accepted:false}]){response={data};await assert.rejects(()=>api.acceptAgencyInvitation(client,'invitee','invite'),/not confirmed/)}
response={error:Error('denied')};await assert.rejects(()=>api.acceptAgencyInvitation(client,'invitee','invite'),/denied/);
console.log('PASS: actual acceptance sends no role/account/agency overrides, scopes to the signed-in pending invitee, and rejects missing, wrong-account, pending and denied ACKs. Mock transport only.');
