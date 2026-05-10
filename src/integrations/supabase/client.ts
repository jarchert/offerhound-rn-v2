import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import type { Database as TypedDatabase } from './types';

// Permissive overlay: keep typed enums + helpers but make all table queries loose,
// since not every table has a generated row type yet.
type Database = Omit<TypedDatabase, 'public'> & {
  public: Omit<TypedDatabase['public'], 'Tables'> & {
    Tables: Record<string, { Row: any; Insert: any; Update: any; Relationships: [] }>;
  };
};

export const SUPABASE_URL = 'https://abdzdcgsmdlnytkkhvtb.supabase.co';
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiZHpkY2dzbWRsbnl0a2todnRiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU4OTcyMTcsImV4cCI6MjA4MTQ3MzIxN30.2tvNgfIc0BD53GsAJk1oF88vK3lW1RVZSouMsOa4J3I';

/** Reliable functions base URL — never relies on private supabase-js fields. */
export const SUPABASE_FUNCTIONS_URL = `${SUPABASE_URL}/functions/v1`;

// SecureStore adapter for Supabase auth persistence (better than AsyncStorage for auth tokens).
// Every call is wrapped in try/catch + resolved to null on failure so a
// corrupted keychain entry can never synchronously throw into supabase-js's
// auth-client init and hang the JS splash.
const SecureStoreAdapter = {
  getItem: async (key: string) => {
    try {
      return await SecureStore.getItemAsync(key);
    } catch (e) {
      console.warn('[supabase/storage] getItem failed', key, e);
      return null;
    }
  },
  setItem: async (key: string, value: string) => {
    try {
      await SecureStore.setItemAsync(key, value);
    } catch (e) {
      console.warn('[supabase/storage] setItem failed', key, e);
    }
  },
  removeItem: async (key: string) => {
    try {
      await SecureStore.deleteItemAsync(key);
    } catch (e) {
      console.warn('[supabase/storage] removeItem failed', key, e);
    }
  },
};

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: SecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Helper to invoke edge functions
export async function invokeEdgeFunction<T = any>(
  functionName: string,
  body?: object,
): Promise<T> {
  const { data, error } = await supabase.functions.invoke(functionName, {
    body,
  });
  if (error) throw error;
  return data as T;
}
