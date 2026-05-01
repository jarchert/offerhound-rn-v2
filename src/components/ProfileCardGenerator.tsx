// ProfileCardGenerator — exact RN port of Lovable src/components/ProfileCardGenerator.tsx
// Full visual parity: gradient card, Avatar, badges, measurables grid, events table, radar, QR.
// Web→RN: div→View, className→StyleSheet, Avatar→custom View+Image+Text, QRCodeSVG→QRCode.
import React, { useRef } from 'react';
import { View, Text, Image, StyleSheet, Pressable } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import * as Clipboard from 'expo-clipboard';
import { Copy, MapPin, GraduationCap, Ruler, Weight, Zap } from 'lucide-react-native';
import { usePlayerProfile } from '@/hooks/usePlayerProfile';
import { useToast } from '@/hooks/use-toast';
import { CardShareActions } from '@/components/CardShareActions';
import { Badge } from '@/components/ui/Badge';
import { AthletePerformanceRadar } from '@/components/AthletePerformanceRadar';
import { EventsTable } from '@/components/athlete/SportStatsEditor';
import { isEventBasedSport } from '@/lib/data/sportPositions';
import { colors, typography, spacing, radius } from '@/lib/theme';

const BASE_URL = 'https://offer-hound.com';

export function ProfileCardGenerator() {
  const { profile } = usePlayerProfile();
  const { toast } = useToast();
  const cardRef = useRef<View>(null);

  if (!profile) return null;

  const profileUrl = profile.custom_url
    ? `${BASE_URL}/p/${profile.custom_url}`
    : `${BASE_URL}/p/${profile.id}`;
  const name = profile.full_name || 'Athlete';
  const initials = name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();

  const handleCopyLink = async () => {
    await Clipboard.setStringAsync(profileUrl);
    toast({ title: 'Profile link copied!' });
  };

  const measurables = [
    { label: 'Height', value: profile.height },
    { label: 'Weight', value: profile.weight ? `${profile.weight} lbs` : null },
    { label: '40-Yard', value: profile.forty_yard ? `${profile.forty_yard}s` : null },
    { label: 'GPA', value: profile.gpa },
  ].filter(m => m.value);

  const isEventSport = isEventBasedSport(profile.sport);

  const safe = name.replace(/[^a-z0-9-_]/gi, '-').toLowerCase();

  return (
    <View style={styles.root}>

      {/* ── Capture region (included in shared image) ── */}
      <View ref={cardRef} style={styles.capture}>

        {/* Player card header */}
        <View style={styles.card}>
          {/* Top accent bar */}
          <View style={styles.accentBar} />

          <View style={styles.cardBody}>

            {/* Identity row */}
            <View style={styles.identityRow}>
              {/* Avatar */}
              {profile.profile_image_url ? (
                <Image source={{ uri: profile.profile_image_url }} style={styles.avatar} />
              ) : (
                <View style={styles.avatarFallback}>
                  <Text style={styles.avatarInitials}>{initials}</Text>
                </View>
              )}

              {/* Info */}
              <View style={styles.infoCol}>
                <Text style={styles.name} numberOfLines={1}>{name}</Text>

                {/* Position + graduation */}
                <View style={styles.metaRow}>
                  {profile.position ? <Text style={styles.positionText}>{profile.position}</Text> : null}
                  {profile.position && profile.graduation_year ? <Text style={styles.dot}>·</Text> : null}
                  {profile.graduation_year ? <Text style={styles.metaText}>Class of {profile.graduation_year}</Text> : null}
                </View>

                {/* School + location */}
                <View style={styles.metaRow}>
                  {profile.school ? (
                    <View style={styles.metaChip}>
                      <GraduationCap size={12} color={colors.mutedForeground} />
                      <Text style={styles.metaText}> {profile.school}</Text>
                    </View>
                  ) : null}
                  {profile.city && profile.state ? (
                    <View style={styles.metaChip}>
                      <MapPin size={12} color={colors.mutedForeground} />
                      <Text style={styles.metaText}> {profile.city}, {profile.state}</Text>
                    </View>
                  ) : null}
                </View>
              </View>
            </View>

            {/* Badges */}
            <View style={styles.badgeRow}>
              {profile.sport ? <Badge style={styles.badge}>{profile.sport}</Badge> : null}
              {profile.state ? <Badge variant="secondary" style={styles.badge}>{profile.state}</Badge> : null}
              {profile.is_published ? (
                <Badge variant="outline" style={styles.badgePublished}>
                  Published
                </Badge>
              ) : null}
            </View>

            {/* Measurables grid */}
            {measurables.length > 0 && (
              <View style={styles.metricsGrid}>
                {measurables.map(m => (
                  <View key={m.label} style={styles.metricCell}>
                    <Text style={styles.metricLabel}>{m.label}</Text>
                    <Text style={styles.metricValue}>{m.value}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        </View>

        {/* Events table — Track & Field / Swimming */}
        {isEventSport && profile.sport_stats && (
          <View style={styles.eventsSection}>
            <Text style={styles.eventsLabel}>Events</Text>
            <EventsTable sport={profile.sport} sportStats={profile.sport_stats} />
          </View>
        )}

        {/* Radar chart */}
        <AthletePerformanceRadar
          athlete={{
            height: profile.height,
            weight: profile.weight ? `${profile.weight}` : undefined,
            forty_yard: profile.forty_yard,
            vertical: profile.vertical,
            bench_press: profile.bench_press,
            squat: profile.squat,
            arm_length: profile.arm_length,
            position: profile.position,
            positions: profile.positions,
            sport_stats: (profile.sport_stats as any) ?? undefined,
          }}
        />

        {/* QR code row */}
        <View style={styles.qrRow}>
          <QRCode value={profileUrl} size={72} color={colors.foreground} backgroundColor={colors.background} />
          <View style={styles.qrInfo}>
            <Text style={styles.qrUrl} numberOfLines={1}>{profileUrl}</Text>
            <Text style={styles.qrHint}>Scan to view full profile</Text>
          </View>
        </View>

      </View>
      {/* ── /Capture ─────────────────────────────────────────── */}

      {/* Action bar — outside capture so buttons aren't in the shared image */}
      <View style={styles.actions}>
        <Pressable style={styles.copyBtn} onPress={handleCopyLink}>
          <Copy size={14} color={colors.foreground} />
          <Text style={styles.copyBtnText}>  Copy profile link</Text>
        </Pressable>
        <CardShareActions
          targetRef={cardRef}
          senderName={name}
          fileBaseName={`${safe}-offerhound-card`}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: spacing.md },

  capture: { gap: spacing.md },

  // ── Card ────────────────────────────────────────────────
  card: {
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  accentBar: {
    height: 6,
    backgroundColor: colors.primary,
  },
  cardBody: {
    padding: spacing.lg,
    gap: spacing.md,
  },

  identityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
    resizeMode: 'cover',
  },
  avatarFallback: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  avatarInitials: {
    fontFamily: typography.fontFamily.heading,
    fontSize: typography.fontSize.xl,
    color: colors.primary,
  },
  infoCol: { flex: 1, minWidth: 0, gap: 2 },
  name: {
    fontFamily: typography.fontFamily.heading,
    fontSize: typography.fontSize.xl,
    color: colors.foreground,
    fontWeight: '700',
  },
  metaRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: spacing.xs },
  metaChip: { flexDirection: 'row', alignItems: 'center' },
  positionText: {
    fontFamily: typography.fontFamily.bodyMedium,
    fontSize: typography.fontSize.sm,
    color: 'rgba(255,255,255,0.8)',
  },
  dot: { color: colors.mutedForeground, marginHorizontal: 2 },
  metaText: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.xs,
    color: colors.mutedForeground,
  },

  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  badge: {},
  badgePublished: { borderColor: 'rgba(5,150,105,0.3)' },

  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  metricCell: {
    flex: 1,
    minWidth: '22%',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  metricLabel: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.xs,
    color: colors.mutedForeground,
  },
  metricValue: {
    fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: typography.fontSize.sm,
    color: colors.foreground,
    fontWeight: '700',
  },

  // ── Events ───────────────────────────────────────────────
  eventsSection: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: radius.xl,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    gap: spacing.sm,
  },
  eventsLabel: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.xs,
    color: colors.mutedForeground,
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontWeight: '600',
  },

  // ── QR ───────────────────────────────────────────────────
  qrRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: radius.xl,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  qrInfo: { flex: 1, minWidth: 0 },
  qrUrl: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.xs,
    color: colors.mutedForeground,
  },
  qrHint: {
    fontFamily: typography.fontFamily.body,
    fontSize: 10,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 2,
  },

  // ── Actions ──────────────────────────────────────────────
  actions: { gap: spacing.sm },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  copyBtnText: {
    fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: typography.fontSize.sm,
    color: colors.foreground,
  },
});
