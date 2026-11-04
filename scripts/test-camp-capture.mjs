import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';import ts from 'typescript';
const uuid='11111111-2222-4333-8444-555555555555';const files=new Map();const notes=new Set();const calls=[];let loseReply=false;let removeError=false;let deletes=0;
const bucket={async upload(path,bytes){calls.push(['upload',path]);if(files.has(path))return{error:{statusCode:'409'}};files.set(path,bytes);return{error:null};},async remove(paths){calls.push(['remove',...paths]);if(removeError)return{error:Error('offline')};paths.forEach(p=>files.delete(p));return{error:null};},async createSignedUrl(path,ttl){calls.push(['signed',path,ttl]);return{data:{signedUrl:'https://private.test/temporary'},error:null};}};
const api={storage:{from:()=>bucket},async rpc(name,args){calls.push([name,args]);if(name==='check_in_camp_token')return{data:{enrollment_id:uuid,status:'checked_in'},error:null};notes.add(args.p_id);if(loseReply){loseReply=false;return{error:Error('reply lost')}}return{data:args.p_id,error:null};},from(){return{select(){return this;},eq(_key,id){this.id=id;return this;},async maybeSingle(){return{data:notes.has(this.id)?{id:this.id}:null,error:null};},delete(){deletes++;return{eq:()=>({select:async()=>({data:[{id:uuid}],error:null})})};}};}};
function load(path){const exports={};const code=ts.transpileModule(fs.readFileSync(new URL(path,import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;vm.runInNewContext(code,{exports,URL,require:n=>{assert.equal(n,'@/integrations/supabase/client');return{supabase:api};}});return exports;}
const qr=load('../src/lib/nativeCampCheckin.ts');const voice=load('../src/lib/nativeCampVoice.ts');let passed=0;async function test(fn){await fn();passed++;}
await test(()=>{for(const value of [uuid,uuid.toUpperCase(),`https://offer-hound.com/camps?token=${uuid}`,`offerhound-staging://camps/${uuid}`])assert.equal(qr.decodeCampToken(value),uuid);});
await test(()=>{for(const value of [uuid.slice(0,8),'not-a-qr',`https://attacker.test/?token=${uuid}`,`https://offer-hound.com/?token=${uuid.slice(0,12)}`])assert.throws(()=>qr.decodeCampToken(value));});
await test(async()=>{await qr.checkInNativeToken('camp',uuid,'staff');const call=calls.at(-1);assert.equal(call[0],'check_in_camp_token');assert.equal(call[1].p_actor_user_id,'staff');assert.equal(call[1].p_token,uuid);await assert.rejects(qr.checkInNativeToken('camp',uuid,''));});
const draft={id:uuid,uri:'file://recording.m4a',durationMs:2500,staffId:'staff'};const bytes=new ArrayBuffer(32);
await test(async()=>{loseReply=true;await assert.rejects(voice.persistNativeVoice('camp','athlete','forty_yard_dash',draft,bytes));await voice.persistNativeVoice('camp','athlete','forty_yard_dash',draft,bytes);assert.equal(files.size,1);assert.equal(notes.size,1);const args=calls.filter(c=>c[0]==='save_camp_voice_note').at(-1)[1];assert.equal(args.p_enrollment_id,'athlete');assert.equal(args.p_drill_key,'forty_yard_dash');assert.equal(args.p_storage_path,`camp/athlete/staff/${uuid}.m4a`);});
await test(async()=>{for(const durationMs of [0,120001])await assert.rejects(voice.persistNativeVoice('camp','athlete','forty_yard_dash',{...draft,durationMs},bytes));await assert.rejects(voice.persistNativeVoice('camp','athlete','forty_yard_dash',draft,new ArrayBuffer(0)));});
await test(async()=>{const before=calls.filter(c=>c[0]==='remove').length;await voice.discardNativeUpload('camp','athlete',draft);assert.equal(calls.filter(c=>c[0]==='remove').length,before,'Lost save reply must never cause committed audio to be discarded');});
await test(async()=>{await voice.nativeVoicePlayback({storage_path:'private/path'});assert.equal(calls.at(-1)[2],90);});
await test(async()=>{removeError=true;await assert.rejects(voice.removeNativeVoice({id:uuid,storage_path:'private/path'}));assert.equal(deletes,0,'Keep metadata if file deletion fails');removeError=false;await voice.removeNativeVoice({id:uuid,storage_path:'private/path'});assert.equal(deletes,1);});
await test(()=>{assert.match(voice.newVoiceIdentity(),/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/);});
// Exercise the real persistent queue with the actual native QR module, not a mirrored replay function.
let queueValue = null;
const queueStorage = { async getItem() { return queueValue; }, async setItem(_key, value) { queueValue = value; } };
const queueExports = {};
const queueCode = ts.transpileModule(fs.readFileSync(new URL('../src/lib/checkinQueue.ts', import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
vm.runInNewContext(queueCode, { exports: queueExports, require(name) {
  if (name === '@react-native-async-storage/async-storage') return { default: queueStorage };
  if (name === './nativeCampCheckin') return qr;
  if (name === '@/integrations/supabase/client') return { supabase: api };
  if (name === './nativeCampGuest') return { savedGuestStaff: () => { throw Error('QR replay must not use guest registration'); } };
  throw Error(`Unexpected queue dependency: ${name}`);
} });
await test(async () => {
  await queueExports.enqueueOp({ kind: 'qr_check_in', campId: 'camp', payload: { token: uuid, staffId: 'staff' } });
  assert.equal((await queueExports.listQueue('camp', 'other-staff')).length, 0);
  const before = calls.length;
  assert.equal((await queueExports.flushQueue('camp', 'other-staff')).flushed, 0);
  assert.equal(calls.length, before, 'Another staff account must not submit a saved QR');
});
const normalRpc = api.rpc;
await test(async () => {
  api.rpc = async () => ({ error: Error('Network reply lost') });
  const failed = await queueExports.flushQueue('camp', 'staff');
  assert.equal(failed.failed, 1);
  const retained = await queueExports.listQueue('camp', 'staff');
  assert.equal(retained[0].attempts, 1);
  assert.equal(retained[0].payload.token, uuid);
  api.rpc = normalRpc;
  const replay = await queueExports.flushQueue('camp', 'staff');
  assert.equal(replay.flushed, 1);
  assert.equal((await queueExports.listQueue('camp', 'staff')).length, 0);
  assert.equal(calls.at(-1)[1].p_actor_user_id, 'staff');
});
await test(async () => {
  const op = await queueExports.enqueueOp({ kind: 'qr_check_in', campId: 'camp', payload: { token: uuid, staffId: 'staff' } });
  api.rpc = async () => ({ error: Error('This QR code has expired') });
  assert.equal((await queueExports.flushQueue('camp', 'staff')).failed, 1);
  assert.match((await queueExports.listQueue('camp', 'staff'))[0].lastError, /expired/);
  await queueExports.removeOp(op.id);
  api.rpc = normalRpc;
});
await test(() => {
  assert.equal(voice.nativeRecordingDuration(9600, 9580), 9580);
  assert.throws(() => voice.nativeRecordingDuration(9600, 100), /interrupted/);
  assert.throws(() => voice.nativeRecordingDuration(9600, 0), /interrupted/);
  assert.throws(() => voice.nativeRecordingDuration(9600, NaN), /interrupted/);
});
console.log(`Native camp capture: PASS (${passed} parsing, RPC, persistence retry, deletion and actual offline-queue cases; mocked transport)`);
