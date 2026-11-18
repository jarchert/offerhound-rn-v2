import {DynamicColorIOS,PlatformColor,Platform} from 'react-native';
import palettes from './themePalettes.json';
export type ThemeColorKey=keyof typeof palettes.dark;
export const themeAlphas=['33','40','4D','66','80','99','B3','F2'] as const;
export function colorResource(key:string,alpha='') {return `offerhound_${key.replace(/[A-Z]/g,c=>'_'+c.toLowerCase())}${alpha?'_'+alpha.toLowerCase():''}`;}
function color(key:ThemeColorKey,alpha=''):string {
  const dark=palettes.dark[key]+alpha,light=palettes.light[key]+alpha;
  if(dark===light)return dark;
  // These are native ColorValue objects. The string-facing token API remains
  // compatible with existing component props; alpha composition uses the helper.
  if(Platform.OS==='ios')return DynamicColorIOS({dark,light}) as unknown as string;
  if(Platform.OS==='android')return PlatformColor('@color/'+colorResource(key,alpha)) as unknown as string;
  return `var(--${colorResource(key,alpha)})`;
}
export function adaptiveColors():Record<ThemeColorKey,string> {return Object.fromEntries(Object.keys(palettes.dark).map(key=>[key,color(key as ThemeColorKey)])) as Record<ThemeColorKey,string>;}
export function withThemeAlpha(key:ThemeColorKey,alpha:typeof themeAlphas[number]):string {
  if(!/^#[\da-f]{6}$/i.test(palettes.dark[key])||!themeAlphas.includes(alpha))throw Error('Unsupported theme alpha token.');
  return color(key,alpha);
}
export function applyWebTheme(theme:'light'|'dark',style:{setProperty:(name:string,value:string)=>void}) {
  for(const key of Object.keys(palettes[theme]) as ThemeColorKey[]) {
    style.setProperty('--'+colorResource(key),palettes[theme][key]);
    if(/^#[\da-f]{6}$/i.test(palettes[theme][key]))for(const alpha of themeAlphas)style.setProperty('--'+colorResource(key,alpha),palettes[theme][key]+alpha);
  }
  style.setProperty('color-scheme',theme);
}
export function resolvedPalette(theme:'light'|'dark') {return palettes[theme];}
export function resolvedGradients(theme:'light'|'dark') {const p=palettes[theme];return{dark:[p.background,p.backgroundDark] as [string,string],card:[p.cardHigh,p.cardLow] as [string,string]};}
