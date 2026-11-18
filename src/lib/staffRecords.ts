const editableStaffFields=['name','email','phone','role','title','notes','status'] as const;
/** Staff-directory records do not themselves grant organization or team access. */
export async function saveOwnedStaffRecord(client:any,userId:string,fields:Record<string,unknown>,id?:string){
 if(!userId)throw new Error('Sign in to manage staff.');const payload:Record<string,unknown>={};
 for(const key of editableStaffFields)if(Object.prototype.hasOwnProperty.call(fields,key))payload[key]=fields[key];
 if(!id&&(!payload.name||!String(payload.name).trim()))throw new Error('Enter a staff name.');
 if(payload.name!==undefined){payload.name=String(payload.name).trim();if(!payload.name)throw new Error('Enter a staff name.');}
 if(payload.status!==undefined&&!['active','invited','suspended','removed'].includes(String(payload.status)))throw new Error('Choose a valid staff status.');
 if(!Object.keys(payload).length)throw new Error('Choose a staff change.');
 let query=client.from('coaching_staff');query=id?query.update(payload).eq('id',id).eq('owner_user_id',userId):query.insert({...payload,owner_user_id:userId});
 const result=await query.select('id,owner_user_id').single();if(result.error)throw result.error;
 if(!result.data?.id||(id&&result.data.id!==id)||result.data.owner_user_id!==userId)throw new Error('Staff save was not confirmed. Your form is unchanged; reload before retrying.');return result.data;
}
export function staffMessageTarget(member:any){
 const ids=[member?.staff_user_id,member?.linked_user_id].filter((value:any)=>typeof value==='string'&&value.trim()).map((value:string)=>value.trim());const unique=[...new Set(ids)];return unique.length===1?{recipientUserId:unique[0]}:null;
}
