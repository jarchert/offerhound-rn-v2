import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
const root=process.cwd();
function load(file,imports){const output={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.React,esModuleInterop:true}}).outputText,{exports:output,require:n=>{if(!(n in imports))throw Error('Unexpected import '+n);return imports[n]},console,Date,URL});return output;}
const sports=load('src/lib/data/sportPositions.ts',{});
const {profilePositions}=load('src/lib/profilePositions.ts',{'@/lib/data/sportPositions':sports});
for(const v of ['QB','Quarterback','Quarterback (QB)'])assert.deepEqual(Array.from(profilePositions({sport:'football',position:v,positions:[]})),['Quarterback (QB)']);
assert.deepEqual(Array.from(profilePositions({sport:'basketball',position:'PG'})),['Point Guard (PG)']);
assert.deepEqual(Array.from(profilePositions({sport:'football',positions:['QB','Quarterback','Custom Role']})),['Quarterback (QB)','Custom Role']);
let context=null;const nav=[];const react={createElement:(type,props,...children)=>({type,props:props||{},children}),createContext:()=>({Provider:'Provider'}),useContext:()=>context};
const native={View:'View',Text:'Text',Pressable:'Pressable',Alert:{alert(){}},StyleSheet:{create:s=>s}};
const imports={react:{__esModule:true,default:react,...react},'react-native':native,'react-native-safe-area-context':{SafeAreaView:'SafeAreaView'},'lucide-react-native':{Home:'Home',Bell:'Bell',MessageSquare:'MessageSquare',Menu:'Menu'},'@/lib/theme':{colors:{},typography:{fontFamily:{}}},'@/lib/pendingCampJourney':{clearPendingCampJourney(){}},'@/navigation/navigationRef':{navigationRef:{isReady:()=>true,navigate:(...args)=>nav.push(args)}}};
const home=load('src/navigation/HomeNavigation.tsx',imports);
function nodes(n){if(!n||typeof n!=='object')return[];if(Array.isArray(n))return n.flatMap(nodes);return[n,...nodes(n.children)];}
const signIn=nodes(home.HomeNavigationBar({authenticated:false})).find(x=>x.props.accessibilityLabel==='Sign in');signIn.props.onPress();assert.equal(nav.at(-1)[0],'AuthStack');assert.equal(nav.at(-1)[1].screen,'SignIn');
context=home.HomeNavigationProvider({route:'AthleteTabs',children:null}).props.value;context.goHome();assert.equal(nav.at(-1)[1].screen,'HomeTab');assert.equal(nav.at(-1)[1].params.tab,'activity');assert.equal(typeof nav.at(-1)[1].params.homeReset,'number');
// Execute actual modal close and backdrop handlers with nonzero notch insets.
let closed=[];const sheetReact={...react,useContext:()=>({open:true,side:'right',onOpenChange:v=>closed.push(v)}),useEffect:fn=>fn(),useRef:v=>({current:v})};
class AnimatedValue{interpolate(){return 0;}}
const sheet=load('src/components/ui/Sheet.tsx',{react:{__esModule:true,default:sheetReact,...sheetReact},'react-native':{...native,Modal:'Modal',ScrollView:'ScrollView',Dimensions:{get:()=>({width:390,height:844})},Animated:{Value:AnimatedValue,View:'AnimatedView',timing:()=>({start(){}})}},'react-native-safe-area-context':{useSafeAreaInsets:()=>({top:59,bottom:34})},'lucide-react-native':{X:'X'},'@/lib/theme':{colors:{},spacing:{lg:20,md:16,xl:24},typography:{fontFamily:{},fontSize:{},letterSpacing:{}}},'@/navigation/HomeNavigation':{HomeButton:'HomeButton'}});
const modal=sheet.SheetContent({children:null});const close=nodes(modal).find(n=>n.props.accessibilityLabel==='Close drawer');assert(close);assert(close.props.style[1].top>=59);close.props.onPress();modal.props.onRequestClose();assert.deepEqual(closed,[false,false]);
console.log('PASS: actual sign-in handler targets login, Home requests activity reset, legacy position aliases hydrate without dropping singular fallback, drawer close/system-back handlers work with notch insets. Platform rendering remains separate.');

const {resolvePublicOrigin}=load('src/lib/canonicalDomain.ts',{});
assert.equal(resolvePublicOrigin('staging'),'https://friday-night-recruiting.lovable.app');
assert.equal(resolvePublicOrigin('production'),'https://offer-hound.com');
assert.throws(()=>resolvePublicOrigin('staging','https://offer-hound.com'));
assert.throws(()=>resolvePublicOrigin('production','https://friday-night-recruiting.lovable.app'));
assert.throws(()=>resolvePublicOrigin('staging','https://user:password@friday-night-recruiting.lovable.app'));
const {teamOwnership}=load('src/lib/teamOwnership.ts',{});
assert.equal(teamOwnership(undefined,'hs-owner').hs_coach_profile_id,'hs-owner');assert.equal(teamOwnership(undefined,'hs-owner').club_coach_id,null);assert.equal(teamOwnership(undefined,'hs-owner').level,'high_school');assert.equal(teamOwnership('club-owner',undefined,'elite').club_coach_id,'club-owner');assert.equal(teamOwnership('club-owner').hs_coach_profile_id,null);assert.throws(()=>teamOwnership());assert.throws(()=>teamOwnership('club','hs'));
console.log('PASS: actual team ownership helper enforces mutually exclusive club/high-school foreign keys and the required high-school level. Live disposable HS team creation/reload/cleanup recorded separately.');
