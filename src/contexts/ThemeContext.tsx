import React,{createContext,useContext,useEffect,useLayoutEffect,useRef,useState} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {Appearance,Platform} from 'react-native';
import {applyWebTheme} from '@/lib/adaptiveTheme';

type Theme='light'|'dark';
interface ThemeContextType {theme:Theme;setTheme:(theme:Theme)=>void;toggleTheme:()=>void;storageError:boolean;}
const ThemeContext=createContext<ThemeContextType|undefined>(undefined);
const STORAGE_KEY='offerhound-theme';
let writes:Promise<unknown>=Promise.resolve();
export function ThemeProvider({children}:{children:React.ReactNode}) {
  const [theme,setThemeState]=useState<Theme>('dark');
  const [storageError,setStorageError]=useState(false);
  const current=useRef<Theme>(theme),changed=useRef(false);
  current.current=theme;
  useEffect(()=>{let active=true;void AsyncStorage.getItem(STORAGE_KEY).then(value=>{
    if(active&&!changed.current&&(value==='dark'||value==='light')){current.current=value;setThemeState(value);}
  }).catch(()=>{if(active)setStorageError(true);});return()=>{active=false;};},[]);
  useLayoutEffect(()=>{
    if(Platform.OS==='web') {if(typeof document!=='undefined')applyWebTheme(theme,document.documentElement.style);}
    else Appearance.setColorScheme(theme);
  },[theme]);
  const setTheme=(next:Theme)=>{
    changed.current=true;current.current=next;setThemeState(next);
    writes=writes.catch(()=>{}).then(()=>AsyncStorage.setItem(STORAGE_KEY,next)).then(()=>setStorageError(false)).catch(()=>setStorageError(true));
  };
  const toggleTheme=()=>setTheme(current.current==='dark'?'light':'dark');
  return <ThemeContext.Provider value={{theme,setTheme,toggleTheme,storageError}}>{children}</ThemeContext.Provider>;
}
export function useTheme() {const context=useContext(ThemeContext);if(!context)throw Error('useTheme must be used within ThemeProvider');return context;}

export function useOptionalTheme(){return useContext(ThemeContext);}
