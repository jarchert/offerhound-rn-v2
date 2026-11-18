export type BackendEnvironment = {
  appEnv?: string;
  url?: string;
  anonKey?: string;
};

export function resolveBackendEnvironment(
  env: BackendEnvironment,
  production: { url: string; anonKey: string },
) {
  const staging = env.appEnv === 'staging';
  if (staging && (!env.url || !env.anonKey)) {
    throw new Error('Staging requires its own Supabase URL and public client key.');
  }
  if (Boolean(env.url) !== Boolean(env.anonKey)) {
    throw new Error('Configure both Supabase environment variables together.');
  }
  const url = env.url || production.url;
  const anonKey = env.anonKey || production.anonKey;
  if (staging && new URL(url).origin !== 'https://wrrfwvkixlzmnsztjfgg.supabase.co') {
    throw new Error('Staging must use the isolated OfferHound QA backend.');
  }
  return { url, anonKey };
}
