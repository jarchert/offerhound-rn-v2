// RN port of Lovable src/components/AIUseCasesSection.tsx.
// Dense AI-features + NIL-features grid, copy VERBATIM from Lovable source.
import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {
  Mail, MessageSquare, Search, FileText, Sparkles, Brain, Target,
  TrendingUp, ArrowRight, Shield, DollarSign, Scale, Users,
} from 'lucide-react-native';
import { Button } from '@/components/ui/Button';
import { colors, typography, spacing, radius, shadows } from '@/lib/theme';

interface UseCase {
  icon: React.ComponentType<{ size: number; color: string }>;
  title: string;
  description: string;
  benefit: string;
  stats: string;
  patentPending?: boolean;
  isNil?: boolean;
}

const AI_USE_CASES: UseCase[] = [
  { icon: Mail, title: 'AI-Generated Recruiting Letters', description: "Our patent-pending AI crafts personalized, professional introduction and follow-up letters tailored to each coach's program, highlighting your unique strengths and fit.", benefit: 'Stand out from generic templates', stats: '3x higher response rates', patentPending: true },
  { icon: MessageSquare, title: '24/7 AI Recruiting Coach', description: 'Get instant, personalized recruiting advice anytime with our patent-pending AI coach. Ask questions about the process, get strategies, and receive guidance tailored to your situation.', benefit: 'Expert guidance on demand', stats: 'Available around the clock', patentPending: true },
  { icon: Search, title: 'Smart Coach Matching', description: "Our patent-pending AI analyzes your profile, stats, and preferences to recommend programs where you're most likely to succeed and receive offers.", benefit: 'Find your perfect fit faster', stats: 'Discover hidden opportunities', patentPending: true },
  { icon: FileText, title: 'Profile Optimization', description: 'Our patent-pending AI reviews your profile and suggests improvements to make you more attractive to college coaches—from bio writing to stat presentation.', benefit: 'Present your best self', stats: 'Complete profiles get 5x more views', patentPending: true },
  { icon: Brain, title: 'Intelligent Follow-Up Timing', description: 'Patent-pending AI determines the optimal times to reach out to coaches based on their activity patterns and recruiting calendar deadlines.', benefit: 'Perfect timing, every time', stats: 'Maximize engagement rates', patentPending: true },
  { icon: Target, title: 'Personalized Action Plans', description: 'Receive patent-pending AI-generated weekly tasks and milestones customized to your recruiting timeline, position, and target schools.', benefit: 'Stay on track effortlessly', stats: 'Clear path to your goals', patentPending: true },
];

const NIL_FEATURES: UseCase[] = [
  { icon: Shield, title: 'NIL Intelligence & Advisory', description: 'Navigate NIL opportunities responsibly with patent-pending AI-powered educational guidance. Understand structures, timing, and common pathways—without legal or financial advice.', benefit: 'Education, not advice', stats: 'Parent-verified access', patentPending: true, isNil: true },
  { icon: DollarSign, title: 'NIL Readiness Score', description: 'Get a patent-pending AI-powered educational readiness assessment that helps families understand complexity and preparedness factors for NIL opportunities.', benefit: 'Understand your position', stats: 'Personalized insights', patentPending: true, isNil: true },
  { icon: Scale, title: 'Responsible NIL Education', description: 'Learn about NIL funding structures, entity formation concepts, and contract awareness with patent-pending AI—all contextualized to your state, sport, and situation.', benefit: 'Know before you decide', stats: 'State-specific context', patentPending: true, isNil: true },
  { icon: Users, title: 'Family Decision Ledger', description: 'Track every recommendation, question, and decision in your personal NIL journey with our patent-pending system. A transparent record for families navigating complexity together.', benefit: 'Full accountability', stats: 'Complete decision history', patentPending: true, isNil: true },
];

const GREEN_500 = '#10b981';

interface AIUseCasesSectionProps {
  showGetStartedCta?: boolean;
}

export function AIUseCasesSection({ showGetStartedCta = true }: AIUseCasesSectionProps) {
  const nav = useNavigation<any>();

  return (
    <View style={s.section}>
      <View style={s.container}>
        {/* Header */}
        <View style={s.headerCenter}>
          <View style={s.pillGold}>
            <Sparkles size={14} color={colors.primary} />
            <Text style={s.pillGoldText}>Powered by Patent-Pending AI</Text>
          </View>
          <Text style={s.heading}>
            HOW AI HELPS YOU <Text style={s.goldText}>GET RECRUITED</Text>
          </Text>
          <Text style={s.subtitle}>
            OfferHound™ is the only recruiting platform that leverages patent-pending
            artificial intelligence to give you a competitive edge. Here's how our AI works for you:
          </Text>
        </View>

        {/* AI use cases grid */}
        <View style={s.grid}>
          {AI_USE_CASES.map((u) => (
            <View key={u.title} style={s.card}>
              <View style={s.iconWrapGold}>
                <u.icon size={24} color={colors.primary} />
              </View>
              <View style={s.titleRow}>
                <Text style={s.cardTitle}>{u.title}</Text>
                {u.patentPending && (
                  <View style={s.ppBadge}>
                    <Text style={s.ppBadgeText}>Patent-Pending</Text>
                  </View>
                )}
              </View>
              <Text style={s.cardDesc}>{u.description}</Text>
              <View style={s.badgeRow}>
                <View style={s.badgeSecondary}>
                  <TrendingUp size={12} color={colors.primary} />
                  <Text style={s.badgeSecondaryText}>{u.benefit}</Text>
                </View>
                <View style={s.badgeGold}>
                  <Text style={s.badgeGoldText}>{u.stats}</Text>
                </View>
              </View>
            </View>
          ))}
        </View>

        {/* NIL header */}
        <View style={[s.headerCenter, { marginTop: spacing.xxl }]}>
          <View style={[s.pillGold, { backgroundColor: 'rgba(16, 185, 129, 0.1)' }]}>
            <Shield size={14} color={GREEN_500} />
            <Text style={[s.pillGoldText, { color: GREEN_500 }]}>NIL Intelligence • Free for Limited Time</Text>
          </View>
          <Text style={[s.heading, { fontSize: typography.heading.h3 }]}>
            RESPONSIBLE <Text style={s.goldText}>NIL EDUCATION</Text> FOR FAMILIES
          </Text>
          <Text style={s.subtitle}>
            Navigate the complex world of Name, Image, and Likeness opportunities with
            ethical, educational AI guidance. OfferHound helps families understand NIL—without
            providing legal, tax, or financial advice.
          </Text>
        </View>

        {/* NIL grid */}
        <View style={s.grid}>
          {NIL_FEATURES.map((f) => (
            <View key={f.title} style={[s.card, s.nilCard]}>
              <View style={[s.iconWrapGold, { backgroundColor: 'rgba(16, 185, 129, 0.1)' }]}>
                <f.icon size={24} color={GREEN_500} />
              </View>
              <View style={s.titleRow}>
                <Text style={[s.cardTitle, { fontSize: typography.heading.h5 }]}>{f.title}</Text>
                {f.patentPending && (
                  <View style={[s.ppBadge, { backgroundColor: 'rgba(16, 185, 129, 0.1)' }]}>
                    <Text style={[s.ppBadgeText, { color: GREEN_500 }]}>Patent-Pending</Text>
                  </View>
                )}
              </View>
              <Text style={s.cardDesc}>{f.description}</Text>
              <View style={s.badgeRow}>
                <View style={[s.badgeSecondary, { backgroundColor: 'rgba(16, 185, 129, 0.1)' }]}>
                  <Shield size={12} color={GREEN_500} />
                  <Text style={[s.badgeSecondaryText, { color: GREEN_500 }]}>{f.benefit}</Text>
                </View>
              </View>
            </View>
          ))}
        </View>

        {/* NIL CTA */}
        <View style={s.ctaCenter}>
          <Button
            variant="outline"
            size="lg"
            onPress={() => nav.navigate('NILIntelligence' as never)}
            leftIcon={<Shield size={18} color={GREEN_500} />}
            rightIcon={<ArrowRight size={18} color={colors.foreground} />}
            style={{ borderColor: 'rgba(16, 185, 129, 0.3)' }}
          >
            Explore NIL Intelligence
          </Button>
          <Text style={s.ctaCaption}>
            Educational only • Not legal, tax, or financial advice • Parent verification required
          </Text>
        </View>

        {/* Quick Start CTA */}
        {showGetStartedCta && (
          <View style={[s.ctaCenter, { marginTop: spacing.xl }]}>
            <Button
              variant="outline"
              size="lg"
              onPress={() => nav.navigate('QuickStart' as never)}
              rightIcon={<ArrowRight size={18} color={colors.foreground} />}
            >
              Try Quick Start
            </Button>
            <Text style={s.ctaCaption}>
              No credit card required • Free to get started
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  section: { paddingVertical: spacing.xxl + spacing.md, backgroundColor: colors.background },
  container: { paddingHorizontal: spacing.lg },
  headerCenter: { alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xl + spacing.sm },
  pillGold: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: 'rgba(231, 175, 8, 0.1)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.full,
  },
  pillGoldText: {
    fontFamily: typography.fontFamily.bodyMedium,
    fontSize: typography.fontSize.sm,
    color: colors.primary,
  },
  heading: {
    fontFamily: typography.fontFamily.heading,
    fontSize: typography.heading.h2,
    color: colors.foreground,
    textAlign: 'center',
    letterSpacing: typography.letterSpacing.heading,
  },
  goldText: { color: colors.primary },
  subtitle: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.base,
    color: colors.foregroundSubtle,
    textAlign: 'center',
    maxWidth: 560,
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
  nilCard: {
    borderColor: 'rgba(16, 185, 129, 0.2)',
    backgroundColor: 'rgba(16, 185, 129, 0.04)',
  },
  iconWrapGold: {
    width: 48,
    height: 48,
    borderRadius: radius.lg,
    backgroundColor: 'rgba(231, 175, 8, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm + 2,
  },
  titleRow: {
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
    marginBottom: spacing.sm,
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
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  badgeSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(39, 43, 52, 0.5)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  badgeSecondaryText: {
    fontFamily: typography.fontFamily.bodyMedium,
    fontSize: typography.fontSize.xs,
    color: colors.secondaryForeground,
  },
  badgeGold: {
    backgroundColor: 'rgba(231, 175, 8, 0.1)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  badgeGoldText: {
    fontFamily: typography.fontFamily.bodyMedium,
    fontSize: typography.fontSize.xs,
    color: colors.primary,
  },
  ctaCenter: { alignItems: 'center', marginTop: spacing.xl, gap: spacing.xs },
  ctaCaption: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.xs,
    color: colors.foregroundSubtle,
    textAlign: 'center',
  },
});
