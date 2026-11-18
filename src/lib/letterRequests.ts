export type ShortcutLetterDraft={recipientName:string;recipientRole:string;schoolName:string;recipientCategory:string;letterType:string;keyPoints:string;tone:string};
export function shortcutLetterSeed(params:any,role:string|null):ShortcutLetterDraft {
 const seed=params?.seed||params?.prefill||{},person=seed.athlete||seed.coach||{};
 const category=seed.recipientCategory||(seed.athlete||seed.prefillAthleteName?'athlete':seed.coach?'college-coach':role==='athlete'?'college-coach':'athlete');
 return {recipientName:seed.recipientName||seed.prefillAthleteName||person.full_name||person.name||'',recipientRole:seed.recipientTitle||person.title||'',schoolName:seed.schoolName||seed.organizationName||person.school||'',recipientCategory:category,letterType:seed.letterType||'intro',keyPoints:'',tone:'professional'};
}
export function letterSenderTable(role:string|null) {
 return role==='athlete'?'player_profiles':role==='high_school_coach'?'high_school_coach_profiles':role==='coach'||role==='club_coach'?'coach_profiles':role==='scout'||role==='agency'?'scout_profiles':role==='influencer'?'influencer_profiles':null;
}
export function shortcutLetterRequest(role:string|null,profile:any,draft:ShortcutLetterDraft) {
 if(!letterSenderTable(role)||!profile)throw Error('Your sender profile is required before generating a letter.');
 const name=profile.full_name||profile.name||profile.display_name;
 if(!name)throw Error('Complete your sender name before generating a letter.');
 const context=[draft.keyPoints.trim(),`Requested tone: ${draft.tone}. Use only the supplied facts; omit unknown facts.`].filter(Boolean).join('\n');
 const senderProfile:Record<string,unknown>={name,school:profile.school_name||profile.school};
 for(const key of ['email','phone','title','conference','division','position_coached','company','specialization','regions_covered','sport','primary_sport','sports','secondary_sports','position','positions','graduation_year','gpa','height','weight','city','state','highlights','club_name','handle','audience_size','platforms'])if(profile[key]!=null)senderProfile[key]=profile[key];
 if(role==='athlete')return {functionName:'generate-letter',body:{letterType:({'intro':'contact','recruiting':'contact','thank_you':'thank-you','update':'follow-up','endorsement':'contact'} as Record<string,string>)[draft.letterType]||draft.letterType,coachName:draft.recipientName,schoolName:draft.schoolName,athleteProfile:senderProfile,customContext:context}};
 const senderType=role==='high_school_coach'?'hs-coach':role==='club_coach'?'club-coach':role==='agency'?'scout':role;
 const recipientType=['athlete','parent'].includes(draft.recipientCategory)?draft.recipientCategory:'coach';
 const recipientInfo={name:draft.recipientName,title:draft.recipientRole||undefined,organization:draft.schoolName||undefined,school:recipientType==='athlete'?draft.schoolName||undefined:undefined};
 return{functionName:'generate-coach-scout-letter',body:{senderType,senderProfile,letterType:draft.letterType,recipientType,recipientCategory:draft.recipientCategory,recipientInfo,athleteInfo:recipientInfo,customContext:context}};
}
