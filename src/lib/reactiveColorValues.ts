import palettes from './themePalettes.json';
import {colorResource,themeAlphas} from './adaptiveTheme';
const maps=Object.fromEntries((['light','dark'] as const).map(mode=>{const entries:any[]=[];for(const key of Object.keys(palettes[mode]) as (keyof typeof palettes.dark)[]){entries.push(['@color/'+colorResource(key),palettes[mode][key]]);for(const alpha of themeAlphas)entries.push(['@color/'+colorResource(key,alpha),palettes[mode][key]+alpha]);}return [mode,new Map(entries)];}));
/** Resolve only our native tokens. Preserve external colors and animated objects. */
export function resolveThemeValue(value:any,mode:'light'|'dark'):any {
 if(!value||typeof value!=='object')return value;
 if(Array.isArray(value))return value.map(v=>resolveThemeValue(v,mode));
 if(Array.isArray(value.resource_paths)){for(const path of value.resource_paths){const resolved=maps[mode].get(path);if(resolved)return resolved;}return value;}
 const prototype=Object.getPrototypeOf(value);if(prototype!==Object.prototype&&prototype!==null)return value;
 return Object.fromEntries(Object.entries(value).map(([k,v])=>[k,resolveThemeValue(v,mode)]));
}
export function resolveThemeProps(props:any,mode:'light'|'dark'){
 const result={...props};for(const key of Object.keys(result))if(key==='style'||key==='contentContainerStyle'||key==='columnWrapperStyle'||key==='trackColor'||/color|fill|stroke/i.test(key)){if(typeof result[key]==='function'){const fn=result[key];result[key]=(...args:any[])=>resolveThemeValue(fn(...args),mode);}else result[key]=resolveThemeValue(result[key],mode);}return result;
}
