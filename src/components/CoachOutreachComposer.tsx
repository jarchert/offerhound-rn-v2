import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Linking,
  Modal,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { X, Mail, Copy, Send, ChevronDown } from 'lucide-react-native';
import { colors, typography, spacing, radius } from '@/lib/theme';
import { Button } from '@/components/ui/Button';
import { copyToClipboard } from '@/lib/utils';
import { usePlayerProfile } from '@/hooks/usePlayerProfile';
import { useRecordContactEvent } from '@/hooks/useRecordContactEvent';
import { useToast } from '@/hooks/use-toast';

export type OutreachCoach = {
  id: string;
  name?: string;
  school?: string;
  email?: string;
  position_coached?: string;
  sport?: string;
};

export type TemplateKey = 'intro' | 'camp_followup' | 'highlight_share';

const TEMPLATE_LABELS: Record<TemplateKey, string> = {
  intro: 'Intro',
  camp_followup: 'Camp Follow-up',
  highlight_share: 'Highlight Share',
};

interface SenderContext {
  senderName: string;
  senderPosition: string;
  senderSchool: string;
  senderGradYear: string;
  senderGpa: string;
  senderSport: string;
}

function buildSubject(template: TemplateKey, coach: OutreachCoach, ctx: SenderContext): string {
  switch (template) {
    case 'intro':
      return `Prospective ${ctx.senderPosition} — ${ctx.senderName} (${ctx.senderGradYear})`;
    case 'camp_followup':
      return `Follow-up — ${ctx.senderName} from ${coach.school ?? 'your camp'}`;
    case 'highlight_share':
      return `Highlight Film — ${ctx.senderName} | ${ctx.senderPosition} | ${ctx.senderGradYear}`;
  }
}

function buildBody(template: TemplateKey, coach: OutreachCoach, ctx: SenderContext): string {
  const coachName = coach.name ?? 'Coach';
  const school = coach.school ?? 'your program';

  switch (template) {
    case 'intro':
      return [
        `Dear ${coachName},`,
        '',
        `My name is ${ctx.senderName} and I am a ${ctx.senderGradYear} ${ctx.senderPosition}${ctx.senderSchool ? ` from ${ctx.senderSchool}` : ''}. I am very interested in ${school} and would love the opportunity to be considered for your program.`,
        '',
        ctx.senderGpa ? `I currently carry a ${ctx.senderGpa} GPA and am committed to excellence both on and off the field.` : '',
        '',
        `I would appreciate the chance to speak with you about any interest you may have in my recruitment. Please feel free to reach out at your convenience.`,
        '',
        `Thank you for your time and consideration.`,
        '',
        `Sincerely,`,
        ctx.senderName,
      ]
        .filter((l) => l !== null)
        .join('\n');

    case 'camp_followup':
      return [
        `Dear ${coachName},`,
        '',
        `I wanted to follow up after attending camp at ${school}. My name is ${ctx.senderName}, a ${ctx.senderGradYear} ${ctx.senderPosition}${ctx.senderSchool ? ` from ${ctx.senderSchool}` : ''}.`,
        '',
        `I truly enjoyed the experience and came away even more excited about the possibility of joining your program. I believe I would be a great fit both athletically and academically.`,
        '',
        `I would love the opportunity to continue the conversation. Please don't hesitate to reach out.`,
        '',
        `Thank you,`,
        ctx.senderName,
      ].join('\n');

    case 'highlight_share':
      return [
        `Dear ${coachName},`,
        '',
        `My name is ${ctx.senderName}, a ${ctx.senderGradYear} ${ctx.senderPosition}${ctx.senderSchool ? ` from ${ctx.senderSchool}` : ''}${ctx.senderGpa ? ` with a ${ctx.senderGpa} GPA` : ''}. I am reaching out to share my highlight film for your review.`,
        '',
        `I am very interested in ${school} and believe I could contribute to your program. Please take a moment to review my film and let me know if you have any interest.`,
        '',
        `Thank you for your time.`,
        '',
        `Best,`,
        ctx.senderName,
      ].join('\n');
  }
}

export function buildMailtoUrl(
  coach: OutreachCoach,
  template: TemplateKey,
  ctx: SenderContext,
): string {
  const email = coach.email ?? '';
  const subject = buildSubject(template, coach, ctx);
  const body = buildBody(template, coach, ctx);
  return `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

interface Props {
  coaches: OutreachCoach[];
  visible: boolean;
  onClose: () => void;
}

export function CoachOutreachComposer({ coaches, visible, onClose }: Props) {
  const [template, setTemplate] = useState<TemplateKey>('intro');
  const [previewCoachIndex, setPreviewCoachIndex] = useState(0);
  const [sending, setSending] = useState(false);
  const [templatePickerOpen, setTemplatePickerOpen] = useState(false);

  const { profile } = usePlayerProfile() as any;
  const recordContact = useRecordContactEvent();
  const { toast } = useToast();

  const senderCtx: SenderContext = useMemo(
    () => ({
      senderName: profile?.full_name ?? '',
      senderPosition: profile?.position ?? '',
      senderSchool: profile?.high_school ?? '',
      senderGradYear: profile?.grad_year ? String(profile.grad_year) : '',
      senderGpa: profile?.gpa ? String(profile.gpa) : '',
      senderSport: profile?.sport ?? '',
    }),
    [profile],
  );

  const previewCoach = coaches[previewCoachIndex] ?? coaches[0];

  const previewSubject = useMemo(
    () => (previewCoach ? buildSubject(template, previewCoach, senderCtx) : ''),
    [template, previewCoach, senderCtx],
  );

  const previewBody = useMemo(
    () => (previewCoach ? buildBody(template, previewCoach, senderCtx) : ''),
    [template, previewCoach, senderCtx],
  );

  const openMailto = useCallback(
    async (coach: OutreachCoach) => {
      const url = buildMailtoUrl(coach, template, senderCtx);
      try {
        await Linking.openURL(url);
        recordContact.mutate({
          coach_id: coach.id,
          coach_name: coach.name ?? '',
          school: coach.school ?? null,
          contact_type: 'email',
          status: 'sent',
          notes: `Template: ${TEMPLATE_LABELS[template]}`,
        });
      } catch {
        toast({ title: 'Could not open mail app', variant: 'destructive' });
      }
    },
    [template, senderCtx, recordContact, toast],
  );

  const handleSendOne = useCallback(async () => {
    if (!previewCoach) return;
    await openMailto(previewCoach);
  }, [previewCoach, openMailto]);

  const handleSendAll = useCallback(async () => {
    if (coaches.length === 0) return;
    setSending(true);
    for (let i = 0; i < coaches.length; i++) {
      await openMailto(coaches[i]);
      if (i < coaches.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 350));
      }
    }
    setSending(false);
    toast({ title: `Opened ${coaches.length} email${coaches.length !== 1 ? 's' : ''}` });
  }, [coaches, openMailto, toast]);

  const handleCopyPreview = useCallback(async () => {
    const text = `Subject: ${previewSubject}\n\n${previewBody}`;
    const ok = await copyToClipboard(text);
    toast({ title: ok ? 'Copied to clipboard' : 'Copy failed' });
  }, [previewSubject, previewBody, toast]);

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={s.root}>
        {/* Header */}
        <View style={s.header}>
          <Text style={s.headerTitle}>Email Outreach</Text>
          <Pressable onPress={onClose} hitSlop={12}>
            <X size={20} color={colors.foreground} />
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={s.body} keyboardShouldPersistTaps="handled">
          {/* Recipient summary */}
          <View style={s.section}>
            <Text style={s.label}>
              {coaches.length} coach{coaches.length !== 1 ? 'es' : ''} selected
            </Text>
          </View>

          {/* Template picker */}
          <View style={s.section}>
            <Text style={s.label}>Template</Text>
            <Pressable
              style={s.pickerButton}
              onPress={() => setTemplatePickerOpen((v) => !v)}
            >
              <Text style={s.pickerButtonText}>{TEMPLATE_LABELS[template]}</Text>
              <ChevronDown size={16} color={colors.mutedForeground} />
            </Pressable>
            {templatePickerOpen &&
              (Object.keys(TEMPLATE_LABELS) as TemplateKey[]).map((key) => (
                <Pressable
                  key={key}
                  style={[s.pickerOption, key === template && s.pickerOptionActive]}
                  onPress={() => {
                    setTemplate(key);
                    setTemplatePickerOpen(false);
                  }}
                >
                  <Text
                    style={[
                      s.pickerOptionText,
                      key === template && s.pickerOptionTextActive,
                    ]}
                  >
                    {TEMPLATE_LABELS[key]}
                  </Text>
                </Pressable>
              ))}
          </View>

          {/* Preview coach selector (when multiple) */}
          {coaches.length > 1 && (
            <View style={s.section}>
              <Text style={s.label}>Preview for</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={s.coachChips}>
                  {coaches.map((c, i) => (
                    <Pressable
                      key={c.id}
                      style={[s.chip, i === previewCoachIndex && s.chipActive]}
                      onPress={() => setPreviewCoachIndex(i)}
                    >
                      <Text
                        style={[s.chipText, i === previewCoachIndex && s.chipTextActive]}
                        numberOfLines={1}
                      >
                        {c.name ?? c.school ?? `Coach ${i + 1}`}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </ScrollView>
            </View>
          )}

          {/* Live preview */}
          {previewCoach && (
            <View style={s.section}>
              <View style={s.previewHeader}>
                <Text style={s.label}>Preview</Text>
                <Pressable onPress={handleCopyPreview} style={s.copyBtn}>
                  <Copy size={14} color={colors.primary} />
                  <Text style={s.copyBtnText}>Copy</Text>
                </Pressable>
              </View>
              <View style={s.previewBox}>
                <Text style={s.previewSubjectLabel}>Subject</Text>
                <Text style={s.previewSubject}>{previewSubject}</Text>
                <View style={s.divider} />
                <Text style={s.previewBody}>{previewBody}</Text>
              </View>
            </View>
          )}
        </ScrollView>

        {/* Actions */}
        <View style={s.footer}>
          {coaches.length === 1 ? (
            <Button
              variant="default"
              onPress={handleSendOne}
              leftIcon={<Mail size={16} color={colors.primaryForeground} />}
              style={s.footerBtn}
            >
              Send Email
            </Button>
          ) : (
            <>
              <Button
                variant="outline"
                onPress={handleSendOne}
                leftIcon={<Mail size={16} color={colors.primary} />}
                style={s.footerBtn}
                disabled={!previewCoach}
              >
                Send to {previewCoach?.name ?? 'Selected'}
              </Button>
              <Button
                variant="default"
                onPress={handleSendAll}
                leftIcon={
                  sending ? (
                    <ActivityIndicator size="small" color={colors.primaryForeground} />
                  ) : (
                    <Send size={16} color={colors.primaryForeground} />
                  )
                }
                style={s.footerBtn}
                disabled={sending}
              >
                {sending ? 'Sending…' : `Send All (${coaches.length})`}
              </Button>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontFamily: typography.fontFamily.heading,
    fontSize: typography.fontSize.xl,
    color: colors.foreground,
  },
  body: { padding: spacing.md, gap: spacing.md },
  section: { gap: spacing.xs },
  label: {
    fontFamily: typography.fontFamily.base,
    fontSize: typography.fontSize.sm,
    color: colors.mutedForeground,
    fontWeight: '600',
  },
  pickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: colors.card,
  },
  pickerButtonText: {
    fontFamily: typography.fontFamily.base,
    fontSize: typography.fontSize.base,
    color: colors.foreground,
  },
  pickerOption: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
  },
  pickerOptionActive: { backgroundColor: colors.accent },
  pickerOptionText: {
    fontFamily: typography.fontFamily.base,
    fontSize: typography.fontSize.base,
    color: colors.foreground,
  },
  pickerOptionTextActive: { color: colors.primary, fontWeight: '600' },
  coachChips: { flexDirection: 'row', gap: spacing.xs },
  chip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: {
    fontFamily: typography.fontFamily.base,
    fontSize: typography.fontSize.sm,
    color: colors.foreground,
  },
  chipTextActive: { color: colors.primaryForeground },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  copyBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  copyBtnText: {
    fontFamily: typography.fontFamily.base,
    fontSize: typography.fontSize.sm,
    color: colors.primary,
  },
  previewBox: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.sm,
    backgroundColor: colors.card,
    gap: spacing.xs,
  },
  previewSubjectLabel: {
    fontFamily: typography.fontFamily.base,
    fontSize: typography.fontSize.xs,
    color: colors.mutedForeground,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  previewSubject: {
    fontFamily: typography.fontFamily.base,
    fontSize: typography.fontSize.sm,
    color: colors.foreground,
    fontWeight: '600',
  },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.xs },
  previewBody: {
    fontFamily: typography.fontFamily.base,
    fontSize: typography.fontSize.sm,
    color: colors.foreground,
    lineHeight: 20,
  },
  footer: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  footerBtn: { flex: 1 },
});
