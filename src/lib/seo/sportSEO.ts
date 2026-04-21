import { SportType, getSportConfig, getSportPath } from "@/lib/data/sports";

export function getSportSEO(sport: SportType) {
  const config = getSportConfig(sport);
  const sportName = config.name;
  const sportDisplayName = config.displayName;

  return {
     title: `OfferHound™ - ${sportDisplayName} Recruiting Platform | Connect with College Coaches`,
     description: `${config.description} OfferHound™ is the #1 platform for ${sportName.toLowerCase()} recruiting. Create your free profile today.`,
     keywords: `${sportName.toLowerCase()} recruiting, college ${sportName.toLowerCase()}, high school ${sportName.toLowerCase()}, ${sportName.toLowerCase()} scholarship`,
     ogTitle: `OfferHound™ - ${sportDisplayName} Recruiting Platform`,
     ogDescription: config.tagline,
     canonicalUrl: `https://offerhound.com${getSportPath(sport)}`,
  };
}

export function getSportStructuredData(sport: SportType) {
  const config = getSportConfig(sport);
  const sportName = config.name;

  return {
     "@context": "https://schema.org",
     "@graph": [
        {
           "@type": "Organization",
           name: "OfferHound™",
           url: "https://offerhound.com",
           description: "OfferHound™ is the premier athletic recruiting platform connecting high school athletesdirectly with college coaches.",
        },
        {
           "@type": "WebPage",
           url: `https://offerhound.com${getSportPath(sport)}`,
           name: `${config.displayName} Recruiting Platform | OfferHound™`,
           description: config.description,
        },
     ],
  };
}
