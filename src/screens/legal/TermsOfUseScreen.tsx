// TermsOfUseScreen — port of offerhound-repo/src/pages/TermsOfUse.tsx.
// All section text preserved verbatim from the Lovable source.
import React from 'react';
import { FileText } from 'lucide-react-native';
import { LegalLayout, type LegalSection } from './_LegalLayout';

const SECTIONS: LegalSection[] = [
  {
    heading: '1. Acceptance of Terms',
    body: 'By using OfferHound, you agree to these Terms of Use and our Privacy Policy.',
  },
  {
    heading: '2. User Accounts',
    body: 'You are responsible for maintaining account confidentiality and all activities under your account.',
  },
  {
    heading: '3. Acceptable Use',
    body: 'Use the platform only for lawful purposes related to athletic recruiting.',
  },
  {
    heading: '4. Intellectual Property',
    body: 'All content and materials are owned by OfferHound or its licensors. Users retain ownership of uploaded content.',
  },
  {
    heading: '5. Contact',
    body: 'Questions? Contact us at support@offerhound.com.',
  },
];

export default function TermsOfUseScreen() {
  return (
    <LegalLayout
      icon={FileText}
      title="Terms of Use"
      subtitle="Last updated: December 24, 2024"
      sections={SECTIONS}
    />
  );
}
