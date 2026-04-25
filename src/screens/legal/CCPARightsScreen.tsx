// CCPARightsScreen — port of offerhound-repo/src/pages/CCPARights.tsx.
// All section text preserved verbatim from the Lovable source.
import React from 'react';
import { Shield } from 'lucide-react-native';
import { LegalLayout, type LegalSection } from './_LegalLayout';

const SECTIONS: LegalSection[] = [
  {
    heading: 'Your Rights',
    body: 'Under the CCPA, California residents have the right to know what personal information is collected, request deletion, and opt-out of the sale of personal information.',
  },
  {
    heading: 'Exercising Your Rights',
    body: 'To exercise these rights, contact us at support@offerhound.com. We will respond within 45 days of receiving a verifiable consumer request.',
  },
  {
    heading: 'Non-Discrimination',
    body: 'We will not discriminate against you for exercising your CCPA rights.',
  },
];

export default function CCPARightsScreen() {
  return (
    <LegalLayout
      icon={Shield}
      title="California Privacy Rights"
      subtitle="Your rights under the CCPA"
      sections={SECTIONS}
    />
  );
}
