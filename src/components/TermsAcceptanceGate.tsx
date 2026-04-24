// Ported verbatim from Lovable src/components/TermsAcceptanceGate.tsx
// Web → RN mapping:
//   <div>/<Card>   → <View>/<Card>
//   <Link to=...>  → <Pressable onPress={Linking.openURL(...)}>  (deep-links to web site;
//                     no in-app /terms or /privacy screen exists yet — see GAPS)
//   <ScrollArea>   → <ScrollView> (wrapped by our ScrollArea shim)
//   Tailwind cls   → StyleSheet styles using our `@/lib/theme` tokens
//   lucide-react   → lucide-react-native
//   The whole gate screen is wrapped in a full-screen RN <Modal> per task rules.
import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, ActivityIndicator, Pressable, Linking } from 'react-native';
import { useHasAcceptedTerms, useAcceptTerms, getCurrentTermsVersion } from '@/hooks/useTermsAcceptance';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/Card';
import { Checkbox } from '@/components/ui/Checkbox';
import { Label } from '@/components/ui/Label';
import { ScrollArea } from '@/components/ui/ScrollArea';
import { Loader2, FileText, Shield, CheckCircle } from 'lucide-react-native';
import { useToast } from '@/hooks/use-toast';
import { colors, typography, spacing } from '@/lib/theme';

interface TermsAcceptanceGateProps {
  children: React.ReactNode;
}

const TERMS_URL = 'https://offer-hound.com/terms';
const PRIVACY_URL = 'https://offer-hound.com/privacy';

export function TermsAcceptanceGate({ children }: TermsAcceptanceGateProps) {
  const { hasAccepted, isLoading } = useHasAcceptedTerms();
  const acceptTerms = useAcceptTerms();
  const { toast } = useToast();

  const [termsChecked, setTermsChecked] = useState(false);
  const [privacyChecked, setPrivacyChecked] = useState(false);

  const canAccept = termsChecked && privacyChecked;

  const handleAccept = async () => {
    if (!canAccept) return;

    try {
      await acceptTerms.mutateAsync();
      toast({
        title: 'Terms Accepted',
        description: 'Thank you for accepting our terms. You can now access the platform.',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to accept terms',
        variant: 'destructive',
      });
    }
  };

  if (isLoading) {
    return (
      <View style={s.loadingScreen}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (hasAccepted) {
    return <>{children}</>;
  }

  return (
    <Modal visible animationType="fade" transparent={false} onRequestClose={() => { /* gate: cannot dismiss */ }}>
      <View style={s.screen}>
        <ScrollArea contentContainerStyle={s.scrollContent}>
          <Card style={s.card}>
            <CardHeader style={s.headerCenter}>
              <View style={s.iconRow}>
                <View style={s.iconBubble}>
                  <FileText size={24} color={colors.primary} />
                </View>
                <View style={s.iconBubble}>
                  <Shield size={24} color={colors.primary} />
                </View>
              </View>
              <CardTitle style={s.title}>Terms of Use & Privacy Policy</CardTitle>
              <CardDescription>
                Please review and accept our terms to continue using OfferHound™
              </CardDescription>
            </CardHeader>

            <CardContent style={s.content}>
              {/* Terms Summary */}
              <View style={s.stack}>
                <View style={s.summaryBox}>
                  <View style={s.summaryHeading}>
                    <FileText size={16} color={colors.primary} />
                    <Text style={s.summaryHeadingText}>Terms of Use Highlights</Text>
                  </View>
                  <ScrollArea style={s.summaryScroll}>
                    <View style={s.bulletList}>
                      <Text style={s.bullet}>• You must be at least 13 years old (parental consent required for minors under 18)</Text>
                      <Text style={s.bullet}>• All profile information, stats, and achievements must be accurate and truthful</Text>
                      <Text style={s.bullet}>• Athletes, coaches, and scouts must comply with applicable recruiting regulations (NCAA, NAIA, etc.)</Text>
                      <Text style={s.bullet}>• Published profiles are publicly accessible to coaches, scouts, and others</Text>
                      <Text style={s.bullet}>• Patent-pending AI-powered features (recommendations, letter writing) are provided as assistance—you're responsible for content you send</Text>
                      <Text style={s.bullet}>• Subscription fees are billed recurring and auto-renew unless cancelled</Text>
                      <Text style={s.bullet}>• Prohibited conduct includes harassment, impersonation, false information, and spam</Text>
                      <Text style={s.bullet}>• We may suspend or terminate accounts that violate our terms</Text>
                      <Text style={s.bullet}>• We do not guarantee specific recruiting outcomes or scholarship offers</Text>
                    </View>
                  </ScrollArea>
                  <Pressable onPress={() => Linking.openURL(TERMS_URL)} hitSlop={6}>
                    <Text style={s.inlineLink}>Read full Terms of Use →</Text>
                  </Pressable>
                </View>

                <View style={s.summaryBox}>
                  <View style={s.summaryHeading}>
                    <Shield size={16} color={colors.primary} />
                    <Text style={s.summaryHeadingText}>Privacy Policy Highlights</Text>
                  </View>
                  <ScrollArea style={s.summaryScroll}>
                    <View style={s.bulletList}>
                      <Text style={s.bullet}>• We collect personal info, athletic stats, photos, videos, and academic data for your profile</Text>
                      <Text style={s.bullet}>• Published athlete profiles are publicly visible to coaches, scouts, and others</Text>
                      <Text style={s.bullet}>• We use AI to power recommendations, search, and letter writing assistance</Text>
                      <Text style={s.bullet}>• Payment information is processed securely through Stripe</Text>
                      <Text style={s.bullet}>• We use cookies for essential functionality, analytics, and marketing—you can manage preferences anytime</Text>
                      <Text style={s.bullet}>• We implement security measures including encryption and access controls</Text>
                      <Text style={s.bullet}>• You can access, correct, export, or delete your data at any time</Text>
                      <Text style={s.bullet}>• We do not sell your personal information to third parties</Text>
                      <Text style={s.bullet}>• Parental consent is required for users under 18</Text>
                    </View>
                  </ScrollArea>
                  <Pressable onPress={() => Linking.openURL(PRIVACY_URL)} hitSlop={6}>
                    <Text style={s.inlineLink}>Read full Privacy Policy →</Text>
                  </Pressable>
                </View>
              </View>

              {/* Acceptance Checkboxes */}
              <View style={s.checkboxesWrap}>
                <Pressable style={s.checkboxRow} onPress={() => setTermsChecked(v => !v)}>
                  <Checkbox
                    checked={termsChecked}
                    onCheckedChange={(checked) => setTermsChecked(checked === true)}
                  />
                  <Label style={s.checkboxLabel}>
                    <Text>I have read and agree to the </Text>
                    <Text style={s.linkInline} onPress={() => Linking.openURL(TERMS_URL)}>Terms of Use</Text>
                    <Text>. I understand that I must provide accurate information and comply with all platform rules and applicable recruiting regulations.</Text>
                  </Label>
                </Pressable>

                <Pressable style={s.checkboxRow} onPress={() => setPrivacyChecked(v => !v)}>
                  <Checkbox
                    checked={privacyChecked}
                    onCheckedChange={(checked) => setPrivacyChecked(checked === true)}
                  />
                  <Label style={s.checkboxLabel}>
                    <Text>I have read and agree to the </Text>
                    <Text style={s.linkInline} onPress={() => Linking.openURL(PRIVACY_URL)}>Privacy Policy</Text>
                    <Text>. I consent to the collection, use, and sharing of my information as described, including making my published profile publicly accessible.</Text>
                  </Label>
                </Pressable>
              </View>

              <Text style={s.versionText}>Terms Version: {getCurrentTermsVersion()}</Text>
            </CardContent>

            <CardFooter>
              <Button
                size="lg"
                onPress={handleAccept}
                disabled={!canAccept || acceptTerms.isPending}
                loading={acceptTerms.isPending}
                leftIcon={!acceptTerms.isPending ? <CheckCircle size={16} color={colors.primaryForeground} /> : undefined}
                style={s.acceptButton}
              >
                {acceptTerms.isPending ? 'Processing...' : 'Accept and Continue'}
              </Button>
            </CardFooter>
          </Card>
        </ScrollArea>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  loadingScreen: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  screen: { flex: 1, backgroundColor: colors.background },
  scrollContent: { padding: spacing.md, flexGrow: 1, justifyContent: 'center' },
  card: { width: '100%', maxWidth: 672, alignSelf: 'center' },
  headerCenter: { alignItems: 'center' },
  iconRow: { flexDirection: 'row', justifyContent: 'center', gap: spacing.md, marginBottom: spacing.md },
  iconBubble: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.primary + '1A', alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: typography.fontSize['2xl'] ?? 24, fontFamily: typography.fontFamily.heading, textAlign: 'center' },
  content: { gap: spacing.lg },
  stack: { gap: spacing.md },
  summaryBox: { backgroundColor: colors.secondary + '4D', borderRadius: 8, padding: spacing.md, borderWidth: 1, borderColor: colors.border + '80' },
  summaryHeading: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  summaryHeadingText: { fontFamily: typography.fontFamily.bodySemiBold, fontSize: typography.fontSize.base, color: colors.foreground },
  summaryScroll: { height: 144 },
  bulletList: { gap: spacing.sm },
  bullet: { fontSize: typography.fontSize.sm, color: colors.foregroundSubtle, lineHeight: 20 },
  inlineLink: { fontSize: typography.fontSize.sm, color: colors.primary, marginTop: spacing.sm },
  checkboxesWrap: { gap: spacing.md, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.border },
  checkboxRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  checkboxLabel: { flex: 1, fontSize: typography.fontSize.sm, lineHeight: 20, color: colors.foreground },
  linkInline: { color: colors.primary },
  versionText: { fontSize: typography.fontSize.xs, color: colors.foregroundSubtle, textAlign: 'center' },
  acceptButton: { width: '100%' },
});
