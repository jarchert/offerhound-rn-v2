/** Invitee-only acceptance; the database independently enforces authority and immutable identity. */
export async function acceptAgencyInvitation(client:any,userId:string,id:string){
 if(!userId||!id)throw Error('Sign in to accept this invitation.');
 const {data,error}=await client.from('organization_members').update({invitation_accepted:true,joined_at:new Date().toISOString()})
   .eq('id',id).eq('user_id',userId).eq('invitation_accepted',false)
   .select('id,user_id,organization_id,invitation_accepted').single();
 if(error)throw error;
 if(!data?.id||data.id!==id||data.user_id!==userId||!data.organization_id||data.invitation_accepted!==true)
   throw Error('Acceptance was not confirmed. Refresh invitations before retrying.');
 return data;
}
