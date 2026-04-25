// CookiesPolicyScreen — port of offerhound-repo/src/pages/CookiesPolicy.tsx.
// All section text preserved verbatim from the Lovable source.
import React from 'react';
import { Cookie } from 'lucide-react-native';
import { LegalLayout, type LegalSection } from './_LegalLayout';

const SECTIONS: LegalSection[] = [
  {
    heading: 'What Are Cookies',
    body: 'Cookies are small text files stored on your device when you visit our website. They help us provide and improve our services.',
  },
  {
    heading: 'How We Use Cookies',
    body: 'We use essential cookies for authentication, preference cookies for settings, and analytics cookies to understand usage patterns.',
  },
  {
    heading: 'Managing Cookies',
    body: 'You can manage cookie preferences through your browser settings. Disabling essential cookies may affect platform functionality.',
  },
];

export default function CookiesPolicyScreen() {
  return (
    <LegalLayout
      icon={Cookie}
      title="Cookies Policy"
      subtitle="Last updated: December 24, 2024"
      sections={SECTIONS}
    />
  );
}
