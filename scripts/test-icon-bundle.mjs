// Type checks do not detect missing JavaScript exports in dependencies.
import{build}from'esbuild';
await build({stdin:{contents:"import {Star, Check, ArrowLeft, Camera} from 'lucide-react-native';export {Star, Check, ArrowLeft, Camera};",resolveDir:process.cwd(),loader:'tsx'},bundle:true,platform:'browser',format:'esm',write:false,alias:{'react-native':'react-native-web'},loader:{'.js':'jsx'},resolveExtensions:['.web.tsx','.web.ts','.web.js','.tsx','.ts','.js','.mjs','.json'],define:{'process.env.NODE_ENV':'"production"',__DEV__:'false'}});
console.log('Native icon JavaScript export/bundle check PASS (actual installed package; no icon mocks).');
