import {acceptedRoster} from '@/lib/teamMembership';
import {referralParams} from '@/lib/athleteReferral';
import {toast} from '@/components/ui/toast';
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
    const nav=navigation as any;
    if(target.kind==='letters')nav.navigate('HSCoachTabs',{screen:'LettersTab',params:{}});
    else if(target.kind==='athletes')nav.navigate('AthleteSearch');
    else nav.navigate('PublicProfileStack',{screen:'PublicProfile',params:{customUrl:target.custom_url}});
  };

  const { data: rosterAthletes, isLoading, isError, refetch } = useQuery({
    queryKey: ['hs-coach-referral-roster', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('team_rosters')
        .select(
          'id, athlete_profile_id, athlete_name, position, jersey_number, graduation_year, status, removed_at, athlete_accepted_at, teams!inner(coach_user_id, name), player_profiles:athlete_profile_id(id, full_name, profile_image_url, position, positions, school, graduation_year, custom_url)'
        )
        .eq('teams.coach_user_id', user.id)
        .is('removed_at',null).not('status','in','(removed,transferred,declined)')
        .order('athlete_name');
      if(error)throw error;
      return data || [];
    },
    enabled: !!user,
  });

  const handleRefer = (row:any) => {
    try{(navigation as any).navigate('HSCoachTabs',{screen:'LettersTab',params:referralParams(row)});}
    catch(error:any){toast.error(error.message);}
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
          {isError ? <Button onPress={()=>void refetch()}>Retry loading referral roster</Button> : isLoading ? (
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
                const position = (r.player_profiles?.positions?.length?r.player_profiles.positions.join(', '):r.player_profiles?.position) || r.position;
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
                    {(!r.athlete_profile_id||!acceptedRoster(r))&&<Text style={s.position}>{!r.athlete_profile_id?"Available once this athlete's OfferHound profile is linked.":'Available once this athlete accepts their roster spot.'}</Text>}
                    <View style={s.actionRow}>
                      <View style={{ flex: 1 }}>
                        <Button
                          size="sm"
                          disabled={!r.athlete_profile_id||!acceptedRoster(r)}
                          onPress={() => handleRefer(r)}
                        >
                          <View style={s.btnRow}>
                            <Send size={12} color={colors.primaryForeground} />
                            <Text style={s.btnTextPrimary}>Refer to College Coach</Text>
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
