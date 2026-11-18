import React,{useRef,useState} from 'react';
import {Text,View} from 'react-native';
import {useQuery,useQueryClient} from '@tanstack/react-query';
import * as Clipboard from 'expo-clipboard';
import {useAuth} from '@/hooks/useAuth';
import {supabase} from '@/integrations/supabase/client';
import {Button,Input,Card,CardContent,CardHeader,CardTitle} from '@/components/ui';
import {guardianRows,guardianAction,createGuardianInvitation,guardianDeliveryMessage,requestGuardianLink,guardianRequestMessage} from '@/lib/guardianInvitation';
import {colors,spacing} from '@/lib/theme';
export function GuardianManagement({athleteProfileId,parent=false}:{athleteProfileId?:string;parent?:boolean}){
 const {user}=useAuth(),qc=useQueryClient();const [email,setEmail]=useState(''),[notice,setNotice]=useState(''),[link,setLink]=useState(''),[busy,setBusy]=useState(false),lock=useRef(false);
 const key=['guardian-management',user?.id,parent?'parent':athleteProfileId];
 const q=useQuery({queryKey:key,enabled:!!user&&(parent||!!athleteProfileId),retry:false,queryFn:async()=>parent?{invitations:[],incoming:[],requests:await guardianRows(supabase,'list_my_guardian_link_requests')}:{requests:[],invitations:await guardianRows(supabase,'list_guardian_invitations',{p_athlete_profile_id:athleteProfileId}),incoming:await guardianRows(supabase,'list_incoming_guardian_link_requests',{p_athlete_profile_id:athleteProfileId})}});
 const run=async(action:()=>Promise<void>)=>{if(lock.current)return;lock.current=true;setBusy(true);setNotice('');try{await action();await qc.invalidateQueries({queryKey:key});}catch(e:any){setNotice(e.message||'Could not confirm this action. Refresh before retrying.');}finally{lock.current=false;setBusy(false);}};
 const invite=(sendEmail:boolean)=>run(async()=>{setLink('');const d=await createGuardianInvitation(supabase,athleteProfileId!,email,sendEmail);setLink(d.link);setNotice(guardianDeliveryMessage(d));});
 return <Card><CardHeader><CardTitle>{parent?'Guardian link requests':'Parents and guardians'}</CardTitle></CardHeader><CardContent style={{gap:spacing.sm}}>
 <Text style={{color:colors.mutedForeground}}>Linking requires the intended adult’s confirmed account. Linking does not grant parental consent. Consent verification is not available yet.</Text>
 <Input accessibilityLabel={parent?'Athlete email':'Guardian email'} placeholder={parent?'Athlete email':'Guardian email'} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
 {parent?<Button disabled={busy||!email.trim()} onPress={()=>run(async()=>{await requestGuardianLink(supabase,email);setNotice(guardianRequestMessage);setEmail('');})}>Request athlete confirmation</Button>:<><Button disabled={busy||!email.trim()||!athleteProfileId} onPress={()=>invite(true)}>Email new guardian invitation</Button><Button variant="outline" disabled={busy||!email.trim()||!athleteProfileId} onPress={()=>invite(false)}>Create private invitation link</Button></>}
 {link?<><Text style={{color:colors.mutedForeground}}>A private link is ready for this recipient. Creating another invitation replaces the previous link.</Text><Button variant="outline" onPress={()=>run(async()=>{await Clipboard.setStringAsync(link);setNotice('Private invitation link copied.');})}>Copy private link</Button></>:null}
 {notice?<Text accessibilityRole="alert" style={{color:colors.foreground}}>{notice}</Text>:null}
 {q.isPending?<Text style={{color:colors.foreground}}>Loading guardian information…</Text>:q.isError?<Text accessibilityRole="alert" style={{color:colors.destructive}}>Could not load guardian information.</Text>:<>
 {q.data?.invitations.map((r:any)=><View key={r.id} style={{gap:6}}><Text style={{color:colors.foreground}}>{r.recipient_email} — {r.state} · {r.delivery_status}</Text>{r.state==='open'?<Button variant="outline" disabled={busy} onPress={()=>run(async()=>{await guardianAction(supabase,'cancel_guardian_invitation',{p_invitation_id:r.id},'cancelled');setNotice('Invitation cancelled.');})}>Cancel invitation</Button>:null}{r.legacy||r.state==='reissue_required'?<Text style={{color:colors.mutedForeground}}>Send a new invitation using the form above.</Text>:null}</View>)}
 {q.data?.incoming.map((r:any)=><View key={r.id} style={{gap:6}}><Text style={{color:colors.foreground}}>{r.requester_name||'Guardian request'} · {r.requester_email}</Text>{[true,false].map(approve=><Button key={String(approve)} variant="outline" disabled={busy} onPress={()=>run(async()=>{await guardianAction(supabase,'respond_guardian_link_request',{p_request_id:r.id,p_approve:approve},approve?'approved':'declined');setNotice(approve?'Guardian linked. Parental consent was not granted.':'Request declined.');void qc.invalidateQueries({queryKey:['parent-athletes']});})}>{approve?'Approve guardian link':'Decline guardian request'}</Button>)}</View>)}
 {q.data?.requests.map((r:any)=><View key={r.id} style={{gap:6}}><Text style={{color:colors.foreground}}>{r.email_hint} — {r.state}</Text>{r.state==='open'?<Button variant="outline" disabled={busy} onPress={()=>run(async()=>{await guardianAction(supabase,'withdraw_guardian_link_request',{p_request_id:r.id},'withdrawn');setNotice('Request withdrawn.');})}>Withdraw request</Button>:null}</View>)}
 {!q.data?.invitations.length&&!q.data?.incoming.length&&!q.data?.requests.length?<Text style={{color:colors.mutedForeground}}>No pending guardian invitations or requests.</Text>:null}</>}
 <Button variant="outline" disabled={busy} onPress={()=>q.refetch()}>Refresh guardian information</Button>
 </CardContent></Card>;
}
