/** This is an in-app staff message only. The server independently enforces staff authority. */
export async function saveStaffMessage(client:any,sender:string,recipient:string,content:string){
 const text=content.trim();if(!sender||!recipient||sender===recipient)throw Error('Select an identified staff account.');
 if(!text||text.length>4000)throw Error('Enter a message of 1 to 4,000 characters.');
 const {data,error}=await client.from('staff_messages').insert({sender_user_id:sender,recipient_user_id:recipient,content:text,message_type:'text'})
  .select('id,sender_user_id,recipient_user_id,content').single();
 if(error)throw error;
 if(!data?.id||data.sender_user_id!==sender||data.recipient_user_id!==recipient||data.content!==text)
  throw Error('Message was not confirmed. Your draft is kept; reload before retrying.');
 return data;
}
