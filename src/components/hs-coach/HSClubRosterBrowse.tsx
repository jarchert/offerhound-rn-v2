/**
 * HSClubRosterBrowse — RN port of MAIN src/components/hs/HSClubRosterBrowse.tsx
 *
 * Shows claimable club athletes (teams with recruiting_enabled=true).
 * HS coach can search by name/school and submit a transfer claim.
 *
 * RPCs:
 *   list_claimable_club_athletes(p_search, p_limit) → ClaimableAthlete[]
 *   request_roster_transfer_claim(p_source_roster_id, p_destination_team_id, p_note) → uuid
 */
import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TextInput,
  Pressable,
  ScrollView,
  Modal,
} from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Label } from '@/components/ui/Label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/Select';
import { ArrowRightLeft, Search, Users, ShieldCheck } from 'lucide-react-native';
import { useToast } from '@/hooks/use-toast';
import { colors, spacing, typography } from '@/lib/theme';

interface ClaimableAthlete {
  roster_id: string;
  athlete_name: string;
  athlete_position: string | null;
  graduation_year: number | null;
  school: string | null;
  jersey_number: string | null;
  team_id: string;
  team_name: string;
  team_sport: string | null;
  athlete_profile_id: string;
  has_open_request: boolean;
}

interface HSTeamOption {
  id: string;
  name: string;
}

interface Props {
  hsProfileId: string;
}

export function HSClubRosterBrowse({ hsProfileId }: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [teams, setTeams] = useState<HSTeamOption[]>([]);
  const [claimTarget, setClaimTarget] = useState<ClaimableAthlete | null>(null);
  const [destinationTeamId, setDestinationTeamId] = useState('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { data: athletes = [], isLoading: loading } = useQuery({
    queryKey: ['claimable-club-athletes', appliedSearch],
    queryFn: async () => {
      const { data, error } = await (supabase.rpc as any)('list_claimable_club_athletes', {
        p_search: appliedSearch || null,
        p_limit: 50,
      });
      if (error) {
        toast({ title: 'Could not load club athletes', description: error.message, variant: 'destructive' });
        throw error;
      }
      return (data as ClaimableAthlete[]) || [];
    },
  });

  const loadTeams = async () => {
    const { data, error } = await supabase
      .from('teams')
      .select('id, name')
      .eq('hs_coach_profile_id', hsProfileId)
      .eq('is_active', true)
      .order('name');
    if (!error && data) {
      setTeams(data as HSTeamOption[]);
      if (data.length === 1) setDestinationTeamId(data[0].id);
    }
  };

  useEffect(() => {
    loadTeams();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hsProfileId]);

  const openClaim = (athlete: ClaimableAthlete) => {
    setClaimTarget(athlete);
    setNote('');
    if (teams.length === 1) setDestinationTeamId(teams[0].id);
  };

  const submitClaim = async () => {
    if (!claimTarget || !destinationTeamId) return;
    setSubmitting(true);
    const { error } = await (supabase.rpc as any)('request_roster_transfer_claim', {
      p_source_roster_id: claimTarget.roster_id,
      p_destination_team_id: destinationTeamId,
      p_note: note.trim() || null,
    });
    setSubmitting(false);
    if (error) {
      toast({ title: 'Claim request failed', description: error.message, variant: 'destructive' });
      return;
    }
    toast({
      title: 'Transfer request sent',
      description: 'The club coach reviews it first, then the parent consents for minors.',
    });
    setClaimTarget(null);
    queryClient.invalidateQueries({ queryKey: ['claimable-club-athletes'] });
    queryClient.invalidateQueries({ queryKey: ['hs-transfer-requests'] });
  };

  const emptyState = useMemo(() => !loading && athletes.length === 0, [loading, athletes.length]);

  return (
    <View style={s.container}>
      <Card>
        <CardHeader>
          <View style={s.titleRow}>
            <ArrowRightLeft size={18} color={colors.primary} />
            <CardTitle>Club Athletes</CardTitle>
          </View>
          <CardDescription>
            Club teams that opted into high school visibility. Request a transfer to bring an
            athlete onto your roster — the club coach approves, and a parent consents for minors.
          </CardDescription>
        </CardHeader>
        <CardContent style={{ gap: spacing.md }}>
          {/* Search bar */}
          <View style={s.searchRow}>
            <TextInput
              style={s.searchInput}
              placeholder="Search by athlete or school..."
              placeholderTextColor={colors.mutedForeground}
              value={search}
              onChangeText={setSearch}
              onSubmitEditing={() => setAppliedSearch(search)}
              returnKeyType="search"
            />
            <Pressable
              style={s.searchBtn}
              onPress={() => setAppliedSearch(search)}
            >
              <Search size={16} color={colors.primaryForeground} />
              <Text style={s.searchBtnText}>Search</Text>
            </Pressable>
          </View>

          {/* Loading */}
          {loading && (
            <View style={s.centered}>
              <ActivityIndicator color={colors.mutedForeground} />
              <Text style={s.loadingText}>Loading club athletes...</Text>
            </View>
          )}

          {/* Empty state */}
          {emptyState && (
            <View style={s.centered}>
              <Users size={40} color={colors.mutedForeground} />
              <Text style={s.emptyTitle}>No claimable athletes yet</Text>
              <Text style={s.emptySubtitle}>
                Athletes appear here only when their club coach enables "Visible to high school
                coaches" on that team.
              </Text>
            </View>
          )}

          {/* Athlete list */}
          {!loading && athletes.length > 0 && (
            <View style={s.grid}>
              {athletes.map((a) => (
                <Card key={a.roster_id} style={s.athleteCard}>
                  <CardContent style={{ padding: spacing.md, gap: spacing.sm }}>
                    <View style={s.athleteHeader}>
                      <View style={{ flex: 1 }}>
                        <Text style={s.athleteName}>{a.athlete_name}</Text>
                        <Text style={s.athleteMeta}>
                          {[
                            a.athlete_position,
                            a.school,
                            a.graduation_year ? `Class of ${a.graduation_year}` : null,
                          ]
                            .filter(Boolean)
                            .join(' · ')}
                        </Text>
                      </View>
                      {a.jersey_number ? (
                        <Badge variant="secondary">
                          <Text style={s.jerseyText}>#{a.jersey_number}</Text>
                        </Badge>
                      ) : null}
                    </View>

                    <View style={s.badgeRow}>
                      <Badge variant="outline">
                        <Text style={s.badgeText}>{a.team_name}</Text>
                      </Badge>
                      {a.team_sport ? (
                        <Badge variant="outline">
                          <Text style={s.badgeText}>{a.team_sport}</Text>
                        </Badge>
                      ) : null}
                    </View>

                    {a.has_open_request ? (
                      <View style={s.pendingBadge}>
                        <ShieldCheck size={12} color={colors.mutedForeground} />
                        <Text style={s.pendingBadgeText}>Transfer request pending</Text>
                      </View>
                    ) : (
                      <Button
                        size="sm"
                        onPress={() => openClaim(a)}
                        leftIcon={<ArrowRightLeft size={14} color={colors.primaryForeground} />}
                      >
                        Request Transfer
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))}
            </View>
          )}
        </CardContent>
      </Card>

      {/* Claim dialog */}
      <Modal
        visible={!!claimTarget}
        transparent
        animationType="fade"
        onRequestClose={() => setClaimTarget(null)}
      >
        <View style={s.overlay}>
          <View style={s.dialog}>
            <Text style={s.dialogTitle}>Request Roster Transfer</Text>
            {claimTarget ? (
              <Text style={s.dialogDesc}>
                Ask {claimTarget.team_name} to release {claimTarget.athlete_name} to your program.
              </Text>
            ) : null}

            <View style={{ gap: spacing.md, marginTop: spacing.md }}>
              {/* Destination team */}
              <View style={{ gap: spacing.xs }}>
                <Label>Destination Team *</Label>
                {teams.length === 0 ? (
                  <Text style={s.noTeamsText}>
                    Create a team on the Roster tab first — a transfer needs a destination roster.
                  </Text>
                ) : (
                  <Select value={destinationTeamId} onValueChange={setDestinationTeamId}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {teams.map((t) => (
                        <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </View>

              {/* Note */}
              <View style={{ gap: spacing.xs }}>
                <Label>Note to the club coach</Label>
                <TextInput
                  style={s.textarea}
                  placeholder="Optional context for the club coach..."
                  placeholderTextColor={colors.mutedForeground}
                  value={note}
                  onChangeText={setNote}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
              </View>

              {/* Disclaimer */}
              <View style={s.disclaimer}>
                <Text style={s.disclaimerText}>
                  Nothing moves automatically. The club coach approves or declines first, and for
                  athletes under 18 a linked parent must consent before the transfer completes.
                </Text>
              </View>
            </View>

            <View style={s.dialogFooter}>
              <Button
                variant="outline"
                style={{ flex: 1 }}
                onPress={() => setClaimTarget(null)}
              >
                Cancel
              </Button>
              <Button
                style={{ flex: 1 }}
                disabled={submitting || !destinationTeamId}
                onPress={submitClaim}
                leftIcon={
                  submitting ? (
                    <ActivityIndicator size="small" color={colors.primaryForeground} />
                  ) : undefined
                }
              >
                Send Request
              </Button>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  container: { gap: spacing.md },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  searchRow: { flexDirection: 'row', gap: spacing.sm },
  searchInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.sm,
    color: colors.foreground,
  },
  searchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  searchBtnText: {
    fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: typography.fontSize.sm,
    color: colors.primaryForeground,
  },
  centered: { padding: spacing.xl, alignItems: 'center', gap: spacing.sm },
  loadingText: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.sm,
    color: colors.mutedForeground,
  },
  emptyTitle: {
    fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: typography.fontSize.base,
    color: colors.foreground,
    marginTop: spacing.xs,
  },
  emptySubtitle: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.sm,
    color: colors.mutedForeground,
    textAlign: 'center',
  },
  grid: { gap: spacing.sm },
  athleteCard: { marginVertical: 0 },
  athleteHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  athleteName: {
    fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: typography.fontSize.base,
    color: colors.foreground,
  },
  athleteMeta: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.xs,
    color: colors.mutedForeground,
    marginTop: 2,
  },
  jerseyText: { fontFamily: typography.fontFamily.body, fontSize: 11 },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  badgeText: { fontFamily: typography.fontFamily.body, fontSize: 11 },
  pendingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 6,
    paddingVertical: spacing.xs,
    backgroundColor: colors.muted,
  },
  pendingBadgeText: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.xs,
    color: colors.mutedForeground,
  },
  // Dialog
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  dialog: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  dialogTitle: {
    fontFamily: typography.fontFamily.heading,
    fontSize: typography.fontSize.lg,
    color: colors.foreground,
  },
  dialogDesc: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.sm,
    color: colors.mutedForeground,
    marginTop: 4,
  },
  noTeamsText: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.sm,
    color: colors.mutedForeground,
  },
  textarea: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: spacing.sm,
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.sm,
    color: colors.foreground,
    minHeight: 72,
  },
  disclaimer: {
    backgroundColor: `${colors.primary}10`,
    borderWidth: 1,
    borderColor: `${colors.primary}30`,
    borderRadius: 8,
    padding: spacing.sm,
  },
  disclaimerText: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.xs,
    color: colors.mutedForeground,
  },
  dialogFooter: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
});
