/** Confirm owner-scoped metadata before removing bytes. Uncertain reads keep files intact. */
export function creatorGalleryPaths(userId:string,path:string,isWatermarked:boolean){
 if(!userId||typeof path!=='string'||!path.startsWith(`${userId}/`)||path.includes('\\')||path.split('/').some(part=>!part||part==='.'||part==='..')||!/^[-a-zA-Z0-9_/]+\.[a-zA-Z0-9]+$/.test(path))throw new Error('Gallery file ownership could not be confirmed.');
 return [...new Set([path,...(isWatermarked?[path.replace(/\.[^.]+$/,'_wm.png')]:[])])];
}
export async function cleanupCreatorGalleryFiles(client:any,userId:string,paths:string[]){
 if(!paths.length)return {cleanupPending:false};
 try{
  for(const path of paths)creatorGalleryPaths(userId,path,false);
  const urls=paths.map(path=>client.storage.from('influencer-media').getPublicUrl(path).data.publicUrl);
  const [originals,displays]=await Promise.all([
   client.from('influencer_gallery').select('id').in('original_path',paths).limit(1),
   client.from('influencer_gallery').select('id').in('file_url',urls).limit(1)
  ]);
  if(originals.error||displays.error)return {cleanupPending:true};
  if(originals.data?.length||displays.data?.length)return {cleanupPending:false,referenced:true};
  const removed=await client.storage.from('influencer-media').remove(paths);
  const names=new Set((removed.data||[]).map((item:any)=>item.name));
  if(removed.error||paths.some(path=>!names.has(path)))return {cleanupPending:true};
  // A removal response alone does not prove the private storage record disappeared.
  for(const path of paths){
   const slash=path.lastIndexOf('/'),folder=path.slice(0,slash),name=path.slice(slash+1);
   const readback=await client.storage.from('influencer-media').list(folder,{limit:100,search:name});
   if(readback.error||!Array.isArray(readback.data)||readback.data.some((item:any)=>item.name===name))return {cleanupPending:true};
  }
  return {cleanupPending:false};
 }catch{return {cleanupPending:true};}
}
export async function updateCreatorGallery(client:any,input:{userId:string;influencerId:string;id:string;title?:string;description?:string;isFeatured?:boolean;displayOrder?:number}){
 if(!input.userId||!input.influencerId||!input.id)throw new Error('Sign in and reload your gallery.');
 const fields:Record<string,unknown>={};
 if(input.title!==undefined){if(input.title.trim().length>200)throw new Error('Title must be 200 characters or fewer.');fields.title=input.title.trim()||null;}
 if(input.description!==undefined){if(input.description.length>2000)throw new Error('Description must be 2000 characters or fewer.');fields.description=input.description.trim()||null;}
 if(input.isFeatured!==undefined)fields.is_featured=input.isFeatured;
 if(input.displayOrder!==undefined){if(!Number.isInteger(input.displayOrder)||input.displayOrder<0)throw new Error('Choose a valid gallery order.');fields.display_order=input.displayOrder;}
 if(!Object.keys(fields).length)throw new Error('Choose a gallery change.');
 const result=await client.from('influencer_gallery').update(fields).eq('id',input.id).eq('influencer_id',input.influencerId).eq('user_id',input.userId).select('id,title,description,is_featured,display_order').single();
 if(result.error)throw result.error;
 if(result.data?.id!==input.id||Object.entries(fields).some(([key,value])=>result.data[key]!==value))throw new Error('Gallery change was not confirmed. Your edits are unchanged; reload before retrying.');return result.data;
}
export async function deleteCreatorGallery(client:any,input:{userId:string;influencerId:string;id:string}){
 if(!input.userId||!input.influencerId||!input.id)throw new Error('Sign in and reload your gallery.');
 const before=await client.from('influencer_gallery').select('id,original_path,is_watermarked').eq('id',input.id).eq('influencer_id',input.influencerId).eq('user_id',input.userId).single();if(before.error)throw before.error;if(before.data?.id!==input.id)throw new Error('Gallery item is unavailable.');
 let paths:string[]=[];let unsafe=false;try{paths=creatorGalleryPaths(input.userId,before.data.original_path,before.data.is_watermarked===true);}catch{unsafe=true;}
 const removed=await client.from('influencer_gallery').delete().eq('id',input.id).eq('influencer_id',input.influencerId).eq('user_id',input.userId).select('id').single();if(removed.error)throw removed.error;if(removed.data?.id!==input.id)throw new Error('Gallery removal was not confirmed. Files were kept.');
 return unsafe?{cleanupPending:true}:cleanupCreatorGalleryFiles(client,input.userId,paths);
}
export async function moveCreatorGallery(client:any,userId:string,influencerId:string,items:{id:string;is_featured?:boolean}[],from:number,to:number){
 if(from===to)return;if(!Number.isInteger(from)||!Number.isInteger(to)||from<0||to<0||from>=items.length||to>=items.length)throw new Error('Choose a valid gallery position.');
 if(!!items[from].is_featured!==!!items[to].is_featured)throw new Error('Featured items stay before other gallery items.');
 const order=[...items];order.splice(to,0,order.splice(from,1)[0]);let saved=0;
 try{for(let index=0;index<order.length;index++){await updateCreatorGallery(client,{userId,influencerId,id:order[index].id,displayOrder:index});saved++;}}catch{throw new Error(saved?'Gallery order was partly saved. Reload before moving another item.':'Gallery order was not saved. Reload before retrying.');}
}
