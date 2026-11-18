import React,{useState} from 'react';
import {View,Text,Alert} from 'react-native';
import {useQuery,useMutation,useQueryClient} from '@tanstack/react-query';
import {useAuth} from '@/hooks/useAuth';
import {useAdminRole} from '@/hooks/useAdminRole';
import {supabase} from '@/integrations/supabase/client';
import {Button} from '@/components/ui/Button';
import {Card,CardHeader,CardTitle,CardContent} from '@/components/ui/Card';
import {creatorAuditConfirms,readCreatorReviewHistory,updateAdminCreatorReview,type CreatorReviewAction} from '@/lib/adminCreatorReview';
import {toast} from '@/components/ui/toast';
import {colors,spacing} from '@/lib/theme';
const labels:Record<CreatorReviewAction,string>={verify:'Verify',reject:'Reject verification',show:'Show on board',hide:'Hide from board',suspend:'Suspend',lift:'Lift suspension and keep hidden'};
export function AdminCreatorReview(){
 const {user}=useAuth();const {isAdmin,loading}=useAdminRole();const cache=useQueryClient();
 const query=useQuery({queryKey:['admin-creator-review',user?.id],enabled:isAdmin&&!loading,queryFn:async()=>{
  const all:any[]=[];for(let offset=0;;offset+=100){const r=await supabase.from('influencer_profiles').select('id,user_id,display_name,handle,verification_status,board_visibility').order('display_name').order('id').range(offset,offset+99);if(r.error)throw r.error;all.push(...(r.data||[]));if((r.data||[]).length<100)break;}return all;
 }});
 const review=useMutation({mutationFn:async({creator,action}:{creator:any;action:CreatorReviewAction})=>{
  let previous:Set<string>|null=null;try{previous=new Set((await readCreatorReviewHistory(supabase,creator.id,creator.user_id)).map((row:any)=>row.id));}catch{}
  await updateAdminCreatorReview(supabase,creator.id,action);
  try{const rows=await readCreatorReviewHistory(supabase,creator.id,creator.user_id);return !!previous&&creatorAuditConfirms(rows.filter((row:any)=>!previous!.has(row.id)),creator.id,creator.user_id,user?.id||'',action);}catch{return false;}
 },onSuccess:(audit)=>{void cache.invalidateQueries({queryKey:['admin-creator-review']});void cache.invalidateQueries({queryKey:['admin-creator-history']});if(audit)toast.success('Creator review saved and recorded in the audit log');else toast.error('Creator review saved; audit read-back was not confirmed. Check History before retrying.');},onError:(error:any)=>toast.error(error.message||'Creator review was not confirmed.')});
 const confirm=(creator:any,action:CreatorReviewAction)=>Alert.alert(`${labels[action]}?`,`${creator.display_name || creator.handle}. This changes the creator profile's review status.`,[{text:'Cancel',style:'cancel'},{text:'Confirm',onPress:()=>review.mutate({creator,action})}]);
 if(loading)return <Text>Checking creator review access…</Text>;if(!isAdmin)return <Text>Admins only</Text>;
 return <Card><CardHeader><CardTitle>Creator review</CardTitle></CardHeader><CardContent>
  {query.isLoading?<Text>Loading creators…</Text>:query.isError?<Button onPress={()=>void query.refetch()}>Could not load creators. Retry</Button>:!query.data?.length?<Text>No creator profiles to review.</Text>:query.data.map(creator=><View key={creator.id} style={{gap:spacing.sm,paddingVertical:spacing.md}}><Text style={{color:colors.foreground}}>{creator.display_name} · @{creator.handle}</Text><Text style={{color:colors.mutedForeground}}>{creator.verification_status} · {creator.board_visibility}</Text><View style={{flexDirection:'row',flexWrap:'wrap',gap:spacing.sm}}>{(Object.keys(labels) as CreatorReviewAction[]).filter(action=>action!=='lift'||creator.board_visibility==='suspended').map(action=><Button key={action} size="sm" variant="outline" disabled={review.isPending} onPress={()=>confirm(creator,action)}>{labels[action]}</Button>)}</View><CreatorReviewHistory creator={creator}/></View>)}
 </CardContent></Card>;
}

function CreatorReviewHistory({creator}:{creator:any}){
 const [open,setOpen]=useState(false);const history=useQuery({queryKey:['admin-creator-history',creator.id],enabled:open,queryFn:()=>readCreatorReviewHistory(supabase,creator.id,creator.user_id)});
 return <View><Button variant="outline" onPress={()=>setOpen(!open)}>{open?'Hide history':'History'}</Button>{open?<View>{history.isLoading?<Text>Loading review history…</Text>:history.isError?<Button onPress={()=>void history.refetch()}>Could not load review history. Retry</Button>:!history.data?.length?<Text>No recorded creator reviews.</Text>:history.data.map((row:any)=><Text key={row.id} style={{color:colors.mutedForeground}}>{row.created_at} · {row.action} · {row.details}</Text>)}</View>:null}</View>;
}
