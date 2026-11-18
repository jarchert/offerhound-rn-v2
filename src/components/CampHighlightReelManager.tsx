// Persistent clip links use the existing backend contract; phone-local URIs are never uploads.
import React,{useState} from 'react';
import {View,Text,Alert,Linking,Share} from 'react-native';
import {useQuery,useQueryClient} from '@tanstack/react-query';
import {supabase} from '@/integrations/supabase/client';
import {useAuth} from '@/hooks/useAuth';
import {Card,CardContent} from '@/components/ui/Card';
import {Input} from '@/components/ui/Input';
import {Button} from '@/components/ui/Button';
import {safeCampClipUrl} from '@/lib/campFollowup';
import {colors} from '@/lib/theme';
export default function CampHighlightReelManager({campId,enrollmentId}:{campId:string;enrollmentId:string;athleteUserId?:string|null}) {
 const {user}=useAuth(),qc=useQueryClient();const[url,setUrl]=useState(''),[title,setTitle]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const key=['native-camp-clips',campId,enrollmentId,user?.id];
 const clips=useQuery({queryKey:key,enabled:!!user,queryFn:async()=>{const r=await supabase.from('camp_highlight_clips').select('id,clip_url,drill_name,notes').eq('camp_id',campId).eq('enrollment_id',enrollmentId).order('sort_order').order('created_at');if(r.error)throw r.error;return r.data;}});
 async function add(){setBusy(true);setError('');try{if(!user)throw Error('Sign in again to add a clip.');const clip=safeCampClipUrl(url);const e=await supabase.from('camp_enrollments').select('athlete_profile_id').eq('id',enrollmentId).eq('camp_id',campId).single();if(e.error)throw e.error;const host=new URL(clip).hostname;const r=await supabase.from('camp_highlight_clips').insert({camp_id:campId,enrollment_id:enrollmentId,athlete_profile_id:e.data.athlete_profile_id,uploaded_by_user_id:user.id,clip_url:clip,drill_name:title.trim()||null,source:host==='youtu.be'||host.endsWith('youtube.com')?'youtube':host.endsWith('hudl.com')?'hudl':'url',sort_order:clips.data?.length||0}).select('id').single();if(r.error)throw r.error;setUrl('');setTitle('');await qc.invalidateQueries({queryKey:key});}catch(e:any){if(e.code==='23505'){setUrl('');setTitle('');await qc.invalidateQueries({queryKey:key});setError('This clip is already in your list.');}else setError(e.message||'The clip was not saved. Please retry.');}finally{setBusy(false);}}
 async function openClip(value:string){try{await Linking.openURL(safeCampClipUrl(value));}catch{Alert.alert('Video unavailable','This clip needs a valid HTTPS video link. Ask the camp organizer to update it.');}}
 async function remove(id:string){setBusy(true);try{const r=await supabase.from('camp_highlight_clips').delete().eq('id',id).eq('camp_id',campId).eq('enrollment_id',enrollmentId).select('id').single();if(r.error)throw r.error;await qc.invalidateQueries({queryKey:key});}catch(e:any){setError(e.message);}finally{setBusy(false);}}
 return <Card><CardContent style={{padding:16,gap:12}}><Text style={{fontSize:20,fontWeight:'700',color:colors.foreground}}>Camp highlight clips</Text><Text style={{color:colors.mutedForeground}}>Add a playable HTTPS link from YouTube, HUDL or your video host. A video stored only on your phone is not yet shared.</Text>
 <Input label="Drill name (optional)" value={title} onChangeText={setTitle}/><Input label="Video link (required)" accessibilityLabel="Video link (required)" value={url} onChangeText={setUrl} autoCapitalize="none" keyboardType="url"/>
 <Button disabled={!url.trim()||busy||!user||clips.isError||clips.isPending} onPress={()=>void add()}>{busy?'Saving…':'Save clip link'}</Button>
 {!!error&&<Text accessibilityRole="alert" style={{color:colors.destructive}}>{error}</Text>}
 {clips.isPending?<Text style={{color:colors.mutedForeground}}>Loading clips…</Text>:clips.isError?<><Text accessibilityRole="alert" style={{color:colors.destructive}}>Clips could not load.</Text><Button onPress={()=>void clips.refetch()}>Retry clips</Button></>:!clips.data?.length?<Text style={{color:colors.mutedForeground}}>No clips have been published for this camp participant.</Text>:clips.data.map(clip=><View key={clip.id} style={{gap:8,borderTopWidth:1,borderColor:colors.border,paddingTop:12}}><Text style={{color:colors.foreground,fontWeight:'600'}}>{clip.drill_name||'Camp clip'}</Text><Button variant="outline" onPress={()=>void openClip(clip.clip_url)}>Open clip</Button><Button variant="ghost" disabled={busy} onPress={()=>Alert.alert('Remove clip?','The linked video will remain at its original host.',[{text:'Keep',style:'cancel'},{text:'Remove',style:'destructive',onPress:()=>void remove(clip.id)}])}>Remove clip link</Button></View>)}
 {!!clips.data?.length&&<Button variant="outline" onPress={()=>void Share.share({message:clips.data!.map(c=>`${c.drill_name||'Camp clip'}\n${c.clip_url}`).join('\n\n')}).catch(()=>setError('Could not share. Please retry.'))}>Share clip links</Button>}
 </CardContent></Card>;
}
