/** Membership is established only by a server-recorded athlete/guardian response. */
export const closedRosterStatuses=['removed','transferred','declined'];
export function openRoster(row:any){return !!row&&!row.removed_at&&!closedRosterStatuses.includes(row.status);}
export function acceptedRoster(row:any){return openRoster(row)&&!!row.athlete_profile_id&&!!row.athlete_accepted_at;}
export function acceptedRosterQuery(query:any){return query.is('removed_at',null).not('status','in','(removed,transferred,declined)').not('athlete_accepted_at','is',null);}
export async function loadTeamMemberships(client:any,profileId:string){
 const {data,error}=await client.from('team_rosters').select('id,athlete_profile_id,status,removed_at,athlete_accepted_at,athlete_accepted_by,teams(id,name,status)').eq('athlete_profile_id',profileId).is('removed_at',null).not('status','in','(removed,transferred,declined)');
 if(error||!Array.isArray(data))throw Error('Teams could not be loaded. Please retry.');
 return data.filter((row:any)=>row.athlete_profile_id===profileId&&openRoster(row));
}
const messages:Record<string,string>={guardian_required:'A linked guardian must accept this team invitation.',not_permitted:'This team invitation is unavailable to this account.',roster_entry_closed:'This invitation is closed. Ask the team for a new invitation.',team_inactive:'This team is no longer active.',sign_in_required:'Sign in again to respond to the team.'};
export async function respondTeamMembership(client:any,rosterId:string,accept:boolean){
 const request={p_roster_id:rosterId,p_accept:accept};let result;
 for(let attempt=0;attempt<2;attempt++){try{result=await client.rpc('respond_to_team_roster',request);}catch(error){result={error};}if(!result.error||result.error.code)break;}
 if(result.error)throw Error(messages[result.error.message]||'Your team response could not be confirmed. Reload your teams before retrying.');
 if(result.data?.ok!==true||result.data.roster_id!==rosterId||result.data.state!==(accept?'accepted':'declined'))throw Error('Your team response could not be confirmed. Reload your teams before retrying.');
 return result.data;
}
