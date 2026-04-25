// CoachAthleteMatchesScreen — RN port of Lovable web CoachAthleteMatches page.
// Source: offerhound-repo/src/pages/CoachAthleteMatches.tsx (83 LOC)
//
// Adaptations (web → RN):
//   - <div>/<h1>/<p>          → <View>/<Text>
//   - className utility classes → StyleSheet
//   - lucide-react              → lucide-react-native
//   - useNavigate (router)      → useNavigation (react-navigation)
//   - SEO component             → omitted (RN has no <head>)
//   - useLetterCenter hook      → not yet ported in RN; we build a minimal
//                                 inline `goToLetterForAthlete` that opens
//                                 the LetterComposer modal with seed payload.
//   - LetterButton (web)        → PORT-PENDING; rendered as a small Button
//                                 that triggers the same navigation.
//   - AthleteMatchCard          → already ported (src/components/athlete)
//
// Wiring: registered into RootNavigator as a cross-cutting modal-style screen
// (see RootNavigator.tsx).
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Pressable,
} from 'react-native';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { RefreshCw, Send } from 'lucide-react-native';
import { BackButton } from '@/components/BackButton';
import { Footer } from '@/components/Footer';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { AthleteMatchCard } from '@/components/athlete/AthleteMatchCard';
import { useCoachAthleteMatches } from '@/hooks/useCoachAthleteMatches';
import { useRefreshCoachAthleteMatches } from '@/hooks/useRefreshCoachAthleteMatches';
import { colors, typography, spacing } from '@/lib/theme';
import type { RootStackParamList } from '@/navigation/RootNavigator';

export default function CoachAthleteMatchesScreen() {
  const nav = useNavigation<NavigationProp<RootStackParamList>>();
  const { data: matches = [], isLoading } = useCoachAthleteMatches();
  const { refreshMatches, isRefreshing } = useRefreshCoachAthleteMatches();

  // PORT-PENDING: useLetterCenter hook (Lovable). Inline minimal version.
  const goToLetterForAthlete = (athlete: any) => {
    nav.navigate('LetterComposer', {
      seed: {
        recipientCategory: 'athlete',
        recipientName: athlete?.full_name,
        recipientEmail: athlete?.email,
        athleteProfileId: athlete?.id,
      },
    });
  };

  const goToMessages = (athlete: any) => {
    // RN Messages screen takes no params today; PORT-PENDING for athlete
    // pre-selection. We still navigate to Messages so flow continues.
    nav.navigate('Messages');
    void athlete;
  };

  return (
    <SafeAreaView style={s.root}>
      <ScrollView contentContainerStyle={s.content}>
        <BackButton />

        <View style={s.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={s.title}>Athlete Matches</Text>
            <Text style={s.subtitle}>
              AI-powered athlete recommendations based on your needs
            </Text>
          </View>
          <Button
            variant="outline"
            size="sm"
            onPress={() => refreshMatches()}
            disabled={isRefreshing}
            leftIcon={<RefreshCw size={14} color={colors.foreground} />}
          >
            {isRefreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
        </View>

        {isLoading ? (
          <Text style={s.statusText}>Loading matches...</Text>
        ) : matches.length === 0 ? (
          <Card>
            <CardContent>
              <Text style={s.emptyText}>
                No matches found yet. Complete your profile and position needs
                to get AI-powered recommendations.
              </Text>
            </CardContent>
          </Card>
        ) : (
          <View style={s.list}>
            {matches.map((match: any) => (
              <AthleteMatchCard
                key={match.id}
                variant="full"
                athlete={{
                  id: match.athlete?.id || match.athlete_profile_id,
                  full_name: match.athlete?.full_name,
                  position: match.athlete?.position,
                  school: match.athlete?.school,
                  graduation_year: match.athlete?.graduation_year,
                  city: match.athlete?.city,
                  state: match.athlete?.state,
                  profile_image_url: match.athlete?.profile_image_url,
                  custom_url: match.athlete?.custom_url,
                  email: match.athlete?.email,
                }}
                scores={{
                  match_score: match.match_score,
                  athletic_fit_score: match.athletic_fit_score,
                  academic_fit_score: match.academic_fit_score,
                  geographic_fit_score: match.geographic_fit_score,
                  match_reason: match.match_reason,
                  priority: match.priority || undefined,
                }}
                letterSlot={
                  // PORT-PENDING: <LetterButton ... /> shadcn variant.
                  <Pressable
                    onPress={() => goToLetterForAthlete(match.athlete)}
                    style={s.letterBtn}
                    accessibilityRole="button"
                    accessibilityLabel="Send letter"
                  >
                    <Send size={12} color={colors.primaryForeground} />
                    <Text style={s.letterBtnText}>Letter</Text>
                  </Pressable>
                }
                onMessage={() => goToMessages(match.athlete)}
              />
            ))}
          </View>
        )}

        <Footer />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: {
    padding: spacing.md,
    paddingBottom: spacing.xxxl,
    gap: spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  title: {
    fontFamily: typography.fontFamily.heading,
    fontSize: typography.fontSize['3xl'],
    color: colors.foreground,
    letterSpacing: typography.letterSpacing.heading,
  },
  subtitle: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.sm,
    color: colors.mutedForeground,
    marginTop: 4,
  },
  statusText: {
    textAlign: 'center',
    paddingVertical: spacing.xl,
    color: colors.mutedForeground,
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.sm,
  },
  emptyText: {
    textAlign: 'center',
    paddingVertical: spacing.xl,
    color: colors.mutedForeground,
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.sm,
  },
  list: { gap: spacing.sm },
  letterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: colors.primary,
  },
  letterBtnText: {
    fontFamily: typography.fontFamily.bodyMedium,
    fontSize: typography.fontSize.xs,
    color: colors.primaryForeground,
  },
});
