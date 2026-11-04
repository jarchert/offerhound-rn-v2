import { CampProfileVoiceNotes } from '@/components/CampProfileVoiceNotes';
import React, { useState } from 'react';
import { View, Text, Image } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { File } from 'expo-file-system';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { colors } from '@/lib/theme';
import { type NativeIdentity } from '@/lib/nativeRegistrantIdentity';
export { emptyNativeIdentity, validateNativeIdentity } from '@/lib/nativeRegistrantIdentity';
export function CampRegistrantIdentityForm({campId,requestKey,value,onChange,disabled=false}:{campId:string;requestKey:string;value:NativeIdentity;onChange:(v:NativeIdentity)=>void;disabled?:boolean}) {
 const {user}=useAuth();const [busy,setBusy]=useState(false);const [error,setError]=useState('');const [preview,setPreview]=useState('');
 const upload=async()=>{setError('');setBusy(true);try{
  const picked=await ImagePicker.launchImageLibraryAsync({mediaTypes:['images'],allowsEditing:true,aspect:[1,1],quality:0.8});
  if(picked.canceled||!picked.assets[0])return;
  const asset=picked.assets[0]; const bytes=await new File(asset.uri).arrayBuffer();
  const b=new Uint8Array(bytes); const png=b[0]===137&&b[1]===80&&b[2]===78&&b[3]===71; const jpg=b[0]===255&&b[1]===216&&b[2]===255;
  if(!user||(!png&&!jpg)||!bytes.byteLength||bytes.byteLength>5242880)throw new Error('Choose a JPG or PNG headshot up to 5 MB.');
  const path=`${campId}/${user.id}/${requestKey}.${png?'png':'jpg'}`;
  if(value.headshotPath)throw new Error('Headshot is uploaded. Submit this entry or start a new registration.');
  const result=await supabase.storage.from('camp-registrant-headshots').upload(path,bytes,{contentType:png?'image/png':'image/jpeg',upsert:false});if(result.error)throw result.error;
  setPreview(asset.uri);onChange({...value,headshotPath:path});
 }catch(e:any){setError(e.message||'Headshot upload failed.');}finally{setBusy(false);}};
 return <View style={{gap:12}}>
 <Text style={{color:colors.foreground}}>Headshot, date of birth and telephone are required. Contact details are visible to authorized camp staff.</Text>
 {preview&&value.headshotPath?<Image source={{uri:preview}} accessibilityLabel="Registrant headshot" style={{width:96,height:96,borderRadius:48}}/>:null}
 <Button onPress={upload} loading={busy} disabled={disabled||busy||!!value.headshotPath}>{value.headshotPath?'Headshot uploaded':'Upload required headshot'}</Button>
 <Input label="Date of birth * (YYYY-MM-DD)" accessibilityLabel="Date of birth" value={value.birthDate} onChangeText={birthDate=>onChange({...value,birthDate})} editable={!disabled&&!busy} maxLength={10}/>
 <Input label="Telephone *" accessibilityLabel="Registrant telephone" value={value.phone} keyboardType="phone-pad" onChangeText={phone=>onChange({...value,phone})} editable={!disabled&&!busy} maxLength={30}/>
 {error?<Text accessibilityRole="alert" style={{color:colors.destructive}}>{error}</Text>:null}
 </View>;
}
export function CampRegistrantProfile({enrollmentId}:{enrollmentId:string}) {
 const {user}=useAuth();const result=useQuery({queryKey:['native-camp-identity',enrollmentId,user?.id],enabled:!!user,queryFn:async()=>{
 const r=await (supabase.from as any)('camp_registrant_profiles').select('full_name,date_of_birth,phone,email,headshot_path').eq('enrollment_id',enrollmentId).maybeSingle();if(r.error)throw r.error;
 if(!r.data)return null;const image=await supabase.storage.from('camp-registrant-headshots').createSignedUrl(r.data.headshot_path,90);if(image.error)throw image.error;
 return {...r.data,image:image.data.signedUrl};},staleTime:60000,refetchInterval:60000});
 if(!user)return null;
 if(result.isError)return <Text style={{color:colors.destructive}}>Registrant profile unavailable.</Text>;
 if(!result.data)return result.isPending?<Text>Loading registrant profile…</Text>:<CompleteNativeRegistrant enrollmentId={enrollmentId}/>;
 const d=result.data;const birth=new Date(`${d.date_of_birth}T12:00:00`),today=new Date();let age=today.getFullYear()-birth.getFullYear();if(today.getMonth()<birth.getMonth()||(today.getMonth()===birth.getMonth()&&today.getDate()<birth.getDate()))age--;
 return <View style={{gap:8,padding:12}}><Image source={{uri:d.image}} accessibilityLabel={`${d.full_name} headshot`} style={{width:96,height:96,borderRadius:48}}/><Text style={{color:colors.foreground,fontWeight:'bold'}}>{d.full_name}</Text><Text style={{color:colors.foreground}}>Age: {age}</Text><Text style={{color:colors.foreground}}>Telephone: {d.phone}</Text><Text style={{color:colors.foreground}}>Email: {d.email}</Text></View>;
}
function CompleteNativeRegistrant({enrollmentId}:{enrollmentId:string}) {
 const cache=useQueryClient();const {user}=useAuth();const [requestKey]=useState(()=>`profile-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`);
 const [identity,setIdentity]=useState<NativeIdentity>({phone:'',birthDate:'',headshotPath:''});const [name,setName]=useState('');const [email,setEmail]=useState('');const [error,setError]=useState('');const [busy,setBusy]=useState(false);const [done,setDone]=useState(false);
 const access=useQuery({queryKey:['native-complete-camp-identity',enrollmentId,user?.id],enabled:!!user,queryFn:async()=>{
 const e=await supabase.from('camp_enrollments').select('camp_id,user_id').eq('id',enrollmentId).single();if(e.error)throw e.error;
 const allowed=await (supabase.rpc as any)('can_register_camp_guest',{p_camp_id:e.data.camp_id});return {campId:e.data.camp_id,allowed:e.data.user_id===user?.id||allowed.data===true};}});
 const save=async()=>{setBusy(true);setError('');try{const r=await (supabase.rpc as any)('register_camp_attendee',{p_camp_id:access.data?.campId,p_request_key:requestKey,p_full_name:name,p_email:email,p_phone:identity.phone,p_date_of_birth:identity.birthDate,p_headshot_path:identity.headshotPath,p_existing_enrollment_id:enrollmentId});if(r.error)throw r.error;await cache.invalidateQueries({queryKey:['native-camp-identity',enrollmentId]});setDone(true);}catch(e:any){setError(e.message||'Unable to complete registrant profile.');}finally{setBusy(false);}};
 if(done)return <CampRegistrantProfile enrollmentId={enrollmentId}/>;
 if(!access.data?.allowed)return <Text style={{color:colors.mutedForeground}}>Legacy registration: registration staff must complete the headshot and contact details.</Text>;
 return <View style={{gap:12,padding:12}}><Text style={{color:colors.foreground}}>Complete this existing registrant’s required profile.</Text><Input label="Registrant full name *" value={name} onChangeText={setName} editable={!busy}/><Input label="Registrant email *" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" editable={!busy}/><CampRegistrantIdentityForm campId={access.data.campId} requestKey={requestKey} value={identity} onChange={setIdentity} disabled={busy}/>{error?<Text accessibilityRole="alert" style={{color:colors.destructive}}>{error}</Text>:null}<Button loading={busy} onPress={save} disabled={busy||!name.trim()||!email.trim()||!identity.headshotPath}>Save registrant profile</Button></View>;
}
export function CampRegistrantProfileDisclosure({enrollmentId}:{enrollmentId:string}) {
 const [open,setOpen]=useState(false);
 return <View><Button variant="outline" onPress={()=>setOpen(!open)}>{open?'Hide athlete profile':'View athlete profile'}</Button>{open?<><CampRegistrantProfile enrollmentId={enrollmentId}/><CampProfileVoiceNotes enrollmentId={enrollmentId}/></>:null}</View>;
}
