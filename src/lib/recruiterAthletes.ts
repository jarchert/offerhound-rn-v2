/** Recruiters resolve athlete display fields through the listing-safe view, never a raw-profile join. */
export async function hydrateRecruiterAthletes(client:any,rows:any[],property='athlete'){
 const ids=[...new Set(rows.map(r=>r.athlete_profile_id).filter((id:any)=>typeof id==='string'&&id))];
 if(!ids.length)return rows;
 const visible=new Map<string,any>();
 for(let offset=0;offset<ids.length;offset+=100){const result=await client.from('player_profiles_recruiter_safe').select('id,full_name,position,school,graduation_year,city,state,profile_image_url,custom_url,sport').in('id',ids.slice(offset,offset+100));if(result.error)throw result.error;for(const p of result.data||[])visible.set(p.id,p);}
 return rows.map(row=>!row.athlete_profile_id?{...row,[property]:null,athlete_unavailable:false}:({...row,[property]:visible.get(row.athlete_profile_id)||{id:row.athlete_profile_id,full_name:'Athlete no longer available'},athlete_unavailable:!visible.has(row.athlete_profile_id)}));
}
export async function recruiterShortlist(client:any,userId:string){
 const rows:any[]=[];for(let offset=0;;offset+=500){const result=await client.from('saved_athletes').select('*').eq('coach_user_id',userId).order('saved_at',{ascending:false}).order('id').range(offset,offset+499);if(result.error)throw result.error;rows.push(...(result.data||[]));if((result.data||[]).length<500)break;}
 return hydrateRecruiterAthletes(client,[...new Map(rows.map(r=>[r.id,r])).values()]);
}
