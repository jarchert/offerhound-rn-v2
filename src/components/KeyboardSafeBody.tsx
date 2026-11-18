import React,{useEffect,useRef,useState} from 'react';
import {Keyboard,KeyboardAvoidingView,Platform,StatusBar,View,StyleSheet} from 'react-native';
/** Bound Android content to the actual keyboard top even when edge-to-edge
 * native stacks do not propagate adjustResize to their nested screen. */
export function KeyboardSafeBody({children}:{children:React.ReactNode}) {
  const parent=useRef<View>(null),origin=useRef(0),keyboardTop=useRef<number|null>(null);
  const [offset,setOffset]=useState(0),[maxHeight,setMaxHeight]=useState<number|undefined>(undefined);
  const measure=()=>parent.current?.measureInWindow((_x,y)=>{origin.current=y;setOffset(y);if(Platform.OS==='android'&&keyboardTop.current!==null)setMaxHeight(Math.max(0,keyboardTop.current-y));});
  useEffect(()=>{if(Platform.OS!=='android')return;const show=Keyboard.addListener('keyboardDidShow',event=>{keyboardTop.current=Math.max(0,event.endCoordinates.screenY-(StatusBar.currentHeight||0));measure();});const hide=Keyboard.addListener('keyboardDidHide',()=>{keyboardTop.current=null;setMaxHeight(undefined);});return()=>{show.remove();hide.remove();};},[]);
  return <View ref={parent} style={[s.body,maxHeight===undefined?null:{maxHeight}]} onLayout={measure}>
    <KeyboardAvoidingView style={s.body} behavior={Platform.OS==='ios'?'padding':undefined} keyboardVerticalOffset={Platform.OS==='ios'?offset:0}>
      {children}
    </KeyboardAvoidingView>
  </View>;
}
const s=StyleSheet.create({body:{flex:1,minHeight:0}});
