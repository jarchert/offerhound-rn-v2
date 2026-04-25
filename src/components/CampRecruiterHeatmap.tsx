// Ported from Lovable web (src/components/CampRecruiterHeatmap.tsx) — RN-adapted.
// Translations:
//   - shadcn Card/Badge → src/components/ui (RN)
//   - lucide-react → lucide-react-native
//   - @tanstack/react-query — same API, same query
//   - Tailwind classes → StyleSheet via theme tokens
//   - hsl(var(--primary) / 0.32) dynamic alpha → rgba(231,175,8, alpha) (primary = #e7af08)
//   - Loader2 spinner → ActivityIndicator
//   - flex-wrap grids (md:grid-cols-3) → flexWrap row with flexBasis
import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Flame, GraduationCap } from 'lucide-react-native';
import { colors, spacing, typography, radius } from '@/lib/theme';

interface Props {
  campId: string;
  campName: string;
}

interface PositionBucket {
  position: string;
  recruiterCount: number;
  recruiters: { name: string; school: string | null; division: string | null }[];
}

interface SchoolBucket {
  school: string;
  count: number;
  divisions: string[];
}

// Primary gold = #e7af08 → rgb(231,175,8)
const primaryRGBA = (alpha: number) => `rgba(231, 175, 8, ${alpha})`;

export function CampRecruiterHeatmap({ campId, campName }: Props) {
  const { data, isLoading } = useQuery({
    queryKey: ['camp-recruiter-heatmap', campId],
    queryFn: async () => {
      const { data: rows } = await supabase
        .from('camp_recruiter_attendance')
        .select('recruiter_name, school_name, division, positions_watching')
        .eq('camp_id', campId);

      const list = rows || [];
      const positionMap = new Map<string, PositionBucket>();
      const schoolMap = new Map<string, SchoolBucket>();
      const divisionMap = new Map<string, number>();

      for (const r of list as any[]) {
        const positions: string[] = Array.isArray(r.positions_watching) ? r.positions_watching : [];
        for (const pos of positions) {
          const key = pos.trim();
          if (!key) continue;
          const cur = positionMap.get(key) || { position: key, recruiterCount: 0, recruiters: [] };
          cur.recruiterCount += 1;
          cur.recruiters.push({ name: r.recruiter_name, school: r.school_name, division: r.division });
          positionMap.set(key, cur);
        }
        if (r.school_name) {
          const sk = r.school_name.trim();
          const sc = schoolMap.get(sk) || { school: sk, count: 0, divisions: [] };
          sc.count += 1;
          if (r.division && !sc.divisions.includes(r.division)) sc.divisions.push(r.division);
          schoolMap.set(sk, sc);
        }
        if (r.division) {
          divisionMap.set(r.division, (divisionMap.get(r.division) || 0) + 1);
        }
      }

      const positions = Array.from(positionMap.values()).sort((a, b) => b.recruiterCount - a.recruiterCount);
      const schools = Array.from(schoolMap.values()).sort((a, b) => b.count - a.count);
      const divisions = Array.from(divisionMap.entries())
        .map(([k, v]) => ({ division: k, count: v }))
        .sort((a, b) => b.count - a.count);

      return { positions, schools, divisions, totalRecruiters: list.length };
    },
  });

  if (isLoading) {
    return (
      <View style={{ alignItems: 'center', paddingVertical: spacing.xl }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  const positions = data?.positions || [];
  const schools = data?.schools || [];
  const divisions = data?.divisions || [];
  const total = data?.totalRecruiters || 0;
  const maxPosCount = Math.max(1, ...positions.map((p) => p.recruiterCount));

  return (
    <View style={{ gap: spacing.md }}>
      <Card>
        <CardHeader>
          <CardTitle style={styles.titleRow}>
            <Flame size={20} color={colors.primary} />
            <Text style={styles.titleText}> Recruiter focus heatmap</Text>
          </CardTitle>
          <CardDescription>
            {campName} — {total} {total === 1 ? 'coach' : 'coaches'} on-site
          </CardDescription>
        </CardHeader>
        <CardContent>
          {positions.length === 0 ? (
            <Text style={styles.emptyText}>
              No recruiters have logged positions watched yet. Use “Log recruiter” on the
              attendance tab to start tracking interest.
            </Text>
          ) : (
            <View style={{ gap: spacing.xs + 2 }}>
              {positions.map((p) => {
                const intensity = p.recruiterCount / maxPosCount;
                return (
                  <View
                    key={p.position}
                    style={[
                      styles.positionRow,
                      { backgroundColor: primaryRGBA(0.06 + intensity * 0.32) },
                    ]}
                  >
                    <View style={styles.positionHeaderRow}>
                      <View style={styles.positionLeft}>
                        <Text style={styles.positionName}>{p.position}</Text>
                        <Badge variant="secondary">
                          <Text style={styles.badgeSecondaryText}>
                            {p.recruiterCount} {p.recruiterCount === 1 ? 'recruiter' : 'recruiters'}
                          </Text>
                        </Badge>
                      </View>
                      <View style={styles.recruiterBadgeWrap}>
                        {p.recruiters.slice(0, 4).map((r, idx) => (
                          <Badge key={idx} variant="outline">
                            <Text style={styles.badgeOutlineText} numberOfLines={1}>
                              {r.school || r.name}{r.division ? ` · ${r.division}` : ''}
                            </Text>
                          </Badge>
                        ))}
                        {p.recruiters.length > 4 && (
                          <Badge variant="outline">
                            <Text style={styles.badgeOutlineText}>+{p.recruiters.length - 4} more</Text>
                          </Badge>
                        )}
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </CardContent>
      </Card>

      {schools.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle style={styles.titleRow}>
              <GraduationCap size={20} color={colors.primary} />
              <Text style={styles.titleTextBase}> School representation</Text>
            </CardTitle>
            <CardDescription>Programs with the most coaches on the field</CardDescription>
          </CardHeader>
          <CardContent>
            <View style={styles.schoolGrid}>
              {schools.map((s) => (
                <View key={s.school} style={styles.schoolCell}>
                  <Text style={styles.schoolName} numberOfLines={1}>{s.school}</Text>
                  <Text style={styles.schoolMeta}>
                    {s.count} {s.count === 1 ? 'coach' : 'coaches'}
                    {s.divisions.length > 0 && ` · ${s.divisions.join(', ')}`}
                  </Text>
                </View>
              ))}
            </View>
          </CardContent>
        </Card>
      )}

      {divisions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle><Text style={styles.titleTextBase}>Division mix</Text></CardTitle>
          </CardHeader>
          <CardContent>
            <View style={styles.divisionWrap}>
              {divisions.map((d) => (
                <Badge key={d.division} variant="secondary">
                  <Text style={styles.badgeSecondaryText}>{d.division}: {d.count}</Text>
                </Badge>
              ))}
            </View>
          </CardContent>
        </Card>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  titleText: { color: colors.foreground, fontSize: typography.size.lg, fontWeight: '700' },
  titleTextBase: { color: colors.foreground, fontSize: typography.size.base, fontWeight: '700' },
  emptyText: {
    fontSize: typography.size.sm,
    color: colors.mutedForeground,
    textAlign: 'center',
    paddingVertical: spacing.md,
  },
  positionRow: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm + 4,
  },
  positionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: spacing.xs,
    alignItems: 'center',
  },
  positionLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  positionName: { fontWeight: '600', color: colors.foreground, fontSize: typography.size.sm },
  recruiterBadgeWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, maxWidth: '100%' },
  badgeSecondaryText: { color: colors.secondaryForeground, fontSize: typography.size.xs },
  badgeOutlineText: { color: colors.foreground, fontSize: typography.size.xs },
  schoolGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  schoolCell: {
    flexBasis: '48%',
    flexGrow: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.xs + 2,
  },
  schoolName: { fontWeight: '500', fontSize: typography.size.sm, color: colors.foreground },
  schoolMeta: { fontSize: typography.size.xs, color: colors.mutedForeground },
  divisionWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
});
