// DashboardScreen — RN port of Lovable web src/pages/Dashboard.tsx (athlete/parent landing).
// Phase 1-2 parity port. The source page also redirected admin/coach/scout to their dashboards;
// in RN those role splits live in role tab navigators, so this screen targets the athlete/parent role.
import React, { useEffect, useLayoutEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  TextInput,
  SafeAreaView,
  useWindowDimensions,
} from 'react-native';
import {
  useNavigation,
  useRoute,
  type NavigationProp,
  type RouteProp,
} from '@react-navigation/native';
import {
  Users,
  Mail,
  Bookmark,
  TrendingUp,
  Clock,
  CheckCircle,
  MessageSquare,
  LayoutDashboard,
  User as UserIcon,
  Search,
  GraduationCap,
  Edit,
  Trash2,
  Save,
  Copy,
  CalendarDays,
  Star,
  Share2,
  UserCheck,
  Target,
} from 'lucide-react-native';
import { format, formatDistanceToNow } from 'date-fns';

import { useAuth } from '@/hooks/useAuth';
import { useAdminRole } from '@/hooks/useAdminRole';
import { useActivityStats } from '@/hooks/useActivityStats';
import { usePlayerProfile } from '@/hooks/usePlayerProfile';
import { useCoachProfile } from '@/hooks/useCoachProfile';
import { useScoutProfile } from '@/hooks/useScoutProfile';
import { useParentProfileAccess } from '@/hooks/useParentProfileAccess';
import {
  useSavedCoaches,
  useRemoveSavedCoach,
  useUpdateSavedCoach,
} from '@/hooks/useSavedCoaches';
import { useContactEvents, useUpdateContactStatus } from '@/hooks/useContactEvents';
import { useToast } from '@/hooks/use-toast';

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Badge,
  Button,
  Tabs,
  TabsList,
  TabsTrigger,
  Avatar,
  Input,
  Textarea,
  Label,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  Checkbox,
} from '@/components/ui';

import { Footer } from '@/components/Footer';
import { BackButton } from '@/components/BackButton';
import { ProfileCompletionTracker } from '@/components/ProfileCompletionTracker';
import { SubscriptionStatus } from '@/components/SubscriptionStatus';
import { ReferralCard } from '@/components/ReferralCard';
import { ViewToggle } from '@/components/ViewToggle';
import { OwnerNav, LG_BREAKPOINT } from '@/components/OwnerNav';
import { NotificationBell } from '@/components/NotificationBell';
import { ScrollToTop } from '@/components/ScrollToTop';
import { TermsAcceptanceBanner } from '@/components/TermsAcceptanceBanner';
import { OfflineBanner } from '@/components/OfflineBanner';
import { ProfileManagement } from '@/components/ProfileManagement';
import { TranscriptRequestsCard } from '@/components/transcripts/TranscriptRequestsCard';
import { CampNewsFeed } from '@/components/CampNewsFeed';
import { MyCampAlertSubscriptions } from '@/components/MyCampAlertSubscriptions';
import { DashboardCampsList } from '@/components/DashboardCampsList';
import { DashboardCoachDirectory } from '@/components/DashboardCoachDirectory';
import { MatchSuggestionFeed } from '@/components/MatchSuggestionFeed';
import { TransferPortalFeed } from '@/components/TransferPortalFeed';
import { ProfileAnalyzer } from '@/components/ProfileAnalyzer';
import { SocialLinksManager } from '@/components/SocialLinksManager';
import { SocialSyndicationCenter } from '@/components/SocialSyndicationCenter';
import { CoachReferencesManager } from '@/components/CoachReferencesManager';
import { SharePlayerCardDialog } from '@/components/SharePlayerCardDialog';
import { ParentInviteCard } from '@/components/dashboard/ParentInviteCard';
// PORT-PENDING: SEO — web-only meta component, intentionally omitted on RN

import { SPORTS_CONFIG } from '@/lib/data/sports';
import { colors, spacing, typography, radius } from '@/lib/theme';

type Priority = 'high' | 'medium' | 'low';

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  sent: { label: 'Sent', color: colors.foregroundSubtle, bg: colors.muted },
  opened: { label: 'Opened', color: '#60a5fa', bg: 'rgba(59,130,246,0.2)' },
  replied: { label: 'Replied', color: '#4ade80', bg: 'rgba(34,197,94,0.2)' },
};

const CONTACT_TYPE_CONFIG: Record<string, { label: string }> = {
  email: { label: 'Email' },
  phone: { label: 'Phone' },
  message: { label: 'Message' },
};

const PRIORITY_ORDER: Record<Priority, number> = { high: 0, medium: 1, low: 2 };

export default function DashboardScreen() {
  const nav = useNavigation<NavigationProp<any>>();
  const route = useRoute<RouteProp<Record<string, { tab?: string } | undefined>, string>>();

  const { isAuthenticated, loading: authLoading } = useAuth();
  const { isAdmin, loading: adminLoading } = useAdminRole();
  const { data: stats, isLoading: statsLoading } = useActivityStats();
  const { isOfflineData, profile: ownProfile } = usePlayerProfile();
  const {
    linkedAthletes,
    selectedProfile: parentSelectedProfile,
    isLoading: parentLoading,
  } = useParentProfileAccess();
  const { data: coachProfile, isLoading: coachProfileLoading } = useCoachProfile();
  const { data: scoutProfile, isLoading: scoutProfileLoading } = useScoutProfile();

  const isParentView = linkedAthletes.length > 0 && !ownProfile;
  const profile: any = isParentView ? parentSelectedProfile : ownProfile;

  const { data: savedCoaches, isLoading: coachesLoading } = useSavedCoaches();
  const removeSavedCoach = useRemoveSavedCoach();
  const updateSavedCoach = useUpdateSavedCoach();
  const { toast } = useToast();

  const [isOwnerView, setIsOwnerView] = useState(true);
  const { width } = useWindowDimensions();
  const isWide = width >= LG_BREAKPOINT;

  // Group 3 #7 — lift ViewToggle to the tab navigator header (headerRight).
  // Preserves the existing NotificationBell to the right of the toggle so
  // roleTabHeaderRight parity is kept on this screen.
  useLayoutEffect(() => {
    nav.setOptions({
      headerRight: () => (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingRight: 8 }}>
          <ViewToggle isOwnerView={isOwnerView} onToggle={setIsOwnerView} />
          <NotificationBell />
        </View>
      ),
    });
  }, [nav, isOwnerView]);
  const initialTab = (route.params?.tab as string) || 'activity';
  const [activeTab, setActiveTab] = useState(initialTab);
  useEffect(() => {
    const t = (route.params?.tab as string) || 'activity';
    if (t !== activeTab) setActiveTab(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route.params?.tab]);

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [editingCoachId, setEditingCoachId] = useState<string | null>(null);
  const [coachNotes, setCoachNotes] = useState('');
  const [coachPriority, setCoachPriority] = useState<Priority>('medium');
  const [showHighPriorityOnly, setShowHighPriorityOnly] = useState(false);
  const [coachSearchQuery, setCoachSearchQuery] = useState('');
  const [selectedCoachIds, setSelectedCoachIds] = useState<Set<string>>(new Set());
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);

  const { data: contactEvents = [], isLoading: eventsLoading } = useContactEvents();
  const updateContactStatus = useUpdateContactStatus();
  const [outreachSearchTerm, setOutreachSearchTerm] = useState('');
  const [outreachStatusFilter, setOutreachStatusFilter] = useState('all');
  const [outreachTypeFilter, setOutreachTypeFilter] = useState('all');
  const [outreachDateFilter, setOutreachDateFilter] = useState('all');

  const filteredEvents = useMemo(
    () =>
      contactEvents.filter((event: any) => {
        const matchesSearch =
          event.coach_name.toLowerCase().includes(outreachSearchTerm.toLowerCase()) ||
          event.school.toLowerCase().includes(outreachSearchTerm.toLowerCase());
        const matchesStatus = outreachStatusFilter === 'all' || event.status === outreachStatusFilter;
        const matchesType = outreachTypeFilter === 'all' || event.contact_type === outreachTypeFilter;
        let matchesDate = true;
        if (outreachDateFilter !== 'all') {
          const eventDate = new Date(event.contacted_at);
          const now = new Date();
          const daysDiff = Math.floor((now.getTime() - eventDate.getTime()) / (1000 * 60 * 60 * 24));
          if (outreachDateFilter === 'today') matchesDate = daysDiff === 0;
          else if (outreachDateFilter === 'week') matchesDate = daysDiff <= 7;
          else if (outreachDateFilter === 'month') matchesDate = daysDiff <= 30;
        }
        return matchesSearch && matchesStatus && matchesType && matchesDate;
      }),
    [contactEvents, outreachSearchTerm, outreachStatusFilter, outreachTypeFilter, outreachDateFilter],
  );

  const outreachStats = {
    total: contactEvents.length,
    sent: contactEvents.filter((e: any) => e.status === 'sent').length,
    opened: contactEvents.filter((e: any) => e.status === 'opened').length,
    replied: contactEvents.filter((e: any) => e.status === 'replied').length,
  };

  const filteredSavedCoaches = useMemo(
    () =>
      savedCoaches
        ?.filter((coach: any) => {
          const matchesPriority = !showHighPriorityOnly || coach.priority === 'high';
          const searchLower = coachSearchQuery.toLowerCase();
          const matchesSearch =
            !coachSearchQuery ||
            coach.coach?.name?.toLowerCase().includes(searchLower) ||
            coach.coach?.school?.toLowerCase().includes(searchLower) ||
            coach.priority?.toLowerCase().includes(searchLower);
          return matchesPriority && matchesSearch;
        })
        .sort((a: any, b: any) => {
          const aPriority = PRIORITY_ORDER[(a.priority as Priority) ?? 'medium'] ?? 1;
          const bPriority = PRIORITY_ORDER[(b.priority as Priority) ?? 'medium'] ?? 1;
          return aPriority - bPriority;
        }),
    [savedCoaches, showHighPriorityOnly, coachSearchQuery],
  );

  // Role-based redirects (mirrors web Dashboard.tsx useEffect).
  useEffect(() => {
    if (
      authLoading ||
      adminLoading ||
      parentLoading ||
      coachProfileLoading ||
      scoutProfileLoading
    )
      return;
    if (!isAuthenticated) {
      nav.navigate('AuthStack' as never);
      return;
    }
    if (isAdmin) {
      nav.navigate('AdminTabs' as never);
      return;
    }
    if (coachProfile) {
      nav.navigate('CoachTabs' as never);
      return;
    }
    if (scoutProfile) {
      nav.navigate('ScoutTabs' as never);
      return;
    }
  }, [
    isAuthenticated,
    authLoading,
    adminLoading,
    parentLoading,
    coachProfileLoading,
    scoutProfileLoading,
    isAdmin,
    coachProfile,
    scoutProfile,
    nav,
  ]);

  const handleRemoveCoach = async (coachId: string) => {
    try {
      await removeSavedCoach.mutateAsync(coachId);
      setSelectedCoachIds((prev) => {
        const next = new Set(prev);
        next.delete(coachId);
        return next;
      });
      toast({ title: 'Coach Removed', description: 'Coach removed from your saved list.' });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to remove coach', variant: 'destructive' });
    }
  };

  const handleBulkRemoveCoaches = async () => {
    if (selectedCoachIds.size === 0) return;
    setIsBulkDeleting(true);
    try {
      await Promise.all(Array.from(selectedCoachIds).map((id) => removeSavedCoach.mutateAsync(id)));
      toast({ title: 'Coaches Removed', description: `${selectedCoachIds.size} coach(es) removed.` });
      setSelectedCoachIds(new Set());
      setShowBulkDeleteConfirm(false);
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to remove some coaches', variant: 'destructive' });
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const toggleCoachSelection = (coachId: string) => {
    setSelectedCoachIds((prev) => {
      const next = new Set(prev);
      if (next.has(coachId)) next.delete(coachId);
      else next.add(coachId);
      return next;
    });
  };

  const toggleSelectAllCoaches = () => {
    if (!filteredSavedCoaches) return;
    if (selectedCoachIds.size === filteredSavedCoaches.length) setSelectedCoachIds(new Set());
    else setSelectedCoachIds(new Set(filteredSavedCoaches.map((c: any) => c.coach_id)));
  };

  const handleBulkPriorityChange = async (newPriority: Priority) => {
    if (selectedCoachIds.size === 0) return;
    try {
      await Promise.all(
        Array.from(selectedCoachIds).map((id) =>
          updateSavedCoach.mutateAsync({ coachId: id, priority: newPriority }),
        ),
      );
      toast({
        title: 'Priority Updated',
        description: `${selectedCoachIds.size} coach(es) set to ${newPriority} priority.`,
      });
      setSelectedCoachIds(new Set());
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to update priority', variant: 'destructive' });
    }
  };

  const handleUpdateCoachNotes = async () => {
    if (!editingCoachId) return;
    try {
      await updateSavedCoach.mutateAsync({
        coachId: editingCoachId,
        notes: coachNotes,
        priority: coachPriority,
      });
      setEditingCoachId(null);
      toast({ title: 'Notes Updated', description: 'Coach notes have been updated.' });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to update notes', variant: 'destructive' });
    }
  };

  const openEditCoachNotesDialog = (coach: any) => {
    setEditingCoachId(coach.coach_id);
    setCoachNotes(coach.notes || '');
    setCoachPriority((coach.priority as Priority) || 'medium');
  };

  if (
    authLoading ||
    adminLoading ||
    statsLoading ||
    parentLoading ||
    coachProfileLoading ||
    scoutProfileLoading
  ) {
    return (
      <SafeAreaView style={styles.loadingScreen}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  const statCards = [
    { title: 'Coaches Contacted', value: stats?.totalCoachesContacted || 0, Icon: Users, description: "Unique coaches you've reached out to", color: '#3b82f6' },
    { title: 'Letters Sent', value: stats?.lettersSent || 0, Icon: Mail, description: 'Personalized emails sent', color: '#22c55e' },
    { title: 'Saved Coaches', value: stats?.savedCoaches || 0, Icon: Bookmark, description: 'Coaches in your target list', color: '#a855f7' },
    {
      title: 'Response Rate',
      value: stats?.contactsByStatus?.replied
        ? `${Math.round(
            (stats.contactsByStatus.replied /
              ((stats.contactsByStatus.sent || 0) + (stats.contactsByStatus.replied || 0))) *
              100,
          )}%`
        : '0%',
      Icon: TrendingUp,
      description: 'Coaches who replied',
      color: '#f97316',
    },
  ];

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  const renderActivityTab = () => (
    <View style={{ gap: spacing.lg }}>
      <View style={{ gap: spacing.sm }}>
        <ProfileCompletionTracker />
        <SubscriptionStatus />
        <MatchSuggestionFeed variant="compact" maxItems={5} />
        <ReferralCard />
        <Card>
          <CardHeader>
            <CardTitle>🌟 NIL Intelligence</CardTitle>
            <CardDescription>
              Navigate NIL opportunities with responsible, educational AI guidance.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onPress={() => nav.navigate('NILIntelligence' as never)}>
              Explore NIL Education
            </Button>
          </CardContent>
        </Card>
      </View>

      <View style={styles.statsGrid}>
        {statCards.map((stat) => (
          <Card key={stat.title} style={styles.statCardItem}>
            <CardHeader>
              <View style={styles.statCardHead}>
                <CardTitle>{stat.title}</CardTitle>
                <stat.Icon size={20} color={stat.color} />
              </View>
            </CardHeader>
            <CardContent>
              <Text style={styles.statValue}>{stat.value}</Text>
              <Text style={styles.statDesc}>{stat.description}</Text>
            </CardContent>
          </Card>
        ))}
      </View>

      <Card>
        <CardHeader>
          <CardTitle>Contact Status</CardTitle>
          <CardDescription>Breakdown of your outreach results</CardDescription>
        </CardHeader>
        <CardContent>
          <View style={{ gap: spacing.sm }}>
            <View style={styles.statusRow}>
              <View style={styles.statusRowLeft}>
                <Mail size={20} color="#3b82f6" />
                <Text style={styles.statusLabel}>Sent</Text>
              </View>
              <Text style={styles.statusVal}>{stats?.contactsByStatus?.sent || 0}</Text>
            </View>
            <View style={styles.statusRow}>
              <View style={styles.statusRowLeft}>
                <MessageSquare size={20} color="#22c55e" />
                <Text style={styles.statusLabel}>Replied</Text>
              </View>
              <Text style={styles.statusVal}>{stats?.contactsByStatus?.replied || 0}</Text>
            </View>
            <View style={styles.statusRow}>
              <View style={styles.statusRowLeft}>
                <Clock size={20} color="#f97316" />
                <Text style={styles.statusLabel}>Pending</Text>
              </View>
              <Text style={styles.statusVal}>{stats?.contactsByStatus?.pending || 0}</Text>
            </View>
          </View>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Your latest recruiting actions</CardDescription>
        </CardHeader>
        <CardContent>
          {stats?.recentActivity && stats.recentActivity.length > 0 ? (
            <View style={{ gap: spacing.sm }}>
              {stats.recentActivity.map((activity: any) => (
                <View key={activity.id} style={styles.activityItem}>
                  <View style={styles.activityIconWrap}>
                    {activity.type === 'contact' && <Mail size={20} color={colors.primary} />}
                    {activity.type === 'saved' && <Bookmark size={20} color={colors.primary} />}
                    {activity.type === 'letter' && <CheckCircle size={20} color={colors.primary} />}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.activityDesc}>{activity.description}</Text>
                    <Text style={styles.activityDate}>{formatDate(activity.date)}</Text>
                  </View>
                  <Badge variant="secondary">{activity.type}</Badge>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.emptyBlock}>
              <Users size={48} color={colors.foregroundSubtle} />
              <Text style={styles.emptyTitle}>No recent activity</Text>
              <Text style={styles.emptySub}>
                Start by searching for coaches and saving them to your list
              </Text>
            </View>
          )}
        </CardContent>
      </Card>
    </View>
  );

  const renderCampsTab = () => (
    <View style={{ gap: spacing.lg }}>
      <DashboardCampsList />
      <MyCampAlertSubscriptions />
    </View>
  );

  const renderCoachesTab = () => (
    <View style={{ gap: spacing.lg }}>
      <DashboardCoachDirectory />

      {/* Outreach tracker */}
      <View style={{ gap: spacing.md }}>
        <View style={{ alignItems: 'center' }}>
          <Text style={styles.sectionTitleLg}>Outreach Tracker</Text>
          <Text style={styles.sectionSub}>Track your communications with coaches.</Text>
        </View>

        <View style={styles.outreachStatsRow}>
          <Card style={styles.outreachStatCard}>
            <View style={styles.outreachStatIcon}>
              <Mail size={20} color={colors.primary} />
            </View>
            <Text style={styles.outreachStatValue}>{outreachStats.total}</Text>
            <Text style={styles.outreachStatLabel}>Emails Sent</Text>
          </Card>
          <Card style={styles.outreachStatCard}>
            <View style={[styles.outreachStatIcon, { backgroundColor: 'rgba(59,130,246,0.2)' }]}>
              <TrendingUp size={20} color="#60a5fa" />
            </View>
            <Text style={styles.outreachStatValue}>{outreachStats.opened}</Text>
            <Text style={styles.outreachStatLabel}>Opened</Text>
          </Card>
          <Card style={styles.outreachStatCard}>
            <View style={[styles.outreachStatIcon, { backgroundColor: 'rgba(34,197,94,0.2)' }]}>
              <CheckCircle size={20} color="#4ade80" />
            </View>
            <Text style={styles.outreachStatValue}>{outreachStats.replied}</Text>
            <Text style={styles.outreachStatLabel}>Replies</Text>
          </Card>
        </View>

        <Card style={{ padding: spacing.md, gap: spacing.sm }}>
          <View style={styles.filtersGrid}>
            <Input
              placeholder="Search coaches or schools..."
              value={outreachSearchTerm}
              onChangeText={setOutreachSearchTerm}
            />
            <Select value={outreachStatusFilter} onValueChange={setOutreachStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="opened">Opened</SelectItem>
                <SelectItem value="replied">Replied</SelectItem>
              </SelectContent>
            </Select>
            <Select value={outreachTypeFilter} onValueChange={setOutreachTypeFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Contact Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="phone">Phone</SelectItem>
                <SelectItem value="message">Message</SelectItem>
              </SelectContent>
            </Select>
            <Select value={outreachDateFilter} onValueChange={setOutreachDateFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Time Period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
              </SelectContent>
            </Select>
          </View>
        </Card>

        <Card>
          <View style={styles.activityHead}>
            <Text style={styles.sectionTitleSm}>
              Activity Log ({filteredEvents.length} contacts)
            </Text>
          </View>
          {eventsLoading ? (
            <View style={styles.center}>
              <ActivityIndicator color={colors.foregroundSubtle} />
            </View>
          ) : filteredEvents.length === 0 ? (
            <View style={styles.center}>
              <Mail size={40} color={colors.foregroundSubtle} />
              <Text style={[styles.statusLabel, { marginTop: spacing.sm }]}>
                {contactEvents.length === 0
                  ? 'No outreach yet. Start by contacting coaches above!'
                  : 'No contacts match your filters.'}
              </Text>
            </View>
          ) : (
            <View>
              {filteredEvents.map((event: any) => {
                const status = STATUS_CONFIG[event.status] || STATUS_CONFIG.sent;
                const contactType =
                  CONTACT_TYPE_CONFIG[event.contact_type] || CONTACT_TYPE_CONFIG.email;
                return (
                  <View key={event.id} style={styles.eventRow}>
                    <View style={styles.eventLeft}>
                      <View style={[styles.eventIconWrap, { backgroundColor: status.bg }]}>
                        <Mail size={20} color={status.color} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.eventName}>{event.coach_name}</Text>
                        <Text style={styles.eventSchool}>{event.school}</Text>
                      </View>
                    </View>
                    <View style={styles.eventRight}>
                      <Text style={styles.statusLabelSm}>{contactType.label}</Text>
                      <View style={{ width: 120 }}>
                        <Select
                          value={event.status}
                          onValueChange={(value) =>
                            updateContactStatus.mutate({ id: event.id, status: value })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="sent">Sent</SelectItem>
                            <SelectItem value="opened">Opened</SelectItem>
                            <SelectItem value="replied">Replied</SelectItem>
                          </SelectContent>
                        </Select>
                      </View>
                      <Text style={styles.eventDate}>
                        {format(new Date(event.contacted_at), 'MMM d, yyyy')}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </Card>
      </View>

      {/* Saved coaches */}
      <View style={{ gap: spacing.md }}>
        <View>
          <Text style={styles.sectionTitleSm}>Saved Coaches</Text>
          <Text style={styles.sectionSub}>Manage your target coaches list</Text>
        </View>

        <View style={styles.savedHeaderRow}>
          <Pressable
            style={styles.checkboxRow}
            onPress={() => setShowHighPriorityOnly((v) => !v)}
          >
            <Checkbox
              checked={showHighPriorityOnly}
              onCheckedChange={(v) => setShowHighPriorityOnly(!!v)}
            />
            <Text style={styles.checkboxLabel}>High priority only</Text>
          </Pressable>
          <Button
            variant="outline"
            onPress={() => nav.navigate('CoachSearchScreen' as never)}
          >
            Find Coaches
          </Button>
        </View>

        <Input
          placeholder="Search by name, school, or priority..."
          value={coachSearchQuery}
          onChangeText={setCoachSearchQuery}
        />

        {selectedCoachIds.size > 0 && (
          <View style={styles.bulkBar}>
            <Pressable style={styles.checkboxRow} onPress={toggleSelectAllCoaches}>
              <Checkbox
                checked={
                  !!filteredSavedCoaches &&
                  filteredSavedCoaches.length === selectedCoachIds.size &&
                  selectedCoachIds.size > 0
                }
                onCheckedChange={toggleSelectAllCoaches}
              />
              <Text style={styles.checkboxLabel}>{selectedCoachIds.size} selected</Text>
            </Pressable>
            <View style={{ flexDirection: 'row', gap: spacing.xs, alignItems: 'center' }}>
              <View style={{ width: 140 }}>
                <Select onValueChange={(v) => handleBulkPriorityChange(v as Priority)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Set Priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="high">High Priority</SelectItem>
                    <SelectItem value="medium">Medium Priority</SelectItem>
                    <SelectItem value="low">Low Priority</SelectItem>
                  </SelectContent>
                </Select>
              </View>
              <Button variant="destructive" onPress={() => setShowBulkDeleteConfirm(true)}>
                Remove
              </Button>
            </View>
          </View>
        )}

        <Dialog open={showBulkDeleteConfirm} onOpenChange={setShowBulkDeleteConfirm}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                Remove {selectedCoachIds.size} Coach
                {selectedCoachIds.size > 1 ? 'es' : ''}?
              </DialogTitle>
              <DialogDescription>
                Are you sure? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onPress={() => setShowBulkDeleteConfirm(false)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onPress={handleBulkRemoveCoaches}
                disabled={isBulkDeleting}
              >
                {isBulkDeleting ? 'Removing…' : 'Remove'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {coachesLoading ? (
          <View style={styles.center}>
            <ActivityIndicator color={colors.foregroundSubtle} />
          </View>
        ) : filteredSavedCoaches && filteredSavedCoaches.length > 0 ? (
          <View style={{ gap: spacing.sm }}>
            {filteredSavedCoaches.map((saved: any) => (
              <Card
                key={saved.id}
                style={
                  selectedCoachIds.has(saved.coach_id)
                    ? { borderColor: colors.primary, borderWidth: 2 }
                    : undefined
                }
              >
                <CardContent>
                  <View style={styles.savedCoachHead}>
                    <Checkbox
                      checked={selectedCoachIds.has(saved.coach_id)}
                      onCheckedChange={() => toggleCoachSelection(saved.coach_id)}
                    />
                    <Avatar
                      source={saved.coach?.image_url ? { uri: saved.coach.image_url } : undefined}
                      fallback={saved.coach?.name?.charAt(0) || 'C'}
                      size={48}
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.savedCoachName}>
                        {saved.coach?.name || 'Unknown Coach'}
                      </Text>
                      <Text style={styles.savedCoachTitle}>{saved.coach?.title || 'Coach'}</Text>
                      <Text style={styles.savedCoachSchool}>
                        {saved.coach?.school || 'School not available'}
                      </Text>
                    </View>
                  </View>

                  {saved.coach && (
                    <View style={styles.tagRow}>
                      {!!saved.coach.division && (
                        <Badge variant="outline">{saved.coach.division}</Badge>
                      )}
                      {!!saved.coach.position_coached && (
                        <Badge variant="outline">{saved.coach.position_coached}</Badge>
                      )}
                      {!!saved.coach.email && (
                        <Button
                          variant="ghost"
                          onPress={() => {
                            toast({
                              title: 'Email Copied',
                              description: saved.coach?.email,
                            });
                          }}
                        >
                          Copy Email
                        </Button>
                      )}
                    </View>
                  )}

                  <View style={styles.tagRow}>
                    <Badge
                      variant={
                        saved.priority === 'high'
                          ? 'default'
                          : saved.priority === 'low'
                          ? 'outline'
                          : 'secondary'
                      }
                    >
                      {saved.priority}
                    </Badge>
                    <Text style={styles.savedAt}>
                      Saved {formatDistanceToNow(new Date(saved.saved_at))} ago
                    </Text>
                  </View>

                  {!!saved.notes && <Text style={styles.savedNotes}>{saved.notes}</Text>}

                  <View style={styles.savedActions}>
                    <Button
                      onPress={() =>
                        // Navigate to LettersTab (bottom tab) — the tab is named 'LettersTab'
                        // inside AthleteTabs. There is no standalone registered route for letters.
                        (nav.navigate as any)('AthleteTabs', { screen: 'LettersTab' })
                      }
                    >
                      Send Letter
                    </Button>
                    <Button variant="outline" onPress={() => openEditCoachNotesDialog(saved)}>
                      Notes
                    </Button>
                    <Button
                      variant="ghost"
                      onPress={() => handleRemoveCoach(saved.coach_id)}
                    >
                      Remove
                    </Button>
                  </View>
                </CardContent>
              </Card>
            ))}
          </View>
        ) : (
          <Card>
            <CardContent>
              <View style={styles.emptyBlock}>
                <Bookmark size={48} color={colors.foregroundSubtle} />
                <Text style={styles.emptyTitle}>No Saved Coaches</Text>
                <Text style={styles.emptySub}>
                  Start searching for coaches and save them to your target list.
                </Text>
                <Button onPress={() => nav.navigate('CoachSearchScreen' as never)}>
                  Find Coaches
                </Button>
              </View>
            </CardContent>
          </Card>
        )}
      </View>

      {profile?.sport &&
        SPORTS_CONFIG[profile.sport as keyof typeof SPORTS_CONFIG]?.hasTransferPortal && (
          <TransferPortalFeed sport={profile.sport as keyof typeof SPORTS_CONFIG} />
        )}
    </View>
  );

  const renderProfileTab = () => (
    <View style={{ gap: spacing.lg }}>
      <ProfileManagement />
      {!!profile?.id && (
        <>
          <ProfileAnalyzer profileId={profile.id} />
          <CoachReferencesManager profileId={profile.id} />
          <SocialLinksManager
            role="athlete"
            profileName={profile.full_name || undefined}
            profileImageUrl={(profile as any).image_url}
            profileUrl={profile.custom_url ? `https://offerhound.app/p/${profile.custom_url}` : undefined}
            initialLinks={(profile as any).social_links || {}}
          />
        </>
      )}
    </View>
  );

  const renderSocialTab = () => (
    <View style={{ gap: spacing.lg }}>
      {profile?.id ? (
        <SocialSyndicationCenter
          entityName={profile.full_name || undefined}
          profileUrl={profile.custom_url ? `https://offerhound.app/p/${profile.custom_url}` : undefined}
        />
      ) : (
        <Card>
          <CardContent>
            <View style={styles.emptyBlock}>
              <Text style={styles.emptySub}>
                Complete your profile to access social sharing tools.
              </Text>
            </View>
          </CardContent>
        </Card>
      )}
    </View>
  );

  const TAB_DEFS = [
    { value: 'activity', label: 'Activity', Icon: LayoutDashboard },
    { value: 'camps', label: 'Camps', Icon: CalendarDays },
    { value: 'coaches', label: 'Coaches', Icon: GraduationCap },
    { value: 'profile', label: 'Profile', Icon: UserIcon },
    { value: 'social', label: 'Social', Icon: Share2 },
  ];

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <OfflineBanner isOfflineData={isOfflineData} />
        <TermsAcceptanceBanner />
        <BackButton label="Back" />

        {profile && !isParentView && <TranscriptRequestsCard />}

        {/* Family / Parent invite — matches Lovable web Dashboard
            (src/pages/Dashboard.tsx imports ParentInviteModal there). */}
        {profile && !isParentView && <ParentInviteCard />}

        {/* Shareable card preview */}
        {profile && !isParentView && (
          <View style={styles.sharePreview}>
            <View style={styles.sharePreviewBar} />
            <View style={{ paddingHorizontal: spacing.md, paddingTop: spacing.sm }}>
              <Text style={styles.sharePreviewKicker}>Share Player Card</Text>
            </View>
            <View style={styles.sharePreviewBody}>
              <Avatar
                source={profile.profile_image_url ? { uri: profile.profile_image_url } : undefined}
                fallback={(profile.full_name || 'A')
                  .split(' ')
                  .map((n: string) => n[0])
                  .join('')
                  .slice(0, 2)
                  .toUpperCase()}
                size={64}
              />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.shareName} numberOfLines={1}>
                  {profile.full_name}
                </Text>
                <View style={styles.shareMetaRow}>
                  {!!profile.position && <Text style={styles.shareMeta}>{profile.position}</Text>}
                  {!!profile.position && !!profile.graduation_year && (
                    <Text style={styles.shareMeta}> · </Text>
                  )}
                  {!!profile.graduation_year && (
                    <Text style={styles.shareMeta}>Class of {profile.graduation_year}</Text>
                  )}
                </View>
                {!!profile.school && (
                  <Text style={styles.shareSchool} numberOfLines={1}>
                    {profile.school}
                  </Text>
                )}
              </View>
              <SharePlayerCardDialog>
                <Button onPress={() => {}}>Share</Button>
              </SharePlayerCardDialog>
            </View>
          </View>
        )}

        {/* Header row */}
        <View style={styles.headerBlock}>
          <View style={styles.headerTop}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <View style={styles.headerTitleRow}>
                <Text style={styles.h1}>
                  {isParentView ? 'Parent View' : 'Athlete Dashboard'}
                </Text>
                {isParentView && !!profile?.full_name && (
                  <Badge variant="secondary">Viewing: {profile.full_name}</Badge>
                )}
              </View>
              <Text style={styles.headerSub}>
                {isParentView
                  ? `Manage ${profile?.full_name || 'your athlete'}'s profile and track recruiting progress`
                  : 'Manage your profile and track recruiting progress'}
              </Text>
            </View>

            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" onPress={() => setMobileMenuOpen(true)}>
                  Menu
                </Button>
              </SheetTrigger>
              <SheetContent>
                <SheetHeader>
                  <SheetTitle>Actions</SheetTitle>
                </SheetHeader>
                <View style={{ gap: spacing.xs, marginTop: spacing.md }}>
                  <Button
                    onPress={() => {
                      nav.navigate('AthleteProfileEdit' as never);
                      setMobileMenuOpen(false);
                    }}
                  >
                    Edit Full Profile
                  </Button>
                  <Button
                    onPress={() => {
                      nav.navigate('AthleteTabs' as any, { screen: 'MatchesTab' } as any);
                      setMobileMenuOpen(false);
                    }}
                  >
                    Find Coaches
                  </Button>
                  <Button
                    onPress={() => {
                      nav.navigate('ScoutDirectory' as never);
                      setMobileMenuOpen(false);
                    }}
                  >
                    Find Scouts
                  </Button>
                  <Button
                    variant="outline"
                    onPress={() => {
                      nav.navigate('SavedCamps' as never);
                      setMobileMenuOpen(false);
                    }}
                  >
                    My Camps
                  </Button>
                  <Button
                    variant="outline"
                    onPress={() => {
                      nav.navigate('LeaveReview' as never);
                      setMobileMenuOpen(false);
                    }}
                  >
                    Leave Review
                  </Button>
                  <SharePlayerCardDialog>
                    <Button variant="outline" onPress={() => {}}>
                      Share Card
                    </Button>
                  </SharePlayerCardDialog>
                </View>
              </SheetContent>
            </Sheet>
          </View>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              {TAB_DEFS.map((t) => (
                <TabsTrigger key={t.value} value={t.value}>
                  {t.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </View>

        {activeTab === 'activity' && renderActivityTab()}
        {activeTab === 'camps' && renderCampsTab()}
        {activeTab === 'coaches' && renderCoachesTab()}
        {activeTab === 'profile' && renderProfileTab()}
        {activeTab === 'social' && renderSocialTab()}

        <Footer />
      </ScrollView>

      <ScrollToTop visible={false} onPress={() => {}} />
      {/* Group 3 #7 — OwnerNav only renders on wide layouts (>= LG_BREAKPOINT).
          The phone-bottom-bar mount was retired; every real cross-app verb is
          now a first-class tab in AthleteTabs. */}
      {isOwnerView && isWide && <OwnerNav />}

      {/* Edit coach notes dialog */}
      <Dialog open={!!editingCoachId} onOpenChange={(o) => !o && setEditingCoachId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Coach Notes</DialogTitle>
            <DialogDescription>Add notes and set priority for this coach.</DialogDescription>
          </DialogHeader>
          <View style={{ gap: spacing.sm, paddingVertical: spacing.sm }}>
            <View style={{ gap: spacing.xs }}>
              <Label>Priority</Label>
              <Select value={coachPriority} onValueChange={(v) => setCoachPriority(v as Priority)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="high">High Priority</SelectItem>
                  <SelectItem value="medium">Medium Priority</SelectItem>
                  <SelectItem value="low">Low Priority</SelectItem>
                </SelectContent>
              </Select>
            </View>
            <View style={{ gap: spacing.xs }}>
              <Label>Notes</Label>
              <Textarea
                value={coachNotes}
                onChangeText={setCoachNotes}
                placeholder="Add your notes about this coach..."
                numberOfLines={4}
              />
            </View>
          </View>
          <DialogFooter>
            <Button variant="outline" onPress={() => setEditingCoachId(null)}>
              Cancel
            </Button>
            <Button onPress={handleUpdateCoachNotes} disabled={updateSavedCoach.isPending}>
              {updateSavedCoach.isPending ? 'Saving…' : 'Save Notes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  loadingScreen: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  screen: { flex: 1, backgroundColor: colors.background },
  scrollContent: {
    padding: spacing.md,
    gap: spacing.lg,
    paddingBottom: spacing.xl * 2,
  },
  sharePreview: {
    overflow: 'hidden',
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(231,175,8,0.2)',
    backgroundColor: colors.card,
  },
  sharePreviewBar: { height: 6, backgroundColor: colors.primary },
  sharePreviewKicker: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: colors.primary,
  },
  sharePreviewBody: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
  },
  shareName: { color: colors.foreground, fontSize: 18, fontWeight: '700' },
  shareMetaRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 2 },
  shareMeta: { color: colors.foregroundSubtle, fontSize: 12 },
  shareSchool: { color: colors.foregroundSubtle, fontSize: 12, marginTop: 2 },
  headerBlock: { gap: spacing.md },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  headerTitleRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.xs },
  h1: { color: colors.foreground, fontSize: 24, fontWeight: '700' },
  headerSub: { color: colors.foregroundSubtle, fontSize: 14, marginTop: 4 },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  statCardItem: { flexBasis: '48%', flexGrow: 1 },
  statCardHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statValue: { color: colors.foreground, fontSize: 28, fontWeight: '700' },
  statDesc: { color: colors.foregroundSubtle, fontSize: 12, marginTop: 4 },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.muted,
  },
  statusRowLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  statusLabel: { color: colors.foreground, fontSize: 14 },
  statusLabelSm: { color: colors.foregroundSubtle, fontSize: 12 },
  statusVal: { color: colors.foreground, fontSize: 22, fontWeight: '700' },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  activityIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(231,175,8,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityDesc: { color: colors.foreground, fontSize: 14, fontWeight: '500' },
  activityDate: { color: colors.foregroundSubtle, fontSize: 12 },
  emptyBlock: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    gap: spacing.xs,
  },
  emptyTitle: { color: colors.foreground, fontSize: 16, fontWeight: '600' },
  emptySub: { color: colors.foregroundSubtle, fontSize: 13, textAlign: 'center' },
  sectionTitleLg: { color: colors.foreground, fontSize: 22, fontWeight: '700' },
  sectionTitleSm: { color: colors.foreground, fontSize: 16, fontWeight: '600' },
  sectionSub: { color: colors.foregroundSubtle, fontSize: 13 },
  outreachStatsRow: { flexDirection: 'row', gap: spacing.sm },
  outreachStatCard: { flex: 1, alignItems: 'center', padding: spacing.md, gap: 4 },
  outreachStatIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(231,175,8,0.2)',
  },
  outreachStatValue: { color: colors.foreground, fontSize: 24, fontWeight: '700' },
  outreachStatLabel: { color: colors.foregroundSubtle, fontSize: 12 },
  filtersGrid: { gap: spacing.xs },
  activityHead: {
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  center: { padding: spacing.lg, alignItems: 'center' },
  eventRow: {
    padding: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.sm,
  },
  eventLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  eventIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eventName: { color: colors.foreground, fontSize: 14, fontWeight: '500' },
  eventSchool: { color: colors.foregroundSubtle, fontSize: 12 },
  eventRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  eventDate: { color: colors.foregroundSubtle, fontSize: 11 },
  savedHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  checkboxRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  checkboxLabel: { color: colors.foregroundSubtle, fontSize: 14 },
  bulkBar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.muted,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  savedCoachHead: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  savedCoachName: { color: colors.foreground, fontSize: 14, fontWeight: '500' },
  savedCoachTitle: { color: colors.primary, fontSize: 13 },
  savedCoachSchool: { color: colors.foregroundSubtle, fontSize: 13 },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
    marginTop: spacing.xs,
  },
  savedAt: { color: colors.foregroundSubtle, fontSize: 11 },
  savedNotes: { color: colors.foregroundSubtle, fontSize: 13, marginTop: spacing.xs },
  savedActions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: spacing.sm },
});
