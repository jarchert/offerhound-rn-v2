import React from 'react';
import {Text,View,Alert} from 'react-native';
import {useMutation,useQuery,useQueryClient} from '@tanstack/react-query';
import {supabase} from '@/integrations/supabase/client';
import {useAuth} from '@/hooks/useAuth';
import {acceptAgencyInvitation} from '@/lib/agencyInvitations';
import {Card,CardContent,CardHeader,CardTitle} from '@/components/ui/Card';
import {Button} from '@/components/ui/Button';
import {colors,spacing} from '@/lib/theme';
export function AgencyInvitationsCard(){
 const {user}=useAuth();const cache=useQueryClient();
 const invites=useQuery({queryKey:['my-agency-invitations',user?.id],enabled:!!user,queryFn:async()=>{
  const result=await supabase.from('organization_members').select('id,organization_id,role,scout_organizations(name)')
   .eq('user_id',user!.id).eq('invitation_accepted',false).order('id');
  if(result.error)throw result.error;return result.data||[];
 }});
 const accept=useMutation({mutationFn:(id:string)=>acceptAgencyInvitation(supabase,user?.id||'',id),onSuccess:()=>{
  void cache.invalidateQueries({queryKey:['my-agency-invitations']});
  void cache.invalidateQueries({queryKey:['scout-organization']});
  Alert.alert('Invitation accepted','Your membership is confirmed. Return Home to load your agency workspace.');
 },onError:(error:any)=>Alert.alert('Could not accept invitation',error.message)});
 if(!user||(!invites.isLoading&&!invites.isError&&!invites.data?.length))return null;
 return <Card><CardHeader><CardTitle>Agency invitations</CardTitle></CardHeader><CardContent>
 {invites.isLoading?<Text>Loading invitations…</Text>:invites.isError?<Button onPress={()=>void invites.refetch()}>Could not load invitations. Retry</Button>:invites.data?.map((invite:any)=><View key={invite.id} style={{gap:spacing.sm,paddingVertical:spacing.sm}}>
  <Text style={{color:colors.foreground}}>{invite.scout_organizations?.name||'Agency name unavailable'} · {String(invite.role).replace(/_/g,' ')}</Text>
  <Button disabled={accept.isPending||!invite.scout_organizations?.name} onPress={()=>Alert.alert('Join this agency?',invite.scout_organizations.name,[{text:'Cancel',style:'cancel'},{text:'Accept',onPress:()=>accept.mutate(invite.id)}])}>Accept invitation</Button>
 </View>)}
 </CardContent></Card>;
}
