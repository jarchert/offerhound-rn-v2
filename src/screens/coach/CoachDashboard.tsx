import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, SafeAreaView, RefreshControl, Pressable } from 'react-native';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { Users, Trophy, Mail, Share2, ChevronDown, ChevronUp } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useCoachAthleteMatches } from '@/hooks/useAthleteMatches';
import { useCoachActivity } from '@/hooks/useCoachActivity';
import { useCoachProfile } from '@/hooks/useCoachProfile';
import { Navbar } from '@/components/Navbar';
import { StatTile } from '@/components/StatTile';
import { SectionHeader } from '@/components/SectionHeader';
import { AthleteCard } from '@/components/AthleteCard';
import { PushNotificationPrompt } from '@/components/PushNotificationPrompt';
import { ShareRoleCardDialog } from '@/components/ShareRoleCardDialog';
import { CoachMatchSuggestionFeed } from '@/components/CoachMatchSuggestionFeed';
import { TransferPortalFeed } from '@/components/TransferPortalFeed';
import { CampDiscovery } from '@/components/CampDiscovery';
import { CampManagerDashboard } from '@/components/CampManagerDashboard';
import { StaffManager } from '@/components/StaffManager';
import { StaffMessaging } from '@/components/StaffMessaging';
import { SocialLinksManager } from '@/components/SocialLinksManager';
import { SocialSyndicationCenter } from '@/components/SocialSyndicationCenter';
import { colors, typography, spacing, radius } from '@/lib/theme';
import type { RootStackParamList } from '@/navigation/RootNavigator';

type SectionKey = 'matches' | 'transfer' | 'camps' | 'staff' | 'social';

function Accordion({ title, sectionKey, openKey, setOpenKey, children }: any) {
  const open = openKey === sectionKey;
  return (
    <View style={s.accordion}>
      <Pressable style={s.accordionHead} onPress={() => setOpenKey(open ? null : sectionKey)}>
        <Text style={s.accordionTitle}>{title}</Text>
        {open ? <ChevronUp size={18} color={colors.foreground} /> : <ChevronDown size={18} color={colors.foreground} />}
      </Pressable>
      {open ? <View style={s.accordionBody}>{children}</View> : null}
    </View>
  );
}

export default function CoachDashboard() {
  const nav = useNavigation<NavigationProp<RootStackParamList>>();
  const { user } = useAuth();
  const { data: matches = [], isLoading, refetch } = useCoachAthleteMatches();
  const { data: activity } = useCoachActivity();
  const { data: coachProfile } = useCoachProfile();

  const topMatches = matches.slice(0, 5);

  const [shareCardOpen, setShareCardOpen] = useState(false);
  const [openKey, setOpenKey] = useState<SectionKey | null>('matches');

  return (
    <SafeAreaView style={s.container}>
      <Navbar />
      <ScrollView
        contentContainerStyle={s.content}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={colors.primary} />}
      >
        <View style={s.header}>
          <View style={s.headerLeft}>
            <Text style={s.greeting}>Coach Dashboard</Text>
            <Text style={s.subtitle}>Recruiting overview</Text>
          </View>
          <ShareRoleCardDialog role="coach" open={shareCardOpen} onOpenChange={setShareCardOpen}>
            <Pressable style={s.shareBtn} accessibilityLabel="Share Coach Card">
              <Share2 size={14} color={colors.foreground} />
              <Text style={s.shareBtnText}>Share Card</Text>
            </Pressable>
          </ShareRoleCardDialog>
        </View>

        <PushNotificationPrompt />

        <View style={s.statsRow}>
          <StatTile label="Athlete Matches" value={matches.length} icon={Trophy} />
          <StatTile label="Saved" value={(activity as any)?.savedCount ?? 0} icon={Users} />
        </View>
        <View style={s.statsRow}>
          <StatTile label="Letters Sent" value={(activity as any)?.lettersSent ?? 0} icon={Mail} />
          <StatTile label="Active" value="—" icon={Users} />
        </View>

        {/* Top Matches (always visible) */}
        <View style={s.section}>
          <SectionHeader
            title="Top Athlete Matches"
            subtitle={matches.length > 0 ? `${matches.length} athletes matched` : 'Set your recruiting criteria'}
            actionLabel={matches.length > 0 ? 'See all' : undefined}
            onAction={() => nav.navigate('CoachDrawer' as any)}
          />
          {topMatches.length === 0 ? (
            <View style={s.empty}>
              <Text style={s.emptyText}>No athlete matches yet. Update your recruiting profile.</Text>
            </View>
          ) : (
            <View style={s.list}>
              {topMatches.map(m => (
                <AthleteCard
                  key={m.id}
                  athlete={m.athlete as any}
                  matchScore={m.match_score}
                  onPress={() => {/* navigate to athlete detail */}}
                />
              ))}
            </View>
          )}
        </View>

        {/* Match Suggestion Feed */}
        <Accordion title="AI Match Suggestions" sectionKey="matches" openKey={openKey} setOpenKey={setOpenKey}>
          <CoachMatchSuggestionFeed />
        </Accordion>

        {/* Transfer Portal */}
        <Accordion title="Transfer Portal Feed" sectionKey="transfer" openKey={openKey} setOpenKey={setOpenKey}>
          <TransferPortalFeed />
        </Accordion>

        {/* Camps */}
        <Accordion title="Camps & Events" sectionKey="camps" openKey={openKey} setOpenKey={setOpenKey}>
          <CampDiscovery coachSport={coachProfile?.sport} coachState={coachProfile?.state} />
          <View style={{ height: spacing.md }} />
          <CampManagerDashboard sport={coachProfile?.sport || 'football'} />
        </Accordion>

        {/* Staff */}
        <Accordion title="Staff & Messaging" sectionKey="staff" openKey={openKey} setOpenKey={setOpenKey}>
          <StaffManager onMessageStaff={() => setOpenKey('staff')} />
          <View style={{ height: spacing.md }} />
          <StaffMessaging />
        </Accordion>

        {/* Social */}
        <Accordion title="Social Presence" sectionKey="social" openKey={openKey} setOpenKey={setOpenKey}>
          <SocialLinksManager
            role="coach"
            profileName={coachProfile?.name}
            profileImageUrl={coachProfile?.image_url}
            initialLinks={(coachProfile?.social_links as any) || {}}
          />
          <View style={{ height: spacing.md }} />
          <SocialSyndicationCenter
            entityName={coachProfile?.name}
            profileUrl={coachProfile?.custom_url ? `https://offer-hound.com/coach/${coachProfile.custom_url}` : undefined}
          />
        </Accordion>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, gap: spacing.md, paddingBottom: spacing.xxl },
  header: { marginBottom: spacing.xs, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerLeft: { flex: 1 },
  shareBtn: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
    borderWidth: 1, borderColor: colors.border, borderRadius: radius.md,
    paddingVertical: spacing.sm, paddingHorizontal: spacing.md,
  },
  shareBtnText: { fontFamily: typography.fontFamily.bodySemiBold, fontSize: typography.fontSize.sm, color: colors.foreground },
  greeting: { fontFamily: typography.fontFamily.heading, fontSize: typography.fontSize['2xl'], color: colors.foreground, letterSpacing: typography.letterSpacing.heading },
  subtitle: { fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.sm, color: colors.mutedForeground, marginTop: 2 },
  statsRow: { flexDirection: 'row', gap: spacing.sm },
  section: { gap: spacing.sm },
  list: { gap: spacing.sm },
  empty: { padding: spacing.lg, backgroundColor: colors.card, borderRadius: 12, borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
  emptyText: { fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.sm, color: colors.mutedForeground, textAlign: 'center' },
  accordion: { backgroundColor: colors.card, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  accordionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.md },
  accordionTitle: { fontFamily: typography.fontFamily.bodySemiBold, fontSize: typography.fontSize.base, color: colors.foreground },
  accordionBody: { padding: spacing.md, borderTopWidth: 1, borderTopColor: colors.border, gap: spacing.md },
});
