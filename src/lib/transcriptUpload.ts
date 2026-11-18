export type NativeTranscriptFile={uri?:string;name:string;type:string;size?:number;arrayBuffer?:()=>Promise<ArrayBuffer>};
export async function uploadTranscriptFile(client:any,input:{userId:string;athleteProfileId:string;uploadId:string;file:NativeTranscriptFile;semester?:string;year?:string;gpa?:string;isOfficial?:boolean;notes?:string}){
 if(!input.userId||!input.athleteProfileId)throw new Error('Profile not ready.');
 if(input.file.type!=='application/pdf')throw new Error('Only PDF files are supported.');
 if((input.file.size||0)>10*1024*1024)throw new Error('File must be 10MB or less.');
 const bytes=input.file.uri?await (await fetch(input.file.uri)).arrayBuffer():await input.file.arrayBuffer?.();
 if(!bytes?.byteLength||bytes.byteLength>10*1024*1024)throw new Error('Choose a nonempty PDF under 10MB.');
 const header=new Uint8Array(bytes,0,Math.min(5,bytes.byteLength));if(header.length!==5||![37,80,68,70,45].every((value,index)=>header[index]===value))throw new Error('This file is not a supported PDF.');
 const name=input.file.name.replace(/[^a-zA-Z0-9._-]/g,'_').slice(-150)||'transcript.pdf';
 if(!/^[a-zA-Z0-9_-]+$/.test(input.uploadId))throw new Error('Upload identity is unavailable.');
 const path=`${input.userId}/${input.uploadId}_${name}`;
 const uploaded=await client.storage.from('transcripts').upload(path,bytes,{contentType:'application/pdf',upsert:false});if(uploaded.error)throw uploaded.error;
 const payload={user_id:input.userId,athlete_profile_id:input.athleteProfileId,file_name:input.file.name,file_path:path,file_size_bytes:bytes.byteLength,semester:input.semester||null,year:input.year||null,gpa:input.gpa||null,is_official:input.isOfficial??false,notes:input.notes||null};
 const confirmed=(row:any)=>!!row?.id&&row.user_id===input.userId&&row.athlete_profile_id===input.athleteProfileId&&row.file_path===path;
 try{const saved=await client.from('academic_transcripts').insert(payload).select('*').single();if(saved.error)throw saved.error;if(!confirmed(saved.data))throw new Error('Missing save acknowledgment.');return saved.data;}catch{
  // Reconcile a lost acknowledgment before retrying or removing any private bytes.
  let existing:any;try{existing=await client.from('academic_transcripts').select('*').eq('file_path',path).maybeSingle();}catch{throw new Error('Upload completed; transcript save could not be confirmed. Reload before retrying.');}
  if(existing.error)throw new Error('Upload completed; transcript save could not be confirmed. Reload before retrying.');
  if(confirmed(existing.data))return existing.data;
  if(existing.data)throw new Error('Transcript save could not be confirmed. Files were kept. Reload before retrying.');
  let cleaned=false;try{const removal=await client.storage.from('transcripts').remove([path]);cleaned=!removal.error&&(removal.data||[]).some((row:any)=>row.name===path);}catch{}
  throw new Error(cleaned?'Transcript was not saved. The unreferenced upload was discarded; your form is unchanged.':'Transcript was not saved; private file cleanup is pending. Your form is unchanged.');
 }
}
