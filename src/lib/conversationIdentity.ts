/** Resolve only a conversation counterpart's display identity through RLS.
 * Participant ordering in legacy conversations does not encode their roles.
 * Never request contact fields or bypass profile visibility to fill a label.
 */
export async function resolveConversationIdentity(client: any, userId: string, role?:string) {
  const candidates = [
    {roles:['athlete'],table: 'player_profiles', columns: 'full_name,profile_image_url', name: 'full_name'},
    {roles:['coach','club_coach'],table: 'coach_profiles', columns: 'name', name: 'name'},
    {roles:['scout','agency','organization'],table: 'scout_profiles', columns: 'name', name: 'name'},
    {roles:['high_school_coach'],table:'high_school_coach_profiles',columns:'name',name:'name'},
    {roles:['influencer'],table:'influencer_profiles',columns:'display_name',name:'display_name'},
  ];
  const profiles = await Promise.all(candidates.filter(candidate=>role ? candidate.roles.includes(role) : candidate.roles.some(r=>['athlete','coach','scout'].includes(r))).map(async candidate => {
    try {
      const {data,error} = await client.from(candidate.table).select(candidate.columns).eq('user_id',userId).maybeSingle();
      const name = typeof data?.[candidate.name] === 'string' ? data[candidate.name].trim() : '';
      return !error && name ? {name,image:data.profile_image_url || null,identified:true} : null;
    } catch { return null; }
  }));
  return profiles.find(Boolean) || {name:'Recipient unavailable',image:null,identified:false};
}
