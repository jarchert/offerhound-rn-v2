// Ported from Lovable web: src/components/agency/AgencyTeamView.tsx
// Translations:
//   <div>/<p>/<h3>/<span> → <View>/<Text>
//   Tailwind classes → StyleSheet using @/lib/theme tokens
//   @/components/ui/* (lowercase) → PascalCase imports
//   lucide-react → lucide-react-native
//   ScrollView wraps the page; grid rows mapped to flex/wrap layouts
//   Data logic (queries, aggregations, derived metrics) unchanged
import React from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent } from '@/components/ui/Card';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Progress } from '@/components/ui/Progress';
import {
  Users,
  Mail,
  Phone,
  MapPin,
  FileText,
  Heart,
  BarChart3,
  Clock,
  CheckCircle2,
  XCircle,
  Star,
} from 'lucide-react-native';
import { colors, spacing, typography } from '@/lib/theme';

const ROLE_LABELS: Record<string, string> = {
  recruiter: 'Recruiter',
  senior_recruiter: 'Senior Recruiter',
  regional_scout: 'Regional Scout',
  evaluator: 'Evaluator',
  coordinator: 'Coordinator',
  analyst: 'Analyst',
  admin: 'Office Admin',
};

type StatusKey = 'active' | 'invited' | 'suspended';

const STATUS_CFG: Record<
  StatusKey,
  { bg: string; fg: string; border: string; Icon: typeof CheckCircle2 }
> = {
  active: { bg: 'rgba(22,161,73,0.15)', fg: '#16a149', border: 'rgba(22,161,73,0.25)', Icon: CheckCircle2 },
  invited: { bg: 'rgba(244,158,10,0.15)', fg: '#f49e0a', border: 'rgba(244,158,10,0.25)', Icon: Clock },
  suspended: { bg: 'rgba(220,40,40,0.15)', fg: '#dc2828', border: 'rgba(220,40,40,0.25)', Icon: XCircle },
};

export function AgencyTeamView() {
  const { user } = useAuth();

  const { data: staff = [], isLoading } = useQuery({
    queryKey: ['agency-team-view', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('coaching_staff')
        .select('*')
        .eq('owner_user_id', user.id)
        .neq('status', 'removed')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  const { data: agencyStats } = useQuery({
    queryKey: ['agency-team-stats', user?.id],
    queryFn: async () => {
      if (!user) return {};
      const [activityRes, pipelineRes, lettersRes] = await Promise.all([
        supabase.from('scout_activity_log').select('id', { count: 'exact', head: true }).eq('scout_user_id', user.id),
        supabase.from('scout_athlete_pipeline_status').select('id', { count: 'exact', head: true }).eq('scout_user_id', user.id),
        supabase.from('scout_letter_history').select('id', { count: 'exact', head: true }).eq('scout_user_id', user.id),
      ]);
      return {
        totalActivities: activityRes.count || 0,
        totalPipeline: pipelineRes.count || 0,
        totalLetters: lettersRes.count || 0,
      };
    },
    enabled: !!user,
  });

  const activeCount = staff.filter((m: any) => m.status === 'active').length;
  const totalStaff = staff.length;

  if (isLoading) {
    return (
      <View style={s.center}>
        <ActivityIndicator color={colors.mutedForeground} />
      </View>
    );
  }

  if (totalStaff === 0) {
    return (
      <Card style={{ borderStyle: 'dashed' }}>
        <CardContent style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 64, gap: spacing.sm }}>
          <Users size={56} color={colors.mutedForeground} />
          <Text style={s.emptyTitle}>No Team Members</Text>
          <Text style={s.emptyBody}>
            Add recruiters through the Staff tab to see your team overview with individual analytics here.
          </Text>
        </CardContent>
      </Card>
    );
  }

  return (
    <ScrollView contentContainerStyle={{ gap: spacing.lg, padding: spacing.md }}>
      {/* Summary banner */}
      <View style={s.summaryGrid}>
        <SummaryTile icon={<Users size={20} color={colors.primary} />} value={totalStaff} label="Total Recruiters" tint="primary" />
        <SummaryTile icon={<CheckCircle2 size={20} color={'#16a149'} />} value={activeCount} label="Active" tint="success" />
        <SummaryTile icon={<Heart size={20} color={colors.primary} />} value={agencyStats?.totalPipeline || 0} label="In Pipeline" tint="primary" />
        <SummaryTile icon={<FileText size={20} color={colors.primary} />} value={agencyStats?.totalLetters || 0} label="Letters Sent" tint="primary" />
      </View>

      {/* Recruiter cards */}
      <View style={{ gap: spacing.md }}>
        {staff.map((member: any) => {
          const statusKey: StatusKey = (STATUS_CFG[member.status as StatusKey] ? member.status : 'active') as StatusKey;
          const cfg = STATUS_CFG[statusKey];
          const StatusIcon = cfg.Icon;
          const roleLabel = ROLE_LABELS[member.role] || member.role;
          const initials =
            member.name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() || '??';

          const pipelineShare = totalStaff > 0 ? Math.round((agencyStats?.totalPipeline || 0) / totalStaff) : 0;
          const letterShare = totalStaff > 0 ? Math.round((agencyStats?.totalLetters || 0) / totalStaff) : 0;
          const activityShare = totalStaff > 0 ? Math.round((agencyStats?.totalActivities || 0) / totalStaff) : 0;
          const performanceScore =
            member.status === 'active' ? Math.min(100, 40 + pipelineShare * 3 + letterShare * 5) : 0;
          const daysSinceJoin = member.created_at
            ? Math.floor((Date.now() - new Date(member.created_at).getTime()) / (1000 * 60 * 60 * 24))
            : 0;

          return (
            <Card key={member.id} style={s.recruiterCard}>
              <View style={s.gradientStripe} />
              <CardContent style={{ padding: spacing.md, gap: spacing.md }}>
                {/* Profile row */}
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm }}>
                  <Avatar size={56} fallback={initials} />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs, flexWrap: 'wrap' }}>
                      <Text style={s.name} numberOfLines={1}>{member.name}</Text>
                      <Badge
                        variant="outline"
                        style={{ backgroundColor: cfg.bg, borderColor: cfg.border }}
                      >
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                          <StatusIcon size={10} color={cfg.fg} />
                          <Text style={{ fontFamily: typography.fontFamily.bodySemiBold, fontSize: 10, color: cfg.fg }}>
                            {member.status}
                          </Text>
                        </View>
                      </Badge>
                    </View>
                    <Text style={s.subtle}>{member.title || roleLabel}</Text>
                    <Badge variant="secondary" style={{ marginTop: 4 }}>{roleLabel}</Badge>
                  </View>
                </View>

                {/* Contact */}
                <View style={{ gap: 4 }}>
                  {member.email ? (
                    <View style={s.contactRow}>
                      <Mail size={14} color={colors.mutedForeground} />
                      <Text style={s.contactText} numberOfLines={1}>{member.email}</Text>
                    </View>
                  ) : null}
                  {member.phone ? (
                    <View style={s.contactRow}>
                      <Phone size={14} color={colors.mutedForeground} />
                      <Text style={s.contactText}>{member.phone}</Text>
                    </View>
                  ) : null}
                  {member.notes ? (
                    <View style={s.contactRow}>
                      <MapPin size={14} color={colors.mutedForeground} />
                      <Text style={s.contactText}>{member.notes}</Text>
                    </View>
                  ) : null}
                </View>

                {/* Analytics */}
                <View style={{ borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.sm, gap: spacing.sm }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <BarChart3 size={14} color={colors.mutedForeground} />
                    <Text style={s.analyticsHeader}>Recruiter Analytics</Text>
                  </View>

                  <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                    <StatTile value={pipelineShare} label="Pipeline" />
                    <StatTile value={letterShare} label="Letters" />
                    <StatTile value={activityShare} label="Activities" />
                  </View>

                  {/* Performance */}
                  <View style={{ gap: 6 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={s.subtleSm}>Performance</Text>
                      <Text style={s.perfValue}>{performanceScore}%</Text>
                    </View>
                    <Progress value={performanceScore} />
                  </View>

                  {/* Tenure */}
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 4 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <Clock size={12} color={colors.mutedForeground} />
                      <Text style={s.subtleSm}>Joined {daysSinceJoin}d ago</Text>
                    </View>
                    {member.status === 'active' && (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Star size={12} color={'#16a149'} />
                        <Text style={[s.subtleSm, { color: '#16a149' }]}>Active</Text>
                      </View>
                    )}
                  </View>
                </View>
              </CardContent>
            </Card>
          );
        })}
      </View>
    </ScrollView>
  );
}

function SummaryTile({
  icon,
  value,
  label,
  tint,
}: {
  icon: React.ReactNode;
  value: number;
  label: string;
  tint: 'primary' | 'success';
}) {
  const tintBg = tint === 'success' ? 'rgba(22,161,73,0.10)' : 'rgba(231,175,8,0.10)';
  return (
    <View style={s.summaryTile}>
      <Card style={{ flex: 1 }}>
        <CardContent style={{ padding: spacing.sm + 4, flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <View style={[s.summaryIconBox, { backgroundColor: tintBg }]}>{icon}</View>
          <View>
            <Text style={s.summaryValue}>{value}</Text>
            <Text style={s.summaryLabel}>{label}</Text>
          </View>
        </CardContent>
      </Card>
    </View>
  );
}

function StatTile({ value, label }: { value: number; label: string }) {
  return (
    <View style={s.statTile}>
      <Text style={s.statValue}>{value}</Text>
      <Text style={s.statLabel}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 64 },

  emptyTitle: {
    fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: typography.fontSize.lg,
    color: colors.foreground,
  },
  emptyBody: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.sm,
    color: colors.mutedForeground,
    textAlign: 'center',
    maxWidth: 360,
  },

  summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  summaryTile: { width: '48%', flexGrow: 1 },
  summaryIconBox: { padding: 10, borderRadius: 12 },
  summaryValue: {
    fontFamily: typography.fontFamily.heading,
    fontSize: typography.fontSize.xl,
    color: colors.foreground,
    letterSpacing: typography.letterSpacing.heading,
  },
  summaryLabel: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.xs,
    color: colors.mutedForeground,
  },

  recruiterCard: { overflow: 'hidden', borderColor: colors.border },
  gradientStripe: { height: 6, backgroundColor: colors.primary, opacity: 0.45 },

  name: {
    fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: typography.fontSize.md,
    color: colors.foreground,
    flexShrink: 1,
  },
  subtle: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.sm,
    color: colors.mutedForeground,
  },
  subtleSm: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.xs,
    color: colors.mutedForeground,
  },

  contactRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  contactText: { fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.xs, color: colors.mutedForeground, flexShrink: 1 },

  analyticsHeader: {
    fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: typography.fontSize.xs,
    color: colors.mutedForeground,
  },

  statTile: { flex: 1, padding: spacing.xs + 4, borderRadius: 8, backgroundColor: colors.muted, alignItems: 'center' },
  statValue: { fontFamily: typography.fontFamily.bodySemiBold, fontSize: typography.fontSize.lg, color: colors.foreground },
  statLabel: { fontFamily: typography.fontFamily.body, fontSize: 10, color: colors.mutedForeground },

  perfValue: { fontFamily: typography.fontFamily.bodySemiBold, fontSize: typography.fontSize.xs, color: colors.foreground },
});

export default AgencyTeamView;
