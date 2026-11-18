/** Format a SQL calendar date without interpreting its midnight as UTC. */
export function formatNativeCampDay(iso:string,locale?:string):string {
 const match=/^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
 if(!match)return 'Date to be confirmed';
 const year=Number(match[1]),month=Number(match[2]),day=Number(match[3]);
 const local=new Date(year,month-1,day);
 if(local.getFullYear()!==year||local.getMonth()!==month-1||local.getDate()!==day)return 'Date to be confirmed';
 return new Intl.DateTimeFormat(locale,{month:'short',day:'numeric',year:'numeric'}).format(local);
}
export async function readPublicCampCount(client:any,id:string):Promise<number>{
 const response=await client.rpc('public_camp_enrollment_count',{p_camp_id:id});
 if(response.error)throw response.error;
 const count=response.data;
 if(typeof count!=='number'||!Number.isSafeInteger(count)||count<0)throw Error('Camp availability must be confirmed during registration.');
 return count;
}
