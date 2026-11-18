/** Atomic staging contracts; server runs with the caller's existing row security. */
export async function inviteAgencyStaff(client:any,input:{organizationId:string;userId:string;role:string;name:string;title:string|null}){
 if(!input.organizationId||!input.userId||!input.name.trim()||!input.role)throw Error('Choose an agency, scout and role.');
 const result=await client.rpc('invite_agency_staff',{p_organization_id:input.organizationId,p_user_id:input.userId,p_role:input.role,p_name:input.name.trim(),p_title:input.title});
 if(result.error)throw result.error;
 if(result.data?.ok!==true||result.data.state!=='pending'||!result.data.membership_id||!result.data.staff_id)
  throw Error('Invitation was not confirmed. Refresh the team before retrying.');
 return result.data;
}
export async function revokeAgencyStaff(client:any,staffId:string,organizationId?:string){
 if(!staffId)throw Error('Choose a staff member.');
 const result=await client.rpc('revoke_agency_staff',{p_staff_id:staffId,...(organizationId?{p_organization_id:organizationId}:{})});
 if(result.error)throw result.error;
 if(result.data?.ok!==true||result.data.status!=='removed'||!Number.isInteger(result.data.memberships_revoked)||result.data.memberships_revoked<0)
  throw Error('Staff removal and membership revocation were not confirmed. Refresh before retrying.');
 return result.data;
}
