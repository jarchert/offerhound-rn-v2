import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Alert, Share, Linking, useWindowDimensions } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Button } from '@/components/ui/Button';
import { supabase } from '@/integrations/supabase/client';
import { campEventUrl, campQRVector, campQRPDF, campQRFilename } from '@/lib/campEventQR';
import { colors } from '@/lib/theme';
export function CampRegistrationQR({campId,actorId}:{campId:string;actorId?:string}) {
 const [state,setState]=useState<any>(null),[busy,setBusy]=useState(false),[url,setUrl]=useState(''),[error,setError]=useState(''),[reload,setReload]=useState(0);
 const {width}=useWindowDimensions();const qrSize=Math.min(240,Math.max(96,width-160));
 const qr=useRef<any>(null);
 useEffect(()=>{let active=true;setState(null);setUrl('');setError('');void (async()=>{try{const r=await (supabase.rpc as any)('camp_event_qr_status',{p_camp_id:campId});if(!active)return;if(r.error){setError('Camp QR could not load.');return;}setState(r.data);try{setUrl(campEventUrl(campId));}catch(e:any){setError(e.message);}}catch(e:any){if(active)setError('Camp QR could not load. Check your connection and retry.');}})();return()=>{active=false;};},[campId,actorId,reload]);
 async function publish(){setBusy(true);try{const r=await (supabase.rpc as any)('set_camp_event_qr',{p_camp_id:campId,p_published:!state.published});if(r.error)throw r.error;setState(r.data);}catch(e:any){Alert.alert('Camp QR unavailable',e.message);}finally{setBusy(false);}}
 async function download(format:'png'|'svg'|'pdf') {setBusy(true);try{
  if(!await Sharing.isAvailableAsync())throw Error('File sharing is unavailable on this device.');
  const file=new File(Paths.cache,campQRFilename(state.camp_name,campId)+'.'+format);
  if(format==='png'){const base64=await new Promise<string>((resolve,reject)=>{if(!qr.current)return reject(Error('QR is still loading.'));const timer=setTimeout(()=>reject(Error('QR export timed out. Please retry.')),10000);qr.current.toDataURL((value:string)=>{clearTimeout(timer);resolve(value);},{width:1024,height:1024});});file.write(base64,{encoding:'base64'});}
  else file.write(format==='svg'?campQRVector(url).svg:campQRPDF(url,state.camp_name));
  await Sharing.shareAsync(file.uri,{mimeType:format==='png'?'image/png':format==='svg'?'image/svg+xml':'application/pdf',UTI:format==='pdf'?'com.adobe.pdf':format==='png'?'public.png':'public.svg-image',dialogTitle:'Save or publish camp QR'});
 }catch(e:any){Alert.alert('QR export unavailable',e.message);}finally{setBusy(false);}}
 if(!state)return error?<View style={{padding:16,gap:12}}><Text accessibilityRole="alert" style={{color:colors.destructive}}>{error}</Text><Button variant="outline" onPress={()=>setReload(x=>x+1)}>Retry camp QR</Button></View>:<Text style={{color:colors.mutedForeground}}>Loading camp registration options…</Text>;
 if(!state.published&&!state.can_manage)return null;
 return <View style={{gap:12,padding:16,borderWidth:1,borderColor:colors.border,borderRadius:14,marginVertical:12}}>
 <Text style={{fontSize:20,fontWeight:'700',color:colors.foreground}}>Camp registration QR</Text>
 <Text style={{fontWeight:'600',color:colors.foreground}}>{state.camp_name}</Text>
 <Text style={{color:colors.mutedForeground}}>Adults or parents/guardians scan to register and sign one waiver. No account required.</Text>
 {state.published&&url?<><View style={{alignSelf:'center',padding:16,backgroundColor:'white'}}><QRCode value={url} size={qrSize} quietZone={24} ecl="H" getRef={(value:any)=>{qr.current=value;}}/></View>
 <Text style={{color:colors.mutedForeground}}>Published on this camp event in web and mobile. The printed link stays the same while registration is open.</Text>
 {(['png','svg','pdf'] as const).map(format=><Button key={format} variant="outline" disabled={busy} onPress={()=>void download(format)}>Save {format.toUpperCase()}{format==='pdf'?' / print':''}</Button>)}
 <Button variant="outline" onPress={()=>void Linking.openURL(url).catch(()=>Alert.alert('Registration unavailable','Check your connection and try again.'))}>Open registration & consent</Button>
 <Button variant="outline" onPress={()=>void Share.share({message:url}).catch(()=>Alert.alert('Link not shared','Please try again.'))}>Share camp registration link</Button></>:null}
 {state.can_manage&&<Button variant="outline" disabled={busy||!url} onPress={()=>void publish()}>{state.published?'Unpublish camp QR':'Generate & publish camp QR'}</Button>}
 {!!error&&<Text accessibilityRole="alert" style={{color:colors.mutedForeground}}>{error}</Text>}
 </View>;
}
