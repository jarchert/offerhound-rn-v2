// RN port of Lovable src/components/ProfileCardGenerator.tsx.
//
// Web→RN mapping:
//   - <div>/<h*>/<p>            → <View>/<Text>
//   - shadcn Button/Badge/Avatar → @/components/ui/*
//   - lucide-react              → lucide-react-native
//   - toast() (sonner)          → @/components/ui/toast
//   - qrcode.react QRCodeSVG    → react-native-qrcode-svg (already in deps)
//   - window.location.origin    → Constants.expoConfig?.hostUri fallback
//   - useRef<HTMLDivElement>()  → useRef<View>() — captured by CardShareActions
//
// Behavior preserved verbatim:
//   - Reads `profile` from usePlayerProfile.
//   - Copies profileUrl (custom_url → getProfileUrl(); fallback `${origin}/p/${id}`).
//   - Renders header (avatar + name + position/class/school), badges,
//     measurables grid, events table for event-based sports, radar graph,
//     QR code + share actions.

import React, { useRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Copy, MapPin, GraduationCap, Ruler, Weight, Zap, Mail, Phone, Shield, Star } from 'lucide-react-native';
import QRCode from 'react-native-qrcode-svg';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { toast } from '@/components/ui/toast';
import { AthletePerformanceRadar } from '@/components/AthletePerformanceRadar';
import { EventsTable } from '@/components/athlete/SportStatsEditor';
import { isEventBasedSport } from '@/lib/data/sportPositions';
import { usePlayerProfile } from '@/hooks/usePlayerProfile';
import { copyToClipboard, getProfileUrl } from '@/lib/utils';
import { CardShareActions } from '@/components/CardShareActions';
import { buildMecard } from '@/lib/mecard';
import { colors, typography, spacing, radius } from '@/lib/theme';

export const ProfileCardGenerator = () => {
  const { profile } = usePlayerProfile() as any;
  const cardRef = useRef<View>(null);

  if (!profile) return null;

  const profileUrl = profile.custom_url
    ? getProfileUrl(profile.custom_url)
    : `https://offerhound.app/p/${profile.id}`;
  const name = profile.full_name || 'Athlete';
  const initials = name
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const handleCopyLink = async () => {
    const ok = await copyToClipboard(profileUrl);
    toast.success(ok ? 'Profile link copied!' : 'Failed to copy link');
  };

  const measurables = [
    { label: 'Height', value: profile.height, icon: Ruler },
    { label: 'Weight', value: profile.weight ? `${profile.weight} lbs` : null, icon: Weight },
    { label: '40-Yard', value: profile.forty_yard ? `${profile.forty_yard}s` : null, icon: Zap },
    { label: 'GPA', value: profile.gpa, icon: GraduationCap },
  ].filter((m) => m.value);

  // Contact-visibility gating (Tier 3 #1): show email/phone on the card only
  // when BOTH the field is non-empty AND the athlete has explicitly opted in
  // via share_email_publicly / share_phone_publicly on player_profiles.
  // If neither survives the gate, the entire contact section is omitted so
  // captured/shared images never leak contact info the athlete hasn't shared.
  const visibleEmail =
    profile.share_email_publicly === true && typeof profile.email === 'string' && profile.email.trim()
      ? profile.email.trim()
      : null;
  const visiblePhone =
    profile.share_phone_publicly === true && typeof profile.phone === 'string' && profile.phone.trim()
      ? profile.phone.trim()
      : null;
  type ContactRow = {
    key: string;
    label: string;
    value: string;
    icon: (size: number, color: string) => React.ReactNode;
  };
  const contactRows: ContactRow[] = [
    visibleEmail && {
      key: 'email',
      label: 'Email',
      value: visibleEmail,
      icon: (size: number, color: string) => <Mail size={size} color={color} />,
    },
    visiblePhone && {
      key: 'phone',
      label: 'Phone',
      value: visiblePhone,
      icon: (size: number, color: string) => <Phone size={size} color={color} />,
    },
  ].filter(Boolean) as ContactRow[];

  // Verified shield + star rating (Tier 3 #2). Both are optional adornments
  // on the header. Star rating is a Postgres integer (probe: eq.5.0 → 22P02),
  // so we clamp to [0,5] and only render when the rounded value is > 0.
  const isVerified = profile.is_verified === true;
  const rawStars = typeof profile.star_rating === 'number' ? profile.star_rating : 0;
  const starCount = Math.max(0, Math.min(5, Math.round(rawStars)));

  // MECARD QR payload (Tier 3 #3). Uses the shared helper so this file and
  // RoleCardGenerator stay in lockstep. Critically, we pass ONLY the gated
  // visibleEmail / visiblePhone values from Tier 3 #1 — so the QR never
  // encodes contact info the athlete hasn't opted to share. When neither
  // survives the gate, the payload is just N:<name>;URL:<profileUrl>;; and
  // the QR still functions as a link, matching the pre-Tier-3 behavior.
  const qrPayload = buildMecard({
    name,
    phone: visiblePhone,
    email: visibleEmail,
    organization: profile.school ?? null,
    title: profile.position ?? null,
    location:
      profile.city && profile.state ? `${profile.city}, ${profile.state}` : profile.state ?? null,
    url: profileUrl,
  });

  return (
    <View style={s.wrap}>
      {/* Capture region: card + radar */}
      <View ref={cardRef} collapsable={false} style={s.capture}>
        {/* Player Card Header */}
        <View style={s.header}>
          <View style={s.accentBar} />
          <View style={s.headerBody}>
            <View style={s.identityRow}>
              <Avatar
                size={80}
                source={profile.profile_image_url ? { uri: profile.profile_image_url } : null}
                fallback={initials}
              />
              <View style={s.identityMeta}>
                <View style={s.nameRow}>
                  <Text style={s.name} numberOfLines={1}>
                    {name}
                  </Text>
                  {isVerified && (
                    <Shield
                      size={16}
                      color={colors.primary}
                      style={s.verifiedShield}
                      accessibilityLabel="Verified athlete"
                    />
                  )}
                </View>
                <View style={s.metaRow}>
                  {!!profile.position && <Text style={s.position}>{profile.position}</Text>}
                  {!!profile.position && !!profile.graduation_year && (
                    <Text style={s.metaSep}>·</Text>
                  )}
                  {!!profile.graduation_year && (
                    <Text style={s.metaText}>Class of {profile.graduation_year}</Text>
                  )}
                </View>
                <View style={s.metaRow}>
                  {!!profile.school && (
                    <View style={s.metaChip}>
                      <GraduationCap size={12} color={colors.mutedForeground} />
                      <Text style={s.metaText}>{profile.school}</Text>
                    </View>
                  )}
                  {!!profile.city && !!profile.state && (
                    <View style={s.metaChip}>
                      <MapPin size={12} color={colors.mutedForeground} />
                      <Text style={s.metaText}>
                        {profile.city}, {profile.state}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            </View>

            {/* Star rating (Tier 3 #2) — renders 5 stars, first N filled based on
                player_profiles.star_rating (integer, clamped to [0,5]). Hidden
                when rating is 0/null/absent. Placed under identity meta so it
                reads as a credential, not a decoration. */}
            {starCount > 0 && (
              <View
                style={s.starRow}
                accessibilityLabel={`Rated ${starCount} out of 5 stars`}
              >
                {[0, 1, 2, 3, 4].map((i) => {
                  const filled = i < starCount;
                  return (
                    <Star
                      key={i}
                      size={14}
                      color={colors.primary}
                      fill={filled ? colors.primary : 'transparent'}
                    />
                  );
                })}
              </View>
            )}

            {/* Badges */}
            <View style={s.badgeRow}>
              {!!profile.sport && <Badge>{profile.sport}</Badge>}
              {!!profile.state && <Badge variant="secondary">{profile.state}</Badge>}
              {profile.is_published && <Badge variant="outline">Published</Badge>}
            </View>

            {/* Measurables Row */}
            {measurables.length > 0 && (
              <View style={s.measurables}>
                {measurables.map((m) => (
                  <View key={m.label} style={s.measurableCell}>
                    <Text style={s.measurableLabel}>{m.label}</Text>
                    <Text style={s.measurableValue}>{m.value}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        </View>

        {/* Contact info (Tier 3 #1) — gated by share_email_publicly / share_phone_publicly.
            Rendered inside the capture region so the QR image reflects visible contact state.
            When both flags are off, the whole section is skipped. */}
        {contactRows.length > 0 && (
          <View style={s.contactGrid}>
            {contactRows.map((item) => (
              <View key={item.key} style={s.contactRow}>
                <View style={s.contactInner}>
                  {item.icon(14, colors.mutedForeground)}
                  <View style={s.contactText}>
                    <Text style={s.contactLabel}>{item.label}</Text>
                    <Text style={s.contactValue} numberOfLines={1}>{item.value}</Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Events Table — Track & Field / Swimming */}
        {isEventBasedSport(profile.sport) && profile.sport_stats && (
          <View style={s.eventsWrap}>
            <Text style={s.eventsLabel}>Events</Text>
            <EventsTable sport={profile.sport} sportStats={profile.sport_stats} />
          </View>
        )}

        {/* Radar Graph */}
        <AthletePerformanceRadar
          athlete={{
            height: profile.height,
            weight: profile.weight ? `${profile.weight}` : null,
            forty_yard: profile.forty_yard,
            vertical: profile.vertical,
            bench_press: profile.bench_press,
            squat: profile.squat,
            arm_length: profile.arm_length,
            position: profile.position,
            positions: profile.positions,
            // sport_stats intentionally omitted — not part of AthleteData props.
          } as any}
        />

        {/* QR Code (inside capture) */}
        <View style={s.qrRow}>
          <View style={s.qrBox}>
            <QRCode value={qrPayload} size={72} color={colors.foreground} backgroundColor={colors.card} />
          </View>
          <View style={s.qrMeta}>
            <Text style={s.qrUrl} numberOfLines={1}>
              {profileUrl}
            </Text>
            <Text style={s.qrHint}>Scan to save contact</Text>
          </View>
        </View>
      </View>

      {/* Action bar (outside capture so buttons aren't in the image) */}
      <View style={s.actions}>
        <Button variant="outline" size="sm" onPress={handleCopyLink} leftIcon={<Copy size={14} color={colors.foreground} />}>
          Copy profile link
        </Button>
        <CardShareActions
          targetRef={cardRef}
          senderName={name}
          fileBaseName={`${name}-offerhound-card`}
        />
      </View>
    </View>
  );
};

export default ProfileCardGenerator;

const s = StyleSheet.create({
  wrap: { gap: spacing.md },
  capture: { gap: spacing.md, backgroundColor: colors.background, padding: 4 },

  header: {
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    backgroundColor: colors.card,
  },
  accentBar: { height: 6, backgroundColor: colors.primary },
  headerBody: { padding: spacing.md, gap: spacing.md },

  identityRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  identityMeta: { flex: 1, minWidth: 0, gap: 2 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, minWidth: 0 },
  verifiedShield: { marginTop: 1 },
  name: {
    flexShrink: 1,
    fontFamily: typography.fontFamily.heading,
    fontSize: typography.fontSize.xl,
    color: colors.foreground,
    letterSpacing: typography.letterSpacing.heading,
  },
  starRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  metaRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: spacing.xs },
  position: {
    fontFamily: typography.fontFamily.bodyMedium,
    fontSize: typography.fontSize.sm,
    color: colors.foreground,
  },
  metaSep: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.sm,
    color: colors.mutedForeground,
  },
  metaText: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.xs,
    color: colors.mutedForeground,
  },
  metaChip: { flexDirection: 'row', alignItems: 'center', gap: 4 },

  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },

  measurables: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },
  measurableCell: {
    width: '50%',
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  measurableLabel: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.xs,
    color: colors.mutedForeground,
    textAlign: 'center',
  },
  measurableValue: {
    fontFamily: typography.fontFamily.bodyBold,
    fontSize: typography.fontSize.sm,
    color: colors.foreground,
    textAlign: 'center',
  },

  contactGrid: { gap: spacing.xs },
  contactRow: {
    minWidth: 0,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    paddingHorizontal: spacing.sm,
    paddingVertical: 8,
  },
  contactInner: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.xs, minWidth: 0 },
  contactText: { flex: 1, minWidth: 0 },
  contactLabel: {
    fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: 10,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    color: colors.mutedForeground,
  },
  contactValue: {
    fontFamily: typography.fontFamily.body,
    fontSize: 13,
    lineHeight: 17,
    color: colors.foreground,
  },

  eventsWrap: {
    padding: spacing.md,
    borderRadius: radius.xl,
    backgroundColor: colors.muted,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  eventsLabel: {
    fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: typography.fontSize.xs,
    color: colors.mutedForeground,
    letterSpacing: typography.letterSpacing.wide,
    textTransform: 'uppercase',
  },

  qrRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.xl,
    backgroundColor: colors.muted,
    borderWidth: 1,
    borderColor: colors.border,
  },
  qrBox: { borderRadius: 4, overflow: 'hidden' },
  qrMeta: { flex: 1, minWidth: 0 },
  qrUrl: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.xs,
    color: colors.mutedForeground,
  },
  qrHint: {
    fontFamily: typography.fontFamily.body,
    fontSize: 10,
    color: colors.mutedForeground,
    marginTop: 2,
    opacity: 0.7,
  },

  actions: { gap: spacing.sm },
});
