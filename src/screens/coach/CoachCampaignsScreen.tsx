// CoachCampaignsScreen — RN port of Lovable src/pages/CoachCampaigns.tsx (169 LOC).
// Roster gap campaign list + dialog form for college coaches. Club/HS roles handled by
// sibling tab navigators in RN; we no-op the redirect that the web does via react-router.
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Megaphone, Clock, CheckCircle, XCircle, Target, Loader2 } from 'lucide-react-native';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Textarea } from '@/components/ui/Textarea';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/Select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/Dialog';
import { BackButton } from '@/components/BackButton';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useCoachProfile } from '@/hooks/useCoachProfile';
import { useHSCoachProfile } from '@/hooks/useHSCoachProfile';
import { supabase } from '@/integrations/supabase/client';
import { colors, typography, spacing, radius } from '@/lib/theme';

import { Navbar } from '@/components/Navbar';
type CampaignStatus = 'draft' | 'active' | 'paused' | 'completed';

const STATUS_CONFIG: Record<
  CampaignStatus,
  { label: string; bg: string; fg: string; icon: typeof Clock }
> = {
  draft:     { label: 'Draft',     bg: colors.muted,             fg: colors.mutedForeground,    icon: Clock },
  active:    { label: 'Active',    bg: 'rgba(231,175,8,0.10)',   fg: colors.primary,            icon: CheckCircle },
  paused:    { label: 'Paused',    bg: colors.accent,            fg: colors.accentForeground,   icon: Clock },
  completed: { label: 'Completed', bg: colors.secondary,         fg: colors.secondaryForeground, icon: XCircle },
};

const SPORTS = [
  'Football','Basketball','Baseball','Soccer','Softball','Volleyball',
  'Lacrosse','Hockey','Golf','Swimming','Track','Wrestling',
];

export default function CoachCampaignsScreen() {
  const { user } = useAuth() as any;
  const nav = useNavigation<any>();
  const { data: coachProfile, isFetched: profileFetched } = useCoachProfile();
  const { data: hsProfile, isFetched: hsFetched } = useHSCoachProfile();
  const { toast } = useToast();
  const qc = useQueryClient();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [newCampaign, setNewCampaign] = useState({ position: '', sport: 'Football', region: '', brief: '' });

  const isClubCoach = !!(coachProfile as any)?.is_club_coach;
  const isHSCoach = !!hsProfile;

  // Web redirected club/HS coaches; RN's role-based navigator already handles this.
  useEffect(() => {
    if (!profileFetched || !hsFetched) return;
    // No-op: sibling tabs/role navigators are mounted by RootNavigator.
  }, [profileFetched, hsFetched, coachProfile, isClubCoach, isHSCoach]);

  const { data: campaigns = [], isLoading } = useQuery({
    queryKey: ['coach-campaigns', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('roster_gap_campaigns' as any)
        .select('*')
        .eq('coach_user_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not authenticated');
      const { error } = await supabase.from('roster_gap_campaigns' as any).insert({
        coach_user_id: user.id,
        position: newCampaign.position,
        sport: newCampaign.sport,
        region_targets: newCampaign.region ? [newCampaign.region] : [],
        brief_content: newCampaign.brief,
        compliance_disclaimer_text: 'This campaign complies with NCAA/NAIA recruiting guidelines.',
        status: 'draft',
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['coach-campaigns'] });
      setDialogOpen(false);
      setNewCampaign({ position: '', sport: 'Football', region: '', brief: '' });
      toast({ title: 'Campaign created' });
    },
    onError: () => toast({ title: 'Error creating campaign', variant: 'destructive' }),
  });

  return (
    <SafeAreaView style={s.root}>
      <Navbar />
      <View style={s.headerBar}>
        <BackButton label="Back" />
      </View>
      <ScrollView contentContainerStyle={s.content}>
        <View style={s.titleRow}>
          <Megaphone size={32} color={colors.primary} />
          <View style={{ flex: 1 }}>
            <Text style={s.h1}>Roster Gap Campaigns</Text>
            <Text style={s.subtitle}>Create and manage recruiting campaigns for roster needs</Text>
          </View>
        </View>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button leftIcon={<Plus size={16} color={colors.primaryForeground} />}>New Campaign</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Campaign</DialogTitle>
            </DialogHeader>
            <View style={{ gap: spacing.md, paddingTop: spacing.sm }}>
              <View style={s.row2}>
                <View style={{ flex: 1 }}>
                  <Label>Position Needed</Label>
                  <Input
                    placeholder="e.g. Quarterback"
                    value={newCampaign.position}
                    onChangeText={(v) => setNewCampaign((p) => ({ ...p, position: v }))}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Label>Sport</Label>
                  <Select
                    value={newCampaign.sport}
                    onValueChange={(v) => setNewCampaign((p) => ({ ...p, sport: v }))}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {SPORTS.map((sp) => (
                        <SelectItem key={sp} value={sp}>{sp}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </View>
              </View>
              <View>
                <Label>Target Region</Label>
                <Input
                  placeholder="e.g. Southeast, Texas"
                  value={newCampaign.region}
                  onChangeText={(v) => setNewCampaign((p) => ({ ...p, region: v }))}
                />
              </View>
              <View>
                <Label>Campaign Brief</Label>
                <Textarea
                  placeholder="Describe the ideal recruit profile, scheme fit, and any specific requirements..."
                  rows={4}
                  value={newCampaign.brief}
                  onChangeText={(v) => setNewCampaign((p) => ({ ...p, brief: v }))}
                />
              </View>
              <Button
                onPress={() => createMutation.mutate()}
                disabled={!newCampaign.position || createMutation.isPending}
              >
                {createMutation.isPending ? 'Creating...' : 'Create Campaign'}
              </Button>
            </View>
          </DialogContent>
        </Dialog>

        {isLoading ? (
          <View style={s.center}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : campaigns.length === 0 ? (
          <Card style={{ marginTop: spacing.lg }}>
            <CardContent style={s.emptyContent}>
              <Target size={48} color={colors.mutedForeground} style={{ marginBottom: spacing.md }} />
              <Text style={s.emptyTitle}>No Campaigns Yet</Text>
              <Text style={s.emptyBody}>
                Create your first roster gap campaign to start targeted recruiting.
              </Text>
              <Button
                onPress={() => setDialogOpen(true)}
                leftIcon={<Plus size={16} color={colors.primaryForeground} />}
                style={{ marginTop: spacing.md }}
              >
                Create Campaign
              </Button>
            </CardContent>
          </Card>
        ) : (
          <View style={{ gap: spacing.md, marginTop: spacing.lg }}>
            {campaigns.map((c: any) => {
              const status = (c.status as CampaignStatus) || 'draft';
              const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.draft;
              const Icon = cfg.icon;
              return (
                <Card key={c.id}>
                  <CardHeader>
                    <View style={s.cardHeadRow}>
                      <CardTitle style={{ flex: 1 }}>{c.position || 'Untitled'}</CardTitle>
                      <View style={[s.statusBadge, { backgroundColor: cfg.bg }]}>
                        <Icon size={12} color={cfg.fg} />
                        <Text style={[s.statusText, { color: cfg.fg }]}>{cfg.label}</Text>
                      </View>
                    </View>
                  </CardHeader>
                  <CardContent style={{ gap: spacing.sm }}>
                    <View style={s.badgeRow}>
                      <Badge variant="outline">{c.sport}</Badge>
                      {c.region_targets?.map((r: string) => (
                        <Badge key={r} variant="secondary">{r}</Badge>
                      ))}
                    </View>
                    {c.brief_content ? (
                      <Text style={s.briefText} numberOfLines={2}>{c.brief_content}</Text>
                    ) : null}
                    <Text style={s.metaText}>
                      Created {new Date(c.created_at).toLocaleDateString()}
                    </Text>
                  </CardContent>
                </Card>
              );
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  headerBar: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  content: { padding: spacing.md, paddingBottom: spacing.xxl, maxWidth: 900, width: '100%', alignSelf: 'center' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: spacing.sm, marginBottom: spacing.md },
  h1: {
    fontFamily: typography.fontFamily.heading,
    fontSize: typography.heading.h2,
    color: colors.foreground,
    letterSpacing: typography.letterSpacing.heading,
  },
  subtitle: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.sm,
    color: colors.mutedForeground,
  },
  row2: { flexDirection: 'row', gap: spacing.md },
  center: { paddingVertical: spacing.xxl, alignItems: 'center' },
  emptyContent: { paddingVertical: spacing.xl, alignItems: 'center' },
  emptyTitle: {
    fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: typography.fontSize.lg,
    color: colors.foreground,
    marginBottom: spacing.xs,
  },
  emptyBody: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.sm,
    color: colors.mutedForeground,
    textAlign: 'center',
  },
  cardHeadRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.sm },
  statusBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: spacing.sm, paddingVertical: 4,
    borderRadius: radius.full,
  },
  statusText: { fontFamily: typography.fontFamily.bodyMedium, fontSize: typography.fontSize.xs },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  briefText: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.sm,
    color: colors.mutedForeground,
  },
  metaText: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.xs,
    color: colors.mutedForeground,
  },
});
