export type StaffInviteChannel='email'|'sms';
/** Provider acceptance and the staff timestamp ACK are distinct; neither implies inbox delivery. */
export async function requestStaffInvitation(client:any,staffId:string,channels:StaffInviteChannel[],customMessage?:string){
 if(!staffId||!channels.length||channels.some(c=>!['email','sms'].includes(c))||new Set(channels).size!==channels.length)throw Error('Choose email or SMS for a saved staff record.');
 const result=await client.functions.invoke('send-staff-invitation',{body:{staffId,channels,...(customMessage?.trim()?{customMessage:customMessage.trim()}:{})}});
 let data=result.data;
 if(!data&&result.error?.context?.json){try{data=await result.error.context.json()}catch{}}
 const rows=Array.isArray(data?.results)?data.results:[];
 const sent=channels.filter(channel=>rows.filter((row:any)=>row.channel===channel&&row.status==='sent'&&typeof row.provider_message_id==='string'&&row.provider_message_id.trim()).length===1);
 if(data?.delivered!==true||!sent.length)throw Error('Invitation was not confirmed by the provider. The saved staff record is kept. Review its status before retrying.');
 return {sent,failed:channels.filter(channel=>!sent.includes(channel)),recorded:data.recorded===true};
}
