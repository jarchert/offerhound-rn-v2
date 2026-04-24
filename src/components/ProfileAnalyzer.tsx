// ProfileAnalyzer — RN port of Lovable src/components/ProfileAnalyzer.tsx.
// Verbatim structure / copy preserved. Tailwind classes translated to RN
// StyleSheet using the design tokens from `@/lib/theme`. The Lovable
// `useProfileAnalysis` hook is inlined here to avoid a second file write
// while keeping the component a faithful port.
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Pressable } from 'react-native';
import {
  Sparkles,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  Info,
  TrendingUp,
  User,
  GraduationCap,
  Dumbbell,
  Camera,
  BookOpen,
  Phone,
  Users,
} from 'lucide-react-native';
import { Button } from '@/components/ui/Button';
import { Progress } from '@/components/ui/Progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { PatentPendingBadge } from '@/components/ui/PatentPendingBadge';
import { toast } from '@/components/ui/toast';
import { supabase } from '@/integrations/supabase/client';
import { colors, typography, spacing, radius } from '@/lib/theme';

// ────────────────────────────────────────────────────────────────────────────
// Inlined hook — verbatim port of src/hooks/useProfileAnalysis.ts
// ────────────────────────────────────────────────────────────────────────────
interface SectionScores {
  basicInfo: number;
  academics: number;
  athletics: number;
  media: number;
  story: number;
  contact: number;
  references: number;
}

interface Recommendation {
  priority: 'high' | 'medium' | 'low';
  category: string;
  title: string;
  description: string;
  impact: string;
}

interface AnalysisData {
  sectionScores: SectionScores;
  strengths: string[];
}

interface ProfileAnalysis {
  completenessScore: number;
  analysisData: AnalysisData;
  recommendations: Recommendation[];
  analyzedAt: string;
}

function useProfileAnalysis() {
  const [analysis, setAnalysis] = useState<ProfileAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const analyzeProfile = async (profileId: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('analyze-profile', {
        body: { profileId },
      });

      if (fnError) {
        throw fnError;
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      setAnalysis(data as ProfileAnalysis);
      return data as ProfileAnalysis;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to analyze profile';
      setError(message);
      toast.error(message);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const refreshAnalysis = async (profileId: string) => analyzeProfile(profileId);

  return { analysis, isLoading, error, analyzeProfile, refreshAnalysis };
}

// ────────────────────────────────────────────────────────────────────────────
// ProfileAnalyzer — verbatim port
// ────────────────────────────────────────────────────────────────────────────
interface ProfileAnalyzerProps {
  profileId: string;
  autoAnalyze?: boolean;
}

const categoryIcons: Record<string, React.ComponentType<any>> = {
  basicInfo: User,
  academics: GraduationCap,
  athletics: Dumbbell,
  media: Camera,
  story: BookOpen,
  contact: Phone,
  references: Users,
};

const categoryLabels: Record<string, string> = {
  basicInfo: 'Basic Info',
  academics: 'Academics',
  athletics: 'Athletics',
  media: 'Media',
  story: 'Story',
  contact: 'Contact',
  references: 'References',
};

// Tailwind tier colors → theme equivalents
const SCORE_GREEN = colors.success;   // text-green-500
const SCORE_YELLOW = colors.warning;  // text-yellow-500
const SCORE_ORANGE = '#f59e0b';       // text-orange-500 (tw orange-500)
const SCORE_RED = colors.destructive; // text-red-500

function getScoreColor(score: number): string {
  if (score >= 80) return SCORE_GREEN;
  if (score >= 60) return SCORE_YELLOW;
  if (score >= 40) return SCORE_ORANGE;
  return SCORE_RED;
}

// Returns a faint tinted background analogous to bg-gradient-to-br from-X/20 to-X/5.
// RN has no built-in gradient; we use a flat tint at ~12% alpha as a parity stand-in.
function getScoreTint(score: number): string {
  if (score >= 80) return 'rgba(22,161,73,0.12)';     // green
  if (score >= 60) return 'rgba(244,158,10,0.12)';    // yellow/warning
  if (score >= 40) return 'rgba(245,158,11,0.12)';    // orange
  return 'rgba(220,40,40,0.12)';                      // red
}

function getPriorityIcon(priority: string) {
  switch (priority) {
    case 'high':
      return <AlertTriangle width={16} height={16} color={SCORE_RED} />;
    case 'medium':
      return <Info width={16} height={16} color={SCORE_YELLOW} />;
    default:
      return <CheckCircle width={16} height={16} color={SCORE_GREEN} />;
  }
}

export function ProfileAnalyzer({ profileId, autoAnalyze = true }: ProfileAnalyzerProps) {
  const { analysis, isLoading, analyzeProfile, refreshAnalysis } = useProfileAnalysis();
  const [hasAnalyzed, setHasAnalyzed] = useState(false);

  useEffect(() => {
    if (autoAnalyze && profileId && !hasAnalyzed) {
      analyzeProfile(profileId);
      setHasAnalyzed(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileId, autoAnalyze, hasAnalyzed]);

  // ── Loading ──────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <Card style={s.cardSurface}>
        <CardContent style={s.loadingContent}>
          <ActivityIndicator size="large" color={colors.primary} style={{ marginBottom: spacing.md }} />
          <Text style={s.loadingText}>Analyzing your profile with patent-pending AI...</Text>
        </CardContent>
      </Card>
    );
  }

  // ── Empty / not yet analyzed ─────────────────────────────────────────────
  if (!analysis) {
    return (
      <Card style={s.cardSurface}>
        <CardContent style={s.emptyContent}>
          <Sparkles width={48} height={48} color={colors.primary} style={{ marginBottom: spacing.md }} />
          <View style={s.emptyTitleRow}>
            <Text style={s.emptyTitle}>AI Profile Analysis</Text>
            <PatentPendingBadge size="sm" />
          </View>
          <Text style={s.emptyDesc}>
            Get personalized recommendations to improve your profile visibility to coaches using our patent-pending AI.
          </Text>
          <Button variant="hero" onPress={() => analyzeProfile(profileId)}>
            <View style={s.btnInner}>
              <Sparkles width={16} height={16} color={colors.primaryForeground} />
              <Text style={s.btnHeroText}>Analyze My Profile</Text>
            </View>
          </Button>
        </CardContent>
      </Card>
    );
  }

  // ── Main: scored analysis ────────────────────────────────────────────────
  const overallColor = getScoreColor(analysis.completenessScore);
  const overallTint = getScoreTint(analysis.completenessScore);

  return (
    <View style={s.stack}>
      {/* Overall Score */}
      <Card style={{ ...s.cardSurface, backgroundColor: overallTint }}>
        <CardHeader style={s.headerTight}>
          <View style={s.titleRow}>
            <View style={s.titleLeft}>
              <Sparkles width={20} height={20} color={colors.primary} />
              <CardTitle style={s.titleText}>Profile Completeness</CardTitle>
              <PatentPendingBadge size="xs" />
            </View>
            <Pressable
              onPress={() => refreshAnalysis(profileId)}
              disabled={isLoading}
              hitSlop={8}
              style={({ pressed }) => [s.refreshBtn, pressed && { opacity: 0.6 }]}
            >
              <RefreshCw width={16} height={16} color={colors.foreground} />
            </Pressable>
          </View>
        </CardHeader>
        <CardContent>
          <View style={s.overallRow}>
            <Text style={[s.overallScore, { color: overallColor }]}>
              {analysis.completenessScore}%
            </Text>
            <View style={s.overallRight}>
              <Progress value={analysis.completenessScore} style={{ height: 12 }} />
              <Text style={s.overallHint}>
                {analysis.completenessScore >= 80
                  ? 'Excellent! Your profile is well-optimized for coaches.'
                  : analysis.completenessScore >= 60
                  ? 'Good progress! A few improvements will help you stand out.'
                  : "Let's improve your profile to get noticed by more coaches."}
              </Text>
            </View>
          </View>

          {/* Section Scores grid (web: 2 / md:4 / lg:7 cols) — RN: wrap row */}
          <View style={s.sectionGrid}>
            {Object.entries(analysis.analysisData.sectionScores).map(([key, score]) => {
              const Icon = categoryIcons[key] || Info;
              const c = getScoreColor(score as number);
              return (
                <View key={key} style={s.sectionTile}>
                  <Icon width={20} height={20} color={c} />
                  <Text style={[s.sectionScore, { color: c }]}>{score}%</Text>
                  <Text style={s.sectionLabel}>{categoryLabels[key]}</Text>
                </View>
              );
            })}
          </View>
        </CardContent>
      </Card>

      {/* Strengths */}
      {analysis.analysisData.strengths?.length > 0 && (
        <Card style={s.cardSurface}>
          <CardHeader style={s.headerTight}>
            <View style={s.titleLeft}>
              <TrendingUp width={20} height={20} color={SCORE_GREEN} />
              <CardTitle style={s.subTitleText}>Your Strengths</CardTitle>
            </View>
          </CardHeader>
          <CardContent>
            <View style={s.list}>
              {analysis.analysisData.strengths.map((strength, i) => (
                <View key={i} style={s.listItem}>
                  <CheckCircle width={16} height={16} color={SCORE_GREEN} style={{ marginTop: 2 }} />
                  <Text style={s.listItemText}>{strength}</Text>
                </View>
              ))}
            </View>
          </CardContent>
        </Card>
      )}

      {/* Recommendations */}
      <Card style={s.cardSurface}>
        <CardHeader style={s.headerTight}>
          <View style={s.titleLeft}>
            <Sparkles width={20} height={20} color={colors.primary} />
            <CardTitle style={s.subTitleText}>AI Recommendations</CardTitle>
            <PatentPendingBadge size="xs" />
          </View>
        </CardHeader>
        <CardContent>
          <View style={s.recList}>
            {analysis.recommendations.map((rec, i) => {
              const Icon = categoryIcons[rec.category] || Info;
              const badgeVariant =
                rec.priority === 'high' ? 'destructive' :
                rec.priority === 'medium' ? 'secondary' : 'outline';
              return (
                <View key={i} style={s.recCard}>
                  <View style={s.recRow}>
                    {getPriorityIcon(rec.priority)}
                    <View style={s.recBody}>
                      <View style={s.recBadgeRow}>
                        <Text style={s.recTitle}>{rec.title}</Text>
                        <Badge variant={badgeVariant as any}>{rec.priority}</Badge>
                        <View style={s.categoryChip}>
                          <Icon width={12} height={12} color={colors.foreground} />
                          <Text style={s.badgeText}>{categoryLabels[rec.category]}</Text>
                        </View>
                      </View>
                      <Text style={s.recDesc}>{rec.description}</Text>
                      <View style={s.recImpactRow}>
                        <TrendingUp width={12} height={12} color={colors.primary} />
                        <Text style={s.recImpact}>{rec.impact}</Text>
                      </View>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        </CardContent>
      </Card>
    </View>
  );
}

export default ProfileAnalyzer;

// ────────────────────────────────────────────────────────────────────────────
// Styles
// ────────────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  stack: { gap: spacing.lg },

  cardSurface: {
    borderColor: 'rgba(43,48,58,0.5)', // border-border/50
  },

  // Loading
  loadingContent: { paddingVertical: spacing.xxl, alignItems: 'center' },
  loadingText: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.sm,
    color: colors.mutedForeground,
    textAlign: 'center',
  },

  // Empty
  emptyContent: { paddingVertical: spacing.xl, alignItems: 'center' },
  emptyTitleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xs },
  emptyTitle: {
    fontFamily: typography.fontFamily.heading,
    fontSize: typography.heading.h4,
    color: colors.foreground,
    letterSpacing: typography.letterSpacing.heading,
  },
  emptyDesc: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.sm,
    color: colors.mutedForeground,
    textAlign: 'center',
    marginBottom: spacing.md,
    paddingHorizontal: spacing.md,
  },
  btnInner: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  btnHeroText: {
    fontFamily: typography.fontFamily.bodySemiBold,
    color: colors.primaryForeground,
    fontSize: typography.fontSize.sm,
  },

  // Header
  headerTight: { paddingBottom: spacing.xs },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  titleLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexShrink: 1 },
  titleText: {
    fontFamily: typography.fontFamily.heading,
    fontSize: typography.heading.h5,
    color: colors.foreground,
    letterSpacing: typography.letterSpacing.heading,
  },
  subTitleText: {
    fontFamily: typography.fontFamily.heading,
    fontSize: typography.heading.h6,
    color: colors.foreground,
    letterSpacing: typography.letterSpacing.heading,
  },
  refreshBtn: { padding: spacing.xs, borderRadius: radius.sm },

  // Overall score
  overallRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.md },
  overallScore: {
    fontFamily: typography.fontFamily.heading,
    fontSize: typography.fontSize['5xl'],
    letterSpacing: typography.letterSpacing.heading,
  },
  overallRight: { flex: 1, gap: spacing.xs },
  overallHint: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.sm,
    color: colors.mutedForeground,
  },

  // Section grid
  sectionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  sectionTile: {
    minWidth: 80,
    flexBasis: '22%',
    flexGrow: 1,
    alignItems: 'center',
    padding: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: 'rgba(16,19,24,0.5)', // bg-background/50
  },
  sectionScore: {
    fontFamily: typography.fontFamily.heading,
    fontSize: typography.fontSize.lg,
    marginTop: 2,
    letterSpacing: typography.letterSpacing.heading,
  },
  sectionLabel: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.xs,
    color: colors.mutedForeground,
    textAlign: 'center',
  },

  // Strengths list
  list: { gap: spacing.sm },
  listItem: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  listItemText: {
    flex: 1,
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.sm,
    color: colors.foreground,
  },

  // Recommendations
  recList: { gap: spacing.sm },
  recCard: {
    padding: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: 'rgba(16,19,24,0.5)',
    borderWidth: 1,
    borderColor: 'rgba(43,48,58,0.3)', // border-border/30
  },
  recRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  recBody: { flex: 1, gap: spacing.xs },
  recBadgeRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, flexWrap: 'wrap' },
  recTitle: {
    fontFamily: typography.fontFamily.bodyMedium,
    fontSize: typography.fontSize.sm,
    color: colors.foreground,
  },
  badgeInner: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  categoryChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: spacing.sm, paddingVertical: 2,
    borderRadius: 999, borderWidth: 1, borderColor: colors.border,
    backgroundColor: 'transparent',
  },
  badgeText: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.xs,
    color: colors.foreground,
  },
  recDesc: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.sm,
    color: colors.mutedForeground,
  },
  recImpactRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  recImpact: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.xs,
    color: colors.primary,
  },
});
