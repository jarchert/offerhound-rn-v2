import { supabase } from '@/integrations/supabase/client';
import type { Provider } from '@supabase/supabase-js';
import * as WebBrowser from 'expo-web-browser';
export const NATIVE_OAUTH_REDIRECT = process.env.EXPO_PUBLIC_APP_ENV === 'staging'
 ? 'offerhound-staging://auth/callback' : 'offerhoundv2://auth/callback';
type Result={error:Error|null;cancelled?:boolean};
const exchanges=new Map<string,Promise<Result>>();
let browserActive=false;
export function isNativeOAuthCallback(value:string) {
 try{const url=new URL(value),expected=new URL(NATIVE_OAUTH_REDIRECT);return url.protocol===expected.protocol&&url.host===expected.host&&url.pathname===expected.pathname;}catch{return false;}
}
export async function completeNativeOAuth(value:string):Promise<Result> {
 if(!isNativeOAuthCallback(value))return {error:new Error('This sign-in callback is not for this application.')};
 const url=new URL(value);
 if(url.searchParams.has('error'))return {error:new Error('Sign-in was not completed. Please try again.')};
 const codes=url.searchParams.getAll('code');
 if(codes.length!==1||!codes[0]||url.hash)return {error:new Error('Sign-in did not return a valid authorization code.')};
 const code=codes[0];const pending=exchanges.get(code);if(pending)return pending;
 const exchange=(async()=>{try{const result=await supabase.auth.exchangeCodeForSession(code);return {error:result.error?new Error(result.error.message):null};}catch{return {error:new Error('Could not complete sign-in. Please try again.')};}})();
 exchanges.set(code,exchange);
 const result=await exchange;if(result.error)exchanges.delete(code);
 while(exchanges.size>8)exchanges.delete(exchanges.keys().next().value!);
 return result;
}
export async function openNativeOAuth(provider:Provider):Promise<Result> {
 if(browserActive)return {error:new Error('A sign-in window is already open.')};
 browserActive=true;
 try{
  const response=await supabase.auth.signInWithOAuth({provider,options:{redirectTo:NATIVE_OAUTH_REDIRECT,skipBrowserRedirect:true,...(provider==='google'?{queryParams:{prompt:'select_account'}}:{})}});
  if(response.error)return {error:new Error(response.error.message)};
  if(!response.data.url)return {error:new Error('The sign-in provider did not return a login page.')};
  const result=await WebBrowser.openAuthSessionAsync(response.data.url,NATIVE_OAUTH_REDIRECT);
  if(result.type!=='success')return {error:null,cancelled:true};
  return await completeNativeOAuth(result.url);
 }catch{return {error:new Error('Unable to open sign-in. Please try again.')};}
 finally{browserActive=false;}
}
