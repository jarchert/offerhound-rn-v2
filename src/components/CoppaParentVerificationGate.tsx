// RN port of Lovable web src/components/CoppaParentVerificationGate.tsx.
//
// COPPA gate for under-13 athletes:
//   - Detects age < 13 from dateOfBirth prop
//   - Blocked: prompts for parent email, sends via send-coppa-verification edge fn
//   - Verified (verified_at set): returns null — gate passes silently
//   - Non-minor: returns null immediately
import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { ShieldCheck } from 'lucide-react-native';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/toast';
import { colors, typography, spacing, radius } from '@/lib/theme';

interface Props {
  athleteUserId: string;
  athleteProfileId?: string;
  dateOfBirth?: string | null;
}

function isUnder13(dob?: string | null): boolean {
  if (!dob) return false;
  const d = new Date(dob);
  if (isNaN(d.getTime())) return false;
  return (Date.now() - d.getTime()) / (1000 * 60 * 60 * 24 * 365.25) < 13;
}

export const CoppaParentVerificationGate: React.FC<Props> = ({
  athleteUserId,
  athleteProfileId,
  dateOfBirth,
}) => {
  const [record, setRecord] = useState<any>(null);
  const [parentEmail, setParentEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);

  const minor = isUnder13(dateOfBirth);

  useEffect(() => {
    if (!minor) { setLoading(false); return; }
    (async () => {
      const { data } = await supabase
        .from('coppa_parent_verifications' as any)
        .select('*')
        .eq('athlete_user_id', athleteUserId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      setRecord(data);
      setLoading(false);
    })();
  }, [minor, athleteUserId]);

  if (!minor || loading) return null;
  if (record?.verified_at) return null;

  const send = async () => {
    if (!parentEmail.trim()) { toast.error('Parent email required'); return; }
    setSending(true);
    const { data, error } = await supabase.functions.invoke('send-coppa-verification', {
      body: { athleteUserId, athleteProfileId, parentEmail: parentEmail.trim() },
    });
    setSending(false);
    if (error) { toast.error(error.message || 'Failed to send verification email'); return; }
    toast.success('Verification email sent to parent');
    setRecord(data);
  };

  return (
    <View style={s.container}>
      <View style={s.iconWrap}>
        <ShieldCheck size={20} color={(colors as any).warning ?? '#f59e0b'} />
      </View>
      <View style={s.body}>
        <Text style={s.heading}>Parent verification required (COPPA)</Text>
        <Text style={s.desc}>
          You're under 13. We need a parent or guardian's email to verify before you can use all features.
        </Text>
        {record ? (
          <Text style={s.sent}>
            Sent to <Text style={s.sentBold}>{record.parent_email}</Text>. Ask them to check their inbox and click the verify link.
          </Text>
        ) : (
          <View style={s.form}>
            <Text style={s.label}>Parent / guardian email</Text>
            <View style={s.inputRow}>
              <TextInput
                style={s.input}
                value={parentEmail}
                onChangeText={setParentEmail}
                placeholder="parent@email.com"
                placeholderTextColor={colors.mutedForeground}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                accessibilityLabel="Parent or guardian email address"
              />
              <Pressable
                style={[s.sendBtn, sending && s.sendBtnDisabled]}
                onPress={send}
                disabled={sending}
                accessibilityLabel="Send verification email"
              >
                {sending
                  ? <ActivityIndicator size="small" color={(colors as any).primaryForeground ?? '#fff'} />
                  : <Text style={s.sendBtnText}>Send</Text>
                }
              </Pressable>
            </View>
          </View>
        )}
      </View>
    </View>
  );
};

export default CoppaParentVerificationGate;

const s = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: (colors as any).warning ?? '#f59e0b',
    backgroundColor: (colors as any).warningSubtle ?? 'rgba(245,158,11,0.08)',
    padding: spacing.md,
  },
  iconWrap: { marginTop: 2 },
  body: { flex: 1, minWidth: 0, gap: spacing.xs },
  heading: {
    fontFamily: typography.fontFamily.bodyBold,
    fontSize: typography.fontSize.sm,
    color: colors.foreground,
  },
  desc: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.xs,
    color: colors.mutedForeground,
    lineHeight: 16,
  },
  sent: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.xs,
    color: colors.mutedForeground,
  },
  sentBold: { fontFamily: typography.fontFamily.bodyBold, color: colors.foreground },
  form: { gap: spacing.xs, marginTop: spacing.xs },
  label: {
    fontFamily: typography.fontFamily.bodyMedium,
    fontSize: typography.fontSize.xs,
    color: colors.foreground,
  },
  inputRow: { flexDirection: 'row', gap: spacing.xs },
  input: {
    flex: 1,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    color: colors.foreground,
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 8,
  },
  sendBtn: {
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 56,
  },
  sendBtnDisabled: { opacity: 0.6 },
  sendBtnText: {
    fontFamily: typography.fontFamily.bodyBold,
    fontSize: typography.fontSize.sm,
    color: (colors as any).primaryForeground ?? '#fff',
  },
});
