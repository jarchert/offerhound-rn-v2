import React from 'react';
import {View,Text} from 'react-native';
import {useQuery} from '@tanstack/react-query';
import {supabase} from '@/integrations/supabase/client';
import {useAuth} from '@/hooks/useAuth';
import {Card,CardHeader,CardTitle,CardContent} from '@/components/ui/Card';
import {Button} from '@/components/ui/Button';
import {colors,spacing} from '@/lib/theme';

export interface OrganizationMemberManagerProps {organizationId?:string;}
/** Reads only memberships visible under existing RLS; never grants or accepts membership. */
export function OrganizationMemberManager({organizationId}:OrganizationMemberManagerProps){
 const {user}=useAuth();
 const members=useQuery({queryKey:['organization-visible-members',user?.id,organizationId],enabled:!!user&&!!organizationId,queryFn:async()=>{
  if(!user||!organizationId)return [];
  const rows:any[]=[];
  for(let offset=0;;offset+=100){const result=await supabase.from('organization_members').select('id,user_id,role,invitation_accepted').eq('organization_id',organizationId).order('id').range(offset,offset+99);if(result.error)throw result.error;rows.push(...(result.data||[]));if((result.data||[]).length<100)break;}
  const names=new Map<string,string>();const ids=[...new Set(rows.map(row=>row.user_id).filter(Boolean))];
  for(let index=0;index<ids.length;index+=100){const result=await supabase.from('scout_profiles').select('user_id,name').in('user_id',ids.slice(index,index+100));if(result.error)throw result.error;for(const row of result.data||[])if(row.name)names.set(row.user_id,row.name);}
  return rows.map(row=>({...row,name:names.get(row.user_id)||'Member name unavailable'}));
 }});
 if(!organizationId)return <Text style={{color:colors.mutedForeground}}>No organization selected.</Text>;
 return <Card><CardHeader><CardTitle>Team members</CardTitle></CardHeader><CardContent>{members.isLoading?<Text>Loading memberships…</Text>:members.isError?<Button onPress={()=>void members.refetch()}>Could not load memberships. Retry</Button>:!members.data?.length?<Text style={{color:colors.mutedForeground}}>No recorded memberships are visible to your account.</Text>:members.data.map((member:any)=><View key={member.id} style={{gap:spacing.xs,paddingVertical:spacing.sm}}><Text style={{color:colors.foreground}}>{member.name}</Text><Text style={{color:colors.mutedForeground}}>{String(member.role||'member').replace(/_/g,' ')} · {member.invitation_accepted?'Accepted':'Invitation pending'}</Text></View>)}</CardContent></Card>;
}
export default OrganizationMemberManager;
