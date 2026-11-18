import React from 'react';
import {View,Text,Alert,Linking} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import {useMutation,useQueryClient} from '@tanstack/react-query';
import {useInfluencerGallery,useUploadInfluencerMedia} from '@/hooks/useInfluencerContent';
import {useLocalDraft} from '@/hooks/useLocalDraft';
import {useAuth} from '@/hooks/useAuth';
import {supabase} from '@/integrations/supabase/client';
import {updateCreatorGallery,deleteCreatorGallery,moveCreatorGallery} from '@/lib/creatorGallery';
import {CreatorGalleryImage} from '@/components/influencer/CreatorGalleryImage';
import {Button} from '@/components/ui/Button';
import {Input} from '@/components/ui/Input';
import {Textarea} from '@/components/ui/Textarea';
import {Card} from '@/components/ui/Card';
import {creatorContentUrl} from '@/lib/creatorSchedule';
import {colors,spacing} from '@/lib/theme';

export function CreatorGallery({influencerId}:{influencerId:string}){
 const gallery=useInfluencerGallery(influencerId),upload=useUploadInfluencerMedia();
 const {user}=useAuth();const cache=useQueryClient();const [editing,setEditing,draftStorageError]=useLocalDraft<{id:string;title:string;description:string}|null>(user?.id,`creator-gallery:${influencerId}`,null);
 const refresh=()=>void cache.invalidateQueries({queryKey:['influencer-gallery',influencerId]});
 const change=useMutation({mutationFn:async(input:any)=>{
  if(!user)throw new Error('Sign in to manage your gallery.');
  const scope={userId:user.id,influencerId,id:input.id};
  if(input.action==='delete')return deleteCreatorGallery(supabase,scope);
  if(input.action==='move'){await moveCreatorGallery(supabase,user.id,influencerId,gallery.data||[],input.from,input.to);return {};}
  await updateCreatorGallery(supabase,{...scope,...input.fields});return {};
 },onSuccess:(result:any,input:any)=>{refresh();if(input.action==='edit')setEditing(previous=>previous&&previous.id===input.id&&previous.title===input.fields.title&&previous.description===input.fields.description?null:previous);if(result.cleanupPending)Alert.alert('Removed from gallery','File cleanup could not be confirmed.');else if(result.referenced)Alert.alert('Removed from gallery','The file was kept because another gallery item still uses it.');},onError:(error:any)=>{refresh();Alert.alert('Gallery change',error.message||'Change was not confirmed.');}});
 const busy=upload.isPending||change.isPending;
 const pick=async()=>{try{
  const permission=await ImagePicker.requestMediaLibraryPermissionsAsync();if(!permission.granted)throw new Error('Allow photo access to choose media.');
  const selection=await ImagePicker.launchImageLibraryAsync({mediaTypes:['images','videos'],quality:1});if(selection.canceled||!selection.assets?.length)return;
  const asset=selection.assets[0];const max=asset.type==='video'?50:10;
  if(asset.fileSize && asset.fileSize>max*1024*1024)throw new Error(`Choose a file under ${max}MB.`);
  await upload.mutateAsync({influencerId,file:{uri:asset.uri,name:asset.fileName||'gallery-media',type:asset.mimeType||(asset.type==='video'?'video/mp4':'image/jpeg')} as any,title:(asset.fileName||'Gallery media').slice(0,200)});
  Alert.alert('Added to gallery','Your media record was confirmed.');
 }catch(error:any){refresh();Alert.alert('Gallery upload',error?.message||'Upload was not confirmed.');}};
 const confirmDelete=(item:any)=>Alert.alert('Remove this gallery item?',item.title||'This removes the item from your creator gallery.',[{text:'Cancel',style:'cancel'},{text:'Remove',style:'destructive',onPress:()=>change.mutate({action:'delete',id:item.id})}]);
 if(gallery.isLoading)return <Text>Loading your gallery…</Text>;
 if(gallery.isError)return <Button onPress={()=>void gallery.refetch()}>Could not load your gallery. Retry</Button>;
 return <View style={{gap:spacing.md}}>{draftStorageError?<Text accessibilityRole="alert">Could not save this edit on your device. Keep this page open until it is saved.</Text>:null}<Text style={{color:colors.mutedForeground}}>Gallery media appears on your creator profile. Choose only media you intend to display there.</Text><Button disabled={busy||!!editing} onPress={()=>void pick()}>{upload.isPending?'Uploading…':'Add gallery media'}</Button>{!gallery.data?.length?<Text style={{color:colors.mutedForeground}}>No gallery media yet.</Text>:gallery.data.map((item:any,index:number)=>{
  let uri:string|null=null;try{uri=creatorContentUrl(item.file_url)||null;}catch{}
  return <Card key={item.id} style={{padding:spacing.md,gap:spacing.sm}}><Text style={{color:colors.foreground}}>{item.title||'Gallery media'}{item.is_featured?' · Featured':''}</Text>{uri&&item.file_type==='image'?<CreatorGalleryImage uri={uri} title={item.title} isWatermarked={item.is_watermarked} style={{height:200,width:'100%'}}/>:null}{uri&&item.file_type==='video'?<Button onPress={()=>void Linking.openURL(uri!).catch(()=>Alert.alert('Video unavailable','Could not open this video.'))}>Open gallery video</Button>:null}{!uri?<Text>Media unavailable.</Text>:null}
   {editing && editing.id===item.id?<View style={{gap:spacing.sm}}><Input label="Title" editable={!busy} maxLength={200} value={editing.title} onChangeText={title=>setEditing(previous=>previous?{...previous,title}:previous)}/><Textarea label="Description" editable={!busy} maxLength={2000} value={editing.description} onChangeText={description=>setEditing(previous=>previous?{...previous,description}:previous)}/><Button disabled={busy} onPress={()=>change.mutate({action:'edit',id:item.id,fields:{title:editing.title,description:editing.description}})}>Save gallery details</Button><Button variant="outline" disabled={busy} onPress={()=>Alert.alert('Discard these gallery edits?','These changes have not been saved.',[{text:'Keep editing',style:'cancel'},{text:'Discard',style:'destructive',onPress:()=>setEditing(null)}])}>Cancel editing</Button></View>:<View style={{gap:spacing.sm}}><Text style={{color:colors.mutedForeground}}>{item.description}</Text><Button variant="outline" disabled={busy||!!editing} onPress={()=>setEditing({id:item.id,title:item.title||'',description:item.description||''})}>Edit gallery details</Button><Button variant="outline" disabled={busy||!!editing} onPress={()=>change.mutate({action:'feature',id:item.id,fields:{isFeatured:!item.is_featured}})}>{item.is_featured?'Unfeature':'Feature'}</Button><View style={{flexDirection:'row',gap:spacing.sm}}><Button variant="outline" disabled={busy||!!editing||index===0||!!gallery.data?.[index-1]?.is_featured!==!!item.is_featured} onPress={()=>change.mutate({action:'move',from:index,to:index-1})}>Move earlier</Button><Button variant="outline" disabled={busy||!!editing||index===(gallery.data?.length||0)-1||!!gallery.data?.[index+1]?.is_featured!==!!item.is_featured} onPress={()=>change.mutate({action:'move',from:index,to:index+1})}>Move later</Button></View><Button variant="outline" disabled={busy||!!editing} onPress={()=>confirmDelete(item)}>Remove gallery item</Button></View>}
  </Card>;
 })}</View>;
}
