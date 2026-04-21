/**
 * Builds share URLs for influencer posts/blogs that always link back to the
 * OfferHound profile. We append a UTM ref so external referrals are
 * identifiable in analytics.
 */
const SITE_ORIGIN = 'https://offerhound.com';

export function buildInfluencerShareUrl(handle: string, path?: string) {
  const base = `${SITE_ORIGIN}/influencers/${handle}${path ? path : ''}`;
  const sep = base.includes('?') ? '&' : '?';
  return `${base}${sep}ref=offerhound`;
}

export function shareLinks(url: string, title: string) {
  const u = encodeURIComponent(url);
  const t = encodeURIComponent(title);
  return {
    twitter: `https://twitter.com/intent/tweet?url=${u}&text=${t}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${u}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${u}`,
    reddit: `https://www.reddit.com/submit?url=${u}&title=${t}`,
  };
}
