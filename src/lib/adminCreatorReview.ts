export const creatorReviewActions={verify:{verification_status:'verified'},reject:{verification_status:'rejected'},show:{board_visibility:'eligible'},hide:{board_visibility:'hidden'},suspend:{board_visibility:'suspended'},lift:{board_visibility:'hidden'}} as const;
export type CreatorReviewAction=keyof typeof creatorReviewActions;
export async function updateAdminCreatorReview(client:any,id:string,action:CreatorReviewAction){
 const access=await client.rpc('is_admin');if(access.error||access.data!==true)throw new Error('Admin access could not be confirmed.');
 if(!Object.prototype.hasOwnProperty.call(creatorReviewActions,action)||!id)throw new Error('Choose a valid creator review action.');const change=creatorReviewActions[action];
 const result=await client.from('influencer_profiles').update(change).eq('id',id).select('id,verification_status,board_visibility').single();if(result.error)throw result.error;
 if(result.data?.id!==id||Object.entries(change).some(([key,value])=>result.data[key]!==value))throw new Error('Creator review was not confirmed. Reload before retrying.');return result.data;
}
export async function readCreatorReviewHistory(client:any,creatorId:string,creatorUserId:string){
 if(!creatorId||!creatorUserId)throw new Error('Creator identity is unavailable.');
 const result=await client.from('admin_audit_log').select('id,action,admin_user_id,target_user_id,details,created_at').eq('target_user_id',creatorUserId).like('action','creator_review.%').order('created_at',{ascending:false}).limit(100);if(result.error)throw result.error;
 return (result.data||[]).filter((row:any)=>typeof row.details==='string'&&row.details.startsWith(`influencer_profile_id=${creatorId};`));
}
export function creatorAuditConfirms(rows:any[],creatorId:string,creatorUserId:string,adminId:string,action:CreatorReviewAction){
 return Object.entries(creatorReviewActions[action]).every(([field,value])=>{const row=rows.find(r=>r.action===`creator_review.${field}`);return !!row&&row.admin_user_id===adminId&&row.target_user_id===creatorUserId&&typeof row.details==='string'&&row.details.startsWith(`influencer_profile_id=${creatorId};`)&&row.details.endsWith(` -> ${value}`);});
}
