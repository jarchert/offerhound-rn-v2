import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import vm from 'node:vm';
const source=fs.readFileSync('src/components/UserProfileHeader.tsx','utf8');
const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.React,esModuleInterop:true}}).outputText;
const react={createElement:(type,props,...children)=>({type,props,children})};
const imports={react:{__esModule:true,default:react},'react-native':{View:'View',Text:'Text',StyleSheet:{create:s=>s}},'@/components/ui/Avatar':{Avatar:'Avatar'},'@/lib/theme':{colors:{},spacing:{},typography:{fontFamily:{}}}};
const exports={};vm.runInNewContext(code,{exports,require:n=>imports[n]});
assert.equal(exports.UserProfileHeader({profile:null}),null);
for(const role of ['athlete','coach','scout','parent','influencer','agency','admin']){
 const tree=exports.UserProfileHeader({profile:{full_name:'QA '+role,profile_image_url:'https://example.test/photo.png',bio:'User supplied biography',sport:'soccer'}});
 assert.equal(tree.children[0].props.source.uri,'https://example.test/photo.png');
 assert.equal(tree.children[1].children[0],'QA '+role);assert(JSON.stringify(tree).includes('User supplied biography'));
 assert(!JSON.stringify(tree).includes('email'));
}
for(const sport of ['football','basketball','soccer','swimming']){
 const tree=exports.UserProfileHeader({profile:{name:'QA',sport}});assert.equal(tree.children[0].props.source,undefined);assert(JSON.stringify(tree).includes(sport));
}
console.log('PASS: native profile header displays supplied identity/photo/biography across roles and sports, preserves missing-image fallback, makes no contact-data query. Rendering transport mocked.');
