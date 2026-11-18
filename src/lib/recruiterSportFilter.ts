/** Requirements-only parity: primary and secondary sports narrow the safe listing on the server. */
export function recruiterSportTerms(...profiles:any[]):string[]{
 const values=profiles.flatMap(p=>[p?.sport,p?.specialization,...(Array.isArray(p?.sports)?p.sports:[])]).map(v=>typeof v==='string'?v:v?.sport).filter((v:any)=>typeof v==='string');
 const terms=new Set<string>();for(const value of values){const s=value.trim().toLowerCase();if(['track','track-field','track and field','track field','track & field'].includes(s)){for(const t of ['track','track-field','track and field','track field','Track & Field'])terms.add(t);}else if(/^[a-z -]{1,40}$/.test(s)) terms.add(s);}return [...terms];
}
export function recruiterSportFilter(terms:string[]):string{
 return terms.flatMap(s=>[`sport.ilike.${JSON.stringify(s)}`,`secondary_sports.cs.${JSON.stringify([s])}`,`secondary_sports.cs.${JSON.stringify([{sport:s}])}`]).join(',');
}
export function literalSearchText(value:string){return value.replace(/[\\%_]/g,'\\$&');}
