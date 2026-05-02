/**
 * InfluencerDashboard — Creator Studio (6-section accordion)
 * Parity with Lovable web: origin/jarchert/playbook-promoter:src/pages/InfluencerDashboard.tsx
 *
 * Tabs → Accordion (matches CoachDashboard.tsx pattern in this RN app):
 *  compose   → InfluencerComposer + compact SportsNewsFeed (stacked)
 *  schedule  → InfluencerScheduleQueue
 *  library   → InfluencerContentLibrary
 *  news      → SportsNewsFeed (full)
 *  analytics → InfluencerAnalytics
 *  settings  → InfluencerSyndicationSettings
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  Pressable,
  RefreshControl,
} from 'react-native';
import {
  PenSquare,
  CalendarDays,
  FolderOpen,
  Newspaper,
  BarChart3,
  Webhook,
  ChevronDown,
  ChevronUp,
  Eye,
  Users,
} from 'lucide-react-native';
import { useMyInfluencerProfile } from '@/hooks/useInfluencer';
import { Navbar } from '@/components/Navbar';
import { StatTile } from '@/components/StatTile';
import { colors, typography, spacing, radius } from '@/lib/theme';
import { InfluencerComposer } from '@/components/influencer/InfluencerComposer';
import { InfluencerScheduleQueue } from '@/components/influencer/InfluencerScheduleQueue';
import { InfluencerContentLibrary } from '@/components/influencer/InfluencerContentLibrary';
import { InfluencerAnalytics } from '@/components/influencer/InfluencerAnalytics';
import { SportsNewsFeed } from '@/components/influencer/SportsNewsFeed';
import { InfluencerSyndicationSettings } from '@/components/influencer/InfluencerSyndicationSettings';

type SectionKey = 'compose' | 'schedule' | 'library' | 'news' | 'analytics' | 'settings';

type AccordionSeed = { title?: string; description?: string; url?: string; image?: string } | null;

function AccordionSection({ sectionKey, label, Icon, openKey, setOpenKey, children }: any) {
  const open = openKey === sectionKey;
  return (
    <View style={s.accordion}>
      <Pressable
        style={s.accordionHead}
        onPress={() => setOpenKey(open ? null : sectionKey)}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
      >
        <View style={s.accordionHeadLeft}>
          <Icon size={16} color={open ? colors.primary : colors.foreground} />
          <Text style={[s.accordionTitle, open && s.accordionTitleActive]}>{label}</Text>
        </View>
        {open
          ? <ChevronUp size={16} color={colors.foreground} />
          : <ChevronDown size={16} color={colors.foreground} />}
      </Pressable>
      {open ? <View style={s.accordionBody}>{children}</View> : null}
    </View>
  );
}

export default function InfluencerDashboard() {
  const { data: profile, isLoading, refetch } = useMyInfluencerProfile() as any;
  const [openKey, setOpenKey] = useState<SectionKey | null>('compose');
  const [composerSeed, setComposerSeed] = useState<AccordionSeed>(null);

  const handleSeedFromNews = (item: AccordionSeed) => {
    setComposerSeed(item);
    setOpenKey('compose');
  };

  return (
    <SafeAreaView style={s.container}>
      <Navbar />
      <ScrollView
        contentContainerStyle={s.content}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={colors.primary} />}
      >
        <View style={s.header}>
          <Text style={s.title}>Creator Studio</Text>
          <Text style={s.subtitle}>Compose, schedule, syndicate, and grow{profile?.handle ? ` as @${profile.handle}` : ''}</Text>
        </View>

        <View style={s.statsRow}>
          <StatTile label="Followers" value={profile?.follower_count ?? 0} icon={Users} />
          <StatTile label="Views (30d)" value={profile?.views_30d ?? 0} icon={Eye} />
        </View>

        <View style={s.accordions}>
          <AccordionSection
            sectionKey="compose" label="Compose" Icon={PenSquare}
            openKey={openKey} setOpenKey={setOpenKey}
          >
            <InfluencerComposer
              influencerId={profile?.id || ''}
              seed={composerSeed}
              onCleared={() => setComposerSeed(null)}
              syndicationEnabled={!!profile?.syndication_enabled}
            />
            <View style={{ height: spacing.md }} />
            <SportsNewsFeed onShareToCompose={handleSeedFromNews} compact />
          </AccordionSection>

          <AccordionSection
            sectionKey="schedule" label="Schedule" Icon={CalendarDays}
            openKey={openKey} setOpenKey={setOpenKey}
          >
            <InfluencerScheduleQueue influencerId={profile?.id || ''} />
          </AccordionSection>

          <AccordionSection
            sectionKey="library" label="Library" Icon={FolderOpen}
            openKey={openKey} setOpenKey={setOpenKey}
          >
            <InfluencerContentLibrary influencerId={profile?.id || ''} />
          </AccordionSection>

          <AccordionSection
            sectionKey="news" label="News Wire" Icon={Newspaper}
            openKey={openKey} setOpenKey={setOpenKey}
          >
            <SportsNewsFeed onShareToCompose={handleSeedFromNews} />
          </AccordionSection>

          <AccordionSection
            sectionKey="analytics" label="Analytics" Icon={BarChart3}
            openKey={openKey} setOpenKey={setOpenKey}
          >
            <InfluencerAnalytics influencerId={profile?.id || ''} />
          </AccordionSection>

          <AccordionSection
            sectionKey="settings" label="Syndication" Icon={Webhook}
            openKey={openKey} setOpenKey={setOpenKey}
          >
            <InfluencerSyndicationSettings
              influencerId={profile?.id || ''}
              initialUrl={profile?.syndication_webhook_url}
              initialEnabled={profile?.syndication_enabled}
            />
          </AccordionSection>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, gap: spacing.md, paddingBottom: spacing.xxl },
  header: { marginBottom: spacing.xs },
  title: {
    fontFamily: typography.fontFamily.heading,
    fontSize: typography.fontSize['2xl'],
    color: colors.foreground,
    letterSpacing: typography.letterSpacing.heading,
  },
  subtitle: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.sm,
    color: colors.mutedForeground,
    marginTop: 2,
  },
  statsRow: { flexDirection: 'row', gap: spacing.sm },
  accordions: { gap: spacing.sm },
  accordion: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  accordionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
  },
  accordionHeadLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  accordionTitle: {
    fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: typography.fontSize.base,
    color: colors.foreground,
  },
  accordionTitleActive: {
    color: colors.primary,
  },
  accordionBody: {
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: spacing.md,
  },
});
