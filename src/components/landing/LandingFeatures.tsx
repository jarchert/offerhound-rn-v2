// RN port of Lovable landing feature sections (AthleteFeaturesSection + CoachFeaturesSection).
// One shared component parametrized by viewer type — same copy verbatim.
import React from 'react';
import { View, Text, StyleSheet, ImageBackground, ScrollView } from 'react-native';
import {
  TrendingUp, Users, Search, Mail, MessageSquare, BarChart3, Clock, BookUser,
  Filter, Bookmark, Target, FileText, Send, Download,
  LucideIcon,
} from 'lucide-react-native';
import { colors, typography, spacing, radius, shadows } from '@/lib/theme';
import { BG_FEATURES_TRAINING, BG_COACH_SCOUT } from '@/lib/assets';

type ViewerType = 'athlete' | 'coach';

interface Feature {
  icon: LucideIcon;
  title: string;
  description: string;
  patentPending?: boolean;
}

const ATHLETE_FEATURES: Feature[] = [
  { icon: TrendingUp, title: 'Get Discovered', description: 'Your highlights, stats, and media are showcased to coaches actively searching for athletes with YOUR specific traits and intangibles.' },
  { icon: Users, title: 'Professional Profile', description: 'Create a stunning athlete profile with your stats, highlights, academics, and personal story. Tag your athletic traits and intangibles so coaches can find you.' },
  { icon: Search, title: 'Coach Database', description: 'Access thousands of college coaches across all divisions. Search by school, conference, position coached, and more.' },
  { icon: Mail, title: 'AI-Powered Letters', description: 'Generate personalized introduction and interest letters for any coach using our patent-pending AI. Stand out with professional, customized outreach.', patentPending: true },
  { icon: MessageSquare, title: 'OfferHound Coach AI', description: 'Get personalized recruiting advice from our patent-pending AI coach. Ask questions about the process, get tips, and plan your strategy.', patentPending: true },
  { icon: BarChart3, title: 'Activity Tracking', description: 'Keep track of every coach contact, letter sent, and response received. Never lose track of your recruiting progress.' },
  { icon: Clock, title: 'Scheduled Outreach', description: 'Schedule your letters to be sent at the perfect time. Plan your outreach campaigns in advance and stay organized.' },
  { icon: BookUser, title: 'Personal Contact Book', description: 'Build and maintain your own coaches contact book. Save target coaches, add notes, set priorities, and schedule ongoing communications.' },
];

const COACH_FEATURES: Feature[] = [
  { icon: Search, title: 'Advanced Athlete Search', description: 'Search our growing database of athletes by position, graduation year, location, academic stats, and athletic measurables.' },
  { icon: Filter, title: 'Trait & Intangibles Filter', description: "Find athletes with specific traits like 'Game Speed', 'High Motor', 'Coachable', 'Leader' and more—the qualities that don't show up on a stat sheet." },
  { icon: Bookmark, title: 'Build Your Board', description: 'Save prospects to your recruiting board, organize by priority, add notes, and track your evaluation progress.' },
  { icon: Target, title: 'AI-Powered Matches', description: "Our patent-pending AI analyzes your program's needs and recommends athletes who match your position requirements, scheme fit, and academic standards.", patentPending: true },
  { icon: FileText, title: 'Detailed Profiles', description: 'View comprehensive athlete profiles including highlights, stats, academics, family background, and what makes each athlete unique.' },
  { icon: Send, title: 'Direct Communication', description: "Send messages directly to athletes and their families. Build relationships early and communicate your program's interest." },
  { icon: BarChart3, title: 'Recruiting Pipeline', description: 'Manage your entire recruiting pipeline with stages, priorities, and activity tracking. Never lose track of a prospect.' },
  { icon: Download, title: 'Export & Reports', description: 'Export scouting reports, comparison sheets, and recruiting board data to share with your staff and coaching team.' },
];

interface LandingFeaturesProps {
  viewerType: ViewerType;
}

export function LandingFeatures({ viewerType }: LandingFeaturesProps) {
  const features = viewerType === 'athlete' ? ATHLETE_FEATURES : COACH_FEATURES;
  const bg = viewerType === 'athlete' ? BG_FEATURES_TRAINING : BG_COACH_SCOUT;
  const titlePart1 =
    viewerType === 'athlete' ? 'EVERYTHING YOU NEED TO ' : 'POWERFUL TOOLS TO ';
  const titleGold =
    viewerType === 'athlete' ? 'GET NOTICED' : 'FIND YOUR RECRUITS';
  const subtitle =
    viewerType === 'athlete'
      ? 'OfferHound gives you the tools to stand out, connect with coaches, and manage your entire recruiting process.'
      : 'OfferHound™ gives coaches and scouts the tools to discover overlooked talent, evaluate prospects, and build winning rosters.';

  return (
    <View style={s.section}>
      <ImageBackground source={bg} style={s.bg} imageStyle={s.bgImage}>
        <View style={s.bgOverlay} />
        <View style={s.container}>
          <View style={s.headerWrap}>
            <Text style={s.heading}>
              {titlePart1}<Text style={s.headingGold}>{titleGold}</Text>
            </Text>
            <Text style={s.subtitle}>{subtitle}</Text>
          </View>

          <View style={s.grid}>
            {features.map((f) => (
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
