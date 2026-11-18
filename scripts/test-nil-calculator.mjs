import fs from 'node:fs';import ts from 'typescript';import vm from 'node:vm';import assert from 'node:assert/strict';
let inputs=[];let index=0;
const react={createElement:(type,props,...children)=>({type,props:props||{},children}),useState:initial=>[inputs[index++]??initial,()=>{}],useEffect(){}};
const theme={colors:{},spacing:{},radius:{},typography:{fontFamily:{},fontSize:{},heading:{},letterSpacing:{}}};
const native={View:'View',Text:'Text',SafeAreaView:'SafeAreaView',ScrollView:'ScrollView',StyleSheet:{create:x=>x,flatten:x=>x}};
const mocks={react:{__esModule:true,default:react,...react},'react-native':native,'@/lib/theme':theme,'@tanstack/react-query':{useQuery:()=>({data:null})},'@/hooks/useAuth':{useAuth:()=>({user:null})},'@/contexts/AuthContext':{useAuth:()=>({user:null})}};
const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/screens/shared/NILIntelligenceScreen.tsx','utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.React,esModuleInterop:true}}).outputText,{exports,require:n=>mocks[n]||new Proxy({},{get:(_,k)=>k==='__esModule'?true:String(k)}),console});
function text(node){if(node==null)return'';if(typeof node!=='object')return String(node);if(Array.isArray(node))return node.map(text).join(' ');return text(node.children);}
function render(followers,sport,engagement){index=0;inputs=['calculator',followers,sport,engagement];return text(exports.default());}
const valid=render('1000','Football','3');for(const amount of ['$750','$1,500','$3,000'])assert(valid.includes(amount));
for(const args of [['','Football','3'],['0','Football','3'],['-1','Football','3'],['1.5','Football','3'],['1000','Football','101'],['1000','Football','-1'],['1000','Football',''],['1000','Football','NaN'],['1000','Unknown','3'],['1e100','Football','3']]){const actual=render(...args);assert(actual.includes('Complete the valid inputs'));assert(!actual.includes('$1,500'));assert(actual.includes('—'));}
assert(render('1000','Football','0').includes('$1,500'));
console.log('PASS: actual NIL calculator renders known fictional outputs only for supported valid inputs; blank/zero/negative/fractional/overflow followers, missing sport, invalid engagement suppress estimates and show guidance. No financial accuracy certification.');
react.useMemo=fn=>fn();
let schoolState={schoolInterests:[],schoolData:[],schoolDataLoading:false,schoolDataError:false,refetchSchoolData(){}};
mocks['@/hooks/useNILSchoolData']={useNILSchoolData:()=>schoolState,STATE_TAX_DATA:{Texas:{rate:0,localRate:0,hasLuxury:false,notes:'Synthetic model fixture'}}};
function loadComponent(file,extra=''){const result={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8')+extra,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.React,esModuleInterop:true}}).outputText,{exports:result,require:n=>n==='react'?{__esModule:true,default:react,...react}:mocks[n]||new Proxy({},{get:(_,k)=>k==='__esModule'?true:String(k)}),console});return result;}
const net=loadComponent('src/components/nil/NILNetIncomeCalculator.tsx');
function netText(gross,state){index=0;inputs=[gross,state];return text(net.NILNetIncomeCalculator({}));}
for(const [gross,state]of[['','Texas'],['0','Texas'],['-2','Texas'],['1e100','Texas'],['50000','Unknown'],['50000','']])assert(!netText(gross,state).includes('31,350'));
assert(netText('50000','Texas').includes('31,350'));assert(netText('','').includes('historical state/local rates'));
const selector=loadComponent('src/components/nil/NILSchoolSelector.tsx');index=0;inputs=[];let empty=text(selector.NILSchoolSelector({selectedSchools:[],onToggleSchool(){}}));assert(/0\s+schools available/.test(empty));assert(empty.includes('No school comparison data'));assert(!empty.includes('301'));
schoolState.schoolDataError=true;index=0;inputs=[];assert(text(selector.NILSchoolSelector({selectedSchools:[],onToggleSchool(){}})).includes('School data could not load'));
const comparison=loadComponent('src/components/nil/NILSideBySideComparison.tsx','\nexport {calcSchoolNet};');assert.equal(comparison.calcSchoolNet('Unknown',50000),null);assert.equal(comparison.calcSchoolNet('Texas',NaN),null);assert.equal(comparison.calcSchoolNet('Texas',50000).net,31350);
console.log('PASS: actual net-income UI suppresses invalid/blank inputs, school selector distinguishes empty/error data with real counts, and school comparison never treats unknown state tax data as zero. Synthetic model fixtures; no tax accuracy certification.');
