// Ported from Lovable web src/pages/PublicProfile.tsx (219 LOC).
// Web → RN translation:
//   - useParams + useSearchParams → useRoute<RouteProp>().params (no preview query yet)
//   - navigator.share / clipboard → expo-sharing + expo-clipboard via Share API
//   - lucide-react → lucide-react-native
//   - <Link> → useNavigation().navigate
//   - SEO is a no-op shim (RN has no <head>); kept in tree for parity.
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Share,
  Pressable,
} from 'react-native';
import { useRoute, useNavigation, RouteProp, CommonActions } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { Loader2, AlertCircle, Home, Share2, Check, ShieldOff } from 'lucide-react-native';

import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useCoachProfile } from '@/hooks/useCoachProfile';
import { useScoutProfile } from '@/hooks/useScoutProfile';
import { useHSCoachProfile } from '@/hooks/useHSCoachProfile';
import { roleToInitialRoute } from '@/navigation/RootNavigator';
import { getAgeBand } from '@/lib/getAgeBand';

import { HeroSection } from '@/components/HeroSection';
import { AthleteProfile } from '@/components/AthleteProfile';
import { Footer } from '@/components/Footer';
import { HighlightMediaWindow } from '@/components/HighlightMediaWindow';
import { BackButton } from '@/components/BackButton';
import SEO from '@/components/SEO';
import { MessageButton } from '@/components/MessageButton';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { RequestTranscriptButton } from '@/components/transcripts/RequestTranscriptButton';

import { colors, typography, spacing } from '@/lib/theme';
import type { PublicProfileStackParamList } from '@/navigation/stacks/PublicProfileStack';
import Toast from 'react-native-toast-message';

type R = RouteProp<PublicProfileStackParamList, 'PublicProfile'>;

// PORT-PENDING: web hosts profiles at offerhound.com/p/<slug>; replicate
// production origin until a runtime env source is wired in.
const SITE_ORIGIN = 'https://offerhound.com';

export default function PublicProfileScreen() {
  const { params } = useRoute<R>();
  const slug = params?.customUrl;
  const nav = useNavigation<any>();
  const { user, userRole } = useAuth() as any;
  const homeTarget = (user ? roleToInitialRoute(userRole) : 'LandingTab') as string;

  const { data: coachProfile } = useCoachProfile();
  const { data: scoutProfile } = useScoutProfile();
  const { data: hsCoachProfile } = useHSCoachProfile();
  const [hasCopiedLink, setHasCopiedLink] = useState(false);

  const isClubCoach = !!(coachProfile as any)?.is_club_coach;
  const isHSCoach = !!hsCoachProfile;
  const isScout = !!scoutProfile;
  const isCollegeCoach = !!coachProfile && !isClubCoach;
  const senderRole: 'athlete' | 'coach' | 'club_coach' | 'scout' | 'agency' = isHSCoach
    ? 'coach'
    : isClubCoach
    ? 'club_coach'
    : isCollegeCoach
    ? 'coach'
    : isScout
    ? 'scout'
    : 'athlete';

  const { data: profile, isLoading } = useQuery({
    queryKey: ['public-profile', slug],
    queryFn: async () => {
      if (!slug) return null;
      let { data } = await supabase
        .from('player_profiles')
        .select('*')
        .eq('custom_url', slug)
        .maybeSingle();
      if (!data) {
        const res = await supabase
          .from('player_profiles')
          .select('*')
          .eq('id', slug)
          .maybeSingle();
        data = res.data;
      }
      return data as any;
    },
    enabled: !!slug,
  });

  const shareUrl = slug ? `${SITE_ORIGIN}/p/${slug}` : SITE_ORIGIN;

  const handleShare = async () => {
    try {
      const result = await Share.share({
        title: `${profile?.full_name || 'Athlete'}'s Profile`,
        message: `Check out ${profile?.full_name || 'this athlete'}'s recruiting profile on OfferHound™! ${shareUrl}`,
        url: shareUrl,
      });
      if (result.action === Share.sharedAction) {
        setHasCopiedLink(true);
        setTimeout(() => setHasCopiedLink(false), 2000);
      }
    } catch {
      Toast.show({ type: 'error', text1: 'Failed to share' });
    }
  };

  if (isLoading) {
    return (
      <View style={s.loading}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={s.loading}>
        <Card style={s.notFoundCard}>
          <CardContent style={s.notFoundContent}>
            <AlertCircle size={48} color={colors.mutedForeground} />
            <Text style={s.notFoundTitle}>Profile Not Found</Text>
            <Text style={s.notFoundDesc}>
              This profile doesn't exist or hasn't been published yet.
            </Text>
            <Button
              onPress={() =>
                nav.dispatch(CommonActions.navigate({ name: homeTarget as any }))
              }
              leftIcon={<Home size={16} color={colors.primaryForeground} />}>
              Go Home
            </Button>
          </CardContent>
        </Card>
      </View>
    );
  }

  // Under-15 hard-block — never render a 'child'-band profile publicly.
  // getAgeBand returns 'child' for age < 15; 'unknown' (no DOB) is treated
  // as permissive so profiles without a date_of_birth are still viewable.
  const ageBand = getAgeBand((profile as any).date_of_birth ?? null);
  if (ageBand === 'child') {
    return (
      <View style={s.loading}>
        <Card style={s.notFoundCard}>
          <CardContent style={s.notFoundContent}>
            <ShieldOff size={48} color={colors.mutedForeground} />
            <Text style={s.notFoundTitle}>Profile Unavailable</Text>
            <Text style={s.notFoundDesc}>
              This profile is not publicly accessible.
            </Text>
            <Button
              onPress={() =>
                nav.dispatch(CommonActions.navigate({ name: homeTarget as any }))
              }
              leftIcon={<Home size={16} color={colors.primaryForeground} />}>
              Go Home
            </Button>
          </CardContent>
        </Card>
      </View>
    );
  }

  const seoTitle = `${profile.full_name} - ${profile.position || 'Athlete'} | OfferHound`;
  const seoDescription = `View ${profile.full_name}'s recruiting profile.`;

  const showHighlight =
    profile.show_highlight_video !== false && !!profile.highlight_video_url;

  const isViewerNotOwner = !!profile?.id && !!user && user.id !== profile.user_id;

  return (
    <View style={s.container}>
      <SEO title={seoTitle} description={seoDescription} />
      <ScrollView contentContainerStyle={s.scroll}>
        <View style={s.topBar}>
          <BackButton label="Back" />
        </View>

        {/* Hero */}
        <HeroSection isOwnerView={false} profile={profile} />

        {/* Highlight Media */}
        {showHighlight && (
          <View style={s.highlightWrap}>
            <HighlightMediaWindow videoSrc={profile.highlight_video_url} />
          </View>
        )}

        {/* Share + actions */}
        <View style={s.actionRow}>
          <Button
            variant="outline"
            onPress={handleShare}
            leftIcon={
              hasCopiedLink ? (
                <Check size={16} color={colors.success ?? colors.primary} />
              ) : (
                <Share2 size={16} color={colors.foreground} />
              )
            }>
            {hasCopiedLink ? 'Copied!' : 'Share Profile'}
          </Button>

          {isViewerNotOwner && (
            <RequestTranscriptButton
              athleteProfileId={profile.id}
              athleteName={profile.full_name}
            />
          )}

          {/* PORT-PENDING: web `LetterButton` (role-aware AI Letter Center router)
              has no RN equivalent yet. Tracked under session-parity-port. */}

          {isViewerNotOwner && (
            <MessageButton
              recipientId={profile.user_id}
              recipientName={profile.full_name || 'Athlete'}
            />
          )}
        </View>

        {/* Athlete Profile section (perf radar + events live in this component) */}
        <AthleteProfile profile={profile} />

        <Footer />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background, padding: spacing.lg },
  scroll: { paddingBottom: spacing.xxxl },
  topBar: { paddingHorizontal: spacing.lg, paddingTop: spacing.xxl, paddingBottom: spacing.sm },
  highlightWrap: {
    marginTop: -80,
    marginBottom: spacing.lg,
    alignItems: 'center',
    zIndex: 10,
  },
  actionRow: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  notFoundCard: { width: '100%', maxWidth: 420 },
  notFoundContent: { alignItems: 'center', gap: spacing.md, padding: spacing.lg },
  notFoundTitle: { fontFamily: typography.fontFamily.heading, fontSize: 20, color: colors.foreground },
  notFoundDesc: { color: colors.mutedForeground, textAlign: 'center', fontFamily: typography.fontFamily.body },
});
