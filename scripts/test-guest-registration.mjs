import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
let stored = null;
let loseReply = false;
const calls = [];
const serverRows = new Map();
const storage = {
  async getItem() { await new Promise(resolve => setImmediate(resolve)); return stored; },
  async setItem(_key, value) { await new Promise(resolve => setImmediate(resolve)); stored = value; },
};
const api = { async rpc(name, args) {
  assert.equal(name, 'register_camp_attendee'); calls.push(args);
  const key = [args.p_camp_id, args.p_guest, args.p_request_key].join(':');
  if (!serverRows.has(key)) serverRows.set(key, `guest-${serverRows.size + 1}`);
  if (loseReply) { loseReply = false; return { data: null, error: { code: 'NETWORK', message: 'Reply lost' } }; }
  return { data: serverRows.get(key), error: null };
} };
function load(path, imports) {
  const exports = {};
  const source = fs.readFileSync(new URL(path, import.meta.url), 'utf8');
  const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true } }).outputText;
  vm.runInNewContext(js, { exports, require(name) { if (!(name in imports)) throw Error(`Unexpected import ${name}`); return imports[name]; } });
  return exports;
}
const identity = load('../src/lib/nativeRegistrantIdentity.ts', {});
const guest = load('../src/lib/nativeCampGuest.ts', { '@/integrations/supabase/client': { supabase: api }, '@/lib/nativeRegistrantIdentity': identity });
const queue = load('../src/lib/checkinQueue.ts', { '@/integrations/supabase/client': { supabase: api }, './nativeCampGuest': guest, './nativeCampCheckin': { checkInNativeToken() { throw Error('Unexpected QR operation'); } }, '@react-native-async-storage/async-storage': { __esModule: true, default: storage } });
const draft = { requestKey: 'native_guest_001', staffId: 'staff-a', fullName: ' QA Guest ', emailAddress: 'guest@example.test', phone:'3125550100', birthDate:'2000-01-01', headshotPath:'camp-a/staff-a/native_guest_001.jpg', jerseyNumber: ' 7 ', position: 'QB' };
let passed = 0;
async function test(fn) { stored = null; loseReply = false; calls.length = 0; serverRows.clear(); await fn(); passed++; }
await test(async () => { const args = guest.nativeGuestArguments('camp-a', draft); assert.equal(args.p_guest, true); assert.equal(args.p_full_name, 'QA Guest'); assert.equal(args.p_jersey_number, '7'); assert.equal(args.p_email, 'guest@example.test'); assert(!('user_id' in args)); });
await test(async () => { for (const patch of [{ headshotPath:'' }, { birthDate:'2026-02-30' }, { phone:'abc' }, { emailAddress:'' }, { fullName: ' ' }, { emailAddress: 'bad email' }, { jerseyNumber: '1234567890123' }]) assert.throws(() => guest.nativeGuestArguments('camp-a', { ...draft, ...patch })); });
await test(async () => { await Promise.all([queue.enqueueOp({ kind: 'walkup_register', campId: 'camp-a', payload: draft }), queue.enqueueOp({ kind: 'walkup_register', campId: 'camp-a', payload: { ...draft, requestKey: 'native_guest_002', fullName: 'Second Guest' } })]); assert.equal((await queue.listQueue('camp-a', 'staff-a')).length, 2); });
await test(async () => { await queue.enqueueOp({ kind: 'walkup_register', campId: 'camp-a', payload: draft }); assert.equal((await queue.listQueue('camp-a', 'staff-b')).length, 0); assert.equal((await queue.flushQueue('camp-a', 'staff-b')).flushed, 0); assert.equal(calls.length, 0); assert.equal((await queue.listQueue('camp-a', 'staff-a')).length, 1); });
await test(async () => { await queue.enqueueOp({ kind: 'walkup_register', campId: 'camp-a', payload: draft }); loseReply = true; assert.equal((await queue.flushQueue('camp-a', 'staff-a')).failed, 1); assert.equal((await queue.listQueue('camp-a', 'staff-a'))[0].attempts, 1); assert.equal((await queue.flushQueue('camp-a', 'staff-a')).flushed, 1); assert.equal(serverRows.size, 1); assert.equal((await queue.listQueue('camp-a', 'staff-a')).length, 0); assert(calls.every(call => call.p_request_key === draft.requestKey)); });
await test(async () => { const restored = guest.recoverNativeGuest({ user_id: 'staff-a', notes: 'Walk-up — Name: Legacy Guest | Email: legacy@example.test', jersey_number: '9' }, 'legacy-operation-001'); assert.equal(restored.staffId, 'staff-a'); assert.equal(restored.fullName, 'Legacy Guest'); assert.equal(restored.emailAddress, 'legacy@example.test'); assert.equal(restored.requestKey, 'legacy-operation-001'); });
await test(async () => { await queue.enqueueOp({ kind: 'walkup_register', campId: 'camp-a', payload: draft }); await Promise.all([queue.flushQueue('camp-a', 'staff-a'), queue.flushQueue('camp-a', 'staff-a')]); assert.equal(serverRows.size, 1); assert.equal(calls.length, 1); });
await test(async () => { const a = guest.makeGuestRequestKey(); const b = guest.makeGuestRequestKey(); assert.notEqual(a, b); assert(/^[A-Za-z0-9_-]{8,100}$/.test(a)); });
await test(async () => { stored = '{unreadable'; await assert.rejects(queue.enqueueOp({ kind: 'walkup_register', campId: 'camp-a', payload: draft }), /Existing entries were kept/); assert.equal(stored, '{unreadable'); });
console.log(`Native guest registration and offline queue: PASS (${passed} cases; actual modules with mocked storage/transport)`);
