// AccessibilityScreen — port of offerhound-repo/src/pages/Accessibility.tsx.
// All section text preserved verbatim from the Lovable source.
import React from 'react';
import { Eye } from 'lucide-react-native';
import { LegalLayout, type LegalSection } from './_LegalLayout';

const SECTIONS: LegalSection[] = [
  {
    heading: 'Our Commitment',
    body: 'OfferHound is committed to ensuring digital accessibility for people with disabilities. We strive to meet WCAG 2.1 Level AA standards.',
  },
  {
    heading: 'Features',
    body: 'Our platform includes keyboard navigation, screen reader compatibility, color contrast compliance, and responsive design for all devices.',
  },
  {
    heading: 'Feedback',
    body: 'If you encounter accessibility barriers, please contact us at support@offerhound.com so we can address them promptly.',
  },
];

export default function AccessibilityScreen() {
  return (
    <LegalLayout
      icon={Eye}
      title="Accessibility"
      sections={SECTIONS}
    />
  );
}
