// Ported from Lovable web: src/components/club/TeamRosterAthleteCard.tsx
// Translations:
//   <div>/<p>/<h3>/<span>/<a> → <View>/<Text>/<Pressable>+Linking
//   Tailwind classes → StyleSheet using @/lib/theme tokens
//   @/components/ui/* (lowercase) → PascalCase imports
//   lucide-react → lucide-react-native
//   react-router useNavigate → @react-navigation/native useNavigation
//   <img> → <Image>
//   MessageButton API normalised to v2 signature (recipientId)
//   Data logic (useQuery for player_profiles + props.callbacks) unchanged
import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { MessageButton } from '@/components/MessageButton';
import {
  User,
  GraduationCap,
  MapPin,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Mail,
  AlertCircle,
  Trash2,
  CheckCircle2,
  Link2,
  Send,
} from 'lucide-react-native';
import { colors, spacing, typography } from '@/lib/theme';
import { RosterTransferButton } from '@/components/club/RosterTransferButton';

interface RosterRow {
  id: string;
  athlete_name: string;
  athlete_email?: string | null;
  athlete_profile_id?: string | null;
  position?: string | null;
  jersey_number?: string | null;
  school?: string | null;
  graduation_year?: number | null;
  status?: string | null;
  parent_name?: string | null;
  parent_email?: string | null;
  zorts_completed?: boolean | null;
  zorts_registration_url?: string | null;
  player_profiles?: {
    profile_image_url?: string | null;
    full_name?: string | null;
  } | null;
}

interface Props {
  roster: RosterRow;
  /** Coach can manage roster (resend invite, mark zorts, remove, parent invite). */
  canManage: boolean;
  /** Coach can message + view profile (club coach owner OR team staff). */
  canMessage: boolean;
  resendInvitePending: boolean;
  resendInviteVariables: string | undefined;
  onResendInvite: (id: string) => void;
  onToggleZortsDone: (id: string) => void;
  onParentInvite: (id: string, currentEmail: string | null) => void;
  onRemove: (id: string) => void;
  onSendLetter: (athleteProfileId: string, athleteName: string) => void;
  /** The team this roster entry belongs to — used by RosterTransferButton. */
  sourceTeamId?: string;
}

/**
 * Roster athlete card matching the Coach AthleteSearch card style.
 * Expands to show the linked OfferHound player profile preview.
 */
export function TeamRosterAthleteCard({
  roster,
  canManage,
  canMessage,
  resendInvitePending,
  resendInviteVariables,
  onResendInvite,
  onToggleZortsDone,
  onParentInvite,
  onRemove,
  onSendLetter,
  sourceTeamId,
}: Props) {
  const navigation = useNavigation<any>();
  const [expanded, setExpanded] = useState(false);

  const { data: profile } = useQuery({
    queryKey: ['roster-player-profile', roster.athlete_profile_id, expanded],
    queryFn: async () => {
      if (!roster.athlete_profile_id) return null;
      const { data } = await supabase
        .from('player_profiles')
        .select(
          'id, full_name, profile_image_url, position, school, graduation_year, city, state, height, weight, gpa, custom_url, is_published, sport, bio',
        )
        .eq('id', roster.athlete_profile_id)
        .maybeSingle();
      return data;
    },
    enabled: !!roster.athlete_profile_id && expanded,
  });

  const isPublished = !!profile?.is_published;
  const displayName = profile?.full_name || roster.athlete_name;
  const profileImg = profile?.profile_image_url || roster.player_profiles?.profile_image_url || null;
  const position = profile?.position || roster.position;
  const school = profile?.school || roster.school;
  const gradYear = profile?.graduation_year || roster.graduation_year;

  const statusVariant = (st?: string | null): any => {
    const map: Record<string, any> = {
      invited: 'secondary',
      joined: 'default',
      parent_pending: 'outline',
      approved: 'default',
      complete: 'default',
    };
    return map[st || 'invited'] || 'secondary';
  };

  const goToProfile = () => {
    if (profile?.custom_url || roster.athlete_profile_id) {
      navigation.navigate('PublicProfileStack' as never, {
        screen: 'PublicProfile',
        params: { customUrl: profile?.custom_url || roster.athlete_profile_id },
      } as never);
    }
  };

  return (
    <Card style={s.card}>
      <CardContent style={{ padding: spacing.md }}>
        {/* Header */}
        <View style={s.headerRow}>
          <View style={s.avatarBox}>
            {profileImg ? (
              <Image source={{ uri: profileImg }} style={s.avatarImg} />
            ) : (
              <User size={24} color={colors.mutedForeground} />
            )}
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <View style={s.nameRow}>
              <Text style={s.name} numberOfLines={1}>{displayName}</Text>
              <Badge variant={statusVariant(roster.status)} style={s.tinyBadge}>
                <Text style={s.tinyBadgeText}>
                  {(roster.status || '').replace(/_/g, ' ')}
                </Text>
              </Badge>
              {isPublished && (
                <Badge variant="success" style={s.tinyBadge}>
                  <Text style={[s.tinyBadgeText, { color: '#fff' }]}>Public</Text>
                </Badge>
              )}
              {roster.zorts_completed ? (
                <Badge variant="success" style={s.tinyBadge}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                    <CheckCircle2 size={10} color="#fff" />
                    <Text style={[s.tinyBadgeText, { color: '#fff' }]}>Zorts</Text>
                  </View>
                </Badge>
              ) : roster.zorts_registration_url ? (
                <Badge variant="outline" style={{ ...s.tinyBadge, borderColor: '#fcd34d' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                    <Link2 size={10} color={colors.warning} />
                    <Text style={[s.tinyBadgeText, { color: colors.warning }]}>Zorts Pending</Text>
                  </View>
                </Badge>
              ) : null}
            </View>
            <Text style={s.subtle}>
              {position || '—'}
              {roster.jersey_number ? `   #${roster.jersey_number}` : ''}
            </Text>
          </View>
          <Pressable
            onPress={() => setExpanded((v) => !v)}
            style={s.expandBtn}
            accessibilityLabel={expanded ? 'Collapse' : 'Expand'}
          >
            {expanded ? (
              <ChevronUp size={16} color={colors.foreground} />
            ) : (
              <ChevronDown size={16} color={colors.foreground} />
            )}
          </Pressable>
        </View>

        {/* Quick chips */}
        <View style={s.chipsRow}>
          {school ? (
            <Badge variant="outline" style={s.chip}>
              <View style={s.chipInner}>
                <GraduationCap size={12} color={colors.foreground} />
                <Text style={s.chipText}>{school}</Text>
              </View>
            </Badge>
          ) : null}
          {gradYear ? (
            <Badge variant="secondary" style={s.chip}>
              <Text style={[s.chipText, { color: colors.secondaryForeground }]}>
                '{String(gradYear).slice(-2)}
              </Text>
            </Badge>
          ) : null}
          {(profile?.city || profile?.state) ? (
            <Badge variant="secondary" style={s.chip}>
              <View style={s.chipInner}>
                <MapPin size={12} color={colors.secondaryForeground} />
                <Text style={[s.chipText, { color: colors.secondaryForeground }]}>
                  {[profile?.city, profile?.state].filter(Boolean).join(', ')}
                </Text>
              </View>
            </Badge>
          ) : null}
        </View>

        {/* Parent line */}
        {roster.parent_name ? (
          <Text style={s.parentLine}>
            Parent: {roster.parent_name}
            {roster.parent_email ? ` · ${roster.parent_email}` : ''}
          </Text>
        ) : null}

        {/* Expanded profile preview */}
        {expanded ? (
          <View style={s.expandedBlock}>
            {!roster.athlete_profile_id ? (
              <Text style={s.italicNote}>
                No OfferHound profile yet — invitation pending.
              </Text>
            ) : !profile ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <ActivityIndicator size="small" color={colors.mutedForeground} />
                <Text style={s.italicNote}>Loading profile…</Text>
              </View>
            ) : (
              <>
                <View style={s.infoGrid}>
                  {profile.height ? <InfoCell label="Height" value={String(profile.height)} /> : null}
                  {profile.weight ? <InfoCell label="Weight" value={`${profile.weight} lbs`} /> : null}
                  {profile.gpa ? <InfoCell label="GPA" value={String(profile.gpa)} /> : null}
                  {profile.sport ? <InfoCell label="Sport" value={String(profile.sport)} /> : null}
                </View>
                {profile.bio ? (
                  <Text style={s.bio} numberOfLines={3}>{profile.bio}</Text>
                ) : null}
                <Button variant="outline" size="sm" onPress={goToProfile} style={{ width: '100%' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <ExternalLink size={12} color={colors.foreground} />
                    <Text style={s.btnTextXs}>View Full Profile</Text>
                  </View>
                </Button>
              </>
            )}
          </View>
        ) : null}

        {/* Action row */}
        <View style={s.actionRow}>
          {canMessage && roster.athlete_profile_id ? (
            <View style={{ flex: 1, minWidth: 90 }}>
              <MessageButton
                recipientId={roster.athlete_profile_id}
                recipientName={displayName}
              />
            </View>
          ) : null}
          {isPublished && roster.athlete_profile_id ? (
            <Button
              variant="default"
              size="sm"
              style={{ flex: 1, minWidth: 90 }}
              onPress={() => onSendLetter(roster.athlete_profile_id!, displayName)}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Send size={14} color={colors.primaryForeground} />
                <Text style={s.btnTextXs}>Letter</Text>
              </View>
            </Button>
          ) : null}

          {/* Management-only actions */}
          {canManage ? (
            <>
              {roster.zorts_registration_url && !roster.zorts_completed ? (
                <Button
                  size="sm"
                  variant="ghost"
                  onPress={() => onToggleZortsDone(roster.id)}
                >
                  <View style={s.btnInline}>
                    <CheckCircle2 size={12} color={colors.foreground} />
                    <Text style={s.btnTextXs}>Zorts Done</Text>
                  </View>
                </Button>
              ) : null}
              {roster.zorts_registration_url ? (
                <Button
                  size="sm"
                  variant="ghost"
                  onPress={() => Linking.openURL(roster.zorts_registration_url!)}
                >
                  <View style={s.btnInline}>
                    <ExternalLink size={12} color={colors.foreground} />
                    <Text style={s.btnTextXs}>Zorts</Text>
                  </View>
                </Button>
              ) : null}
              {!roster.parent_email ? (
                <Button
                  size="sm"
                  variant="ghost"
                  onPress={() => onParentInvite(roster.id, roster.parent_email || null)}
                >
                  <View style={s.btnInline}>
                    <Mail size={12} color={colors.foreground} />
                    <Text style={s.btnTextXs}>Parent</Text>
                  </View>
                </Button>
              ) : null}
              {roster.athlete_email || roster.parent_email ? (
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={resendInvitePending}
                  onPress={() => onResendInvite(roster.id)}
                >
                  <View style={s.btnInline}>
                    {resendInvitePending && resendInviteVariables === roster.id ? (
                      <ActivityIndicator size="small" color={colors.foreground} />
                    ) : (
                      <Mail size={12} color={colors.foreground} />
                    )}
                    <Text style={s.btnTextXs}>Send Invite</Text>
                  </View>
                </Button>
              ) : null}
              {roster.parent_email && roster.status === 'parent_pending' ? (
                <Badge variant="outline" style={{ ...s.tinyBadge, alignSelf: 'center' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                    <AlertCircle size={10} color={colors.foreground} />
                    <Text style={s.tinyBadgeText}>Awaiting Parent</Text>
                  </View>
                </Badge>
              ) : null}
              {roster.athlete_profile_id && sourceTeamId ? (
                <RosterTransferButton
                  athleteProfileId={roster.athlete_profile_id}
                  athleteName={displayName}
                  sourceTeamId={sourceTeamId}
                />
              ) : null}
              <Pressable
                onPress={() => onRemove(roster.id)}
                style={s.removeBtn}
                accessibilityLabel="Remove athlete"
              >
                <Trash2 size={12} color={colors.destructive} />
              </Pressable>
            </>
          ) : null}
        </View>
      </CardContent>
    </Card>
  );
}

function InfoCell({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ width: '48%' }}>
      <Text style={s.infoLabel}>{label.toUpperCase()}</Text>
      <Text style={s.infoValue}>{value}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  card: { marginVertical: 4 },

  headerRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, marginBottom: spacing.sm },
  avatarBox: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: colors.muted, alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
  },
  avatarImg: { width: 48, height: 48, borderRadius: 24 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  name: {
    fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: typography.fontSize.base,
    color: colors.foreground,
    flexShrink: 1,
  },
  subtle: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.sm,
    color: colors.mutedForeground,
  },

  expandBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center', borderRadius: 6 },

  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginBottom: spacing.sm },
  chip: { paddingHorizontal: spacing.xs + 2 },
  chipInner: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  chipText: { fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.xs, color: colors.foreground },

  parentLine: {
    fontFamily: typography.fontFamily.body,
    fontSize: 11,
    color: colors.mutedForeground,
    marginBottom: 6,
  },

  expandedBlock: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
    marginTop: spacing.xs,
    gap: spacing.xs + 2,
  },
  italicNote: {
    fontFamily: typography.fontFamily.body,
    fontStyle: 'italic',
    fontSize: typography.fontSize.xs,
    color: colors.mutedForeground,
  },
  infoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs + 2 },
  infoLabel: { fontFamily: typography.fontFamily.body, fontSize: 10, color: colors.mutedForeground, letterSpacing: 0.5 },
  infoValue: { fontFamily: typography.fontFamily.bodySemiBold, fontSize: typography.fontSize.sm, color: colors.foreground },
  bio: { fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.xs, color: colors.mutedForeground },

  actionRow: {
    flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs + 2,
    paddingTop: spacing.xs, borderTopWidth: 1, borderTopColor: colors.border, marginTop: spacing.sm,
    alignItems: 'center',
  },

  btnInline: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  btnTextXs: { fontFamily: typography.fontFamily.bodySemiBold, fontSize: typography.fontSize.xs, color: colors.foreground },

  tinyBadge: { paddingHorizontal: 6, paddingVertical: 1 },
  tinyBadgeText: {
    fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: 10,
    color: colors.foreground,
    textTransform: 'capitalize',
  },

  removeBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center', borderRadius: 6 },
});

export default TeamRosterAthleteCard;
