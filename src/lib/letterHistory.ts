const config={coach:{table:'coach_letter_history',owner:'coach_user_id'},scout:{table:'scout_letter_history',owner:'scout_user_id'}} as const;
export async function readLetterHistory(client:any,userId:string,kind:'coach'|'scout'){
 const c=config[kind],r=await client.from(c.table).select('*').eq(c.owner,userId).order('sent_at',{ascending:false});if(r.error)throw r.error;return r.data||[];
}
export async function insertLetterHistory(client:any,userId:string,kind:'coach'|'scout',entry:Record<string,any>){
 if(!userId)throw Error('Sign in to save letter history.');const c=config[kind];const r=await client.from(c.table).insert({...entry,[c.owner]:userId}).select('id').single();if(r.error)throw r.error;if(!r.data?.id)throw Error('Letter history was not confirmed. Do not resend the letter.');return r.data;
}
export async function removeLetterHistory(client:any,userId:string,kind:'coach'|'scout',id:string){
 if(!userId)throw Error('Sign in to change letter history.');const c=config[kind];const r=await client.from(c.table).delete().eq('id',id).eq(c.owner,userId).select('id').single();if(r.error)throw r.error;if(r.data?.id!==id)throw Error('History removal was not confirmed. Refresh before retrying.');
}
