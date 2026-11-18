import React,{useState} from 'react';
import {View,Text,Switch} from 'react-native';
import {useQuery} from '@tanstack/react-query';
import {useAuth} from '@/hooks/useAuth';
import {supabase} from '@/integrations/supabase/client';
import {readAthleteSearchListing,changeAthleteSearchListing} from '@/lib/athleteSearchListing';
import {Button} from '@/components/ui/Button';
import {colors,spacing} from '@/lib/theme';
const reasons:Record<string,string>={not_published:'Profile is not published',suspended:'Account is unavailable',minor_safe:'Minor-safe profiles are not listed',visibility_private:'Profile visibility is private',visibility_team_only:'Profile is shared only with the team',parental_consent_missing:'Parental consent is required',opted_out:'Search listing is off'};
export function AthleteSearchListingCard({profileId}:{profileId:string}){
 const {user}=useAuth(),[saving,setSaving]=useState(false),[error,setError]=useState('');
 const q=useQuery({queryKey:['athlete-search-listing',user?.id,profileId],enabled:!!user&&!!profileId,queryFn:()=>readAthleteSearchListing(supabase,profileId)});
 const change=async(value:boolean)=>{if(saving)return;setSaving(true);setError('');try{await changeAthleteSearchListing(supabase,profileId,value);await q.refetch();}catch(e:any){setError(e.message);}finally{setSaving(false);}};
 return <View style={{padding:spacing.md,gap:spacing.sm,borderWidth:1,borderColor:colors.border,borderRadius:12}}><Text style={{color:colors.foreground,fontWeight:'bold'}}>Recruiter search</Text>
 {q.isPending?<Text style={{color:colors.foreground}}>Loading search visibility…</Text>:q.isError?<><Text accessibilityRole="alert" style={{color:colors.foreground}}>Could not load search visibility.</Text><Button onPress={()=>q.refetch()}>Retry search visibility</Button></>:<><Text style={{color:colors.foreground}}>{q.data?.listed?'Listed in recruiter search':'Not currently listed in recruiter search'}</Text><Switch accessibilityLabel="Allow recruiter search listing" disabled={saving} value={q.data?.show_in_search!==false} onValueChange={change}/>{(q.data?.reasons||[]).map(reason=><Text key={reason} style={{color:colors.foreground}}>{reasons[reason]||'Profile is not eligible for search listing'}</Text>)}{q.data?.show_in_search===null?<Text style={{color:colors.mutedForeground}}>No preference saved. Listing is allowed by default when profile visibility and consent permit it.</Text>:null}</>}
 {error?<Text accessibilityRole="alert" style={{color:colors.destructive}}>{error}</Text>:null}<Text style={{color:colors.mutedForeground}}>Turning search off removes this profile from search and match suggestions. People with a direct profile link may still view it when privacy settings allow. This does not change publication, privacy or consent.</Text></View>;
}
