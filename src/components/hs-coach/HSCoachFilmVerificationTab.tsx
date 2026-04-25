// HSCoachFilmVerificationTab — RN port of Lovable src/components/hs-coach/HSCoachFilmVerificationTab.tsx
// Verbatim port, web→RN mappings:
//   - Card / CardContent / CardHeader / CardTitle / CardDescription → RN Card primitives
//   - Button / Badge / Textarea / Label / Avatar → RN primitives (@/components/ui)
//   - lucide-react → lucide-react-native
//   - useToast (sonner-like) → shared @/hooks/use-toast (RN port)
//   - <a href target="_blank"> → React Native Linking.openURL
//   - className + tailwind → StyleSheet + small dynamic styles
//   - Avatar (shadcn composed) → single RN <Avatar source fallback />
//
// GAPS_IN_LOVABLE captured during port:
//   * No new gaps. Supabase query shape (media_verifications + nested player_profiles)
//     is identical to Lovable.
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Linking,
  Pressable,
} from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Textarea } from '@/components/ui/Textarea';
import { Label } from '@/components/ui/Label';
import { Avatar } from '@/components/ui/Avatar';
import { Film, Loader2, ShieldCheck, ExternalLink, Video } from 'lucide-react-native';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { colors, typography, spacing } from '@/lib/theme';

/**
 * HS Coach Film Verification Tab.
 * Lists film/highlight verification requests from rostered athletes
 * and allows the HS coach to stamp them as verified game film.
 */
export function HSCoachFilmVerificationTab() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Roster athlete profile IDs
  const { data: rosterIds } = useQuery({
    queryKey: ['hs-coach-film-roster-ids', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from('team_rosters')
        .select('athlete_profile_id, teams!inner(coach_user_id)')
        .eq('teams.coach_user_id', user.id)
        .not('athlete_profile_id', 'is', null);
      return (data || []).map((r: any) => r.athlete_profile_id);
    },
    enabled: !!user,
  });

  // Pull all film/media verification rows for roster athletes
  const { data: mediaRows, isLoading } = useQuery({
    queryKey: ['hs-coach-film-verifications', rosterIds],
    queryFn: async () => {
      if (!rosterIds || rosterIds.length === 0) return [];
      const { data } = await supabase
        .from('media_verifications')
        .select(
          'id, athlete_profile_id, media_url, media_type, external_platform, is_verified, verified_at, coach_notes, created_at, player_profiles:athlete_profile_id(full_name, profile_image_url)'
        )
        .in('athlete_profile_id', rosterIds)
        .order('created_at', { ascending: false });
      return data || [];
    },
    enabled: !!rosterIds && rosterIds.length > 0,
  });

  const handleVerify = async (id: string) => {
    if (!user) return;
    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('media_verifications')
        .update({
          is_verified: true,
          verified_at: new Date().toISOString(),
          coach_notes: notes.trim() || null,
        })
        .eq('id', id);
      if (error) throw error;
      toast({
        title: 'Film verified',
        description: 'This film has been marked as authentic by you.',
      });
      setActiveId(null);
      setNotes('');
      queryClient.invalidateQueries({ queryKey: ['hs-coach-film-verifications'] });
    } catch (e: any) {
      toast({
        title: 'Could not verify',
        description: e.message,
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={s.root}>
      <Card>
        <CardHeader>
          <View style={s.titleRow}>
            <Film size={20} color={colors.primary} />
            <CardTitle>Film Verification</CardTitle>
          </View>
          <CardDescription>
            Verify game film and highlight reels uploaded by athletes on your roster. Verified film carries a
            trust badge for college coaches reviewing the player.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <View style={s.loadingWrap}>
              <ActivityIndicator size="small" color={colors.primary} />
            </View>
          ) : !mediaRows || mediaRows.length === 0 ? (
            <View style={s.emptyWrap}>
              <Video size={40} color={colors.mutedForeground} />
              <Text style={s.emptyText}>
                No film verification requests from roster athletes yet.
              </Text>
              <Text style={s.emptyHint}>
                Athletes can request verification from any reference coach on their profile.
              </Text>
            </View>
          ) : (
            <View style={s.list}>
              {mediaRows.map((m: any) => {
                const isActive = activeId === m.id;
                return (
                  <View key={m.id} style={s.row}>
                    <View style={s.rowTop}>
                      <Avatar
                        source={
                          m.player_profiles?.profile_image_url
                            ? { uri: m.player_profiles.profile_image_url }
                            : null
                        }
                        fallback={m.player_profiles?.full_name?.charAt(0) || 'A'}
                        size={40}
                      />
                      <View style={s.rowInfo}>
                        <Text style={s.name} numberOfLines={1}>
                          {m.player_profiles?.full_name}
                        </Text>
                        <View style={s.badgeRow}>
                          {m.media_type ? (
                            <Badge variant="outline" style={s.smallBadge}>
                              <Text style={s.smallBadgeText}>
                                {String(m.media_type).replace(/_/g, ' ')}
                              </Text>
                            </Badge>
                          ) : null}
                          {m.external_platform ? (
                            <Badge variant="secondary" style={s.smallBadge}>
                              <Text style={s.smallBadgeText}>{m.external_platform}</Text>
                            </Badge>
                          ) : null}
                        </View>
                        <Pressable
                          onPress={() => Linking.openURL(m.media_url)}
                          style={s.linkRow}
                        >
                          <ExternalLink size={12} color={colors.primary} />
                          <Text style={s.linkText}>View Film</Text>
                        </Pressable>
                      </View>
                      <View>
                        {m.is_verified ? (
                          <Badge style={s.verifiedBadge}>
                            <View style={s.verifiedBadgeRow}>
                              <ShieldCheck size={12} color={colors.primaryForeground} />
                              <Text style={s.verifiedBadgeText}>Verified</Text>
                            </View>
                          </Badge>
                        ) : (
                          <Button
                            size="sm"
                            variant={isActive ? 'secondary' : 'default'}
                            onPress={() => setActiveId(isActive ? null : m.id)}
                          >
                            <Text
                              style={
                                isActive ? s.btnTextSecondary : s.btnTextPrimary
                              }
                            >
                              {isActive ? 'Cancel' : 'Verify'}
                            </Text>
                          </Button>
                        )}
                      </View>
                    </View>

                    {isActive && !m.is_verified ? (
                      <View style={s.expandedBlock}>
                        <View style={s.fieldGroup}>
                          <Label style={s.fieldLabel}>Verification Notes (optional)</Label>
                          <Textarea
                            rows={2}
                            value={notes}
                            onChangeText={setNotes}
                            placeholder="Confirm this is authentic game film..."
                          />
                        </View>
                        <Button
                          size="sm"
                          onPress={() => handleVerify(m.id)}
                          disabled={submitting}
                        >
                          <View style={s.btnRow}>
                            {submitting ? (
                              <Loader2 size={12} color={colors.primaryForeground} />
                            ) : (
                              <ShieldCheck size={12} color={colors.primaryForeground} />
                            )}
                            <Text style={s.btnTextPrimary}>
                              {submitting ? 'Verifying...' : 'Mark as Verified Film'}
                            </Text>
                          </View>
                        </Button>
                      </View>
                    ) : null}
                  </View>
                );
              })}
            </View>
          )}
        </CardContent>
      </Card>
    </ScrollView>
  );
}

export default HSCoachFilmVerificationTab;

const s = StyleSheet.create({
  root: { padding: spacing.md, gap: spacing.lg },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  loadingWrap: { paddingVertical: 32, alignItems: 'center', justifyContent: 'center' },
  emptyWrap: { paddingVertical: 40, alignItems: 'center', gap: spacing.sm },
  emptyText: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.sm,
    color: colors.mutedForeground,
    textAlign: 'center',
  },
  emptyHint: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.xs,
    color: colors.mutedForeground,
    textAlign: 'center',
  },
  list: { gap: spacing.sm },
  row: {
    padding: spacing.md,
    backgroundColor: colors.secondary,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  rowTop: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  rowInfo: { flex: 1, minWidth: 0 },
  name: {
    fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: typography.fontSize.sm,
    color: colors.foreground,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: 4,
    flexWrap: 'wrap',
  },
  smallBadge: {},
  smallBadgeText: { fontSize: 10, color: colors.foreground },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  linkText: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.xs,
    color: colors.primary,
    textDecorationLine: 'underline',
  },
  verifiedBadge: {
    backgroundColor: colors.primary,
  },
  verifiedBadgeRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  verifiedBadgeText: {
    color: colors.primaryForeground,
    fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: 10,
  },
  expandedBlock: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: spacing.sm,
  },
  fieldGroup: { gap: 6 },
  fieldLabel: {
    fontSize: typography.fontSize.xs,
    color: colors.foreground,
  },
  btnRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  btnTextPrimary: {
    fontFamily: typography.fontFamily.bodySemiBold,
    color: colors.primaryForeground,
    fontSize: typography.fontSize.sm,
  },
  btnTextSecondary: {
    fontFamily: typography.fontFamily.bodySemiBold,
    color: colors.secondaryForeground,
    fontSize: typography.fontSize.sm,
  },
});
