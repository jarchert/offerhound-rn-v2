import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
const source=fs.readFileSync('src/components/PasswordInput.tsx','utf8');
const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.React,esModuleInterop:true}}).outputText;
for(const platform of ['ios','android']){
 let visible=false;const react={createElement:(type,props,...children)=>({type,props,children}),useState:()=>[visible,fn=>visible=fn(visible)]};
 const imports={react:{__esModule:true,default:react,...react},'react-native':{View:'View',Text:'Text',TextInput:'TextInput',Pressable:'Pressable',StyleSheet:{create:s=>s},Platform:{OS:platform}},'lucide-react-native':{Eye:'Eye',EyeOff:'EyeOff'},'@/lib/theme':{colors:{foreground:'#fff'}}};
 const exports={};vm.runInNewContext(code,{exports,require:n=>imports[n]});
 const props={value:'synthetic password',onChangeText:()=>{}};
 let tree=exports.PasswordInput(props);assert.equal(tree.children[0].props.secureTextEntry,true);assert.equal(tree.children[1].props.accessibilityLabel,'Show password');
 tree.children[1].props.onPress();tree=exports.PasswordInput(props);assert.equal(tree.children[0].props.secureTextEntry,false);assert.equal(tree.children[0].props.value,props.value);assert.equal(tree.children[1].props.accessibilityLabel,'Hide password');
 tree.children[1].props.onPress();tree=exports.PasswordInput(props);assert.equal(tree.children[0].props.secureTextEntry,true);assert.equal(tree.children[0].props.autoCorrect,false);
}
for(const screen of ['SignInScreen','AuthScreen']){const text=fs.readFileSync('src/screens/auth/'+screen+'.tsx','utf8');assert(text.includes('<PasswordInput'));assert(!/<TextInput\b[^>]*secureTextEntry/.test(text));}
console.log('PASS: iOS/Android component toggle hides by default, reveals and hides without changing the password; both sign-in entry points use the control. Native rendering remains a device check.');
