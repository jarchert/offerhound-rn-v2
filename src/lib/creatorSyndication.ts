/** Private owner settings and server-owned syndication contracts. Never send webhook URLs or browser payloads. */
export function creatorWebhookUrl(value:string){const text=value.trim();if(!text)return null;let url:URL;try{url=new URL(text)}catch{throw new Error('Enter a valid HTTPS webhook URL.')}if(url.protocol!=='https:'||url.username||url.password)throw new Error('Enter a valid HTTPS webhook URL.');return text;}
export async function readCreatorSyndication(client:any,userId:string,influencerId:string){
 const result=await client.from('influencer_syndication_settings').select('influencer_id,user_id,webhook_url,enabled').eq('influencer_id',influencerId).eq('user_id',userId).maybeSingle();if(result.error)throw result.error;return result.data;
}
export async function saveCreatorSyndication(client:any,userId:string,influencerId:string,url:string,enabled:boolean){
 if(!userId||!influencerId)throw new Error('Sign in to save creator settings.');const webhook_url=creatorWebhookUrl(url);if(enabled&&!webhook_url)throw new Error('Enter an HTTPS webhook URL before enabling sharing.');
 const result=await client.from('influencer_syndication_settings').upsert({influencer_id:influencerId,user_id:userId,webhook_url,enabled},{onConflict:'influencer_id'}).select('influencer_id,user_id,webhook_url,enabled').single();if(result.error)throw result.error;
 const stored=await readCreatorSyndication(client,userId,influencerId);if(!stored||stored.influencer_id!==influencerId||stored.user_id!==userId||stored.webhook_url!==webhook_url||stored.enabled!==enabled)throw new Error('Settings save was not confirmed. Reload before retrying.');return stored;
}
export async function syndicateCreatorActivity(client:any,activityId:string){
 try{const result=await client.functions.invoke('syndicate-influencer-content',{body:{activityId}});if(result.error)return {status:'not_confirmed' as const};if(result.data?.success===true&&Number.isInteger(result.data.webhook_status)&&result.data.webhook_status>=200&&result.data.webhook_status<300)return {status:'sent' as const};return {status:result.data?.skipped===true?'skipped' as const:'not_confirmed' as const};}catch{return {status:'not_confirmed' as const};}
}
