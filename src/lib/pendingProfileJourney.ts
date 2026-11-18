/** Short-lived public profile destination; never holds session credentials or private proofs. */
type Kind='coach'|'club'|'scout'|'influencer';
let pending:{kind:Kind;id:string;at:number}|null=null;
export function rememberProfileJourney(kind:Kind,id:string,now=Date.now()){if(!['coach','club','scout','influencer'].includes(kind)||!id||id.length>200||/[\u0000-\u001f\u007f]/.test(id))throw Error('Invalid profile destination');pending={kind,id,at:now};}
export function clearPendingProfileJourney(){pending=null;}
export function takePendingProfileJourney(now=Date.now()){const p=pending;pending=null;if(!p||now-p.at>20*60000)return null;return p.kind==='coach'?{name:'CoachProfile',params:{id:p.id}}:p.kind==='club'?{name:'PublicClubCoachProfile',params:{id:p.id}}:{name:'PublicProfileStack',params:p.kind==='scout'?{screen:'PublicScoutProfile',params:{scoutId:p.id}}:{screen:'InfluencerProfile',params:{handle:p.id}}};}
