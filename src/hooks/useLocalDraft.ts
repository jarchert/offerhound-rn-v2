import {useEffect, useRef, useState} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {SUPABASE_URL} from '@/integrations/supabase/client';

type Update<T> = T | ((previous:T)=>T);
const cache = new Map<string,unknown>();
const writes = new Map<string,Promise<void>>();
/** Device-local drafts, isolated by backend, account and destination. Never store auth tokens here. */
export function useLocalDraft<T>(userId:string|undefined, destination:string, initial:T) {
  const key = userId ? `offerhound.draft.v1:${SUPABASE_URL}:${userId}:${destination}` : null;
  const initialRef=useRef(initial);
  initialRef.current=initial;
  const [state,setState]=useState<{key:string|null;value:T}>(()=>({key,value:key&&cache.has(key)?cache.get(key) as T:initial}));
  const [storageError,setStorageError]=useState(false);
  const [hydratedKey,setHydratedKey]=useState<string|null>(()=>key&&cache.has(key)?key:null);
  useEffect(()=>{
    let active=true;
    setStorageError(false);
    if(!key)return;
    if(cache.has(key)){setState({key,value:cache.get(key) as T});setHydratedKey(key);return;}
    AsyncStorage.getItem(key).then(raw=>{
      if(!active)return;
      // A typed edit made while hydration was pending wins over stale disk contents.
      const value=cache.has(key)?cache.get(key) as T:raw?JSON.parse(raw) as T:initialRef.current;
      cache.set(key,value);setState({key,value});setHydratedKey(key);
    }).catch(()=>{if(active){setStorageError(true);setHydratedKey(key);}});
    return()=>{active=false;};
  },[key]);
  const value=state.key===key?state.value:initialRef.current;
  const current=useRef(value);current.current=value;
  const setValue=(update:Update<T>)=>{
    // A completion from an unmounted editor must see edits made by its replacement.
    const previous=key&&cache.has(key)?cache.get(key) as T:current.current;
    const next=typeof update==='function'?(update as (p:T)=>T)(previous):update;
    current.current=next;setState({key,value:next});
    if(!key)return;
    cache.set(key,next);
    const serialized=JSON.stringify(next);
    const write=(writes.get(key)||Promise.resolve()).catch(()=>{}).then(()=>AsyncStorage.setItem(key,serialized));
    writes.set(key,write);
    write.catch(()=>setStorageError(true)).finally(()=>{if(writes.get(key)===write)writes.delete(key);});
  };
  return [value,setValue,storageError,!key||hydratedKey===key] as const;
}
