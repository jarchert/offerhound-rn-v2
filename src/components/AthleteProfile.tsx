// Ported from Lovable src/components/AthleteProfile.tsx — verbatim RN port.
// Web tailwind classes mapped to StyleSheet using theme tokens. External links
// open via Linking.openURL. Structure, text, and gating mirror the web component.
import React from 'react';
import { View, Text, StyleSheet, Image, Pressable, Linking } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Award,
  ExternalLink,
  Camera as Instagram, // GAP: lucide-react-native@1.9.0 lacks `Instagram`; using closest visual substitute
  Play,
  Trophy,
  AtSign as Twitter, // GAP: lucide-react-native@1.9.0 lacks `Twitter`; using `AtSign` as a stand-in
  Heart,
  Users,
  Star,
  Target,
} from 'lucide-react-native';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { AthletePerformanceRadar } from '@/components/AthletePerformanceRadar';
import { colors, typography, spacing, gradients } from '@/lib/theme';

// The RN hook (src/hooks/usePlayerProfile.ts) doesn't re-export the
// PlayerProfile type Lovable exposes. Use `any` to keep the prop shape
// open while preserving Lovable's render-time field access.
type PlayerProfile = any;

interface AthleteProfileProps {
  profile: PlayerProfile;
}

interface LinkButtonProps {
  icon: React.ReactNode;
  label: string;
  url: string;
}

function LinkButton({ icon, label, url }: LinkButtonProps) {
  return (
    <Pressable
      onPress={() => Linking.openURL(url)}
      style={({ pressed }) => [s.linkButton, pressed && s.pressed]}
    >
      {icon}
      <Text style={s.linkButtonLabel}>{label}</Text>
      <View style={{ flex: 1 }} />
      <ExternalLink width={12} height={12} color={colors.foreground} />
    </Pressable>
  );
}

export function AthleteProfile({ profile }: AthleteProfileProps) {
  const firstName = profile.full_name?.split(' ')[0] || 'Athlete';
  const stats = (profile.stats as any[]) || [];
  const highlights: string[] = profile.highlights || [];

  return (
    <LinearGradient
      colors={gradients.dark}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={s.section}
    >
      <View style={s.container}>
        {/* Section header */}
        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>
            <Text style={{ color: colors.foreground }}>My </Text>
            <Text style={s.gradientGold}>Profile</Text>
          </Text>
          <Text style={s.sectionSub}>
            Stats, highlights, and links that coaches can access to learn more about me.
          </Text>
        </View>

        <View style={s.grid}>
          {/* Quick Links Card */}
          <CardGradient style={s.quickLinksCard}>
            <Text style={s.cardHeading}>Quick Links</Text>
            <View style={s.linksStack}>
              {profile.hudl_url ? (
                <LinkButton
                  icon={<Play width={16} height={16} color={colors.primary} />}
                  label="HUDL Highlights"
                  url={profile.hudl_url}
                />
              ) : null}
              {profile.maxpreps_url ? (
                <LinkButton
                  icon={<Trophy width={16} height={16} color={colors.primary} />}
                  label="MaxPreps Profile"
                  url={profile.maxpreps_url}
                />
              ) : null}
              {profile.twitter_url ? (
                <LinkButton
                  icon={<Twitter width={16} height={16} color={colors.primary} />}
                  label="Twitter"
                  url={profile.twitter_url}
                />
              ) : null}
              {profile.instagram_url ? (
                <LinkButton
                  icon={<Instagram width={16} height={16} color={colors.primary} />}
                  label="Instagram"
                  url={profile.instagram_url}
                />
              ) : null}
            </View>

            {highlights.length > 0 && (
              <View style={s.highlightsBlock}>
                <View style={s.highlightsHeader}>
                  <Award width={16} height={16} color={colors.primary} />
                  <Text style={s.highlightsTitle}>Highlights</Text>
                </View>
                <View style={s.highlightsWrap}>
                  {highlights.map((highlight, index) => (
                    <Badge key={index} variant="secondary">
                      {highlight}
                    </Badge>
                  ))}
                </View>
              </View>
            )}
          </CardGradient>

          {/* Stats Card */}
          <CardGradient style={s.statsCard}>
            <Text style={s.cardHeading}>Season Statistics</Text>

            {stats.length > 0 ? (
              <View style={s.statsTableWrap}>
                {/* Table header */}
                <View style={[s.statsRow, s.statsHeaderRow]}>
                  <Text style={[s.statsHeaderCell, s.seasonCol]}>Season</Text>
                  <Text style={[s.statsHeaderCell, s.statCol]}>Games</Text>
                  <Text style={[s.statsHeaderCell, s.statCol]}>Tackles</Text>
                  <Text style={[s.statsHeaderCell, s.statCol]}>INTs</Text>
                  <Text style={[s.statsHeaderCell, s.statCol]}>PDs</Text>
                  <Text style={[s.statsHeaderCell, s.statCol]}>TDs</Text>
                </View>
                {stats.map((stat: any, index: number) => (
                  <View key={index} style={[s.statsRow, s.statsBodyRow]}>
                    <View style={s.seasonCol}>
                      <Text style={s.seasonLabel}>{stat.season}</Text>
                      {stat.note ? <Text style={s.seasonNote}>{stat.note}</Text> : null}
                    </View>
                    <Text style={[s.statCol, s.bodyCell]}>{stat.games || '-'}</Text>
                    <Text style={[s.statCol, s.bodyCell, s.tacklesCell]}>{stat.tackles || '-'}</Text>
                    <View style={[s.statCol, s.intWrap]}>
                      <View style={s.intBubble}>
                        <Text style={s.intText}>{stat.interceptions || 0}</Text>
                      </View>
                    </View>
                    <Text style={[s.statCol, s.bodyCell]}>{stat.passesDefended || '-'}</Text>
                    <Text style={[s.statCol, s.bodyCell]}>{stat.touchdowns || '-'}</Text>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={s.emptyStats}>
                No statistics added yet. Add your stats in your profile settings.
              </Text>
            )}

            {/* Measurables */}
            <View style={s.measurablesBlock}>
              <Text style={s.measurablesTitle}>Measurables</Text>
              <View style={s.measurablesGrid}>
                <View style={s.measurableCell}>
                  <Text style={s.measurableValue}>{profile.height || '-'}</Text>
                  <Text style={s.measurableLabel}>HEIGHT</Text>
                </View>
                <View style={s.measurableCell}>
                  <Text style={s.measurableValue}>{profile.weight || '-'}</Text>
                  <Text style={s.measurableLabel}>WEIGHT</Text>
                </View>
                {profile.arm_length ? (
                  <View style={s.measurableCell}>
                    <Text style={s.measurableValue}>{profile.arm_length}</Text>
                    <Text style={s.measurableLabel}>ARM LENGTH</Text>
                  </View>
                ) : null}
                {profile.forty_yard ? (
                  <View style={s.measurableCell}>
                    <Text style={s.measurableValue}>{profile.forty_yard}s</Text>
                    <Text style={s.measurableLabel}>40-YARD</Text>
                  </View>
                ) : null}
                {profile.vertical ? (
                  <View style={s.measurableCell}>
                    <Text style={s.measurableValue}>{profile.vertical}</Text>
                    <Text style={s.measurableLabel}>VERTICAL</Text>
                  </View>
                ) : null}
              </View>
            </View>

            {/* Athletic Performance Radar Chart */}
            <View style={s.radarBlock}>
              <AthletePerformanceRadar
                athlete={{
                  height: profile.height || undefined,
                  weight: profile.weight || undefined,
                  forty_yard: profile.forty_yard || undefined,
                  vertical: profile.vertical || undefined,
                  bench_press: profile.bench_press || undefined,
                  squat: profile.squat || undefined,
                  arm_length: profile.arm_length || undefined,
                  position: profile.position || undefined,
                }}
              />
            </View>
          </CardGradient>
        </View>

        {/* About Me Section */}
        <View style={s.aboutSection}>
          <View style={s.sectionHeader}>
            <Text style={s.sectionTitle}>
              <Text style={{ color: colors.foreground }}>About </Text>
              <Text style={s.gradientGold}>Me</Text>
            </Text>
            <Text style={s.sectionSub}>
              Get to know {firstName} beyond the field — my story, my family, and what drives me to compete.
            </Text>
          </View>

          {/* What Makes Me Special */}
          {profile.what_makes_me_special ? (
            <View style={s.aboutBlock}>
              <View style={s.aboutHeader}>
                <Star width={28} height={28} color={colors.primary} />
                <Text style={s.aboutHeading}>What Makes Me Special</Text>
              </View>
              <CardGradient style={s.aboutCard}>
                <Text style={s.aboutBody}>{profile.what_makes_me_special}</Text>
              </CardGradient>
            </View>
          ) : null}

          {/* My Family */}
          {(profile.my_family || profile.family_image_url) ? (
            <View style={s.aboutBlock}>
              <View style={s.aboutHeader}>
                <Users width={28} height={28} color={colors.primary} />
                <Text style={s.aboutHeading}>My Family</Text>
              </View>
              <CardGradient style={s.aboutCard}>
                {profile.my_family ? (
                  <Text style={s.aboutBody}>{profile.my_family}</Text>
                ) : null}
                {profile.family_image_url ? (
                  <View style={s.aboutImageWrap}>
                    <Image
                      source={{ uri: profile.family_image_url }}
                      style={s.aboutImage}
                      resizeMode="cover"
                      accessibilityLabel="My family"
                    />
                  </View>
                ) : null}
              </CardGradient>
            </View>
          ) : null}

          {/* Why I Love Football */}
          {profile.why_i_love_football ? (
            <View style={s.aboutBlock}>
              <View style={s.aboutHeader}>
                <Heart width={28} height={28} color={colors.primary} />
                <Text style={s.aboutHeading}>Why I Love {profile.sport || 'Football'}</Text>
              </View>
              <CardGradient style={s.aboutCard}>
                <Text style={s.aboutBody}>{profile.why_i_love_football}</Text>
              </CardGradient>
            </View>
          ) : null}

          {/* Who I Compare Myself To */}
          {(profile.player_comparison || profile.player_comparison_why || (profile as any).player_comparison_image_url) ? (
            <View>
              <View style={s.aboutHeader}>
                <Target width={28} height={28} color={colors.primary} />
                <Text style={s.aboutHeading}>Who I Compare Myself To</Text>
              </View>
              <CardGradient style={s.aboutCard}>
                <View style={s.compareGrid}>
                  {(profile as any).player_comparison_image_url ? (
                    <View style={s.compareImageWrap}>
                      <Image
                        source={{ uri: (profile as any).player_comparison_image_url }}
                        style={s.compareImage}
                        resizeMode="cover"
                        accessibilityLabel={profile.player_comparison || 'Player Comparison'}
                      />
                    </View>
                  ) : null}
                  {profile.player_comparison ? (
                    <View style={s.compareBox}>
                      <Text style={s.compareHeading}>Player Comparison</Text>
                      <Text style={s.compareBody}>{profile.player_comparison}</Text>
                    </View>
                  ) : null}
                  {profile.player_comparison_why ? (
                    <View style={s.compareBox}>
                      <Text style={s.compareHeading}>What I Take From Them</Text>
                      <Text style={s.compareBody}>{profile.player_comparison_why}</Text>
                    </View>
                  ) : null}
                </View>
              </CardGradient>
            </View>
          ) : null}
        </View>
      </View>
    </LinearGradient>
  );
}

export default AthleteProfile;

// Lovable uses the `bg-gradient-card` token (linear-gradient 145°, #1d212a → #14171e)
// with border-border/50 + p-6. Wrap Card content in LinearGradient to match parity.
function CardGradient({ children, style }: { children: React.ReactNode; style?: any }) {
  return (
    <View style={[s.cardOuter, style]}>
      <LinearGradient
        colors={gradients.card}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={s.cardInner}
      >
        {children}
      </LinearGradient>
    </View>
  );
}

const s = StyleSheet.create({
  section: { paddingVertical: spacing.xxxl * 1.2 }, // py-20 ~ 80px
  container: { paddingHorizontal: spacing.lg },

  sectionHeader: { alignItems: 'center', marginBottom: spacing.xl },
  sectionTitle: {
    fontFamily: typography.fontFamily.heading,
    fontSize: typography.heading.h1 + 8,
    textAlign: 'center',
    marginBottom: spacing.md,
    letterSpacing: typography.letterSpacing.heading,
  },
  gradientGold: { color: colors.primary },
  sectionSub: {
    fontFamily: typography.fontFamily.body,
    color: colors.mutedForeground,
    fontSize: typography.fontSize.lg,
    textAlign: 'center',
    maxWidth: 520,
  },

  grid: { gap: spacing.lg, maxWidth: 1100, alignSelf: 'stretch' },

  // Cards
  cardOuter: { borderRadius: 12, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  cardInner: { padding: spacing.lg },

  quickLinksCard: {},
  statsCard: {},

  cardHeading: {
    fontFamily: typography.fontFamily.heading,
    fontSize: typography.fontSize['2xl'],
    color: colors.primary,
    marginBottom: spacing.md,
    letterSpacing: typography.letterSpacing.heading,
  },

  // Links
  linksStack: { gap: spacing.sm },
  linkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: 'transparent',
  },
  linkButtonLabel: {
    fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: typography.fontSize.base,
    color: colors.foreground,
  },
  pressed: { opacity: 0.8 },

  // Highlights
  highlightsBlock: { marginTop: spacing.xl },
  highlightsHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md },
  highlightsTitle: {
    fontFamily: typography.fontFamily.bodySemiBold,
    color: colors.foreground,
    fontSize: typography.fontSize.base,
  },
  highlightsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },

  // Stats table
  statsTableWrap: { marginBottom: spacing.md },
  statsRow: { flexDirection: 'row', alignItems: 'center' },
  statsHeaderRow: { borderBottomWidth: 1, borderBottomColor: colors.border, paddingVertical: spacing.sm },
  statsBodyRow: { borderBottomWidth: 1, borderBottomColor: colors.border, paddingVertical: spacing.md },
  statsHeaderCell: {
    fontFamily: typography.fontFamily.bodyMedium,
    color: colors.mutedForeground,
    fontSize: typography.fontSize.sm,
  },
  seasonCol: { flex: 2, paddingHorizontal: spacing.sm, textAlign: 'left' },
  statCol: { flex: 1, paddingHorizontal: spacing.xs, textAlign: 'center' },
  bodyCell: {
    fontFamily: typography.fontFamily.body,
    color: colors.foreground,
    fontSize: typography.fontSize.sm,
    textAlign: 'center',
  },
  seasonLabel: {
    fontFamily: typography.fontFamily.bodyMedium,
    color: colors.foreground,
    fontSize: typography.fontSize.sm,
  },
  seasonNote: {
    fontFamily: typography.fontFamily.body,
    fontStyle: 'italic',
    fontSize: typography.fontSize.xs,
    color: colors.mutedForeground,
  },
  tacklesCell: {
    color: colors.primary,
    fontFamily: typography.fontFamily.bodySemiBold,
  },
  intWrap: { alignItems: 'center', justifyContent: 'center' },
  intBubble: {
    width: 32,
    height: 32,
    borderRadius: 999,
    backgroundColor: colors.primary + '33',
    alignItems: 'center',
    justifyContent: 'center',
  },
  intText: {
    fontFamily: typography.fontFamily.bodyBold,
    color: colors.primary,
    fontSize: typography.fontSize.sm,
  },
  emptyStats: {
    fontFamily: typography.fontFamily.body,
    color: colors.mutedForeground,
    textAlign: 'center',
    paddingVertical: spacing.xl,
  },

  // Measurables
  measurablesBlock: {
    marginTop: spacing.xl,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  measurablesTitle: {
    fontFamily: typography.fontFamily.bodySemiBold,
    color: colors.foreground,
    fontSize: typography.fontSize.base,
    marginBottom: spacing.md,
  },
  measurablesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  measurableCell: {
    flexBasis: '30%',
    flexGrow: 1,
    backgroundColor: colors.secondary + '80',
    borderRadius: 8,
    padding: spacing.md,
    alignItems: 'center',
  },
  measurableValue: {
    fontFamily: typography.fontFamily.heading,
    fontSize: typography.fontSize['2xl'],
    color: colors.primary,
    letterSpacing: typography.letterSpacing.heading,
  },
  measurableLabel: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.xs,
    color: colors.mutedForeground,
    letterSpacing: typography.letterSpacing.wide,
    marginTop: 2,
  },

  radarBlock: {
    marginTop: spacing.xl,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },

  // About
  aboutSection: { marginTop: spacing.xxxl, maxWidth: 820, alignSelf: 'stretch' },
  aboutBlock: { marginBottom: spacing.xl },
  aboutHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md },
  aboutHeading: {
    fontFamily: typography.fontFamily.heading,
    fontSize: typography.heading.h3,
    color: colors.foreground,
    letterSpacing: typography.letterSpacing.heading,
  },
  aboutCard: { padding: 0 },
  aboutBody: {
    fontFamily: typography.fontFamily.body,
    color: colors.mutedForeground,
    fontSize: typography.fontSize.lg,
    lineHeight: typography.fontSize.lg * typography.lineHeight.relaxed,
    padding: spacing.lg,
  },
  aboutImageWrap: {
    marginTop: spacing.md,
    borderRadius: 8,
    overflow: 'hidden',
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  aboutImage: { width: '100%', aspectRatio: 16 / 9, borderRadius: 8 },

  // Compare
  compareGrid: { padding: spacing.lg, gap: spacing.md },
  compareImageWrap: { borderRadius: 8, overflow: 'hidden', alignSelf: 'center', maxWidth: 420, width: '100%' },
  compareImage: { width: '100%', aspectRatio: 4 / 5 },
  compareBox: {
    backgroundColor: colors.secondary + '80',
    borderRadius: 8,
    padding: spacing.lg,
  },
  compareHeading: {
    fontFamily: typography.fontFamily.heading,
    fontSize: typography.fontSize.xl,
    color: colors.primary,
    marginBottom: spacing.xs,
    letterSpacing: typography.letterSpacing.heading,
  },
  compareBody: {
    fontFamily: typography.fontFamily.body,
    color: colors.mutedForeground,
    fontSize: typography.fontSize.sm,
  },
});
