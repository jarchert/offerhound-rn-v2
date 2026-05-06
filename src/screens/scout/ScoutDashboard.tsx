// ScoutDashboard — full parity rewrite with Lovable web
// Source: Lovable src/pages/ScoutDashboard.tsx + src/components/ScoutNav.tsx
// RN port: tab-based navigation replaces web Tabs + Link nav
import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, SafeAreaView, RefreshControl, Pressable, ActivityIndicator } from 'react-native';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Users, Eye, FileText, Star, Share2, Search, TrendingUp, Globe, Building2, Mail, LayoutDashboard } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useScoutProfile } from '@/hooks/useScoutProfile';
import { useScoutSavedAthletes } from '@/hooks/useScoutSavedAthletes';
import { useScoutActivity } from '@/hooks/useScoutActivity';
import { ScoutPipeline } from '@/components/ScoutPipeline';
import { ScoutAnalyticsDashboard } from '@/components/ScoutAnalyticsDashboard';
import { ScoutQuickStartGuide } from '@/components/ScoutQuickStartGuide';
import { TransferPortalFeed } from '@/components/TransferPortalFeed';
import { ShareRoleCardDialog } from '@/components/ShareRoleCardDialog';
import { SocialLinksManager } from '@/components/SocialLinksManager';
import { SocialSyndicationCenter } from '@/components/SocialSyndicationCenter';
import { colors, typography, spacing } from '@/lib/theme';
import type { RootStackParamList } from '@/navigation/RootNavigator';

// Stubs for web components not yet ported to RN
function SEO(_: { title: string; noIndex?: boolean }) { return null; }
function Footer() { return null; }
function BackButton(_: { fallbackTo?: string }) { return null; }
function TermsAcceptanceGate(_: { children: React.ReactNode }) { return <>{_.children}</>; }

// date-fns format — verify installed, fallback to manual date string
function formatDate(date: Date, _fmt: string): string {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

type TabValue = 'pipeline' | 'saved' | 'activity' | 'analytics' | 'social';

export default function ScoutDashboard() {
  const nav = useNavigation<NavigationProp<RootStackParamList>>();
  const { user } = useAuth();
  const { data: profile, isLoading: profileLoading } = useScoutProfile();
  const { data: savedAthletes = [] } = useScoutSavedAthletes();
  const { data: activity = [], isLoading: activityLoading, refetch } = useScoutActivity(10);
  const [activeTab, setActiveTab] = useState<TabValue>('pipeline');
  const [showGuide, setShowGuide] = useState(true);

  const scoutName =
    (profile as any)?.name ||
    (profile as any)?.full_name ||
    user?.email?.split('@')[0] ||
    'Scout';

  if (profileLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingCenter}>
          <ActivityIndicator color={colors.primary} />
          <Text style={styles.loadingText}>Loading dashboard...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const profilesViewed = (activity as any[]).filter(
    (a: any) => a.activity_type === 'profile_view'
  ).length;
  const lettersSent = (activity as any[]).filter(
    (a: any) => a.activity_type === 'letter_sent'
  ).length;
  const searchesCount = (activity as any[]).filter(
    (a: any) => a.activity_type === 'search_performed'
  ).length;

  const needsGuide = showGuide && !(profile as any)?.onboarding_complete;

  return (
    <SafeAreaView style={styles.container}>
      <SEO title="Scout Dashboard - OfferHound" noIndex />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={activityLoading}
            onRefresh={refetch}
            tintColor={colors.primary}
          />
        }
      >
        {/* Header row */}
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.welcomeTitle}>Welcome, {scoutName}</Text>
            <Text style={styles.welcomeSubtitle}>Your scouting command center</Text>
          </View>
        </View>

        {/* Action buttons */}
        <View style={styles.actionsRow}>
          <ShareRoleCardDialog role="scout">
            <Pressable style={styles.actionBtn}>
              <Share2 size={14} color={colors.foreground} />
              <Text style={styles.actionBtnText}>Share Card</Text>
            </Pressable>
          </ShareRoleCardDialog>

          <Pressable style={styles.actionBtn} onPress={() => nav.navigate('AthleteSearch', undefined)}>
            <Search size={14} color={colors.foreground} />
            <Text style={styles.actionBtnText}>Search Athletes</Text>
          </Pressable>

          <Pressable style={styles.actionBtn} onPress={() => nav.navigate('LetterComposer', undefined)}>
            <FileText size={14} color={colors.foreground} />
            <Text style={styles.actionBtnText}>AI Letters</Text>
          </Pressable>

          <Pressable style={styles.actionBtn} onPress={() => nav.navigate('ScoutTrends')}>
            <TrendingUp size={14} color={colors.foreground} />
            <Text style={styles.actionBtnText}>Trends</Text>
          </Pressable>
        </View>

        {/* Quick start guide */}
        {needsGuide && (
          <ScoutQuickStartGuide
            scoutName={scoutName}
            hasOrganization={false}
            onDismiss={() => setShowGuide(false)}
          />
        )}

        {/* Stats cards */}
        <View style={styles.statsGrid}>
          <Card style={styles.statCard}>
            <CardContent style={styles.statCardContent}>
              <Users size={28} color={colors.primary} />
              <View style={styles.statTextGroup}>
                <Text style={styles.statValue}>{savedAthletes.length}</Text>
                <Text style={styles.statLabel}>Saved Athletes</Text>
              </View>
            </CardContent>
          </Card>

          <Card style={styles.statCard}>
            <CardContent style={styles.statCardContent}>
              <Eye size={28} color={colors.primary} />
              <View style={styles.statTextGroup}>
                <Text style={styles.statValue}>{profilesViewed}</Text>
                <Text style={styles.statLabel}>Profiles Viewed</Text>
              </View>
            </CardContent>
          </Card>

          <Card style={styles.statCard}>
            <CardContent style={styles.statCardContent}>
              <FileText size={28} color={colors.primary} />
              <View style={styles.statTextGroup}>
                <Text style={styles.statValue}>{lettersSent}</Text>
                <Text style={styles.statLabel}>Letters Sent</Text>
              </View>
            </CardContent>
          </Card>

          <Card style={styles.statCard}>
            <CardContent style={styles.statCardContent}>
              <Star size={28} color={colors.primary} />
              <View style={styles.statTextGroup}>
                <Text style={styles.statValue}>{searchesCount}</Text>
                <Text style={styles.statLabel}>Searches</Text>
              </View>
            </CardContent>
          </Card>
        </View>

        {/* Agency Dashboard link */}
        <Pressable style={styles.agencyBanner} onPress={() => nav.navigate('AgencyDrawer')}>
          <Building2 size={16} color={colors.foreground} />
          <Text style={styles.agencyBannerText}>Agency Dashboard</Text>
        </Pressable>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabValue)}>
          <TabsList>
            <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
            <TabsTrigger value="saved">Saved Athletes</TabsTrigger>
            <TabsTrigger value="activity">Transfer Portal</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="social">
              <Globe size={14} color={colors.foreground} style={{ marginRight: 4 }} />
              Social
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pipeline">
            <ScoutPipeline />
          </TabsContent>

          <TabsContent value="saved">
            <Card>
              <CardHeader>
                <CardTitle>Saved Athletes ({savedAthletes.length})</CardTitle>
              </CardHeader>
              <CardContent>
                {savedAthletes.length === 0 ? (
                  <Text style={styles.emptyText}>
                    No saved athletes yet. Use the search to find and save athletes.
                  </Text>
                ) : (
                  <View style={styles.savedList}>
                    {savedAthletes.map((item: any) => (
                      <View key={item.id} style={styles.savedItem}>
                        <View style={styles.savedItemInfo}>
                          <Text style={styles.savedItemName}>
                            {item.athlete?.full_name || 'Unknown'}
                          </Text>
                          <Text style={styles.savedItemMeta}>
                            {item.athlete?.position} • {item.athlete?.school}
                            {item.athlete?.graduation_year ? ` • ${item.athlete.graduation_year}` : ''}
                          </Text>
                        </View>
                        <View style={styles.savedItemActions}>
                          {item.priority && (
                            <Badge variant="outline" style={{ marginRight: spacing.xs }}>
                              {item.priority}
                            </Badge>
                          )}
                          <Pressable
                            onPress={() => {
                              const id = item.athlete?.custom_url || item.athlete?.id;
                              nav.navigate('Profile', { userId: id });
                            }}
                          >
                            <Text style={styles.viewBtn}>View</Text>
                          </Pressable>
                        </View>
                      </View>
                    ))}
                  </View>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="activity">
            <Card>
              <CardHeader>
                <CardTitle>Transfer Portal</CardTitle>
              </CardHeader>
              <CardContent>
                {(activity as any[]).length === 0 ? (
                  <Text style={styles.emptyText}>No recent activity.</Text>
                ) : (
                  <View style={styles.savedList}>
                    {(activity as any[]).map((a: any) => (
                      <View key={a.id} style={styles.savedItem}>
                        <View style={styles.savedItemInfo}>
                          <Text style={styles.savedItemName}>
                            {a.activity_type?.replace(/_/g, ' ') ?? 'Activity'}
                          </Text>
                          <Text style={styles.savedItemMeta}>
                            {a.athlete?.full_name ? `Athlete: ${a.athlete.full_name}` : ''}
                            {a.coach?.name ? ` • Coach: ${a.coach.name}` : ''}
                          </Text>
                        </View>
                        <Text style={styles.activityTime}>
                          {a.created_at
                            ? formatDate(new Date(a.created_at), 'MMM d, h:mm a')
                            : ''}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics">
            <ScoutAnalyticsDashboard />
          </TabsContent>

          <TabsContent value="social">
            <View style={styles.socialTabContent}>
              <SocialLinksManager
                role="scout"
                profileName={(profile as any)?.name || (profile as any)?.full_name}
                profileImageUrl={(profile as any)?.image_url}
                initialLinks={(profile as any)?.social_links || {}}
              />
              <View style={{ height: spacing.md }} />
              <SocialSyndicationCenter
                entityName={(profile as any)?.name || (profile as any)?.full_name}
              />
            </View>
          </TabsContent>
        </Tabs>

        {/* Transfer portal feed — full width below tabs */}
        <View style={styles.feedSection}>
          <TransferPortalFeed />
        </View>
      </ScrollView>
      <Footer />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: spacing.md,
    gap: spacing.md,
    paddingBottom: spacing.xxl,
  },
  loadingCenter: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
  },
  loadingText: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.sm,
    color: colors.mutedForeground,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  welcomeTitle: {
    fontFamily: typography.fontFamily.heading,
    fontSize: typography.fontSize['2xl'],
    color: colors.foreground,
    letterSpacing: typography.letterSpacing.heading,
  },
  welcomeSubtitle: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.sm,
    color: colors.mutedForeground,
    marginTop: 2,
  },
  actionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.card,
  },
  actionBtnText: {
    fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: typography.fontSize.sm,
    color: colors.foreground,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
  },
  statCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
  },
  statTextGroup: {
    gap: 2,
  },
  statValue: {
    fontFamily: typography.fontFamily.heading,
    fontSize: typography.fontSize['2xl'],
    color: colors.foreground,
  },
  statLabel: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.xs,
    color: colors.mutedForeground,
  },
  agencyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 8,
    backgroundColor: colors.muted,
    alignSelf: 'flex-start',
  },
  agencyBannerText: {
    fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: typography.fontSize.sm,
    color: colors.foreground,
  },
  emptyText: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.sm,
    color: colors.mutedForeground,
    textAlign: 'center',
    paddingVertical: spacing.lg,
  },
  savedList: {
    gap: spacing.sm,
  },
  savedItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.sm,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  savedItemInfo: {
    flex: 1,
    gap: 2,
  },
  savedItemName: {
    fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: typography.fontSize.base,
    color: colors.foreground,
  },
  savedItemMeta: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.xs,
    color: colors.mutedForeground,
  },
  savedItemActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewBtn: {
    fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: typography.fontSize.sm,
    color: colors.primary,
    paddingHorizontal: spacing.xs,
  },
  activityTime: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.xs,
    color: colors.mutedForeground,
  },
  socialTabContent: {
    gap: spacing.md,
  },
  feedSection: {
    marginTop: spacing.md,
  },
});