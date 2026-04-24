// AdminSessionAnalytics — verbatim port from Lovable web (recharts → react-native-svg).
// Source: offerhound-repo/src/components/AdminSessionAnalytics.tsx
//
// Web→RN substitutions:
//   - <div> + Tailwind utilities          → <View> + RN StyleSheet
//   - recharts (Bar/Pie/Area)             → react-native-svg primitives (matches AdminAnalyticsDashboard pattern)
//   - shadcn <Table>                       → View-based row layout with borders
//   - lucide-react                         → lucide-react-native
//   - hsl(var(--primary)) etc.             → resolved hex from @/lib/theme
//
// Behavior, data fetching, derived data, copy, and ordering preserved verbatim.
import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import Svg, {
  Rect,
  Path,
  G,
  Text as SvgText,
  Line as SvgLine,
  Defs,
  LinearGradient,
  Stop,
} from 'react-native-svg';
import { supabase } from '@/integrations/supabase/client';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/Card';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/Tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import {
  Users,
  Eye,
  MousePointer,
  FileText,
  AlertTriangle,
  Calendar,
  Clock,
  Map,
  Activity,
  TrendingUp,
  Navigation,
} from 'lucide-react-native';
import { format, subDays, formatDistanceToNow } from 'date-fns';
import { colors, typography, spacing, radius } from '@/lib/theme';

interface SessionEvent {
  id: string;
  user_id: string | null;
  session_id: string;
  event_type: string;
  event_name: string;
  page_path: string | null;
  metadata: Record<string, any> | null;
  created_at: string;
}

interface SessionStats {
  totalSessions: number;
  totalPageViews: number;
  totalClicks: number;
  totalFormSubmits: number;
  totalErrors: number;
  uniqueUsers: number;
}

interface PageViewData {
  page: string;
  views: number;
}

interface FeatureUsageData {
  feature: string;
  usage: number;
}

interface HourlyData {
  hour: string;
  count: number;
}

const COLORS = [
  colors.primary,    // hsl(var(--primary))
  '#22c55e',         // chart-2
  '#0ea5e9',         // chart-3
  '#f97316',         // chart-4
  '#a855f7',         // chart-5
  '#8B5CF6',
  '#EC4899',
  '#14B8A6',
  '#F59E0B',
  '#6366F1',
];

// Human-readable labels for event types (verbatim from Lovable)
const EVENT_TYPE_LABELS: Record<string, string> = {
  page_view: 'Page View',
  click: 'Click',
  form_submit: 'Form Submit',
  feature: 'Feature Usage',
  session: 'Session',
  error: 'Error',
  navigation: 'Navigation',
  scroll: 'Scroll',
  hover: 'Hover',
  custom: 'Custom Event',
};

const formatEventType = (eventType: string): string => {
  return (
    EVENT_TYPE_LABELS[eventType] ||
    eventType
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  );
};

// ---------- Chart primitives (react-native-svg) ----------
const CHART_W = 320;
const CHART_H = 300;
const ACTIVITY_H = 400;
const PAD = { top: 16, right: 16, bottom: 32, left: 36 };

function BarChartHorizontalSvg({ data }: { data: PageViewData[] }) {
  const w = CHART_W;
  const h = CHART_H;
  const labelW = 100;
  const innerW = w - PAD.left - PAD.right - labelW;
  const innerH = h - PAD.top - PAD.bottom;
  if (data.length === 0) return <Svg width={w} height={h} />;
  const max = Math.max(1, ...data.map((d) => d.views));
  const rowH = innerH / data.length;
  const barH = rowH * 0.7;
  return (
    <Svg width={w} height={h}>
      {data.map((d, i) => {
        const y = PAD.top + i * rowH + (rowH - barH) / 2;
        const barW = (d.views / max) * innerW;
        return (
          <G key={i}>
            <SvgText
              x={PAD.left + labelW - 6}
              y={y + barH / 2 + 4}
              fontSize={11}
              fill={colors.foreground}
              textAnchor="end"
            >
              {d.page}
            </SvgText>
            <Rect
              x={PAD.left + labelW}
              y={y}
              width={barW}
              height={barH}
              fill={colors.primary}
              rx={4}
              ry={4}
            />
            <SvgText
              x={PAD.left + labelW + barW + 4}
              y={y + barH / 2 + 4}
              fontSize={10}
              fill={colors.mutedForeground}
            >
              {d.views}
            </SvgText>
          </G>
        );
      })}
    </Svg>
  );
}

function PieChartSvg({ data }: { data: { type: string; count: number }[] }) {
  const w = CHART_W;
  const h = CHART_H;
  const cx = w / 2;
  const cy = h / 2;
  const r = Math.min(w, h) / 2 - 50;
  const total = data.reduce((s, d) => s + d.count, 0) || 1;
  let acc = 0;
  const arcPath = (start: number, end: number) => {
    const startAngle = (start / total) * Math.PI * 2 - Math.PI / 2;
    const endAngle = (end / total) * Math.PI * 2 - Math.PI / 2;
    const x1 = cx + r * Math.cos(startAngle);
    const y1 = cy + r * Math.sin(startAngle);
    const x2 = cx + r * Math.cos(endAngle);
    const y2 = cy + r * Math.sin(endAngle);
    const large = end - start > total / 2 ? 1 : 0;
    return `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`;
  };
  return (
    <Svg width={w} height={h}>
      {data.map((d, i) => {
        const start = acc;
        acc += d.count;
        const end = acc;
        const pct = ((d.count / total) * 100).toFixed(0);
        const midAngle = ((start + end) / 2 / total) * Math.PI * 2 - Math.PI / 2;
        const lx = cx + (r + 14) * Math.cos(midAngle);
        const ly = cy + (r + 14) * Math.sin(midAngle);
        return (
          <G key={i}>
            <Path d={arcPath(start, end)} fill={COLORS[i % COLORS.length]} />
            <SvgText
              x={lx}
              y={ly}
              fontSize={10}
              fill={colors.foreground}
              textAnchor={lx >= cx ? 'start' : 'end'}
            >
              {`${d.type}: ${pct}%`}
            </SvgText>
          </G>
        );
      })}
    </Svg>
  );
}

function AreaChartSvg({ data }: { data: HourlyData[] }) {
  const w = CHART_W;
  const h = ACTIVITY_H;
  const innerW = w - PAD.left - PAD.right;
  const innerH = h - PAD.top - PAD.bottom;
  if (data.length === 0) return <Svg width={w} height={h} />;
  const max = Math.max(1, ...data.map((d) => d.count));
  const stepX = data.length > 1 ? innerW / (data.length - 1) : innerW;
  const points = data.map((d, i) => ({
    x: PAD.left + i * stepX,
    y: PAD.top + innerH - (d.count / max) * innerH,
  }));
  const linePath = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
    .join(' ');
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${PAD.top + innerH} L ${points[0].x} ${PAD.top + innerH} Z`;
  const yTicks = 4;
  return (
    <Svg width={w} height={h}>
      <Defs>
        <LinearGradient id="hourlyGradient" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="5%" stopColor={colors.primary} stopOpacity={0.3} />
          <Stop offset="95%" stopColor={colors.primary} stopOpacity={0} />
        </LinearGradient>
      </Defs>
      {Array.from({ length: yTicks + 1 }).map((_, i) => {
        const y = PAD.top + (innerH / yTicks) * i;
        return (
          <SvgLine
            key={i}
            x1={PAD.left}
            y1={y}
            x2={PAD.left + innerW}
            y2={y}
            stroke={colors.muted}
            strokeDasharray="3 3"
          />
        );
      })}
      {Array.from({ length: yTicks + 1 }).map((_, i) => {
        const v = max - (max / yTicks) * i;
        const y = PAD.top + (innerH / yTicks) * i;
        return (
          <SvgText
            key={i}
            x={PAD.left - 6}
            y={y + 4}
            fontSize={10}
            fill={colors.mutedForeground}
            textAnchor="end"
          >
            {Math.round(v)}
          </SvgText>
        );
      })}
      {data.map((d, i) => {
        if (
          data.length > 8 &&
          i % Math.ceil(data.length / 6) !== 0 &&
          i !== data.length - 1
        )
          return null;
        const x = PAD.left + i * stepX;
        return (
          <SvgText
            key={i}
            x={x}
            y={PAD.top + innerH + 14}
            fontSize={10}
            fill={colors.mutedForeground}
            textAnchor="middle"
          >
            {d.hour}
          </SvgText>
        );
      })}
      <Path d={areaPath} fill="url(#hourlyGradient)" />
      <Path d={linePath} stroke={colors.primary} strokeWidth={2} fill="none" />
    </Svg>
  );
}

// ---------- Stat card helper ----------
function StatCard({
  icon: Icon,
  value,
  label,
  accent,
}: {
  icon: any;
  value: number | string;
  label: string;
  accent: string;
}) {
  return (
    <Card style={{ borderColor: accent + '33', backgroundColor: accent + '1a' }}>
      <CardContent style={{ padding: spacing.md }}>
        <View style={st.statRow}>
          <View style={[st.iconWrap, { backgroundColor: accent + '33' }]}>
            <Icon size={20} color={accent} />
          </View>
          <View>
            <Text style={st.statValue}>{String(value)}</Text>
            <Text style={st.statLabel}>{label}</Text>
          </View>
        </View>
      </CardContent>
    </Card>
  );
}

export function AdminSessionAnalytics() {
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('7');
  const [events, setEvents] = useState<SessionEvent[]>([]);
  const [tab, setTab] = useState('pages');
  const [stats, setStats] = useState<SessionStats>({
    totalSessions: 0,
    totalPageViews: 0,
    totalClicks: 0,
    totalFormSubmits: 0,
    totalErrors: 0,
    uniqueUsers: 0,
  });

  useEffect(() => {
    fetchSessionData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateRange]);

  const fetchSessionData = async () => {
    setLoading(true);
    const days = parseInt(dateRange);
    const startDate = subDays(new Date(), days);

    try {
      const { data, error } = await (supabase as any)
        .from('session_events')
        .select('*')
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false })
        .limit(1000);

      if (error) throw error;

      const typedData = (data || []) as SessionEvent[];
      setEvents(typedData);

      // Calculate stats
      const sessionIds = new Set(typedData.map((e) => e.session_id));
      const userIds = new Set(
        typedData.filter((e) => e.user_id).map((e) => e.user_id),
      );

      setStats({
        totalSessions: sessionIds.size,
        totalPageViews: typedData.filter((e) => e.event_type === 'page_view').length,
        totalClicks: typedData.filter((e) => e.event_type === 'click').length,
        totalFormSubmits: typedData.filter((e) => e.event_type === 'form_submit').length,
        totalErrors: typedData.filter((e) => e.event_type === 'error').length,
        uniqueUsers: userIds.size,
      });
    } catch (error) {
      console.error('Error fetching session data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Process page view data
  const pageViewData = useMemo<PageViewData[]>(() => {
    const pageViews = events.filter((e) => e.event_type === 'page_view');
    const pageCounts: Record<string, number> = {};

    pageViews.forEach((e) => {
      const page = e.event_name || 'Unknown';
      pageCounts[page] = (pageCounts[page] || 0) + 1;
    });

    return Object.entries(pageCounts)
      .map(([page, views]) => ({ page, views }))
      .sort((a, b) => b.views - a.views)
      .slice(0, 10);
  }, [events]);

  // Process feature usage data
  const featureUsageData = useMemo<FeatureUsageData[]>(() => {
    const features = events.filter((e) => e.event_type === 'feature');
    const featureCounts: Record<string, number> = {};

    features.forEach((e) => {
      const feature = e.event_name || 'Unknown';
      featureCounts[feature] = (featureCounts[feature] || 0) + 1;
    });

    return Object.entries(featureCounts)
      .map(([feature, usage]) => ({ feature, usage }))
      .sort((a, b) => b.usage - a.usage)
      .slice(0, 10);
  }, [events]);

  // Process hourly activity
  const hourlyData = useMemo<HourlyData[]>(() => {
    const hourCounts: Record<number, number> = {};

    // Initialize all hours
    for (let i = 0; i < 24; i++) {
      hourCounts[i] = 0;
    }

    events.forEach((e) => {
      const hour = new Date(e.created_at).getHours();
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    });

    return Object.entries(hourCounts)
      .map(([hour, count]) => ({
        hour: `${hour.toString().padStart(2, '0')}:00`,
        count,
      }))
      .sort((a, b) => parseInt(a.hour) - parseInt(b.hour));
  }, [events]);

  // Process event type distribution with human-readable labels
  const eventTypeData = useMemo(() => {
    const typeCounts: Record<string, number> = {};

    events.forEach((e) => {
      const label = formatEventType(e.event_type);
      typeCounts[label] = (typeCounts[label] || 0) + 1;
    });

    return Object.entries(typeCounts)
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count);
  }, [events]);

  // Recent events
  const recentEvents = useMemo(() => {
    return events.slice(0, 20);
  }, [events]);

  // User journey analysis
  const userJourneys = useMemo(() => {
    const journeys: Record<string, string[]> = {};

    events
      .filter((e) => e.event_type === 'page_view')
      .forEach((e) => {
        const existing = journeys[e.session_id] || [];
        existing.push(e.event_name);
        journeys[e.session_id] = existing;
      });

    // Get common paths
    const pathCounts: Record<string, number> = {};
    Object.values(journeys).forEach((pages) => {
      if (pages.length >= 2) {
        for (let i = 0; i < pages.length - 1; i++) {
          const path = `${pages[i]} → ${pages[i + 1]}`;
          pathCounts[path] = (pathCounts[path] || 0) + 1;
        }
      }
    });

    return Object.entries(pathCounts)
      .map(([path, count]) => ({ path, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [events]);

  if (loading) {
    return (
      <View style={st.loadingWrap}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={st.root}>
      {/* Header */}
      <View style={st.headerRow}>
        <View style={{ flex: 1 }}>
          <View style={st.titleRow}>
            <Navigation size={22} color={colors.primary} />
            <Text style={st.title}>Session Analytics</Text>
          </View>
          <Text style={st.subtitle}>Track user navigation and feature usage</Text>
        </View>
        <View style={{ width: 180 }}>
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger>
              <View style={st.selectIconRow}>
                <Calendar size={14} color={colors.foreground} />
                <SelectValue placeholder="Select range" />
              </View>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">Last 24 hours</SelectItem>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="14">Last 14 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
            </SelectContent>
          </Select>
        </View>
      </View>

      {/* Stats Cards */}
      <View style={st.statGrid}>
        <View style={st.statCell}>
          <StatCard icon={Activity} value={stats.totalSessions} label="Sessions" accent="#3b82f6" />
        </View>
        <View style={st.statCell}>
          <StatCard icon={Eye} value={stats.totalPageViews} label="Page Views" accent="#22c55e" />
        </View>
        <View style={st.statCell}>
          <StatCard icon={Users} value={stats.uniqueUsers} label="Unique Users" accent="#f59e0b" />
        </View>
        <View style={st.statCell}>
          <StatCard icon={MousePointer} value={stats.totalClicks} label="Clicks" accent="#a855f7" />
        </View>
        <View style={st.statCell}>
          <StatCard icon={FileText} value={stats.totalFormSubmits} label="Form Submits" accent="#06b6d4" />
        </View>
        <View style={st.statCell}>
          <StatCard icon={AlertTriangle} value={stats.totalErrors} label="Errors" accent="#f43f5e" />
        </View>
      </View>

      {/* Charts */}
      <Tabs value={tab} onValueChange={setTab}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 4 }}>
          <TabsList>
            <TabsTrigger value="pages">
              <View style={st.tabInner}>
                <Eye size={14} color={colors.foreground} />
                <Text style={st.tabLabel}>Pages</Text>
              </View>
            </TabsTrigger>
            <TabsTrigger value="activity">
              <View style={st.tabInner}>
                <Clock size={14} color={colors.foreground} />
                <Text style={st.tabLabel}>Activity</Text>
              </View>
            </TabsTrigger>
            <TabsTrigger value="journeys">
              <View style={st.tabInner}>
                <Map size={14} color={colors.foreground} />
                <Text style={st.tabLabel}>Journeys</Text>
              </View>
            </TabsTrigger>
            <TabsTrigger value="events">
              <View style={st.tabInner}>
                <Activity size={14} color={colors.foreground} />
                <Text style={st.tabLabel}>Events</Text>
              </View>
            </TabsTrigger>
          </TabsList>
        </ScrollView>

        {/* Top Pages */}
        <TabsContent value="pages">
          <View style={st.chartsGrid}>
            <Card>
              <CardHeader>
                <View style={st.cardTitleRow}>
                  <TrendingUp size={18} color={colors.primary} />
                  <CardTitle>Most Visited Pages</CardTitle>
                </View>
                <CardDescription>Pages with the highest view counts</CardDescription>
              </CardHeader>
              <CardContent>
                {pageViewData.length > 0 ? (
                  <View style={{ height: CHART_H, alignItems: 'center' }}>
                    <BarChartHorizontalSvg data={pageViewData} />
                  </View>
                ) : (
                  <Text style={st.emptyText}>No page view data available</Text>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <View style={st.cardTitleRow}>
                  <Activity size={18} color={colors.primary} />
                  <CardTitle>Event Type Distribution</CardTitle>
                </View>
                <CardDescription>Breakdown of tracked event types</CardDescription>
              </CardHeader>
              <CardContent>
                {eventTypeData.length > 0 ? (
                  <View style={{ height: CHART_H, alignItems: 'center' }}>
                    <PieChartSvg data={eventTypeData} />
                  </View>
                ) : (
                  <Text style={st.emptyText}>No event data available</Text>
                )}
              </CardContent>
            </Card>
          </View>
        </TabsContent>

        {/* Activity by Hour */}
        <TabsContent value="activity">
          <Card>
            <CardHeader>
              <View style={st.cardTitleRow}>
                <Clock size={18} color={colors.primary} />
                <CardTitle>Activity by Hour of Day</CardTitle>
              </View>
              <CardDescription>When users are most active</CardDescription>
            </CardHeader>
            <CardContent>
              <View style={{ height: ACTIVITY_H, alignItems: 'center' }}>
                <AreaChartSvg data={hourlyData} />
              </View>
            </CardContent>
          </Card>
        </TabsContent>

        {/* User Journeys */}
        <TabsContent value="journeys">
          <Card>
            <CardHeader>
              <View style={st.cardTitleRow}>
                <Map size={18} color={colors.primary} />
                <CardTitle>Common Navigation Paths</CardTitle>
              </View>
              <CardDescription>Most frequent page-to-page transitions</CardDescription>
            </CardHeader>
            <CardContent>
              {userJourneys.length > 0 ? (
                <View>
                  <View style={st.tableHeader}>
                    <Text style={[st.th, { flex: 1 }]}>Navigation Path</Text>
                    <Text style={[st.th, { textAlign: 'right', width: 80 }]}>Count</Text>
                  </View>
                  {userJourneys.map((journey, index) => (
                    <View key={index} style={st.tableRow}>
                      <View style={[st.tdFlex, { flex: 1 }]}>
                        <View
                          style={[
                            st.dot,
                            { backgroundColor: COLORS[index % COLORS.length] },
                          ]}
                        />
                        <Text style={st.tdText} numberOfLines={1}>
                          {journey.path}
                        </Text>
                      </View>
                      <View style={{ width: 80, alignItems: 'flex-end' }}>
                        <Badge variant="secondary">{String(journey.count)}</Badge>
                      </View>
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={st.emptyText}>
                  Not enough navigation data to show common paths
                </Text>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Recent Events */}
        <TabsContent value="events">
          <Card>
            <CardHeader>
              <View style={st.cardTitleRow}>
                <Activity size={18} color={colors.primary} />
                <CardTitle>Recent Events</CardTitle>
              </View>
              <CardDescription>Latest tracked user interactions</CardDescription>
            </CardHeader>
            <CardContent>
              {recentEvents.length > 0 ? (
                <ScrollView horizontal showsHorizontalScrollIndicator>
                  <View>
                    <View style={st.tableHeader}>
                      <Text style={[st.th, { width: 140 }]}>Event</Text>
                      <Text style={[st.th, { width: 110 }]}>Type</Text>
                      <Text style={[st.th, { width: 140 }]}>Page</Text>
                      <Text style={[st.th, { width: 100 }]}>User</Text>
                      <Text style={[st.th, { width: 120, textAlign: 'right' }]}>
                        Time
                      </Text>
                    </View>
                    {recentEvents.map((event) => (
                      <View key={event.id} style={st.tableRow}>
                        <Text style={[st.tdText, { width: 140 }]} numberOfLines={1}>
                          {event.event_name}
                        </Text>
                        <View style={{ width: 110 }}>
                          <Badge
                            variant={
                              event.event_type === 'error'
                                ? 'destructive'
                                : event.event_type === 'page_view'
                                  ? 'default'
                                  : 'secondary'
                            }
                          >
                            {event.event_type}
                          </Badge>
                        </View>
                        <Text
                          style={[st.tdMuted, { width: 140 }]}
                          numberOfLines={1}
                        >
                          {event.page_path || '—'}
                        </Text>
                        <Text
                          style={[st.tdMuted, { width: 100 }]}
                          numberOfLines={1}
                        >
                          {event.user_id ? 'Logged in' : 'Anonymous'}
                        </Text>
                        <Text
                          style={[
                            st.tdMuted,
                            { width: 120, textAlign: 'right' },
                          ]}
                          numberOfLines={1}
                        >
                          {formatDistanceToNow(new Date(event.created_at), {
                            addSuffix: true,
                          })}
                        </Text>
                      </View>
                    ))}
                  </View>
                </ScrollView>
              ) : (
                <Text style={st.emptyText}>No events recorded yet</Text>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </ScrollView>
  );
}

export default AdminSessionAnalytics;

const st = StyleSheet.create({
  root: {
    padding: spacing.md,
    gap: spacing.lg,
  },
  loadingWrap: {
    paddingVertical: 64,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  title: {
    fontFamily: typography.fontFamily.bodyBold,
    fontSize: typography.fontSize['2xl'],
    color: colors.foreground,
  },
  subtitle: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.sm,
    color: colors.mutedForeground,
    marginTop: 2,
  },
  selectIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  statGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -spacing.xs,
    marginBottom: spacing.md,
  },
  statCell: {
    width: '50%',
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xs,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  iconWrap: {
    padding: spacing.xs,
    borderRadius: radius.md,
  },
  statValue: {
    fontFamily: typography.fontFamily.bodyBold,
    fontSize: typography.fontSize['2xl'],
    color: colors.foreground,
  },
  statLabel: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.xs,
    color: colors.mutedForeground,
  },
  tabInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  tabLabel: {
    fontFamily: typography.fontFamily.bodyMedium,
    fontSize: typography.fontSize.sm,
    color: colors.foreground,
  },
  chartsGrid: {
    gap: spacing.md,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  emptyText: {
    fontFamily: typography.fontFamily.body,
    color: colors.mutedForeground,
    textAlign: 'center',
    paddingVertical: spacing.xl,
  },
  tableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingVertical: spacing.xs,
  },
  th: {
    fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: typography.fontSize.xs,
    color: colors.mutedForeground,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  tdFlex: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  tdText: {
    fontFamily: typography.fontFamily.bodyMedium,
    fontSize: typography.fontSize.sm,
    color: colors.foreground,
  },
  tdMuted: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.sm,
    color: colors.mutedForeground,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
