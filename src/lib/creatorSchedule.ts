/** Interpret an explicit future local date/time without silently rolling invalid calendar values. */
export function creatorScheduleTime(date:string,time:string,now=Date.now()):string{
 if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!/^\d{2}:\d{2}$/.test(time))throw new Error('Enter a date as YYYY-MM-DD and time as HH:MM.');
 const [y,m,d]=date.split('-').map(Number),[h,min]=time.split(':').map(Number);
 const value=new Date(y,m-1,d,h,min,0,0);
 if(value.getFullYear()!==y||value.getMonth()!==m-1||value.getDate()!==d||value.getHours()!==h||value.getMinutes()!==min)throw new Error('Choose a valid date and local time.');
 if(value.getTime()<=now)throw new Error('Choose a future date and time.');
 return value.toISOString();
}
export function creatorContentUrl(value:string){const text=value.trim();if(!text)return undefined;let url:URL;try{url=new URL(text)}catch{throw new Error('Use a valid http:// or https:// content link.')}if(!['http:','https:'].includes(url.protocol)||url.username||url.password)throw new Error('Use a valid http:// or https:// content link.');return text;}
export function isCreatorContentUrl(value:unknown):value is string{try{return typeof value==='string'&&!!creatorContentUrl(value)}catch{return false}}
