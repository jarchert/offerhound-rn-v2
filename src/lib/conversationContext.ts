/** Legacy column names are sorted participant slots, with explicit role metadata. */
export function conversationContext(row:any,userId:string) {
  if(row.athlete_user_id===userId) return {myRole:row.participant_a_role||'athlete',otherRole:row.participant_b_role||'coach',otherId:row.coach_user_id};
  if(row.coach_user_id===userId) return {myRole:row.participant_b_role||'coach',otherRole:row.participant_a_role||'athlete',otherId:row.athlete_user_id};
  throw new Error('Conversation does not belong to this account.');
}

/** One batched message read per page, avoiding concurrent per-thread RLS scans. */
export async function conversationSummaries(client:any,ids:string[],userId:string) {
  const summaries=new Map<string,{content:string|null;senderId:string|null;read:boolean;unread:number}>();
  if(!ids.length)return summaries;
  const pageSize=500;
  for(let offset=0;;offset+=pageSize) {
    const {data,error}=await client.from('messages').select('id,conversation_id,content,sender_user_id,is_read,read_at,created_at').in('conversation_id',ids).order('created_at',{ascending:false}).order('id',{ascending:false}).range(offset,offset+pageSize-1);
    if(error)throw error;
    const rows=data||[];
    for(const row of rows) {
      const read=!!row.read_at||row.is_read===true;
      if(!summaries.has(row.conversation_id))summaries.set(row.conversation_id,{content:row.content??null,senderId:row.sender_user_id??null,read,unread:0});
      if(!read&&row.sender_user_id!==userId)summaries.get(row.conversation_id)!.unread++;
    }
    if(rows.length<pageSize)break;
  }
  return summaries;
}
