/** Team owner foreign keys are mutually exclusive in the backend contract. */
export function teamOwnership(clubProfileId?:string,hsCoachProfileId?:string,level='competitive') {
  if (!!clubProfileId === !!hsCoachProfileId) throw new Error('Exactly one team owner profile is required.');
  return hsCoachProfileId
    ? {club_coach_id:null,hs_coach_profile_id:hsCoachProfileId,level:'high_school'}
    : {club_coach_id:clubProfileId!,hs_coach_profile_id:null,level:level==='high_school'?'competitive':level};
}
