// CampWalkupRegistration — RN port of Lovable web src/components/CampWalkupRegistration.tsx.
// Walk-up (day-of) athlete registration for camp staff.
//
// Web → RN mapping:
//   - Tailwind classes → StyleSheet using @/lib/theme tokens
//   - shadcn/ui → @/components/ui/* (Card, Button, Input, Label, Select)
//   - lucide-react → lucide-react-native
//   - useToast hook → @/hooks/use-toast (matches CampMobileCheckinScreen pattern)
//   - useNetInfo / navigator.onLine → isOnline prop passed from parent (already
//     tracked by useCampCheckinSync in the host screen)
//   - Online path: supabase.from("camp_enrollments").insert() with `as any` cast
//     (camp_enrollments absent from generated types.ts — same pattern as checkinQueue.ts)
//   - Offline path: enqueueOp({ kind: "walkup_register", ... }) via checkinQueue.ts
//     (walkup_register branch is fully implemented in executeOp)
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { UserPlus } from 'lucide-react-native';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { enqueueOp } from '@/lib/checkinQueue';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/Select';
import { colors, typography, spacing } from '@/lib/theme';

interface CampWalkupRegistrationProps {
  campId: string;
  positions?: string[];
  isOnline: boolean;
  onRegistered?: () => void;
}

interface WalkupForm {
  athleteName: string;
  email: string;
  jerseyNumber: string;
  positionGroup: string;
}

const EMPTY_FORM: WalkupForm = {
  athleteName: '',
  email: '',
  jerseyNumber: '',
  positionGroup: '',
};

export function CampWalkupRegistration({
  campId,
  positions = [],
  isOnline,
  onRegistered,
}: CampWalkupRegistrationProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<WalkupForm>(EMPTY_FORM);
  const [nameError, setNameError] = useState('');

  function setField<K extends keyof WalkupForm>(key: K, value: WalkupForm[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (key === 'athleteName' && value.trim()) setNameError('');
  }

  const registerMutation = useMutation({
    mutationFn: async (data: WalkupForm) => {
      const payload = {
        jersey_number: data.jerseyNumber.trim() || null,
        position_group: data.positionGroup || null,
        notes: data.email.trim() ? `walk-up email: ${data.email.trim()}` : null,
        user_id: user?.id ?? null,
        athlete_profile_id: null,
      };

      if (!isOnline) {
        await enqueueOp({
          kind: 'walkup_register',
          campId,
          payload,
        });
        return { queued: true as const };
      }

      const { error } = await supabase.from('camp_enrollments').insert({
        camp_id: campId,
        user_id: user?.id ?? null,
        athlete_profile_id: null,
        jersey_number: payload.jersey_number,
        position_group: payload.position_group,
        notes: payload.notes,
        status: 'checked_in',
        payment_status: 'walkup',
        checked_in_at: new Date().toISOString(),
      } as any);

      if (error) throw error;
      return { queued: false as const };
    },
    onSuccess: (result) => {
      toast({
        title: result.queued ? '✓ Queued for sync' : '✓ Athlete registered',
        description: result.queued
          ? 'Saved offline — will sync when back online.'
          : `${form.athleteName.trim()} has been checked in.`,
      });
      setForm(EMPTY_FORM);
      setNameError('');
      queryClient.invalidateQueries({ queryKey: ['camp-ops-enrollments', campId] });
      onRegistered?.();
    },
    onError: (err: any) => {
      toast({
        title: 'Registration failed',
        description: err?.message ?? 'Unknown error',
        variant: 'destructive',
      });
    },
  });

  function handleSubmit() {
    if (!form.athleteName.trim()) {
      setNameError('Athlete name is required.');
      return;
    }
    registerMutation.mutate(form);
  }

  const isPending = registerMutation.isPending;

  return (
    <Card>
      <CardHeader style={s.header}>
        <View style={s.titleRow}>
          <UserPlus size={18} color={colors.foreground} />
          <CardTitle style={s.titleText}>Walk-up Registration</CardTitle>
        </View>
        {!isOnline && (
          <Text style={s.offlineBadge}>Offline — will queue</Text>
        )}
      </CardHeader>

      <CardContent style={s.content}>
        {/* Athlete name — required */}
        <View style={s.field}>
          <Label style={s.label}>
            Athlete Name <Text style={s.required}>*</Text>
          </Label>
          <Input
            value={form.athleteName}
            onChangeText={(v) => setField('athleteName', v)}
            placeholder="Full name"
            autoCapitalize="words"
            autoCorrect={false}
            editable={!isPending}
            accessibilityLabel="Athlete name"
          />
          {!!nameError && <Text style={s.error}>{nameError}</Text>}
        </View>

        {/* Email — optional */}
        <View style={s.field}>
          <Label style={s.label}>Email <Text style={s.optional}>(optional)</Text></Label>
          <Input
            value={form.email}
            onChangeText={(v) => setField('email', v)}
            placeholder="athlete@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            editable={!isPending}
            accessibilityLabel="Athlete email"
          />
        </View>

        {/* Jersey number — optional */}
        <View style={s.field}>
          <Label style={s.label}>Jersey # <Text style={s.optional}>(optional)</Text></Label>
          <Input
            value={form.jerseyNumber}
            onChangeText={(v) => setField('jerseyNumber', v)}
            placeholder="e.g. 12"
            keyboardType="number-pad"
            editable={!isPending}
            accessibilityLabel="Jersey number"
          />
        </View>

        {/* Position — optional dropdown, only shown when camp has positions */}
        {positions.length > 0 && (
          <View style={s.field}>
            <Label style={s.label}>Position <Text style={s.optional}>(optional)</Text></Label>
            <Select
              value={form.positionGroup}
              onValueChange={(v) => setField('positionGroup', v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select position..." />
              </SelectTrigger>
              <SelectContent>
                {positions.map((pos) => (
                  <SelectItem key={pos} value={pos}>
                    {pos}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </View>
        )}

        <Button
          onPress={handleSubmit}
          disabled={isPending}
          style={s.submitBtn}
          accessibilityLabel="Register walk-up athlete"
        >
          {isPending ? (
            <ActivityIndicator size="small" color={colors.primaryForeground} />
          ) : (
            <Text style={s.submitText}>
              {isOnline ? 'Register & Check In' : 'Queue Registration'}
            </Text>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}

const s = StyleSheet.create({
  header: { paddingBottom: spacing.xs },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  titleText: {
    fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: typography.size.base,
    color: colors.foreground,
  },
  offlineBadge: {
    marginTop: 4,
    fontSize: typography.size.xs,
    color: colors.mutedForeground,
    fontStyle: 'italic',
  },
  content: { gap: spacing.md },
  field: { gap: spacing.xs },
  label: {
    fontSize: typography.size.sm,
    color: colors.foreground,
    fontFamily: typography.fontFamily.bodyMedium,
  },
  required: { color: colors.destructive },
  optional: { color: colors.mutedForeground, fontWeight: 'normal' },
  error: { fontSize: typography.size.xs, color: colors.destructive, marginTop: 2 },
  submitBtn: { marginTop: spacing.xs },
  submitText: {
    color: colors.primaryForeground,
    fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: typography.size.base,
  },
});
