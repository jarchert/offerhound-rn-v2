export type PendingNilRequest = { sessionId: string; message: string; requestKey: string };
/** A retry nonce only; authorization always comes from the verified user/session. */
export function nilRequest(previous: PendingNilRequest | null, sessionId: string, message: string): PendingNilRequest {
  if(previous?.sessionId === sessionId && previous.message === message) return previous;
  const requestKey = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,c=>{
    const n=Math.floor(Math.random()*16); return (c==='x'?n:(n&3)|8).toString(16);
  });
  return {sessionId,message,requestKey};
}
