import {resolveConversationIdentity} from './conversationIdentity';
export type DirectMessageTarget={athleteProfileId:string;recipientUserId?:never;recipientRole?:never}|{recipientUserId:string;recipientRole?:string;athleteProfileId?:never};
export async function resolveDirectMessageTarget(client:any,target:DirectMessageTarget,currentUserId?:string){
 if(target.athleteProfileId){
  const r=await client.from('player_profiles').select('id,user_id,full_name').eq('id',target.athleteProfileId).maybeSingle();
  if(r.error||r.data?.id!==target.athleteProfileId||!r.data.user_id||!r.data.full_name?.trim())throw Error('This athlete is unavailable. Return to the profile and try again.');
  if(r.data.user_id===currentUserId)throw Error('Choose another person to message.');
  return{name:r.data.full_name.trim(),body:{recipientType:'athlete',athleteProfileId:r.data.id},userId:r.data.user_id};
 }
 if(!target.recipientUserId)throw Error('Choose a recipient before writing a message.');
 if(target.recipientUserId===currentUserId)throw Error('Choose another person to message.');
 const identity=await resolveConversationIdentity(client,target.recipientUserId,target.recipientRole);
 if(!identity.identified)throw Error('The recipient could not be identified. Return to their profile and try again.');
 return{name:identity.name,body:{recipientUserId:target.recipientUserId,recipientRole:target.recipientRole},userId:target.recipientUserId};
}
export async function sendDirectMessageDraft(client:any,recipient:{body:Record<string,unknown>},message:string){
 if(!message.trim())throw Error('Enter a message.');
 const r=await client.functions.invoke('send-direct-message',{body:{...recipient.body,message:message.trim()}});
 if(r.error||r.data?.success!==true||!r.data.messageId||!r.data.conversationId)throw Error('Delivery was not confirmed. Your draft is kept. Check Messages before retrying.');
 return r.data.conversationId as string;
}
