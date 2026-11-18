/** Public links follow each destination identity contract; college coaches have a directory, not a registered-coach profile route. */
export function roleShareCard(role:string,profiles:any,user:any,origin:string) {
 const p=role==='athlete'?profiles.player:role==='hs_coach'?profiles.hs:role==='scout'?profiles.scout:role==='club_coach'?profiles.club:role==='influencer'?profiles.influencer:profiles.coach;
 const id=p?.id?encodeURIComponent(p.id):null;
 let path:string|null=null;
 if(role==='athlete')path=p?.custom_url?'/p/'+encodeURIComponent(p.custom_url):id?'/p/'+id:null;
 else if(role==='coach')path='/coaches';
 else if(role==='club_coach')path=id?'/club-coach/'+id:null;
 else if(role==='hs_coach')path=id?'/hs-coach/'+id:null;
 else if(role==='scout')path=id?'/scouts/'+id:null;
 else if(role==='influencer')path=p?.handle?'/influencers/'+encodeURIComponent(p.handle):null;
 return {name:p?.full_name||p?.name||p?.display_name||p?.club_name||'Profile not complete',title:role==='athlete'?[p?.sport,p?.position].filter(Boolean).join(' · '):p?.title||p?.position_coached||'',organization:p?.club_name||p?.school_name||p?.school||p?.company||'',email:p?.email||user?.email||'',link:path?origin+path:null};
}
