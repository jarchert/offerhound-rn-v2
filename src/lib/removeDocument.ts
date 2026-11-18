/** Remove metadata only after the server acknowledges the expected row. A rejected
 * delete must never destroy the file still referenced by that row. */
export async function removeDocument(client:any,options:{table:string;bucket:string;id:string;path:string;scope:Record<string,string>}){
 let deletion=client.from(options.table).delete().eq('id',options.id).eq('file_path',options.path);
 for(const [field,value] of Object.entries(options.scope))deletion=deletion.eq(field,value);
 const removed=await deletion.select('id').single();if(removed.error)throw removed.error;if(removed.data?.id!==options.id)throw Error('Document deletion was not confirmed.');
 const remaining=await client.from(options.table).select('id').eq('file_path',options.path).limit(1);if(remaining.error)return{cleanupPending:true};if(remaining.data?.length)return{cleanupPending:false};
 const file=await client.storage.from(options.bucket).remove([options.path]);return{cleanupPending:!!file.error};
}
