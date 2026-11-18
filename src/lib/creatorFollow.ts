/** Confirm the authenticated follower's stored state; an empty mutation is never success. */
export async function setCreatorFollow(client:any,userId:string,influencerId:string,following:boolean,source='board'){
 if(!userId||!influencerId)throw new Error('Sign in and select a creator.');
 const table=()=>client.from('influencer_follows');
 const read=await table().select('id,is_following').eq('influencer_id',influencerId).eq('follower_user_id',userId).maybeSingle();
 if(read.error)throw read.error;
 if(!read.data&&!following)return {alreadyAbsent:true};
 const payload={is_following:following,...(following?{followed_at:new Date().toISOString(),unfollowed_at:null}:{unfollowed_at:new Date().toISOString()})};
 const query=read.data?table().update(payload).eq('id',read.data.id).eq('influencer_id',influencerId).eq('follower_user_id',userId):table().insert({...payload,influencer_id:influencerId,follower_user_id:userId,source});
 const result=await query.select('id,is_following').single();
 if(result.error)throw result.error;
 if(!result.data?.id||result.data.is_following!==following)throw new Error('Follow status was not confirmed. Refresh before retrying.');
 return result.data;
}
