export const guardianProfileFields = ['school','graduation_year','city','state','jersey_number','positions','position','height','weight','gpa','bio'] as const;
export const guardianProfileSelect = ['id','updated_at','is_minor_safe',...guardianProfileFields].join(',');
const limits:Record<string,number>={school:120,city:80,state:40,height:12,bio:2000};
export function guardianProfilePatch(original:any, draft:Record<string,string>) {
 const patch:Record<string,any>={};
 for(const [key,raw] of Object.entries(draft)) {
  if(!guardianProfileFields.includes(key as any)||key==='position')throw Error('This field cannot be edited here.');
  if(['height','weight','gpa','bio'].includes(key)&&original.is_minor_safe!==false)continue;
  const value=raw.trim();let normalized:any=value||null;
  if(value&&limits[key]&&value.length>limits[key])throw Error(`${key.replaceAll('_',' ')} is too long.`);
  if(key==='graduation_year'&&value&&!/^20\d{2}$/.test(value))throw Error('Enter a four-digit graduation year starting with 20.');
  if(key==='jersey_number'&&value&&!/^\d{1,3}$/.test(value))throw Error('Jersey number must contain one to three digits.');
  if(key==='weight'&&value&&(!Number.isFinite(Number(value))||Number(value)<50||Number(value)>450))throw Error('Weight must be between 50 and 450.');
  if(key==='gpa'&&value&&(!Number.isFinite(Number(value))||Number(value)<0||Number(value)>5))throw Error('GPA must be between 0 and 5.');
  if(key==='positions') { normalized=value?value.split(',').map(x=>x.trim()).filter(Boolean):[];if(normalized.length>5||normalized.some((x:string)=>x.length>40))throw Error('Enter up to five positions, each no longer than 40 characters.'); }
  const prior=key==='positions'?(original.positions?.length?original.positions:original.position?[original.position]:[]):original[key]??null;
  if(JSON.stringify(normalized)!==JSON.stringify(prior)&&!(typeof prior==='number'&&normalized!==null&&Number(normalized)===prior))patch[key]=normalized;
 }
 if('positions'in patch)patch.position=patch.positions[0]||null;
 return patch;
}
function equal(row:any,patch:Record<string,any>){return Object.entries(patch).every(([k,v])=>JSON.stringify(row[k]??null)===JSON.stringify(v??null)||(typeof row[k]==='number'&&v!==null&&Number(v)===row[k]));}
export async function saveGuardianProfile(client:any, original:any, patch:Record<string,any>){
 if(!original.id||!original.updated_at)throw Error('Reload this profile before editing.');
 if(!Object.keys(patch).length)return original;
 if(Object.keys(patch).some(k=>!guardianProfileFields.includes(k as any)))throw Error('This field cannot be edited here.');
 if(original.is_minor_safe!==false&&Object.keys(patch).some(k=>['height','weight','gpa','bio'].includes(k)))throw Error('These details are protected for this profile.');
 const {data,error}=await client.from('player_profiles').update(patch).eq('id',original.id).eq('updated_at',original.updated_at).select(guardianProfileSelect);
 if(error)throw Error(error.code==='42501'?'You do not have permission to save these changes.':'Changes were not confirmed. Your edits are kept; retry to check the same changes.');
 if(data?.length===1){if(!equal(data[0],patch))throw Error('Some changes were not saved. Reload the profile to review.');return data[0];}
 if(data?.length)throw Error('Changes were not confirmed. Reload the profile.');
 const latest=await client.from('player_profiles').select(guardianProfileSelect).eq('id',original.id).maybeSingle();
 if(latest.error)throw Error('Changes were not confirmed. Your edits are kept; retry to check the same changes.');
 if(!latest.data)throw Error('You no longer have permission to edit this profile.');
 if(equal(latest.data,patch))return latest.data;
 if(latest.data.updated_at===original.updated_at)throw Error('You do not have permission to save these changes.');
 throw Error('This profile changed elsewhere. Cancel and reload before editing again.');
}
