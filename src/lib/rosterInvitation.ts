export function rosterUnder13(dob?:string|null,now=new Date()){
 if(!dob||!/^\d{4}-\d{2}-\d{2}$/.test(dob))return false;const d=new Date(dob+'T00:00:00Z');if(!Number.isFinite(d.getTime())||d>now)return false;let age=now.getUTCFullYear()-d.getUTCFullYear();if(now.getUTCMonth()<d.getUTCMonth()||now.getUTCMonth()===d.getUTCMonth()&&now.getUTCDate()<d.getUTCDate())age--;return age<13;
}
export async function sendRosterInvitation(client:any,rosterId:string,dob?:string|null,resend=false){
 const minor=rosterUnder13(dob);const r=await client.functions.invoke(minor?'send-minor-profile-invitation':'invite-club-athlete',{body:minor?{roster_id:rosterId}:{rosterId,resend}});
 if(r.error)throw Error('The roster entry is saved, but invitation delivery was not confirmed. Review the contact details and retry the invitation.');
 if(minor){const status=r.data?.email_result?.status;if(r.data?.ok!==true||r.data.roster_id!==rosterId||!r.data.invitation_id||!Number.isInteger(status)||status<200||status>=300)throw Error('The roster entry is saved. A parent invitation was not confirmed as delivered.');return{delivered:1,description:'The parent invitation was accepted by the email provider. The parent must create the profile.'};}
 if(r.data?.code==='already_linked')return{delivered:0,description:'This athlete already has a linked account. Team acceptance remains separate.'};
 const invitations=r.data?.invitations;if(!Array.isArray(invitations))throw Error('Invitation delivery was not confirmed. Recheck the roster before retrying.');
 const delivered=invitations.filter((i:any)=>i.delivered===true&&i.channels?.some((c:any)=>c.success===true)).length;
 return{delivered,description:delivered?`${delivered} invitation delivery accepted. Claiming and team acceptance remain separate.`:r.data?.code==='already_linked'?'This athlete already has a linked account. Team acceptance remains separate.':'No invitation delivery was confirmed. Check the contact details and try again. Undelivered links cannot be claimed.'};
}
export async function readRosterInvitationStatus(client:any,teamId:string){const r=await client.rpc('club_roster_invitation_status',{p_team_id:teamId});if(r.error||!Array.isArray(r.data))throw Error('Could not load invitation status.');const latest=new Map<string,any>();for(const row of [...r.data].sort((a:any,b:any)=>String(b.created_at||'').localeCompare(String(a.created_at||'')))){const key=`${row.roster_id}:${row.audience}`;if(!latest.has(key))latest.set(key,row);}return [...latest.values()];}
