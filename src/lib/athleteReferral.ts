import {acceptedRoster} from './teamMembership';
/** Referral requirements are independent of recipient identity and require server authorization. */
export const referralSubjectId=(value:unknown)=>typeof value==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)?value:undefined;
export function referralParams(row:{athlete_profile_id?:unknown;status?:string;removed_at?:unknown;athlete_accepted_at?:unknown}){
 const id=referralSubjectId(row.athlete_profile_id);
 if(!id)throw Error("You can refer this athlete once their OfferHound profile is linked.");
 if(!acceptedRoster(row))throw Error('You can refer this athlete once they accept their roster spot.');
 return {intent:'referral',recipientCategory:'college-coach',recipientType:'coach',letterType:'player-recommendation',subjectAthleteProfileId:id};
}
export async function loadReferralSubject(client:any,id:string){
 if(!referralSubjectId(id))throw Error('This referral has no valid athlete profile.');
 const {data,error}=await client.rpc('letter_subject_facts',{p_athlete_profile_id:id});
 if(error)throw Error('Unable to load athlete sharing permissions. Please retry.');
 if(data?.ok!==true){if(data?.code==='not_shareable')throw Error("This athlete's privacy settings don't allow sharing their profile with college coaches.");if(data?.code==='not_permitted')throw Error('You can only recommend athletes on an active roster you coach.');throw Error('Unable to load athlete sharing permissions. Please retry.');}
 if(data.facts?.athlete_profile_id!==id||!['owner','team_coach'].includes(data.relationship))throw Error('Unable to confirm the referral subject. Please retry.');
 const facts:Record<string,string|number|string[]>={};
 for(const key of ['full_name','sport','graduation_year','school','city','state','height','weight','gpa']){const value=data.facts[key];if((typeof value==='string'&&value.trim())||(typeof value==='number'&&Number.isFinite(value)))facts[key]=value;}
 for(const key of ['positions','highlights'])if(Array.isArray(data.facts[key]))facts[key]=data.facts[key].filter((x:unknown)=>typeof x==='string'&&x.trim()).slice(0,key==='highlights'?4:20);
 return facts;
}
