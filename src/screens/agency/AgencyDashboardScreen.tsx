// AgencyDashboardScreen — full RN port of Lovable web `src/pages/AgencyDashboard.tsx`.
// Keeps tab structure (Overview / Team / Manage Staff / Pipeline / Saved / Messaging /
// Analytics / Organization / Social) so future visual polish maps 1:1 with the web design.
// Inline `// PORT-PENDING:` markers cover composed components or web hooks that don't
// have a 1:1 RN counterpart yet — they render lightweight placeholders so the screen
// type-checks and remains navigable.
import React, { useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet, SafeAreaView, Pressable,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import {
  Users, TrendingUp, FileText, Search, Eye, Star, Globe, Building2, Mail,
  LayoutDashboard, UserPlus, MessageCircle, User as UserIcon, Heart, Share2,
} from 'lucide-react-native';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';

import { useAuth } from '@/hooks/useAuth';
import { useScoutProfile } from '@/hooks/useScoutProfile';
import { useScoutOrganization } from '@/hooks/useScoutOrganization';
import { useScoutSavedAthletes } from '@/hooks/useScoutSavedAthletes';
import { useScoutActivity } from '@/hooks/useScoutActivity';
import { useScoutLetterHistory } from '@/hooks/useScoutLetterHistory';
import { supabase } from '@/integrations/supabase/client';

import { AgencyStaffManager } from '@/components/agency/AgencyStaffManager';
import { AgencyTeamView } from '@/components/agency/AgencyTeamView';
import { ScoutPipeline } from '@/components/ScoutPipeline';
import { ScoutAnalyticsDashboard } from '@/components/ScoutAnalyticsDashboard';
import { TransferPortalFeed } from '@/components/TransferPortalFeed';
import { SocialLinksManager } from '@/components/SocialLinksManager';
import { SocialSyndicationCenter } from '@/components/SocialSyndicationCenter';
import { ShareRoleCardDialog } from '@/components/ShareRoleCardDialog';
import { OrganizationLogoUpload } from '@/components/OrganizationLogoUpload';
import { StaffMessaging } from '@/components/StaffMessaging';

import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { colors, typography, spacing, radius } from '@/lib/theme';
import type { RootStackParamList } from '@/navigation/RootNavigator';

export default function AgencyDashboardScreen() {
  const nav = useNavigation<NavigationProp<RootStackParamList>>();
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const { data: profile, isLoading: profileLoading } = useScoutProfile();
  const { data: orgData } = useScoutOrganization();
  const { data: savedAthletes = [] } = useScoutSavedAthletes();
  const { data: activity = [] } = useScoutActivity(10);
  const { history: letterHistory } = useScoutLetterHistory();
  const [tab, setTab] = React.useState('overview');

  const org = (orgData as any)?.organization;
  const isOwner = (orgData as any)?.isOwner;
  const memberRole = (orgData as any)?.memberRole;

  const { data: staffCount = 0 } = useQuery({
    queryKey: ['agency-staff-count', user?.id],
    queryFn: async () => {
      if (!user) return 0;
      const { count } = await supabase
        .from('coaching_staff')
        .select('*', { count: 'exact', head: true })
        .eq('owner_user_id', user.id)
        .neq('status', 'removed');
      return count || 0;
    },
    enabled: !!user,
  });

  useEffect(() => {
    if (!authLoading && !isAuthenticated) nav.navigate('AuthStack' as never);
  }, [authLoading, isAuthenticated, nav]);

  if (authLoading || profileLoading) {
    return (
      <View style={s.loaderRoot}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const agencyName = org?.name || 'Your Agency';
  const profileName = (profile as any)?.name
    || (profile as any)?.full_name
    || user?.email?.split('@')[0]
    || 'Admin';

  const initials = agencyName.split(' ').map((w: string) => w[0]).join('').slice(0, 2);
  const profileViews = (activity as any[]).filter((a: any) => a.activity_type === 'profile_view').length;
  const searches = (activity as any[]).filter((a: any) => a.activity_type === 'search_performed').length;

  return (
    <SafeAreaView style={s.root}>
      {/* PORT-PENDING: SEO — web-only meta component, intentionally omitted on RN */}
      <ScrollView contentContainerStyle={s.content}>
        {/* PORT-PENDING: BackButton — header back is handled by stack navigator on RN */}

        {/* Agency Header */}
        <View style={s.header}>
          <View style={s.headerLeft}>
            <Avatar
              source={org?.logo_url ? { uri: org.logo_url } : null}
              fallback={initials}
              size={56}
            />
            <View style={{ flex: 1 }}>
              <Text style={s.title}>{agencyName}</Text>
              <Text style={s.subtitle}>
                Welcome back, {profileName} ·{' '}
                <Text style={s.role}>
                  {isOwner ? 'Agency Admin' : `Agency ${memberRole || 'Member'}`}
                </Text>
              </Text>
            </View>
          </View>
          <View style={s.actionsRow}>
            <ShareRoleCardDialog role="scout">
              <Button variant="outline" size="sm" leftIcon={<Share2 size={14} color={colors.primary} />}>
                Share Card
              </Button>
            </ShareRoleCardDialog>
            <Button
              variant="outline" size="sm"
              leftIcon={<Search size={14} color={colors.primary} />}
              onPress={() => nav.navigate('AthleteSearch' as never)}
              // TODO: 'AthleteSearch' screen exists at src/screens/shared/AthleteSearchScreen.tsx
              // but is not registered as a top-level route in src/navigation/RootNavigator.tsx.
              // Other call sites already use this route name; register the screen there.
            >
              Search Athletes
            </Button>
            <Button
              variant="outline" size="sm"
              leftIcon={<Mail size={14} color={colors.primary} />}
              onPress={() => nav.navigate('LetterComposer' as never)}
            >
              Letter Center
            </Button>
            <Button
              variant="outline" size="sm"
              leftIcon={<TrendingUp size={14} color={colors.primary} />}
              onPress={() => {
                // TODO: ScoutTrends is currently only available as a Scout role tab
                // (TrendsTab in src/navigation/role/ScoutTabs.tsx) and not as a standalone
                // route accessible from AgencyTabs. Add a dedicated 'ScoutTrends' Stack.Screen
                // in src/navigation/RootNavigator.tsx pointing at
                // src/screens/scout/ScoutTrendsScreen.tsx, then wire this onPress.
              }}
            >
              Trends
            </Button>
          </View>
        </View>

        {/* Stats Row */}
        <View style={s.statsGrid}>
          <StatMini icon={<UserPlus size={22} color={colors.primary} />} value={staffCount} label="Staff" />
          <StatMini icon={<Heart size={22} color={colors.primary} />} value={savedAthletes.length} label="Saved Athletes" />
          <StatMini icon={<FileText size={22} color={colors.primary} />} value={(letterHistory as any[]).length} label="Letters Sent" />
          <StatMini icon={<Eye size={22} color={colors.primary} />} value={profileViews} label="Profiles Viewed" />
          <StatMini icon={<Star size={22} color={colors.primary} />} value={searches} label="Searches" />
        </View>

        {/* Main Tabs */}
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="overview"><TabLabel icon={LayoutDashboard} label="Overview" /></TabsTrigger>
            <TabsTrigger value="team"><TabLabel icon={Users} label="Team" /></TabsTrigger>
            {isOwner && <TabsTrigger value="staff"><TabLabel icon={Users} label="Manage Staff" /></TabsTrigger>}
            <TabsTrigger value="pipeline"><TabLabel icon={Building2} label="Pipeline" /></TabsTrigger>
            <TabsTrigger value="saved"><TabLabel icon={Heart} label="Saved" /></TabsTrigger>
            <TabsTrigger value="messaging"><TabLabel icon={MessageCircle} label="Messaging" /></TabsTrigger>
            <TabsTrigger value="analytics"><TabLabel icon={TrendingUp} label="Analytics" /></TabsTrigger>
            {isOwner && <TabsTrigger value="org"><TabLabel icon={Building2} label="Organization" /></TabsTrigger>}
            <TabsTrigger value="social"><TabLabel icon={Globe} label="Social" /></TabsTrigger>
          </TabsList>

          {/* Overview */}
          <TabsContent value="overview">
            <View style={{ gap: spacing.md }}>
              {/* Recent Activity */}
              <Card>
                <CardHeader><CardTitle>Recent Activity</CardTitle></CardHeader>
                <CardContent>
                  {(activity as any[]).length === 0 ? (
                    <Text style={s.muted}>No recent activity.</Text>
                  ) : (
                    <View style={{ gap: spacing.sm }}>
                      {(activity as any[]).slice(0, 5).map((a: any) => (
                        <View key={a.id} style={s.row}>
                          <View>
                            <Text style={s.rowTitle}>
                              {(a.activity_type || '').replace(/_/g, ' ')}
                            </Text>
                            {a.athlete?.full_name ? (
                              <Text style={s.rowMeta}>{a.athlete.full_name}</Text>
                            ) : null}
                          </View>
                          <Text style={s.rowMeta}>
                            {a.created_at ? format(new Date(a.created_at), 'MMM d') : ''}
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}
                </CardContent>
              </Card>

              {/* Recent Letters */}
              <Card>
                <CardHeader>
                  <View style={s.cardHeaderRow}>
                    <CardTitle>Recent Letters</CardTitle>
                    <Button variant="ghost" size="sm" onPress={() => nav.navigate('LetterComposer' as never)}>
                      View All
                    </Button>
                  </View>
                </CardHeader>
                <CardContent>
                  {(letterHistory as any[]).length === 0 ? (
                    <Text style={s.muted}>No letters sent yet.</Text>
                  ) : (
                    <View style={{ gap: spacing.sm }}>
                      {(letterHistory as any[]).slice(0, 5).map((l: any) => (
                        <View key={l.id} style={s.row}>
                          <View>
                            <Text style={s.rowTitle}>
                              {l.recipient_name || l.athlete_name || 'Unknown'}
                            </Text>
                            <Text style={s.rowMeta}>
                              {(l.letter_type || '').replace(/-/g, ' ')}
                            </Text>
                          </View>
                          <Text style={s.rowMeta}>
                            {l.sent_at ? format(new Date(l.sent_at), 'MMM d') : ''}
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}
                </CardContent>
              </Card>

              <View style={{ marginTop: spacing.md }}>
                <TransferPortalFeed />
              </View>
            </View>
          </TabsContent>

          <TabsContent value="team"><AgencyTeamView /></TabsContent>

          <TabsContent value="staff">
            <AgencyStaffManager organizationId={org?.id || ''} organizationName={agencyName} />
          </TabsContent>

          <TabsContent value="pipeline"><ScoutPipeline /></TabsContent>

          <TabsContent value="saved">
            <Card>
              <CardHeader><CardTitle>Saved Athletes ({savedAthletes.length})</CardTitle></CardHeader>
              <CardContent>
                {savedAthletes.length === 0 ? (
                  <View style={s.empty}>
                    <Text style={[s.muted, { marginBottom: spacing.sm }]}>No saved athletes yet.</Text>
                    <Button variant="outline" size="sm" leftIcon={<Search size={14} color={colors.primary} />}>
                      Search Athletes
                    </Button>
                  </View>
                ) : (
                  <View style={{ gap: spacing.sm }}>
                    {(savedAthletes as any[]).map((item: any) => (
                      <View key={item.id} style={s.savedRow}>
                        <View style={s.savedLeft}>
                          <Avatar
                            source={item.athlete?.profile_image_url ? { uri: item.athlete.profile_image_url } : null}
                            fallback={item.athlete?.full_name?.[0] || '?'}
                            size={40}
                          />
                          <View style={{ flex: 1 }}>
                            <Text style={s.rowTitle}>{item.athlete?.full_name || 'Unknown'}</Text>
                            <Text style={s.rowMeta}>
                              {[item.athlete?.position, item.athlete?.school, item.athlete?.graduation_year]
                                .filter(Boolean).join(' · ')}
                            </Text>
                          </View>
                        </View>
                        <View style={s.savedActions}>
                          {item.priority ? <Badge variant="outline">{item.priority}</Badge> : null}
                          <Button variant="ghost" size="sm">View</Button>
                          <Button
                            variant="outline" size="sm"
                            leftIcon={<Mail size={14} color={colors.primary} />}
                            onPress={() => nav.navigate('LetterComposer', {
                              seed: {
                                recipientCategory: 'athlete',
                                recipientName: item.athlete?.full_name || '',
                                organizationName: item.athlete?.school || '',
                                letterType: 'initial-interest',
                              },
                            })}
                          >
                            Letter
                          </Button>
                        </View>
                      </View>
                    ))}
                  </View>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="messaging"><StaffMessaging /></TabsContent>

          <TabsContent value="analytics"><ScoutAnalyticsDashboard /></TabsContent>

          {/* Organization */}
          <TabsContent value="org">
            <View style={{ gap: spacing.md }}>
              <Card>
                <CardHeader><CardTitle>Organization Profile</CardTitle></CardHeader>
                <CardContent>
                  <View style={s.orgHeaderRow}>
                    <OrganizationLogoUpload
                      organizationId={org?.id || ''}
                      currentLogoUrl={org?.logo_url || null}
                      organizationName={agencyName}
                      isOwner={!!isOwner}
                      onLogoUpdated={() => {/* react-query refetch handled inside hook layer */}}
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={s.orgName}>{agencyName}</Text>
                      {org?.description ? (
                        <Text style={s.muted}>{org.description}</Text>
                      ) : null}
                    </View>
                  </View>
                  <View style={s.orgGrid}>
                    {org?.contact_email ? (
                      <View style={s.orgItem}>
                        <Text style={s.muted}>Email: </Text>
                        <Text style={s.orgValue}>{org.contact_email}</Text>
                      </View>
                    ) : null}
                    {org?.contact_phone ? (
                      <View style={s.orgItem}>
                        <Text style={s.muted}>Phone: </Text>
                        <Text style={s.orgValue}>{org.contact_phone}</Text>
                      </View>
                    ) : null}
                    {org?.website_url ? (
                      <View style={s.orgItem}>
                        <Text style={s.muted}>Website: </Text>
                        <Text style={[s.orgValue, { color: colors.primary }]}>{org.website_url}</Text>
                      </View>
                    ) : null}
                  </View>
                </CardContent>
              </Card>
            </View>
          </TabsContent>

          {/* Social */}
          <TabsContent value="social">
            <View style={{ gap: spacing.md }}>
              <SocialLinksManager
                role="scout"
                profileName={(profile as any)?.name || (profile as any)?.full_name || undefined}
                profileImageUrl={(profile as any)?.image_url}
                initialLinks={(profile as any)?.social_links || {}}
              />
              <SocialSyndicationCenter
                entityName={(profile as any)?.name || (profile as any)?.full_name || undefined}
              />
            </View>
          </TabsContent>
        </Tabs>
      </ScrollView>
      {/* PORT-PENDING: Footer — web footer omitted in mobile shell */}
    </SafeAreaView>
  );
}

function StatMini({ icon, value, label }: { icon: React.ReactNode; value: number; label: string }) {
  return (
    <Card style={s.statCard}>
      <CardContent style={s.statContent}>
        {icon}
        <View>
          <Text style={s.statValue}>{value}</Text>
          <Text style={s.statLabel}>{label}</Text>
        </View>
      </CardContent>
    </Card>
  );
}

function TabLabel({ icon: Icon, label }: { icon: any; label: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
      <Icon size={14} color={colors.primary} />
      <Text style={{ fontSize: 11, color: colors.primary, fontFamily: typography.fontFamily.bodyMedium }}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  loaderRoot: { flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' },
  content: { padding: spacing.md, paddingBottom: spacing.xxl, gap: spacing.lg },
  header: { gap: spacing.md },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  title: { fontFamily: typography.fontFamily.heading, fontSize: typography.size['2xl'], color: colors.foreground, letterSpacing: typography.letterSpacing.heading },
  subtitle: { color: colors.foregroundSubtle, fontSize: typography.size.sm, marginTop: 2 },
  role: { color: colors.primary, fontFamily: typography.fontFamily.bodyMedium },
  actionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  statCard: { flexGrow: 1, flexBasis: '47%', minWidth: 140 },
  statContent: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md },
  statValue: { fontFamily: typography.fontFamily.bodyBold, color: colors.foreground, fontSize: typography.size.xl },
  statLabel: { color: colors.foregroundSubtle, fontSize: typography.size.xs },
  cardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  muted: { color: colors.foregroundSubtle, fontSize: typography.size.sm },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.sm, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md },
  rowTitle: { color: colors.foreground, fontFamily: typography.fontFamily.bodyMedium, fontSize: typography.size.sm, textTransform: 'capitalize' },
  rowMeta: { color: colors.foregroundSubtle, fontSize: typography.size.xs },
  empty: { alignItems: 'center', paddingVertical: spacing.lg },
  savedRow: { flexDirection: 'row', justifyContent: 'space-between', padding: spacing.sm, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, gap: spacing.sm, flexWrap: 'wrap' },
  savedLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1, minWidth: 200 },
  savedActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, flexWrap: 'wrap' },
  orgHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.md },
  orgName: { fontFamily: typography.fontFamily.bodyBold, fontSize: typography.size.lg, color: colors.foreground },
  orgGrid: { gap: spacing.sm },
  orgItem: { flexDirection: 'row', flexWrap: 'wrap' },
  orgValue: { color: colors.foreground, fontFamily: typography.fontFamily.bodyMedium, fontSize: typography.size.sm },
});
