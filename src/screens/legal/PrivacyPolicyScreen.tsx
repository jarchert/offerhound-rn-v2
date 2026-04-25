// PrivacyPolicyScreen — port of offerhound-repo/src/pages/PrivacyPolicy.tsx.
// All section text preserved verbatim from the Lovable source.
import React from 'react';
import { Shield } from 'lucide-react-native';
import { LegalLayout, type LegalSection } from './_LegalLayout';

const SECTIONS: LegalSection[] = [
  {
    heading: '1. Information We Collect',
    body: 'We collect information you provide directly, such as when you create an account, fill in your athlete profile, or contact us.',
  },
  {
    heading: '2. How We Use Your Information',
    body: 'We use information to provide, maintain, and improve our services, including connecting athletes with college coaches.',
  },
  {
    heading: '3. Information Sharing',
    body: 'We do not sell your personal information. We may share information with coaches as part of the recruiting platform.',
  },
  {
    heading: '4. Data Security',
    body: 'We implement appropriate security measures to protect your personal information.',
  },
  {
    heading: '5. Contact Us',
    body: 'Questions? Contact us at support@offerhound.com.',
  },
];

export default function PrivacyPolicyScreen() {
  return (
    <LegalLayout
      icon={Shield}
      title="Privacy Policy"
      subtitle="Last updated: December 24, 2024"
      sections={SECTIONS}
    />
  );
}
