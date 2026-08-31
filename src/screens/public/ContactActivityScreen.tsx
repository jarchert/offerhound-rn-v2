// Ported from Lovable web src/pages/ContactActivity.tsx (149 LOC).
// Web → RN translation:
//   - useLocation/scrollIntoView → no-op (RN scroll handled by ScrollView)
//   - lucide-react → lucide-react-native
//   - <Card>/<Input>/<Select>/<Badge> mapped to RN @/components/ui
//   - SEO is a no-op shim (RN has no <head>); kept for parity.
//   - PORT-PENDING: PageBreadcrumb, OwnerNav, ViewToggle, CoachesSection,
//     CoachRecommendations, TransferPortalFeed are stubs — they render but
//     have no logic yet. Kept in tree for parity.
import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, useWindowDimensions } from 'react-native';
import {
  Mail,
  Phone,
  MessageSquare,
  Clock,
  Search,
  Calendar,
  Filter,
  TrendingUp,
  CheckCircle2,
} from 'lucide-react-native';
import { format } from 'date-fns';

import { useContactEvents, useUpdateContactStatus } from '@/hooks/useContactEvents';
import { usePlayerProfile } from '@/hooks/usePlayerProfile';
import { CoachRecommendations } from '@/components/CoachRecommendations';
import { CoachesSection } from '@/components/CoachesSection';
import { TransferPortalFeed } from '@/components/TransferPortalFeed';
import { PageBreadcrumb } from '@/components/PageBreadcrumb';
import { ViewToggle } from '@/components/ViewToggle';
import { OwnerNav, LG_BREAKPOINT } from '@/components/OwnerNav';
import { BackButton } from '@/components/BackButton';
import { Footer } from '@/components/Footer';
import SEO from '@/components/SEO';
import {
  Card,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui';
import { SPORTS_CONFIG } from '@/lib/data/sports';
import { colors, typography, spacing } from '@/lib/theme';

const statusConfig = {
  sent: { label: 'Sent', icon: Mail, color: colors.mutedForeground, bg: colors.secondary },
  opened: { label: 'Opened', icon: Clock, color: '#60a5fa', bg: 'rgba(59,130,246,0.2)' },
  replied: { label: 'Replied', icon: MessageSquare, color: '#34d399', bg: 'rgba(34,197,94,0.2)' },
} as const;

const contactTypeConfig = {
  email: { label: 'Email', icon: Mail },
  phone: { label: 'Phone', icon: Phone },
  message: { label: 'Message', icon: MessageSquare },
} as const;

export default function ContactActivityScreen() {
  const { data: events = [], isLoading } = useContactEvents();
  const { profile } = usePlayerProfile();
  const updateStatus = useUpdateContactStatus();
  const [isOwnerView, setIsOwnerView] = useState(true);
  const { width: _dashboardWidth } = useWindowDimensions();
  const _isWide = _dashboardWidth >= LG_BREAKPOINT;
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');

  const filteredEvents = useMemo(() => {
    return (events as any[]).filter((event) => {
      const matchesSearch =
        event.coach_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        event.school?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || event.status === statusFilter;
      const matchesType = typeFilter === 'all' || event.contact_type === typeFilter;
      let matchesDate = true;
      if (dateFilter !== 'all') {
        const daysDiff = Math.floor(
          (Date.now() - new Date(event.contacted_at).getTime()) / 86400000,
        );
        if (dateFilter === 'today') matchesDate = daysDiff === 0;
        else if (dateFilter === 'week') matchesDate = daysDiff <= 7;
        else if (dateFilter === 'month') matchesDate = daysDiff <= 30;
      }
      return matchesSearch && matchesStatus && matchesType && matchesDate;
    });
  }, [events, searchTerm, statusFilter, typeFilter, dateFilter]);

  const stats = {
    total: (events as any[]).length,
    sent: (events as any[]).filter((e) => e.status === 'sent').length,
    opened: (events as any[]).filter((e) => e.status === 'opened').length,
    replied: (events as any[]).filter((e) => e.status === 'replied').length,
  };

  const summary = [
    { icon: Mail, value: stats.total, label: 'Emails Sent', color: colors.primary, bg: 'rgba(237,189,42,0.2)' },
    { icon: TrendingUp, value: stats.opened, label: 'Opened', color: '#60a5fa', bg: 'rgba(59,130,246,0.2)' },
    { icon: CheckCircle2, value: stats.replied, label: 'Replies', color: '#34d399', bg: 'rgba(34,197,94,0.2)' },
  ];

  return (
    <View style={s.container}>
      <SEO
        title="Coaches & Recruiting Tools | OfferHound"
        description="Find college coaches, track outreach, and manage your recruiting journey."
      />
      <ScrollView contentContainerStyle={s.scroll}>
        <View style={s.header}>
          <BackButton label="Back" />
          <PageBreadcrumb />
          <Text style={s.h1}>
            <Text style={s.h1Foreground}>Coaches &</Text>{' '}
            <Text style={s.h1Primary}>Recruiting Tools</Text>
          </Text>
          <Text style={s.subtitle}>
            Find coaches, track outreach, and manage your recruiting journey all
            in one place.
          </Text>
        </View>

        <CoachesSection />

        <View style={s.section}>
          <CoachRecommendations />
        </View>

        <View style={s.section}>
          <Text style={s.h2}>
            <Text style={s.h1Foreground}>Outreach </Text>
            <Text style={s.h1Primary}>Tracker</Text>
          </Text>
          <Text style={s.sectionSub}>Track your communications with coaches.</Text>

          <View style={s.statsRow}>
            {summary.map((it, i) => (
              <Card key={i} style={s.statCard}>
                <View style={[s.statBadge, { backgroundColor: it.bg }]}>
                  <it.icon size={22} color={it.color} />
                </View>
                <Text style={s.statValue}>{it.value}</Text>
                <Text style={s.statLabel}>{it.label}</Text>
              </Card>
            ))}
          </View>

          <Card style={s.filterCard}>
            <View style={s.filterHeader}>
              <Filter size={18} color={colors.primary} />
              <Text style={s.filterTitle}>Filters</Text>
            </View>
            <View style={s.searchWrap}>
              <Search size={16} color={colors.mutedForeground} style={s.searchIcon} />
              <Input
                placeholder="Search..."
                value={searchTerm}
                onChangeText={setSearchTerm}
                style={s.searchInput}
              />
            </View>
            <View style={s.selectGrid}>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="sent">Sent</SelectItem>
                  <SelectItem value="opened">Opened</SelectItem>
                  <SelectItem value="replied">Replied</SelectItem>
                </SelectContent>
              </Select>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="phone">Phone</SelectItem>
                  <SelectItem value="message">Message</SelectItem>
                </SelectContent>
              </Select>
              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Period" />
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

          <Card style={s.logCard}>
            <View style={s.logHeader}>
              <Text style={s.logTitle}>Activity Log ({filteredEvents.length})</Text>
            </View>
            {isLoading ? (
              <Text style={s.empty}>Loading...</Text>
            ) : filteredEvents.length === 0 ? (
              <View style={s.emptyWrap}>
                <Mail size={36} color={colors.mutedForeground} style={{ opacity: 0.5 }} />
                <Text style={s.empty}>
                  {(events as any[]).length === 0 ? 'No outreach yet.' : 'No matches.'}
                </Text>
              </View>
            ) : (
              <View>
                {filteredEvents.map((event: any) => {
                  const status =
                    statusConfig[event.status as keyof typeof statusConfig] ||
                    statusConfig.sent;
                  const ct =
                    contactTypeConfig[event.contact_type as keyof typeof contactTypeConfig] ||
                    contactTypeConfig.email;
                  const SI = status.icon;
                  const TI = ct.icon;
                  return (
                    <View key={event.id} style={s.row}>
                      <View style={s.rowLeft}>
                        <View style={[s.rowIcon, { backgroundColor: status.bg }]}>
                          <SI size={18} color={status.color} />
                        </View>
                        <View>
                          <Text style={s.rowName}>{event.coach_name}</Text>
                          <Text style={s.rowSub}>{event.school}</Text>
                        </View>
                      </View>
                      <View style={s.rowRight}>
                        <View style={s.rowType}>
                          <TI size={14} color={colors.mutedForeground} />
                          <Text style={s.rowSub}>{ct.label}</Text>
                        </View>
                        <View style={s.rowSelect}>
                          <Select
                            value={event.status}
                            onValueChange={(v) =>
                              updateStatus.mutate({ id: event.id, status: v } as any)
                            }>
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
                        <View style={s.rowDate}>
                          <Calendar size={12} color={colors.mutedForeground} />
                          <Text style={s.rowDateText}>
                            {format(new Date(event.contacted_at), 'MMM d, yyyy')}
                          </Text>
                        </View>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </Card>
        </View>

        {profile?.sport &&
          SPORTS_CONFIG[profile.sport as keyof typeof SPORTS_CONFIG]?.hasTransferPortal && (
            <TransferPortalFeed sport={profile.sport as keyof typeof SPORTS_CONFIG} />
          )}

        <Footer />
        {/* Group 3 #7 — OwnerNav only on wide layouts; phone-bottom-bar mount retired. */}
        {isOwnerView && _isWide && <OwnerNav />}
        <ViewToggle isOwnerView={isOwnerView} onToggle={setIsOwnerView} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { paddingBottom: spacing.xxxl },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.lg,
    gap: spacing.sm,
  },
  h1: {
    fontFamily: typography.fontFamily.heading,
    fontSize: 36,
    textAlign: 'center',
    marginVertical: spacing.sm,
  },
  h2: {
    fontFamily: typography.fontFamily.heading,
    fontSize: 28,
    textAlign: 'center',
    marginVertical: spacing.sm,
  },
  h1Foreground: { color: colors.foreground },
  h1Primary: { color: colors.primary },
  subtitle: {
    color: colors.mutedForeground,
    textAlign: 'center',
    fontFamily: typography.fontFamily.body,
  },
  section: { paddingHorizontal: spacing.lg, paddingVertical: spacing.lg },
  sectionSub: {
    color: colors.mutedForeground,
    textAlign: 'center',
    fontFamily: typography.fontFamily.body,
    marginBottom: spacing.lg,
  },
  statsRow: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.lg },
  statCard: { flex: 1, padding: spacing.md, alignItems: 'center', gap: spacing.xs },
  statBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: {
    fontFamily: typography.fontFamily.heading,
    fontSize: 28,
    color: colors.foreground,
  },
  statLabel: { color: colors.mutedForeground, fontSize: 12 },
  filterCard: { padding: spacing.md, marginBottom: spacing.lg, gap: spacing.sm },
  filterHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: spacing.xs },
  filterTitle: {
    fontFamily: typography.fontFamily.bodyMedium,
    color: colors.foreground,
  },
  searchWrap: { position: 'relative', marginBottom: spacing.sm },
  searchIcon: { position: 'absolute', left: 12, top: 14, zIndex: 1 },
  searchInput: { paddingLeft: 36 },
  selectGrid: { gap: spacing.sm },
  logCard: { overflow: 'hidden' },
  logHeader: { padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  logTitle: { fontFamily: typography.fontFamily.heading, fontSize: 18, color: colors.foreground },
  empty: { color: colors.mutedForeground, textAlign: 'center', padding: spacing.lg },
  emptyWrap: { alignItems: 'center', padding: spacing.xl, gap: spacing.sm },
  row: {
    padding: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    gap: spacing.sm,
  },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  rowIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowName: { color: colors.foreground, fontFamily: typography.fontFamily.bodyMedium },
  rowSub: { color: colors.mutedForeground, fontSize: 12 },
  rowRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap', marginTop: spacing.xs },
  rowType: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  rowSelect: { minWidth: 120 },
  rowDate: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  rowDateText: { color: colors.mutedForeground, fontSize: 11 },
});
