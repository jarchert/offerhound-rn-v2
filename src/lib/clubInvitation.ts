/** Private invitation proof stays in memory, never navigation state, logs or query keys. */
let pending:{token:string;at:number;revision:number}|null=null;let revision=0;
const ttl=3*24*60*60*1000;
export function rememberClubInvitation(token:string,now=Date.now()){
 if(!/^[0-9a-f]{64}$/i.test(token)){pending=null;return false;}
 pending={token,at:now,revision:++revision};return true;
}
export function pendingClubInvitation(now=Date.now()){if(pending&&now-pending.at>ttl)pending=null;return pending;}
export function clearClubInvitation(){pending=null;}
export function sanitizeClubInvitationUrl(value:string){
 try{const url=new URL(value);const native=['offerhoundv2:','offerhound-staging:'].includes(url.protocol);const web=url.protocol==='https:'&&['offer-hound.com','www.offer-hound.com','offerhound.app','www.offerhound.app','friday-night-recruiting.lovable.app','playbook-promoter.lovable.app'].includes(url.hostname);
 if(!(native&&url.hostname==='club-invite'&&['','/'].includes(url.pathname)||web&&url.pathname==='/club-invite'))return value;
 const fragment=new URLSearchParams(url.hash.slice(1));const tokens=fragment.getAll('token');if(tokens.length===1)rememberClubInvitation(tokens[0]);else clearClubInvitation();
 url.hash='';url.search='';const clean=url.toString();const browser=globalThis as any;if(browser.location?.href===value&&browser.history?.replaceState)browser.history.replaceState(null,'',clean);return clean;
 }catch{return value;}
}
const previewStates=['valid','used_by_you','invitation_not_found','invitation_expired','invitation_superseded','invitation_voided','invitation_already_used','invitation_email_changed','roster_entry_closed','team_inactive'];
export async function previewClubInvitation(client:any,token:string){
 const r=await client.rpc('preview_club_athlete_invitation',{p_token:token});
 if(r.error||!r.data||!previewStates.includes(r.data.state))throw Error('Could not check this invitation. Please retry.');
 return r.data;
}
export function clubInvitationClaimable(preview:any){return preview?.ok===true&&preview.state==='valid'&&preview.email_matches===true&&preview.email_confirmed===true&&['athlete','parent'].includes(preview.audience);}
export async function claimClubInvitation(client:any,token:string){
 const run=()=>client.rpc('claim_club_athlete_invitation',{p_token:token});let r=await run();if(r.error&&!r.error.code)r=await run();
 if(r.error||r.data?.ok!==true||!['claimed','linked_existing_profile','guardian_linked'].includes(r.data.state))throw Error('The invitation was not confirmed. Recheck it before trying again. No team acceptance or consent has been granted.');
 return r.data;
}
export const clubInvitationExplanation=(p:any)=>p?.state==='used_by_you'?'This account has already claimed this invitation. Team acceptance is a separate choice.':p?.state==='valid'&&!p.email_matches?'Sign in with the invited email address. This account cannot claim the invitation.':p?.state==='valid'&&!p.email_confirmed?'Confirm the invited email address, then recheck this invitation.':({invitation_expired:'This invitation has expired. Ask the coach for a new invitation.',invitation_superseded:'A newer invitation replaced this one. Use the latest link.',invitation_voided:'This invitation was not delivered or has been withdrawn. Ask the coach for a new invitation.',invitation_already_used:'This invitation has already been used.',invitation_email_changed:'The invitation recipient has changed. Ask the coach for a new invitation.',roster_entry_closed:'This roster entry is closed.',team_inactive:'This team is not active.'} as Record<string,string>)[p?.state]||'This invitation is unavailable. Ask the coach for a new invitation.';
