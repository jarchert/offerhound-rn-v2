// Ported from Lovable web (src/components/CampMonetizationManager.tsx) — RN-adapted.
// Translations:
//   - shadcn Card/Button/Badge/Switch/Label/Input/Separator/Dialog → src/components/ui (RN)
//   - lucide-react → lucide-react-native
//   - Tailwind classes → StyleSheet via tokens (colors/spacing/typography)
//   - Loader2 → ActivityIndicator
//   - <input type="number"> → TextInput keyboardType="decimal-pad"
//   - grid-cols-2/4, md:grid-cols-2 → flex rows with flex: 1 / wrap
//   - max-h-64 overflow-y-auto, max-h-[80vh] → ScrollView with maxHeight
//   - onClick on a div → Pressable
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Pressable } from 'react-native';
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Switch } from '@/components/ui/Switch';
import { Label } from '@/components/ui/Label';
import { Input } from '@/components/ui/Input';
import { Separator } from '@/components/ui/Separator';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/Dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import {
  DollarSign, Crown, Shield, BarChart3, Award, ArrowLeft,
  CheckCircle2, Star, TrendingUp, Eye,
} from 'lucide-react-native';
import { colors, spacing, typography } from '@/lib/theme';

interface CampMonetizationManagerProps {
  campId: string;
  campName: string;
  onBack: () => void;
}

const PREMIUM_FEATURE_OPTIONS = [
  { id: 'ai_analytics', label: 'AI Performance Analytics', icon: BarChart3, description: 'Full AI scoring breakdown & insights' },
  { id: 'verified_badge', label: 'Verified Performance Badge', icon: Shield, description: 'Verified camp badge on athlete profile' },
  { id: 'ranking_boost', label: 'Ranking Visibility Boost', icon: TrendingUp, description: 'Higher visibility in recruiting searches' },
  { id: 'video_highlights', label: 'Video Highlight Reel', icon: Eye, description: 'Auto-generated performance highlights' },
];

export function CampMonetizationManager({ campId, campName, onBack }: CampMonetizationManagerProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showBadgeDialog, setShowBadgeDialog] = useState(false);

  const { data: camp, isLoading } = useQuery({
    queryKey: ['camp-monetization', campId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('camps')
        .select('*')
        .eq('id', campId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: enrollments = [] } = useQuery({
    queryKey: ['camp-enrollments-monetization', campId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('camp_enrollments')
        .select('*, player_profiles:athlete_profile_id(id, full_name, sport, position)')
        .eq('camp_id', campId);
      if (error) throw error;
      return data || [];
    },
  });

  const { data: aiScores = [] } = useQuery({
    queryKey: ['camp-ai-scores-monetization', campId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('camp_ai_scores')
        .select('*, player_profiles:athlete_profile_id(id, full_name)')
        .eq('camp_id', campId)
        .order('ai_rank', { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  const { data: existingBadges = [] } = useQuery({
    queryKey: ['camp-verified-badges', campId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('athlete_verified_badges')
        .select('*')
        .eq('camp_id', campId);
      if (error) throw error;
      return data || [];
    },
  });

  const updateCampPricing = useMutation({
    mutationFn: async (updates: Record<string, any>) => {
      const { error } = await supabase.from('camps').update(updates).eq('id', campId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['camp-monetization', campId] });
      queryClient.invalidateQueries({ queryKey: ['camps'] });
      toast({ title: 'Pricing Updated' });
    },
  });

  const awardBadge = useMutation({
    mutationFn: async (athleteProfileId: string) => {
      const score = aiScores.find((s: any) => s.athlete_profile_id === athleteProfileId);
      const { error } = await supabase.from('athlete_verified_badges').insert({
        athlete_profile_id: athleteProfileId,
        camp_id: campId,
        badge_type: 'camp_verified',
        badge_label: `${campName} Verified`,
        verified_by_user_id: user!.id,
        composite_score: score?.composite_score || null,
        sport: (camp as any)?.sport || null,
        camp_name: campName,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['camp-verified-badges', campId] });
      toast({ title: 'Badge Awarded', description: 'Verified performance badge added to athlete profile.' });
    },
  });

  const revokeBadge = useMutation({
    mutationFn: async (badgeId: string) => {
      const { error } = await supabase.from('athlete_verified_badges').delete().eq('id', badgeId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['camp-verified-badges', campId] });
      toast({ title: 'Badge Revoked' });
    },
  });

  if (isLoading) {
    return (
      <View style={s.loading}>
        <ActivityIndicator size="large" color={colors.mutedForeground} />
      </View>
    );
  }

  const premiumFeatures: string[] = (camp as any)?.premium_features || [];
  const premiumEnabled = (camp as any)?.premium_tier_enabled || false;
  const premiumPrice = (camp as any)?.premium_price_cents || 0;
  const standardPrice = (camp as any)?.price_cents || 0;
  const isFree = (camp as any)?.is_free;

  const paidEnrollments = enrollments.filter((e: any) => e.payment_status === 'paid');
  const premiumEnrollments = enrollments.filter((e: any) => e.payment_status === 'paid' && e.status === 'premium');
  const totalRevenue = paidEnrollments.length * (standardPrice / 100) + premiumEnrollments.length * (premiumPrice / 100);

  const badgedAthleteIds = new Set(existingBadges.map((b: any) => b.athlete_profile_id));

  const summaryCards = [
    { label: 'Standard Price', value: isFree ? 'Free' : `$${(standardPrice / 100).toFixed(2)}`, icon: DollarSign },
    { label: 'Premium Price', value: premiumEnabled ? `$${(premiumPrice / 100).toFixed(2)}` : 'Not Set', icon: Crown },
    { label: 'Paid Enrollments', value: String(paidEnrollments.length), icon: CheckCircle2 },
    { label: 'Est. Revenue', value: `$${totalRevenue.toFixed(2)}`, icon: TrendingUp },
  ];

  return (
    <View style={s.root}>
      {/* Header */}
      <View style={s.headerRow}>
        <Button variant="ghost" size="sm" onPress={onBack} leftIcon={<ArrowLeft size={16} color={colors.foreground} />}>
          Back
        </Button>
        <View style={{ flex: 1 }}>
          <View style={s.titleRow}>
            <DollarSign size={20} color={colors.primary} />
            <Text style={s.h2}>Monetization — {campName}</Text>
          </View>
          <Text style={s.muted}>Manage pricing tiers, premium features, and athlete badges</Text>
        </View>
      </View>

      {/* Revenue Summary */}
      <View style={s.summaryGrid}>
        {summaryCards.map(({ label, value, icon: Icon }) => (
          <Card key={label} style={s.summaryCard}>
            <CardContent style={s.summaryContent}>
              <View style={s.summaryRow}>
                <View style={s.iconBox}>
                  <Icon size={20} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.summaryValue}>{value}</Text>
                  <Text style={s.summaryLabel}>{label}</Text>
                </View>
              </View>
            </CardContent>
          </Card>
        ))}
      </View>

      {/* Tiered Pricing Configuration */}
      <Card>
        <CardHeader>
          <View style={s.cardTitleRow}>
            <Crown size={20} color={colors.primary} />
            <CardTitle>Tiered Pricing</CardTitle>
          </View>
          <CardDescription>Configure standard and premium registration tiers</CardDescription>
        </CardHeader>
        <CardContent style={{ gap: spacing.lg }}>
          <View style={s.spaceBetween}>
            <View style={{ flex: 1 }}>
              <Text style={s.medium}>Standard Registration</Text>
              <Text style={s.muted}>
                {isFree ? 'Free camp — no charge' : `$${(standardPrice / 100).toFixed(2)} per athlete`}
              </Text>
            </View>
            <Badge variant={isFree ? 'secondary' : 'default'}>
              {isFree ? 'Free' : 'Paid'}
            </Badge>
          </View>

          <Separator />

          <View style={{ gap: spacing.md }}>
            <View style={s.spaceBetween}>
              <View style={{ flex: 1, paddingRight: spacing.md }}>
                <Text style={s.medium}>Enable Premium Tier</Text>
                <Text style={s.muted}>Offer enhanced analytics and verified badges for premium registrants</Text>
              </View>
              <Switch
                value={premiumEnabled}
                onValueChange={(checked) => {
                  updateCampPricing.mutate({ premium_tier_enabled: checked });
                }}
              />
            </View>

            {premiumEnabled && (
              <View style={s.premiumBlock}>
                <View style={s.priceRow}>
                  <Label>Premium Price ($)</Label>
                  <Input
                    keyboardType="decimal-pad"
                    style={{ width: 128 }}
                    value={String(premiumPrice / 100)}
                    onChangeText={(text) => {
                      const cents = Math.round(parseFloat(text || '0') * 100);
                      updateCampPricing.mutate({ premium_price_cents: cents });
                    }}
                  />
                </View>

                <View style={{ gap: spacing.sm }}>
                  <Label>Premium Features Included</Label>
                  <View style={s.featuresGrid}>
                    {PREMIUM_FEATURE_OPTIONS.map(({ id, label, icon: Icon, description }) => {
                      const isActive = premiumFeatures.includes(id);
                      return (
                        <Pressable
                          key={id}
                          style={[s.featureCard, isActive ? s.featureActive : s.featureInactive]}
                          onPress={() => {
                            const updated = isActive
                              ? premiumFeatures.filter((f: string) => f !== id)
                              : [...premiumFeatures, id];
                            updateCampPricing.mutate({ premium_features: updated });
                          }}
                        >
                          <View style={[s.featureIcon, { backgroundColor: isActive ? 'rgba(231,175,8,0.1)' : colors.secondary }]}>
                            <Icon size={16} color={isActive ? colors.primary : colors.mutedForeground} />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={s.featureLabel}>{label}</Text>
                            <Text style={s.featureDesc}>{description}</Text>
                          </View>
                          {isActive && <CheckCircle2 size={16} color={colors.primary} />}
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              </View>
            )}
          </View>
        </CardContent>
      </Card>

      {/* Verified Badges Management */}
      <Card>
        <CardHeader>
          <View style={s.cardTitleRow}>
            <Award size={20} color={colors.primary} />
            <CardTitle>Verified Performance Badges</CardTitle>
          </View>
          <CardDescription>
            Award verified badges to athletes who participated. Badges appear on their public profiles.
          </CardDescription>
        </CardHeader>
        <CardContent style={{ gap: spacing.md }}>
          <View style={s.spaceBetween}>
            <Text style={s.muted}>
              {existingBadges.length} badge{existingBadges.length !== 1 ? 's' : ''} awarded
            </Text>
            <Button size="sm" onPress={() => setShowBadgeDialog(true)} leftIcon={<Award size={16} color={colors.primaryForeground} />}>
              Award Badges
            </Button>
          </View>

          {existingBadges.length > 0 && (
            <ScrollView style={{ maxHeight: 256 }} contentContainerStyle={{ gap: spacing.sm }}>
              {existingBadges.map((badge: any) => (
                <View key={badge.id} style={s.badgeRow}>
                  <View style={s.badgeLeft}>
                    <View style={s.badgeIcon}>
                      <Shield size={16} color={colors.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.medium}>{badge.badge_label}</Text>
                      {badge.composite_score && (
                        <Text style={s.muted}>Score: {badge.composite_score.toFixed(1)}</Text>
                      )}
                    </View>
                  </View>
                  <Button
                    size="sm"
                    variant="ghost"
                    onPress={() => revokeBadge.mutate(badge.id)}
                    textStyle={{ color: colors.destructive }}
                  >
                    Revoke
                  </Button>
                </View>
              ))}
            </ScrollView>
          )}
        </CardContent>
      </Card>

      {/* Award Badges Dialog */}
      <Dialog open={showBadgeDialog} onOpenChange={setShowBadgeDialog}>
        <DialogContent style={{ maxWidth: 512 }}>
          <DialogHeader>
            <DialogTitle>Award Verified Badges</DialogTitle>
            <DialogDescription>Select athletes to award a verified camp performance badge</DialogDescription>
          </DialogHeader>
          <View style={{ gap: spacing.sm }}>
            {aiScores.length > 0 ? (
              aiScores.map((score: any) => {
                const hasBadge = badgedAthleteIds.has(score.athlete_profile_id);
                return (
                  <View key={score.id} style={s.athleteRow}>
                    <View style={s.badgeLeft}>
                      <View style={s.rankBubble}>
                        <Text style={s.rankText}>#{score.ai_rank || '—'}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={s.medium}>{(score as any).player_profiles?.full_name || 'Unknown'}</Text>
                        <Text style={s.muted}>Score: {score.composite_score?.toFixed(1)}</Text>
                      </View>
                    </View>
                    {hasBadge ? (
                      <Badge variant="default">
                        <View style={s.badgeInline}>
                          <CheckCircle2 size={12} color={colors.primaryForeground} />
                          <Text style={s.badgeInlineText}>Awarded</Text>
                        </View>
                      </Badge>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onPress={() => awardBadge.mutate(score.athlete_profile_id)}
                        disabled={awardBadge.isPending}
                        leftIcon={<Star size={12} color={colors.foreground} />}
                      >
                        Award
                      </Button>
                    )}
                  </View>
                );
              })
            ) : enrollments.length > 0 ? (
              enrollments
                .filter((e: any) => e.athlete_profile_id)
                .map((enrollment: any) => {
                  const hasBadge = badgedAthleteIds.has(enrollment.athlete_profile_id);
                  return (
                    <View key={enrollment.id} style={s.athleteRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={s.medium}>{enrollment.player_profiles?.full_name || 'Unknown'}</Text>
                      </View>
                      {hasBadge ? (
                        <Badge variant="default">
                          <View style={s.badgeInline}>
                            <CheckCircle2 size={12} color={colors.primaryForeground} />
                            <Text style={s.badgeInlineText}>Awarded</Text>
                          </View>
                        </Badge>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onPress={() => awardBadge.mutate(enrollment.athlete_profile_id)}
                          disabled={awardBadge.isPending}
                          leftIcon={<Star size={12} color={colors.foreground} />}
                        >
                          Award
                        </Button>
                      )}
                    </View>
                  );
                })
            ) : (
              <Text style={[s.muted, { textAlign: 'center', paddingVertical: spacing.lg }]}>
                No scored or enrolled athletes found.
              </Text>
            )}
          </View>
          <DialogFooter>
            <Button variant="outline" onPress={() => setShowBadgeDialog(false)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </View>
  );
}

const s = StyleSheet.create({
  root: { gap: spacing.lg },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.xxxl },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  h2: {
    fontFamily: typography.fontFamily.heading,
    fontSize: typography.fontSize.xl,
    color: colors.foreground,
    letterSpacing: typography.letterSpacing.heading,
  },
  muted: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.sm,
    color: colors.mutedForeground,
  },
  medium: {
    fontFamily: typography.fontFamily.bodyMedium,
    fontSize: typography.fontSize.base,
    color: colors.foreground,
  },
  summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  summaryCard: { flexBasis: '47%', flexGrow: 1 },
  summaryContent: { paddingTop: spacing.lg },
  summaryRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  iconBox: { padding: spacing.sm, backgroundColor: 'rgba(231,175,8,0.1)', borderRadius: 8 },
  summaryValue: {
    fontFamily: typography.fontFamily.heading,
    fontSize: typography.fontSize.lg,
    color: colors.foreground,
    letterSpacing: typography.letterSpacing.heading,
  },
  summaryLabel: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.xs,
    color: colors.mutedForeground,
  },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  spaceBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  premiumBlock: {
    gap: spacing.md,
    paddingLeft: spacing.md,
    borderLeftWidth: 2,
    borderLeftColor: 'rgba(231,175,8,0.2)',
  },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  featuresGrid: { gap: spacing.sm },
  featureCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: 12,
    borderWidth: 1,
  },
  featureActive: { borderColor: colors.primary, backgroundColor: 'rgba(231,175,8,0.05)' },
  featureInactive: { borderColor: colors.border },
  featureIcon: { padding: 6, borderRadius: 8 },
  featureLabel: {
    fontFamily: typography.fontFamily.bodyMedium,
    fontSize: typography.fontSize.sm,
    color: colors.foreground,
  },
  featureDesc: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.xs,
    color: colors.mutedForeground,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.sm,
    backgroundColor: 'rgba(39,43,52,0.3)',
    borderRadius: 12,
    gap: spacing.sm,
  },
  badgeLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1 },
  badgeIcon: {
    padding: spacing.sm,
    backgroundColor: 'rgba(231,175,8,0.1)',
    borderRadius: 999,
  },
  athleteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.sm,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  rankBubble: {
    width: 32,
    height: 32,
    borderRadius: 999,
    backgroundColor: 'rgba(231,175,8,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankText: {
    fontFamily: typography.fontFamily.bodyBold,
    fontSize: typography.fontSize.sm,
    color: colors.primary,
  },
  badgeInline: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  badgeInlineText: {
    fontFamily: typography.fontFamily.bodyMedium,
    fontSize: typography.fontSize.xs,
    color: colors.primaryForeground,
  },
});
