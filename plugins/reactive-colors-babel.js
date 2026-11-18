// Apply only to this application's UI. Dependencies and native modules stay intact.
const path=require('node:path');
module.exports=({types:t})=>({visitor:{Program(program,state){
 const filename=state.filename||'';const root=path.resolve(__dirname,'..');if(!filename.startsWith(root+path.sep)||filename.includes('node_modules')||/[\\/]src[\\/](lib[\\/](reactiveColors|reactiveColorValues|adaptiveTheme)|contexts[\\/]ThemeContext)\./.test(filename))return;
 const native=new Set(['View','Text','TextInput','ScrollView','FlatList','SectionList','SafeAreaView','Pressable','TouchableOpacity','TouchableHighlight','TouchableWithoutFeedback','ActivityIndicator','Image','ImageBackground','KeyboardAvoidingView','Switch','Modal','RefreshControl','Button']);
 let helper,animatedHelper;const declarations=[];
 for(const declaration of program.get('body')){if(!declaration.isImportDeclaration())continue;const source=declaration.node.source.value;if(!['react-native','react-native-svg','lucide-react-native','react-native-safe-area-context'].includes(source)||declaration.node.importKind==='type')continue;
  for(const spec of declaration.get('specifiers')){if(spec.node.importKind==='type'||spec.isImportNamespaceSpecifier())continue;const name=spec.isImportDefaultSpecifier()?'default':spec.node.imported.name;const isAnimated=source==='react-native'&&name==='Animated';if(source==='react-native'&&!native.has(name)&&!isAnimated)continue;if(source==='react-native-safe-area-context'&&name!=='SafeAreaView')continue;if(source==='react-native-svg'&&['default','Svg','Circle','Ellipse','G','Line','Path','Polygon','Polyline','Rect','Text','TSpan','TextPath','Use','Image','Stop'].indexOf(name)<0)continue;
   if(isAnimated)animatedHelper??=program.scope.generateUidIdentifier('withReactiveAnimated');else helper??=program.scope.generateUidIdentifier('withReactiveColors');
   const local=t.cloneNode(spec.node.local),original=program.scope.generateUidIdentifier(local.name+'Native');spec.node.local=original;
   declarations.push(t.variableDeclaration('const',[t.variableDeclarator(local,t.callExpression(t.cloneNode(isAnimated?animatedHelper:helper),[t.cloneNode(original)]))]));
  }
 }
 if(declarations.length){const specs=[];if(helper)specs.push(t.importSpecifier(t.cloneNode(helper),t.identifier('withReactiveColors')));if(animatedHelper)specs.push(t.importSpecifier(t.cloneNode(animatedHelper),t.identifier('withReactiveAnimated')));program.unshiftContainer('body',t.importDeclaration(specs,t.stringLiteral('@/lib/reactiveColors')));let index=program.node.body.findLastIndex(n=>t.isImportDeclaration(n));program.node.body.splice(index+1,0,...declarations);}
}}});
