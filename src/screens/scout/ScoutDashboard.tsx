import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, SafeAreaView, RefreshControl, Pressable } from 'react-native';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { Users, Trophy, FileText, Share2, ChevronDown, ChevronUp } from 'lucide-react-native';
import { useScoutPipelineAthletes } from '@/hooks/useScoutPipeline';
import { useScoutActivity } from '@/hooks/useScoutActivity';
import { useAuth } from '@/contexts/AuthContext';
import { Navbar } from '@/components/Navbar';
import { StatTile } from '@/components/StatTile';
import { SectionHeader } from '@/components/SectionHeader';
import { ShareRoleCardDialog } from '@/components/ShareRoleCardDialog';
import { ScoutAnalyticsDashboard } from '@/components/ScoutAnalyticsDashboard';
import { ScoutPipeline } from '@/components/ScoutPipeline';
import { TransferPortalFeed } from '@/components/TransferPortalFeed';
import { SocialLinksManager } from '@/components/SocialLinksManager';
import { SocialSyndicationCenter } from '@/components/SocialSyndicationCenter';
import { colors, typography, spacing, radius } from '@/lib/theme';
import type { RootStackParamList } from '@/navigation/RootNavigator';

type Sec = 'pipeline' | 'analytics' | 'transfer' | 'social';

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

export default function ScoutDashboard() {
  const nav = useNavigation<NavigationProp<RootStackParamList>>();
  const { user } = useAuth();
  const { data: pipeline = [], isLoading, refetch } = useScoutPipelineAthletes();
  const { data: activity } = useScoutActivity();
  const [shareOpen, setShareOpen] = useState(false);
  const [openKey, setOpenKey] = useState<Sec | null>('pipeline');

  return (
    <SafeAreaView style={s.container}>
      <Navbar />
      <ScrollView
        contentContainerStyle={s.content}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={colors.primary} />}
      >
        <View style={s.header}>
          <View style={{ flex: 1 }}>
            <Text style={s.title}>Scout Dashboard</Text>
            <Text style={s.subtitle}>Talent evaluation overview</Text>
          </View>
          <ShareRoleCardDialog role="scout" open={shareOpen} onOpenChange={setShareOpen}>
            <Pressable style={s.shareBtn} accessibilityLabel="Share Scout Card">
              <Share2 size={14} color={colors.foreground} />
              <Text style={s.shareBtnText}>Share Card</Text>
            </Pressable>
          </ShareRoleCardDialog>
        </View>

        <View style={s.statsRow}>
          <StatTile label="Pipeline" value={pipeline.length} icon={Trophy} />
          <StatTile label="Saved" value={(activity as any)?.savedCount ?? 0} icon={Users} />
        </View>
        <View style={s.statsRow}>
          <StatTile label="Letters Sent" value={(activity as any)?.lettersSent ?? 0} icon={FileText} />
          <StatTile label="Searches" value={(activity as any)?.searchesCount ?? 0} icon={Users} />
        </View>

        <View style={s.section}>
          <SectionHeader title="Active Pipeline" subtitle={`${pipeline.length} athletes being tracked`} />
          {pipeline.length === 0 ? (
            <View style={s.empty}><Text style={s.emptyText}>No athletes in your pipeline yet.</Text></View>
          ) : (
            <View style={s.list}>
              {(pipeline as any[]).slice(0, 5).map((p: any) => (
                <View key={p.id} style={s.item}>
                  <Text style={s.itemTitle}>{p.athlete?.full_name ?? 'Unknown'}</Text>
                  <Text style={s.itemMeta}>{p.stage_name ?? ''}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        <Accordion title="Scout Pipeline Manager" sectionKey="pipeline" openKey={openKey} setOpenKey={setOpenKey}>
          <ScoutPipeline />
        </Accordion>

        <Accordion title="Analytics" sectionKey="analytics" openKey={openKey} setOpenKey={setOpenKey}>
          <ScoutAnalyticsDashboard />
        </Accordion>

        <Accordion title="Transfer Portal" sectionKey="transfer" openKey={openKey} setOpenKey={setOpenKey}>
          <TransferPortalFeed />
        </Accordion>

        <Accordion title="Social Presence" sectionKey="social" openKey={openKey} setOpenKey={setOpenKey}>
          <SocialLinksManager role="scout" />
          <View style={{ height: spacing.md }} />
          <SocialSyndicationCenter />
        </Accordion>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, gap: spacing.md, paddingBottom: spacing.xxl },
  header: { marginBottom: spacing.xs, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  shareBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingVertical: spacing.sm, paddingHorizontal: spacing.md },
  shareBtnText: { fontFamily: typography.fontFamily.bodySemiBold, fontSize: typography.fontSize.sm, color: colors.foreground },
  title: { fontFamily: typography.fontFamily.heading, fontSize: typography.fontSize['2xl'], color: colors.foreground, letterSpacing: typography.letterSpacing.heading },
  subtitle: { fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.sm, color: colors.mutedForeground, marginTop: 2 },
  statsRow: { flexDirection: 'row', gap: spacing.sm },
  section: { gap: spacing.sm },
  list: { gap: spacing.xs },
  item: { padding: spacing.sm, backgroundColor: colors.card, borderRadius: 8, borderWidth: 1, borderColor: colors.border },
  itemTitle: { fontFamily: typography.fontFamily.bodySemiBold, fontSize: typography.fontSize.base, color: colors.foreground },
  itemMeta: { fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.xs, color: colors.mutedForeground, marginTop: 2 },
  empty: { padding: spacing.lg, backgroundColor: colors.card, borderRadius: 12, borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
  emptyText: { fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.sm, color: colors.mutedForeground, textAlign: 'center' },
  accordion: { backgroundColor: colors.card, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  accordionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.md },
  accordionTitle: { fontFamily: typography.fontFamily.bodySemiBold, fontSize: typography.fontSize.base, color: colors.foreground },
  accordionBody: { padding: spacing.md, borderTopWidth: 1, borderTopColor: colors.border, gap: spacing.md },
});
