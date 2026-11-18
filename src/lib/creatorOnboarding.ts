import {creatorContentUrl} from '@/lib/creatorSchedule';
import {saveCreatorSyndication,creatorWebhookUrl} from '@/lib/creatorSyndication';
/** Resume confirmed own records after partial setup; never recreate a profile or hide secondary-save failures. */
export async function saveCreatorOnboarding(client:any,userId:string,profile:Record<string,unknown>,links:{platform:string;profile_url:string}[],webhook:string){
 if(!userId)throw new Error('Sign in to create a profile.');const privateUrl=creatorWebhookUrl(webhook);for(const link of links)creatorContentUrl(link.profile_url);
 const existing=await client.from('influencer_profiles').select('id').eq('user_id',userId).maybeSingle();if(existing.error)throw existing.error;
 const allowed=['display_name','handle','bio','primary_sport','affiliation_type','region_city','region_state','content_tags'];const fields=Object.fromEntries(allowed.filter(key=>key in profile).map(key=>[key,profile[key]]));
 const write=existing.data?client.from('influencer_profiles').update(fields).eq('id',existing.data.id).eq('user_id',userId):client.from('influencer_profiles').insert({...fields,user_id:userId});
 const result=await write.select('id').single();if(result.error)throw result.error;if(!result.data?.id)throw new Error('Profile save was not confirmed. Reload before retrying.');const id=result.data.id;
 try{for(const link of links){const old=await client.from('influencer_social_links').select('id').eq('influencer_id',id).eq('platform',link.platform).maybeSingle();if(old.error)throw old.error;const q=old.data?client.from('influencer_social_links').update({profile_url:link.profile_url}).eq('id',old.data.id).eq('influencer_id',id):client.from('influencer_social_links').insert({...link,influencer_id:id});const saved=await q.select('id').single();if(saved.error)throw saved.error;if(!saved.data?.id)throw new Error('Social link save was not confirmed.');}
 if(privateUrl)await saveCreatorSyndication(client,userId,id,privateUrl,true);
 }catch{throw new Error('Creator profile saved, but some links or private sharing settings were not confirmed. Your form is unchanged; retry or review them in your dashboard.');}
 return {id};
}
