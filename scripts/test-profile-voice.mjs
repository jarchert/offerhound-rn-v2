import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';import ts from 'typescript';
function moduleOf(path,imports){const exports={};const code=ts.transpileModule(fs.readFileSync(new URL(path,import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.React,esModuleInterop:true}}).outputText;vm.runInNewContext(code,{exports,require:name=>{assert(name in imports,name);return imports[name];}});return exports;}
for(const permission of [true,false,null]){
 const calls=[];const api={rpc:async()=>({data:permission,error:null}),from:table=>{calls.push(table);const filters={};const query={select(){return query;},eq(k,v){filters[k]=v;return query;},maybeSingle:async()=>({data:permission===null?null:{camp_id:'camp-one'},error:null}),order:async()=>{assert.equal(filters.camp_id,'camp-one');assert.equal(filters.enrollment_id,'athlete-one');assert(!('drill_key' in filters),'Profile must include every drill');return {data:[{id:'note-one'}],error:null};}};return query;}};
 const read=moduleOf('../src/lib/nativeProfileVoice.ts',{'@/integrations/supabase/client':{supabase:api}}).loadNativeProfileVoice;
 const result=await read('athlete-one');if(permission===true){assert.equal(result.notes[0].id,'note-one');}else{assert.equal(result,null);assert(!calls.includes('camp_voice_notes'));}
}
const source=fs.readFileSync(new URL('../src/components/CampProfileVoiceNotes.tsx',import.meta.url),'utf8');
async function playerCase(defer){
 const effects=[];let released=false,plays=0,replacements=0,resolveUrl;const pending=new Promise(resolve=>{resolveUrl=resolve;});
 const react={createElement:(type,props,...children)=>({type,props:props||{},children}),useState:v=>[v,()=>{}],useRef:v=>({current:v}),useEffect:effect=>{effects.push(effect);}};
 const player={pause(){assert(!released,'Cannot pause released player');},replace(){assert(!released);replacements++;},play(){assert(!released);plays++;}};
 const imports={react:{__esModule:true,default:react,...react},'react-native':{View:'View',Text:'Text',AppState:{addEventListener:()=>({remove(){}})}},'@tanstack/react-query':{useQuery:()=>({data:{campId:'camp-one',notes:[{id:'note-one',drill_key:'vertical_jump',duration_ms:8326,created_at:'2026-11-04T00:00:00Z'}]}})},'@react-navigation/native':{useIsFocused:()=>true},'expo-audio':{useAudioPlayer:()=>{effects.push(()=>()=>{released=true;});return player;},useAudioPlayerStatus:()=>({playing:false,currentTime:0,duration:0}),setAudioModeAsync:async()=>{}},'@/hooks/useAuth':{useAuth:()=>({user:{id:'author'}})},'@/components/ui/Button':{Button:'Button'},'@/lib/nativeProfileVoice':{loadNativeProfileVoice:()=>{}},'@/lib/nativeCampVoice':{nativeVoicePlayback:()=>defer?pending:Promise.resolve('private-signed-url')},'@/lib/theme':{colors:{},spacing:{}}};
 const exports={};vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.React,esModuleInterop:true}}).outputText,{exports,require:name=>{assert(name in imports,name);return imports[name];}});
 const tree=exports.CampProfileVoiceNotes({enrollmentId:'athlete-one'});const cleanups=effects.map(fn=>fn()).filter(Boolean);
 function find(node){if(node?.props?.testID==='profile-voice-play-0')return node;for(const child of node?.children?.flat(Infinity)||[]){const result=find(child);if(result)return result;}}
 const button=find(tree);assert(button,'Profile must expose saved-note playback');button.props.onPress();
 if(defer){cleanups.forEach(fn=>fn());resolveUrl('expired-screen-signed-url');await new Promise(resolve=>setImmediate(resolve));assert.equal(plays,0);assert.equal(replacements,0);}
 else{await new Promise(resolve=>setImmediate(resolve));assert.equal(plays,1);assert.equal(replacements,1);cleanups.forEach(fn=>fn());}
 assert(released,'Expo hook owns player release');
}
await playerCase(false);await playerCase(true);
console.log('Native profile voice: PASS (actual private reader scopes all drills and denies unauthorized loads; actual profile player handles playback and pending request/unmount without released-object calls; mocked transport/native boundary)');
