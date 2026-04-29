// TranscriptRequestCard — RN port of Lovable transcripts/TranscriptManager.tsx (request flavor).
// Lists rows from `transcript_requests`; submit creates a new pending row. Graceful empty
// state when the table is unavailable.
import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { FileText, Send, Lock } from 'lucide-react-native';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, Button, Badge } from '@/components/ui';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { usePlayerProfile } from '@/hooks/usePlayerProfile';
import { useToast } from '@/hooks/use-toast';
import { colors, spacing, typography } from '@/lib/theme';

interface TranscriptRequest {
  id: string;
  status: string | null;
  created_at: string;
  notes?: string | null;
}

type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning';

function statusVariant(status: string | null | undefined): BadgeVariant {
  switch ((status || '').toLowerCase()) {
    case 'approved':
    case 'delivered': return 'success';
    case 'rejected':
    case 'denied':    return 'destructive';
    case 'pending':
    default:          return 'secondary';
  }
}

export function TranscriptRequestCard() {
  const { user } = useAuth();
  const { profile } = usePlayerProfile();
  const { toast } = useToast();
  const [items, setItems] = useState<TranscriptRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [tableMissing, setTableMissing] = useState(false);

  const load = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    const { data, error } = await supabase
      .from('transcript_requests')
      .select('id, status, created_at, notes')
      .eq('athlete_user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10);
    if (error) {
      // Fallback for environments without this table.
      setTableMissing(true);
      setItems([]);
    } else {
      setItems((data as TranscriptRequest[] | null) || []);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const submit = async () => {
    if (!user) return;
    setSubmitting(true);
    const payload: Record<string, unknown> = {
      athlete_user_id: user.id,
      status: 'pending',
    };
    if (profile?.id) payload.athlete_profile_id = profile.id;
    const { error } = await supabase.from('transcript_requests').insert(payload as never);
    setSubmitting(false);
    if (error) {
      toast({ title: 'Could not submit request', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Transcript request submitted' });
    load();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <View style={s.titleRow}>
            <FileText size={18} color={colors.primary} />
            <Text style={s.titleText}>Transcript Requests</Text>
            <Badge variant="outline">
              <View style={s.badgeInner}>
                <Lock size={10} color={colors.foreground} />
                <Text style={s.badgeText}> Private</Text>
              </View>
            </Badge>
          </View>
        </CardTitle>
        <CardDescription>
          Request your school transcript and track delivery to coaches.
        </CardDescription>
      </CardHeader>
      <CardContent style={{ gap: spacing.sm }}>
        {!tableMissing && (
          <Button onPress={submit} loading={submitting} size="sm"
            leftIcon={<Send size={14} color={colors.primaryForeground} />}>
            Request New Transcript
          </Button>
        )}

        {loading ? (
          <Text style={s.muted}>Loading…</Text>
        ) : tableMissing ? (
          <Text style={s.muted}>
            Transcript requests aren't enabled for your account yet. Once enabled, you'll be able
            to request and track transcript delivery from this card.
          </Text>
        ) : items.length === 0 ? (
          <Text style={s.muted}>No transcript requests yet. Tap above to submit one.</Text>
        ) : (
          items.map((r) => (
            <View key={r.id} style={s.row}>
              <View style={{ flex: 1 }}>
                <Text style={s.rowTitle}>{new Date(r.created_at).toLocaleDateString()}</Text>
                {!!r.notes && <Text style={s.muted} numberOfLines={2}>{r.notes}</Text>}
              </View>
              <Badge variant={statusVariant(r.status)}>{r.status || 'pending'}</Badge>
            </View>
          ))
        )}
      </CardContent>
    </Card>
  );
}

const s = StyleSheet.create({
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, flexWrap: 'wrap' },
  titleText: { color: colors.foreground, fontFamily: typography.fontFamily.heading, fontSize: typography.fontSize.lg, letterSpacing: typography.letterSpacing.heading },
  badgeInner: { flexDirection: 'row', alignItems: 'center' },
  badgeText: { color: colors.foreground, fontSize: 10 },
  muted: { color: colors.mutedForeground, fontSize: typography.fontSize.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.sm, borderWidth: 1, borderColor: colors.border, borderRadius: 8 },
  rowTitle: { color: colors.foreground, fontSize: typography.fontSize.sm, fontFamily: typography.fontFamily.bodyMedium },
});

export default TranscriptRequestCard;
