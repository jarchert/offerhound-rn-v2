export type PricingTier = {
   id: string;
   priceId: string;
   name: string;
   description: string;
   amount: number;
   interval?: "month" | "year";
   mode: "subscription" | "payment";
   badge?: string;
   features: string[];
   category: "athlete" | "coach";
};

export const PRICING_TIERS: PricingTier[] = [
   {
     id: "recruit-pro",
     priceId: "price_1TKfTfP3fCeQ8WTW7PdYJVJw",
     name: "Recruit Pro",
     description: "Athlete / Parent",
       amount: 4.99,
       interval: "month",
       mode: "subscription",
       badge: "Most Popular",
       features: [
          "Professional athlete profile page",
          "AI-powered recruiting letters",
          "Coach search & contact tools",
          "Performance stats showcase",
          "Photo & video gallery",
       ],
       category: "athlete",
  },
  {
       id: "recruit-elite",
       priceId: "price_1TKflKP3fCeQ8WTWZ0fIp2dI",
       name: "Recruit Elite",
       description: "Athlete / Parent",
       amount: 12.99,
       interval: "month",
       mode: "subscription",
       features: [
          "Everything in Recruit Pro",
          "Direct coach communication",
          "Profile analytics & insights",
          "Priority support",
          "Advanced match suggestions",
       ],
       category: "athlete",
  },
  {
       id: "family-bundle",
       priceId: "price_1TKfkUP3fCeQ8WTW0ANe3NWt",
       name: "Family Bundle",
       description: "Athlete / Parent",
       amount: 39.99,
       interval: "month",
       mode: "subscription",
       badge: "Best Value",
       features: [
          "Everything in Recruit Elite",
          "Up to 4 athlete profiles",
          "Family dashboard",
          "Multi-sport support",
          "Dedicated family support",
       ],
       category: "athlete",
  },
  {
       id: "college-coach",
       priceId: "price_1TKfkDP3fCeQ8WTW0j7qrvVL",
       name: "College Coach",
       description: "Free access for college coaches",
       amount: 0,
       mode: "payment",
       features: [
          "Browse athlete profiles",
          "Contact athletes directly",
          "Recruiting pipeline tools",
          "Match suggestions",
       ],
       category: "coach",
  },
  {
       id: "club-coach",
       priceId: "price_1TKfWKP3fCeQ8WTWpiD22tFw",
       name: "Club Coach",
       description: "Per team/year (intro pricing)",
       amount: 99.0,
       interval: "year",
       mode: "subscription",
       features: [
          "Team roster management",
          "Player development tracking",
          "College placement tools",
          "Recruiting pipeline",
       ],
       category: "coach",
  },
  {
       id: "camp-manager-event",
       priceId: "price_1TKfjlP3fCeQ8WTWMvIu5UkZ",
       name: "Camp Manager",
      description: "Per Event",
      amount: 99.0,
      mode: "payment",
      features: [
         "Single event management",
         "Registration & check-in",
         "Athlete evaluations",
         "Post-camp reports",
      ],
      category: "coach",
   },
   {
      id: "camp-manager-annual",
      priceId: "price_1TKfYOP3fCeQ8WTWuS5dmyqU",
      name: "Camp Manager",
      description: "Annual Unlimited",
      amount: 299.0,
      mode: "payment",
      badge: "Unlimited",
      features: [
         "Unlimited events per year",
         "Registration & check-in",
         "Athlete evaluations",
         "Post-camp reports",
         "Advanced analytics",
      ],
      category: "coach",
   },
];

export const PRODUCT_ID = "prod_UJI3ttmnYavrVC";
