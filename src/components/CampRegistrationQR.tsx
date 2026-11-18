import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Alert, Share, Linking, useWindowDimensions } from 'react-native';
import {SvgXml} from 'react-native-svg';
import * as Print from 'expo-print';
import {campFlyer,campFlyerHTML} from '@/lib/campFlyer';
import { Directory, File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Button } from '@/components/ui/Button';
import { supabase } from '@/integrations/supabase/client';
import { campEventUrl, campQRFilename } from '@/lib/campEventQR';
import { colors } from '@/lib/theme';
export function CampRegistrationQR({campId,actorId,description}:{campId:string;actorId?:string;description?:string}) {
 const [state,setState]=useState<any>(null),[busy,setBusy]=useState(false),[url,setUrl]=useState(''),[error,setError]=useState(''),[reload,setReload]=useState(0);
 const {width}=useWindowDimensions();const qrSize=Math.min(240,Math.max(96,width-160));
 const qr=useRef<any>(null);
 useEffect(()=>{let active=true;setState(null);setUrl('');setError('');void (async()=>{try{const r=await (supabase.rpc as any)('camp_event_qr_status',{p_camp_id:campId});if(!active)return;if(r.error){setError('Camp QR could not load.');return;}setState(r.data);try{setUrl(campEventUrl(campId));}catch(e:any){setError(e.message);}}catch(e:any){if(active)setError('Camp QR could not load. Check your connection and retry.');}})();return()=>{active=false;};},[campId,actorId,reload]);
 async function publish(){setBusy(true);try{const r=await (supabase.rpc as any)('set_camp_event_qr',{p_camp_id:campId,p_published:!state.published});if(r.error)throw r.error;setState(r.data);}catch(e:any){Alert.alert('Camp QR unavailable',e.message);}finally{setBusy(false);}}
 const flyer=state&&url?campFlyer(url,state.camp_name,description):null;
 async function download(format:'png'|'svg'|'pdf',destination:'save'|'share') {setBusy(true);try{
  if(!flyer)throw Error('Camp flyer is still loading.');
  const folder=destination==='save'?await Directory.pickDirectoryAsync():null;
  const mimeType=format==='png'?'image/png':format==='svg'?'image/svg+xml':'application/pdf';
  if(destination==='share'&&!await Sharing.isAvailableAsync())throw Error('File sharing is unavailable on this device.');
  const file=new File(Paths.cache,campQRFilename(state.camp_name,campId)+'-'+Date.now()+'.'+format);
  if(format==='png'){const base64=await new Promise<string>((resolve,reject)=>{if(!qr.current)return reject(Error('QR is still loading.'));const timer=setTimeout(()=>reject(Error('QR export timed out. Please retry.')),10000);qr.current.toDataURL((value:string)=>{clearTimeout(timer);resolve(value);},{width:flyer.width,height:flyer.height});});file.write(base64,{encoding:'base64'});}
  else if(format==='svg')file.write(flyer.svg);
  else {const printed=await Print.printToFileAsync({html:campFlyerHTML(flyer),width:612,height:Math.ceil(flyer.height*612/flyer.width)});new File(printed.uri).copy(file);}
  if(folder){const bytes=file.bytesSync();const saved=folder.createFile(file.name,mimeType);saved.write(bytes);Alert.alert('Camp flyer saved','Saved to your selected folder.');return;}
  await Sharing.shareAsync(file.uri,{mimeType,UTI:format==='pdf'?'com.adobe.pdf':format==='png'?'public.png':'public.svg-image',dialogTitle:'Save or publish camp QR'});
 }catch(e:any){if(!/picker.*cancel|picking.*cancel/i.test(e.message||''))Alert.alert('QR export unavailable',e.message);}finally{setBusy(false);}}
 if(!state)return error?<View style={{padding:16,gap:12}}><Text accessibilityRole="alert" style={{color:colors.destructive}}>{error}</Text><Button variant="outline" onPress={()=>setReload(x=>x+1)}>Retry camp QR</Button></View>:<Text style={{color:colors.mutedForeground}}>Loading camp registration options…</Text>;
 if(!state.published&&!state.can_manage)return null;
 return <View style={{gap:12,padding:16,borderWidth:1,borderColor:colors.border,borderRadius:14,marginVertical:12}}>
 <Text style={{fontSize:20,fontWeight:'700',color:colors.foreground}}>Camp registration QR</Text>
 <Text style={{fontWeight:'600',color:colors.foreground}}>{state.camp_name}</Text>
 <Text style={{color:colors.mutedForeground}}>Adults or parents/guardians scan to register and sign one waiver. No account required.</Text>
 {state.published&&url?<><View style={{alignSelf:'center',backgroundColor:'white'}}>{flyer&&<SvgXml xml={flyer.svg} override={{width:qrSize,height:qrSize*flyer.height/flyer.width,ref:(value:any)=>{qr.current=value;}}}/>}</View>
 <Text style={{color:colors.mutedForeground}}>Published on this camp event in web and mobile. The printed link stays the same while registration is open.</Text>
 {(['png','svg','pdf'] as const).map(format=><View key={format} style={{gap:8}}><Button variant="outline" disabled={busy} onPress={()=>void download(format,'save')}>Save {format.toUpperCase()} to folder</Button><Button variant="outline" disabled={busy} onPress={()=>void download(format,'share')}>Share {format.toUpperCase()}{format==='pdf'?' / print':''}</Button></View>)}
 <Button variant="outline" onPress={()=>void Linking.openURL(url).catch(()=>Alert.alert('Registration unavailable','Check your connection and try again.'))}>Open registration & consent</Button>
 <Button variant="outline" onPress={()=>void Share.share({message:url}).catch(()=>Alert.alert('Link not shared','Please try again.'))}>Share camp registration link</Button></>:null}
 {state.can_manage&&<Button variant="outline" disabled={busy||!url} onPress={()=>void publish()}>{state.published?'Unpublish camp QR':'Generate & publish camp QR'}</Button>}
 {!!error&&<Text accessibilityRole="alert" style={{color:colors.mutedForeground}}>{error}</Text>}
 </View>;
}
