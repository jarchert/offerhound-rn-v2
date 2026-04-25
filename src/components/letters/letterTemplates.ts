import type { RecipientCategory } from "@/components/letters/LetterComposer";

export interface UnifiedLetterTemplate {
  type: string;
  title: string;
  description: string;
  category: string;
  audiences: RecipientCategory[];
}

// =====================================================================
// COACH (college coach) — sender writes to athletes, parents, peers,
// scouts, HS coaches, club coaches.
// =====================================================================
export const COACH_LETTER_TEMPLATES: UnifiedLetterTemplate[] = [
  // → athlete / parent
  { type: "initial-interest", title: "Initial Interest Letter", description: "Express initial interest in recruiting an athlete", category: "outreach", audiences: ["athlete", "parent"] },
  { type: "follow-up", title: "Follow-Up Letter", description: "Follow up after initial contact", category: "outreach", audiences: ["athlete", "parent"] },
  { type: "scholarship-interest", title: "Scholarship Interest Letter", description: "Express scholarship interest", category: "outreach", audiences: ["athlete", "parent"] },
  { type: "parent-introduction", title: "Introduction to Parents", description: "Introduce yourself to a recruit's parents", category: "outreach", audiences: ["parent"] },
  { type: "camp-invitation", title: "Camp Invitation", description: "Invite a recruit to your camp", category: "invitation", audiences: ["athlete", "parent"] },
  { type: "visit-invitation", title: "Campus Visit Invitation", description: "Invite a recruit for a campus visit", category: "invitation", audiences: ["athlete", "parent"] },
  { type: "response-to-contact", title: "Response to Initial Contact", description: "Respond to an athlete who reached out", category: "response", audiences: ["athlete", "parent"] },
  { type: "response-to-follow-up", title: "Response to Follow-Up", description: "Respond to a follow-up letter", category: "response", audiences: ["athlete", "parent"] },
  { type: "response-to-visit-request", title: "Response to Visit Request", description: "Respond to a visit request", category: "response", audiences: ["athlete", "parent"] },
  { type: "response-to-camp-request", title: "Response to Camp Request", description: "Respond to a camp inquiry", category: "response", audiences: ["athlete", "parent"] },
  // → college coach
  { type: "coach-introduction", title: "Coach Introduction", description: "Introduce yourself to a fellow college coach", category: "coach-network", audiences: ["college-coach"] },
  { type: "coach-collaboration", title: "Program Collaboration", description: "Propose a clinic, scrimmage, or staff exchange", category: "coach-network", audiences: ["college-coach"] },
  { type: "coach-referral-out", title: "Refer a Prospect", description: "Refer a prospect to another program", category: "coach-network", audiences: ["college-coach"] },
  { type: "coach-recruiting-coordination", title: "Recruiting Coordination", description: "Coordinate on shared prospects or transfer portal", category: "coach-network", audiences: ["college-coach"] },
  // → scout
  { type: "scout-introduction", title: "Introduction to Scout", description: "Introduce yourself to a scout / agency", category: "scout-relations", audiences: ["scout"] },
  { type: "scout-prospect-share", title: "Share Position Needs", description: "Share roster needs with a scout", category: "scout-relations", audiences: ["scout"] },
  { type: "scout-evaluation-request", title: "Request Evaluation", description: "Request a scout evaluation", category: "scout-relations", audiences: ["scout"] },
  { type: "scout-thank-you", title: "Scout Thank You", description: "Thank a scout for a referral", category: "scout-relations", audiences: ["scout"] },
  // → HS coach
  { type: "hs-coach-introduction", title: "Introduction to HS Coach", description: "Introduce your program to a HS head coach", category: "hs-coach-relations", audiences: ["hs-coach"] },
  { type: "hs-coach-prospect-inquiry", title: "Prospect Inquiry", description: "Ask a HS coach about a specific prospect", category: "hs-coach-relations", audiences: ["hs-coach"] },
  { type: "hs-coach-relationship-build", title: "Build Pipeline Relationship", description: "Build a long-term recruiting pipeline", category: "hs-coach-relations", audiences: ["hs-coach"] },
  { type: "hs-coach-recruit-update", title: "Recruit Status Update", description: "Update on a player's recruiting status", category: "hs-coach-relations", audiences: ["hs-coach"] },
  // → club coach
  { type: "club-coach-introduction", title: "Introduction to Club Coach", description: "Introduce your program to a club coach", category: "club-coach-relations", audiences: ["club-coach"] },
  { type: "club-coach-prospect-inquiry", title: "Club Prospect Inquiry", description: "Ask a club coach about a player", category: "club-coach-relations", audiences: ["club-coach"] },
];

// =====================================================================
// SCOUT — sender writes to athletes, parents, college coaches, peers, HS coaches
// =====================================================================
export const SCOUT_LETTER_TEMPLATES: UnifiedLetterTemplate[] = [
  { type: "initial-interest", title: "Initial Interest Letter", description: "Express initial interest in an athlete", category: "outreach", audiences: ["athlete", "parent"] },
  { type: "follow-up", title: "Follow-Up Letter", description: "Follow up with an athlete", category: "outreach", audiences: ["athlete", "parent"] },
  { type: "evaluation-request", title: "Evaluation Request", description: "Request more film, stats, or info", category: "outreach", audiences: ["athlete", "parent"] },
  { type: "parent-introduction", title: "Introduction to Parents", description: "Introduce yourself to athlete's parents", category: "outreach", audiences: ["parent"] },
  { type: "response-to-contact", title: "Response to Athlete Contact", description: "Respond to an athlete inquiry", category: "response", audiences: ["athlete", "parent"] },
  { type: "response-to-follow-up", title: "Response to Follow-Up", description: "Respond to a follow-up", category: "response", audiences: ["athlete", "parent"] },
  // → college coach
  { type: "scout-pitch-prospect", title: "Pitch Prospect to Coach", description: "Pitch a vetted prospect to a college coach", category: "coach-relations", audiences: ["college-coach"] },
  { type: "program-match", title: "Program Match Letter", description: "Recommend a fit between athlete and program", category: "coach-relations", audiences: ["college-coach"] },
  { type: "coach-referral", title: "Referral to Coach", description: "Recommend an athlete to a coach in your network", category: "coach-relations", audiences: ["college-coach"] },
  // → HS coach / club coach
  { type: "hs-coach-introduction", title: "Introduction to HS Coach", description: "Introduce your agency to a HS coach", category: "hs-coach-relations", audiences: ["hs-coach"] },
  { type: "club-coach-introduction", title: "Introduction to Club Coach", description: "Introduce your agency to a club coach", category: "club-coach-relations", audiences: ["club-coach"] },
  // → other scouts
  { type: "scout-collaboration", title: "Scout Collaboration", description: "Coordinate with another scout / agency", category: "scout-network", audiences: ["scout"] },
  // events
  { type: "camp-recommendation", title: "Camp Recommendation", description: "Recommend a camp or showcase to an athlete", category: "invitation", audiences: ["athlete", "parent"] },
  { type: "visit-coordination", title: "Visit Coordination", description: "Coordinate a campus visit", category: "invitation", audiences: ["athlete", "parent"] },
];

// =====================================================================
// CLUB COACH — sender writes to athletes/parents on roster, college coaches,
// scouts, HS coaches, peer club coaches, influencers
// =====================================================================
export const CLUB_COACH_LETTER_TEMPLATES: UnifiedLetterTemplate[] = [
  // → athlete / parent on roster
  { type: "roster-welcome", title: "Roster Welcome", description: "Welcome a new athlete to the team", category: "team", audiences: ["athlete", "parent"] },
  { type: "team-update", title: "Team Update", description: "Send a schedule, training, or season update", category: "team", audiences: ["athlete", "parent"] },
  { type: "tournament-announcement", title: "Tournament Announcement", description: "Announce an upcoming tournament", category: "team", audiences: ["athlete", "parent"] },
  { type: "parent-introduction", title: "Parent Introduction", description: "Introduce the season plan to parents", category: "team", audiences: ["parent"] },
  { type: "performance-feedback", title: "Performance Feedback", description: "Share feedback on athlete performance", category: "team", audiences: ["athlete", "parent"] },
  // → college coach
  { type: "player-pitch", title: "Pitch a Player", description: "Pitch one of your players to a college coach", category: "recruiting", audiences: ["college-coach"] },
  { type: "showcase-invitation", title: "Showcase Invitation", description: "Invite a college coach to scout at a showcase", category: "recruiting", audiences: ["college-coach"] },
  { type: "evaluation-request", title: "Request Evaluation", description: "Ask a college coach to evaluate a player", category: "recruiting", audiences: ["college-coach"] },
  // → scout
  { type: "scout-introduction", title: "Introduction to Scout", description: "Introduce your club program to a scout", category: "scout-relations", audiences: ["scout"] },
  { type: "scout-roster-share", title: "Share Roster", description: "Share roster highlights for evaluation", category: "scout-relations", audiences: ["scout"] },
  // → HS coach
  { type: "hs-coach-coordination", title: "HS Coach Coordination", description: "Coordinate on shared player schedule", category: "hs-coach-relations", audiences: ["hs-coach"] },
  { type: "hs-coach-update", title: "Player Update to HS Coach", description: "Update a HS coach on player progress", category: "hs-coach-relations", audiences: ["hs-coach"] },
  // → other club coach
  { type: "scrimmage-request", title: "Scrimmage Request", description: "Request a scrimmage with another club", category: "club-network", audiences: ["club-coach"] },
  // → influencer
  { type: "media-pitch", title: "Media Coverage Pitch", description: "Pitch a player or program to media", category: "media", audiences: ["influencer"] },
];

// =====================================================================
// HS COACH — sender writes to players/parents, college coaches, scouts,
// club coaches, peer HS coaches, influencers
// =====================================================================
export const HS_COACH_LETTER_TEMPLATES: UnifiedLetterTemplate[] = [
  // → athlete / parent
  { type: "team-announcement", title: "Team Announcement", description: "Send a roster, practice, or game update", category: "team", audiences: ["athlete", "parent"] },
  { type: "player-development-plan", title: "Player Development Plan", description: "Share a development plan with player/parent", category: "team", audiences: ["athlete", "parent"] },
  { type: "parent-introduction", title: "Parent Introduction", description: "Introduce season expectations to parents", category: "team", audiences: ["parent"] },
  { type: "academic-update", title: "Academic Update", description: "Address academic eligibility / GPA expectations", category: "team", audiences: ["athlete", "parent"] },
  // → college coach
  { type: "player-recommendation", title: "Player Recommendation", description: "Recommend one of your players to a college coach", category: "recruiting", audiences: ["college-coach"] },
  { type: "transcript-cover", title: "Transcript Cover Letter", description: "Send academic transcripts and credentials", category: "recruiting", audiences: ["college-coach"] },
  { type: "film-share", title: "Share Game Film", description: "Send game film for a recruit", category: "recruiting", audiences: ["college-coach"] },
  { type: "character-reference", title: "Character Reference", description: "Provide a character reference for a player", category: "recruiting", audiences: ["college-coach"] },
  // → scout
  { type: "scout-introduction", title: "Introduction to Scout", description: "Introduce your program to a scout", category: "scout-relations", audiences: ["scout"] },
  { type: "scout-evaluation-request", title: "Request Evaluation", description: "Ask a scout to evaluate a player", category: "scout-relations", audiences: ["scout"] },
  // → club coach
  { type: "club-coordination", title: "Club Coordination", description: "Coordinate on shared player workload", category: "club-relations", audiences: ["club-coach"] },
  // → peer HS coach
  { type: "scrimmage-request", title: "Scrimmage Request", description: "Request a scrimmage with another high school", category: "hs-network", audiences: ["hs-coach"] },
  // → influencer
  { type: "media-pitch", title: "Media Coverage Pitch", description: "Pitch a player or program for media coverage", category: "media", audiences: ["influencer"] },
];

// =====================================================================
// ATHLETE — sender writes to college coaches, HS coaches, club coaches,
// scouts, influencers (new unified athlete center)
// =====================================================================
export const ATHLETE_LETTER_TEMPLATES: UnifiedLetterTemplate[] = [
  // → college coach
  { type: "initial-contact", title: "Initial Contact Letter", description: "Introduce yourself to a college coach", category: "outreach", audiences: ["college-coach"] },
  { type: "follow-up", title: "Follow-Up Letter", description: "Follow up on previous communication", category: "outreach", audiences: ["college-coach"] },
  { type: "visit-request", title: "Visit Request Letter", description: "Request a campus visit", category: "outreach", audiences: ["college-coach"] },
  { type: "camp-request", title: "Camp Request Letter", description: "Inquire about an upcoming camp", category: "outreach", audiences: ["college-coach"] },
  { type: "thank-you-visit", title: "Thank You (Post-Visit)", description: "Thank a coach after a campus visit", category: "outreach", audiences: ["college-coach"] },
  { type: "commitment", title: "Commitment Letter", description: "Announce verbal commitment", category: "outreach", audiences: ["college-coach"] },
  { type: "freshman-intro", title: "Freshman Introduction", description: "Get on a coach's radar early", category: "class-year", audiences: ["college-coach"] },
  { type: "sophomore-intro", title: "Sophomore Introduction", description: "Build on your development", category: "class-year", audiences: ["college-coach"] },
  { type: "junior-intro", title: "Junior Introduction", description: "Prime recruiting time outreach", category: "class-year", audiences: ["college-coach"] },
  // → HS coach
  { type: "hs-coach-thank-you", title: "Thank Your HS Coach", description: "Thank your high school coach", category: "hs-coach", audiences: ["hs-coach"] },
  { type: "hs-coach-recommendation-request", title: "Request Recommendation", description: "Ask your HS coach for a college recommendation", category: "hs-coach", audiences: ["hs-coach"] },
  // → club coach
  { type: "club-coach-thank-you", title: "Thank Your Club Coach", description: "Thank a club / travel coach", category: "club-coach", audiences: ["club-coach"] },
  { type: "club-coach-recommendation-request", title: "Request Recommendation", description: "Ask a club coach for a recommendation", category: "club-coach", audiences: ["club-coach"] },
  // → scout
  { type: "scout-introduction", title: "Introduction to Scout", description: "Introduce yourself to a scout for evaluation", category: "scout", audiences: ["scout"] },
  { type: "scout-evaluation-request", title: "Request Evaluation", description: "Ask a scout to evaluate your film", category: "scout", audiences: ["scout"] },
  // → influencer
  { type: "influencer-pitch", title: "Pitch for Coverage", description: "Pitch yourself for podcast or feature coverage", category: "media", audiences: ["influencer"] },
];

// =====================================================================
// INFLUENCER — sender writes to athletes, parents, coaches, scouts
// =====================================================================
export const INFLUENCER_LETTER_TEMPLATES: UnifiedLetterTemplate[] = [
  { type: "feature-pitch", title: "Feature Pitch", description: "Pitch an athlete for a feature or interview", category: "outreach", audiences: ["athlete", "parent"] },
  { type: "podcast-invitation", title: "Podcast Invitation", description: "Invite an athlete to be on a podcast", category: "outreach", audiences: ["athlete", "parent"] },
  { type: "parent-permission", title: "Parent Permission Request", description: "Ask a parent for permission to feature their athlete", category: "outreach", audiences: ["parent"] },
  // → coach
  { type: "coach-interview-request", title: "Coach Interview Request", description: "Request an interview with a college coach", category: "coach-network", audiences: ["college-coach"] },
  { type: "hs-coach-interview", title: "HS Coach Interview Request", description: "Request an interview with a HS coach", category: "coach-network", audiences: ["hs-coach"] },
  { type: "club-coach-interview", title: "Club Coach Interview Request", description: "Request an interview with a club coach", category: "coach-network", audiences: ["club-coach"] },
  // → scout
  { type: "scout-collaboration", title: "Scout Collaboration", description: "Collaborate with a scout on coverage", category: "scout-network", audiences: ["scout"] },
  // → other influencer
  { type: "media-collaboration", title: "Media Collaboration", description: "Propose a collaboration with another creator", category: "creator-network", audiences: ["influencer"] },
  // thank you
  { type: "thank-you", title: "Thank You", description: "Thank a contact for an appearance or contribution", category: "follow-up", audiences: ["athlete", "parent", "college-coach", "hs-coach", "club-coach", "scout"] },
];
