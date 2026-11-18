export const WEB_COMPANION_ROUTES: Record<string,{path:string;title:string;description:string;admin:boolean}> = {
  "WebMarketingCenter": {
    "path": "/admin/marketing-center",
    "title": "MarketingCenter",
    "description": "Desktop marketing workspace; explicit admin-guarded web handoff.",
    "admin": true
  },
  "WebAdminOnboarding": {
    "path": "/admin/onboarding",
    "title": "AdminOnboarding",
    "description": "Administrative operations retained in guarded web workspace.",
    "admin": true
  },
  "WebOptoutAudit": {
    "path": "/admin/optout-audit",
    "title": "OptoutAudit",
    "description": "Administrative audit retained on web.",
    "admin": true
  },
  "WebTestPasswords": {
    "path": "/admin/test-passwords",
    "title": "TestPasswords",
    "description": "Administrative credential operation; no automatic execution.",
    "admin": true
  },
  "WebHSCoachProfile": {
    "path": "/hs-coach/:id",
    "title": "HSCoachProfile",
    "description": "Dedicated public HS profile not implemented natively; explicit web fallback.",
    "admin": false
  },
  "WebAgencyProfile": {
    "path": "/agency/:id",
    "title": "AgencyProfile",
    "description": "Dedicated public agency profile not implemented natively; explicit web fallback.",
    "admin": false
  },
  "WebSportSample": {
    "path": "/sample-athlete/:sport",
    "title": "SportSample",
    "description": "Native sample is football-only; do not map other sports to football.",
    "admin": false
  },
  "WebSportSampleGallery": {
    "path": "/sample-athlete/:sport/gallery",
    "title": "SportSampleGallery",
    "description": "Sport-specific sample gallery is a web companion flow.",
    "admin": false
  },
  "WebSmsTerms": {
    "path": "/sms-terms",
    "title": "SmsTerms",
    "description": "Use existing hosted policy; do not invent or silently accept legal text.",
    "admin": false
  },
  "WebAISlides": {
    "path": "/ai-experience-slides",
    "title": "AISlides",
    "description": "Browser presentation content; explicit handoff.",
    "admin": false
  },
  "WebAthleteSlides": {
    "path": "/athlete-experience-slides",
    "title": "AthleteSlides",
    "description": "Browser presentation content; explicit handoff.",
    "admin": false
  },
  "WebAthleteProfileSlides": {
    "path": "/athlete-profile-slides",
    "title": "AthleteProfileSlides",
    "description": "Browser presentation content; explicit handoff.",
    "admin": false
  },
  "WebCoachSlides": {
    "path": "/coach-experience-slides",
    "title": "CoachSlides",
    "description": "Browser presentation content; explicit handoff.",
    "admin": false
  },
  "WebAdminInfluencers": {
    "path": "/admin/influencers",
    "title": "AdminInfluencers",
    "description": "Creator administration on guarded web workspace.",
    "admin": true
  },
  "WebAdminPodcasts": {
    "path": "/admin/podcasts",
    "title": "AdminPodcasts",
    "description": "Podcast administration on guarded web workspace.",
    "admin": true
  },
  "WebAdminMedia": {
    "path": "/admin/media-center",
    "title": "AdminMedia",
    "description": "Media production workspace on web.",
    "admin": true
  },
  "WebChartSmoke": {
    "path": "/__rechart-smoke",
    "title": "ChartSmoke",
    "description": "Browser diagnostic, not a mobile feature; admin guarded.",
    "admin": true
  },
  "WebChartArtifacts": {
    "path": "/admin/recharts-artifacts",
    "title": "ChartArtifacts",
    "description": "Web-only chart evidence tooling; admin guarded.",
    "admin": true
  },
  "WebLetterAnalytics": {
    "path": "/admin/letter-analytics",
    "title": "LetterAnalytics",
    "description": "Web administration analytics retained behind admin guard.",
    "admin": true
  },
  "WebMarketingRender": {
    "path": "/marketing-render/cards",
    "title": "MarketingRender",
    "description": "Server/browser rendering endpoint, not a native editing flow.",
    "admin": true
  },
  "WebConsent": {
    "path": "/consent/:token",
    "title": "Consent",
    "description": "Token-backed guardian review uses hosted flow; never accept automatically.",
    "admin": false
  },
  "WebMinorInvite": {
    "path": "/minor-invite/:token",
    "title": "MinorInvite",
    "description": "Token-backed minor onboarding uses hosted flow; no native identity mutation shortcut.",
    "admin": false
  },
  "WebRosterConsent": {
    "path": "/roster-consent/:token",
    "title": "RosterConsent",
    "description": "Token-backed roster transfer uses hosted flow; preserve authorization token.",
    "admin": false
  },
  "WebFootballHub": {
    "path": "/athlete/football-hub",
    "title": "FootballHub",
    "description": "Football-specific hub has no equivalent native implementation; explicit web companion.",
    "admin": false
  }
};

export function webCompanionURL(name:string, params:Record<string,unknown>={}, staging=false) {
 const destination=WEB_COMPANION_ROUTES[name];if(!destination)throw new Error('This web destination is not supported.');
 const path=destination.path.replace(/:([A-Za-z0-9_]+)/g,(_all,key)=>{
  const value=params[key];if(typeof value!=='string'||!value||value.length>1024)throw new Error('This link is incomplete.');
  return encodeURIComponent(value);
 });
 const configured=process.env.EXPO_PUBLIC_CAMP_CONSENT_WEB_URL;
 if(staging&&!configured)throw Error('The public QA website has not been configured for this build. Please retry after the QA website is published.');
 const base=new URL(configured||'https://offer-hound.com');
 if(base.protocol!=='https:'||base.username||base.password||base.pathname!=='/'||base.search||base.hash)throw Error('A secure OfferHound website origin is required.');
 if(staging&&['offer-hound.com','www.offer-hound.com'].includes(base.hostname))throw Error('QA must use its staging website.');
 return base.origin+path;
}
