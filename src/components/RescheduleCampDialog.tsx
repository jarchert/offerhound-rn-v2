// Parity port from Lovable src/components/RescheduleCampDialog.tsx (verbatim logic).
// Web→RN translations:
//   <div>/<p>/<span>/<strong>/<label>/<button>/<a>/<ul>/<li> → <View>/<Text>/<Pressable>/Linking
//   Tailwind classes → StyleSheet via @/lib/theme tokens
//   @/components/ui/* (lowercase) → PascalCase RN ports
//   lucide-react → lucide-react-native
//   onChange e.target.value → onChangeText
//   localStorage → AsyncStorage (async writes/reads)
//   <input type=checkbox> → Checkbox component
//   Date/time inputs → string Inputs with placeholders (matches CampScheduleBuilder pattern)
//   KeyboardAvoidingView wraps the dialog form (per session-parity checklist)
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Linking,
  KeyboardAvoidingView,
  Platform as RNPlatform,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Textarea } from '@/components/ui/Textarea';
import { Checkbox } from '@/components/ui/Checkbox';
import {
  CalendarClock,
  Loader2,
  Info,
  ArrowLeft,
  Bell,
  BellOff,
  Mail,
  AlertCircle,
  Pencil,
  RotateCcw,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  X,
  History,
} from 'lucide-react-native';
import { format, parseISO } from 'date-fns';
import { useUpdateCamp, type Camp } from '@/hooks/useCampManager';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { colors, spacing, typography, radius } from '@/lib/theme';

interface RescheduleCampDialogProps {
  camp: Camp | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Step = 'edit' | 'confirm';

export type FailureCode =
  | 'invalid_user'
  | 'insert_failed'
  | 'timed_out'
  | 'network_error'
  | 'permission_denied'
  | 'unknown';

interface FailedRecipient {
  user_id: string;
  code: FailureCode;
  reason?: string;
}

interface SubmitStatus {
  kind: 'ok' | 'partial' | 'error';
  message: string;
  attemptId?: string;
  totalRecipients?: number;
  deliveredCount?: number;
  failedCount?: number;
  failedRecipients?: FailedRecipient[];
  timedOut?: boolean;
  auditId?: string | null;
}

interface AttemptLogEntry {
  attemptId: string;
  auditId: string | null;
  at: number;
  totalRecipients: number;
  deliveredCount: number;
  failedCount: number;
  kind: SubmitStatus['kind'];
  isRetry: boolean;
}

const NOTIFICATION_TIMEOUT_MS = 12_000;

export function classifyFailure(raw: string | null | undefined): FailureCode {
  if (!raw) return 'unknown';
  const m = raw.toLowerCase();
  if (m.includes('timed out') || m.includes('timeout') || m.includes('aborted')) return 'timed_out';
  if (m.includes('permission') || m.includes('rls') || m.includes('denied')) return 'permission_denied';
  if (m.includes('invalid input syntax') || m.includes('uuid') || m.includes('foreign key')) return 'invalid_user';
  if (m.includes('network') || m.includes('fetch') || m.includes('failed to send')) return 'network_error';
  if (m.includes('insert') || m.includes('violates') || m.includes('constraint')) return 'insert_failed';
  return 'unknown';
}

const FAILURE_CODE_LABEL: Record<FailureCode, string> = {
  invalid_user: 'invalid user',
  insert_failed: 'insert failed',
  timed_out: 'timed out',
  network_error: 'network error',
  permission_denied: 'permission denied',
  unknown: 'unknown',
};

const draftStorageKey = (campId: string) => `oh:reschedule-draft:${campId}`;

export function buildNotificationBody(args: {
  campName: string;
  previousSummary: string;
  newSummary: string;
  endSummary: string | null;
  reason: string;
}): string {
  const { campName, previousSummary, newSummary, endSummary, reason } = args;
  const lines: string[] = [];
  lines.push(`The schedule for ${campName} has changed.`);
  lines.push('');
  lines.push(`Previous: ${previousSummary}`);
  lines.push(`New:        ${newSummary}`);
  if (endSummary) lines.push(`Ends:       ${endSummary}`);
  if (reason.trim()) {
    lines.push('');
    lines.push(`Reason: ${reason.trim()}`);
  }
  lines.push('');
  lines.push('Open the camp page to confirm your spot.');
  return lines.join('\n');
}

export function validateSchedule(form: {
  start_date: string;
  end_date: string;
  start_time: string;
  end_time: string;
}): string | null {
  if (!form.start_date) return 'Pick a new start date.';
  const start = new Date(`${form.start_date}T${form.start_time || '00:00'}`);
  if (Number.isNaN(start.getTime())) return 'Start date is invalid.';
  if (form.end_date) {
    const end = new Date(`${form.end_date}T${form.end_time || form.start_time || '00:00'}`);
    if (Number.isNaN(end.getTime())) return 'End date is invalid.';
    if (end < start) return 'End date/time must be on or after the start.';
  } else if (form.end_time && form.start_time && form.end_time <= form.start_time) {
    return 'End time must be after the start time.';
  }
  return null;
}

export function RescheduleCampDialog({ camp, open, onOpenChange }: RescheduleCampDialogProps) {
  const updateCamp = useUpdateCamp();
  const { toast } = useToast();
  const { user } = useAuth();

  const [step, setStep] = useState<Step>('edit');
  const [form, setForm] = useState({
    start_date: '',
    end_date: '',
    start_time: '',
    end_time: '',
    reason: '',
    notify_registered: true,
  });
  const [registeredCount, setRegisteredCount] = useState<number | null>(null);
  const [loadingCount, setLoadingCount] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<SubmitStatus | null>(null);
  const [showFailedList, setShowFailedList] = useState(false);
  const [attempts, setAttempts] = useState<AttemptLogEntry[]>([]);
  const [titleDraft, setTitleDraft] = useState('');
  const [bodyDraft, setBodyDraft] = useState('');
  const [messageEdited, setMessageEdited] = useState(false);
  const scheduleSavedRef = useRef(false);
  const fanOutAbortRef = useRef<AbortController | null>(null);
  const draftHydratedRef = useRef(false);

  useEffect(() => {
    if (!camp) return;
    setStep('edit');
    setRegisteredCount(null);
    setSubmitStatus(null);
    setMessageEdited(false);
    setShowFailedList(false);
    setAttempts([]);
    scheduleSavedRef.current = false;
    draftHydratedRef.current = false;
    setForm({
      start_date: camp.start_date || '',
      end_date: camp.end_date || '',
      start_time: camp.start_time || '',
      end_time: camp.end_time || '',
      reason: '',
      notify_registered: true,
    });
  }, [camp?.id, open]);

  const formatPreview = (date: string, time: string | null) => {
    if (!date) return '—';
    try {
      const base = format(parseISO(date), 'MMM d, yyyy');
      return time ? `${base} · ${time}` : base;
    } catch {
      return date;
    }
  };

  const previousSummary = camp ? formatPreview(camp.start_date, camp.start_time) : '—';
  const newSummary = formatPreview(form.start_date, form.start_time);
  const endSummary = form.end_date ? formatPreview(form.end_date, form.end_time) : null;
  const hasChanges = camp
    ? form.start_date !== (camp.start_date || '') ||
      form.end_date !== (camp.end_date || '') ||
      form.start_time !== (camp.start_time || '') ||
      form.end_time !== (camp.end_time || '')
    : false;

  const validationError = useMemo(
    () => validateSchedule(form),
    [form.start_date, form.end_date, form.start_time, form.end_time]
  );

  const defaultTitle = camp ? `Camp rescheduled: ${camp.name}` : '';
  const defaultBody = useMemo(
    () =>
      camp
        ? buildNotificationBody({
            campName: camp.name,
            previousSummary,
            newSummary,
            endSummary,
            reason: form.reason,
          })
        : '',
    [camp, previousSummary, newSummary, endSummary, form.reason]
  );

  // Hydrate draft from AsyncStorage once per open.
  useEffect(() => {
    if (!camp || !open) return;
    if (draftHydratedRef.current) return;
    draftHydratedRef.current = true;
    let cancelled = false;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(draftStorageKey(camp.id));
        if (cancelled) return;
        if (raw) {
          const parsed = JSON.parse(raw) as { title?: string; body?: string; edited?: boolean };
          if (parsed?.edited) {
            setTitleDraft(parsed.title ?? defaultTitle);
            setBodyDraft(parsed.body ?? defaultBody);
            setMessageEdited(true);
            return;
          }
        }
      } catch {
        // ignore
      }
      if (!cancelled) {
        setTitleDraft(defaultTitle);
        setBodyDraft(defaultBody);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [camp?.id, open, defaultTitle, defaultBody]);

  useEffect(() => {
    if (messageEdited) return;
    if (!draftHydratedRef.current) return;
    setTitleDraft(defaultTitle);
    setBodyDraft(defaultBody);
  }, [defaultTitle, defaultBody, messageEdited]);

  useEffect(() => {
    if (!camp || !open) return;
    if (!draftHydratedRef.current) return;
    (async () => {
      try {
        if (messageEdited) {
          await AsyncStorage.setItem(
            draftStorageKey(camp.id),
            JSON.stringify({ title: titleDraft, body: bodyDraft, edited: true })
          );
        } else {
          await AsyncStorage.removeItem(draftStorageKey(camp.id));
        }
      } catch {
        // non-fatal
      }
    })();
  }, [camp?.id, open, titleDraft, bodyDraft, messageEdited]);

  if (!camp) return null;

  const fetchRegisteredCount = async (): Promise<number | null> => {
    try {
      const { count, error } = await supabase
        .from('camp_enrollments')
        .select('user_id', { count: 'exact', head: true })
        .eq('camp_id', camp.id)
        .neq('status', 'cancelled');
      if (error) throw error;
      return count ?? 0;
    } catch (err) {
      console.warn('could not load enrollment count:', err);
      return null;
    }
  };

  const goToConfirm = async () => {
    if (validationError) {
      toast({ title: 'Fix the schedule', description: validationError, variant: 'destructive' });
      return;
    }
    if (!hasChanges) {
      toast({ title: 'No changes', description: 'Update at least one date or time to reschedule.' });
      return;
    }
    setLoadingCount(true);
    const count = await fetchRegisteredCount();
    setRegisteredCount(count);
    setLoadingCount(false);
    setStep('confirm');
  };

  const resetMessageDraft = () => {
    setTitleDraft(defaultTitle);
    setBodyDraft(defaultBody);
    setMessageEdited(false);
  };

  const runNotificationFanOut = async (args: {
    title: string;
    body: string;
    timeoutMs?: number;
    abortController?: AbortController;
  }): Promise<{
    attemptId: string;
    totalRecipients: number;
    deliveredCount: number;
    failed: FailedRecipient[];
    timedOut: boolean;
    fatalError: string | null;
    cancelled: boolean;
  }> => {
    const attemptId =
      typeof crypto !== 'undefined' && (crypto as any).randomUUID
        ? (crypto as any).randomUUID()
        : `att_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const timeoutMs = args.timeoutMs ?? NOTIFICATION_TIMEOUT_MS;
    const ac = args.abortController ?? new AbortController();
    let cancelled = false;
    const onUserAbort = () => {
      if ((ac.signal as any).reason === 'user_cancelled') cancelled = true;
    };
    ac.signal.addEventListener('abort', onUserAbort, { once: true } as any);
    const timer = setTimeout(() => {
      if (!ac.signal.aborted) ac.abort('timeout' as any);
    }, timeoutMs);

    try {
      const { data: enrollments, error: fetchErr } = await supabase
        .from('camp_enrollments')
        .select('user_id')
        .eq('camp_id', camp.id)
        .neq('status', 'cancelled');
      if (fetchErr) throw fetchErr;

      const recipients = (enrollments || []) as Array<{ user_id: string }>;
      if (recipients.length === 0) {
        return {
          attemptId,
          totalRecipients: 0,
          deliveredCount: 0,
          failed: [],
          timedOut: false,
          fatalError: null,
          cancelled: false,
        };
      }

      const failed: FailedRecipient[] = [];
      let delivered = 0;

      const tasks = recipients.map(async (r) => {
        if (ac.signal.aborted) {
          const isCancelled = (ac.signal as any).reason === 'user_cancelled';
          failed.push({
            user_id: r.user_id,
            code: isCancelled ? 'unknown' : 'timed_out',
            reason: isCancelled ? 'cancelled' : 'timed_out',
          });
          return;
        }
        try {
          const { error } = await supabase.from('notifications').insert({
            user_id: r.user_id,
            title: args.title,
            message: args.body,
            type: 'camp_rescheduled',
            link: `/camps/${camp.id}?ref=reschedule&attempt=${attemptId}`,
          } as any);
          if (error) {
            failed.push({
              user_id: r.user_id,
              code: classifyFailure(error.message),
              reason: error.message,
            });
          } else {
            delivered += 1;
          }
        } catch (err: any) {
          const msg = err?.message || String(err);
          failed.push({ user_id: r.user_id, code: classifyFailure(msg), reason: msg });
        }
      });

      const all = Promise.all(tasks);
      const aborted = await new Promise<boolean>((resolve) => {
        const onAbort = () => resolve(true);
        ac.signal.addEventListener('abort', onAbort, { once: true } as any);
        all
          .then(() => {
            ac.signal.removeEventListener('abort', onAbort);
            resolve(false);
          })
          .catch(() => {
            ac.signal.removeEventListener('abort', onAbort);
            resolve(false);
          });
      });
      const timedOut = aborted && !cancelled;

      return {
        attemptId,
        totalRecipients: recipients.length,
        deliveredCount: delivered,
        failed,
        timedOut,
        fatalError: null,
        cancelled,
      };
    } catch (err: any) {
      return {
        attemptId,
        totalRecipients: 0,
        deliveredCount: 0,
        failed: [],
        timedOut: false,
        fatalError: err?.message || String(err),
        cancelled,
      };
    } finally {
      clearTimeout(timer);
      ac.signal.removeEventListener('abort', onUserAbort);
    }
  };

  const writeAuditEvent = async (args: {
    attemptId: string | null;
    deliveredCount: number;
    failed: FailedRecipient[];
    totalRecipients: number;
    timedOut: boolean;
    fatalError: string | null;
    finalTitle: string | null;
    finalBody: string | null;
    lockedCount: number | null;
    isRetry: boolean;
  }): Promise<string | null> => {
    try {
      const { data, error } = await supabase
        .from('camp_audit_events')
        .insert({
          camp_id: camp.id,
          actor_user_id: user?.id ?? null,
          event_type: args.isRetry ? 'camp_reschedule_notification_retry' : 'camp_rescheduled',
          details: {
            previous: args.isRetry
              ? null
              : {
                  start_date: camp.start_date,
                  end_date: camp.end_date,
                  start_time: camp.start_time,
                  end_time: camp.end_time,
                },
            next: {
              start_date: form.start_date,
              end_date: form.end_date || null,
              start_time: form.start_time || null,
              end_time: form.end_time || null,
            },
            reason: form.reason || null,
            notified_registered: form.notify_registered,
            notification: form.notify_registered
              ? {
                  attempt_id: args.attemptId,
                  title: args.finalTitle,
                  body: args.finalBody,
                  edited: messageEdited,
                  recipient_count_locked: args.lockedCount,
                  total_recipients: args.totalRecipients,
                  delivered_count: args.deliveredCount,
                  failed_count: args.failed.length,
                  failed_recipients: args.failed,
                  delivery_failed: args.failed.length > 0 || args.timedOut || !!args.fatalError,
                  timed_out: args.timedOut,
                  error: args.fatalError,
                }
              : null,
          },
        } as any)
        .select('id')
        .single();
      if (error) throw error;
      return (data as any)?.id ?? null;
    } catch (err) {
      console.warn('reschedule audit log failed:', err);
      return null;
    }
  };

  const buildStatusFromFanOut = (args: {
    fan: Awaited<ReturnType<typeof runNotificationFanOut>>;
    auditId: string | null;
    isRetry: boolean;
  }): SubmitStatus => {
    const { fan, auditId } = args;
    const allFailed = fan.fatalError !== null || (fan.totalRecipients > 0 && fan.deliveredCount === 0);
    const someFailed = !allFailed && (fan.failed.length > 0 || fan.timedOut);
    if (allFailed && fan.totalRecipients > 0) {
      return {
        kind: 'error',
        message: fan.timedOut
          ? `Notification fan-out timed out after ${Math.round(NOTIFICATION_TIMEOUT_MS / 1000)}s. The schedule change is saved — try again to notify athletes.`
          : `Could not deliver notifications: ${fan.fatalError || 'unknown error'}. The schedule change is saved.`,
        attemptId: fan.attemptId,
        totalRecipients: fan.totalRecipients,
        deliveredCount: fan.deliveredCount,
        failedCount: fan.totalRecipients - fan.deliveredCount,
        failedRecipients: fan.failed,
        timedOut: fan.timedOut,
        auditId,
      };
    }
    if (someFailed) {
      return {
        kind: 'partial',
        message: `Rescheduled to ${newSummary}. Notified ${fan.deliveredCount} of ${fan.totalRecipients}; ${fan.failed.length} failed${fan.timedOut ? ' (timed out)' : ''}.`,
        attemptId: fan.attemptId,
        totalRecipients: fan.totalRecipients,
        deliveredCount: fan.deliveredCount,
        failedCount: fan.failed.length,
        failedRecipients: fan.failed,
        timedOut: fan.timedOut,
        auditId,
      };
    }
    if (fan.totalRecipients === 0) {
      return {
        kind: 'ok',
        message: `Rescheduled to ${newSummary}. No registered athletes to notify yet — nothing to send.`,
        attemptId: fan.attemptId,
        totalRecipients: 0,
        deliveredCount: 0,
        failedCount: 0,
        auditId,
      };
    }
    return {
      kind: 'ok',
      message: `Rescheduled to ${newSummary}. Notified ${fan.deliveredCount} athlete${fan.deliveredCount === 1 ? '' : 's'}.`,
      attemptId: fan.attemptId,
      totalRecipients: fan.totalRecipients,
      deliveredCount: fan.deliveredCount,
      failedCount: 0,
      auditId,
    };
  };

  const recordAttempt = (args: {
    attemptId: string;
    auditId: string | null;
    totalRecipients: number;
    deliveredCount: number;
    failedCount: number;
    kind: SubmitStatus['kind'];
    isRetry: boolean;
  }) => {
    setAttempts((prev) =>
      [
        {
          attemptId: args.attemptId,
          auditId: args.auditId,
          at: Date.now(),
          totalRecipients: args.totalRecipients,
          deliveredCount: args.deliveredCount,
          failedCount: args.failedCount,
          kind: args.kind,
          isRetry: args.isRetry,
        },
        ...prev,
      ].slice(0, 5)
    );
  };

  const handleSubmit = async () => {
    if (validationError) {
      toast({ title: 'Fix the schedule', description: validationError, variant: 'destructive' });
      setStep('edit');
      return;
    }
    setSubmitting(true);
    setSubmitStatus(null);
    setShowFailedList(false);

    let lockedCount: number | null = null;
    if (form.notify_registered) {
      lockedCount = await fetchRegisteredCount();
      setRegisteredCount(lockedCount);
    }

    const finalTitle = titleDraft.trim() || defaultTitle;
    const finalBody = bodyDraft.trim() || defaultBody;

    try {
      if (!scheduleSavedRef.current) {
        await updateCamp.mutateAsync({
          id: camp.id,
          start_date: form.start_date,
          end_date: form.end_date || null,
          start_time: form.start_time || null,
          end_time: form.end_time || null,
        } as any);
        scheduleSavedRef.current = true;
      }

      const ac = new AbortController();
      fanOutAbortRef.current = ac;
      const fan = form.notify_registered
        ? await runNotificationFanOut({ title: finalTitle, body: finalBody, abortController: ac })
        : {
            attemptId: 'no-notify',
            totalRecipients: 0,
            deliveredCount: 0,
            failed: [] as FailedRecipient[],
            timedOut: false,
            fatalError: null,
            cancelled: false,
          };
      fanOutAbortRef.current = null;

      const auditId = await writeAuditEvent({
        attemptId: fan.attemptId,
        deliveredCount: fan.deliveredCount,
        failed: fan.failed,
        totalRecipients: fan.totalRecipients,
        timedOut: fan.timedOut,
        fatalError: fan.fatalError,
        finalTitle: form.notify_registered ? finalTitle : null,
        finalBody: form.notify_registered ? finalBody : null,
        lockedCount,
        isRetry: false,
      });

      let status: SubmitStatus;
      if (!form.notify_registered) {
        status = {
          kind: 'ok',
          message: `Rescheduled to ${newSummary}. Athletes were not notified.`,
          attemptId: undefined,
          auditId,
        };
      } else {
        status = buildStatusFromFanOut({ fan, auditId, isRetry: false });
      }
      setSubmitStatus(status);
      if (form.notify_registered) {
        recordAttempt({
          attemptId: fan.attemptId,
          auditId,
          totalRecipients: fan.totalRecipients,
          deliveredCount: fan.deliveredCount,
          failedCount: fan.failed.length,
          kind: status.kind,
          isRetry: false,
        });
      }

      toast({
        title:
          status.kind === 'partial'
            ? 'Partial success'
            : status.kind === 'error'
            ? 'Notification fan-out failed'
            : 'Camp rescheduled',
        description: status.message,
        variant: status.kind === 'ok' ? 'default' : 'destructive',
      });

      if (status.kind === 'ok') {
        try {
          await AsyncStorage.removeItem(draftStorageKey(camp.id));
        } catch {
          /* ignore */
        }
        setTimeout(() => {
          onOpenChange(false);
          setTimeout(() => {
            toast({
              title: 'Reschedule confirmed',
              description: form.notify_registered
                ? `${camp.name} is now ${newSummary}. ${status.deliveredCount ?? 0} notification${(status.deliveredCount ?? 0) === 1 ? '' : 's'} sent.`
                : `${camp.name} is now ${newSummary}.`,
            });
          }, 200);
        }, 1500);
      }
    } catch (err: any) {
      const status: SubmitStatus = {
        kind: 'error',
        message: err?.message || 'Could not reschedule. Please try again.',
      };
      setSubmitStatus(status);
      toast({ title: 'Could not reschedule', description: status.message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
      fanOutAbortRef.current = null;
    }
  };

  const handleCancelRetry = () => {
    if (fanOutAbortRef.current) {
      fanOutAbortRef.current.abort('user_cancelled' as any);
    }
  };

  const handleRetryNotifications = async () => {
    if (!form.notify_registered) return;
    setRetrying(true);
    setShowFailedList(false);

    const finalTitle = titleDraft.trim() || defaultTitle;
    const finalBody = bodyDraft.trim() || defaultBody;
    let lockedCount: number | null = null;
    lockedCount = await fetchRegisteredCount();
    setRegisteredCount(lockedCount);

    const ac = new AbortController();
    fanOutAbortRef.current = ac;
    try {
      const fan = await runNotificationFanOut({ title: finalTitle, body: finalBody, abortController: ac });
      if (fan.cancelled) {
        setSubmitStatus({
          kind: 'partial',
          message: `Retry cancelled. ${fan.deliveredCount} of ${fan.totalRecipients} delivered before stopping.`,
          attemptId: fan.attemptId,
          totalRecipients: fan.totalRecipients,
          deliveredCount: fan.deliveredCount,
          failedCount: fan.totalRecipients - fan.deliveredCount,
          failedRecipients: fan.failed,
        });
        toast({ title: 'Retry cancelled', description: 'The schedule change is still saved.' });
        return;
      }

      const auditId = await writeAuditEvent({
        attemptId: fan.attemptId,
        deliveredCount: fan.deliveredCount,
        failed: fan.failed,
        totalRecipients: fan.totalRecipients,
        timedOut: fan.timedOut,
        fatalError: fan.fatalError,
        finalTitle,
        finalBody,
        lockedCount,
        isRetry: true,
      });
      const status = buildStatusFromFanOut({ fan, auditId, isRetry: true });
      setSubmitStatus(status);
      recordAttempt({
        attemptId: fan.attemptId,
        auditId,
        totalRecipients: fan.totalRecipients,
        deliveredCount: fan.deliveredCount,
        failedCount: fan.failed.length,
        kind: status.kind,
        isRetry: true,
      });
      toast({
        title:
          status.kind === 'ok'
            ? 'Notifications retried'
            : status.kind === 'partial'
            ? 'Retry partially succeeded'
            : 'Retry failed',
        description: status.message,
        variant: status.kind === 'ok' ? 'default' : 'destructive',
      });
      if (status.kind === 'ok') {
        try {
          await AsyncStorage.removeItem(draftStorageKey(camp.id));
        } catch {
          /* ignore */
        }
        setTimeout(() => onOpenChange(false), 1500);
      }
    } finally {
      setRetrying(false);
      fanOutAbortRef.current = null;
    }
  };

  const openAuditLink = (attemptId: string, auditId?: string | null) => {
    const path = `/admin/audit-log?camp_id=${camp.id}&attempt=${encodeURIComponent(attemptId)}${auditId ? `&audit=${auditId}` : ''}`;
    void Linking.openURL(`https://offerhound.app${path}`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <KeyboardAvoidingView
          behavior={RNPlatform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={80}
          style={s.flex1}
        >
          <DialogHeader>
            <DialogTitle>
              <View style={s.titleRow}>
                <CalendarClock size={20} color={colors.foreground} />
                <Text style={s.titleText}>
                  {step === 'edit' ? 'Reschedule camp' : 'Confirm reschedule'}
                </Text>
              </View>
            </DialogTitle>
            <DialogDescription>
              {step === 'edit'
                ? `Update the dates or times for ${camp.name}. You'll preview the athlete notification on the next step.`
                : 'Review the change and the message athletes will receive.'}
            </DialogDescription>
          </DialogHeader>

          {step === 'edit' ? (
            <View style={s.gap16}>
              <View style={s.summaryBox}>
                <View style={s.summaryCol}>
                  <Text style={s.summaryHeader}>Currently</Text>
                  <Text style={s.summaryValue}>{previousSummary}</Text>
                  {!!camp.end_date && (
                    <Text style={s.summarySub}>ends {formatPreview(camp.end_date, camp.end_time)}</Text>
                  )}
                </View>
                <View style={s.summaryCol}>
                  <Text style={s.summaryHeader}>After change</Text>
                  <Text style={[s.summaryValue, { color: colors.primary }]}>{newSummary}</Text>
                  {!!endSummary && <Text style={s.summarySub}>ends {endSummary}</Text>}
                </View>
              </View>

              <View style={s.gridRow}>
                <View style={s.gridCell}>
                  <Label>New start date *</Label>
                  <Input
                    placeholder="YYYY-MM-DD"
                    value={form.start_date}
                    onChangeText={(v) => setForm({ ...form, start_date: v })}
                  />
                </View>
                <View style={s.gridCell}>
                  <Label>New end date</Label>
                  <Input
                    placeholder="YYYY-MM-DD"
                    value={form.end_date}
                    onChangeText={(v) => setForm({ ...form, end_date: v })}
                  />
                </View>
                <View style={s.gridCell}>
                  <Label>Start time</Label>
                  <Input
                    placeholder="HH:MM"
                    value={form.start_time}
                    onChangeText={(v) => setForm({ ...form, start_time: v })}
                  />
                </View>
                <View style={s.gridCell}>
                  <Label>End time</Label>
                  <Input
                    placeholder="HH:MM"
                    value={form.end_time}
                    onChangeText={(v) => setForm({ ...form, end_time: v })}
                  />
                </View>
              </View>

              {validationError && hasChanges && (
                <View style={s.errorBox}>
                  <AlertCircle size={16} color={colors.destructive} />
                  <Text style={s.errorText}>{validationError}</Text>
                </View>
              )}

              <View style={s.field}>
                <Label>Reason (optional)</Label>
                <Textarea
                  rows={2}
                  placeholder="e.g. Field weather conflict — moved one week later."
                  value={form.reason}
                  onChangeText={(v) => setForm({ ...form, reason: v })}
                />
                <Text style={s.hint}>Included in the audit log and the notification preview.</Text>
              </View>

              <View style={s.infoBox}>
                <Info size={16} color={colors.mutedForeground} />
                <Text style={s.infoText}>
                  The public camp page and any QR codes continue to point at the same URL — only the displayed dates change.
                </Text>
              </View>
            </View>
          ) : (
            <View style={s.gap16}>
              <View style={s.summaryBox}>
                <View style={s.summaryCol}>
                  <Text style={s.summaryHeader}>Previous</Text>
                  <Text style={[s.summaryValue, s.strike]}>{previousSummary}</Text>
                </View>
                <View style={s.summaryCol}>
                  <Text style={s.summaryHeader}>New</Text>
                  <Text style={[s.summaryValue, { color: colors.primary }]}>{newSummary}</Text>
                </View>
              </View>

              <View style={s.notifyBox}>
                <Pressable
                  style={s.notifyRow}
                  onPress={() => setForm({ ...form, notify_registered: !form.notify_registered })}
                >
                  <Checkbox
                    checked={form.notify_registered}
                    onCheckedChange={(v: boolean) => setForm({ ...form, notify_registered: v })}
                  />
                  <View style={s.flex1}>
                    <View style={s.notifyTitleRow}>
                      {form.notify_registered ? (
                        <Bell size={16} color={colors.primary} />
                      ) : (
                        <BellOff size={16} color={colors.mutedForeground} />
                      )}
                      <Text style={s.notifyTitle}>Notify registered athletes</Text>
                    </View>
                    <Text style={s.notifySub}>
                      {loadingCount
                        ? 'Counting registered athletes…'
                        : registeredCount === null
                        ? 'An in-app notification will be sent to each registered athlete.'
                        : registeredCount === 0
                        ? 'No registered athletes to notify yet.'
                        : `Will notify ${registeredCount} registered athlete${registeredCount === 1 ? '' : 's'}.`}
                    </Text>
                  </View>
                </Pressable>

                {form.notify_registered && (
                  <View style={s.previewBox}>
                    <View style={s.previewHeaderRow}>
                      <View style={s.titleRow}>
                        <Mail size={14} color={colors.mutedForeground} />
                        <Text style={s.uppercase}>Notification preview</Text>
                        {messageEdited && (
                          <View style={s.editedTag}>
                            <Pencil size={10} color={colors.primary} />
                            <Text style={s.editedText}>edited</Text>
                          </View>
                        )}
                      </View>
                      {messageEdited && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onPress={resetMessageDraft}
                          leftIcon={<RotateCcw size={12} color={colors.foreground} />}
                        >
                          Reset
                        </Button>
                      )}
                    </View>

                    <View style={s.field}>
                      <Label>Title</Label>
                      <Input
                        value={titleDraft}
                        maxLength={120}
                        onChangeText={(v) => {
                          setTitleDraft(v);
                          setMessageEdited(true);
                        }}
                      />
                    </View>

                    <View style={s.field}>
                      <Label>Message</Label>
                      <Textarea
                        rows={6}
                        value={bodyDraft}
                        maxLength={1000}
                        onChangeText={(v) => {
                          setBodyDraft(v);
                          setMessageEdited(true);
                        }}
                      />
                      <Text style={s.charCount}>{bodyDraft.length}/1000</Text>
                    </View>
                  </View>
                )}

                {!form.notify_registered && (
                  <View style={s.infoBoxSmall}>
                    <Info size={14} color={colors.mutedForeground} />
                    <Text style={s.infoTextSmall}>
                      Athletes won't be notified. The reschedule will still be written to the audit log.
                    </Text>
                  </View>
                )}
              </View>

              {submitStatus && (
                <View
                  style={[
                    s.statusBox,
                    submitStatus.kind === 'ok'
                      ? s.statusOk
                      : submitStatus.kind === 'partial'
                      ? s.statusPartial
                      : s.statusError,
                  ]}
                >
                  <Text style={s.statusEmoji}>
                    {submitStatus.kind === 'ok'
                      ? '✅'
                      : submitStatus.kind === 'partial'
                      ? '⚠️'
                      : '❌'}
                  </Text>
                  <View style={s.flex1}>
                    <Text style={s.statusTitle}>
                      {submitStatus.kind === 'ok'
                        ? 'Success'
                        : submitStatus.kind === 'partial'
                        ? 'Partial success'
                        : 'Reschedule failed'}
                    </Text>
                    <Text style={s.statusMsg}>{submitStatus.message}</Text>

                    {(submitStatus.failedCount ?? 0) > 0 &&
                      submitStatus.failedRecipients &&
                      submitStatus.failedRecipients.length > 0 && (
                        <View style={s.failedSection}>
                          <Pressable onPress={() => setShowFailedList((v) => !v)} style={s.failedToggle}>
                            {showFailedList ? (
                              <ChevronUp size={12} color={colors.foreground} />
                            ) : (
                              <ChevronDown size={12} color={colors.foreground} />
                            )}
                            <Text style={s.failedToggleText}>
                              {submitStatus.failedCount} failed recipient
                              {submitStatus.failedCount === 1 ? '' : 's'}
                            </Text>
                          </Pressable>
                          {showFailedList && (
                            <View style={s.failedList}>
                              {submitStatus.failedRecipients.slice(0, 20).map((r, i) => (
                                <View key={`${r.user_id}-${i}`} style={s.failedRow}>
                                  <Text style={s.failedUserId}>{r.user_id.slice(0, 8)}…</Text>
                                  <View style={s.failedCodeChip}>
                                    <Text style={s.failedCodeText}>
                                      {FAILURE_CODE_LABEL[r.code] || r.code}
                                    </Text>
                                  </View>
                                  <Text style={s.failedReason} numberOfLines={1}>
                                    {r.reason || ''}
                                  </Text>
                                </View>
                              ))}
                              {submitStatus.failedRecipients.length > 20 && (
                                <Text style={s.failedOverflow}>
                                  + {submitStatus.failedRecipients.length - 20} more — see audit log
                                </Text>
                              )}
                            </View>
                          )}
                        </View>
                      )}

                    {!!submitStatus.attemptId && (
                      <Pressable
                        onPress={() => openAuditLink(submitStatus.attemptId!, submitStatus.auditId)}
                        style={s.attemptLink}
                      >
                        <ExternalLink size={12} color={colors.foreground} />
                        <Text style={s.attemptText}>
                          attempt: {submitStatus.attemptId.slice(0, 12)}…
                        </Text>
                      </Pressable>
                    )}
                  </View>
                </View>
              )}

              {attempts.length > 0 && (
                <View style={s.attemptsBox}>
                  <View style={s.titleRow}>
                    <History size={14} color={colors.mutedForeground} />
                    <Text style={s.uppercase}>Notification attempts</Text>
                  </View>
                  <View style={s.attemptsList}>
                    {attempts.map((a) => (
                      <View key={a.attemptId} style={s.attemptRow}>
                        <View style={s.attemptLeft}>
                          <Text style={s.attemptEmoji}>
                            {a.kind === 'ok' ? '✅' : a.kind === 'partial' ? '⚠️' : '❌'}
                          </Text>
                          <Text style={s.attemptId}>{a.attemptId.slice(0, 12)}…</Text>
                          {a.isRetry && <Text style={s.retryTag}>retry</Text>}
                        </View>
                        <View style={s.attemptRight}>
                          <Text style={s.attemptCount}>
                            <Text style={{ color: colors.success }}>{a.deliveredCount}</Text>
                            <Text style={{ opacity: 0.5 }}>/</Text>
                            <Text>{a.totalRecipients}</Text>
                            {a.failedCount > 0 && (
                              <Text style={{ color: colors.destructive }}>
                                {' '}· {a.failedCount} failed
                              </Text>
                            )}
                          </Text>
                          <Pressable
                            onPress={() => openAuditLink(a.attemptId, a.auditId)}
                            style={s.attemptLogLink}
                          >
                            <ExternalLink size={12} color={colors.foreground} />
                            <Text style={s.attemptLogText}>log</Text>
                          </Pressable>
                        </View>
                      </View>
                    ))}
                  </View>
                </View>
              )}
            </View>
          )}

          <DialogFooter>
            {step === 'edit' ? (
              <>
                <Button variant="ghost" onPress={() => onOpenChange(false)} disabled={submitting}>
                  Cancel
                </Button>
                <Button
                  onPress={goToConfirm}
                  disabled={loadingCount || !hasChanges || !form.start_date || !!validationError}
                  leftIcon={
                    loadingCount ? <Loader2 size={16} color={colors.primaryForeground} /> : null
                  }
                >
                  Review & notify
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="ghost"
                  onPress={() => setStep('edit')}
                  disabled={submitting || retrying}
                  leftIcon={<ArrowLeft size={16} color={colors.foreground} />}
                >
                  Back
                </Button>

                {(submitStatus?.kind === 'partial' ||
                  (submitStatus?.kind === 'error' && scheduleSavedRef.current)) &&
                form.notify_registered ? (
                  <>
                    <Button variant="outline" onPress={() => onOpenChange(false)} disabled={retrying}>
                      Close
                    </Button>
                    {retrying && (
                      <Button
                        variant="ghost"
                        onPress={handleCancelRetry}
                        leftIcon={<X size={16} color={colors.foreground} />}
                      >
                        Cancel retry
                      </Button>
                    )}
                    <Button
                      onPress={handleRetryNotifications}
                      disabled={retrying}
                      leftIcon={
                        retrying ? (
                          <Loader2 size={16} color={colors.primaryForeground} />
                        ) : (
                          <RefreshCw size={16} color={colors.primaryForeground} />
                        )
                      }
                    >
                      {submitStatus?.timedOut ? 'Try again (timed out)' : 'Retry athlete notifications'}
                    </Button>
                  </>
                ) : (
                  <Button
                    onPress={handleSubmit}
                    disabled={submitting || !!validationError || submitStatus?.kind === 'ok'}
                    leftIcon={
                      submitting ? (
                        <Loader2 size={16} color={colors.primaryForeground} />
                      ) : (
                        <CalendarClock size={16} color={colors.primaryForeground} />
                      )
                    }
                  >
                    {form.notify_registered ? 'Confirm & notify athletes' : 'Confirm without notifying'}
                  </Button>
                )}
              </>
            )}
          </DialogFooter>
        </KeyboardAvoidingView>
      </DialogContent>
    </Dialog>
  );
}

const s = StyleSheet.create({
  flex1: { flex: 1 },
  gap16: { gap: spacing.md },
  field: { gap: 6 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  titleText: {
    fontFamily: typography.fontFamily.heading,
    fontSize: typography.size.xl,
    color: colors.foreground,
    letterSpacing: typography.letterSpacing.heading,
  },
  summaryBox: {
    borderRadius: radius.md,
    backgroundColor: colors.muted,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm,
    flexDirection: 'row',
    gap: spacing.sm,
  },
  summaryCol: { flex: 1, gap: 2 },
  summaryHeader: {
    fontFamily: typography.fontFamily.body,
    fontSize: 11,
    color: colors.mutedForeground,
    textTransform: 'uppercase',
    letterSpacing: typography.letterSpacing.wide,
  },
  summaryValue: {
    fontFamily: typography.fontFamily.bodyMedium,
    fontSize: typography.size.sm,
    color: colors.foreground,
  },
  summarySub: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.xs,
    color: colors.mutedForeground,
  },
  strike: { textDecorationLine: 'line-through', opacity: 0.7 },
  gridRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  gridCell: { flexBasis: '47%', flexGrow: 1, gap: 6 },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'rgba(220,40,40,0.4)',
    backgroundColor: 'rgba(220,40,40,0.1)',
    padding: spacing.sm,
  },
  errorText: {
    flex: 1,
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.sm,
    color: colors.destructive,
  },
  hint: {
    fontFamily: typography.fontFamily.body,
    fontSize: 11,
    color: colors.mutedForeground,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.muted,
    padding: spacing.sm,
  },
  infoText: {
    flex: 1,
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.xs,
    color: colors.mutedForeground,
  },
  infoBoxSmall: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.muted,
    padding: spacing.sm,
  },
  infoTextSmall: {
    flex: 1,
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.xs,
    color: colors.mutedForeground,
  },
  notifyBox: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm,
    gap: spacing.sm,
  },
  notifyRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  notifyTitleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  notifyTitle: {
    fontFamily: typography.fontFamily.bodyMedium,
    fontSize: typography.size.sm,
    color: colors.foreground,
  },
  notifySub: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.xs,
    color: colors.mutedForeground,
    marginTop: 2,
  },
  previewBox: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    padding: spacing.sm,
    gap: spacing.sm,
  },
  previewHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  uppercase: {
    fontFamily: typography.fontFamily.body,
    fontSize: 11,
    color: colors.mutedForeground,
    textTransform: 'uppercase',
    letterSpacing: typography.letterSpacing.wide,
  },
  editedTag: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  editedText: {
    fontFamily: typography.fontFamily.body,
    fontSize: 10,
    color: colors.primary,
  },
  charCount: {
    fontFamily: typography.fontFamily.body,
    fontSize: 10,
    color: colors.mutedForeground,
    textAlign: 'right',
  },
  statusBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    padding: spacing.sm,
  },
  statusOk: {
    borderColor: 'rgba(22,161,73,0.4)',
    backgroundColor: 'rgba(22,161,73,0.1)',
  },
  statusPartial: {
    borderColor: 'rgba(244,158,10,0.4)',
    backgroundColor: 'rgba(244,158,10,0.1)',
  },
  statusError: {
    borderColor: 'rgba(220,40,40,0.4)',
    backgroundColor: 'rgba(220,40,40,0.1)',
  },
  statusEmoji: { fontSize: 18, lineHeight: 18, marginTop: 2 },
  statusTitle: {
    fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: typography.size.sm,
    color: colors.foreground,
  },
  statusMsg: {
    fontFamily: typography.fontFamily.body,
    fontSize: 13,
    color: colors.foreground,
    marginTop: 2,
  },
  failedSection: { paddingTop: 4 },
  failedToggle: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  failedToggleText: {
    fontFamily: typography.fontFamily.bodyMedium,
    fontSize: 12,
    color: colors.foreground,
    textDecorationLine: 'underline',
  },
  failedList: {
    marginTop: 4,
    maxHeight: 128,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    backgroundColor: 'rgba(0,0,0,0.4)',
    padding: spacing.sm,
    gap: 4,
  },
  failedRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  failedUserId: {
    fontFamily: 'Courier',
    fontSize: 11,
    color: colors.mutedForeground,
    opacity: 0.6,
  },
  failedCodeChip: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  failedCodeText: {
    fontFamily: typography.fontFamily.body,
    fontSize: 10,
    color: colors.foreground,
    textTransform: 'uppercase',
    letterSpacing: typography.letterSpacing.wide,
  },
  failedReason: {
    flex: 1,
    fontFamily: 'Courier',
    fontSize: 11,
    color: colors.foreground,
    opacity: 0.8,
  },
  failedOverflow: {
    fontFamily: typography.fontFamily.body,
    fontSize: 11,
    color: colors.mutedForeground,
    opacity: 0.6,
  },
  attemptLink: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  attemptText: {
    fontFamily: typography.fontFamily.body,
    fontSize: 11,
    color: colors.foreground,
    opacity: 0.75,
    textDecorationLine: 'underline',
  },
  attemptsBox: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.muted,
    padding: spacing.sm,
    gap: spacing.sm,
  },
  attemptsList: { gap: 6 },
  attemptRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  attemptLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexShrink: 1 },
  attemptEmoji: { fontSize: 14 },
  attemptId: {
    fontFamily: 'Courier',
    fontSize: 11,
    color: colors.foreground,
    opacity: 0.7,
  },
  retryTag: {
    fontFamily: typography.fontFamily.body,
    fontSize: 10,
    color: colors.mutedForeground,
    textTransform: 'uppercase',
    letterSpacing: typography.letterSpacing.wide,
    opacity: 0.6,
  },
  attemptRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  attemptCount: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.xs,
    color: colors.foreground,
    fontVariant: ['tabular-nums'],
  },
  attemptLogLink: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  attemptLogText: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.xs,
    color: colors.foreground,
    opacity: 0.7,
    textDecorationLine: 'underline',
  },
});
