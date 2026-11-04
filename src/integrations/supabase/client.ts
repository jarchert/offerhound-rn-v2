import 'react-native-url-polyfill/auto';
import { resolveBackendEnvironment } from '@/lib/backendEnvironment';
import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import type { Database as TypedDatabase } from './types';

// Permissive overlay: keep typed enums + helpers but make all table queries loose,
// since not every table has a generated row type yet.
type Database = Omit<TypedDatabase, 'public'> & {
  public: Omit<TypedDatabase['public'], 'Tables' | 'Functions'> & {
    Tables: Record<string, { Row: any; Insert: any; Update: any; Relationships: [] }>;
    Functions: TypedDatabase['public']['Functions'] & {
      is_admin: { Args: Record<string, never>; Returns: boolean };
    };
  };
};

const PRODUCTION_SUPABASE_URL = 'https://abdzdcgsmdlnytkkhvtb.supabase.co';
const PRODUCTION_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiZHpkY2dzbWRsbnl0a2todnRiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU4OTcyMTcsImV4cCI6MjA4MTQ3MzIxN30.2tvNgfIc0BD53GsAJk1oF88vK3lW1RVZSouMsOa4J3I';

const backend = resolveBackendEnvironment({
  appEnv: process.env.EXPO_PUBLIC_APP_ENV,
  url: process.env.EXPO_PUBLIC_SUPABASE_URL,
  anonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
}, { url: PRODUCTION_SUPABASE_URL, anonKey: PRODUCTION_SUPABASE_ANON_KEY });
export const SUPABASE_URL = backend.url;
export const SUPABASE_ANON_KEY = backend.anonKey;

// SecureStore adapter for Supabase auth persistence (better than AsyncStorage for auth tokens)
const SecureStoreAdapter = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
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
