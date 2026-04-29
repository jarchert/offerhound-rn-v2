// PublicFooter — RN port of Lovable src/components/Footer.tsx
// App Store / Play Store compliance: legal links, cookie settings, NIL, app install.
// Three variants: 'landing' (top CTA band), 'authenticated' (no CTA), 'admin' (excluded).
import React from 'react';
import { View, Text, StyleSheet, Pressable, Linking, Platform } from 'react-native';
import { Cookie } from 'lucide-react-native';
import { colors, typography, spacing, radius } from '@/lib/theme';

export type FooterVariant = 'landing' | 'authenticated' | 'admin';

interface PublicFooterProps {
  variant?: FooterVariant;
  onCookieSettings?: () => void;
  onNILIntelligence?: () => void;
  onInstall?: () => void;
  onTerms?: () => void;
  onPrivacy?: () => void;
  onCommunityGuidelines?: () => void;
  onCoachRules?: () => void;
  onParentTrust?: () => void;
  onAccessibility?: () => void;
  onCookies?: () => void;
  onCCPA?: () => void;
  onDeleteAccount?: () => void;
  onScouts?: () => void;
  onSupport?: () => void;
  onGetStarted?: () => void;
}

export default function PublicFooter({
  variant: propVariant = 'authenticated',
  onCookieSettings,
  onNILIntelligence,
  onInstall,
  onTerms,
  onPrivacy,
  onCommunityGuidelines,
  onCoachRules,
  onParentTrust,
  onAccessibility,
  onCookies,
  onCCPA,
  onDeleteAccount,
  onScouts,
  onSupport,
  onGetStarted,
}: PublicFooterProps) {
  const isLanding = propVariant === 'landing';
  const isAdmin = propVariant === 'admin';
  if (isAdmin) return null;

  return (
    <View style={styles.root}>
      {/* CTA band — landing variant only */}
      {isLanding && (
        <View style={styles.ctaBand}>
          <View style={styles.ctaContent}>
            {/* Left: Logo + install */}
            <View style={styles.ctaLeft}>
              <Text style={styles.logoText}>
                <Text style={{ color: colors.primary }}>OFFER</Text>
                <Text style={{ color: colors.foreground }}>HOUND</Text>
                <Text style={styles.tm}>™</Text>
              </Text>
              <View style={styles.installRow}>
                <Pressable style={styles.installBtn} onPress={onInstall}>
                  <Text style={styles.installBtnText}>Install App</Text>
                </Pressable>
                <Pressable style={styles.appStoreBtn} onPress={() => {}}>
                  <Text style={styles.appStoreBtnText}>App Store</Text>
                </Pressable>
              </View>
            </View>

            {/* Center: Headline */}
            <View style={styles.ctaCenter}>
              <Text style={styles.ctaHeadline}>
                READY TO{'\n'}
                <Text style={styles.ctaGold}>GET RECRUITED?</Text>
              </Text>
              <Text style={styles.ctaSub}>
                Join athletes taking control of their recruiting journey.
              </Text>
            </View>

            {/* Right: Quick links */}
            <View style={styles.ctaRight}>
              <Text style={styles.quickLinksLabel}>Quick Links</Text>
              <Pressable onPress={onScouts}><Text style={styles.quickLink}>Scout Directory</Text></Pressable>
              <Pressable onPress={onSupport}><Text style={styles.quickLink}>Support</Text></Pressable>
              <Pressable onPress={onGetStarted}><Text style={styles.quickLink}>Get Started</Text></Pressable>
            </View>
          </View>
        </View>
      )}

      {/* Bottom bar */}
      <View style={styles.bottomBar}>
        <Text style={styles.copyright}>
          © {new Date().getFullYear()} OfferHound. Connecting High School Athletes, Coaches and Programs with the Power of AI.
        </Text>

        <View style={styles.linksRow}>
          <Pressable onPress={onNILIntelligence}>
            <Text style={styles.nilLink}>NIL Intelligence</Text>
          </Pressable>
          <Pressable onPress={onTerms}><Text style={styles.link}>Terms of Use</Text></Pressable>
          <Pressable onPress={onPrivacy}><Text style={styles.link}>Privacy Policy</Text></Pressable>
          <Pressable onPress={onCommunityGuidelines}><Text style={styles.link}>Community Guidelines</Text></Pressable>
          <Pressable onPress={onCoachRules}><Text style={styles.link}>Coach & Scout Rules</Text></Pressable>
          <Pressable onPress={onParentTrust}><Text style={styles.link}>Parent Trust & Safety</Text></Pressable>
          <Pressable onPress={onAccessibility}><Text style={styles.link}>Accessibility</Text></Pressable>
          <Pressable onPress={onCookies}><Text style={styles.link}>Cookies Policy</Text></Pressable>
          <Pressable style={styles.cookieRow} onPress={onCookieSettings}>
            <Cookie size={12} color={colors.mutedForeground} />
            <Text style={styles.link}>Cookie Settings</Text>
          </Pressable>
          <Pressable onPress={onCCPA}><Text style={styles.link}>Your CA Privacy Rights</Text></Pressable>
          <Pressable onPress={onDeleteAccount}><Text style={styles.link}>Delete Account</Text></Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  ctaBand: {
    paddingVertical: spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.card,
  },
  ctaContent: {
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.lg,
  },
  ctaLeft: {
    flex: 1,
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  logoText: {
    fontFamily: typography.fontFamily.heading,
    fontSize: 28,
    letterSpacing: typography.letterSpacing.heading,
  },
  tm: { fontSize: 10, color: colors.primary },
  installRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  installBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  installBtnText: {
    fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: 13,
    color: colors.primaryForeground,
  },
  appStoreBtn: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  appStoreBtnText: {
    fontFamily: typography.fontFamily.bodyMedium,
    fontSize: 13,
    color: colors.foreground,
  },
  ctaCenter: {
    flex: 1,
    alignItems: 'center',
  },
  ctaHeadline: {
    fontFamily: typography.fontFamily.heading,
    fontSize: 22,
    color: colors.foreground,
    letterSpacing: typography.letterSpacing.heading,
    textAlign: 'center',
    lineHeight: 28,
  },
  ctaGold: { color: '#C9A84C' },
  ctaSub: {
    fontFamily: typography.fontFamily.body,
    fontSize: 13,
    color: colors.mutedForeground,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  ctaRight: {
    flex: 1,
    alignItems: 'flex-end',
    gap: 4,
  },
  quickLinksLabel: {
    fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: 13,
    color: colors.foreground,
    marginBottom: spacing.xs,
  },
  quickLink: {
    fontFamily: typography.fontFamily.body,
    fontSize: 13,
    color: colors.mutedForeground,
  },
  bottomBar: {
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  copyright: {
    fontFamily: typography.fontFamily.body,
    fontSize: 12,
    color: colors.mutedForeground,
    textAlign: 'center',
  },
  linksRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.xs,
    gapRow: spacing.xs,
  },
  nilLink: {
    fontFamily: typography.fontFamily.bodyMedium,
    fontSize: 12,
    color: '#22c55e',
  },
  link: {
    fontFamily: typography.fontFamily.body,
    fontSize: 12,
    color: colors.mutedForeground,
  },
  cookieRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
});