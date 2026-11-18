import React,{useRef,useState} from 'react';
import {View,Text,ScrollView} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {useQuery,useQueryClient} from '@tanstack/react-query';
import {useAuth} from '@/hooks/useAuth';
import {supabase} from '@/integrations/supabase/client';
import {pendingGuardianInvitation,clearGuardianInvitation,previewGuardianInvitation,acceptGuardianInvitation,guardianClaimable ,guardianError} from '@/lib/guardianInvitation';
import {Button} from '@/components/ui/Button';
import {useHomeNavigation} from '@/navigation/HomeNavigation';
import {colors,spacing} from '@/lib/theme';
export default function GuardianInvitationScreen(){
 const {user,signOut,retryRoleLookup}=useAuth(),nav=useNavigation<any>(),home=useHomeNavigation(),qc=useQueryClient();const pending=pendingGuardianInvitation();
 const [saving,setSaving]=useState(false),[error,setError]=useState(''),[done,setDone]=useState(false),busy=useRef(false);
 const q=useQuery({queryKey:['guardian-invitation-preview',user?.id,pending?.revision],enabled:!!user&&!!pending&&!done,retry:false,queryFn:()=>previewGuardianInvitation(supabase,pending!.token)});
 const claim=async()=>{if(busy.current||!pending||!guardianClaimable(q.data))return;busy.current=true;setSaving(true);setError('');try{await acceptGuardianInvitation(supabase,pending.token);clearGuardianInvitation();setDone(true);void qc.invalidateQueries({predicate:query=>query.queryKey[0]!=='guardian-invitation-preview'});await retryRoleLookup();}catch(e:any){setError(e.message);void q.refetch();}finally{busy.current=false;setSaving(false);}};
 return <ScrollView contentContainerStyle={{padding:spacing.lg,gap:spacing.md,backgroundColor:colors.background,flexGrow:1}}><Text style={{fontSize:24,color:colors.foreground}}>Guardian invitation</Text>
 {done?<><Text style={{color:colors.foreground}}>Guardian linked. Parental consent was not granted.</Text><Button onPress={()=>home?.goHome()}>Open Home</Button></>:!pending?<Text style={{color:colors.foreground}}>Open the latest private guardian invitation link from the athlete. Old or incomplete links cannot be claimed.</Text>:!user?<><Text style={{color:colors.foreground}}>Sign in or create an account using the invited email address, then confirm that email. This private invitation will resume after sign-in.</Text><Button onPress={()=>nav.navigate('AuthStack',{screen:'SignIn'})}>Sign in to continue</Button><Button variant="outline" onPress={()=>nav.navigate('AuthStack',{screen:'SignUp'})}>Create account</Button></>:q.isPending?<Text style={{color:colors.foreground}}>Checking invitation…</Text>:q.isError?<><Text accessibilityRole="alert" style={{color:colors.foreground}}>Could not check this invitation.</Text><Button onPress={()=>q.refetch()}>Retry invitation</Button></>:<>
 {q.data?.athlete_first_name?<Text style={{color:colors.foreground}}>Athlete: {q.data.athlete_first_name}</Text>:null}{q.data?.recipient_hint?<Text style={{color:colors.foreground}}>Invited email: {q.data.recipient_hint}</Text>:null}
 <Text style={{color:colors.foreground}}>{guardianClaimable(q.data)?'Accept this guardian link only if you recognize the athlete. Linking does not grant parental consent.':q.data?.account_block?guardianError({message:q.data.account_block}):q.data?.state==='used_by_you'?'This account already accepted the invitation. No parental consent was granted.':q.data?.state==='valid'&&!q.data?.email_matches?'Sign in using the invited email address.':guardianError({message:q.data?.state})}</Text>
 {q.data?.state==='used_by_you'?<Button onPress={()=>{clearGuardianInvitation();home?.goHome();}}>Open Home</Button>:<Button testID="guardian-invitation-claim" disabled={!guardianClaimable(q.data)||saving} loading={saving} onPress={claim}>Accept guardian link</Button>}
 <Button variant="outline" disabled={saving} onPress={()=>q.refetch()}>Recheck invitation</Button>
 {q.data?.state==='valid'&&(!q.data.email_matches||q.data.account_block==='guardian_must_be_adult')?<Button variant="outline" disabled={saving} onPress={()=>void signOut()}>Switch account</Button>:null}
 </>}
 {error?<Text accessibilityRole="alert" style={{color:colors.destructive}}>{error}</Text>:null}<Button variant="outline" disabled={saving} onPress={()=>{clearGuardianInvitation();home?.goHome();}}>Close invitation</Button></ScrollView>;
}
