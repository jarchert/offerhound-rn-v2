export async function readAthleteSearchListing(client:any,profileId:string){
 const r=await client.rpc('get_athlete_search_listing',{p_athlete_profile_id:profileId});
 if(r.error||r.data?.ok!==true||r.data.profile_id!==profileId||typeof r.data.listed!=='boolean'||!Array.isArray(r.data.reasons)||![true,false,null].includes(r.data.show_in_search))throw Error('Could not load search visibility.');
 return r.data as {ok:true;profile_id:string;show_in_search:boolean|null;listed:boolean;visibility:string;reasons:string[]};
}
export async function changeAthleteSearchListing(client:any,profileId:string,listed:boolean){
 const r=await client.rpc('set_athlete_search_listing',{p_athlete_profile_id:profileId,p_listed:listed});
 if(r.error||r.data?.ok!==true||r.data.profile_id!==profileId||r.data.show_in_search!==listed)throw Error('Search visibility was not confirmed. Reload before trying again.');
 return r.data;
}
