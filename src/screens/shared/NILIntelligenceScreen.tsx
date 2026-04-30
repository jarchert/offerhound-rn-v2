// NILIntelligenceScreen - RN port of Lovable src/pages/NILIntelligence.tsx (306 LOC).
// Tab layout with My NIL (NILDashboard), Dashboard (stats + sport breakdown + tier guide),
// Calculator (valuation), Trends (rising trends + deal types). Emerald accent kept via
// inline color overrides since the theme palette is gold-centric.
import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView } from 'react-native';
import type { ViewStyle } from 'react-native';
const flat = (...a: any[]) => StyleSheet.flatten(a) as ViewStyle;
import { useQuery } from '@tanstack/react-query';
import {
  TrendingUp, DollarSign, BarChart3, Calculator, Users, Star, Zap, Trophy, Target, Shield,
} from 'lucide-react-native';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/Select';
import { Progress } from '@/components/ui/Progress';
import { BackButton } from '@/components/BackButton';
import { NILDashboard } from '@/components/nil/NILDashboard';
import { NILDisclaimer } from '@/components/NILDisclaimer';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { colors, typography, spacing, radius } from '@/lib/theme';

import { Navbar } from '@/components/Navbar';
const EMERALD = '#34d399';
const EMERALD_DIM = 'rgba(52,211,153,0.6)';
const EMERALD_BG = 'rgba(52,211,153,0.05)';
const EMERALD_BG_STRONG = 'rgba(52,211,153,0.10)';
const EMERALD_BORDER = 'rgba(52,211,153,0.20)';

const NIL_TIERS = [
  { range: '0-1K', followers: 'Under 1,000', estimated: '$0 - $500/yr', level: 'Emerging' },
  { range: '1K-10K', followers: '1,000 - 10,000', estimated: '$500 - $5,000/yr', level: 'Rising' },
  { range: '10K-50K', followers: '10,000 - 50,000', estimated: '$5,000 - $25,000/yr', level: 'Established' },
  { range: '50K-100K', followers: '50,000 - 100,000', estimated: '$25,000 - $75,000/yr', level: 'Notable' },
  { range: '100K-500K', followers: '100,000 - 500,000', estimated: '$75,000 - $250,000/yr', level: 'Prominent' },
  { range: '500K+', followers: '500,000+', estimated: '$250,000+/yr', level: 'Elite' },
];

const SPORT_NIL_DATA = [
  { sport: 'Football',        avgDeal: '$15,200', topDeal: '$1.2M', avgAthletes: '85%', growth: '+32%', multiplier: 1.5 },
  { sport: 'Basketball (M)',  avgDeal: '$12,800', topDeal: '$2.5M', avgAthletes: '78%', growth: '+45%', multiplier: 1.4 },
  { sport: 'Basketball (W)',  avgDeal: '$8,500',  topDeal: '$800K', avgAthletes: '65%', growth: '+67%', multiplier: 1.3 },
  { sport: 'Baseball',        avgDeal: '$6,200',  topDeal: '$450K', avgAthletes: '52%', growth: '+28%', multiplier: 1.1 },
  { sport: 'Softball',        avgDeal: '$4,100',  topDeal: '$280K', avgAthletes: '46%', growth: '+52%', multiplier: 1.0 },
  { sport: 'Soccer',          avgDeal: '$4,800',  topDeal: '$350K', avgAthletes: '48%', growth: '+41%', multiplier: 1.05 },
  { sport: 'Volleyball',      avgDeal: '$3,500',  topDeal: '$200K', avgAthletes: '42%', growth: '+55%', multiplier: 1.0 },
  { sport: 'Track & Field',   avgDeal: '$2,800',  topDeal: '$180K', avgAthletes: '35%', growth: '+38%', multiplier: 0.9 },
  { sport: 'Swimming',        avgDeal: '$3,200',  topDeal: '$250K', avgAthletes: '38%', growth: '+30%', multiplier: 0.95 },
  { sport: 'Lacrosse',        avgDeal: '$3,800',  topDeal: '$220K', avgAthletes: '40%', growth: '+44%', multiplier: 1.0 },
  { sport: 'Golf',            avgDeal: '$5,500',  topDeal: '$400K', avgAthletes: '44%', growth: '+35%', multiplier: 1.15 },
  { sport: 'Hockey',          avgDeal: '$4,200',  topDeal: '$300K', avgAthletes: '39%', growth: '+29%', multiplier: 1.05 },
  { sport: 'Cheerleading',    avgDeal: '$2,500',  topDeal: '$150K', avgAthletes: '50%', growth: '+72%', multiplier: 0.9 },
  { sport: 'Wrestling',       avgDeal: '$2,200',  topDeal: '$120K', avgAthletes: '32%', growth: '+48%', multiplier: 0.85 },
];

const RISING_TRENDS = [
  { trend: "Women's sports NIL growth",     detail: '+67% year-over-year',                   badge: 'Hot' },
  { trend: 'Micro-influencer athlete deals', detail: 'Under 10K followers getting deals',     badge: 'Growing' },
  { trend: 'NIL collectives at Group of 5',  detail: 'Catching up to Power 5 programs',       badge: 'New' },
  { trend: 'Social media video content',     detail: 'Short-form video driving engagement',   badge: 'Trending' },
];

const DEAL_TYPES = [
  { type: 'Social Media Posts',      pct: 45, avg: '$250-$2,000' },
  { type: 'Autograph Signings',      pct: 20, avg: '$50-$500' },
  { type: 'Brand Ambassadorships',   pct: 15, avg: '$5,000-$50,000' },
  { type: 'Camp Appearances',        pct: 10, avg: '$1,000-$10,000' },
  { type: 'Merchandise/Licensing',   pct: 10, avg: '$500-$25,000' },
];

export default function NILIntelligenceScreen() {
  const { user } = useAuth() as any;
  const [tab, setTab] = useState('dashboard');
  const [followerCount, setFollowerCount] = useState('');
  const [selectedSport, setSelectedSport] = useState('Football');
  const [engagementRate, setEngagementRate] = useState('3');

  const { data: athleteProfile } = useQuery({
    queryKey: ['nil-athlete-profile', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase
        .from('player_profiles')
        .select('id, full_name, sport, school, twitter_url, instagram_url')
        .eq('user_id', user.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  // Set initial tab to "my-nil" when profile loads
  React.useEffect(() => {
    if (athleteProfile && tab === 'dashboard') setTab('my-nil');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [athleteProfile?.id]);

  const calculateNILValue = () => {
    const followers = parseInt(followerCount, 10) || 0;
    const engagement = parseFloat(engagementRate) || 3;
    const sportData = SPORT_NIL_DATA.find((sp) => sp.sport === selectedSport);
    const sportMultiplier = sportData?.multiplier ?? 1.0;
    const engagementMultiplier = engagement > 5 ? 1.5 : engagement > 3 ? 1.2 : 1.0;
    if (followers < 1000) return { low: 0, mid: 250, high: 500 };
    if (followers < 10000) {
      return {
        low: Math.round(followers * 0.5 * sportMultiplier * engagementMultiplier),
        mid: Math.round(followers * 1.0 * sportMultiplier * engagementMultiplier),
        high: Math.round(followers * 2.0 * sportMultiplier * engagementMultiplier),
      };
    }
    if (followers < 50000) {
      return {
        low: Math.round(followers * 0.8 * sportMultiplier * engagementMultiplier),
        mid: Math.round(followers * 1.5 * sportMultiplier * engagementMultiplier),
        high: Math.round(followers * 3.0 * sportMultiplier * engagementMultiplier),
      };
    }
    return {
      low: Math.round(followers * 1.0 * sportMultiplier * engagementMultiplier),
      mid: Math.round(followers * 2.5 * sportMultiplier * engagementMultiplier),
      high: Math.round(followers * 5.0 * sportMultiplier * engagementMultiplier),
    };
  };

  const valuation = calculateNILValue();

  return (
    <SafeAreaView style={s.root}>
      <Navbar />
      <View style={s.headerBar}>
        <BackButton label="Back" />
      </View>
      <ScrollView contentContainerStyle={s.content}>
        <View style={s.titleRow}>
          <View style={s.titleIcon}>
            <DollarSign size={24} color={EMERALD} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[s.h1, { color: EMERALD }]}>NIL Intelligence</Text>
            <Text style={[s.subtitle, { color: EMERALD_DIM }]}>Powered by OfferHound AI - All 13 Sports</Text>
          </View>
        </View>
        <Text style={s.intro}>
          Comprehensive Name, Image and Likeness insights, earnings projections, tax analysis, and school comparisons
        </Text>

        {athleteProfile ? (
          <Card style={flat(s.card, s.profileCard)}>
            <CardContent style={s.profileCardContent}>
              <Star size={24} color={EMERALD} />
              <View style={{ flex: 1 }}>
                <Text style={s.profileName}>Personalized for {athleteProfile.full_name}</Text>
                <Text style={s.profileMeta}>
                  {athleteProfile.sport} - {athleteProfile.school}
                </Text>
              </View>
            </CardContent>
          </Card>
        ) : null}

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            {athleteProfile ? (
              <TabsTrigger value="my-nil">
                <View style={s.tabInner}><Shield size={14} color={tab === 'my-nil' ? EMERALD : colors.mutedForeground} /><Text style={[s.tabText, tab === 'my-nil' && { color: EMERALD }]}>My NIL</Text></View>
              </TabsTrigger>
            ) : null}
            <TabsTrigger value="dashboard">
              <View style={s.tabInner}><BarChart3 size={14} color={tab === 'dashboard' ? EMERALD : colors.mutedForeground} /><Text style={[s.tabText, tab === 'dashboard' && { color: EMERALD }]}>Dashboard</Text></View>
            </TabsTrigger>
            <TabsTrigger value="calculator">
              <View style={s.tabInner}><Calculator size={14} color={tab === 'calculator' ? EMERALD : colors.mutedForeground} /><Text style={[s.tabText, tab === 'calculator' && { color: EMERALD }]}>Valuation</Text></View>
            </TabsTrigger>
            <TabsTrigger value="trends">
              <View style={s.tabInner}><TrendingUp size={14} color={tab === 'trends' ? EMERALD : colors.mutedForeground} /><Text style={[s.tabText, tab === 'trends' && { color: EMERALD }]}>Trends</Text></View>
            </TabsTrigger>
          </TabsList>

          {athleteProfile ? (
            <TabsContent value="my-nil">
              <NILDashboard athleteProfileId={athleteProfile.id} />
            </TabsContent>
          ) : null}

          <TabsContent value="dashboard">
            <View style={s.statRow}>
              <Card style={flat(s.card, s.statCard)}>
                <CardContent style={s.statContent}>
                  <DollarSign size={28} color={EMERALD} />
                  <Text style={s.statValue}>$1.17B</Text>
                  <Text style={s.statLabel}>Total NIL Market (2025)</Text>
                  <View style={[s.miniBadge, { backgroundColor: EMERALD_BG_STRONG, borderColor: EMERALD_BORDER }]}>
                    <Text style={[s.miniBadgeText, { color: EMERALD }]}>+42% YoY</Text>
                  </View>
                </CardContent>
              </Card>
              <Card style={flat(s.card, s.statCard)}>
                <CardContent style={s.statContent}>
                  <Users size={28} color={EMERALD} />
                  <Text style={s.statValue}>175K+</Text>
                  <Text style={s.statLabel}>Athletes with NIL Deals</Text>
                  <Badge variant="secondary">Growing</Badge>
                </CardContent>
              </Card>
              <Card style={flat(s.card, s.statCard)}>
                <CardContent style={s.statContent}>
                  <Trophy size={28} color={EMERALD} />
                  <Text style={s.statValue}>$8,400</Text>
                  <Text style={s.statLabel}>Avg Deal Value</Text>
                  <Badge variant="outline">All Sports</Badge>
                </CardContent>
              </Card>
            </View>

            <Card style={flat(s.card, s.emeraldCard)}>
              <CardHeader>
                <CardTitle style={{ color: EMERALD }}>NIL by Sport - All 13 Sports</CardTitle>
                <CardDescription>Average deal values and participation rates across every OfferHound sport</CardDescription>
              </CardHeader>
              <CardContent>
                <View style={{ gap: spacing.sm }}>
                  {SPORT_NIL_DATA.map((sp) => (
                    <View key={sp.sport} style={s.sportRow}>
                      <Text style={[s.sportName, { color: EMERALD }]}>{sp.sport}</Text>
                      <View style={{ flex: 1, marginHorizontal: spacing.sm }}>
                        <Progress value={parseInt(sp.avgAthletes, 10)} />
                      </View>
                      <Text style={s.sportPct}>{sp.avgAthletes}</Text>
                      <View style={{ alignItems: 'flex-end', marginLeft: spacing.sm, minWidth: 70 }}>
                        <Text style={[s.sportDeal, { color: EMERALD }]}>{sp.avgDeal}</Text>
                        <Text style={s.sportSub}>avg deal</Text>
                      </View>
                      <View style={[s.miniBadge, { borderColor: EMERALD_BORDER, marginLeft: spacing.sm }]}>
                        <Text style={[s.miniBadgeText, { color: EMERALD }]}>{sp.growth}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              </CardContent>
            </Card>

            <Card style={flat(s.card, s.emeraldCard)}>
              <CardHeader>
                <View style={s.titleRowTight}>
                  <Zap size={18} color={EMERALD} />
                  <CardTitle style={{ color: EMERALD }}>Social Media Tier Guide</CardTitle>
                </View>
              </CardHeader>
              <CardContent>
                <View style={s.tierGrid}>
                  {NIL_TIERS.map((tier) => (
                    <View key={tier.range} style={s.tierCard}>
                      <View style={s.tierHeader}>
                        <View style={[s.miniBadge, { backgroundColor: EMERALD_BG_STRONG, borderColor: EMERALD_BORDER }]}>
                          <Text style={[s.miniBadgeText, { color: EMERALD }]}>{tier.level}</Text>
                        </View>
                        <Text style={s.tierRange}>{tier.range} followers</Text>
                      </View>
                      <Text style={[s.tierEstimated, { color: EMERALD }]}>{tier.estimated}</Text>
                      <Text style={s.tierFollowers}>{tier.followers}</Text>
                    </View>
                  ))}
                </View>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="calculator">
            <Card style={flat(s.card, s.emeraldCard)}>
              <CardHeader>
                <View style={s.titleRowTight}>
                  <Calculator size={18} color={EMERALD} />
                  <CardTitle style={{ color: EMERALD }}>NIL Valuation Calculator</CardTitle>
                </View>
                <CardDescription>Estimate your NIL value based on social media presence and sport</CardDescription>
              </CardHeader>
              <CardContent>
                <View style={{ gap: spacing.md }}>
                  <View>
                    <Label>Total Social Media Followers</Label>
                    <Input
                      keyboardType="numeric"
                      value={followerCount}
                      onChangeText={setFollowerCount}
                      placeholder="e.g., 5000"
                    />
                  </View>
                  <View>
                    <Label>Sport</Label>
                    <Select value={selectedSport} onValueChange={setSelectedSport}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {SPORT_NIL_DATA.map((sp) => (
                          <SelectItem key={sp.sport} value={sp.sport}>{sp.sport}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </View>
                  <View>
                    <Label>Engagement Rate (%)</Label>
                    <Input
                      keyboardType="numeric"
                      value={engagementRate}
                      onChangeText={setEngagementRate}
                      placeholder="3"
                    />
                  </View>

                  <View style={s.valuationRow}>
                    <Card style={flat(s.valuationCard, s.emeraldCardSubtle)}>
                      <CardContent style={s.valuationContent}>
                        <Text style={s.valuationLabel}>Conservative</Text>
                        <Text style={s.valuationLow}>${valuation.low.toLocaleString()}</Text>
                        <Text style={s.valuationSub}>per year</Text>
                      </CardContent>
                    </Card>
                    <Card style={flat(s.valuationCard, { backgroundColor: EMERALD_BG_STRONG, borderColor: EMERALD })}>
                      <CardContent style={s.valuationContent}>
                        <Text style={[s.valuationLabel, { color: EMERALD }]}>Estimated</Text>
                        <Text style={[s.valuationMid, { color: EMERALD }]}>${valuation.mid.toLocaleString()}</Text>
                        <Text style={s.valuationSub}>per year</Text>
                      </CardContent>
                    </Card>
                    <Card style={flat(s.valuationCard, s.emeraldCardSubtle)}>
                      <CardContent style={s.valuationContent}>
                        <Text style={s.valuationLabel}>Optimistic</Text>
                        <Text style={s.valuationLow}>${valuation.high.toLocaleString()}</Text>
                        <Text style={s.valuationSub}>per year</Text>
                      </CardContent>
                    </Card>
                  </View>

                  <View style={s.tipsBox}>
                    <View style={s.titleRowTight}>
                      <Target size={14} color={EMERALD} />
                      <Text style={[s.tipsTitle, { color: EMERALD }]}>Tips to Increase Your NIL Value</Text>
                    </View>
                    <Text style={s.tipText}>- Post consistently (3-5x per week) with authentic content</Text>
                    <Text style={s.tipText}>- Engage with your community - reply to comments and DMs</Text>
                    <Text style={s.tipText}>- Build a personal brand beyond your sport</Text>
                    <Text style={s.tipText}>- Partner with local businesses to build your portfolio</Text>
                    <Text style={s.tipText}>- Use your OfferHound profile to showcase your brand to recruiters</Text>
                  </View>
                </View>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="trends">
            <Card style={flat(s.card, s.emeraldCard)}>
              <CardHeader>
                <CardTitle style={{ color: EMERALD }}>Rising Trends</CardTitle>
              </CardHeader>
              <CardContent>
                <View style={{ gap: spacing.sm }}>
                  {RISING_TRENDS.map((item, i) => (
                    <View key={i} style={s.trendRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={[s.trendName, { color: EMERALD }]}>{item.trend}</Text>
                        <Text style={s.trendDetail}>{item.detail}</Text>
                      </View>
                      <View style={[s.miniBadge, { backgroundColor: EMERALD_BG_STRONG, borderColor: EMERALD_BORDER }]}>
                        <Text style={[s.miniBadgeText, { color: EMERALD }]}>{item.badge}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              </CardContent>
            </Card>

            <Card style={flat(s.card, s.emeraldCard)}>
              <CardHeader>
                <CardTitle style={{ color: EMERALD }}>Deal Types</CardTitle>
              </CardHeader>
              <CardContent>
                <View style={{ gap: spacing.sm }}>
                  {DEAL_TYPES.map((item, i) => (
                    <View key={i} style={{ gap: 4 }}>
                      <View style={s.dealRow}>
                        <Text style={s.dealType}>{item.type}</Text>
                        <Text style={[s.dealAvg, { color: EMERALD }]}>{item.avg}</Text>
                      </View>
                      <Progress value={item.pct} style={{ height: 6 }} />
                    </View>
                  ))}
                </View>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <View style={{ marginTop: spacing.xl }}>
          <NILDisclaimer />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  headerBar: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  content: { padding: spacing.md, paddingBottom: spacing.xxl, maxWidth: 1100, width: '100%', alignSelf: 'center' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.sm, marginBottom: spacing.xs },
  titleRowTight: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  titleIcon: {
    width: 40, height: 40, borderRadius: radius.md,
    backgroundColor: EMERALD_BG_STRONG,
    borderWidth: 1, borderColor: EMERALD_BORDER,
    alignItems: 'center', justifyContent: 'center',
  },
  h1: { fontFamily: typography.fontFamily.heading, fontSize: typography.heading.h2, letterSpacing: typography.letterSpacing.heading },
  subtitle: { fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.sm },
  intro: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.sm,
    color: colors.mutedForeground,
    marginBottom: spacing.lg,
  },
  card: { marginTop: spacing.md },
  profileCard: { borderColor: EMERALD_BORDER, backgroundColor: EMERALD_BG },
  profileCardContent: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md },
  profileName: { fontFamily: typography.fontFamily.bodyMedium, fontSize: typography.fontSize.base, color: EMERALD },
  profileMeta: { fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.sm, color: EMERALD_DIM },
  tabInner: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  tabText: { fontFamily: typography.fontFamily.bodyMedium, fontSize: typography.fontSize.sm, color: colors.mutedForeground },
  emeraldCard: { borderColor: EMERALD_BORDER, backgroundColor: EMERALD_BG },
  emeraldCardSubtle: { borderColor: EMERALD_BORDER, backgroundColor: EMERALD_BG_STRONG },
  statRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md, flexWrap: 'wrap' },
  statCard: { flex: 1, minWidth: 140, borderColor: EMERALD_BORDER, backgroundColor: EMERALD_BG, marginTop: 0 },
  statContent: { padding: spacing.md, alignItems: 'center', gap: spacing.xs },
  statValue: { fontFamily: typography.fontFamily.heading, fontSize: typography.heading.h3, color: EMERALD, letterSpacing: typography.letterSpacing.heading },
  statLabel: { fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.xs, color: colors.mutedForeground, textAlign: 'center' },
  miniBadge: { paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: radius.full, borderWidth: 1, borderColor: 'transparent' },
  miniBadgeText: { fontFamily: typography.fontFamily.bodyMedium, fontSize: typography.fontSize.xs },
  sportRow: {
    flexDirection: 'row', alignItems: 'center',
    padding: spacing.sm, borderRadius: radius.md,
    backgroundColor: EMERALD_BG, borderWidth: 1, borderColor: EMERALD_BORDER,
  },
  sportName: { fontFamily: typography.fontFamily.bodyMedium, fontSize: typography.fontSize.sm, width: 120 },
  sportPct: { fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.xs, color: colors.mutedForeground, width: 40, textAlign: 'right' },
  sportDeal: { fontFamily: typography.fontFamily.bodySemiBold, fontSize: typography.fontSize.sm },
  sportSub: { fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.xs, color: colors.mutedForeground },
  tierGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  tierCard: { flexBasis: '48%', flexGrow: 1, padding: spacing.md, borderRadius: radius.md, backgroundColor: EMERALD_BG, borderWidth: 1, borderColor: EMERALD_BORDER },
  tierHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.xs },
  tierRange: { fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.xs, color: colors.mutedForeground },
  tierEstimated: { fontFamily: typography.fontFamily.heading, fontSize: typography.fontSize.lg, letterSpacing: typography.letterSpacing.heading },
  tierFollowers: { fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.xs, color: colors.mutedForeground },
  valuationRow: { flexDirection: 'row', gap: spacing.sm, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: EMERALD_BORDER },
  valuationCard: { flex: 1, borderColor: EMERALD_BORDER, marginTop: 0 },
  valuationContent: { padding: spacing.md, alignItems: 'center', gap: 4 },
  valuationLabel: { fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.xs, color: colors.mutedForeground },
  valuationLow: { fontFamily: typography.fontFamily.heading, fontSize: typography.heading.h4, color: colors.mutedForeground },
  valuationMid: { fontFamily: typography.fontFamily.heading, fontSize: typography.heading.h3 },
  valuationSub: { fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.xs, color: colors.mutedForeground },
  tipsBox: { backgroundColor: EMERALD_BG, borderRadius: radius.md, padding: spacing.md, borderWidth: 1, borderColor: EMERALD_BORDER, gap: spacing.xs },
  tipsTitle: { fontFamily: typography.fontFamily.bodyMedium, fontSize: typography.fontSize.sm },
  tipText: { fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.sm, color: colors.mutedForeground },
  trendRow: {
    flexDirection: 'row', alignItems: 'center',
    padding: spacing.sm, borderRadius: radius.md,
    backgroundColor: EMERALD_BG, borderWidth: 1, borderColor: EMERALD_BORDER,
    gap: spacing.sm,
  },
  trendName: { fontFamily: typography.fontFamily.bodyMedium, fontSize: typography.fontSize.sm },
  trendDetail: { fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.xs, color: colors.mutedForeground },
  dealRow: { flexDirection: 'row', justifyContent: 'space-between' },
  dealType: { fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.sm, color: colors.mutedForeground },
  dealAvg: { fontFamily: typography.fontFamily.bodyMedium, fontSize: typography.fontSize.sm },
});
