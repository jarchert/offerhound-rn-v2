import React, { useState } from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Trophy, Zap, Star } from 'lucide-react-native';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';
import { Badge } from '@/components/ui/Badge';
import { Card, CardContent } from '@/components/ui/Card';
import { AthletePerformanceRadar } from '@/components/AthletePerformanceRadar';
import { HighlightMediaWindow } from '@/components/HighlightMediaWindow';
import { getSportConfig } from '@/lib/data/sports';
import { colors, typography, spacing } from '@/lib/theme';

export interface SecondarySport {
  sport: string;
  position?: string;
  positions?: string[];
  sport_stats?: Record<string, string | number>;
  highlight_video_url?: string;
  highlights_description?: string;
  traits?: string[];
  intangibles?: string[];
}

interface SportProfileTabsProps {
  primarySport: string;
  primaryPosition?: string;
  primaryPositions?: string[];
  primarySportStats?: Record<string, string | number>;
  primaryHighlightVideoUrl?: string;
  primaryHighlightsDescription?: string;
  primaryTraits?: string[];
  primaryIntangibles?: string[];
  secondarySports: SecondarySport[];
  athleteInfo: {
    height?: string;
    weight?: string;
    forty_yard?: string;
    vertical?: string;
    bench_press?: string;
    squat?: string;
    arm_length?: string;
  };
  style?: ViewStyle;
}

export function SportProfileTabs({
  primarySport,
  primaryPosition,
  primaryPositions,
  primarySportStats,
  primaryHighlightVideoUrl,
  primaryHighlightsDescription,
  primaryTraits,
  primaryIntangibles,
  secondarySports,
  athleteInfo,
  style,
}: SportProfileTabsProps) {
  const allSports = [
    {
      sport: primarySport,
      position: primaryPosition,
      positions: primaryPositions,
      sport_stats: primarySportStats,
      highlight_video_url: primaryHighlightVideoUrl,
      highlights_description: primaryHighlightsDescription,
      traits: primaryTraits,
      intangibles: primaryIntangibles,
    },
    ...secondarySports,
  ];

  const [activeSport, setActiveSport] = useState(primarySport);

  if (allSports.length <= 1) {
    // No secondary sports, render nothing (content handled by parent)
    return null;
  }

  return (
    <View style={style}>
      <Tabs value={activeSport} onValueChange={setActiveSport}>
        <TabsList>
          {allSports.map((sportData) => {
            const config = getSportConfig(sportData.sport);
            return (
              <TabsTrigger key={sportData.sport} value={sportData.sport}>
                {config.name}
              </TabsTrigger>
            );
          })}
        </TabsList>

        {allSports.map((sportData) => {
          const config = getSportConfig(sportData.sport);
          return (
            <TabsContent key={sportData.sport} value={sportData.sport} style={s.tabContent}>
              {/* Positions */}
              <View style={s.positionsRow}>
                <Text style={s.positionsLabel}>Positions:</Text>
                {sportData.positions && sportData.positions.length > 0 ? (
                  sportData.positions.map((pos: string) => (
                    <Badge key={pos} variant="secondary">
                      {pos}
                    </Badge>
                  ))
                ) : sportData.position ? (
                  <Badge variant="secondary">{sportData.position}</Badge>
                ) : (
                  <Text style={s.mutedText}>Not specified</Text>
                )}
              </View>

              {/* Sport-specific highlight video */}
              {sportData.highlight_video_url && (
                <View style={s.centerRow}>
                  <HighlightMediaWindow videoSrc={sportData.highlight_video_url} />
                </View>
              )}

              {/* Athletic Performance Radar */}
              <AthletePerformanceRadar
                athlete={{
                  height: athleteInfo.height,
                  weight: athleteInfo.weight,
                  forty_yard: athleteInfo.forty_yard,
                  vertical: athleteInfo.vertical,
                  bench_press: athleteInfo.bench_press,
                  squat: athleteInfo.squat,
                  arm_length: athleteInfo.arm_length,
                  position: sportData.position,
                  positions: sportData.positions,
                }}
              />

              {/* Sport-specific stats */}
              {sportData.sport_stats && Object.keys(sportData.sport_stats).length > 0 && (
                <Card>
                  <CardContent style={s.cardPad}>
                    <Text style={s.sectionHeading}>{config.name} Stats</Text>
                    <View style={s.statsGrid}>
                      {config.stats.map((stat) => {
                        const value = sportData.sport_stats?.[stat.key];
                        if (!value) return null;
                        return (
                          <View key={stat.key} style={s.statCell}>
                            <Text style={s.statValue}>
                              {value}
                              {stat.unit || ''}
                            </Text>
                            <Text style={s.statLabel}>{stat.label}</Text>
                          </View>
                        );
                      })}
                    </View>
                  </CardContent>
                </Card>
              )}

              {/* Highlights description */}
              {sportData.highlights_description && (
                <Card>
                  <CardContent style={s.cardPad}>
                    <View style={s.sectionHeadingRow}>
                      <Trophy size={20} color={colors.primary} />
                      <Text style={s.sectionHeading}>{config.terminology.highlights}</Text>
                    </View>
                    <Text style={s.bodyMuted}>{sportData.highlights_description}</Text>
                  </CardContent>
                </Card>
              )}

              {/* Athletic Traits */}
              {sportData.traits && sportData.traits.length > 0 && (
                <Card>
                  <CardContent style={s.cardPad}>
                    <View style={s.sectionHeadingRow}>
                      <Zap size={20} color={colors.primary} />
                      <Text style={s.sectionHeading}>Athletic Traits</Text>
                    </View>
                    <View style={s.badgeWrap}>
                      {sportData.traits.map((trait: string) => (
                        <Badge key={trait} variant="secondary">
                          {trait}
                        </Badge>
                      ))}
                    </View>
                  </CardContent>
                </Card>
              )}

              {/* Intangibles */}
              {sportData.intangibles && sportData.intangibles.length > 0 && (
                <Card>
                  <CardContent style={s.cardPad}>
                    <View style={s.sectionHeadingRow}>
                      <Star size={20} color={colors.primary} />
                      <Text style={s.sectionHeading}>Intangibles</Text>
                    </View>
                    <View style={s.badgeWrap}>
                      {sportData.intangibles.map((intangible: string) => (
                        <Badge key={intangible} variant="outline">
                          {intangible}
                        </Badge>
                      ))}
                    </View>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          );
        })}
      </Tabs>
    </View>
  );
}

export default SportProfileTabs;

const s = StyleSheet.create({
  tabContent: {
    marginTop: spacing.lg,
    gap: spacing.lg,
  },
  positionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.xs * 2,
  },
  positionsLabel: {
    fontFamily: typography.fontFamily.bodyMedium,
    fontSize: typography.fontSize.sm,
    color: colors.mutedForeground,
  },
  mutedText: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.sm,
    color: colors.mutedForeground,
  },
  centerRow: {
    alignItems: 'center',
  },
  cardPad: {
    paddingTop: spacing.lg,
  },
  sectionHeading: {
    fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: typography.fontSize.lg,
    color: colors.foreground,
    marginBottom: spacing.md,
  },
  sectionHeadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs * 2,
    marginBottom: spacing.sm + 4,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  statCell: {
    minWidth: '45%',
    flexGrow: 1,
    alignItems: 'center',
    padding: spacing.sm + 4,
    backgroundColor: colors.muted,
    borderRadius: 8,
  },
  statValue: {
    fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: typography.fontSize.lg,
    color: colors.foreground,
  },
  statLabel: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.xs,
    color: colors.mutedForeground,
    marginTop: 2,
  },
  bodyMuted: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.sm,
    color: colors.mutedForeground,
    lineHeight: 20,
  },
  badgeWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs * 2,
  },
});
