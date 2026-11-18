export type ClubEventForm={title:string;event_type:string;start_time:string;end_time:string;team_id:string;location:string;description:string;is_mandatory:boolean};
export function calendarLocalInput(value:string|null|undefined){
 if(!value)return '';const date=new Date(value);if(!Number.isFinite(date.getTime()))return '';
 const pad=(n:number)=>String(n).padStart(2,'0');return `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
export function calendarInstant(value:string){
 const match=/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);if(!match)throw new Error('Use YYYY-MM-DDTHH:mm in your device’s local time.');
 const [year,month,day,hour,minute]=match.slice(1).map(Number);const date=new Date(year,month-1,day,hour,minute);
 if(year<1900||date.getFullYear()!==year||date.getMonth()!==month-1||date.getDate()!==day||date.getHours()!==hour||date.getMinutes()!==minute)throw new Error('Choose a valid local date and time.');return date.toISOString();
}
export async function saveClubEvent(client:any,userId:string,form:ClubEventForm,eventId?:string,previous?:{start_time:string;end_time?:string|null}){
 if(!userId)throw new Error('Sign in to manage events.');if(!form.title.trim()||!form.team_id)throw new Error('Enter a title and select a team.');
 if(!['practice','game','tournament','showcase','meeting','other'].includes(form.event_type))throw new Error('Choose an event type.');
 const start_time=eventId&&previous&&form.start_time===calendarLocalInput(previous.start_time)?new Date(previous.start_time).toISOString():calendarInstant(form.start_time);
 const end_time=form.end_time?(eventId&&previous?.end_time&&form.end_time===calendarLocalInput(previous.end_time)?new Date(previous.end_time).toISOString():calendarInstant(form.end_time)):null;if(end_time&&new Date(end_time).getTime()<=new Date(start_time).getTime())throw new Error('End time must be after start time.');
 const team=await client.from('teams').select('id').eq('id',form.team_id).eq('coach_user_id',userId).neq('status','archived').maybeSingle();if(team.error)throw team.error;if(team.data?.id!==form.team_id)throw new Error('This team could not be confirmed. Reload your teams.');
 const payload={coach_user_id:userId,team_id:form.team_id,title:form.title.trim(),event_type:form.event_type,start_time,end_time,location:form.location.trim()||null,description:form.description.trim()||null,is_mandatory:form.is_mandatory};
 let query=client.from('team_events');query=eventId?query.update(payload).eq('id',eventId).eq('coach_user_id',userId):query.insert(payload);
 const result=await query.select('id,coach_user_id,team_id,start_time,end_time').single();if(result.error)throw result.error;
 if(!result.data?.id||(eventId&&result.data.id!==eventId)||result.data.coach_user_id!==userId||result.data.team_id!==form.team_id||new Date(result.data.start_time).getTime()!==new Date(start_time).getTime()||(end_time?new Date(result.data.end_time).getTime()!==new Date(end_time).getTime():result.data.end_time!=null))throw new Error('Event save was not confirmed. Your form is unchanged; reload before retrying.');return result.data;
}
export async function deleteClubEvent(client:any,userId:string,eventId:string){
 if(!userId||!eventId)throw new Error('Sign in and reload your events.');const result=await client.from('team_events').delete().eq('id',eventId).eq('coach_user_id',userId).select('id').single();if(result.error)throw result.error;if(result.data?.id!==eventId)throw new Error('Event deletion was not confirmed.');return result.data;
}
