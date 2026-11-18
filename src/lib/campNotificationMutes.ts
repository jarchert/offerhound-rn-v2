export async function loadCampMutes(client:any,userId:string){
 if(!userId)throw Error('Sign in to manage camp mutes.');
 const {data,error}=await client.from('camp_notification_optouts').select('id,camp_id,created_at').eq('user_id',userId).order('created_at',{ascending:false});if(error)throw error;const rows=data||[];const ids=[...new Set(rows.map((r:any)=>r.camp_id).filter(Boolean))];if(!ids.length)return rows;const {data:camps,error:campError}=await client.from('camps').select('id,name').in('id',ids);if(campError)throw campError;const names=new Map((camps||[]).map((c:any)=>[c.id,c.name]));return rows.map((r:any)=>({...r,camp_name:r.camp_id?names.get(r.camp_id)||'Camp no longer available':null}));
}
export async function muteAllCamps(client:any,userId:string){
 const existing=await loadCampMutes(client,userId);if(existing.some((r:any)=>r.camp_id===null))return;
 const {data,error}=await client.from('camp_notification_optouts').insert({user_id:userId,camp_id:null}).select('id').single();if(error)throw error;if(!data?.id)throw Error('Camp mute was not saved.');
}
export async function removeCampMute(client:any,userId:string,id:string){
 if(!userId||!id)throw Error('Invalid camp mute.');const {data,error}=await client.from('camp_notification_optouts').delete().eq('user_id',userId).eq('id',id).select('id');if(error)throw error;if(data?.length!==1)throw Error('Camp mute was not removed.');
}
