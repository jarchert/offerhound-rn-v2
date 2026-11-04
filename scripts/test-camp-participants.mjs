import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
const text=fs.readFileSync(new URL('../src/components/CampParticipantsPanel.tsx',import.meta.url),'utf8');
const code=ts.transpileModule(text,{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.React,esModuleInterop:true}}).outputText;
const rows=[{id:'enrollment-91',guest_name:null,jersey_number:'91',position_group:'QB',status:'checked_in'}];
function panel({user=true,registration=true,evaluation=true,error=false}={}) {
 const queries=[],navigation=[];let fromCalls=0;
 const react={createElement:(type,props,...children)=>({type,props:props||{},children}),useState:v=>[v,()=>{}],useEffect:()=>{}};
 const api={from(table){fromCalls++;const chain={select(){return chain;},eq(key,value){if(key==='camp_id')assert.equal(value,'camp-one');return chain;},neq(key,value){assert.equal(key,'status');assert.equal(value,'cancelled');return chain;},order(){return chain;},range(a,b){assert.equal(a,0);assert.equal(b,49);return chain;},in(key,ids){assert.equal(key,'enrollment_id');assert.deepEqual([...ids],['enrollment-91']);return chain;},then(resolve){return Promise.resolve({data:table==='camp_enrollments'?rows:[{enrollment_id:'enrollment-91',full_name:'QA Athlete'}],count:1,error:null}).then(resolve);}};return chain;}};
 const imports={react:{__esModule:true,default:react,...react},'react-native':{View:'View',Text:'Text'},'@react-navigation/native':{useNavigation:()=>({navigate:(...args)=>navigation.push(args)})},'@tanstack/react-query':{useQuery:options=>{queries.push(options);return options.queryKey[0]==='native-camp-participant-access'?{data:{registration,evaluation},isError:error,isPending:false}:{data:{rows:[{...rows[0],fullName:'QA Athlete'}],total:1},isPending:false,isError:false};}},'@/hooks/useAuth':{useAuth:()=>({user:user?{id:'qa-owner'}:null})},'@/integrations/supabase/client':{supabase:api},'@/components/ui/Button':{Button:'Button'},'@/components/ui/Card':{Card:'Card',CardHeader:'CardHeader',CardTitle:'CardTitle',CardDescription:'CardDescription',CardContent:'CardContent'},'@/components/CampRegistrantIdentity':{CampRegistrantProfileDisclosure:'Profile'},'@/lib/theme':{colors:{},spacing:{}}};
 const exports={};vm.runInNewContext(code,{exports,require:name=>{assert(name in imports,name);return imports[name];}});
 const tree=exports.CampParticipantsPanel({campId:'camp-one',campName:'QA Camp'});
 const find=(node,id)=>{if(!node||typeof node!=='object')return null;if(node.props?.testID===id)return node;for(const child of node.children?.flat(Infinity)||[]){const found=find(child,id);if(found)return found;}return null;};
 return {tree,queries,navigation,find:id=>find(tree,id),get fromCalls(){return fromCalls;}};
}
for(const options of [{user:false},{registration:false,evaluation:false},{error:true}]){const result=panel(options);assert.equal(result.queries[1].enabled,false);assert.equal(result.fromCalls,0);assert.equal(result.find('camp-open-checkin'),null);assert.equal(result.find('camp-open-evaluation'),null);}
const owner=panel();assert.equal(owner.queries[1].enabled,true);owner.find('camp-open-checkin').props.onPress();owner.find('camp-open-evaluation').props.onPress();assert.deepEqual(JSON.parse(JSON.stringify(owner.navigation)),[['CampMobileCheckin',{campId:'camp-one'}],['CampEvaluatorScoring',{campId:'camp-one'}]]);
assert.equal(owner.find('camp-participant-91').props.testID,'camp-participant-91');
const loaded=await owner.queries[1].queryFn();assert.equal(loaded.rows[0].fullName,'QA Athlete');assert.equal(loaded.total,1);
const evaluator=panel({registration:false});assert.equal(evaluator.find('camp-open-checkin'),null);assert(evaluator.find('camp-open-evaluation'));
console.log('Native participants: PASS (actual component, private query gating, scoped roster/name query, same-camp navigation and evaluator-only controls; mocked transport)');
