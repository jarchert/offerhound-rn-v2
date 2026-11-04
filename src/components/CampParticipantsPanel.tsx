import React, { useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { CampRegistrantProfileDisclosure } from '@/components/CampRegistrantIdentity';
import { colors, spacing } from '@/lib/theme';
const PAGE_SIZE=50;
export function CampParticipantsPanel({campId,campName}:{campId:string;campName:string}) {
 const {user}=useAuth();const navigation=useNavigation<any>();const [filter,setFilter]=useState('all');const [page,setPage]=useState(0);
 useEffect(()=>{setFilter('all');setPage(0);},[campId,user?.id]);
 const access=useQuery({queryKey:['native-camp-participant-access',campId,user?.id],enabled:!!user,refetchInterval:30000,queryFn:async()=>{
  const [registration,evaluation]=await Promise.all([(supabase.rpc as any)('can_register_camp_guest',{p_camp_id:campId}),(supabase.rpc as any)('can_evaluate_camp',{p_camp_id:campId})]);
  if(registration.error||evaluation.error)throw registration.error||evaluation.error;
  return {registration:registration.data===true,evaluation:evaluation.data===true};
 }});
 const allowed=!!user&&!access.isError&&(access.data?.registration||access.data?.evaluation)===true;
 const roster=useQuery({queryKey:['native-camp-participants',campId,user?.id,filter,page],enabled:allowed,refetchInterval:15000,queryFn:async()=>{
  let query=supabase.from('camp_enrollments').select('id,guest_name,jersey_number,position_group,status',{count:'exact'}).eq('camp_id',campId).neq('status','cancelled');
  if(filter!=='all')query=query.eq('status',filter);
  const result=await query.order('created_at',{ascending:true}).order('id').range(page*PAGE_SIZE,(page+1)*PAGE_SIZE-1);if(result.error)throw result.error;
  const rows=result.data||[];let names:Record<string,string>={};
  if(rows.length){const identities=await (supabase.from as any)('camp_registrant_profiles').select('enrollment_id,full_name').in('enrollment_id',rows.map(row=>row.id));if(identities.error)throw identities.error;names=Object.fromEntries((identities.data||[]).map((p:any)=>[p.enrollment_id,p.full_name]));}
  return {rows:rows.map(row=>({...row,fullName:names[row.id]||row.guest_name||`Athlete ${row.id.slice(0,8)}`})),total:result.count||0};
 }});
 if(!user)return null;
 if(access.isError)return <View><Text style={{color:colors.destructive}}>Camp staff access could not be checked.</Text><Button onPress={()=>{void access.refetch();}}>Retry staff access</Button></View>;
 if(!allowed)return access.isPending?<Text style={{color:colors.mutedForeground}}>Checking camp staff access…</Text>:null;
 return <Card><CardHeader><CardTitle>Participants &amp; registered athletes</CardTitle><CardDescription>{campName}</CardDescription></CardHeader><CardContent style={{gap:spacing.md}}>
 <View style={{flexDirection:'row',flexWrap:'wrap',gap:spacing.sm}}>
 {access.data?.registration&&<Button testID="camp-open-checkin" onPress={()=>navigation.navigate('CampMobileCheckin',{campId})}>Check in / walk-up registration</Button>}
 {access.data?.evaluation&&<Button testID="camp-open-evaluation" variant="outline" onPress={()=>navigation.navigate('CampEvaluatorScoring',{campId})}>Evaluate athletes</Button>}
 </View>
 <View style={{flexDirection:'row',flexWrap:'wrap',gap:spacing.sm}}>{[['all','All participants'],['registered','Registered'],['checked_in','Checked in']].map(([value,label])=><Button key={value} variant={filter===value?'default':'outline'} size="sm" onPress={()=>{setFilter(value);setPage(0);}}>{label}</Button>)}</View>
 {roster.isPending?<Text style={{color:colors.foreground}}>Loading participants…</Text>:roster.isError?<View><Text style={{color:colors.destructive}}>Participants could not be loaded.</Text><Button onPress={()=>{void roster.refetch();}}>Retry participants</Button></View>:<>
 <Text testID="camp-participants-count" style={{color:colors.foreground}}>{roster.data?.total||0} {filter==='all'?'currently enrolled participants':filter==='registered'?'registered athletes':'checked-in athletes'}</Text>
 {roster.data?.rows.length===0&&<Text style={{color:colors.mutedForeground}}>No athletes match this view.</Text>}
 {roster.data?.rows.map(row=><View key={row.id} testID={`camp-participant-${row.jersey_number||row.id}`} style={{gap:8,padding:12,borderWidth:1,borderColor:colors.border,borderRadius:8}}><Text style={{color:colors.foreground,fontWeight:'bold'}}>{row.fullName}{row.jersey_number?` · #${row.jersey_number}`:''}</Text><Text style={{color:colors.mutedForeground}}>{[row.position_group,row.status==='checked_in'?'Checked in':row.status.replace(/_/g,' ')].filter(Boolean).join(' · ')}</Text><CampRegistrantProfileDisclosure enrollmentId={row.id}/></View>)}
 <View style={{flexDirection:'row',gap:spacing.sm}}><Button variant="outline" disabled={page===0} onPress={()=>setPage(p=>Math.max(0,p-1))}>Previous participants</Button><Button variant="outline" disabled={(page+1)*PAGE_SIZE>=(roster.data?.total||0)} onPress={()=>setPage(p=>p+1)}>Next participants</Button></View>
 <Button variant="ghost" onPress={()=>{void roster.refetch();}}>Refresh participants</Button>
 </>}
 </CardContent></Card>;
}
