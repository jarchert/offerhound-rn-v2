// Ported verbatim from Lovable web: src/components/CoachRecommendations.tsx
// Translations applied:
//   <div>/<p>/<span> → <View>/<Text>
//   Tailwind classes → StyleSheet using @/lib/theme tokens
//   @/components/ui/*  (lowercase) → PascalCase imports
//   lucide-react → lucide-react-native
//   react-router useNavigate → @react-navigation/native useNavigation
//   fetch(functions/v1/...) → supabase.functions.invoke (same behavior)
//   sonner toast → @/components/ui/toast wrapper
//   <img src={coachAvatar}> → <Image source={require(.../coach-avatar.png)}>
import { useState } from 'react';
import { View, Text, Image, StyleSheet, ActivityIndicator } from 'react-native';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { PatentPendingBadge } from '@/components/ui/PatentPendingBadge';
import { ArrowRight, Target, Star, TrendingUp } from 'lucide-react-native';
import { usePlayerProfile } from '@/hooks/usePlayerProfile';
import { useContactEvents } from '@/hooks/useContactEvents';
import { useCoaches } from '@/hooks/useCoaches';
import { toast } from '@/components/ui/toast';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '@/integrations/supabase/client';
import { colors, spacing, radius, typography } from '@/lib/theme';

const coachAvatar = require('../../assets/lovable/coach-avatar.png');

interface Recommendation {
  coachId: string;
  reason: string;
  priority: 'high' | 'medium' | 'low';
  suggestedApproach: string;
}

export function CoachRecommendations() {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { data: contactEvents } = useContactEvents();
  const { data: coaches } = useCoaches();
  const { profile } = usePlayerProfile();
  const navigation = useNavigation<any>();

  const getRecommendations = async () => {
    if (!coaches || coaches.length === 0) {
      toast.error('No coaches available. Please add coaches first.');
      return;
    }

    if (!profile) {
      toast.error('Please complete your profile first.');
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke(
        'coach-recommendations',
        {
          body: {
            athleteProfile: {
              name: profile.full_name,
              position: profile.position,
              positions: profile.positions,
              graduationYear: profile.graduation_year,
              school: profile.school,
              city: profile.city,
              state: profile.state,
              height: profile.height,
              weight: profile.weight,
              gpa: profile.gpa,
              fortyYard: profile.forty_yard,
              vertical: profile.vertical,
              benchPress: profile.bench_press,
              squat: profile.squat,
              highlights: profile.highlights,
              traits: profile.traits,
              intangibles: profile.intangibles,
            },
            contactHistory: contactEvents || [],
            // Limit to 100 coaches and ensure required fields have defaults
            existingCoaches: (coaches || []).slice(0, 100).map((coach) => ({
              id: coach.id,
              name: coach.name,
              title: coach.title,
              school: coach.school,
              division: coach.division,
              conference: coach.conference,
              position_coached: coach.positionCoached || 'Unknown',
            })),
          },
        }
      );

      if (error) {
        const status = (error as any).context?.status;
        if (status === 429) {
          toast.error('Rate limit exceeded. Please try again in a moment.');
        } else if (status === 402) {
          toast.error('AI credits exhausted. Please add credits to continue.');
        } else {
          toast.error((error as any).message || 'Failed to get recommendations');
        }
        return;
      }

      if (data?.recommendations) {
        setRecommendations(data.recommendations);
        toast.success('Generated personalized recommendations!');
      }
    } catch (err) {
      console.error('Error getting recommendations:', err);
      toast.error('Failed to get recommendations');
    } finally {
      setIsLoading(false);
    }
  };

  const getCoachById = (id: string) => {
    return coaches?.find((c) => c.id === id);
  };

  const handleContact = (coachId: string) => {
    const coach = getCoachById(coachId);
    if (coach) {
      navigation.navigate('LetterComposer', {
        seed: {
          recipientName: coach.name,
          schoolName: coach.school,
        },
      });
    }
  };

  const priorityStyles: Record<
    Recommendation['priority'],
    { bg: string; fg: string; border: string }
  > = {
    high: {
      bg: 'rgba(239, 68, 68, 0.1)',
      fg: '#ef4444',
      border: 'rgba(239, 68, 68, 0.3)',
    },
    medium: {
      bg: 'rgba(234, 179, 8, 0.1)',
      fg: '#eab308',
      border: 'rgba(234, 179, 8, 0.3)',
    },
    low: {
      bg: 'rgba(34, 197, 94, 0.1)',
      fg: '#22c55e',
      border: 'rgba(34, 197, 94, 0.3)',
    },
  };

  const priorityIcons = {
    high: Star,
    medium: TrendingUp,
    low: Target,
  };

  return (
    <Card>
      <CardHeader style={styles.header}>
        <View style={styles.headerRow}>
          <View style={styles.headerTextCol}>
            <View style={styles.titleRow}>
              <Image source={coachAvatar} style={styles.avatar} />
              <CardTitle style={styles.titleText}>
                OFFERHOUND COACH Recommendations
              </CardTitle>
              <PatentPendingBadge size="xs" />
            </View>
            <CardDescription style={styles.description}>
              Get personalized recommendations on which coaches to contact next
              using our patent-pending AI
            </CardDescription>
          </View>
          <Button
            onPress={getRecommendations}
            disabled={isLoading || !profile}
          >
            {isLoading ? (
              <View style={styles.btnInner}>
                <ActivityIndicator size="small" color={colors.primaryForeground} />
                <Text style={styles.btnText}>Analyzing...</Text>
              </View>
            ) : (
              <View style={styles.btnInner}>
                <Target size={16} color={colors.primaryForeground} />
                <Text style={styles.btnText}>Get Recommendations</Text>
              </View>
            )}
          </Button>
        </View>
      </CardHeader>
      <CardContent>
        {recommendations.length === 0 ? (
          <View style={styles.emptyState}>
            <Target
              size={48}
              color={colors.mutedForeground}
              style={styles.emptyIcon}
            />
            <Text style={styles.emptyPrimary}>
              Click "Get Recommendations" to receive patent-pending AI coaching
              suggestions
            </Text>
            <Text style={styles.emptySecondary}>
              Based on your profile, contact history, and saved coaches
            </Text>
            <View style={styles.emptyBadge}>
              <PatentPendingBadge size="sm" />
            </View>
          </View>
        ) : (
          <View style={styles.recList}>
            {recommendations.map((rec, index) => {
              const coach = getCoachById(rec.coachId);
              if (!coach) return null;

              const PriorityIcon = priorityIcons[rec.priority];
              const ps = priorityStyles[rec.priority];

              return (
                <View key={index} style={styles.recItem}>
                  <View style={styles.recRow}>
                    <View style={styles.recBody}>
                      <View style={styles.recHeading}>
                        <Text style={styles.coachName}>{coach.name}</Text>
                        <Badge
                          style={{
                            backgroundColor: ps.bg,
                            borderColor: ps.border,
                            borderWidth: 1,
                          }}
                        >
                          <View style={styles.badgeInner}>
                            <PriorityIcon size={12} color={ps.fg} />
                            <Text style={[styles.badgeText, { color: ps.fg }]}>
                              {' '}{rec.priority} priority
                            </Text>
                          </View>
                        </Badge>
                      </View>
                      <Text style={styles.coachMeta}>
                        {coach.title} at {coach.school}
                      </Text>
                      <Text style={styles.recReason}>{rec.reason}</Text>
                      <Text style={styles.recApproach}>
                        Suggested approach: {rec.suggestedApproach}
                      </Text>
                    </View>
                    <Button
                      size="sm"
                      onPress={() => handleContact(rec.coachId)}
                    >
                      <View style={styles.btnInner}>
                        <Text style={styles.btnText}>Contact</Text>
                        <ArrowRight size={16} color={colors.primaryForeground} />
                      </View>
                    </Button>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </CardContent>
    </Card>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  headerTextCol: {
    flex: 1,
    minWidth: 0,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  titleText: {
    color: colors.foreground,
    fontFamily: typography.fontFamily.heading,
    fontSize: typography.heading.h5,
    letterSpacing: typography.letterSpacing.heading,
    flexShrink: 1,
  },
  avatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  description: {
    marginTop: spacing.xs,
    color: colors.mutedForeground,
    fontSize: typography.size.sm,
    fontFamily: typography.fontFamily.body,
  },
  btnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  btnText: {
    color: colors.primaryForeground,
    fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: typography.size.sm,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  emptyIcon: {
    marginBottom: spacing.md,
    opacity: 0.5,
  },
  emptyPrimary: {
    color: colors.mutedForeground,
    fontSize: typography.size.base,
    textAlign: 'center',
    fontFamily: typography.fontFamily.body,
  },
  emptySecondary: {
    color: colors.mutedForeground,
    fontSize: typography.size.sm,
    marginTop: spacing.sm,
    textAlign: 'center',
    fontFamily: typography.fontFamily.body,
  },
  emptyBadge: {
    marginTop: spacing.sm + 4,
  },
  recList: {
    gap: spacing.md,
  },
  recItem: {
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: 'rgba(39, 43, 52, 0.2)', // secondary/20
  },
  recRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  recBody: {
    flex: 1,
  },
  recHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  coachName: {
    color: colors.foreground,
    fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: typography.size.base,
  },
  badgeInner: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  badgeText: {
    fontSize: typography.size.xs,
    fontFamily: typography.fontFamily.bodyMedium,
  },
  coachMeta: {
    fontSize: typography.size.sm,
    color: colors.mutedForeground,
    marginBottom: spacing.xs,
    fontFamily: typography.fontFamily.body,
  },
  recReason: {
    fontSize: typography.size.sm,
    color: colors.foreground,
    marginBottom: spacing.sm,
    fontFamily: typography.fontFamily.body,
  },
  recApproach: {
    fontSize: typography.size.xs,
    color: colors.primary,
    fontStyle: 'italic',
    fontFamily: typography.fontFamily.body,
  },
});
