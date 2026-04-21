import React from 'react';
import { View, Text, Pressable, StyleSheet, Linking } from 'react-native';
import { colors, typography, spacing } from '@/lib/theme';

const LINKS = [
  { label: 'Terms', url: 'https://offer-hound.com/terms' },
  { label: 'Privacy', url: 'https://offer-hound.com/privacy' },
  { label: 'Support', url: 'mailto:support@offer-hound.com' },
];

export function Footer() {
  return (
    <View style={s.footer}>
      <Text style={s.brand}>OfferHound</Text>
      <View style={s.links}>
        {LINKS.map(l => (
          <Pressable key={l.label} onPress={() => Linking.openURL(l.url)} hitSlop={6}>
            <Text style={s.link}>{l.label}</Text>
          </Pressable>
        ))}
      </View>
      <Text style={s.copyright}>© {new Date().getFullYear()} Emergent Mind Lab</Text>
    </View>
  );
}

export default Footer;

const s = StyleSheet.create({
  footer: { padding: spacing.md, alignItems: 'center', gap: spacing.xs, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.background },
  brand: { fontFamily: typography.fontFamily.heading, fontSize: typography.fontSize.lg, color: colors.primary, letterSpacing: typography.letterSpacing.heading },
  links: { flexDirection: 'row', gap: spacing.md },
  link: { fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.sm, color: colors.mutedForeground },
  copyright: { fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.xs, color: colors.mutedForeground, marginTop: 4 },
});
