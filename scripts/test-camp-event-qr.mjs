import {build} from 'esbuild';import assert from 'node:assert/strict';import fs from 'node:fs';import {createRequire}from'node:module';
const require=createRequire(import.meta.url);
const file='/private/tmp/offerhound-native-qr-contract.cjs';
await build({entryPoints:['src/lib/campEventQR.ts'],bundle:true,platform:'node',format:'cjs',outfile:file,define:{'process.env.EXPO_PUBLIC_CAMP_CONSENT_WEB_URL':'"https://qa.example.test"','process.env.EXPO_PUBLIC_APP_ENV':'"staging"'}});
const {campEventUrl,campQRVector,campQRPDF,campQRFilename}=require(file);
const id='20000000-0000-4000-8000-000000000001',url=campEventUrl(id);
assert.equal(url,'https://qa.example.test/camp-consent?event='+id);assert.throws(()=>campEventUrl('invalid'));
const vector=campQRVector(url);assert(vector.svg.startsWith('<svg'));assert(vector.svg.includes('viewBox="0 0 '+vector.size));assert(vector.cells.every(([x,y])=>x>=4&&y>=4&&x<vector.size-4&&y<vector.size-4));
const expected=require('qrcode').create(url,{errorCorrectionLevel:'H'}).modules;assert.equal(vector.cells.length,Array.from(expected.data).filter(Boolean).length);
const pdf=campQRPDF(url,'QA Skills Camp');assert(pdf.startsWith('%PDF-1.4'));assert(pdf.includes(url));const start=Number(pdf.match(/startxref\n(\d+)/)[1]);assert.equal(pdf.slice(start,start+4),'xref');const offsets=pdf.slice(start).match(/\d{10} 00000 n/g).map(x=>Number(x.slice(0,10)));offsets.forEach((n,i)=>assert(pdf.slice(n).startsWith(`${i+1} 0 obj`)));assert.equal(campQRFilename('../../ Skills Camp /','20000000'), 'skills-camp-20000000-qr');
fs.writeFileSync('/private/tmp/offerhound-native-qr-review.svg',vector.svg);fs.writeFileSync('/private/tmp/offerhound-native-qr-review.pdf',pdf);
console.log('Native event QR PASS: stable camp URL, invalid ID, quiet zone, exact encoded matrix, SVG content, PDF header/xref/objects, safe filenames. Native share sheet requires device verification.');
// Exercise actual native handlers; filesystem/share-sheet boundaries are mocked.
const vm=await import('node:vm'),ts=await import('typescript');
const source=ts.default.transpileModule(fs.readFileSync('src/components/CampRegistrationQR.tsx','utf8'),{compilerOptions:{module:ts.default.ModuleKind.CommonJS,jsx:ts.default.JsxEmit.React,esModuleInterop:true}}).outputText;
const states=[],refs=[],effects=[],writes=[],shares=[],rpcCalls=[];let si=0,ri=0,didEffect=false,tree;
const react={createElement:(type,props,...children)=>({type,props:props||{},children}),useState:(v)=>{const i=si++;if(!(i in states))states[i]=v;return[states[i],x=>{states[i]=typeof x==='function'?x(states[i]):x;}];},useRef:v=>refs[ri++]??(refs[ri-1]={current:v}),useEffect:fn=>{if(!didEffect)effects.push(fn);}};
const imports={react:{__esModule:true,default:react,...react},'react-native':{useWindowDimensions:()=>({width:360}),View:'View',Text:'Text',Alert:{alert:(...args)=>{throw Error(args.join(':'));}},Share:{share:async()=>{}}},'react-native-qrcode-svg':{__esModule:true,default:'QR'},'expo-file-system':{Paths:{cache:'file:///cache/'},File:class{constructor(_dir,name){this.uri='file:///cache/'+name;}write(content,options){writes.push({uri:this.uri,content,options});}}},'expo-sharing':{isAvailableAsync:async()=>true,shareAsync:async(uri,options)=>shares.push({uri,options})},'@/components/ui/Button':{Button:'Button'},'@/integrations/supabase/client':{supabase:{rpc:async(name,args)=>{rpcCalls.push({name,args});return{data:{published:true,can_manage:true,camp_name:'QA Skills Camp'},error:null};}}},'@/lib/campEventQR':{campEventUrl,campQRVector,campQRPDF,campQRFilename},'@/lib/theme':{colors:{}}};
const exported={};vm.default.runInNewContext(source,{exports:exported,require:name=>{assert(name in imports,name);return imports[name];},Promise,setTimeout,clearTimeout});
function render(){si=0;ri=0;tree=exported.CampRegistrationQR({campId:id});}
function nodes(v){if(Array.isArray(v))return v.flatMap(nodes);if(!v||typeof v!=='object')return[];return[v,...nodes(v.children)];}
function label(v){if(Array.isArray(v))return v.map(label).join('');return typeof v==='object'&&v?label(v.children):String(v??'');}
render();effects.forEach(fn=>fn());didEffect=true;await new Promise(setImmediate);render();nodes(tree).find(n=>n.type==='QR').props.getRef({toDataURL:(cb,options)=>{assert.equal(options.width,1024);assert.equal(options.height,1024);cb('cG5nLWJvdW5kYXJ5LWZpeHR1cmU=');}});
for(const format of ['PNG','SVG','PDF']){const button=nodes(tree).find(n=>n.type==='Button'&&label(n).startsWith('Save '+format));assert(button);button.props.onPress();await new Promise(setImmediate);}
assert.equal(writes.length,3);assert.equal(writes[0].options.encoding,'base64');assert(writes[1].content.startsWith('<svg'));assert(writes[2].content.startsWith('%PDF-1.4'));assert.deepEqual(shares.map(x=>x.options.mimeType),['image/png','image/svg+xml','application/pdf']);
console.log('Native actual QR export handlers PASS: 1024px PNG request, SVG/PDF file writes, camp filenames and correct share-sheet MIME types; mocked native boundaries.');
