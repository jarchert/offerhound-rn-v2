import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
const source=readFileSync(new URL('../src/lib/push.ts',import.meta.url),'utf8');
const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;
const calls=[];
const notifications={
 setNotificationHandler(){},
 getPermissionsAsync:async()=>{calls.push('permissions');return {status:'granted'};},
 getExpoPushTokenAsync:async()=>{calls.push('token');return {data:'fixture-token'};},
};
const api={exports:{}};
vm.runInNewContext(compiled,{
 exports:api.exports,
 process:{env:{EXPO_PUBLIC_APP_ENV:'staging'}},
 require(name){
  if(name==='expo-notifications')return notifications;
  if(name==='expo-device')return {isDevice:true};
  if(name==='react-native')return {Platform:{OS:'ios'}};
  if(name==='@/integrations/supabase/client')return {supabase:{from(){calls.push('database');throw Error('Unexpected QA push registration');}}};
  throw Error(`Unexpected import ${name}`);
 },
});
assert.equal(await api.exports.requestPushPermissions(),false);
assert.equal(await api.exports.registerForPushNotifications('synthetic-user'),null);
assert.deepEqual(calls,[]);
console.log('Staging push isolation: no permission prompt, token request, or database write — PASS');
