// AdminAnalyticsDashboard — verbatim port from Lovable web (recharts → react-native-svg).
// Source: offerhound-repo/src/components/AdminAnalyticsDashboard.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, ScrollView, ActivityIndicator, StyleSheet, ViewStyle } from 'react-native';
import Svg, { Rect, Path, Circle, G, Text as SvgText, Line as SvgLine, Defs, LinearGradient, Stop } from 'react-native-svg';
import {
  Users, TrendingUp, Eye, Mail, Globe, Activity, Calendar, FileText, UserPlus,
  MessageSquare, MousePointer, BarChart3, PieChart as PieChartIcon, LineChart as LineChartIcon,
} from 'lucide-react-native';
import { format, subDays, eachDayOfInterval } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { colors, typography, spacing, radius } from '@/lib/theme';

interface AnalyticsData {
  dailySignups: { date: string; count: number }[];
  dailyLetters: { date: string; count: number }[];
  dailyContacts: { date: string; count: number }[];
  profilesByState: { state: string; count: number }[];
  profilesByPosition: { position: string; count: number }[];
  profilesByGradYear: { year: string; count: number }[];
  coachContactsBySchool: { school: string; count: number }[];
  lettersByType: { type: string; count: number }[];
  totalStats: {
    totalProfiles: number;
    publishedProfiles: number;
    suspendedProfiles: number;
    totalLetters: number;
    totalContacts: number;
    totalAdmins: number;
  };
}

// Lovable COLORS array — preserved verbatim, with HSL chart vars resolved to hex equivalents
// chart-2..5 are not defined in lib/theme; use sensible mapped accents that roughly match Lovable defaults.
const COLORS = [
  colors.primary,    // hsl(var(--primary))    → gold #e7af08
  '#22c55e',         // chart-2 (green)
  '#0ea5e9',         // chart-3 (sky)
  '#f97316',         // chart-4 (orange)
  '#a855f7',         // chart-5 (violet)
  '#8B5CF6',
  '#EC4899',
  '#14B8A6',
  '#F59E0B',
  '#6366F1',
];

const CHART_2 = '#22c55e';

// ---------- Chart primitives (react-native-svg) ----------
const CHART_W = 320;
const CHART_H = 260;
const PAD = { top: 16, right: 16, bottom: 32, left: 36 };

interface XYPoint { x: number; y: number; label: string; }

function buildScale(values: number[], length: number) {
  const max = Math.max(1, ...values);
  return (v: number) => length - (v / max) * length;
}

function AreaChartSvg({ data, color }: { data: { date: string; count: number }[]; color: string }) {
  const w = CHART_W, h = CHART_H;
  const innerW = w - PAD.left - PAD.right;
  const innerH = h - PAD.top - PAD.bottom;
  if (data.length === 0) return <Svg width={w} height={h} />;
  const max = Math.max(1, ...data.map(d => d.count));
  const stepX = data.length > 1 ? innerW / (data.length - 1) : innerW;
  const points = data.map((d, i) => ({
    x: PAD.left + i * stepX,
    y: PAD.top + innerH - (d.count / max) * innerH,
  }));
  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${PAD.top + innerH} L ${points[0].x} ${PAD.top + innerH} Z`;
  const yTicks = 4;
  return (
    <Svg width={w} height={h}>
      <Defs>
        <LinearGradient id="signupGradient" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="5%" stopColor={color} stopOpacity={0.3} />
          <Stop offset="95%" stopColor={color} stopOpacity={0} />
        </LinearGradient>
      </Defs>
      {/* Cartesian grid */}
      {Array.from({ length: yTicks + 1 }).map((_, i) => {
        const y = PAD.top + (innerH / yTicks) * i;
        return <SvgLine key={i} x1={PAD.left} y1={y} x2={PAD.left + innerW} y2={y} stroke={colors.muted} strokeDasharray="3 3" />;
      })}
      {/* Y labels */}
      {Array.from({ length: yTicks + 1 }).map((_, i) => {
        const v = max - (max / yTicks) * i;
        const y = PAD.top + (innerH / yTicks) * i;
        return <SvgText key={i} x={PAD.left - 6} y={y + 4} fontSize={10} fill={colors.mutedForeground} textAnchor="end">{Math.round(v)}</SvgText>;
      })}
      {/* X labels (sparse) */}
      {data.map((d, i) => {
        if (data.length > 8 && i % Math.ceil(data.length / 6) !== 0 && i !== data.length - 1) return null;
        const x = PAD.left + i * stepX;
        return <SvgText key={i} x={x} y={PAD.top + innerH + 14} fontSize={10} fill={colors.mutedForeground} textAnchor="middle">{d.date}</SvgText>;
      })}
      <Path d={areaPath} fill="url(#signupGradient)" />
      <Path d={linePath} stroke={color} strokeWidth={2} fill="none" />
    </Svg>
  );
}

function LineChartSvg({ data, color, label }: { data: { date: string; count: number }[]; color: string; label: string }) {
  const w = CHART_W, h = CHART_H;
  const innerW = w - PAD.left - PAD.right;
  const innerH = h - PAD.top - PAD.bottom;
  if (data.length === 0) return <Svg width={w} height={h} />;
  const max = Math.max(1, ...data.map(d => d.count));
  const stepX = data.length > 1 ? innerW / (data.length - 1) : innerW;
  const linePath = data
    .map((d, i) => {
      const x = PAD.left + i * stepX;
      const y = PAD.top + innerH - (d.count / max) * innerH;
      return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
    })
    .join(' ');
  const yTicks = 4;
  return (
    <Svg width={w} height={h}>
      {Array.from({ length: yTicks + 1 }).map((_, i) => {
        const y = PAD.top + (innerH / yTicks) * i;
        return <SvgLine key={i} x1={PAD.left} y1={y} x2={PAD.left + innerW} y2={y} stroke={colors.muted} strokeDasharray="3 3" />;
      })}
      {Array.from({ length: yTicks + 1 }).map((_, i) => {
        const v = max - (max / yTicks) * i;
        const y = PAD.top + (innerH / yTicks) * i;
        return <SvgText key={i} x={PAD.left - 6} y={y + 4} fontSize={10} fill={colors.mutedForeground} textAnchor="end">{Math.round(v)}</SvgText>;
      })}
      {data.map((d, i) => {
        if (data.length > 8 && i % Math.ceil(data.length / 6) !== 0 && i !== data.length - 1) return null;
        const x = PAD.left + i * stepX;
        return <SvgText key={i} x={x} y={PAD.top + innerH + 14} fontSize={10} fill={colors.mutedForeground} textAnchor="middle">{d.date}</SvgText>;
      })}
      <Path d={linePath} stroke={color} strokeWidth={2} fill="none" />
      {/* Legend */}
      <Rect x={PAD.left} y={h - 14} width={10} height={10} fill={color} />
      <SvgText x={PAD.left + 14} y={h - 5} fontSize={10} fill={colors.foreground}>{label}</SvgText>
    </Svg>
  );
}

function BarChartVerticalSvg({ data, color }: { data: { year: string; count: number }[]; color: string }) {
  const w = CHART_W, h = CHART_H;
  const innerW = w - PAD.left - PAD.right;
  const innerH = h - PAD.top - PAD.bottom;
  if (data.length === 0) return <Svg width={w} height={h} />;
  const max = Math.max(1, ...data.map(d => d.count));
  const barW = (innerW / data.length) * 0.7;
  const gap = (innerW / data.length) * 0.3;
  const yTicks = 4;
  return (
    <Svg width={w} height={h}>
      {Array.from({ length: yTicks + 1 }).map((_, i) => {
        const y = PAD.top + (innerH / yTicks) * i;
        return <SvgLine key={i} x1={PAD.left} y1={y} x2={PAD.left + innerW} y2={y} stroke={colors.muted} strokeDasharray="3 3" />;
      })}
      {Array.from({ length: yTicks + 1 }).map((_, i) => {
        const v = max - (max / yTicks) * i;
        const y = PAD.top + (innerH / yTicks) * i;
        return <SvgText key={i} x={PAD.left - 6} y={y + 4} fontSize={10} fill={colors.mutedForeground} textAnchor="end">{Math.round(v)}</SvgText>;
      })}
      {data.map((d, i) => {
        const x = PAD.left + (gap / 2) + i * (barW + gap);
        const barH = (d.count / max) * innerH;
        const y = PAD.top + innerH - barH;
        return (
          <G key={i}>
            <Rect x={x} y={y} width={barW} height={barH} fill={color} rx={4} ry={4} />
            <SvgText x={x + barW / 2} y={PAD.top + innerH + 14} fontSize={10} fill={colors.mutedForeground} textAnchor="middle">{d.year}</SvgText>
          </G>
        );
      })}
    </Svg>
  );
}

function BarChartHorizontalSvg({ data, getColor }: { data: { state: string; count: number }[]; getColor: (entry: { state: string }, i: number) => string }) {
  const w = CHART_W, h = CHART_H;
  const labelW = 80;
  const innerW = w - PAD.left - PAD.right - labelW;
  const innerH = h - PAD.top - PAD.bottom;
  if (data.length === 0) return <Svg width={w} height={h} />;
  const max = Math.max(1, ...data.map(d => d.count));
  const rowH = innerH / data.length;
  const barH = rowH * 0.7;
  return (
    <Svg width={w} height={h}>
      {data.map((d, i) => {
        const y = PAD.top + i * rowH + (rowH - barH) / 2;
        const barW = (d.count / max) * innerW;
        return (
          <G key={i}>
            <SvgText x={PAD.left + labelW - 6} y={y + barH / 2 + 4} fontSize={10} fill={colors.foreground} textAnchor="end">{d.state}</SvgText>
            <Rect x={PAD.left + labelW} y={y} width={barW} height={barH} fill={getColor(d, i)} rx={4} ry={4} />
            <SvgText x={PAD.left + labelW + barW + 4} y={y + barH / 2 + 4} fontSize={10} fill={colors.mutedForeground}>{d.count}</SvgText>
          </G>
        );
      })}
    </Svg>
  );
}

function PieChartSvg({ data }: { data: { position: string; count: number }[] }) {
  const w = CHART_W, h = CHART_H;
  const cx = w / 2;
  const cy = h / 2;
  const r = Math.min(w, h) / 2 - 40;
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
            <SvgText x={lx} y={ly} fontSize={10} fill={colors.foreground} textAnchor={lx >= cx ? 'start' : 'end'}>
              {`${d.position}: ${pct}%`}
            </SvgText>
          </G>
        );
      })}
    </Svg>
  );
}

// ---------- Stat card ----------
function StatCard({
  icon: Icon, value, label, accent, badge,
}: { icon: any; value: number | string; label: string; accent: string; badge?: { text: string; positive: boolean } }) {
  return (
    <Card style={{ borderColor: accent + '33', backgroundColor: accent + '10' }}>
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
        {badge && (
          <View style={{ marginTop: spacing.xs }}>
            <Badge variant={badge.positive ? 'default' : 'destructive'}>
              {`${badge.positive ? '+' : ''}${badge.text}%`}
            </Badge>
          </View>
        )}
      </CardContent>
    </Card>
  );
}

export function AdminAnalyticsDashboard() {
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('30');
  const [data, setData] = useState<AnalyticsData>({
    dailySignups: [], dailyLetters: [], dailyContacts: [],
    profilesByState: [], profilesByPosition: [], profilesByGradYear: [],
    coachContactsBySchool: [], lettersByType: [],
    totalStats: { totalProfiles: 0, publishedProfiles: 0, suspendedProfiles: 0, totalLetters: 0, totalContacts: 0, totalAdmins: 0 },
  });

  useEffect(() => { fetchAnalytics(); }, [dateRange]);

  const fetchAnalytics = async () => {
    setLoading(true);
    const days = parseInt(dateRange);
    const startDate = subDays(new Date(), days);
    const dateRangeArr = eachDayOfInterval({ start: startDate, end: new Date() });

    try {
      const [
        profilesRes, publishedRes, suspendedRes, lettersRes, contactsRes, adminsRes,
        profilesWithDates, lettersWithDates, contactsWithDates,
        stateBreakdown, positionBreakdown, gradYearBreakdown,
        schoolContactBreakdown, letterTypeBreakdown,
      ] = await Promise.all([
        supabase.from('player_profiles').select('id', { count: 'exact', head: true }),
        supabase.from('player_profiles').select('id', { count: 'exact', head: true }).eq('is_published', true),
        supabase.from('player_profiles').select('id', { count: 'exact', head: true }).eq('is_suspended', true),
        supabase.from('letter_history').select('id', { count: 'exact', head: true }),
        supabase.from('contact_events').select('id', { count: 'exact', head: true }),
        supabase.from('user_roles').select('id', { count: 'exact', head: true }).eq('role', 'admin'),
        supabase.from('player_profiles').select('created_at').gte('created_at', startDate.toISOString()),
        supabase.from('letter_history').select('created_at').gte('created_at', startDate.toISOString()),
        supabase.from('contact_events').select('created_at').gte('created_at', startDate.toISOString()),
        supabase.from('player_profiles').select('state'),
        supabase.from('player_profiles').select('position'),
        supabase.from('player_profiles').select('graduation_year'),
        supabase.from('contact_events').select('school'),
        supabase.from('letter_history').select('letter_type'),
      ]);

      const signupsByDay = new Map<string, number>();
      dateRangeArr.forEach(d => signupsByDay.set(format(d, 'yyyy-MM-dd'), 0));
      profilesWithDates.data?.forEach((p: { created_at: string }) => {
        const day = format(new Date(p.created_at), 'yyyy-MM-dd');
        signupsByDay.set(day, (signupsByDay.get(day) || 0) + 1);
      });

      const lettersByDay = new Map<string, number>();
      dateRangeArr.forEach(d => lettersByDay.set(format(d, 'yyyy-MM-dd'), 0));
      lettersWithDates.data?.forEach((l: { created_at: string }) => {
        const day = format(new Date(l.created_at), 'yyyy-MM-dd');
        lettersByDay.set(day, (lettersByDay.get(day) || 0) + 1);
      });

      const contactsByDay = new Map<string, number>();
      dateRangeArr.forEach(d => contactsByDay.set(format(d, 'yyyy-MM-dd'), 0));
      contactsWithDates.data?.forEach((c: { created_at: string }) => {
        const day = format(new Date(c.created_at), 'yyyy-MM-dd');
        contactsByDay.set(day, (contactsByDay.get(day) || 0) + 1);
      });

      const stateMap = new Map<string, number>();
      stateBreakdown.data?.forEach((p: { state: string | null }) => {
        const s = p.state || 'Unknown';
        stateMap.set(s, (stateMap.get(s) || 0) + 1);
      });

      const positionMap = new Map<string, number>();
      positionBreakdown.data?.forEach((p: { position: string | null }) => {
        const pos = p.position || 'Unknown';
        positionMap.set(pos, (positionMap.get(pos) || 0) + 1);
      });

      const gradYearMap = new Map<string, number>();
      gradYearBreakdown.data?.forEach((p: { graduation_year: string | null }) => {
        const y = p.graduation_year || 'Unknown';
        gradYearMap.set(y, (gradYearMap.get(y) || 0) + 1);
      });

      const schoolMap = new Map<string, number>();
      schoolContactBreakdown.data?.forEach((c: { school: string }) => {
        schoolMap.set(c.school, (schoolMap.get(c.school) || 0) + 1);
      });

      const letterTypeMap = new Map<string, number>();
      letterTypeBreakdown.data?.forEach((l: { letter_type: string }) => {
        letterTypeMap.set(l.letter_type, (letterTypeMap.get(l.letter_type) || 0) + 1);
      });

      setData({
        dailySignups: Array.from(signupsByDay).map(([date, count]) => ({ date: format(new Date(date), 'MMM d'), count })),
        dailyLetters: Array.from(lettersByDay).map(([date, count]) => ({ date: format(new Date(date), 'MMM d'), count })),
        dailyContacts: Array.from(contactsByDay).map(([date, count]) => ({ date: format(new Date(date), 'MMM d'), count })),
        profilesByState: Array.from(stateMap).map(([state, count]) => ({ state, count })).sort((a, b) => b.count - a.count).slice(0, 10),
        profilesByPosition: Array.from(positionMap).map(([position, count]) => ({ position, count })).sort((a, b) => b.count - a.count).slice(0, 10),
        profilesByGradYear: Array.from(gradYearMap).map(([year, count]) => ({ year, count })).sort((a, b) => a.year.localeCompare(b.year)),
        coachContactsBySchool: Array.from(schoolMap).map(([school, count]) => ({ school, count })).sort((a, b) => b.count - a.count).slice(0, 10),
        lettersByType: Array.from(letterTypeMap).map(([type, count]) => ({ type, count })).sort((a, b) => b.count - a.count),
        totalStats: {
          totalProfiles: profilesRes.count || 0,
          publishedProfiles: publishedRes.count || 0,
          suspendedProfiles: suspendedRes.count || 0,
          totalLetters: lettersRes.count || 0,
          totalContacts: contactsRes.count || 0,
          totalAdmins: adminsRes.count || 0,
        },
      });
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const growthMetrics = useMemo(() => {
    const signups = data.dailySignups;
    const midpoint = Math.floor(signups.length / 2);
    const firstHalf = signups.slice(0, midpoint).reduce((sum, d) => sum + d.count, 0);
    const secondHalf = signups.slice(midpoint).reduce((sum, d) => sum + d.count, 0);
    const growth = firstHalf > 0 ? ((secondHalf - firstHalf) / firstHalf) * 100 : 0;
    return {
      totalSignups: signups.reduce((sum, d) => sum + d.count, 0),
      growthPercent: growth.toFixed(1),
      isPositive: growth >= 0,
    };
  }, [data.dailySignups]);

  if (loading) {
    return (
      <View style={st.loading}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={st.container}>
      <View style={st.headerRow}>
        <View style={{ flexShrink: 1 }}>
          <View style={st.titleRow}>
            <BarChart3 size={24} color={colors.primary} />
            <Text style={st.h2}>Analytics Dashboard</Text>
          </View>
          <Text style={st.subtle}>Track user behavior and platform metrics</Text>
        </View>
        <View style={{ width: 180 }}>
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger>
              <SelectValue placeholder="Select range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="14">Last 14 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="60">Last 60 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
        </View>
      </View>

      <View style={st.statsGrid}>
        <View style={st.statCell}><StatCard icon={Users}    value={data.totalStats.totalProfiles}    label="Total Athletes" accent="#3b82f6" /></View>
        <View style={st.statCell}><StatCard icon={Globe}    value={data.totalStats.publishedProfiles} label="Published"      accent="#22c55e" /></View>
        <View style={st.statCell}><StatCard icon={UserPlus} value={growthMetrics.totalSignups}        label="New Signups"    accent="#f59e0b" badge={{ text: growthMetrics.growthPercent, positive: growthMetrics.isPositive }} /></View>
        <View style={st.statCell}><StatCard icon={FileText} value={data.totalStats.totalLetters}     label="Letters Sent"   accent="#a855f7" /></View>
        <View style={st.statCell}><StatCard icon={Mail}     value={data.totalStats.totalContacts}    label="Coach Contacts" accent="#06b6d4" /></View>
        <View style={st.statCell}><StatCard icon={Activity} value={data.totalStats.totalAdmins}      label="Admins"         accent="#f43f5e" /></View>
      </View>

      <TabsInner data={data} />
    </ScrollView>
  );
}

function TabsInner({ data }: { data: AnalyticsData }) {
  const [tab, setTab] = useState('activity');
  return (
    <Tabs value={tab} onValueChange={setTab}>
      <TabsList>
        <TabsTrigger value="activity">Activity Trends</TabsTrigger>
        <TabsTrigger value="demographics">Demographics</TabsTrigger>
        <TabsTrigger value="engagement">Engagement</TabsTrigger>
      </TabsList>

      <TabsContent value="activity">
        <View style={st.chartsCol}>
          <Card>
            <CardHeader>
              <CardTitle>New Signups</CardTitle>
              <CardDescription>Daily athlete registrations over time</CardDescription>
            </CardHeader>
            <CardContent>
              <AreaChartSvg data={data.dailySignups} color={colors.primary} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Outreach Activity</CardTitle>
              <CardDescription>Letters sent and coach contacts over time</CardDescription>
            </CardHeader>
            <CardContent>
              <LineChartSvg data={data.dailyLetters} color={CHART_2} label="Letters" />
            </CardContent>
          </Card>
        </View>
      </TabsContent>

      <TabsContent value="demographics">
        <View style={st.chartsCol}>
          <Card>
            <CardHeader>
              <CardTitle>Athletes by Position</CardTitle>
              <CardDescription>Distribution of athlete positions</CardDescription>
            </CardHeader>
            <CardContent>
              <PieChartSvg data={data.profilesByPosition} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Athletes by Graduation Year</CardTitle>
              <CardDescription>Distribution by expected graduation</CardDescription>
            </CardHeader>
            <CardContent>
              <BarChartVerticalSvg data={data.profilesByGradYear} color={colors.primary} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Top States</CardTitle>
              <CardDescription>Athletes by location</CardDescription>
            </CardHeader>
            <CardContent>
              <BarChartHorizontalSvg
                data={data.profilesByState}
                getColor={(entry) => entry.state === 'Unknown' ? colors.mutedForeground : CHART_2}
              />
            </CardContent>
          </Card>
        </View>
      </TabsContent>

      <TabsContent value="engagement">
        <View style={st.chartsCol}>
          <Card>
            <CardHeader>
              <CardTitle>Letter Types</CardTitle>
              <CardDescription>Types of letters being sent</CardDescription>
            </CardHeader>
            <CardContent>
              {data.lettersByType.length > 0 ? (
                <View style={{ gap: spacing.md }}>
                  {data.lettersByType.map((item, index) => {
                    const max = Math.max(...data.lettersByType.map(l => l.count));
                    const pct = (item.count / max) * 100;
                    const c = COLORS[index % COLORS.length];
                    return (
                      <View key={item.type} style={st.letterRow}>
                        <View style={[st.dot, { backgroundColor: c }]} />
                        <View style={{ flex: 1 }}>
                          <View style={st.letterHeader}>
                            <Text style={st.letterTypeLabel}>{item.type}</Text>
                            <Text style={st.subtle}>{item.count}</Text>
                          </View>
                          <View style={st.progressTrack}>
                            <View style={[st.progressFill, { width: (`${pct}%` as any), backgroundColor: c }]} />
                          </View>
                        </View>
                      </View>
                    );
                  })}
                </View>
              ) : (
                <Text style={st.empty}>No letter data available</Text>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Top Schools Contacted</CardTitle>
              <CardDescription>Most contacted schools by athletes</CardDescription>
            </CardHeader>
            <CardContent>
              {data.coachContactsBySchool.length > 0 ? (
                <View>
                  <View style={st.tableHeader}>
                    <Text style={[st.thCell, { flex: 1 }]}>School</Text>
                    <Text style={[st.thCell, { textAlign: 'right' }]}>Contacts</Text>
                  </View>
                  {data.coachContactsBySchool.map((item, index) => (
                    <View key={item.school} style={st.tableRow}>
                      <View style={st.schoolCell}>
                        <View style={[st.smDot, { backgroundColor: COLORS[index % COLORS.length] }]} />
                        <Text style={st.tdText}>{item.school}</Text>
                      </View>
                      <Badge variant="secondary">{String(item.count)}</Badge>
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={st.empty}>No contact data available</Text>
              )}
            </CardContent>
          </Card>
        </View>
      </TabsContent>
    </Tabs>
  );
}

export default AdminAnalyticsDashboard;

const st = StyleSheet.create({
  container: { padding: spacing.md, gap: spacing.lg },
  loading: { paddingVertical: 64, alignItems: 'center', justifyContent: 'center' },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md, flexWrap: 'wrap' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  h2: { fontFamily: typography.fontFamily.bodyBold, fontSize: typography.fontSize['2xl'], color: colors.foreground },
  subtle: { fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.xs, color: colors.mutedForeground },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -spacing.xs, marginTop: spacing.md },
  statCell: { width: '50%', padding: spacing.xs },
  statRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  iconWrap: { padding: spacing.xs, borderRadius: 8 },
  statValue: { fontFamily: typography.fontFamily.bodyBold, fontSize: typography.fontSize['2xl'], color: colors.foreground },
  statLabel: { fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.xs, color: colors.mutedForeground },
  chartsCol: { gap: spacing.lg, marginTop: spacing.md },
  letterRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  dot: { width: 12, height: 12, borderRadius: 999 },
  smDot: { width: 8, height: 8, borderRadius: 999 },
  letterHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  letterTypeLabel: { fontFamily: typography.fontFamily.bodyMedium, color: colors.foreground, textTransform: 'capitalize' },
  progressTrack: { height: 8, backgroundColor: colors.muted, borderRadius: 999, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 999 },
  empty: { color: colors.mutedForeground, textAlign: 'center', paddingVertical: spacing.xl, fontFamily: typography.fontFamily.body },
  tableHeader: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: colors.border, paddingVertical: spacing.sm },
  thCell: { fontFamily: typography.fontFamily.bodySemiBold, color: colors.mutedForeground, fontSize: typography.fontSize.xs },
  tableRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
  schoolCell: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  tdText: { fontFamily: typography.fontFamily.bodyMedium, color: colors.foreground },
});

