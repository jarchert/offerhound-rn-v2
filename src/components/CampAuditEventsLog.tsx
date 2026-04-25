// Coach/admin-facing audit log of trust-and-safety events for a specific camp.
// Parity port from Lovable src/components/CampAuditEventsLog.tsx (verbatim logic).
// Web→RN mapping: shadcn Card/Badge/ScrollArea → src/components/ui/*; lucide-react → lucide-react-native;
// Tailwind → StyleSheet using @/lib/theme tokens.
import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge, BadgeVariant } from '@/components/ui/Badge';
import { ScrollArea } from '@/components/ui/ScrollArea';
import { History } from 'lucide-react-native';
import { colors, typography, spacing } from '@/lib/theme';

interface AuditRow {
  id: string;
  event_type: string;
  actor_user_id: string | null;
  subject_user_id: string | null;
  details: Record<string, any> | null;
  created_at: string;
}

const EVENT_LABEL: Record<string, { label: string; tone: BadgeVariant }> = {
  refund_requested: { label: 'Refund requested', tone: 'secondary' },
  refund_approved: { label: 'Refund approved', tone: 'default' },
  refund_refunded: { label: 'Refund completed', tone: 'default' },
  refund_denied: { label: 'Refund denied', tone: 'destructive' },
  refund_failed: { label: 'Refund failed', tone: 'destructive' },
  parent_consent_requested: { label: 'Parent consent requested', tone: 'secondary' },
  parent_consent_approved: { label: 'Parent consent approved', tone: 'default' },
  parent_consent_denied: { label: 'Parent consent denied', tone: 'destructive' },
  parent_consent_expired: { label: 'Parent consent expired', tone: 'destructive' },
  sms_broadcast_sent: { label: 'Text broadcast sent', tone: 'default' },
};

interface CampAuditEventsLogProps {
  campId: string;
}

export function CampAuditEventsLog({ campId }: CampAuditEventsLogProps) {
  const { data: rows = [], isLoading } = useQuery({
    queryKey: ['camp-audit-events', campId],
    enabled: !!campId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('camp_audit_events' as any)
        .select('*')
        .eq('camp_id', campId)
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data as unknown as AuditRow[]) || [];
    },
  });

  return (
    <Card>
      <CardHeader>
        <View style={styles.titleRow}>
          <History size={20} color={colors.foreground} />
          <CardTitle>Trust & safety audit log</CardTitle>
        </View>
        <CardDescription>
          Tamper-resistant trail of refund decisions, parent consent actions, and SMS broadcasts for this camp.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : rows.length === 0 ? (
          <Text style={styles.empty}>No events recorded yet. Activity will appear here as it happens.</Text>
        ) : (
          <ScrollArea style={styles.scroll}>
            <View style={{ gap: spacing.xs }}>
              {rows.map((row) => {
                const meta = EVENT_LABEL[row.event_type] ?? { label: row.event_type, tone: 'secondary' as BadgeVariant };
                const detailText =
                  row.details && Object.keys(row.details).length > 0
                    ? Object.entries(row.details)
                        .filter(([k]) => !['consent_request_id', 'refund_request_id'].includes(k))
                        .map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : String(v)}`)
                        .join(' • ')
                    : null;
                return (
                  <View key={row.id} style={styles.row}>
                    <View style={styles.rowMain}>
                      <View style={styles.badgeRow}>
                        <Badge variant={meta.tone}>{meta.label}</Badge>
                      </View>
                      {detailText && <Text style={styles.detailText}>{detailText}</Text>}
                    </View>
                    <Text style={styles.timestamp}>{new Date(row.created_at).toLocaleString()}</Text>
                  </View>
                );
              })}
            </View>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}

const styles = StyleSheet.create({
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  center: { alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.lg },
  empty: {
    textAlign: 'center',
    paddingVertical: spacing.lg,
    color: colors.foregroundSubtle,
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.sm,
  },
  scroll: { maxHeight: 320 },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.muted,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  rowMain: { flex: 1, gap: 4, minWidth: 0 },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.xs },
  detailText: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.xs,
    color: colors.foregroundSubtle,
  },
  timestamp: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.xs,
    color: colors.foregroundSubtle,
    flexShrink: 0,
  },
});
