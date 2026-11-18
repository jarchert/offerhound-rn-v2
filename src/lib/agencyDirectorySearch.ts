import {literalSearchText} from './recruiterSportFilter';
/** Quote each PostgREST OR value; punctuation and wildcard characters remain search text. */
export function agencyDirectorySearch(value:string){
 const pattern=JSON.stringify(`%${literalSearchText(value.trim())}%`);
 return ['name','title','specialization'].map(column=>`${column}.ilike.${pattern}`).join(',');
}
