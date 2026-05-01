// Verbatim port from Lovable: src/components/landing/CoachFeaturesSection.tsx
// RN-adapted — layout, tokens, and icons translated per standard conventions.
import React from 'react';
import { View, Text, StyleSheet, ImageBackground } from 'react-native';
import {
  Search,
  Filter,
  Bookmark,
  Target,
  FileText,
  Send,
  BarChart3,
  Download,
  LucideIcon,
} from 'lucide-react-native';
import { colors, typography, spacing, radius, shadows } from '@/lib/theme';
import { BG_COACH_SCOUT } from '@/lib/assets';

interface Feature {
  icon: LucideIcon;
  title: string;
  description: string;
  patentPending?: boolean;
}

const FEATURES: Feature[] = [
  { icon: Search, title: 'Advanced Athlete Search', description: 'Search our growing database of athletes by position, graduation year, location, academic stats, and athletic measurables.' },
  { icon: Filter, title: 'Trait & Intangibles Filter', description: "Find athletes with specific traits like 'Game Speed', 'High Motor', 'Coachable', 'Leader' and more." },
  { icon: Bookmark, title: 'Build Your Board', description: 'Save prospects to your recruiting board, organize by priority, add notes, and track your evaluation progress.' },
  { icon: Target, title: 'AI-Powered Matches', description: "Our patent-pending AI analyzes your program's needs and recommends athletes who match your position requirements.", patentPending: true },
  { icon: FileText, title: 'Detailed Profiles', description: 'View comprehensive athlete profiles including highlights, stats, academics, family background.' },
  { icon: Send, title: 'Direct Communication', description: 'Send messages directly to athletes and their families.' },
  { icon: BarChart3, title: 'Recruiting Pipeline', description: 'Manage your entire recruiting pipeline with stages, priorities, and activity tracking.' },
  { icon: Download, title: 'Export & Reports', description: 'Export scouting reports, comparison sheets, and recruiting board data.' },
];

export function CoachFeaturesSection() {
  return (
    <View style={s.section}>
      <ImageBackground source={BG_COACH_SCOUT} style={s.bg} imageStyle={s.bgImage}>
        <View style={s.bgOverlay} />
        <View style={s.container}>
          <View style={s.headerWrap}>
            <Text style={s.heading}>
              POWERFUL TOOLS TO <Text style={s.headingGold}>FIND YOUR RECRUITS</Text>
            </Text>
            <Text style={s.subtitle}>
              OfferHound™ gives coaches and scouts the tools to discover overlooked talent, evaluate prospects, and build winning rosters.
            </Text>
          </View>

          <View style={s.grid}>
            {FEATURES.map((f) => (
              <View key={f.title} style={s.card}>
                <View style={s.iconWrap}>
                  <f.icon size={22} color={colors.primary} />
                </View>
                <View style={s.cardHeaderRow}>
                  <Text style={s.cardTitle}>{f.title}</Text>
                  {f.patentPending && (
                    <View style={s.ppBadge}>
                      <Text style={s.ppBadgeText}>Patent-Pending</Text>
                    </View>
                  )}
                </View>
                <Text style={s.cardDesc}>{f.description}</Text>
              </View>
            ))}
          </View>
        </View>
      </ImageBackground>
    </View>
  );
}

export default CoachFeaturesSection;

const s = StyleSheet.create({
  section: { backgroundColor: 'rgba(25, 28, 36, 0.5)' },
  bg: { paddingVertical: spacing.xxl + spacing.md },
  bgImage: { opacity: 0.1 },
  bgOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(25, 28, 36, 0.9)',
  },
  container: { paddingHorizontal: spacing.lg },
  headerWrap: { alignItems: 'center', marginBottom: spacing.xl + spacing.sm, gap: spacing.sm },
  heading: {
    fontFamily: typography.fontFamily.heading,
    fontSize: typography.heading.h2,
    color: colors.foreground,
    textAlign: 'center',
    letterSpacing: typography.letterSpacing.heading,
  },
  headingGold: { color: colors.primary },
  subtitle: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.base,
    color: colors.foregroundSubtle,
    textAlign: 'center',
    maxWidth: 520,
    lineHeight: typography.fontSize.base * typography.lineHeight.relaxed,
  },
  grid: { gap: spacing.md },
  card: {
    backgroundColor: colors.cardHigh,
    borderWidth: 1,
    borderColor: 'rgba(43, 48, 58, 0.5)',
    borderRadius: radius.xl,
    padding: spacing.md + 4,
    ...shadows.card,
  },
  iconWrap: {
    width: 44,
    height: 44,
    backgroundColor: 'rgba(231, 175, 8, 0.1)',
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs,
    flexWrap: 'wrap',
  },
  cardTitle: {
    fontFamily: typography.fontFamily.heading,
    fontSize: typography.heading.h4,
    color: colors.foreground,
    letterSpacing: typography.letterSpacing.heading,
  },
  cardDesc: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.sm,
    color: colors.foregroundSubtle,
    lineHeight: typography.fontSize.sm * typography.lineHeight.relaxed,
  },
  ppBadge: {
    backgroundColor: 'rgba(231, 175, 8, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  ppBadgeText: {
    fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: 10,
    color: colors.primary,
  },
});
