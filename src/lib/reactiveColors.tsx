import React from 'react';
import {Platform} from 'react-native';
import {useOptionalTheme} from '@/contexts/ThemeContext';
import {resolveThemeProps} from './reactiveColorValues';
/** Stable wrapper types update native color props; children keep their state and refs. */
export function withReactiveColors<T>(Component:T):T {
 if(Platform.OS!=='android')return Component;
 const Wrapped=React.forwardRef<any,any>((props,ref)=>{const mode=useOptionalTheme()?.theme||'dark';return React.createElement(Component as any,{...resolveThemeProps(props,mode),ref});});
 Wrapped.displayName='ReactiveColors';return Wrapped as unknown as T;
}
export function withReactiveAnimated<T extends Record<string,any>>(animated:T):T{return {...animated,View:withReactiveColors(animated.View),Text:withReactiveColors(animated.Text),ScrollView:withReactiveColors(animated.ScrollView),Image:withReactiveColors(animated.Image),FlatList:withReactiveColors(animated.FlatList)};}
