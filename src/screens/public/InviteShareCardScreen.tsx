// Ported from Lovable web src/pages/InviteShareCard.tsx (295 LOC).
// Web → RN translation:
//   - useSearchParams → useRoute<RouteProp>().params (token / from / role)
//   - useNavigate → useNavigation().navigate
//   - <Link> → Pressable + nav.navigate
//   - sessionStorage → AsyncStorage
//   - lucide-react → lucide-react-native
//   - framer-motion entrance → Animated.View fade+slide
//   - <img>/<a> for image card → Image (PDFs open via Linking.openURL)
//   - trackEvent + share_card_invite_events insert preserved against supabase
//   - SEO is no-op shim
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  Pressable,
  ActivityIndicator,
  Animated,
  Linking,
} from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import {
  Sparkles,
  ArrowRight,
  Mail,
  ShieldCheck,
  Trophy,
  Users,
  FileText,
} from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { useAuth } from '@/contexts/AuthContext';
import { roleToInitialRoute } from '@/navigation/RootNavigator';
import SEO from '@/components/SEO';
import { supabase } from '@/integrations/supabase/client';

import { colors, typography, spacing, radius } from '@/lib/theme';
import type { PublicProfileStackParamList } from '@/navigation/stacks/PublicProfileStack';

// PORT-PENDING: web uses AnalyticsProvider's exported `trackEvent`. RN's
// AnalyticsProvider doesn't expose it yet — log + best-effort supabase event
// row insert below preserves the data trail until the helper is ported.
const trackEvent = (event: string, payload?: Record<string, any>) => {
  if (__DEV__) {
    // eslint-disable-next-line no-console
    console.log('[analytics]', event, payload || {});
  }
};

const ROLE_LABEL: Record<string, string> = {
  athlete: 'Athlete',
  coach: 'College Coach',
  hs_coach: 'High School Coach',
  club_coach: 'Club Coach',
  scout: 'Scout',
  recruiting_agency: 'Recruiting Agency',
  influencer: 'Influencer',
  parent: 'Parent',
};

interface InviteRecord {
  id: string;
  token: string;
  sender_name: string;
  sender_role: string | null;
  card_storage_path: string | null;
  card_mime_type: string | null;
  card_file_name: string | null;
  message: string | null;
  expires_at: string;
}

// PORT-PENDING: Web reads token via query string. The RN PublicProfileStack
// declares `InviteShareCard: undefined`; we accept optional params here so
// link-handlers can pass token/from/role without changing the stack signature.
type R = RouteProp<{ InviteShareCard: { token?: string; from?: string; role?: string } | undefined }, 'InviteShareCard'>;

export default function InviteShareCardScreen() {
  const { params } = useRoute<R>();
  const nav = useNavigation<any>();
  const { user, userRole, isLoading: loading } = useAuth() as any;
  const isAuthenticated = !!user;
  const homeTarget = (user ? roleToInitialRoute(userRole) : 'AuthStack') as string;

  const token = params?.token || '';
  const fallbackSenderName = (params?.from || 'An OfferHound user').slice(0, 80);
  const fallbackRole = (params?.role || '').toLowerCase();

  const [invite, setInvite] = useState<InviteRecord | null>(null);
  const [inviteLoading, setInviteLoading] = useState<boolean>(!!token);
  const [cardUrl, setCardUrl] = useState<string | null>(null);

  const senderName = invite?.sender_name || fallbackSenderName;
  const role = (invite?.sender_role || fallbackRole).toLowerCase();
  const roleLabel = ROLE_LABEL[role] || 'OfferHound member';
  const isImageCard = invite?.card_mime_type?.startsWith('image/');
  const isPdfCard = invite?.card_mime_type === 'application/pdf';

  // Animated entrance
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(16)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start();
  }, [opacity, translateY]);

  // Fetch invite by token
  useEffect(() => {
    if (!token) return;
    let active = true;
    (async () => {
      const { data, error } = await supabase
        .from('share_card_invites')
        .select(
          'id, token, sender_name, sender_role, card_storage_path, card_mime_type, card_file_name, message, expires_at',
        )
        .eq('token', token)
        .maybeSingle();
      if (!active) return;
      if (!error && data) {
        setInvite(data as InviteRecord);
        if ((data as any).card_storage_path) {
          const { data: pub } = supabase.storage
            .from('share-cards')
            .getPublicUrl((data as any).card_storage_path);
          setCardUrl(pub.publicUrl);
        }
      }
      setInviteLoading(false);
    })();
    return () => { active = false; };
  }, [token]);

  // Persist invite source for post-signup attribution.
  useEffect(() => {
    AsyncStorage.setItem(
      'share_card_invite',
      JSON.stringify({ from: senderName, role, token, ts: Date.now() }),
    ).catch(() => {});
  }, [senderName, role, token]);

  // Track view event
  useEffect(() => {
    if (loading) return;
    if (token && inviteLoading) return;
    const eventType = isAuthenticated ? 'authed_visit' : 'view';
    trackEvent('share_card_invite_view', { token: token || null, authed: isAuthenticated });
    if (token && invite?.id) {
      supabase
        .from('share_card_invite_events')
        .insert({
          invite_id: invite.id,
          invite_token: token,
          event_type: eventType,
          user_agent: 'OfferHoundMobile',
        } as any)
        .then(() => {}, () => {});
    }
  }, [loading, isAuthenticated, token, invite?.id, inviteLoading]);

  const recordAcceptClick = async () => {
    trackEvent('share_card_invite_accept_click', { token: token || null });
    if (token && invite?.id) {
      supabase
        .from('share_card_invite_events')
        .insert({
          invite_id: invite.id,
          invite_token: token,
          event_type: 'accept_click',
          user_agent: 'OfferHoundMobile',
        } as any)
        .then(() => {}, () => {});
    }
    await AsyncStorage.setItem(
      'share_card_invite_pending_conversion',
      JSON.stringify({ token, invite_id: invite?.id || null, ts: Date.now() }),
    ).catch(() => {});
  };

  const handleAcceptUnauthed = async () => {
    await recordAcceptClick();
    await AsyncStorage.setItem('post_auth_redirect', '/').catch(() => {});
    // PORT-PENDING: web routes to /auth?mode=signup. Map to RN Auth screen.
    nav.navigate('AuthStack' as any, { mode: 'signup' });
  };

  const handleSkip = () => {
    nav.navigate(homeTarget as any);
  };

  const valueProps = useMemo(
    () => [
      { Icon: Trophy, label: 'Build a recruit-ready profile' },
      { Icon: Users, label: 'Connect with coaches & scouts' },
      { Icon: ShieldCheck, label: 'Verified, safe, parent-friendly' },
    ],
    [],
  );

  if (loading || (token && inviteLoading)) {
    return (
      <View style={s.center}>
        <Text style={s.muted}>Loading invitation…</Text>
        <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.sm }} />
      </View>
    );
  }

  return (
    <>
      <SEO
        title={`${senderName} invited you to OfferHound™`}
        description={`${senderName} shared their OfferHound card with you.`}
      />
      <ScrollView contentContainerStyle={s.outer}>
        <Animated.View style={[s.inner, { opacity, transform: [{ translateY }] }]}>
          <View style={s.brandRow}>
            <Text style={s.brand}>
              OFFER<Text style={{ color: colors.primary }}>HOUND</Text>
              <Text style={s.tm}>™</Text>
            </Text>
          </View>

          <Card style={s.card}>
            <View style={s.cardHeader}>
              <View style={{ alignSelf: 'flex-start', marginBottom: spacing.sm }}>
                <Badge variant="outline">
                  <View style={s.headerBadge}>
                    <Mail size={12} color={colors.primary} />
                    <Text style={s.headerBadgeText}>You've been invited</Text>
                  </View>
                </Badge>
              </View>
              <Text style={s.title}>{senderName} shared their card with you</Text>
              <Text style={s.subtitle}>
                Sent from a {roleLabel} on OfferHound™ — the recruiting platform built for high
                school athletes, coaches, and families.
              </Text>
            </View>

            <CardContent style={s.cardBody}>
              {!!cardUrl && (
                <View style={s.previewWrap}>
                  <View style={s.previewHead}>
                    <Text style={s.previewLabel}>SHARED CARD</Text>
                    <Pressable
                      onPress={() => {
                        trackEvent('share_card_invite_card_opened', { token: token || null });
                        Linking.openURL(cardUrl);
                      }}>
                      <Text style={s.previewLink}>Open full size</Text>
                    </Pressable>
                  </View>
                  {isImageCard ? (
                    <Pressable onPress={() => Linking.openURL(cardUrl)}>
                      <Image source={{ uri: cardUrl }} style={s.previewImg} resizeMode="contain" />
                    </Pressable>
                  ) : isPdfCard ? (
                    <Pressable style={s.pdfRow} onPress={() => Linking.openURL(cardUrl)}>
                      <FileText size={28} color={colors.primary} />
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={s.pdfTitle} numberOfLines={1}>
                          {invite?.card_file_name || 'Shared PDF'}
                        </Text>
                        <Text style={s.pdfHint}>Tap to view PDF</Text>
                      </View>
                    </Pressable>
                  ) : null}
                </View>
              )}

              <View style={s.valueGrid}>
                {valueProps.map(({ Icon, label }) => (
                  <View key={label} style={s.valueCell}>
                    <Icon size={16} color={colors.primary} />
                    <Text style={s.valueText}>{label}</Text>
                  </View>
                ))}
              </View>

              {isAuthenticated ? (
                <View style={{ gap: spacing.sm }}>
                  <Text style={s.muted}>
                    You're already signed in to OfferHound.{' '}
                    {cardUrl ? "Here's the card they sent you." : 'Head to your home to keep going.'}
                  </Text>
                  <Button
                    onPress={() => nav.navigate(homeTarget as any)}
                    size="lg"
                    rightIcon={<ArrowRight size={16} color={colors.primaryForeground} />}>
                    Go to My Home
                  </Button>
                </View>
              ) : (
                <View style={{ gap: spacing.sm }}>
                  <Button
                    onPress={handleAcceptUnauthed}
                    size="lg"
                    leftIcon={<Sparkles size={16} color={colors.primaryForeground} />}>
                    Accept & Create Free Account
                  </Button>
                  <Button onPress={handleSkip} variant="outline" size="lg">
                    Continue without account
                  </Button>
                  <Pressable
                    onPress={() => nav.navigate('AuthStack' as any, { mode: 'signin' })}
                    style={s.signInLine}>
                    <Text style={s.muted}>Already a member? </Text>
                    <Text style={s.signInLink}>Sign in</Text>
                  </Pressable>
                </View>
              )}
            </CardContent>
          </Card>

          <Text style={s.legal}>
            By accepting, you agree to OfferHound's Terms and Privacy Policy.
          </Text>
        </Animated.View>
      </ScrollView>
    </>
  );
}

const s = StyleSheet.create({
  outer: { flexGrow: 1, padding: spacing.lg, backgroundColor: colors.background, paddingVertical: spacing.xxl, alignItems: 'center' },
  inner: { width: '100%', maxWidth: 520 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  muted: { color: colors.mutedForeground, fontFamily: typography.fontFamily.body, fontSize: 13 },

  brandRow: { alignItems: 'center', marginBottom: spacing.md },
  brand: { fontFamily: typography.fontFamily.heading, fontSize: 22, color: colors.foreground, letterSpacing: 1 },
  tm: { color: colors.primary, fontSize: 10, fontFamily: typography.fontFamily.body },

  card: { borderColor: colors.primary, borderWidth: 1, overflow: 'hidden' },
  cardHeader: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.background },
  headerBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  headerBadgeText: { color: colors.primary, fontSize: 11, fontFamily: typography.fontFamily.body },
  title: { fontFamily: typography.fontFamily.heading, fontSize: 24, color: colors.foreground, lineHeight: 28 },
  subtitle: { color: colors.mutedForeground, fontSize: 13, marginTop: spacing.sm, fontFamily: typography.fontFamily.body, lineHeight: 18 },

  cardBody: { padding: spacing.lg, gap: spacing.lg },

  previewWrap: { gap: spacing.xs },
  previewHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  previewLabel: { fontSize: 10, fontFamily: typography.fontFamily.body, color: colors.mutedForeground, letterSpacing: 0.5, fontWeight: '600' },
  previewLink: { color: colors.primary, fontSize: 11, fontFamily: typography.fontFamily.body, textDecorationLine: 'underline' },
  previewImg: { width: '100%', aspectRatio: 1, borderRadius: radius.md, backgroundColor: colors.muted, borderWidth: 1, borderColor: colors.border },
  pdfRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card },
  pdfTitle: { fontFamily: typography.fontFamily.body, fontSize: 13, color: colors.foreground, fontWeight: '500' },
  pdfHint: { fontSize: 11, color: colors.mutedForeground, fontFamily: typography.fontFamily.body },

  valueGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  valueCell: { flexBasis: '100%', flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, padding: spacing.sm, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card },
  valueText: { color: colors.foreground, fontSize: 12, flex: 1, fontFamily: typography.fontFamily.body, lineHeight: 16 },

  signInLine: { flexDirection: 'row', justifyContent: 'center', paddingTop: spacing.xs },
  signInLink: { color: colors.primary, fontFamily: typography.fontFamily.body, fontSize: 13, textDecorationLine: 'underline' },

  legal: { textAlign: 'center', fontSize: 11, color: colors.mutedForeground, marginTop: spacing.lg, fontFamily: typography.fontFamily.body },
});
