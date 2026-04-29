// HSCoachReferralPanel — RN port of Lovable src/components/hs-coach/HSCoachReferralPanel.tsx
// Verbatim port, web→RN mappings:
//   - Card / CardContent / CardHeader / CardTitle / CardDescription → RN Card primitives
//   - Button / Badge → RN primitives
//   - Avatar/AvatarImage/AvatarFallback (shadcn composed) → single RN <Avatar source fallback />
//   - lucide-react → lucide-react-native
//   - react-router-dom useNavigate → @react-navigation/native useNavigation
//     ("/hs-coach/letters" and "/athletes" and "/p/:custom_url" are Lovable web routes;
//     mapped to RN screens via NAV_MAP in navigateToLink().)
//   - className + tailwind → StyleSheet + inline dynamic styles
//   - URLSearchParams → plain object passed as RN navigation params
//   - grid sm:grid-cols-2 lg:grid-cols-3 → RN does not have CSS grid; we use a flex-wrap row
//     with each card sized to roughly 1/2 width on phones (parity with sm: breakpoint).
//
// GAPS_IN_LOVABLE captured during port:
//   * Routes "/hs-coach/letters", "/athletes", "/p/:custom_url" have no direct RN screens yet.
//     Calls go through navigateToLink() which currently routes to HSCoachTabs (home) and logs
//     a TODO. A follow-up nav-mapping session should create the dedicated screens and update
//     NAV_MAP. This preserves verbatim panel parity while leaving the nav as a known gap.
//   * Lovable supabase query embeds teams!inner and player_profiles relation; the same RPC
//     call shape works against the shared supabase client (types.ts). Behaviour is parity.
import React from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import {
  GraduationCap,
  Mail,
  Search,
  Users,
  Send,
} from 'lucide-react-native';
import type { RootStackParamList } from '@/navigation/RootNavigator';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { colors, typography, spacing } from '@/lib/theme';

// NAV_MAP: Lovable route strings → RN navigation targets.
// Verbatim parity for the panel; nav layer is a known gap (see header).
type LovableRoute =
  | { kind: 'letters'; athlete?: string; athlete_id?: string }
  | { kind: 'athletes' }
  | { kind: 'profile'; custom_url: string };

/**
 * HS Coach Athlete Referral Panel.
 * Lists rostered athletes with quick "Refer to College Coach" actions
 * that route into the AI Letter Center (/hs-coach/letters) pre-loaded
 * with a recommendation template for the chosen athlete.
 */
export function HSCoachReferralPanel() {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const { user } = useAuth();

  const navigateToLink = (target: LovableRoute) => {
    const nav = navigation as any;
    switch (target.kind) {
      case 'letters':
        nav.navigate('LetterComposer', {
          seed: {
            athleteName: target.athlete,
            athleteId: target.athlete_id,
            letterType: 'recruiting',
          },
        });
        return;
      case 'athletes':
        // TODO: 'AthleteSearch' is not yet a top-level Stack.Screen in
        // src/navigation/RootNavigator.tsx — register AthleteSearchScreen there.
        nav.navigate('AthleteSearch');
        return;
      case 'profile':
        nav.navigate('PublicProfileStack', {
          screen: 'PublicProfile',
          params: { customUrl: target.custom_url },
        });
        return;
      default:
        // eslint-disable-next-line no-console
        console.warn('[HSCoachReferralPanel] unknown nav target', target);
        nav.navigate('HSCoachTabs');
    }
  };

  const { data: rosterAthletes, isLoading } = useQuery({
    queryKey: ['hs-coach-referral-roster', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from('team_rosters')
        .select(
          'id, athlete_profile_id, athlete_name, position, jersey_number, graduation_year, status, teams!inner(coach_user_id, name), player_profiles:athlete_profile_id(id, full_name, profile_image_url, position, school, graduation_year, custom_url)'
        )
        .eq('teams.coach_user_id', user.id)
        .neq('status', 'removed')
        .order('athlete_name');
      return data || [];
    },
    enabled: !!user,
  });

  const handleRefer = (athleteName: string, athleteProfileId?: string) => {
    navigateToLink({ kind: 'letters', athlete: athleteName, athlete_id: athleteProfileId });
  };

  return (
    <ScrollView contentContainerStyle={s.root}>
      <Card>
        <CardHeader>
          <View style={s.titleRow}>
            <GraduationCap size={20} color={colors.primary} />
            <CardTitle>Athlete Referrals</CardTitle>
          </View>
          <CardDescription>
            Refer rostered athletes directly to college coaches. Each referral opens the AI Letter Center
            pre-loaded with a recommendation template highlighting the athlete you've selected.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <View style={s.loadingWrap}>
              <ActivityIndicator size="small" color={colors.primary} />
            </View>
          ) : !rosterAthletes || rosterAthletes.length === 0 ? (
            <View style={s.emptyWrap}>
              <Users size={40} color={colors.mutedForeground} />
              <Text style={s.emptyText}>
                Add athletes to your roster to start referring them to college coaches.
              </Text>
              <Button
                variant="outline"
                size="sm"
                onPress={() => navigateToLink({ kind: 'athletes' })}
              >
                <View style={s.btnRow}>
                  <Search size={16} color={colors.foreground} />
                  <Text style={s.btnTextOutline}>Find Athletes</Text>
                </View>
              </Button>
            </View>
          ) : (
            <View style={s.grid}>
              {rosterAthletes.map((r: any) => {
                const name = r.player_profiles?.full_name || r.athlete_name;
                const img = r.player_profiles?.profile_image_url;
                const position = r.player_profiles?.position || r.position;
                const gradYear = r.player_profiles?.graduation_year || r.graduation_year;
                return (
                  <View key={r.id} style={s.athleteCard}>
                    <View style={s.athleteRow}>
                      <Avatar
                        source={img ? { uri: img } : null}
                        fallback={name?.charAt(0) || 'A'}
                        size={48}
                      />
                      <View style={s.athleteInfo}>
                        <Text style={s.name} numberOfLines={1}>
                          {name}
                        </Text>
                        <Text style={s.position}>{position || '—'}</Text>
                        {gradYear ? (
                          <Badge variant="secondary" style={s.gradBadge}>
                            <Text style={s.gradBadgeText}>Class of {gradYear}</Text>
                          </Badge>
                        ) : null}
                        {r.jersey_number ? (
                          <Text style={s.jersey}>#{r.jersey_number}</Text>
                        ) : null}
                      </View>
                    </View>
                    <View style={s.actionRow}>
                      <View style={{ flex: 1 }}>
                        <Button
                          size="sm"
                          onPress={() => handleRefer(name, r.athlete_profile_id)}
                        >
                          <View style={s.btnRow}>
                            <Send size={12} color={colors.primaryForeground} />
                            <Text style={s.btnTextPrimary}>Refer</Text>
                          </View>
                        </Button>
                      </View>
                      {r.player_profiles?.custom_url ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onPress={() =>
                            navigateToLink({
                              kind: 'profile',
                              custom_url: r.player_profiles.custom_url,
                            })
                          }
                        >
                          <Text style={s.btnTextOutline}>View</Text>
                        </Button>
                      ) : null}
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <View style={s.titleRow}>
            <Mail size={16} color={colors.foreground} />
            <CardTitle style={s.titleSm}>AI Letter Center</CardTitle>
          </View>
          <CardDescription>
            Compose individual, bulk, or campaign letters for college coaches and scouts.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onPress={() => navigateToLink({ kind: 'letters' })}>
            <Text style={s.btnTextPrimary}>Open AI Letter Center</Text>
          </Button>
        </CardContent>
      </Card>
    </ScrollView>
  );
}

export default HSCoachReferralPanel;

const s = StyleSheet.create({
  root: { gap: spacing.lg, padding: spacing.md },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  titleSm: { fontSize: typography.fontSize.base },
  loadingWrap: { paddingVertical: 40, alignItems: 'center', justifyContent: 'center' },
  emptyWrap: { paddingVertical: 40, alignItems: 'center', gap: spacing.sm },
  emptyText: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.sm,
    color: colors.mutedForeground,
    textAlign: 'center',
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  athleteCard: {
    flexBasis: '48%',
    flexGrow: 1,
    padding: spacing.md,
    backgroundColor: colors.secondary,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  athleteRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  athleteInfo: { flex: 1, minWidth: 0 },
  name: {
    fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: typography.fontSize.sm,
    color: colors.foreground,
  },
  position: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.xs,
    color: colors.primary,
  },
  gradBadge: { marginTop: 4, alignSelf: 'flex-start' },
  gradBadgeText: { fontSize: 10, color: colors.secondaryForeground },
  jersey: {
    fontFamily: typography.fontFamily.body,
    fontSize: 10,
    color: colors.mutedForeground,
    marginTop: 4,
  },
  actionRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  btnRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  btnTextPrimary: {
    fontFamily: typography.fontFamily.bodySemiBold,
    color: colors.primaryForeground,
    fontSize: typography.fontSize.sm,
  },
  btnTextOutline: {
    fontFamily: typography.fontFamily.bodySemiBold,
    color: colors.foreground,
    fontSize: typography.fontSize.sm,
  },
});
