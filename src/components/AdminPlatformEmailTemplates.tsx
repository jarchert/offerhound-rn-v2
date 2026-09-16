// AdminPlatformEmailTemplates — admin editor for the two athlete transactional
// templates stored in `platform_email_templates`:
//   • athlete_waitlist_offer
//   • athlete_claim_confirmation
//
// Features:
//   • Tabbed editor (one tab per template)
//   • Subject + body TextInputs
//   • Token chips (from available_tokens) — tap to copy {{token}} via expo-clipboard
//   • Live preview panel with a fixed set of sample values
//   • Save calls .update({subject,body}).eq('id', row.id); disabled until dirty
//
// Rendered inside AdminContentScreen (the Admin > Content tab).
import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator, ScrollView,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/toast';
import { colors, spacing, radius, typography } from '@/lib/theme';

// ── constants ──────────────────────────────────────────────────────────────

const TEMPLATE_KEYS = [
  'athlete_waitlist_offer',
  'athlete_claim_confirmation',
] as const;

type TemplateKey = (typeof TEMPLATE_KEYS)[number];

const TEMPLATE_LABEL: Record<TemplateKey, string> = {
  athlete_waitlist_offer: 'Waitlist Offer',
  athlete_claim_confirmation: 'Claim Confirmation',
};

// Sample data used for the live preview. Kept in sync with the tokens the
// two templates use today. Anything not in this map renders as {{token}}.
const SAMPLE_VALUES: Record<string, string> = {
  athlete_name: 'Marcus Johnson',
  camp_name: 'Summer Showcase',
  camp_dates: 'Jul 12 – Jul 14, 2026',
  camp_location_line: ' at Lincoln HS Stadium, Austin, TX',
  claim_link: 'https://offerhound.app/camps/claim?token=sample',
  camp_link: 'https://offerhound.app/camps/summer-showcase',
};

// ── types ─────────────────────────────────────────────────────────────────

type TemplateRow = {
  id: string;
  template_key: TemplateKey;
  subject: string;
  body: string;
  description: string | null;
  available_tokens: string[] | null;
  updated_at: string | null;
};

// ── helpers ───────────────────────────────────────────────────────────────

function substitute(text: string, values: Record<string, string>): string {
  return text.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_m, name) => {
    return Object.prototype.hasOwnProperty.call(values, name) ? values[name] : `{{${name}}}`;
  });
}

// ── component ─────────────────────────────────────────────────────────────

export default function AdminPlatformEmailTemplates() {
  const qc = useQueryClient();

  const { data: rows, isLoading } = useQuery({
    queryKey: ['platform-email-templates'],
    queryFn: async (): Promise<TemplateRow[]> => {
      const { data, error } = await supabase
        .from('platform_email_templates')
        .select('*')
        .in('template_key', TEMPLATE_KEYS as unknown as string[]);
      if (error) throw error;
      return (data ?? []) as TemplateRow[];
    },
  });

  const [activeKey, setActiveKey] = useState<TemplateKey>('athlete_waitlist_offer');
  const [draftSubject, setDraftSubject] = useState('');
  const [draftBody, setDraftBody] = useState('');

  const activeRow: TemplateRow | undefined = useMemo(
    () => rows?.find((r) => r.template_key === activeKey),
    [rows, activeKey],
  );

  // Sync draft when the active row changes (initial load OR tab switch).
  useEffect(() => {
    if (activeRow) {
      setDraftSubject(activeRow.subject ?? '');
      setDraftBody(activeRow.body ?? '');
    } else {
      setDraftSubject('');
      setDraftBody('');
    }
  }, [activeRow?.id, activeRow?.subject, activeRow?.body]);

  const dirty = !!activeRow && (
    draftSubject !== (activeRow.subject ?? '') ||
    draftBody !== (activeRow.body ?? '')
  );

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!activeRow) throw new Error('No active template');
      const { error } = await supabase
        .from('platform_email_templates')
        .update({ subject: draftSubject, body: draftBody })
        .eq('id', activeRow.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Template saved');
      qc.invalidateQueries({ queryKey: ['platform-email-templates'] });
    },
    onError: (e: any) => {
      toast.error('Save failed', e?.message ?? 'Unknown error');
    },
  });

  const onCopyToken = async (token: string) => {
    try {
      await Clipboard.setStringAsync(`{{${token}}}`);
      toast.success('Copied', `{{${token}}}`);
    } catch (e: any) {
      toast.error('Copy failed', e?.message ?? 'Unknown error');
    }
  };

  const previewSubject = substitute(draftSubject, SAMPLE_VALUES);
  const previewBody = substitute(draftBody, SAMPLE_VALUES);
  const tokens = activeRow?.available_tokens ?? [];

  return (
    <View testID="platform-email-templates" style={s.root}>
      <Text style={s.title}>Email Templates</Text>
      <Text style={s.subtitle}>
        Athlete transactional emails. Tokens like {'{{athlete_name}}'} are replaced at send time.
      </Text>

      {/* Tabs */}
      <View style={s.tabRow}>
        {TEMPLATE_KEYS.map((k) => {
          const active = k === activeKey;
          return (
            <Pressable
              key={k}
              testID={`template-tab-${k}`}
              onPress={() => setActiveKey(k)}
              style={[s.tabBtn, active && s.tabBtnActive]}
            >
              <Text style={[s.tabText, active && s.tabTextActive]}>{TEMPLATE_LABEL[k]}</Text>
            </Pressable>
          );
        })}
      </View>

      {isLoading ? (
        <View style={s.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : !activeRow ? (
        <View testID="templates-empty" style={s.emptyBox}>
          <Text style={s.emptyTitle}>Template not seeded</Text>
          <Text style={s.emptyBody}>
            No row exists in <Text style={s.mono}>platform_email_templates</Text> for
            <Text style={s.mono}> {activeKey}</Text>. Run the migration to seed the two athlete templates.
          </Text>
        </View>
      ) : (
        <>
          {activeRow.description ? (
            <Text style={s.description}>{activeRow.description}</Text>
          ) : null}

          {/* Token chips */}
          {tokens.length > 0 ? (
            <View style={s.tokenSection}>
              <Text style={s.sectionLabel}>Available tokens (tap to copy)</Text>
              <View style={s.tokenRow}>
                {tokens.map((t) => (
                  <Pressable
                    key={t}
                    testID={`token-chip-${t}`}
                    onPress={() => onCopyToken(t)}
                    style={s.chip}
                  >
                    <Text style={s.chipText}>{`{{${t}}}`}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          ) : null}

          {/* Subject */}
          <Text style={s.sectionLabel}>Subject</Text>
          <TextInput
            testID="template-subject-input"
            value={draftSubject}
            onChangeText={setDraftSubject}
            placeholder="Subject line"
            placeholderTextColor={colors.mutedForeground}
            style={s.input}
          />

          {/* Body */}
          <Text style={s.sectionLabel}>Body</Text>
          <TextInput
            testID="template-body-input"
            value={draftBody}
            onChangeText={setDraftBody}
            placeholder="Email body"
            placeholderTextColor={colors.mutedForeground}
            multiline
            style={[s.input, s.bodyInput]}
          />

          {/* Save */}
          <Pressable
            testID="template-save-btn"
            onPress={() => saveMutation.mutate()}
            disabled={!dirty || saveMutation.isPending}
            accessibilityState={{ disabled: !dirty || saveMutation.isPending }}
            style={[
              s.saveBtn,
              (!dirty || saveMutation.isPending) && s.saveBtnDisabled,
            ]}
          >
            <Text
              style={[
                s.saveBtnText,
                (!dirty || saveMutation.isPending) && s.saveBtnTextDisabled,
              ]}
            >
              {saveMutation.isPending ? 'Saving…' : dirty ? 'Save changes' : 'Saved'}
            </Text>
          </Pressable>

          {/* Preview */}
          <View style={s.previewBox}>
            <Text style={s.sectionLabel}>Preview (sample data)</Text>
            <Text style={s.previewLabel}>Subject</Text>
            <Text testID="preview-subject" style={s.previewSubject}>{previewSubject}</Text>
            <Text style={[s.previewLabel, { marginTop: spacing.sm }]}>Body</Text>
            <ScrollView style={s.previewBodyScroll}>
              <Text testID="preview-body" style={s.previewBody}>{previewBody}</Text>
            </ScrollView>
          </View>
        </>
      )}
    </View>
  );
}

// ── styles ────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.sm,
  },
  title: {
    fontFamily: typography.fontFamily.heading,
    fontSize: typography.heading.h3,
    letterSpacing: typography.letterSpacing.heading,
    color: colors.foreground,
  },
  subtitle: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.sm,
    color: colors.mutedForeground,
    marginBottom: spacing.xs,
  },
  description: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.sm,
    color: colors.foregroundSubtle,
    marginBottom: spacing.xs,
  },
  tabRow: {
    flexDirection: 'row',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    marginBottom: spacing.xs,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    backgroundColor: colors.muted,
  },
  tabBtnActive: {
    backgroundColor: colors.primary,
  },
  tabText: {
    fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: typography.fontSize.sm,
    color: colors.foreground,
  },
  tabTextActive: {
    color: colors.primaryForeground,
  },
  sectionLabel: {
    fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: typography.fontSize.xs,
    color: colors.mutedForeground,
    textTransform: 'uppercase',
    letterSpacing: typography.letterSpacing.wide,
    marginTop: spacing.sm,
  },
  tokenSection: {
    gap: spacing.xs,
  },
  tokenRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  chip: {
    backgroundColor: colors.muted,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  chipText: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.xs,
    color: colors.foreground,
  },
  input: {
    backgroundColor: colors.background,
    borderColor: colors.input,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    color: colors.foreground,
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.base,
  },
  bodyInput: {
    minHeight: 140,
    textAlignVertical: 'top',
  },
  saveBtn: {
    marginTop: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: 10,
    alignItems: 'center',
  },
  saveBtnDisabled: {
    backgroundColor: colors.muted,
  },
  saveBtnText: {
    fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: typography.fontSize.base,
    color: colors.primaryForeground,
  },
  saveBtnTextDisabled: {
    color: colors.mutedForeground,
  },
  previewBox: {
    marginTop: spacing.md,
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.sm,
  },
  previewLabel: {
    fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: typography.fontSize.xs,
    color: colors.mutedForeground,
    textTransform: 'uppercase',
    letterSpacing: typography.letterSpacing.wide,
  },
  previewSubject: {
    fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: typography.fontSize.base,
    color: colors.foreground,
    marginTop: 2,
  },
  previewBodyScroll: {
    maxHeight: 220,
    marginTop: 2,
  },
  previewBody: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.sm,
    color: colors.foreground,
    lineHeight: 20,
  },
  center: { padding: spacing.md, alignItems: 'center' },
  emptyBox: {
    borderColor: colors.border,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.xs,
  },
  emptyTitle: {
    fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: typography.fontSize.base,
    color: colors.foreground,
  },
  emptyBody: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.sm,
    color: colors.mutedForeground,
  },
  mono: {
    fontFamily: typography.fontFamily.body,
    color: colors.foreground,
  },
});
