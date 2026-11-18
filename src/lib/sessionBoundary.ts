/** Clear session-only query data before exposing another account's screen graph. */
export function createSessionBoundary(client:{cancelQueries:()=>Promise<unknown>;clear:()=>void}){
 let userId:string|null=null,generation=0,request=0;
 return {
  change(next:string|null){if(next===userId)return false;userId=next;generation++;request++;void client.cancelQueries().catch(()=>{});client.clear();return true;},
  begin(id:string){return {id,generation,request:++request};},
  current(ticket:{id:string;generation:number;request:number}){return ticket.id===userId&&ticket.generation===generation&&ticket.request===request;},
 };
}
