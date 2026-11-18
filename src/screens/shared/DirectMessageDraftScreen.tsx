import React,{useRef,useState} from 'react';
import {View,Text,TextInput,StyleSheet,ScrollView} from 'react-native';
import {useRoute,useNavigation} from '@react-navigation/native';
import {useQuery,useQueryClient} from '@tanstack/react-query';
import {useAuth} from '@/hooks/useAuth';
import {supabase} from '@/integrations/supabase/client';
import {resolveDirectMessageTarget,sendDirectMessageDraft,DirectMessageTarget} from '@/lib/directMessageDraft';
import {useLocalDraft} from '@/hooks/useLocalDraft';
import {KeyboardSafeBody} from '@/components/KeyboardSafeBody';
import {Button} from '@/components/ui/Button';
import {BackButton} from '@/components/BackButton';
import {colors,spacing,typography} from '@/lib/theme';
export default function DirectMessageDraftScreen(){
 const {user}=useAuth(),route=useRoute<any>(),nav=useNavigation<any>(),qc=useQueryClient();
 const target=route.params as DirectMessageTarget;
 const targetKey=target?.athleteProfileId?`athlete:${target.athleteProfileId}`:`user:${target?.recipientUserId}:${target?.recipientRole||''}`;
 const [draft,setDraft,draftError]=useLocalDraft(user?.id,`new-message:${targetKey}`,'');
 const [sending,setSending]=useState(false),[error,setError]=useState(''),busy=useRef(false);
 const identity=useQuery({queryKey:['direct-message-target',user?.id,targetKey],enabled:!!user&&!!target,queryFn:()=>resolveDirectMessageTarget(supabase,target,user?.id)});
 const send=async()=>{if(busy.current||!identity.data||!user||!draft.trim())return;busy.current=true;setSending(true);setError('');try{const conversationId=await sendDirectMessageDraft(supabase,identity.data,draft);setDraft('');void qc.invalidateQueries({queryKey:['messages-conversations',user.id]});nav.replace('Messages',{conversationId});}catch(e:any){setError(e.message||'Delivery was not confirmed. Check Messages before retrying.');}finally{busy.current=false;setSending(false);}};
 return <View style={s.page}><BackButton/><KeyboardSafeBody><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={s.body}>
 <Text style={s.title}>New message</Text>
 {!user?<Text style={s.text}>Sign in to write a message.</Text>:identity.isPending?<Text style={s.text}>Checking recipient…</Text>:identity.isError?<View><Text accessibilityRole="alert" style={s.text}>Recipient unavailable. No message has been sent.</Text><Button onPress={()=>identity.refetch()}>Retry recipient</Button></View>:<Text testID="direct-message-recipient" style={s.text}>To: {identity.data?.name}</Text>}
 {draftError?<Text accessibilityRole="alert" style={s.text}>{draftError}</Text>:null}
 <TextInput testID="direct-message-draft" accessibilityLabel="Message draft" multiline value={draft} onChangeText={setDraft} editable={!!identity.data&&!sending} placeholder="Write a message…" placeholderTextColor={colors.mutedForeground} style={s.input}/>
 {error?<Text accessibilityRole="alert" style={s.error}>{error}</Text>:null}
 <Button testID="direct-message-send" accessibilityLabel="Send message" disabled={!identity.data||!user||!draft.trim()||sending} loading={sending} onPress={send}>Send message</Button>
 <Text style={s.text}>Nothing is sent until you tap Send message. Messaging permissions are checked when you send.</Text>
 </ScrollView></KeyboardSafeBody></View>;
}
const s=StyleSheet.create({page:{flex:1,backgroundColor:colors.background,padding:spacing.md},body:{gap:spacing.md,paddingBottom:spacing.lg},title:{fontSize:typography.fontSize.xl,color:colors.foreground},text:{color:colors.foreground},input:{minHeight:150,borderWidth:1,borderColor:colors.border,borderRadius:8,padding:spacing.md,color:colors.foreground,textAlignVertical:'top'},error:{color:colors.destructive}});
