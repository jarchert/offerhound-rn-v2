// ClubCoachDashboardScreen — full RN port of Lovable's ClubCoachDashboard.tsx page glue.
// Web → RN mapping:
//   - <div>/<header> → <View> + StyleSheet
//   - <Link to=> / useNavigate → @react-navigation/native useNavigation
//   - shadcn Tabs/Card/Button/Badge/Avatar/Progress → @/components/ui/* RN equivalents
//   - lucide-react → lucide-react-native
//   - SEO is web-only; omitted on native.
//   - Tailwind classes → StyleSheet using @/lib/theme tokens.
// Composes 23 components: ClubTeamManagement, ClubCoachCRM, ClubCoachMessagingHub,
// StaffManager, StaffMessaging, ClubMediaGallery, ClubEventCalendar, ClubSocialLinks,
// ClubCoachDirectoryTab, TermsAcceptanceGate, CoachNav, plus auxiliary cards.
import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, Linking, ActivityIndicator } from 'react-native';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import {
  Loader2, Users, Search, Eye, LogOut, LayoutDashboard, MessageSquare,
  UserCog, Trophy, AlertTriangle, Lock, TrendingUp, Shield, Mail,
  UserPlus, Image as ImageIcon, Calendar as CalendarIcon, Contact, Megaphone, Star, Share2,
  Telescope, Tent, ExternalLink, FileCheck, Globe,
} from 'lucide-react-native';

import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useCoachProfile } from '@/hooks/useCoachProfile';
import { useSavedAthletes } from '@/hooks/useSavedAthletes';
import { useCoachActivityStats } from '@/hooks/useCoachActivity';
import { useToast } from '@/hooks/use-toast';
import { isNativePlatform } from '@/lib/platform';
import { colors, spacing, typography } from '@/lib/theme';

import { TermsAcceptanceGate } from '@/components/TermsAcceptanceGate';
import { CoachNav } from '@/components/CoachNav';
import { ClubTeamManagement } from '@/components/ClubTeamManagement';
import { ClubCoachCRM } from '@/components/ClubCoachCRM';
import { ClubCoachMessagingHub } from '@/components/ClubCoachMessagingHub';
import { StaffManager } from '@/components/StaffManager';
import { StaffMessaging } from '@/components/StaffMessaging';
import { ClubMediaGallery } from '@/components/ClubMediaGallery';
import { ClubEventCalendar } from '@/components/ClubEventCalendar';
import { ClubSocialLinks } from '@/components/ClubSocialLinks';
import { ClubCoachDirectoryTab } from '@/components/club/ClubCoachDirectoryTab';
import { TransferPortalFeed } from '@/components/TransferPortalFeed';
import { CampManagerDashboard } from '@/components/CampManagerDashboard';
import { ShareRoleCardDialog } from '@/components/ShareRoleCardDialog';
import { WebsiteIntegrationDecisionModal } from '@/components/club/WebsiteIntegrationDecisionModal';

import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { Progress } from '@/components/ui/Progress';

import type { RootStackParamList } from '@/navigation/RootNavigator';

type Nav = NavigationProp<RootStackParamList>;

type RosterStats = { total: number; active: number; pending: number; parentPending: number };

const TAB_DEFS: Array<{ value: string; label: string; icon: any }> = [
  { value: 'overview', label: 'Overview', icon: LayoutDashboard },
  { value: 'teams', label: 'Teams', icon: Trophy },
  { value: 'camps', label: 'Camps', icon: Tent },
  { value: 'calendar', label: 'Events', icon: CalendarIcon },
  { value: 'staff', label: 'Staff', icon: UserCog },
  { value: 'crm', label: 'Contacts', icon: Contact },
  { value: 'messaging', label: 'Messaging', icon: MessageSquare },
  { value: 'media', label: 'Media', icon: ImageIcon },
  { value: 'social', label: 'Social', icon: Share2 },
  { value: 'conversion', label: 'Insights', icon: TrendingUp },
  { value: 'discover', label: 'Coaches & Scouts', icon: Telescope },
  { value: 'athletes', label: 'Saved', icon: Star },
  { value: 'profile', label: 'Profile', icon: Eye },
];

export default function ClubCoachDashboardScreen() {
  const nav = useNavigation<Nav>();
  const { user, isAuthenticated, loading: authLoading, signOut } = useAuth();
  const { data: profile, isLoading: profileLoading, isFetched: profileFetched } = useCoachProfile();
  const { data: savedAthletes } = useSavedAthletes();
  const { data: stats } = useCoachActivityStats();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [websiteModalOpen, setWebsiteModalOpen] = useState(false);
  const isWeb = !isNativePlatform();

  const { data: clubProfile, isLoading: clubLoading } = useQuery({
    queryKey: ['club-coach-profile-full', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase.from('club_coach_profiles').select('*').eq('user_id', user.id).maybeSingle();
      return data as any;
    },
    enabled: !!user,
  });

  const { data: teams } = useQuery({
    queryKey: ['club-teams', user?.id],
    queryFn: async () => {
      if (!user) return [] as any[];
      const { data } = await supabase
        .from('teams')
        .select('*, team_rosters(id, status)')
        .eq('coach_user_id', user.id)
        .order('created_at', { ascending: false });
      return (data || []) as any[];
    },
    enabled: !!user,
  });

  const rosterStats: RosterStats = useMemo(() => {
    if (!teams) return { total: 0, active: 0, pending: 0, parentPending: 0 };
    let total = 0, active = 0, pending = 0, parentPending = 0;
    teams.forEach((t: any) => {
      (t.team_rosters || []).forEach((r: any) => {
        total++;
        if (r.status === 'approved' || r.status === 'complete') active++;
        else if (r.status === 'invited' || r.status === 'joined') pending++;
        else if (r.status === 'parent_pending') parentPending++;
      });
    });
    return { total, active, pending, parentPending };
  }, [teams]);

  const { data: conversionData } = useQuery({
    queryKey: ['club-conversion-insight', user?.id],
    queryFn: async () => {
      if (!user) return { unsubscribed: 0, lockedContacts: 0 };
      const { data: rosterAthletes } = await supabase
        .from('team_rosters')
        .select('athlete_profile_id, teams!inner(coach_user_id)')
        .eq('teams.coach_user_id', user.id)
        .not('athlete_profile_id', 'is', null);
      const profileIds = (rosterAthletes || []).map((r: any) => r.athlete_profile_id).filter(Boolean);
      if (profileIds.length === 0) return { unsubscribed: 0, lockedContacts: 0 };
      const { count: lockedCount } = await supabase
        .from('coach_conversion_metrics')
        .select('id', { count: 'exact', head: true })
        .in('athlete_profile_id', profileIds)
        .gt('locked_message_count', 0);
      return { unsubscribed: profileIds.length, lockedContacts: lockedCount || 0 };
    },
    enabled: !!user,
  });

  const { data: contactsCount } = useQuery({
    queryKey: ['club-contacts-count', user?.id],
    queryFn: async () => {
      if (!user) return 0;
      const { count } = await supabase.from('club_coach_contacts').select('id', { count: 'exact', head: true }).eq('coach_user_id', user.id);
      return count || 0;
    },
    enabled: !!user,
  });

  const { data: mediaCount } = useQuery({
    queryKey: ['club-media-count', user?.id],
    queryFn: async () => {
      if (!user) return 0;
      const { count } = await supabase.from('club_media').select('id', { count: 'exact', head: true }).eq('coach_user_id', user.id);
      return count || 0;
    },
    enabled: !!user,
  });

  const handleSignOut = async () => { await signOut(); nav.navigate('PublicTabs' as any); };

  useEffect(() => {
    if (!authLoading && !isAuthenticated) nav.navigate('AuthStack' as any);
  }, [authLoading, isAuthenticated, nav]);

  useEffect(() => {
    if (!authLoading && profileFetched && !clubLoading && !clubProfile && isAuthenticated) {
      nav.navigate('CoachDrawer' as any);
    }
  }, [authLoading, profileFetched, clubLoading, clubProfile, isAuthenticated, nav]);

  if (authLoading || profileLoading || clubLoading) {
    return (
      <View style={s.loading}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!profile || !clubProfile) {
    // Build 54 fix: show a friendly empty state instead of returning null,
    // which previously caused tab-nav crashes ("Cannot read property city of null").
    return (
      <TermsAcceptanceGate>
        <CoachNav role="club_coach" />
        <View style={[s.loading, { padding: spacing.lg }] }>
          <Text style={[s.headerTitle, { textAlign: 'center', marginBottom: spacing.sm }]}>Finish setting up your club profile</Text>
          <Text style={{ color: colors.mutedForeground, textAlign: 'center', marginBottom: spacing.md }}>
            We couldn’t find your club coach profile yet. Complete onboarding to unlock the dashboard.
          </Text>
          <Button onPress={() => nav.navigate('OnboardingStack' as any)}>Complete Onboarding</Button>
          <View style={{ height: spacing.sm }} />
          <Button variant="outline" onPress={handleSignOut} leftIcon={<LogOut size={14} color={colors.foreground} />}>Log Out</Button>
        </View>
      </TermsAcceptanceGate>
    );
  }

  const activeTeams = (teams || []).filter((t: any) => t.status !== 'archived');
  const archivedTeams = (teams || []).filter((t: any) => t.status === 'archived');
  const subscriptionRate = rosterStats.total > 0
    ? Math.round(((rosterStats.total - (conversionData?.unsubscribed || 0)) / rosterStats.total) * 100)
    : 0;

  const kpis: Array<{ icon: any; value: number; label: string }> = [
    { icon: Trophy, value: activeTeams.length, label: 'Active Teams' },
    { icon: Users, value: rosterStats.total, label: 'Total Athletes' },
    { icon: UserPlus, value: rosterStats.pending, label: 'Pending Invites' },
    { icon: Shield, value: rosterStats.parentPending, label: 'Parent Approvals' },
    { icon: Contact, value: contactsCount || 0, label: 'Contacts' },
    { icon: ImageIcon, value: mediaCount || 0, label: 'Media Items' },
  ];

  return (
    <TermsAcceptanceGate>
      <CoachNav role="club_coach" />
      <ScrollView style={s.root} contentContainerStyle={s.scroll}>
        {/* Header */}
        <View style={s.header}>
          <View style={s.headerLeft}>
            <Pressable onPress={() => nav.navigate('PublicTabs' as any)}>
              <Text style={s.brand}>OFFER<Text style={s.brandFg}>HOUND</Text><Text style={s.brandTm}>™</Text></Text>
            </Pressable>
            <View style={s.headerSep} />
            <View>
              <Text style={s.headerTitle}>Club Dashboard</Text>
              <Text style={s.headerSubtitle}>{clubProfile.club_name}</Text>
            </View>
          </View>
          <View style={s.headerRight}>
            <ShareRoleCardDialog role="club_coach">
              <Button variant="outline" size="sm" leftIcon={<Share2 size={14} color={colors.foreground} />}>Share Card</Button>
            </ShareRoleCardDialog>
            <Button variant="ghost" size="sm" onPress={handleSignOut} leftIcon={<LogOut size={14} color={colors.foreground} />}>Log Out</Button>
          </View>
        </View>

        {/* Profile Banner */}
        <View style={s.banner}>
          <Avatar
            size={64}
            source={clubProfile.club_logo_url || profile.image_url ? { uri: clubProfile.club_logo_url || profile.image_url } : undefined}
            fallback={clubProfile.club_name?.charAt(0) || 'C'}
          />
          <View style={s.bannerInfo}>
            <Text style={s.bannerName}>{profile.name}</Text>
            <Text style={s.bannerMeta}>{clubProfile.club_name} • {clubProfile.sport}</Text>
            {clubProfile.city ? (
              <Text style={s.bannerLoc}>{clubProfile.city}{clubProfile.state ? `, ${clubProfile.state}` : ''}</Text>
            ) : null}
          </View>
          <View style={s.bannerActions}>
            <Button size="sm" onPress={() => nav.navigate('AthleteSearch' as any)} leftIcon={<Search size={14} color={colors.primaryForeground} />}>Search</Button>
            <Button variant="outline" size="sm" onPress={() => nav.navigate('LetterComposer' as any)} leftIcon={<FileCheck size={14} color={colors.foreground} />}>Letters</Button>
            <Button variant="outline" size="sm" onPress={() => nav.navigate('Messages' as any)} leftIcon={<MessageSquare size={14} color={colors.foreground} />}>Messages</Button>
          </View>
        </View>

        {/* KPI Cards */}
        <View style={s.kpiGrid}>
          {kpis.map(({ icon: Icon, value, label }) => (
            <Card key={label} style={s.kpiCard}>
              <CardContent style={s.kpiContent}>
                <View style={s.kpiIconWrap}>
                  <Icon size={20} color={colors.primary} />
                </View>
                <View>
                  <Text style={s.kpiValue}>{String(value)}</Text>
                  <Text style={s.kpiLabel}>{label}</Text>
                </View>
              </CardContent>
            </Card>
          ))}
        </View>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.tabListScroll}>
            <TabsList style={s.tabsList}>
              {TAB_DEFS.map(({ value, label, icon: Icon }) => (
                <TabsTrigger key={value} value={value} style={s.tabsTrigger}>
                  <View style={s.tabsTriggerInner}>
                    <Icon size={14} color={activeTab === value ? colors.primaryForeground : colors.primary} />
                    <Text style={[s.tabsTriggerLabel, activeTab === value && s.tabsTriggerLabelActive]}>{label}</Text>
                  </View>
                </TabsTrigger>
              ))}
            </TabsList>
          </ScrollView>

          {/* Overview Tab */}
          <TabsContent value="overview">
            <View style={s.tabBody}>
              <View style={s.cardGrid3}>
                <Card>
                  <CardHeader>
                    <CardTitle><View style={s.cardTitleRow}><Trophy size={18} color={colors.foreground} /><Text style={s.cardTitleText}>Team Overview</Text></View></CardTitle>
                  </CardHeader>
                  <CardContent style={s.cardCol}>
                    <View style={s.row}><Text style={s.rowMuted}>Active Teams</Text><Text style={s.rowVal}>{activeTeams.length}</Text></View>
                    <View style={s.row}><Text style={s.rowMuted}>Archived</Text><Text style={s.rowVal}>{archivedTeams.length}</Text></View>
                    <View style={s.row}><Text style={s.rowMuted}>Total Athletes</Text><Text style={s.rowVal}>{rosterStats.total}</Text></View>
                    <View style={s.row}><Text style={s.rowMuted}>Active / Approved</Text><Text style={[s.rowVal, { color: colors.primary }]}>{rosterStats.active}</Text></View>
                    <Button variant="outline" size="sm" onPress={() => setActiveTab('teams')} style={s.fullW}>Manage Teams</Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle><View style={s.cardTitleRow}><Users size={18} color={colors.foreground} /><Text style={s.cardTitleText}>Athlete Status</Text></View></CardTitle>
                  </CardHeader>
                  <CardContent style={s.cardCol}>
                    <View style={s.row}><Text style={s.rowMuted}>Pending Invites</Text><Badge variant="secondary">{String(rosterStats.pending)}</Badge></View>
                    <View style={s.row}><Text style={s.rowMuted}>Parent Approvals</Text><Badge variant={rosterStats.parentPending > 0 ? 'destructive' : 'secondary'}>{String(rosterStats.parentPending)}</Badge></View>
                    <View style={s.row}><Text style={s.rowMuted}>Saved Athletes</Text><Text style={s.rowVal}>{savedAthletes?.length || 0}</Text></View>
                    <View style={s.row}><Text style={s.rowMuted}>Profiles Viewed</Text><Text style={s.rowVal}>{stats?.profileViews || 0}</Text></View>
                  </CardContent>
                </Card>

                <Card style={s.insightCard}>
                  <CardHeader>
                    <CardTitle><View style={s.cardTitleRow}><TrendingUp size={18} color={colors.primary} /><Text style={s.cardTitleText}>Conversion Insights</Text></View></CardTitle>
                    <CardDescription>Subscription & visibility awareness</CardDescription>
                  </CardHeader>
                  <CardContent style={s.cardCol}>
                    <View style={s.iconRow}>
                      <AlertTriangle size={18} color={colors.accentForeground} />
                      <View style={s.flex1}>
                        <Text style={s.iconRowTitle}>{conversionData?.unsubscribed || 0} athletes unsubscribed</Text>
                        <Text style={s.iconRowSub}>Cannot receive recruiter messages</Text>
                      </View>
                    </View>
                    <View style={s.iconRow}>
                      <Lock size={18} color={colors.destructive} />
                      <View style={s.flex1}>
                        <Text style={s.iconRowTitle}>{conversionData?.lockedContacts || 0} locked contact attempts</Text>
                        <Text style={s.iconRowSub}>Recruiter messages waiting</Text>
                      </View>
                    </View>
                    {(conversionData?.unsubscribed || 0) > 0 ? (
                      <View style={s.tipBox}>
                        <Text style={s.tipText}>💡 Encourage your athletes to subscribe so recruiters can reach them directly.</Text>
                      </View>
                    ) : null}
                    <Button variant="outline" size="sm" onPress={() => setActiveTab('conversion')} style={s.fullW}>View Details</Button>
                  </CardContent>
                </Card>
              </View>

              {/* Quick Actions */}
              <Card>
                <CardHeader><CardTitle>Quick Actions</CardTitle></CardHeader>
                <CardContent>
                  <View style={s.quickGrid}>
                    <Button variant="outline" onPress={() => setActiveTab('teams')} style={s.quickBtn} leftIcon={<Trophy size={16} color={colors.foreground} />}>Create Team</Button>
                    <Button variant="outline" onPress={() => nav.navigate('AthleteSearch' as any)} style={s.quickBtn} leftIcon={<Search size={16} color={colors.foreground} />}>Find Athletes</Button>
                    <Button variant="outline" onPress={() => nav.navigate('LetterComposer' as any)} style={s.quickBtn} leftIcon={<FileCheck size={16} color={colors.foreground} />}>AI Letters</Button>
                    <Button variant="outline" onPress={() => nav.navigate('Messages' as any)} style={s.quickBtn} leftIcon={<Mail size={16} color={colors.foreground} />}>Send Message</Button>
                    <Button variant="outline" onPress={() => setActiveTab('discover')} style={s.quickBtn} leftIcon={<Megaphone size={16} color={colors.foreground} />}>Coach Directory</Button>
                  </View>
                </CardContent>
              </Card>
            </View>
          </TabsContent>

          {/* Teams */}
          <TabsContent value="teams">
            <View style={s.tabBody}>
              {user && clubProfile ? (
                <ClubTeamManagement clubProfileId={clubProfile.id} userId={user.id} />
              ) : null}
            </View>
          </TabsContent>

          {/* Camps */}
          <TabsContent value="camps">
            <View style={s.tabBody}>
              <View style={s.flexRowBetween}>
                <View style={s.flex1}>
                  <Text style={s.h3}>Camp Manager</Text>
                  <Text style={s.muted}>Create, run, and monetize camps for your club teams.</Text>
                </View>
                <Button variant="outline" size="sm" onPress={() => nav.navigate('CampStack' as any)} leftIcon={<ExternalLink size={14} color={colors.foreground} />}>Open Full Camp Manager</Button>
              </View>
              <CampManagerDashboard sport={clubProfile.sport || 'football'} />
            </View>
          </TabsContent>

          <TabsContent value="calendar">
            <View style={s.tabBody}><ClubEventCalendar /></View>
          </TabsContent>

          {/* Staff */}
          <TabsContent value="staff">
            <View style={s.tabBody}>
              <StaffManager onMessageStaff={(member: any) => nav.navigate('Messages', { recipientId: member.staff_user_id, recipientName: member.name || 'Staff' } as any)} />
              <StaffMessaging />
            </View>
          </TabsContent>

          {/* Conversion Insights */}
          <TabsContent value="conversion">
            <View style={s.tabBody}>
              <Card>
                <CardHeader>
                  <CardTitle><View style={s.cardTitleRow}><TrendingUp size={18} color={colors.foreground} /><Text style={s.cardTitleText}>Conversion Insight Panel</Text></View></CardTitle>
                  <CardDescription>Track your athletes' subscription status and recruiter engagement. You can see this data but cannot override subscription requirements.</CardDescription>
                </CardHeader>
                <CardContent style={s.cardCol}>
                  <View style={s.statGrid}>
                    <View style={s.statBox}>
                      <Text style={s.statBig}>{rosterStats.total}</Text>
                      <Text style={s.statLabel}>Total Roster Athletes</Text>
                    </View>
                    <View style={[s.statBox, s.statBoxAccent]}>
                      <Text style={[s.statBig, { color: colors.primary }]}>{conversionData?.unsubscribed || 0}</Text>
                      <Text style={s.statLabel}>Not Subscribed</Text>
                    </View>
                    <View style={[s.statBox, s.statBoxDestructive]}>
                      <Text style={[s.statBig, { color: colors.destructive }]}>{conversionData?.lockedContacts || 0}</Text>
                      <Text style={s.statLabel}>Locked Contact Attempts</Text>
                    </View>
                  </View>

                  {rosterStats.total > 0 ? (
                    <View style={s.cardCol}>
                      <View style={s.row}>
                        <Text style={s.muted}>Subscription Rate</Text>
                        <Text style={s.rowVal}>{subscriptionRate}%</Text>
                      </View>
                      <Progress value={subscriptionRate} />
                    </View>
                  ) : null}

                  <View style={s.guidanceBox}>
                    <View style={s.cardTitleRow}><Shield size={14} color={colors.foreground} /><Text style={s.guidanceTitle}>What You Can Do</Text></View>
                    <Text style={s.bullet}>• Encourage athletes to complete their profiles</Text>
                    <Text style={s.bullet}>• Remind families about the benefits of an active subscription</Text>
                    <Text style={s.bullet}>• Share team highlights to increase recruiter interest</Text>
                    <Text style={s.bullet}>• Use messaging to keep athletes engaged on the platform</Text>
                  </View>

                  <View style={s.restrictionBox}>
                    <View style={s.cardTitleRow}><Lock size={14} color={colors.destructive} /><Text style={[s.guidanceTitle, { color: colors.destructive }]}>Access Restrictions</Text></View>
                    <Text style={s.muted}>Club coaches cannot bypass athlete subscription requirements, unlock messages for athletes, or override parent approval requirements.</Text>
                  </View>
                </CardContent>
              </Card>
            </View>
          </TabsContent>

          {/* Contacts (CRM) */}
          <TabsContent value="crm">
            <View style={s.tabBody}><ClubCoachCRM /></View>
          </TabsContent>

          {/* Messaging */}
          <TabsContent value="messaging">
            <View style={s.tabBody}><ClubCoachMessagingHub /></View>
          </TabsContent>

          {/* Media */}
          <TabsContent value="media">
            <View style={s.tabBody}><ClubMediaGallery /></View>
          </TabsContent>

          {/* Social */}
          <TabsContent value="social">
            <View style={s.tabBody}>
              <ClubSocialLinks />
              {isWeb ? (
                <Card style={s.insightCard}>
                  <CardHeader>
                    <CardTitle><View style={s.cardTitleRow}><Globe size={18} color={colors.primary} /><Text style={s.cardTitleText}>Connect Your Club Website</Text></View></CardTitle>
                    <CardDescription>Embed your live OfferHound roster on your existing club website. Web-only feature.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button onPress={() => setWebsiteModalOpen(true)} leftIcon={<Globe size={14} color={colors.primaryForeground} />}>Connect Your Website</Button>
                  </CardContent>
                </Card>
              ) : null}
              <WebsiteIntegrationDecisionModal
                open={websiteModalOpen}
                onOpenChange={setWebsiteModalOpen}
                onConfirm={(tier) => {
                  toast({
                    title: `${tier === 'link' ? 'Link Only' : tier === 'embed' ? 'Embed Widget' : 'Custom Subdomain'} selected`,
                    description: "Setup wizard coming next. We'll guide you through the steps.",
                  });
                }}
              />
            </View>
          </TabsContent>

          {/* Discover */}
          <TabsContent value="discover">
            <View style={s.tabBody}><ClubCoachDirectoryTab clubProfile={clubProfile} /></View>
          </TabsContent>

          {/* Saved Athletes */}
          <TabsContent value="athletes">
            <View style={s.tabBody}>
              <Card>
                <CardHeader>
                  <CardTitle>Saved Athletes</CardTitle>
                  <CardDescription>Athletes you've saved for your teams or recruiting recommendations</CardDescription>
                </CardHeader>
                <CardContent>
                  {savedAthletes && savedAthletes.length > 0 ? (
                    <View style={s.savedGrid}>
                      {savedAthletes.map((saved: any) => (
                        <View key={saved.id} style={s.savedCard}>
                          <View style={s.savedRow}>
                            <Avatar size={40} source={saved.athlete?.profile_image_url ? { uri: saved.athlete.profile_image_url } : undefined} fallback={saved.athlete?.full_name?.charAt(0) || 'A'} />
                            <View style={s.flex1}>
                              <Text style={s.savedName} numberOfLines={1}>{saved.athlete?.full_name}</Text>
                              <Text style={s.savedPos}>{saved.athlete?.position}</Text>
                              <Text style={s.savedSchool} numberOfLines={1}>{saved.athlete?.school}</Text>
                              <Badge variant={saved.priority === 'high' ? 'default' : 'secondary'}>{String(saved.priority || 'normal')}</Badge>
                            </View>
                          </View>
                          <Button
                            variant="outline"
                            size="sm"
                            style={s.fullW}
                            onPress={() =>
                              nav.navigate('PublicProfileStack' as any, {
                                screen: 'PublicProfile',
                                params: { userId: saved.athlete_user_id || saved.athlete?.id },
                              })
                            }
                          >View Profile</Button>
                        </View>
                      ))}
                    </View>
                  ) : (
                    <View style={s.empty}>
                      <Users size={36} color={colors.mutedForeground} />
                      <Text style={s.emptyTitle}>No saved athletes</Text>
                      <Text style={s.muted}>Search for athletes to add to your roster or recommend to recruiters.</Text>
                      <Button onPress={() => nav.navigate('AthleteSearch' as any)} leftIcon={<Search size={14} color={colors.primaryForeground} />}>Search Athletes</Button>
                    </View>
                  )}
                </CardContent>
              </Card>
            </View>
          </TabsContent>

          {/* Profile */}
          <TabsContent value="profile">
            <View style={s.tabBody}>
              <Card>
                <CardHeader>
                  <CardTitle>Club Profile</CardTitle>
                  <CardDescription>Your club organization details</CardDescription>
                </CardHeader>
                <CardContent style={s.cardCol}>
                  <View style={s.profileRow}>
                    <Avatar size={80} source={clubProfile.club_logo_url || profile.image_url ? { uri: clubProfile.club_logo_url || profile.image_url } : undefined} fallback={clubProfile.club_name?.charAt(0) || 'C'} />
                    <View style={s.flex1}>
                      <Text style={s.profileName}>{clubProfile.club_name}</Text>
                      <Text style={s.profilePrimary}>{profile.name} • {profile.title || 'Head Coach'}</Text>
                      <Text style={s.muted}>{clubProfile.sport} • {clubProfile.club_type || 'Club'}</Text>
                      {clubProfile.city ? (
                        <Text style={s.muted}>{clubProfile.city}{clubProfile.state ? `, ${clubProfile.state}` : ''}</Text>
                      ) : null}
                    </View>
                  </View>

                  {/* PORT-PENDING: OrganizationLogoUpload prop shape differs from Lovable; */}
                  {/* skip in-place upload for now — surfaced in account settings. */}

                  <View style={s.detailGrid}>
                    {clubProfile.league_association ? (<View style={s.detailItem}><Text style={s.detailLabel}>League / Association</Text><Text style={s.detailVal}>{clubProfile.league_association}</Text></View>) : null}
                    {clubProfile.age_group ? (<View style={s.detailItem}><Text style={s.detailLabel}>Age Group</Text><Text style={s.detailVal}>{clubProfile.age_group}</Text></View>) : null}
                    {clubProfile.team_level ? (<View style={s.detailItem}><Text style={s.detailLabel}>Team Level</Text><Text style={s.detailVal}>{clubProfile.team_level}</Text></View>) : null}
                    {clubProfile.years_coaching ? (<View style={s.detailItem}><Text style={s.detailLabel}>Years Coaching</Text><Text style={s.detailVal}>{String(clubProfile.years_coaching)}</Text></View>) : null}
                    {clubProfile.website ? (
                      <View style={s.detailItem}>
                        <Text style={s.detailLabel}>Website</Text>
                        <Pressable onPress={() => Linking.openURL(clubProfile.website)}>
                          <Text style={[s.detailVal, { color: colors.primary }]}>{clubProfile.website}</Text>
                        </Pressable>
                      </View>
                    ) : null}
                    <View style={s.detailItem}><Text style={s.detailLabel}>Email</Text><Text style={s.detailVal}>{profile.email}</Text></View>
                  </View>

                  {clubProfile.bio ? (
                    <View>
                      <Text style={s.detailLabel}>Bio</Text>
                      <Text style={s.bioText}>{clubProfile.bio}</Text>
                    </View>
                  ) : null}

                  <Button variant="outline" onPress={() => nav.navigate('SettingsStack' as any)}>Edit Profile Settings</Button>
                </CardContent>
              </Card>
            </View>
          </TabsContent>
        </Tabs>

        {/* Transfer Portal */}
        <View style={s.tabBody}>
          <TransferPortalFeed sport={clubProfile.sport} />
        </View>
      </ScrollView>
    </TermsAcceptanceGate>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: spacing.md, paddingBottom: spacing.xxxl, gap: spacing.lg },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: spacing.sm, paddingHorizontal: spacing.sm,
    backgroundColor: colors.card, borderRadius: 12, borderWidth: 1, borderColor: colors.border,
    flexWrap: 'wrap', gap: spacing.sm,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexShrink: 1 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  headerSep: { width: 1, height: 20, backgroundColor: colors.border },
  brand: { fontFamily: typography.fontFamily.heading, fontSize: 18, color: colors.primary, letterSpacing: 0.5 },
  brandFg: { color: colors.foreground },
  brandTm: { color: colors.primary, fontFamily: typography.fontFamily.body, fontSize: 9 },
  headerTitle: { fontFamily: typography.fontFamily.heading, fontSize: 16, color: colors.mutedForeground, letterSpacing: 0.5 },
  headerSubtitle: { fontFamily: typography.fontFamily.body, fontSize: 11, color: colors.primary },

  banner: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  bannerInfo: { flex: 1, minWidth: 180 },
  bannerName: { fontFamily: typography.fontFamily.heading, fontSize: 22, color: colors.foreground, letterSpacing: 0.5 },
  bannerMeta: { fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.sm, color: colors.mutedForeground },
  bannerLoc: { fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.xs, color: colors.mutedForeground },
  bannerActions: { flexDirection: 'row', gap: spacing.xs, flexWrap: 'wrap' },

  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  kpiCard: { flexBasis: '48%', flexGrow: 1 },
  kpiContent: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm },
  kpiIconWrap: { padding: spacing.xs, backgroundColor: colors.muted, borderRadius: 8 },
  kpiValue: { fontFamily: typography.fontFamily.heading, fontSize: 22, color: colors.foreground, letterSpacing: 0.5 },
  kpiLabel: { fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.xs, color: colors.mutedForeground },

  tabListScroll: { paddingVertical: spacing.xs },
  tabsList: { flexDirection: 'row', gap: spacing.xs, paddingHorizontal: spacing.xs },
  tabsTrigger: { paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, minWidth: 70 },
  tabsTriggerInner: { alignItems: 'center', gap: 2 },
  tabsTriggerLabel: { fontFamily: typography.fontFamily.bodyMedium, fontSize: 10, color: colors.primary },
  tabsTriggerLabelActive: { color: colors.primaryForeground },

  tabBody: { gap: spacing.md, paddingTop: spacing.sm },

  cardGrid3: { gap: spacing.sm },
  cardCol: { gap: spacing.sm },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  cardTitleText: { fontFamily: typography.fontFamily.bodySemiBold, fontSize: typography.fontSize.base, color: colors.foreground },

  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rowMuted: { fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.sm, color: colors.mutedForeground },
  rowVal: { fontFamily: typography.fontFamily.bodyMedium, fontSize: typography.fontSize.sm, color: colors.foreground },

  fullW: { width: '100%' },
  flex1: { flex: 1 },
  flexRowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: spacing.sm },

  insightCard: { borderColor: colors.primary },
  iconRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  iconRowTitle: { fontFamily: typography.fontFamily.bodyMedium, fontSize: typography.fontSize.sm, color: colors.foreground },
  iconRowSub: { fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.xs, color: colors.mutedForeground },
  tipBox: { padding: spacing.sm, backgroundColor: colors.accent, borderRadius: 8, borderWidth: 1, borderColor: colors.border },
  tipText: { fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.xs, color: colors.accentForeground },

  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  quickBtn: { flexBasis: '48%', flexGrow: 1, paddingVertical: spacing.md },

  h3: { fontFamily: typography.fontFamily.bodyBold, fontSize: typography.fontSize.lg, color: colors.foreground },
  muted: { fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.sm, color: colors.mutedForeground },

  statGrid: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  statBox: { flex: 1, minWidth: 100, padding: spacing.md, backgroundColor: colors.secondary, borderRadius: 8, alignItems: 'center' },
  statBoxAccent: { backgroundColor: colors.accent, borderWidth: 1, borderColor: colors.border },
  statBoxDestructive: { backgroundColor: 'rgba(220,40,40,0.1)', borderWidth: 1, borderColor: 'rgba(220,40,40,0.2)' },
  statBig: { fontFamily: typography.fontFamily.heading, fontSize: 28, color: colors.foreground, letterSpacing: 0.5 },
  statLabel: { fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.sm, color: colors.mutedForeground, textAlign: 'center', marginTop: 2 },

  guidanceBox: { padding: spacing.sm, backgroundColor: colors.muted, borderRadius: 8, gap: 4 },
  guidanceTitle: { fontFamily: typography.fontFamily.bodyMedium, fontSize: typography.fontSize.sm, color: colors.foreground },
  bullet: { fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.sm, color: colors.mutedForeground, marginLeft: spacing.sm },
  restrictionBox: { padding: spacing.sm, backgroundColor: 'rgba(220,40,40,0.05)', borderRadius: 8, borderWidth: 1, borderColor: 'rgba(220,40,40,0.2)', gap: 4 },

  savedGrid: { gap: spacing.sm },
  savedCard: { padding: spacing.sm, backgroundColor: colors.secondary, borderRadius: 8, borderWidth: 1, borderColor: colors.border, gap: spacing.sm },
  savedRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
  savedName: { fontFamily: typography.fontFamily.bodyMedium, fontSize: typography.fontSize.sm, color: colors.foreground },
  savedPos: { fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.xs, color: colors.primary },
  savedSchool: { fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.xs, color: colors.mutedForeground },

  empty: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xl },
  emptyTitle: { fontFamily: typography.fontFamily.bodySemiBold, fontSize: typography.fontSize.base, color: colors.foreground },

  profileRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  profileName: { fontFamily: typography.fontFamily.bodyBold, fontSize: typography.fontSize.lg, color: colors.foreground },
  profilePrimary: { fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.sm, color: colors.primary },
  detailGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  detailItem: { flexBasis: '45%', flexGrow: 1 },
  detailLabel: { fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.xs, color: colors.mutedForeground, marginBottom: 2 },
  detailVal: { fontFamily: typography.fontFamily.bodyMedium, fontSize: typography.fontSize.sm, color: colors.foreground },
  bioText: { fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.sm, color: colors.foreground, marginTop: 2 },
});
