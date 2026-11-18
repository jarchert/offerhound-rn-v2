/** Environment-specific public link origin. QA links must never silently target production. */
const PRODUCTION_ORIGIN='https://offer-hound.com';
const STAGING_ORIGIN='https://friday-night-recruiting.lovable.app';
const STAGING_HOSTS=new Set(['friday-night-recruiting.lovable.app','id-preview--581d7dac-ada7-4907-bc7a-492d1c91a771.lovable.app']);
export function resolvePublicOrigin(environment:string|undefined, configured?:string):string {
  const staging=environment==='staging';
  if(!configured)return staging?STAGING_ORIGIN:PRODUCTION_ORIGIN;
  let url:URL;
  try {url=new URL(configured);}catch {throw new Error('Public site URL must be a valid HTTPS origin.');}
  if(url.protocol!=='https:'||url.username||url.password||url.search||url.hash||!['','/'].includes(url.pathname))throw new Error('Public site URL must be an HTTPS origin without a path or credentials.');
  if(staging&&!STAGING_HOSTS.has(url.hostname))throw new Error('QA public links must use the isolated staging website.');
  if(!staging&&url.origin!==PRODUCTION_ORIGIN)throw new Error('Production public links must use the verified OfferHound domain.');
  return url.origin;
}
export function getCanonicalOrigin():string {
  return resolvePublicOrigin(process.env.EXPO_PUBLIC_APP_ENV,process.env.EXPO_PUBLIC_SITE_URL||process.env.EXPO_PUBLIC_CANONICAL_DOMAIN);
}
export function buildCanonicalUrl(path:string):string {
  if(path.startsWith('//')||/^[a-z]+:/i.test(path))throw new Error('Expected a relative public route.');
  return `${getCanonicalOrigin()}${path.startsWith('/')?path:`/${path}`}`;
}
