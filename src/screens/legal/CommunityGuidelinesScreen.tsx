// CommunityGuidelinesScreen — port of offerhound-repo/src/pages/CommunityGuidelines.tsx.
// All section text preserved verbatim from the Lovable source.
import React from 'react';
import { Users } from 'lucide-react-native';
import { LegalLayout, type LegalSection } from './_LegalLayout';

const SECTIONS: LegalSection[] = [
  {
    heading: 'Respect & Professionalism',
    body: 'All interactions must be professional and respectful. Harassment, discrimination, or abusive behavior will not be tolerated.',
  },
  {
    heading: 'Accurate Information',
    body: 'Users must provide accurate information in their profiles, stats, and communications. Misrepresentation may result in account suspension.',
  },
  {
    heading: 'NCAA Compliance',
    body: 'All recruiting communications through OfferHound must comply with NCAA rules and regulations.',
  },
  {
    heading: 'Reporting Violations',
    body: 'Report guideline violations to support@offerhound.com. We investigate all reports promptly.',
  },
];

export default function CommunityGuidelinesScreen() {
  return (
    <LegalLayout
      icon={Users}
      title="Community Guidelines"
      sections={SECTIONS}
    />
  );
}
