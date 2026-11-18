import React,{useRef,useState} from 'react';
import {View,Text,ScrollView} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {useQuery,useQueryClient} from '@tanstack/react-query';
import {useAuth} from '@/hooks/useAuth';
import {supabase} from '@/integrations/supabase/client';
import {pendingClubInvitation,clearClubInvitation,previewClubInvitation,claimClubInvitation,clubInvitationClaimable,clubInvitationExplanation} from '@/lib/clubInvitation';
import {Button} from '@/components/ui/Button';
import {useHomeNavigation} from '@/navigation/HomeNavigation';
import {colors,spacing} from '@/lib/theme';
export default function ClubInvitationScreen(){
 const {user,signOut,retryRoleLookup}=useAuth(),nav=useNavigation<any>(),home=useHomeNavigation(),qc=useQueryClient();const pending=pendingClubInvitation();
 const [saving,setSaving]=useState(false),[error,setError]=useState(''),[done,setDone]=useState(false),busy=useRef(false);
 const q=useQuery({queryKey:['club-invitation-preview',user?.id,pending?.revision],enabled:!!user&&!!pending&&!done,retry:false,queryFn:()=>previewClubInvitation(supabase,pending!.token)});
 const claim=async()=>{if(busy.current||!pending||!clubInvitationClaimable(q.data))return;busy.current=true;setSaving(true);setError('');try{await claimClubInvitation(supabase,pending.token);clearClubInvitation();setDone(true);void qc.invalidateQueries({predicate:query=>query.queryKey[0]!=='club-invitation-preview'});await retryRoleLookup();}catch(e:any){setError(e.message);void q.refetch();}finally{busy.current=false;setSaving(false);}};
 return <ScrollView contentContainerStyle={{padding:spacing.lg,gap:spacing.md,backgroundColor:colors.background,flexGrow:1}}><Text style={{fontSize:24,color:colors.foreground}}>Team invitation</Text>
 {done?<><Text style={{color:colors.foreground}}>Invitation claimed. You have not joined the team or granted parental consent.</Text><Button onPress={()=>home?.goHome()}>Open Teams on Home</Button></>:!pending?<Text style={{color:colors.foreground}}>Open the latest private invitation link from your coach. Old or incomplete links cannot be claimed.</Text>:!user?<><Text style={{color:colors.foreground}}>Sign in or create an account using the invited email address, then confirm that email. This private invitation will resume after sign-in.</Text><Button onPress={()=>nav.navigate('AuthStack',{screen:'SignIn'})}>Sign in to continue</Button><Button variant="outline" onPress={()=>nav.navigate('AuthStack',{screen:'SignUp'})}>Create account</Button></>:q.isPending?<Text style={{color:colors.foreground}}>Checking invitation…</Text>:q.isError?<><Text accessibilityRole="alert" style={{color:colors.foreground}}>Could not check this invitation.</Text><Button onPress={()=>q.refetch()}>Retry invitation</Button></>:<>
 {q.data?.team_name?<Text style={{color:colors.foreground}}>Team: {q.data.team_name}</Text>:null}{q.data?.recipient_hint?<Text style={{color:colors.foreground}}>Invited email: {q.data.recipient_hint}</Text>:null}
 <Text style={{color:colors.foreground}}>{clubInvitationClaimable(q.data)?'Claiming links your account to this invitation. Accepting the roster spot is a separate choice on Home. Publication, privacy and parental consent stay unchanged.':clubInvitationExplanation(q.data)}</Text>
 {q.data?.state==='used_by_you'?<Button onPress={()=>{clearClubInvitation();home?.goHome();}}>Open Teams on Home</Button>:<Button testID="club-invitation-claim" disabled={!clubInvitationClaimable(q.data)||saving} loading={saving} onPress={claim}>Claim invitation</Button>}
 <Button variant="outline" disabled={saving} onPress={()=>q.refetch()}>Recheck invitation</Button>
 {q.data?.state==='valid'&&!q.data.email_matches?<Button variant="outline" onPress={()=>void signOut()}>Switch account</Button>:null}
 </>}
 {error?<Text accessibilityRole="alert" style={{color:colors.destructive}}>{error}</Text>:null}<Button variant="outline" disabled={saving} onPress={()=>{clearClubInvitation();home?.goHome();}}>Close invitation</Button></ScrollView>;
}
