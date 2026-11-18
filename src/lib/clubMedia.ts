/** Native implementation of the independently versioned club media API contract. */
export type ClubGallery={owner_user_id:string;label:string;is_own:boolean;can_manage:boolean};
export type ClubMediaFields={caption?:string;event_name?:string;team_id?:string|null;tags?:string[];is_featured?:boolean};
export type ClubPendingUpload={path:string;owner:string;uploaded:boolean;fields:ClubMediaFields};
export function detectClubFile(bytes:ArrayBuffer){
 const b=new Uint8Array(bytes);const ascii=(start:number,end:number)=>String.fromCharCode(...b.slice(start,end));let ext='',mime='',type='image',limit=10*1024*1024;
 if(b[0]===255&&b[1]===216&&b[2]===255){ext='jpg';mime='image/jpeg';}
 else if(b[0]===137&&ascii(1,4)==='PNG'&&b[4]===13&&b[5]===10&&b[6]===26&&b[7]===10){ext='png';mime='image/png';}
 else if(ascii(0,4)==='RIFF'&&ascii(8,12)==='WEBP'){ext='webp';mime='image/webp';}
 else if(ascii(4,8)==='ftyp'){const qt=ascii(8,12)==='qt  ';ext=qt?'mov':'mp4';mime=qt?'video/quicktime':'video/mp4';type='video';limit=50*1024*1024;}
 else if(b[0]===26&&b[1]===69&&b[2]===223&&b[3]===163&&ascii(0,Math.min(b.length,8192)).includes('webm')){ext='webm';mime='video/webm';type='video';limit=50*1024*1024;}
 if(!ext)throw Error('Choose a JPEG, PNG, WebP photo or MP4, MOV, WebM video.');
 if(bytes.byteLength<12||bytes.byteLength>limit)throw Error(type==='image'?'Photos must be smaller than 10 MB.':'Videos must be smaller than 50 MB.');return{ext,mime,type};
}
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
export function clubFilePath(owner:string,nonce:string,ext:string){if(!uuid.test(owner)||!uuid.test(nonce)||!['jpg','png','webp','mp4','mov','webm'].includes(ext))throw Error('Invalid media destination.');return owner+'/'+nonce+'.'+ext;}
export function clubHttpsLink(value:string,video=false){let url:URL;try{url=new URL(value.trim());}catch{throw Error('Enter a valid HTTPS link.');}if(url.protocol!=='https:'||url.username||url.password)throw Error('Enter a valid HTTPS link.');const h=url.hostname.toLowerCase();if(video&&!(h==='youtu.be'||h==='youtube.com'||h.endsWith('.youtube.com')||h==='youtube-nocookie.com'||h.endsWith('.youtube-nocookie.com')))throw Error('Use a YouTube link or upload the video file.');return url.toString();}
export function clubFields(input:ClubMediaFields){const fields={caption:input.caption?.trim()||null,event_name:input.event_name?.trim()||null,team_id:input.team_id||null,tags:(input.tags||[]).map(v=>v.trim()).filter(Boolean),is_featured:!!input.is_featured};if((fields.caption?.length||0)>500||(fields.event_name?.length||0)>200||fields.tags.length>20||fields.tags.some(t=>t.length>40))throw Error('Use a caption up to 500 characters, event name up to 200, and up to 20 tags of 40 characters each.');return fields;}
export async function clubMediaAction(client:any,body:any){const {data,error}=await client.functions.invoke('club-media',{body});if(error||data?.error){let detail=data;try{if(!detail&&error?.context?.json)detail=await error.context.json();}catch{}const failure:any=new Error(detail?.error||'The media request could not be confirmed. Try again.');failure.code=detail?.code;failure.fileRemoved=detail?.file_removed===true;throw failure;}return data;}
export async function clubGalleries(client:any){const result=await client.rpc('club_media_galleries');if(result.error)throw result.error;return(result.data||[]) as ClubGallery[];}
export async function clubMediaRows(client:any,owner:string,options:{page?:number;team?:string;type?:string;search?:string}={}){
 const page=Math.max(0,options.page||0);let query=client.from('club_media').select('*,teams(name)',{count:'exact'}).eq('coach_user_id',owner);
 if(options.team&&options.team!=='all')query=query.eq('team_id',options.team);
 if(options.type&&options.type!=='all')query=query.eq('media_type',options.type);
 const term=options.search?.trim().slice(0,200);if(term){const pattern=JSON.stringify('%'+term.replace(/[%_\\]/g,c=>'\\'+c)+'%');query=query.or('caption.ilike.'+pattern+',event_name.ilike.'+pattern+',tags.cs.{'+JSON.stringify(term)+'}');}
 const result=await query.order('created_at',{ascending:false}).order('id').range(page*50,(page+1)*50-1);if(result.error)throw result.error;
 const rows=result.data||[],paths=[...new Set<string>(rows.map((r:any)=>r.storage_path).filter(Boolean))];let previews=new Map<string,string>();if(paths.length){const signed=await client.storage.from('club-media').createSignedUrls(paths,3600);if(signed.error)throw signed.error;for(const item of signed.data||[])if(item.path&&item.signedUrl&&!item.error)previews.set(item.path,item.signedUrl);}
 if(result.count===null||result.count===undefined)throw Error('Gallery count could not be confirmed.');
 return {items:rows.map((row:any)=>({...row,preview_url:row.storage_path?previews.get(row.storage_path)||null:null})),total:result.count};
}
export async function saveClubFile(client:any,options:{owner:string;nonce:string;bytes:ArrayBuffer;fields:ClubMediaFields;pending?:ClubPendingUpload|null;onPending:(value:ClubPendingUpload)=>void}){
 const kind=detectClubFile(options.bytes),fields=clubFields(options.fields);let pending=options.pending;
 if(pending&&pending.owner!==options.owner)throw Error('Return to the original gallery to finish this upload.');
 if(!pending){pending={path:clubFilePath(options.owner,options.nonce,kind.ext),owner:options.owner,uploaded:false,fields:fields as any};options.onPending(pending);}
 if(!pending.uploaded){const result=await client.storage.from('club-media').upload(pending.path,options.bytes,{contentType:kind.mime,upsert:false});if(result.error&&Number(result.error.statusCode)!==409)throw result.error;pending={...pending,uploaded:true};options.onPending(pending);}
 const result=await clubMediaAction(client,{action:'finalize',storage_path:pending.path,...pending.fields});if(!result?.media?.id)throw Error('The media save was not confirmed. Retry to check it.');return result.media;
}
export async function saveClubLink(client:any,owner:string,type:string,url:string,input:ClubMediaFields){const fields=clubFields(input);const result=await client.from('club_media').insert({coach_user_id:owner,media_type:type==='video'?'video':'link',url:clubHttpsLink(url,type==='video'),storage_path:null,mime_type:null,byte_size:null,uploaded_by:null,...fields}).select().single();if(result.error)throw result.error;if(!result.data?.id)throw Error('The link was not saved.');return result.data;}
export async function discardClubFile(client:any,pending:ClubPendingUpload){const saved=await client.from('club_media').select('id').eq('storage_path',pending.path).maybeSingle();if(saved.error)throw saved.error;if(saved.data)return;const result=await client.storage.from('club-media').remove([pending.path]);if(result.error)throw result.error;}
export async function deleteClubMedia(client:any,id:string){const result=await clubMediaAction(client,{action:'delete',media_id:id});if(result?.deleted?.id!==id)throw Error('Deletion was not confirmed. Retry before removing this item.');return result.deleted;}
export async function featureClubMedia(client:any,id:string,featured:boolean){const result=await client.from('club_media').update({is_featured:featured}).eq('id',id).select('id').single();if(result.error)throw result.error;if(!result.data?.id)throw Error('This item could not be changed.');}
