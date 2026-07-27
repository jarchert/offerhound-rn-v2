// HSCoachDashboardScreen — full RN port of Lovable web `src/pages/HSCoachDashboard.tsx`.
// Preserves the 16-tab dashboard structure (Overview, Roster, AI Matches, Team Needs,
// Referrals, Endorsements, Transcripts, Film, Pipeline, Calendar, Staff, Contacts,
// Messaging, Media, Discover, Profile + Saved Athletes) so future polish maps 1:1 to
// the web design. Inline `// PORT-PENDING:` markers note web-only composed components
// or hooks without an exact RN counterpart.
import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, SafeAreaView, ActivityIndicator, Pressable,
} from 'react-native';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import {
  Loader2, Users, Search, Eye, LogOut, LayoutDashboard, MessageSquare,
  UserCog, Trophy, School, Mail, UserPlus, Image as ImageIcon, Calendar, Contact,
  Share2, Star, GraduationCap, Save, Telescope, FileCheck, Film, Award,
  Sparkles, RefreshCw, Target, ArrowRightLeft,
} from 'lucide-react-native';
import { useQuery } from '@tanstack/react-query';

import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useHSCoachProfile, useUpdateHSCoachProfile } from '@/hooks/useHSCoachProfile';
import { useSavedAthletes } from '@/hooks/useSavedAthletes';
import { useHasAcceptedTerms } from '@/hooks/useTermsAcceptance';
import { useCoachAthleteMatches } from '@/hooks/useCoachAthleteMatches';
import { useRefreshCoachAthleteMatches } from '@/hooks/useRefreshCoachAthleteMatches';
import { useToast } from '@/hooks/use-toast';

import { TermsAcceptanceGate } from '@/components/TermsAcceptanceGate';
import { ClubTeamManagement } from '@/components/ClubTeamManagement';
import { ClubCoachCRM } from '@/components/ClubCoachCRM';
import { ClubCoachMessagingHub } from '@/components/ClubCoachMessagingHub';
import { StaffManager } from '@/components/StaffManager';
import { StaffMessaging } from '@/components/StaffMessaging';
import { ClubMediaGallery } from '@/components/ClubMediaGallery';
import { ClubEventCalendar } from '@/components/ClubEventCalendar';
import { ClubCoachDirectoryTab } from '@/components/club/ClubCoachDirectoryTab';
import { TransferPortalFeed } from '@/components/TransferPortalFeed';
import { RecruitingPipeline } from '@/components/RecruitingPipeline';
import { PositionNeedsBoard } from '@/components/PositionNeedsBoard';
import { CoachProfileImageUpload } from '@/components/CoachProfileImageUpload';
import { HSCoachEndorsementComposer } from '@/components/hs-coach/HSCoachEndorsementComposer';
import { HSCoachReferralPanel } from '@/components/hs-coach/HSCoachReferralPanel';
import { HSCoachTranscriptVerificationTab } from '@/components/hs-coach/HSCoachTranscriptVerificationTab';
import { HSCoachFilmVerificationTab } from '@/components/hs-coach/HSCoachFilmVerificationTab';
import { TransferRequestsScreen } from '@/screens/hs-coach/TransferRequestsScreen';
import { ShareRoleCardDialog } from '@/components/ShareRoleCardDialog';
import { AthleteMatchCard } from '@/components/athlete/AthleteMatchCard';

import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Textarea } from '@/components/ui/Textarea';
import { colors, typography, spacing, radius } from '@/lib/theme';
import type { RootStackParamList } from '@/navigation/RootNavigator';

// PORT-PENDING: LetterButton — RN equivalent of the shared <LetterButton> composite.
// Renders a minimal stub button that opens the letter composer, matching prop shape.
function LetterButton({
  athlete, surface, size,
}: { athlete: any; surface?: string; size?: 'sm' | 'default' | 'lg' }) {
  const nav = useNavigation<NavigationProp<RootStackParamList>>();
  return (
    <Button
      variant="outline"
      size={size || 'sm'}
      leftIcon={<Mail size={14} color={colors.primary} />}
      onPress={() => nav.navigate('LetterComposer', {
        seed: { athlete, surface },
      })}
    >
      Letter
    </Button>
  );
}

export default function HSCoachDashboardScreen() {
  const nav = useNavigation<NavigationProp<RootStackParamList>>();
  const { user, isAuthenticated, loading: authLoading, signOut } = useAuth();
  const { data: hsProfile, isLoading: profileLoading, isFetched: profileFetched } = useHSCoachProfile();
  const updateProfile = useUpdateHSCoachProfile();
  const { data: savedAthletes } = useSavedAthletes();
  const { data: aiMatches = [], isLoading: matchesLoading } = useCoachAthleteMatches();
  const { refreshMatches, isRefreshing: refreshingMatches } = useRefreshCoachAthleteMatches();
  const { hasAccepted: hasAcceptedTerms, isLoading: termsLoading } = useHasAcceptedTerms();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('overview');

  const { data: teams } = useQuery({
    queryKey: ['hs-teams', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from('teams')
        .select('*, team_rosters(id, status)')
        .eq('coach_user_id', user.id)
        .order('created_at', { ascending: false });
      return data || [];
    },
    enabled: !!user,
  });

  const rosterStats = useMemo(() => {
    if (!teams) return { total: 0, active: 0, pending: 0 };
    let total = 0, active = 0, pending = 0;
    (teams as any[]).forEach((t: any) => {
      (t.team_rosters || []).forEach((r: any) => {
        total++;
        if (r.status === 'approved' || r.status === 'complete') active++;
        else if (r.status === 'invited' || r.status === 'joined') pending++;
      });
    });
    return { total, active, pending };
  }, [teams]);

  const { data: mediaCount } = useQuery({
    queryKey: ['hs-media-count', user?.id],
    queryFn: async () => {
      if (!user) return 0;
      const { count } = await supabase
        .from('club_media')
        .select('id', { count: 'exact', head: true })
        .eq('coach_user_id', user.id);
      return count || 0;
    },
    enabled: !!user,
  });

  const { data: contactsCount } = useQuery({
    queryKey: ['hs-contacts-count', user?.id],
    queryFn: async () => {
      if (!user) return 0;
      const { count } = await supabase
        .from('club_coach_contacts')
        .select('id', { count: 'exact', head: true })
        .eq('coach_user_id', user.id);
      return count || 0;
    },
    enabled: !!user,
  });

  const handleSignOut = async () => {
    nav.navigate('PublicTabs' as never);
    await signOut();
  };

  useEffect(() => {
    if (!authLoading && !isAuthenticated) nav.navigate('AuthStack' as never);
  }, [authLoading, isAuthenticated, nav]);

  useEffect(() => {
    if (!authLoading && profileFetched && !hsProfile && isAuthenticated) {
      nav.navigate('OnboardingStack' as never);
    }
  }, [authLoading, profileFetched, hsProfile, isAuthenticated, nav]);

  if (authLoading || profileLoading || termsLoading) {
    return (
      <View style={s.loaderRoot}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!hsProfile) return null;

  const activeTeams = ((teams as any[]) || []).filter((t: any) => t.status !== 'archived');
  const profileAny = hsProfile as any;

  return (
    <TermsAcceptanceGate>
      {/* PORT-PENDING: SEO — web-only meta component, intentionally omitted on RN */}
      <SafeAreaView style={s.root}>
        <ScrollView contentContainerStyle={s.content}>
          {/* Header */}
          <View style={s.header}>
            <View style={{ flex: 1 }}>
              <Text style={s.brand}>
                OFFER<Text style={{ color: colors.foreground }}>HOUND</Text>
                <Text style={{ color: colors.primary, fontSize: 10 }}>™</Text>
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: 2 }}>
                <School size={14} color={colors.foregroundSubtle} />
                <Text style={s.headerLabel}>HS Coach Dashboard</Text>
              </View>
              <Text style={s.headerSchool}>{profileAny.school_name}</Text>
            </View>
            <View style={{ flexDirection: 'row', gap: spacing.xs }}>
              <ShareRoleCardDialog role="hs_coach">
                <Button variant="outline" size="sm" leftIcon={<Share2 size={14} color={colors.primary} />}>
                  Share Card
                </Button>
              </ShareRoleCardDialog>
              <Button
                variant="ghost" size="sm"
                leftIcon={<LogOut size={14} color={colors.foreground} />}
                onPress={handleSignOut}
              >
                Log Out
              </Button>
            </View>
          </View>

          {/* Profile Summary */}
          <View style={s.profileSummary}>
            <Avatar
              source={profileAny.image_url ? { uri: profileAny.image_url } : null}
              fallback={profileAny.name?.charAt(0) || 'H'}
              size={64}
            />
            <View style={{ flex: 1 }}>
              <Text style={s.title}>{profileAny.name}</Text>
              <Text style={s.subtitle}>
                {profileAny.title} • {profileAny.sport}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <School size={12} color={colors.primary} />
                <Text style={s.locText}>
                  {profileAny.school_name}
                  {profileAny.school_city ? ` • ${profileAny.school_city}` : ''}
                  {profileAny.school_state ? `, ${profileAny.school_state}` : ''}
                </Text>
              </View>
              {profileAny.team_mascot ? (
                <Text style={s.mascot}>
                  🏈 {profileAny.team_mascot}
                  {profileAny.school_classification ? ` • ${profileAny.school_classification}` : ''}
                </Text>
              ) : null}
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
              <Button size="sm" leftIcon={<Search size={14} color={colors.primaryForeground} />}>
                Search Athletes
              </Button>
              <Button
                variant="outline" size="sm"
                leftIcon={<FileCheck size={14} color={colors.primary} />}
                onPress={() => nav.navigate('LetterComposer' as never)}
              >
                AI Letters
              </Button>
              <Button
                variant="outline" size="sm"
                leftIcon={<MessageSquare size={14} color={colors.primary} />}
                onPress={() => nav.navigate('Messages' as never)}
              >
                Messages
              </Button>
            </View>
          </View>

          {/* KPI Cards */}
          <View style={s.statsGrid}>
            <KpiCard icon={<Trophy size={18} color={colors.primary} />} value={activeTeams.length} label="Teams" />
            <KpiCard icon={<Users size={18} color={colors.primary} />} value={rosterStats.total} label="Roster Athletes" />
            <KpiCard icon={<UserPlus size={18} color={colors.accent} />} value={rosterStats.pending} label="Pending" />
            <KpiCard icon={<Star size={18} color={colors.primary} />} value={savedAthletes?.length || 0} label="Saved Athletes" />
            <KpiCard icon={<Contact size={18} color={colors.primary} />} value={contactsCount || 0} label="Contacts" />
            <KpiCard icon={<ImageIcon size={18} color={colors.primary} />} value={mediaCount || 0} label="Media" />
          </View>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="overview"><TabLabel icon={LayoutDashboard} label="Overview" /></TabsTrigger>
              <TabsTrigger value="roster"><TabLabel icon={Users} label="Roster" /></TabsTrigger>
              <TabsTrigger value="ai-matches"><TabLabel icon={Sparkles} label="AI Matches" /></TabsTrigger>
              <TabsTrigger value="team-needs"><TabLabel icon={Target} label="Team Needs" /></TabsTrigger>
              <TabsTrigger value="referrals"><TabLabel icon={GraduationCap} label="Referrals" /></TabsTrigger>
              <TabsTrigger value="endorsements"><TabLabel icon={Award} label="Endorsements" /></TabsTrigger>
              <TabsTrigger value="transcripts"><TabLabel icon={FileCheck} label="Transcripts" /></TabsTrigger>
              <TabsTrigger value="film"><TabLabel icon={Film} label="Film" /></TabsTrigger>
              <TabsTrigger value="pipeline"><TabLabel icon={Trophy} label="Pipeline" /></TabsTrigger>
              <TabsTrigger value="calendar"><TabLabel icon={Calendar} label="Events" /></TabsTrigger>
              <TabsTrigger value="staff"><TabLabel icon={UserCog} label="Staff" /></TabsTrigger>
              <TabsTrigger value="crm"><TabLabel icon={Contact} label="Contacts" /></TabsTrigger>
              <TabsTrigger value="messaging"><TabLabel icon={MessageSquare} label="Messaging" /></TabsTrigger>
              <TabsTrigger value="media"><TabLabel icon={ImageIcon} label="Media" /></TabsTrigger>
              <TabsTrigger value="discover"><TabLabel icon={Telescope} label="Coaches & Scouts" /></TabsTrigger>
              <TabsTrigger value="athletes"><TabLabel icon={Star} label="Saved" /></TabsTrigger>
              <TabsTrigger value="profile"><TabLabel icon={Eye} label="Profile" /></TabsTrigger>
              <TabsTrigger value="transfers"><TabLabel icon={ArrowRightLeft} label="Transfers" /></TabsTrigger>
            </TabsList>

            {/* Overview */}
            <TabsContent value="overview">
              <View style={{ gap: spacing.md }}>
                <Card>
                  <CardHeader>
                    <CardTitle><Text style={s.cardTitleRow}><Trophy size={16} color={colors.foreground} /> Team Overview</Text></CardTitle>
                  </CardHeader>
                  <CardContent>
                    <KvRow label="Active Teams" value={String(activeTeams.length)} />
                    <KvRow label="Total Athletes" value={String(rosterStats.total)} />
                    <KvRow label="Active / Approved" value={String(rosterStats.active)} valueColor={colors.primary} />
                    {profileAny.career_record ? (
                      <KvRow label="Career Record" value={profileAny.career_record} />
                    ) : null}
                    <Button variant="outline" size="sm" style={{ marginTop: spacing.sm }} onPress={() => setActiveTab('roster')}>
                      Manage Roster
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle><Text style={s.cardTitleRow}><School size={16} color={colors.foreground} /> School Info</Text></CardTitle>
                  </CardHeader>
                  <CardContent>
                    <KvRow label="School" value={profileAny.school_name} />
                    {profileAny.school_classification ? (
                      <KvRow label="Classification" valueNode={<Badge variant="secondary">{profileAny.school_classification}</Badge>} />
                    ) : null}
                    {profileAny.conference_name ? (
                      <KvRow label="Conference" value={profileAny.conference_name} />
                    ) : null}
                    {profileAny.school_district ? (
                      <KvRow label="District" value={profileAny.school_district} />
                    ) : null}
                    {(profileAny.school_city || profileAny.school_state) ? (
                      <KvRow
                        label="Location"
                        value={[profileAny.school_city, profileAny.school_state].filter(Boolean).join(', ')}
                      />
                    ) : null}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle><Text style={s.cardTitleRow}><GraduationCap size={16} color={colors.foreground} /> College Referrals</Text></CardTitle>
                    <CardDescription>Help your athletes get recruited</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <KvRow label="Saved Athletes" value={String(savedAthletes?.length || 0)} />
                    <View style={s.tip}>
                      <Text style={s.tipText}>
                        💡 Save athletes from your roster and recommend them to college coaches through the platform.
                      </Text>
                    </View>
                    <Button variant="outline" size="sm" style={{ marginTop: spacing.sm }} onPress={() => setActiveTab('athletes')}>
                      View Saved Athletes
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader><CardTitle>Quick Actions</CardTitle></CardHeader>
                  <CardContent>
                    <View style={s.quickGrid}>
                      <QuickAction icon={Users} label="Manage Roster" onPress={() => setActiveTab('roster')} />
                      <QuickAction icon={Search} label="Find Athletes" onPress={() => {/* PORT-PENDING: navigate to /athletes */}} />
                      <QuickAction icon={FileCheck} label="AI Letters" onPress={() => nav.navigate('LetterComposer' as never)} />
                      <QuickAction icon={Mail} label="Messages" onPress={() => nav.navigate('Messages' as never)} />
                      <QuickAction icon={GraduationCap} label="College Coaches" onPress={() => {/* PORT-PENDING: /coaches route */}} />
                    </View>
                  </CardContent>
                </Card>
              </View>
            </TabsContent>

            {/* Roster Tab */}
            <TabsContent value="roster">
              {user && hsProfile ? (
                <ClubTeamManagement clubProfileId={profileAny.id} userId={user.id} />
              ) : null}
            </TabsContent>

            {/* AI Matches Tab */}
            <TabsContent value="ai-matches">
              <Card>
                <CardHeader>
                  <View style={s.cardHeaderRow}>
                    <View style={{ flex: 1 }}>
                      <CardTitle>
                        <Text style={s.cardTitleRow}>
                          <Sparkles size={16} color={colors.primary} /> AI Roster Needs Matches
                        </Text>
                      </CardTitle>
                      <CardDescription>
                        Athletes ranked against your school, position needs, and recruiting criteria.
                      </CardDescription>
                    </View>
                    <Button
                      variant="outline" size="sm"
                      onPress={() => refreshMatches()}
                      disabled={refreshingMatches}
                      leftIcon={<RefreshCw size={14} color={colors.primary} />}
                    >
                      {refreshingMatches ? 'Refreshing...' : 'Refresh'}
                    </Button>
                  </View>
                </CardHeader>
                <CardContent>
                  {matchesLoading ? (
                    <View style={s.center}><ActivityIndicator color={colors.primary} /></View>
                  ) : (aiMatches as any[]).length === 0 ? (
                    <View style={s.emptyState}>
                      <Users size={36} color={colors.foregroundSubtle} />
                      <Text style={[s.empTitle, { marginTop: spacing.sm }]}>No AI matches yet</Text>
                      <Text style={s.muted}>
                        Add position needs and complete your school profile to generate AI roster-fit matches.
                      </Text>
                      <Button
                        variant="outline" size="sm"
                        leftIcon={<Search size={14} color={colors.primary} />}
                        style={{ marginTop: spacing.md }}
                      >
                        Search Athletes
                      </Button>
                    </View>
                  ) : (
                    <View style={{ gap: spacing.sm }}>
                      {(aiMatches as any[]).map((match: any) => (
                        <AthleteMatchCard
                          key={match.id}
                          variant="full"
                          athlete={{
                            id: match.athlete?.id || match.athlete_profile_id,
                            full_name: match.athlete?.full_name,
                            position: match.athlete?.position,
                            school: match.athlete?.school,
                            graduation_year: match.athlete?.graduation_year,
                            city: match.athlete?.city,
                            state: match.athlete?.state,
                            profile_image_url: match.athlete?.profile_image_url,
                            custom_url: match.athlete?.custom_url,
                            email: match.athlete?.email,
                          }}
                          scores={{
                            match_score: match.match_score,
                            athletic_fit_score: match.athletic_fit_score,
                            academic_fit_score: match.academic_fit_score,
                            geographic_fit_score: match.geographic_fit_score,
                            match_reason: match.match_reason,
                            priority: match.priority || undefined,
                          }}
                          letterSlot={
                            <LetterButton
                              athlete={match.athlete}
                              surface="hs-coach-dashboard"
                              size="sm"
                            />
                          }
                          onMessage={() => nav.navigate('Messages' as never)}
                        />
                      ))}
                    </View>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="team-needs">
              <PositionNeedsBoard sport={profileAny.sport || 'football'} />
            </TabsContent>

            <TabsContent value="calendar"><ClubEventCalendar /></TabsContent>
            <TabsContent value="referrals"><HSCoachReferralPanel /></TabsContent>
            <TabsContent value="endorsements"><HSCoachEndorsementComposer /></TabsContent>
            <TabsContent value="transcripts"><HSCoachTranscriptVerificationTab /></TabsContent>
            <TabsContent value="film"><HSCoachFilmVerificationTab /></TabsContent>
            <TabsContent value="pipeline"><RecruitingPipeline /></TabsContent>

            <TabsContent value="staff">
              <View style={{ gap: spacing.md }}>
                <StaffManager onMessageStaff={() => {}} />
                <StaffMessaging />
              </View>
            </TabsContent>

            <TabsContent value="crm"><ClubCoachCRM /></TabsContent>
            <TabsContent value="messaging"><ClubCoachMessagingHub /></TabsContent>
            <TabsContent value="media"><ClubMediaGallery /></TabsContent>

            <TabsContent value="discover">
              <ClubCoachDirectoryTab clubProfile={{ sport: profileAny.sport, state: profileAny.school_state }} />
            </TabsContent>

            {/* Saved Athletes Tab */}
            <TabsContent value="athletes">
              <Card>
                <CardHeader>
                  <CardTitle>Saved Athletes</CardTitle>
                  <CardDescription>Athletes you've saved for college referrals or roster tracking</CardDescription>
                </CardHeader>
                <CardContent>
                  {savedAthletes && (savedAthletes as any[]).length > 0 ? (
                    <View style={s.savedGrid}>
                      {(savedAthletes as any[]).map((saved: any) => (
                        <View key={saved.id} style={s.savedCard}>
                          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                            <Avatar
                              source={saved.athlete?.profile_image_url ? { uri: saved.athlete.profile_image_url } : null}
                              fallback={saved.athlete?.full_name?.charAt(0) || 'A'}
                              size={40}
                            />
                            <View style={{ flex: 1 }}>
                              <Text style={s.rowTitle} numberOfLines={1}>{saved.athlete?.full_name}</Text>
                              <Text style={[s.rowMeta, { color: colors.primary }]}>{saved.athlete?.position}</Text>
                              <Text style={s.rowMeta} numberOfLines={1}>{saved.athlete?.school}</Text>
                              <Badge variant={saved.priority === 'high' ? 'default' : 'secondary'}>
                                {saved.priority || 'normal'}
                              </Badge>
                            </View>
                          </View>
                          <Button variant="outline" size="sm" style={{ marginTop: spacing.sm }}>
                            View Profile
                          </Button>
                        </View>
                      ))}
                    </View>
                  ) : (
                    <View style={s.emptyState}>
                      <Users size={36} color={colors.foregroundSubtle} />
                      <Text style={[s.empTitle, { marginTop: spacing.sm }]}>No saved athletes</Text>
                      <Text style={s.muted}>Search for athletes to recommend to college programs.</Text>
                      <Button leftIcon={<Search size={14} color={colors.primaryForeground} />} style={{ marginTop: spacing.md }}>
                        Search Athletes
                      </Button>
                    </View>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Profile Tab */}
            <TabsContent value="profile">
              <HSCoachProfileEditor profile={profileAny} onUpdate={updateProfile} />
            </TabsContent>

            {/* Transfers Tab */}
            <TabsContent value="transfers">
              <TransferRequestsScreen />
            </TabsContent>
          </Tabs>

          <View style={{ marginTop: spacing.lg }}>
            <TransferPortalFeed sport={profileAny.sport} />
          </View>
        </ScrollView>
      </SafeAreaView>
    </TermsAcceptanceGate>
  );
}

// ---------- Profile Editor Sub-component ----------
function HSCoachProfileEditor({ profile, onUpdate }: { profile: any; onUpdate: any }) {
  const [form, setForm] = useState({
    name: profile.name || '',
    title: profile.title || '',
    email: profile.email || '',
    phone: profile.phone || '',
    bio: profile.bio || '',
    twitter: profile.twitter || '',
    school_name: profile.school_name || '',
    school_city: profile.school_city || '',
    school_state: profile.school_state || '',
    school_district: profile.school_district || '',
    school_classification: profile.school_classification || '',
    conference_name: profile.conference_name || '',
    position_coached: profile.position_coached || '',
    team_mascot: profile.team_mascot || '',
    career_record: profile.career_record || '',
    years_coaching: profile.years_coaching?.toString() || '',
    years_at_school: profile.years_at_school?.toString() || '',
    website: profile.website || '',
  });
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const handleSave = async () => {
    setSaving(true);
    try {
      await onUpdate.mutateAsync({
        ...form,
        years_coaching: form.years_coaching ? parseInt(form.years_coaching, 10) : null,
        years_at_school: form.years_at_school ? parseInt(form.years_at_school, 10) : null,
        phone: form.phone || null,
        bio: form.bio || null,
        twitter: form.twitter || null,
        school_district: form.school_district || null,
        school_classification: form.school_classification || null,
        conference_name: form.conference_name || null,
        team_mascot: form.team_mascot || null,
        career_record: form.career_record || null,
        website: form.website || null,
      });
      toast({ title: 'Profile updated', description: 'Your changes have been saved.' });
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const update = (key: string, value: string) => setForm(f => ({ ...f, [key]: value }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Edit HS Coach Profile</CardTitle>
        <CardDescription>Update your school and coaching details</CardDescription>
      </CardHeader>
      <CardContent>
        {/* Profile Image */}
        <View style={s.imageRow}>
          <CoachProfileImageUpload
            coachId={profile.id}
            currentImageUrl={profile.image_url}
            coachName={profile.name}
            onImageUpdated={async (url: string | null) => {
              await onUpdate.mutateAsync({ image_url: url });
            }}
          />
          <Text style={[s.muted, { flex: 1 }]}>Click the photo to upload or change your headshot.</Text>
        </View>

        <View style={s.formGrid}>
          <FormField label="Full Name" value={form.name} onChange={(v) => update('name', v)} />
          <FormField label="Title" value={form.title} onChange={(v) => update('title', v)} />
          <FormField label="Email" value={form.email} onChange={(v) => update('email', v)} keyboardType="email-address" />
          <FormField label="Phone" value={form.phone} onChange={(v) => update('phone', v)} />
          <FormField label="Twitter/X" value={form.twitter} onChange={(v) => update('twitter', v)} placeholder="@handle" />
          <FormField label="Website" value={form.website} onChange={(v) => update('website', v)} placeholder="https://..." />
        </View>

        <View style={{ marginTop: spacing.md }}>
          <Label>Bio</Label>
          <Textarea
            value={form.bio}
            onChangeText={(v) => update('bio', v)}
            rows={3}
            placeholder="Tell athletes about your coaching philosophy..."
          />
        </View>

        <Text style={s.sectionHeading}>School Details</Text>
        <View style={s.formGrid}>
          <FormField label="School Name" value={form.school_name} onChange={(v) => update('school_name', v)} />
          <FormField label="City" value={form.school_city} onChange={(v) => update('school_city', v)} />
          <FormField label="State" value={form.school_state} onChange={(v) => update('school_state', v)} />
          <FormField label="District / Parish" value={form.school_district} onChange={(v) => update('school_district', v)} />
          <FormField label="Classification" value={form.school_classification} onChange={(v) => update('school_classification', v)} />
          <FormField label="Conference" value={form.conference_name} onChange={(v) => update('conference_name', v)} />
          <FormField label="Position Coached" value={form.position_coached} onChange={(v) => update('position_coached', v)} />
          <FormField label="Team Mascot" value={form.team_mascot} onChange={(v) => update('team_mascot', v)} />
          <FormField label="Career Record" value={form.career_record} onChange={(v) => update('career_record', v)} />
          <FormField label="Years Coaching" value={form.years_coaching} onChange={(v) => update('years_coaching', v)} keyboardType="numeric" />
          <FormField label="Years at This School" value={form.years_at_school} onChange={(v) => update('years_at_school', v)} keyboardType="numeric" />
        </View>

        <Button
          onPress={handleSave}
          disabled={saving}
          style={{ marginTop: spacing.md }}
          leftIcon={<Save size={14} color={colors.primaryForeground} />}
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </CardContent>
    </Card>
  );
}

// ---------- Local helpers ----------
function FormField({
  label, value, onChange, placeholder, keyboardType,
}: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; keyboardType?: 'email-address' | 'numeric' | 'default';
}) {
  return (
    <View style={s.formField}>
      <Label>{label}</Label>
      <Input
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        keyboardType={keyboardType || 'default'}
      />
    </View>
  );
}

function KpiCard({ icon, value, label }: { icon: React.ReactNode; value: number; label: string }) {
  return (
    <Card style={s.kpiCard}>
      <CardContent style={s.kpiContent}>
        <View style={s.kpiIconWrap}>{icon}</View>
        <View>
          <Text style={s.kpiValue}>{value}</Text>
          <Text style={s.kpiLabel}>{label}</Text>
        </View>
      </CardContent>
    </Card>
  );
}

function KvRow({
  label, value, valueNode, valueColor,
}: { label: string; value?: string; valueNode?: React.ReactNode; valueColor?: string }) {
  return (
    <View style={s.kvRow}>
      <Text style={s.muted}>{label}</Text>
      {valueNode || (
        <Text style={[s.kvValue, valueColor ? { color: valueColor } : null]}>{value}</Text>
      )}
    </View>
  );
}

function QuickAction({ icon: Icon, label, onPress }: { icon: any; label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={s.quickBtn}>
      <Icon size={20} color={colors.primary} />
      <Text style={s.quickLabel}>{label}</Text>
    </Pressable>
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
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md, paddingBottom: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  brand: { fontFamily: typography.fontFamily.heading, fontSize: typography.size.xl, color: colors.primary, letterSpacing: typography.letterSpacing.heading },
  headerLabel: { color: colors.foregroundSubtle, fontFamily: typography.fontFamily.heading, fontSize: typography.size.base, letterSpacing: typography.letterSpacing.heading },
  headerSchool: { color: colors.primary, fontSize: typography.size.xs, marginTop: 2 },
  profileSummary: { gap: spacing.sm, padding: spacing.md, backgroundColor: colors.card, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border },
  title: { fontFamily: typography.fontFamily.heading, fontSize: typography.size['2xl'], color: colors.foreground, letterSpacing: typography.letterSpacing.heading },
  subtitle: { color: colors.foregroundSubtle, fontSize: typography.size.sm },
  locText: { color: colors.primary, fontSize: typography.size.xs },
  mascot: { color: colors.foregroundSubtle, fontSize: typography.size.xs, marginTop: 2 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  kpiCard: { flexGrow: 1, flexBasis: '47%', minWidth: 130 },
  kpiContent: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md },
  kpiIconWrap: { padding: spacing.xs, backgroundColor: colors.primary + '22', borderRadius: radius.md },
  kpiValue: { fontFamily: typography.fontFamily.heading, fontSize: typography.size.xl, color: colors.foreground, letterSpacing: typography.letterSpacing.heading },
  kpiLabel: { color: colors.foregroundSubtle, fontSize: typography.size.xs },
  cardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: spacing.sm },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  kvRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.xs },
  kvValue: { color: colors.foreground, fontFamily: typography.fontFamily.bodyMedium, fontSize: typography.size.sm },
  muted: { color: colors.foregroundSubtle, fontSize: typography.size.sm },
  tip: { padding: spacing.sm, backgroundColor: colors.primary + '10', borderRadius: radius.md, borderWidth: 1, borderColor: colors.primary + '33', marginTop: spacing.xs },
  tipText: { color: colors.foregroundSubtle, fontSize: typography.size.xs },
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  quickBtn: { alignItems: 'center', justifyContent: 'center', gap: spacing.xs, padding: spacing.md, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, flexGrow: 1, flexBasis: '30%', minWidth: 100 },
  quickLabel: { color: colors.foreground, fontSize: typography.size.xs, textAlign: 'center' },
  rowTitle: { color: colors.foreground, fontFamily: typography.fontFamily.bodyMedium, fontSize: typography.size.sm },
  rowMeta: { color: colors.foregroundSubtle, fontSize: typography.size.xs },
  center: { paddingVertical: spacing.xl, alignItems: 'center' },
  emptyState: { alignItems: 'center', paddingVertical: spacing.xl, gap: spacing.xs },
  empTitle: { color: colors.foreground, fontFamily: typography.fontFamily.bodyMedium, fontSize: typography.size.base },
  savedGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  savedCard: { padding: spacing.md, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, backgroundColor: colors.card, flexGrow: 1, flexBasis: '47%', minWidth: 200 },
  imageRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.md },
  formGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  formField: { flexGrow: 1, flexBasis: '47%', minWidth: 140 },
  sectionHeading: { fontFamily: typography.fontFamily.heading, fontSize: typography.size.lg, color: colors.foreground, marginTop: spacing.md, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.border },
});
