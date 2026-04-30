// SharePlayerCardDialog — exact design match to user-provided screenshot.
// Features: 3-tab format selector (Post/Story/QR Code), rich card layout with
// navy gradient + bokeh, gold-ringed avatar, hexagonal radar, QR code with URL,
// and action buttons (View Profile, PDF/PNG, Email, Share).
import React, { useRef, useState } from 'react';
import { View, Text, Image, StyleSheet, Pressable, ScrollView, Modal, Linking } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import QRCode from 'react-native-qrcode-svg';
import Svg, { Circle } from 'react-native-svg';
import {
  X, Image as ImageIcon, Smartphone, QrCode, ExternalLink,
  FileText, Download, Mail, Share2,
} from 'lucide-react-native';
import { usePlayerProfile } from '@/hooks/usePlayerProfile';
import { AthletePerformanceRadar } from '@/components/AthletePerformanceRadar';
import { CardShareActions } from '@/components/CardShareActions';
import { colors, typography, spacing, radius } from '@/lib/theme';

const BASE_URL = 'https://offer-hound.com';

type FormatTab = 'post' | 'story' | 'qr';

interface Props {
  children?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  hideTrigger?: boolean;
}

export function SharePlayerCardDialog({ children, open: controlled, onOpenChange, hideTrigger }: Props) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlled ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;
  const [tab, setTab] = useState<FormatTab>('post');
  const captureRef = useRef<View>(null);
  const { profile } = usePlayerProfile();

  if (!hideTrigger && children) {
    return (
      <>
        <Pressable onPress={() => setOpen(true)}>{children}</Pressable>
        <DialogBody open={open} setOpen={setOpen} tab={tab} setTab={setTab} captureRef={captureRef} profile={profile} />
      </>
    );
  }

  return <DialogBody open={open} setOpen={setOpen} tab={tab} setTab={setTab} captureRef={captureRef} profile={profile} />;
}

function DialogBody({ open, setOpen, tab, setTab, captureRef, profile }: any) {
  if (!profile) {
    return (
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <View style={s.overlay}>
          <View style={s.modalCard}>
            <Text style={s.emptyText}>Complete your profile to generate a share card.</Text>
            <Pressable style={s.closeBtn} onPress={() => setOpen(false)}><X size={20} color={colors.primary} /></Pressable>
          </View>
        </View>
      </Modal>
    );
  }

  const name = (profile.full_name || 'Athlete').toUpperCase();
  const profileUrl = profile.custom_url
    ? `${BASE_URL}/p/${profile.custom_url}`
    : `${BASE_URL}/p/${profile.id}`;
  const safe = (profile.full_name || 'athlete').replace(/[^a-z0-9-_]/gi, '-').toLowerCase();

  const openProfile = () => Linking.openURL(profileUrl).catch(() => {});

  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
      <View style={s.overlay}>
        <View style={s.modalCard}>
          {/* ── Header ───────────────────────────────────────── */}
          <View style={s.header}>
            <View style={s.headerLeft}>
              <View style={s.headerIconBox}>
                <ImageIcon size={18} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.headerTitle}>SHARE PLAYER CARD</Text>
                <Text style={s.headerSubtitle}>Choose a format and share your player card with measurables, stats, and QR code.</Text>
              </View>
            </View>
            <Pressable onPress={() => setOpen(false)} style={s.closeBtn} hitSlop={10}>
              <X size={20} color={colors.primary} />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
            {/* ── Format Tabs ─────────────────────────────────── */}
            <View style={s.tabBar}>
              <TabButton active={tab === 'post'}   icon={<ImageIcon size={16} color={tab === 'post' ? colors.primaryForeground : colors.foreground} />}   label="Post"    onPress={() => setTab('post')} />
              <TabButton active={tab === 'story'}  icon={<Smartphone size={16} color={tab === 'story' ? colors.primaryForeground : colors.foreground} />} label="Story"   onPress={() => setTab('story')} />
              <TabButton active={tab === 'qr'}     icon={<QrCode size={16} color={tab === 'qr' ? colors.primaryForeground : colors.foreground} />}         label="QR Code" onPress={() => setTab('qr')} />
            </View>

            {/* ── Card (capture region) ───────────────────────── */}
            <Pressable ref={captureRef} onPress={openProfile} style={s.cardWrap}>
              <LinearGradient
                colors={['#1e2a47', '#15213a', '#0f1829']}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                style={s.cardGradient}
              >
                {/* Bokeh circles */}
                <BokehBackground />

                {/* Identity */}
                <View style={s.identityRow}>
                  <View style={s.avatarRing}>
                    {profile.profile_image_url ? (
                      <Image source={{ uri: profile.profile_image_url }} style={s.avatar} />
                    ) : (
                      <View style={[s.avatar, s.avatarFallback]}>
                        <Text style={s.avatarInitials}>{name.split(' ').map((n: string) => n[0]).slice(0, 2).join('')}</Text>
                      </View>
                    )}
                  </View>
                  <View style={s.identityInfo}>
                    <Text style={s.name} numberOfLines={2}>{name}</Text>
                    {profile.position ? (
                      <View style={s.positionBadge}>
                        <Text style={s.positionText}>{profile.position.toUpperCase()}</Text>
                      </View>
                    ) : null}
                    {profile.school ? <Text style={s.schoolText}>{profile.school}</Text> : null}
                    {profile.city && profile.state ? (
                      <Text style={s.locText}>{profile.city}, {profile.state}</Text>
                    ) : null}
                    {profile.twitter ? (
                      <Text style={s.twitterText}>𝕏 {profile.twitter}</Text>
                    ) : null}
                  </View>
                </View>

                {/* Orange divider */}
                <View style={s.divider} />

                {/* Stats + Radar row */}
                <View style={s.statsRow}>
                  {/* Left: stacked stats */}
                  <View style={s.statsCol}>
                    {profile.graduation_year ? <StatBlock label="CLASS" value={profile.graduation_year} /> : null}
                    {profile.height ? <StatBlock label="HEIGHT" value={profile.height} /> : null}
                    {profile.weight ? <StatBlock label="WEIGHT" value={`${profile.weight} lbs`} /> : null}
                    {profile.gpa ? <StatBlock label="GPA" value={profile.gpa} /> : null}
                  </View>

                  {/* Right: radar chart */}
                  <View style={s.radarCol}>
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
                      }}
                    />
                  </View>
                </View>

                {/* Metric row */}
                <View style={s.metricRow}>
                  {profile.forty_yard ? <Metric label="40 YD" value={profile.forty_yard} /> : null}
                  {profile.vertical ? <Metric label="VERT" value={profile.vertical} /> : null}
                  {profile.bench_press ? <Metric label="BENCH" value={profile.bench_press} /> : null}
                  {profile.squat ? <Metric label="SQUAT" value={profile.squat} /> : null}
                </View>

                {/* QR + URL + logo */}
                <View style={s.qrBlock}>
                  <View style={s.qrBox}>
                    <QRCode value={profileUrl} size={92} color="#000" backgroundColor="#fff" />
                  </View>
                  <Text style={s.qrUrl} numberOfLines={1}>{profileUrl.replace(/^https?:\/\//, '')}</Text>
                  <Text style={s.brandLogo}>OFFERHOUND<Text style={s.brandTm}>™</Text></Text>
                </View>
              </LinearGradient>
            </Pressable>

            <Text style={s.tapHint}>Tap card to view profile</Text>

            {/* ── Action buttons ───────────────────────────── */}
            <Pressable style={s.primaryBtn} onPress={openProfile}>
              <ExternalLink size={16} color={colors.primaryForeground} />
              <Text style={s.primaryBtnText}>  View Complete Player Profile</Text>
            </Pressable>

            <View style={s.btnRow}>
              <Pressable style={[s.primaryBtn, { flex: 1 }]} onPress={() => {/* PDF via CardShareActions */}}>
                <FileText size={16} color={colors.primaryForeground} />
                <Text style={s.primaryBtnText}>  PDF (with link)</Text>
              </Pressable>
              <Pressable style={[s.outlineBtn, { flex: 1 }]} onPress={() => {/* PNG download */}}>
                <Download size={16} color={colors.primary} />
                <Text style={s.outlineBtnText}>  PNG</Text>
              </Pressable>
            </View>

            {/* Wire to real CardShareActions for PDF/PNG/Email/Share */}
            <View style={{ marginTop: spacing.sm }}>
              <CardShareActions
                targetRef={captureRef}
                senderName={profile.full_name || 'Athlete'}
                fileBaseName={`${safe}-offerhound-card`}
              />
            </View>

            <Text style={s.footerHint}>Download and attach to emails or social posts</Text>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// ─── Subcomponents ────────────────────────────────────────────────
function TabButton({ active, icon, label, onPress }: any) {
  return (
    <Pressable style={[s.tabBtn, active && s.tabBtnActive]} onPress={onPress}>
      {icon}
      <Text style={[s.tabLabel, active && s.tabLabelActive]}>  {label}</Text>
    </Pressable>
  );
}

function StatBlock({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ marginBottom: 6 }}>
      <Text style={s.statLabel}>{label}</Text>
      <Text style={s.statValue}>{value}</Text>
    </View>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View style={s.metricCell}>
      <Text style={s.metricValue}>{value}</Text>
      <Text style={s.metricLabel}>{label}</Text>
    </View>
  );
}

function BokehBackground() {
  // Subtle decorative circles overlay
  const circles = [
    { cx: 60, cy: 40, r: 70, op: 0.06 },
    { cx: 340, cy: 30, r: 50, op: 0.05 },
    { cx: 50, cy: 280, r: 90, op: 0.04 },
    { cx: 310, cy: 220, r: 60, op: 0.05 },
    { cx: 200, cy: 380, r: 80, op: 0.05 },
    { cx: 380, cy: 400, r: 70, op: 0.04 },
  ];
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg width="100%" height="100%" viewBox="0 0 400 500">
        {circles.map((c, i) => (
          <Circle key={`b-${i}`} cx={c.cx} cy={c.cy} r={c.r} fill="#ffffff" opacity={c.op} />
        ))}
      </Svg>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────
const ORANGE = '#f97316';
const NAVY = '#1e2a47';

const s = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', alignItems: 'center', justifyContent: 'center', padding: spacing.sm },
  modalCard: {
    backgroundColor: colors.background,
    borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border,
    maxHeight: '95%', width: '100%', maxWidth: 480, overflow: 'hidden',
  },

  // Header
  header: { flexDirection: 'row', alignItems: 'flex-start', padding: spacing.md, gap: spacing.sm },
  headerLeft: { flex: 1, flexDirection: 'row', gap: spacing.sm },
  headerIconBox: {
    width: 32, height: 32, borderRadius: 8,
    borderWidth: 1, borderColor: colors.primary,
    backgroundColor: 'rgba(231,175,8,0.08)',
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: typography.fontFamily.heading,
    fontSize: typography.fontSize.lg, color: colors.primary,
    letterSpacing: 1.5, fontWeight: '700',
  },
  headerSubtitle: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.sm, color: colors.mutedForeground,
    marginTop: 4, lineHeight: 18,
  },
  closeBtn: {
    width: 32, height: 32, borderRadius: 16,
    borderWidth: 1, borderColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },

  scrollContent: { paddingHorizontal: spacing.md, paddingBottom: spacing.lg, gap: spacing.md },

  // Tabs
  tabBar: {
    flexDirection: 'row', backgroundColor: colors.muted,
    borderRadius: radius.md, padding: 4, alignSelf: 'center',
    borderWidth: 1, borderColor: colors.border,
  },
  tabBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 8, paddingHorizontal: 14, borderRadius: radius.sm,
  },
  tabBtnActive: { backgroundColor: colors.primary },
  tabLabel: { fontFamily: typography.fontFamily.bodySemiBold, fontSize: typography.fontSize.sm, color: colors.foreground },
  tabLabelActive: { color: colors.primaryForeground },

  // Card
  cardWrap: { borderRadius: radius.xl, overflow: 'hidden', borderWidth: 1, borderColor: colors.border },
  cardGradient: { padding: spacing.md, gap: spacing.sm, position: 'relative' },

  // Identity
  identityRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  avatarRing: {
    width: 96, height: 96, borderRadius: 48,
    borderWidth: 3, borderColor: colors.primary,
    overflow: 'hidden',
  },
  avatar: { width: '100%', height: '100%', resizeMode: 'cover' },
  avatarFallback: { backgroundColor: NAVY, alignItems: 'center', justifyContent: 'center' },
  avatarInitials: { fontFamily: typography.fontFamily.heading, fontSize: 28, color: colors.primary },
  identityInfo: { flex: 1, gap: 4 },
  name: { fontFamily: typography.fontFamily.heading, fontSize: 24, color: '#ffffff', fontWeight: '800', letterSpacing: 1 },
  positionBadge: {
    backgroundColor: ORANGE, borderRadius: 999,
    paddingVertical: 3, paddingHorizontal: 10, alignSelf: 'flex-start',
  },
  positionText: { fontFamily: typography.fontFamily.bodySemiBold, fontSize: 11, color: '#ffffff', letterSpacing: 0.5 },
  schoolText: { fontFamily: typography.fontFamily.body, fontSize: 12, color: '#c7d2e0', marginTop: 4 },
  locText: { fontFamily: typography.fontFamily.body, fontSize: 12, color: '#c7d2e0' },
  twitterText: { fontFamily: typography.fontFamily.body, fontSize: 11, color: '#9fb0c4', marginTop: 2 },

  divider: { height: 1, backgroundColor: ORANGE, opacity: 0.5, marginVertical: 6 },

  // Stats + radar
  statsRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
  statsCol: { width: 90 },
  radarCol: { flex: 1, aspectRatio: 1, maxHeight: 220 },
  statLabel: { fontFamily: typography.fontFamily.body, fontSize: 9, color: '#9fb0c4', letterSpacing: 1, textTransform: 'uppercase' },
  statValue: { fontFamily: typography.fontFamily.bodySemiBold, fontSize: 16, color: '#ffffff', fontWeight: '700' },

  metricRow: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: spacing.xs },
  metricCell: { alignItems: 'center' },
  metricValue: { fontFamily: typography.fontFamily.bodySemiBold, fontSize: 16, color: ORANGE, fontWeight: '700' },
  metricLabel: { fontFamily: typography.fontFamily.body, fontSize: 9, color: '#9fb0c4', marginTop: 2, letterSpacing: 0.5 },

  // QR block
  qrBlock: { alignItems: 'center', gap: 4, marginTop: spacing.sm },
  qrBox: { backgroundColor: '#ffffff', padding: 8, borderRadius: 6 },
  qrUrl: { fontFamily: typography.fontFamily.body, fontSize: 9, color: '#9fb0c4', marginTop: 4 },
  brandLogo: { fontFamily: typography.fontFamily.heading, fontSize: 14, color: colors.primary, fontWeight: '800', letterSpacing: 1.5 },
  brandTm: { fontSize: 8, color: colors.primary },

  // Hints + actions
  tapHint: {
    fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.xs,
    color: colors.primary, textAlign: 'center', marginTop: -spacing.xs,
  },
  primaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.primary, borderRadius: radius.md,
    paddingVertical: spacing.md, paddingHorizontal: spacing.md,
  },
  primaryBtnText: {
    fontFamily: typography.fontFamily.bodySemiBold, fontSize: typography.fontSize.sm,
    color: colors.primaryForeground, fontWeight: '700',
  },
  outlineBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: colors.primary, borderRadius: radius.md,
    paddingVertical: spacing.md, paddingHorizontal: spacing.md,
    backgroundColor: 'transparent',
  },
  outlineBtnText: {
    fontFamily: typography.fontFamily.bodySemiBold, fontSize: typography.fontSize.sm,
    color: colors.primary, fontWeight: '700',
  },
  btnRow: { flexDirection: 'row', gap: spacing.sm },
  footerHint: {
    fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.xs,
    color: colors.mutedForeground, textAlign: 'center', marginTop: spacing.xs,
  },
  emptyText: { fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.sm, color: colors.mutedForeground, textAlign: 'center', padding: spacing.lg },
});
