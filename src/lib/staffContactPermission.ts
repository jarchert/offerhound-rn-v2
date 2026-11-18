import {staffMessageTarget} from './staffRecords';
/** Only display a recipient after the caller-scoped server predicate confirms messaging authority. */
export async function permittedStaffRecipient(client:any,row:any,userId:string){
 if(!userId||!['active','invited'].includes(row?.status))return null;
 const account=staffMessageTarget(row)?.recipientUserId;
 const recipient=row.owner_user_id===userId?account:account===userId?row.owner_user_id:null;
 if(!recipient||recipient===userId)return null;
 const result=await client.rpc('can_send_staff_message',{p_recipient:recipient});
 if(result.error)throw result.error;
 if(result.data!==true)return null;
 return recipient;
}
