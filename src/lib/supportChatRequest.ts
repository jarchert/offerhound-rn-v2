/** Signed-in personalization must use a verified session, not a client role claim. */
export async function supportChatHeaders(client:any,anonKey:string,authenticated:boolean) {
  let token=anonKey;
  if(authenticated) {
    const {data,error}=await client.auth.getSession();
    if(error||!data?.session?.access_token) {
      const failure=new Error('Please sign in again. Your question is kept.');failure.name='SessionRequiredError';throw failure;
    }
    token=data.session.access_token;
  }
  return {Authorization:`Bearer ${token}`,apikey:anonKey,'Content-Type':'application/json'};
}
export function supportChatTurns(turns:Array<{role:string;content:string}>) {
  const messages=turns.filter(turn=>['user','assistant'].includes(turn.role)&&typeof turn.content==='string'&&turn.content.trim()).slice(-20).map(turn=>({role:turn.role,content:turn.content.slice(0,4000)}));
  if(messages.at(-1)?.role!=='user')throw Error('A question is required.');
  return messages;
}
