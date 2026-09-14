// FootballEmailBlockTab — Email Block tab for AthleteFootballHub.
// Auto-generates a signature from program data (same useFootballProgram hook
// as FootballProgramTab). Coach can edit freely, copy to clipboard, or reset
// to the auto-generated version. Includes a static 11-row merge-field
// reference table matching the web MAIN reference (AthleteFootballHub.tsx).
import React, { useMemo, useState, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Copy, Check, RefreshCw } from 'lucide-react-native';

import { useFootballProgram } from '@/hooks/useFootballProgram';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { colors, typography, spacing, radius } from '@/lib/theme';

// ── Merge-field reference (11 entries, matches web MAIN) ─────────────────────
export const MERGE_FIELDS = [
  { tag: '{{program_name}}',      desc: 'Program/team name' },
  { tag: '{{school_name}}',       desc: 'School name' },
  { tag: '{{head_coach_name}}',   desc: 'Head coach name' },
  { tag: '{{head_coach_email}}',  desc: 'Head coach email' },
  { tag: '{{athlete_name}}',      desc: 'Athlete full name' },
  { tag: '{{athlete_position}}',  desc: 'Athlete position' },
  { tag: '{{athlete_grad_year}}', desc: 'Graduation year' },
  { tag: '{{athlete_hudl_url}}',  desc: 'HUDL profile link' },
  { tag: '{{athlete_highlights}}',desc: 'Bulleted highlight links' },
  { tag: '{{athlete_socials}}',   desc: 'Social handles block' },
  { tag: '{{signature_block}}',   desc: 'This signature block' },
] as const;

export type MergeFieldTag = (typeof MERGE_FIELDS)[number]['tag'];

// ── Signature generator (mirrors web MAIN useMemo logic exactly) ──────────────
export function buildSignature(program: {
  head_coach_name?: string;
  program_name?: string;
  school_name?: string;
  city?: string;
  state?: string;
  head_coach_phone?: string;
  head_coach_email?: string;
} | null): string {
  if (!program) return '';
  const lines: string[] = [];
  if (program.head_coach_name) lines.push(program.head_coach_name);
  if (program.program_name || program.school_name) {
    lines.push([program.program_name, program.school_name].filter(Boolean).join(' — '));
  }
  if (program.city || program.state) {
    lines.push([program.city, program.state].filter(Boolean).join(', '));
  }
  if (program.head_coach_phone) lines.push(program.head_coach_phone);
  if (program.head_coach_email) lines.push(program.head_coach_email);
  return lines.join('\n');
}

export function FootballEmailBlockTab() {
  const { program, isLoading } = useFootballProgram();
  const generatedSignature = useMemo(() => buildSignature(program), [program]);

  const [signature, setSignature] = useState('');
  const [copiedSig, setCopiedSig] = useState(false);
  const [copiedTag, setCopiedTag] = useState<string | null>(null);

  useEffect(() => {
    setSignature(generatedSignature);
  }, [generatedSignature]);

  const handleCopySignature = async () => {
    await Clipboard.setStringAsync(signature || generatedSignature);
    setCopiedSig(true);
    setTimeout(() => setCopiedSig(false), 2000);
  };

  const handleCopyTag = async (tag: string) => {
    await Clipboard.setStringAsync(tag);
    setCopiedTag(tag);
    setTimeout(() => setCopiedTag(null), 1500);
  };

  const handleReset = () => {
    setSignature(generatedSignature);
  };

  if (isLoading) {
    return (
      <View style={s.center} testID="email-block-loading">
        <Text style={s.muted}>Loading…</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={s.root} keyboardShouldPersistTaps="handled">
      {/* ── Signature Card ─────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle>
            <Text style={s.cardTitle}>Email Signature Block</Text>
          </CardTitle>
          <CardDescription>
            <Text style={s.cardDesc}>
              Automatically appended to outgoing letters/emails. Edit freely or
              use the auto-generated version.
            </Text>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            testID="signature-textarea"
            value={signature}
            onChangeText={setSignature}
            placeholder={generatedSignature || 'Your signature block…'}
            numberOfLines={6}
            style={s.textarea}
          />

          <View style={s.actions}>
            <Button
              testID="copy-signature"
              onPress={handleCopySignature}
              disabled={!signature && !generatedSignature}
              style={s.actionBtn}
            >
              <View style={s.btnRow}>
                {copiedSig
                  ? <Check size={14} color={colors.primaryForeground} />
                  : <Copy size={14} color={colors.primaryForeground} />}
                <Text style={s.btnPrimaryText}>
                  {'  '}{copiedSig ? 'Copied!' : 'Copy Signature'}
                </Text>
              </View>
            </Button>

            <Button
              testID="reset-signature"
              variant="outline"
              onPress={handleReset}
              disabled={!generatedSignature}
            >
              <View style={s.btnRow}>
                <RefreshCw size={14} color={colors.foreground} />
                <Text style={s.btnText}>{'  '}Reset to Auto</Text>
              </View>
            </Button>
          </View>

          {!program && (
            <Text style={s.hint} testID="program-hint">
              Fill in your Program tab to auto-generate a signature.
            </Text>
          )}
        </CardContent>
      </Card>

      {/* ── Merge Fields Reference ─────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle>
            <Text style={s.cardTitle}>Merge Fields Reference</Text>
          </CardTitle>
          <CardDescription>
            <Text style={s.cardDesc}>
              Available variables when composing letters/emails for athletes on
              your roster. Tap any field to copy.
            </Text>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <View style={s.mergeGrid} testID="merge-fields-table">
            {MERGE_FIELDS.map(({ tag, desc }) => (
              <Button
                key={tag}
                testID={`merge-field-${tag}`}
                variant="outline"
                onPress={() => handleCopyTag(tag)}
                style={s.mergeRow}
              >
                <View style={s.mergeRowInner}>
                  <Text style={s.mergeTag}>{tag}</Text>
                  <View style={s.mergeRight}>
                    <Text style={s.mergeDesc}>{desc}</Text>
                    {copiedTag === tag && (
                      <Check size={12} color={colors.primary} />
                    )}
                  </View>
                </View>
              </Button>
            ))}
          </View>

          <Text style={s.hint}>
            Use these in the AI Letter Composer when writing to athletes on your roster.
          </Text>
        </CardContent>
      </Card>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  root:    { padding: spacing.md, gap: spacing.md },
  center:  { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  cardTitle: { fontSize: typography.fontSize.lg, fontWeight: '600', color: colors.foreground },
  cardDesc:  { fontSize: typography.fontSize.sm, color: colors.foregroundSubtle },
  textarea:  { minHeight: 120 },
  actions:   { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md, flexWrap: 'wrap' },
  actionBtn: { flex: 1 },
  btnRow:    { flexDirection: 'row', alignItems: 'center' },
  btnPrimaryText: { color: colors.primaryForeground, fontSize: typography.fontSize.sm, fontWeight: '500' },
  btnText:   { color: colors.foreground, fontSize: typography.fontSize.sm, fontWeight: '500' },
  hint:      { fontSize: typography.fontSize.sm, color: colors.foregroundSubtle, marginTop: spacing.md, textAlign: 'center' },
  mergeGrid: { gap: spacing.xs },
  mergeRow:  { width: '100%', marginBottom: spacing.xs },
  mergeRowInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%' },
  mergeTag:  { fontFamily: 'monospace', fontSize: typography.fontSize.xs, color: colors.primary },
  mergeRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  mergeDesc: { fontSize: typography.fontSize.xs, color: colors.foregroundSubtle },
  muted:     { color: colors.foregroundSubtle, fontSize: typography.fontSize.sm },
});
