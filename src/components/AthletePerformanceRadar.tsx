import React, { useMemo, useState, useEffect } from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import Svg, { Polygon, Line, Circle, Text as SvgText, G } from 'react-native-svg';
import { Activity, TrendingUp, TrendingDown, Minus, AlertCircle, Sparkles } from 'lucide-react-native';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { colors, typography, spacing, radius } from '@/lib/theme';

// ---------- Position categories for benchmark grouping ----------
type PositionCategory = 'skill' | 'linebacker' | 'lineman' | 'specialist' | 'athlete';

const POSITION_BENCHMARKS: Record<PositionCategory, {
  fortyYard: number;
  vertical: number;
  benchPress: number;
  squat: number;
  weight: number;
  height: number;
  armLength: number;
  label: string;
}> = {
  skill:       { fortyYard: 4.35, vertical: 42, benchPress: 20, squat: 450, weight: 200, height: 74, armLength: 33, label: 'Skill Position (WR/RB/DB)' },
  linebacker:  { fortyYard: 4.5,  vertical: 38, benchPress: 28, squat: 525, weight: 235, height: 75, armLength: 34, label: 'Linebacker' },
  lineman:     { fortyYard: 5.0,  vertical: 32, benchPress: 35, squat: 600, weight: 300, height: 78, armLength: 35, label: 'Lineman (OL/DL)' },
  specialist:  { fortyYard: 4.8,  vertical: 32, benchPress: 15, squat: 400, weight: 200, height: 73, armLength: 32, label: 'Specialist (K/P/LS)' },
  athlete:     { fortyYard: 4.5,  vertical: 36, benchPress: 22, squat: 475, weight: 210, height: 74, armLength: 33, label: 'General Athlete' },
};

const getPositionCategory = (position: string | undefined | null): PositionCategory => {
  if (!position) return 'athlete';
  const pos = position.toLowerCase();
  if (pos.includes('receiver') || pos.includes('wr') ||
      pos.includes('running back') || pos.includes('rb') ||
      pos.includes('quarterback') || pos.includes('qb') ||
      pos.includes('corner') || pos.includes('cb') ||
      pos.includes('safety') || pos.includes('defensive back') || pos.includes('db')) {
    return 'skill';
  }
  if (pos.includes('linebacker') || pos.includes('lb')) return 'linebacker';
  if (pos.includes('lineman') || pos.includes('tackle') || pos.includes('guard') ||
      pos.includes('center') || pos.includes('ol') || pos.includes('dl') ||
      pos.includes('offensive line') || pos.includes('defensive line') ||
      pos.includes('defensive end') || pos.includes('de') ||
      pos.includes('defensive tackle') || pos.includes('dt') ||
      pos.includes('nose') || pos.includes('end')) {
    return 'lineman';
  }
  if (pos.includes('kicker') || pos.includes('punter') ||
      pos.includes('long snapper') || pos.includes('k') || pos.includes('p') || pos.includes('ls')) {
    return 'specialist';
  }
  return 'athlete';
};

const calculatePercentile = (value: number | undefined | null, benchmark: number, inverseScale = false): number => {
  if (value === undefined || value === null || isNaN(value)) return 0;
  if (inverseScale) {
    const worstCase = benchmark + 1.2;
    const percentile = ((worstCase - value) / (worstCase - benchmark)) * 100;
    return Math.max(0, Math.min(100, percentile));
  }
  const percentile = (value / benchmark) * 100;
  return Math.max(0, Math.min(100, percentile));
};

const getPerformanceRating = (percentile: number): { label: string; color: string; icon: 'up' | 'down' | 'neutral' } => {
  if (percentile >= 90) return { label: 'Elite', color: '#4ade80', icon: 'up' };             // green-400
  if (percentile >= 75) return { label: 'Excellent', color: '#34d399', icon: 'up' };         // emerald-400
  if (percentile >= 60) return { label: 'Above Average', color: colors.primary, icon: 'up' };
  if (percentile >= 40) return { label: 'Average', color: colors.mutedForeground, icon: 'neutral' };
  if (percentile >= 25) return { label: 'Below Average', color: '#fb923c', icon: 'down' };   // orange-400
  return { label: 'Needs Work', color: '#f87171', icon: 'down' };                            // red-400
};

const parseHeight = (height: string | undefined | null): number | null => {
  if (!height) return null;
  const match = height.match(/(\d+)'(\d+)/);
  if (match) return parseInt(match[1]) * 12 + parseInt(match[2]);
  return null;
};

const parseWeight = (weight: string | undefined | null): number | null => {
  if (!weight) return null;
  const match = weight.match(/(\d+)/);
  if (match) return parseInt(match[1]);
  return null;
};

const parseTime = (time: string | undefined | null): number | null => {
  if (!time) return null;
  const parsed = parseFloat(time.replace('s', ''));
  return isNaN(parsed) ? null : parsed;
};

const parseMeasurement = (measurement: string | undefined | null): number | null => {
  if (!measurement) return null;
  const repsMatch = measurement.match(/(\d+)\s*x\s*(\d+)/);
  if (repsMatch) return parseInt(repsMatch[2]);
  const match = measurement.match(/(\d+\.?\d*)/);
  if (match) return parseFloat(match[1]);
  return null;
};

interface AthleteData {
  height?: string | null;
  weight?: string | null;
  forty_yard?: string | null;
  vertical?: string | null;
  bench_press?: string | null;
  squat?: string | null;
  arm_length?: string | null;
  position?: string | null;
  positions?: string[] | null;
}

interface AthletePerformanceRadarProps {
  athlete: AthleteData;
  style?: ViewStyle;
}

const parsePositions = (position: string | null | undefined, positions: string[] | null | undefined): string[] => {
  const allPositions: string[] = [];
  if (positions && Array.isArray(positions) && positions.length > 0) allPositions.push(...positions);
  if (position) {
    const parsed = position
      .split(/[,\/]|\s+and\s+|\s*&\s*/i)
      .map((p) => p.trim())
      .filter((p) => p.length > 0);
    parsed.forEach((p) => {
      if (!allPositions.some((existing) => existing.toLowerCase() === p.toLowerCase())) {
        allPositions.push(p);
      }
    });
  }
  return allPositions;
};

// ---------- Radar chart rendered with react-native-svg ----------
// Math: N axes evenly spaced starting at the top (-90°). For each axis i:
//   angle_i = -Math.PI/2 + i * (2*Math.PI / N)
//   point = (cx + r * cos(angle), cy + r * sin(angle))
// Levels: 5 concentric polygons at 20/40/60/80/100% of outerRadius.

type ChartDatum = {
  attribute: string;
  athlete: number;
  elite: number;
  rawValue: string;
  benchmark: string;
  metric: string;
  hasData: boolean;
  lowerIsBetter: boolean;
};

interface RadarChartSvgProps {
  data: ChartDatum[];
  size: number;
}

const RadarChartSvg: React.FC<RadarChartSvgProps> = ({ data, size }) => {
  const cx = size / 2;
  const cy = size / 2;
  // Lovable uses outerRadius="70%" of the chart container. Leave room for labels.
  const outerRadius = (size / 2) * 0.7;
  const N = data.length;
  const levels = 5; // ticks: 20, 40, 60, 80, 100

  const angleFor = (i: number) => -Math.PI / 2 + (i * 2 * Math.PI) / N;

  const pointFor = (i: number, valuePct: number) => {
    const r = (outerRadius * valuePct) / 100;
    const a = angleFor(i);
    return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
  };

  // Grid polygon points (hex outline) at a given level percentage
  const gridPolygonPoints = (levelPct: number) =>
    data
      .map((_, i) => {
        const p = pointFor(i, levelPct);
        return `${p.x},${p.y}`;
      })
      .join(' ');

  // Athlete polygon (primary)
  const athletePoints = data
    .map((d, i) => {
      const p = pointFor(i, d.athlete);
      return `${p.x},${p.y}`;
    })
    .join(' ');

  // Elite polygon (always 100)
  const elitePoints = data
    .map((_, i) => {
      const p = pointFor(i, 100);
      return `${p.x},${p.y}`;
    })
    .join(' ');

  const gridStroke = colors.border;

  return (
    <Svg width={size} height={size}>
      {/* Concentric grid polygons (PolarGrid) */}
      {Array.from({ length: levels }).map((_, level) => {
        const pct = ((level + 1) / levels) * 100;
        return (
          <Polygon
            key={`grid-${level}`}
            points={gridPolygonPoints(pct)}
            fill="none"
            stroke={gridStroke}
            strokeOpacity={0.5}
            strokeWidth={1}
          />
        );
      })}

      {/* Radial spokes from center to each axis endpoint */}
      {data.map((_, i) => {
        const outer = pointFor(i, 100);
        return (
          <Line
            key={`spoke-${i}`}
            x1={cx}
            y1={cy}
            x2={outer.x}
            y2={outer.y}
            stroke={gridStroke}
            strokeOpacity={0.5}
            strokeWidth={1}
          />
        );
      })}

      {/* Elite ring (PolarRadiusAxis "Elite 100th %ile") — dashed muted */}
      <Polygon
        points={elitePoints}
        fill={colors.mutedForeground}
        fillOpacity={0.1}
        stroke={colors.mutedForeground}
        strokeOpacity={0.8}
        strokeWidth={1}
        strokeDasharray="4,4"
      />

      {/* Athlete polygon */}
      <Polygon
        points={athletePoints}
        fill={colors.primary}
        fillOpacity={0.3}
        stroke={colors.primary}
        strokeWidth={2}
      />

      {/* Athlete dots (dot={{ r:4 }}) */}
      {data.map((d, i) => {
        const p = pointFor(i, d.athlete);
        return (
          <Circle
            key={`dot-${i}`}
            cx={p.x}
            cy={p.y}
            r={4}
            fill={colors.primary}
          />
        );
      })}

      {/* Axis labels (PolarAngleAxis dataKey="attribute") */}
      {data.map((d, i) => {
        const labelRadius = outerRadius + 16;
        const a = angleFor(i);
        const x = cx + labelRadius * Math.cos(a);
        const y = cy + labelRadius * Math.sin(a);
        // Approximate textAnchor based on angle
        let anchor: 'start' | 'middle' | 'end' = 'middle';
        const cosA = Math.cos(a);
        if (cosA > 0.2) anchor = 'start';
        else if (cosA < -0.2) anchor = 'end';
        return (
          <SvgText
            key={`label-${i}`}
            x={x}
            y={y}
            fill={colors.mutedForeground}
            fontSize={11}
            fontWeight="500"
            textAnchor={anchor}
            alignmentBaseline="middle"
          >
            {d.attribute}
          </SvgText>
        );
      })}

      {/* Radius axis tick labels (PolarRadiusAxis angle={30}, tickCount=5) */}
      {Array.from({ length: levels }).map((_, level) => {
        const pct = ((level + 1) / levels) * 100;
        const r = (outerRadius * pct) / 100;
        // Place labels along a 30° axis (Lovable uses angle={30})
        const a = (30 * Math.PI) / 180 - Math.PI / 2; // 30° measured from the top axis
        const x = cx + r * Math.cos(a);
        const y = cy + r * Math.sin(a);
        return (
          <SvgText
            key={`tick-${level}`}
            x={x}
            y={y}
            fill={colors.mutedForeground}
            fontSize={9}
            textAnchor="middle"
            alignmentBaseline="middle"
          >
            {Math.round(pct)}
          </SvgText>
        );
      })}
    </Svg>
  );
};

// ---------- Rating icon helper ----------
const RatingIcon: React.FC<{ icon: 'up' | 'down' | 'neutral'; color: string; size?: number }> = ({
  icon,
  color,
  size = 16,
}) => {
  if (icon === 'up') return <TrendingUp size={size} color={color} />;
  if (icon === 'down') return <TrendingDown size={size} color={color} />;
  return <Minus size={size} color={color} />;
};

// ---------- Main component ----------
export function AthletePerformanceRadar({ athlete, style }: AthletePerformanceRadarProps) {
  const athletePositions = useMemo(
    () => parsePositions(athlete.position, athlete.positions),
    [athlete.position, athlete.positions],
  );

  const positionCategories = useMemo(() => {
    const categories = athletePositions.map((pos) => ({
      position: pos,
      category: getPositionCategory(pos),
    }));
    if (categories.length === 0) return [{ position: 'Athlete', category: 'athlete' as PositionCategory }];
    return categories;
  }, [athletePositions]);

  const primaryCategory = positionCategories[0]?.category || 'athlete';
  const benchmarks = POSITION_BENCHMARKS[primaryCategory];

  const chartData: ChartDatum[] = useMemo(() => {
    const height = parseHeight(athlete.height);
    const weight = parseWeight(athlete.weight);
    const fortyYard = parseTime(athlete.forty_yard);
    const vertical = parseMeasurement(athlete.vertical);
    const benchPress = parseMeasurement(athlete.bench_press);
    const squat = parseMeasurement(athlete.squat);
    const armLength = parseMeasurement(athlete.arm_length);

    return [
      {
        attribute: 'Speed',
        athlete: calculatePercentile(fortyYard, benchmarks.fortyYard, true),
        elite: 100,
        rawValue: fortyYard ? `${fortyYard}s` : 'N/A',
        benchmark: `${benchmarks.fortyYard}s`,
        metric: '40-Yard Dash',
        hasData: fortyYard !== null,
        lowerIsBetter: true,
      },
      {
        attribute: 'Explosiveness',
        athlete: calculatePercentile(vertical, benchmarks.vertical),
        elite: 100,
        rawValue: vertical ? `${vertical}"` : 'N/A',
        benchmark: `${benchmarks.vertical}"`,
        metric: 'Vertical Jump',
        hasData: vertical !== null,
        lowerIsBetter: false,
      },
      {
        attribute: 'Upper Body',
        athlete: calculatePercentile(benchPress, benchmarks.benchPress),
        elite: 100,
        rawValue: benchPress ? `${benchPress} reps` : 'N/A',
        benchmark: `${benchmarks.benchPress} reps`,
        metric: 'Bench Press (185 lbs)',
        hasData: benchPress !== null,
        lowerIsBetter: false,
      },
      {
        attribute: 'Lower Body',
        athlete: calculatePercentile(squat, benchmarks.squat),
        elite: 100,
        rawValue: squat ? `${squat} lbs` : 'N/A',
        benchmark: `${benchmarks.squat} lbs`,
        metric: 'Squat Max',
        hasData: squat !== null,
        lowerIsBetter: false,
      },
      {
        attribute: 'Size',
        athlete: calculatePercentile(weight, benchmarks.weight),
        elite: 100,
        rawValue: weight ? `${weight} lbs` : 'N/A',
        benchmark: `${benchmarks.weight} lbs`,
        metric: 'Weight',
        hasData: weight !== null,
        lowerIsBetter: false,
      },
      {
        attribute: 'Length',
        athlete: calculatePercentile(armLength, benchmarks.armLength),
        elite: 100,
        rawValue: armLength ? `${armLength}"` : 'N/A',
        benchmark: `${benchmarks.armLength}"`,
        metric: 'Arm Length',
        hasData: armLength !== null,
        lowerIsBetter: false,
      },
    ];
  }, [athlete, benchmarks]);

  // Animation: start at zero, then tween to real values over ~600ms
  const [animatedData, setAnimatedData] = useState<ChartDatum[]>(() =>
    chartData.map((item) => ({ ...item, athlete: 0 })),
  );

  useEffect(() => {
    const zeroData = chartData.map((item) => ({ ...item, athlete: 0 }));
    setAnimatedData(zeroData);
    const start = Date.now();
    const duration = 600;
    let raf: any;
    const tick = () => {
      const t = Math.min(1, (Date.now() - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3); // ease-out cubic
      setAnimatedData(chartData.map((item) => ({ ...item, athlete: item.athlete * eased })));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    const initTimer = setTimeout(() => {
      raf = requestAnimationFrame(tick);
    }, 100);
    return () => {
      clearTimeout(initTimer);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [chartData, primaryCategory]);

  const dataWithValues = chartData.filter((d) => d.hasData);
  const hasAnyData = dataWithValues.length > 0;

  if (!hasAnyData) return null;

  const overallPercentile =
    dataWithValues.length > 0
      ? Math.round(dataWithValues.reduce((sum, d) => sum + d.athlete, 0) / dataWithValues.length)
      : 0;
  const overallRating = getPerformanceRating(overallPercentile);

  const missingMetrics = chartData.filter((d) => !d.hasData).map((d) => d.metric.toLowerCase());
  const missingMetricsCount = missingMetrics.length;

  const chartSize = 320; // matches "h-[320px]" in Lovable
  const displayData = animatedData.length > 0 ? animatedData : chartData;

  return (
    <Card style={{ ...styles.cardGradient, ...((style as any) || {}) }}>
      <CardHeader style={styles.headerPad}>
        <View style={styles.headerRow}>
          <View style={styles.titleRow}>
            <Activity size={20} color={colors.primary} />
            <CardTitle style={styles.titleText}>Athletic Profile</CardTitle>
          </View>
          <View style={styles.badgesWrap}>
            {positionCategories.map((pc, idx) => (
              <Badge
                key={`${pc.position}-${idx}`}
                variant={idx === 0 ? 'default' : 'secondary'}
                style={styles.badgeSpacing}
              >
                {pc.position}
              </Badge>
            ))}
            <Badge variant="outline" style={{ ...styles.badgeSpacing, borderColor: overallRating.color }}>
              <Text style={{ color: overallRating.color, fontFamily: typography.fontFamily.bodySemiBold, fontSize: typography.fontSize.xs }}>
                {overallPercentile}% Overall
              </Text>
            </Badge>
          </View>
        </View>
      </CardHeader>

      <CardContent>
        {/* Radar chart */}
        <View style={styles.chartWrap}>
          <RadarChartSvg data={displayData} size={chartSize} />
        </View>

        {/* Legend (mirrors recharts Legend) */}
        <View style={styles.legendRow}>
          <View style={styles.legendItem}>
            <View style={[styles.legendSwatch, { backgroundColor: colors.primary }]} />
            <Text style={styles.legendText}>Athlete</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendSwatch, { backgroundColor: colors.mutedForeground, opacity: 0.5 }]} />
            <Text style={styles.legendText}>Elite (100th %ile)</Text>
          </View>
        </View>

        {/* Performance Summary grid */}
        <View style={styles.summaryDivider} />
        <View style={styles.summaryGrid}>
          {chartData.map((stat) => {
            const rating = stat.hasData ? getPerformanceRating(stat.athlete) : null;
            return (
              <View
                key={stat.attribute}
                style={[styles.summaryCell, stat.hasData ? styles.summaryCellFilled : styles.summaryCellEmpty]}
              >
                <View style={styles.summaryCellHeader}>
                  <Text style={styles.summaryAttr}>{stat.attribute}</Text>
                  {stat.hasData && rating ? (
                    <RatingIcon icon={rating.icon} color={rating.color} size={12} />
                  ) : (
                    <AlertCircle size={12} color={colors.mutedForeground} />
                  )}
                </View>
                <View style={styles.summaryValueRow}>
                  {stat.hasData ? (
                    <>
                      <Text style={styles.summaryValue}>{stat.rawValue}</Text>
                      <Text style={[styles.summaryPct, { color: rating?.color ?? colors.mutedForeground }]}>
                        {Math.round(stat.athlete)}%
                      </Text>
                    </>
                  ) : (
                    <Badge variant="outline" style={styles.naBadge}>
                      <Text style={styles.naText}>N/A</Text>
                    </Badge>
                  )}
                </View>
              </View>
            );
          })}
        </View>

        {/* Completion prompt for missing metrics */}
        {missingMetricsCount > 0 && (
          <View style={styles.completionBox}>
            <View style={styles.completionIconWrap}>
              <Sparkles size={16} color={colors.primary} />
            </View>
            <View style={styles.completionTextWrap}>
              <Text style={styles.completionTitle}>Complete Your Athletic Profile</Text>
              <Text style={styles.completionBody}>
                You have {missingMetricsCount} missing metric{missingMetricsCount > 1 ? 's' : ''}. Add your{' '}
                {missingMetrics.slice(0, 2).join(' and ')}
                {missingMetrics.length > 2 ? ` and ${missingMetrics.length - 2} more` : ''} to give coaches a complete
                picture of your abilities and stand out in their searches.
              </Text>
            </View>
          </View>
        )}

        {positionCategories.length > 1 && (
          <Text style={styles.footnote}>
            Multi-position athlete: benchmarks based on primary position ({positionCategories[0].position}).
          </Text>
        )}
        <Text style={styles.footnote}>
          Benchmarks based on {benchmarks.label.toLowerCase()} D1 prospect standards. Hover over chart for details.
        </Text>
      </CardContent>
    </Card>
  );
}

export default AthletePerformanceRadar;

// ---------- Styles ----------
const styles = StyleSheet.create({
  cardGradient: {
    backgroundColor: colors.cardHigh,
    borderColor: colors.border,
  },
  headerPad: {
    paddingBottom: spacing.sm,
  },
  headerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  titleText: {
    fontSize: typography.fontSize.lg,
    fontFamily: typography.fontFamily.bodySemiBold,
    color: colors.foreground,
  },
  badgesWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.xs,
  },
  badgeSpacing: {
    marginLeft: 4,
  },
  chartWrap: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.md,
    paddingTop: spacing.md,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendSwatch: {
    width: 10,
    height: 10,
    borderRadius: 2,
  },
  legendText: {
    fontSize: typography.fontSize.xs,
    color: colors.mutedForeground,
    fontFamily: typography.fontFamily.body,
  },
  summaryDivider: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    opacity: 0.5,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  summaryCell: {
    flexBasis: '48%',
    flexGrow: 1,
    borderRadius: radius.md,
    padding: spacing.sm,
  },
  summaryCellFilled: {
    backgroundColor: colors.secondary,
    opacity: 0.95,
  },
  summaryCellEmpty: {
    backgroundColor: colors.muted,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.border,
  },
  summaryCellHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  summaryAttr: {
    fontSize: typography.fontSize.xs,
    color: colors.mutedForeground,
    fontFamily: typography.fontFamily.body,
  },
  summaryValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.sm,
  },
  summaryValue: {
    fontSize: typography.fontSize.sm,
    color: colors.foreground,
    fontFamily: typography.fontFamily.bodySemiBold,
  },
  summaryPct: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.body,
  },
  naBadge: {
    borderColor: colors.mutedForeground,
    opacity: 0.7,
  },
  naText: {
    color: colors.mutedForeground,
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.body,
  },
  completionBox: {
    marginTop: spacing.md,
    padding: spacing.sm,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: colors.cardHigh,
  },
  completionIconWrap: {
    padding: 6,
    borderRadius: 999,
    backgroundColor: colors.cardLow,
  },
  completionTextWrap: {
    flex: 1,
  },
  completionTitle: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.bodySemiBold,
    color: colors.foreground,
    marginBottom: 2,
  },
  completionBody: {
    fontSize: typography.fontSize.xs,
    color: colors.mutedForeground,
    fontFamily: typography.fontFamily.body,
    lineHeight: 16,
  },
  footnote: {
    marginTop: spacing.sm,
    textAlign: 'center',
    fontSize: typography.fontSize.xs,
    color: colors.mutedForeground,
    fontFamily: typography.fontFamily.body,
  },
});
