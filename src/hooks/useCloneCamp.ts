// Ported from Lovable src/hooks/useCloneCamp.ts — pure data-layer hook,
// no DOM/Tailwind dependencies, so the implementation is identical.
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { Camp } from '@/hooks/useCampManager';

export interface CloneOptions {
  source: Camp;
  newName: string;
  newStartDate: string;
  newEndDate?: string | null;
  copyStaff: boolean;
  copyDrillStations: boolean;
  copyPricing: boolean;
  copyEmailTemplates: boolean;
}

export interface CloneResult {
  newCampId: string;
  copied: { staff: number; drillStations: number; emailTemplates: number };
}

export function useCloneCamp() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation<CloneResult, Error, CloneOptions>({
    mutationFn: async (opts) => {
      if (!user) throw new Error('Not authenticated');
      const { source } = opts;

      const baseInsert: Record<string, any> = {
        coach_user_id: user.id,
        name: opts.newName,
        description: (source as any).description,
        camp_type: (source as any).camp_type,
        sport: (source as any).sport,
        start_date: opts.newStartDate,
        end_date: opts.newEndDate ?? null,
        start_time: (source as any).start_time,
        end_time: (source as any).end_time,
        location: (source as any).location,
        city: (source as any).city,
        state: (source as any).state,
        positions: (source as any).positions ?? [],
        capacity: (source as any).capacity,
        image_url: (source as any).image_url,
        status: 'draft',
        drill_stations: opts.copyDrillStations ? ((source as any).drill_stations ?? []) : [],
        is_free: opts.copyPricing ? (source as any).is_free : true,
        price_cents: opts.copyPricing ? (source as any).price_cents : 0,
        premium_price_cents: opts.copyPricing ? (source as any).premium_price_cents : null,
      };

      const { data: created, error: createErr } = await supabase
        .from('camps')
        .insert(baseInsert as any)
        .select('id')
        .single();
      if (createErr) throw createErr;
      const newCampId = (created as { id: string }).id;

      const result: CloneResult = {
        newCampId,
        copied: { staff: 0, drillStations: 0, emailTemplates: 0 },
      };

      if (opts.copyDrillStations) {
        result.copied.drillStations = Array.isArray((source as any).drill_stations)
          ? (source as any).drill_stations.length
          : 0;
      }

      if (opts.copyStaff) {
        const { data: staffRows } = await supabase
          .from('camp_staff')
          .select('name, email, role')
          .eq('camp_id', source.id);
        if (staffRows && staffRows.length > 0) {
          const staffInsert = staffRows.map((s: any) => ({
            camp_id: newCampId,
            name: s.name,
            email: s.email ?? null,
            role: s.role ?? 'evaluator',
          }));
          const { error: staffErr } = await supabase
            .from('camp_staff')
            .insert(staffInsert as any);
          if (!staffErr) result.copied.staff = staffInsert.length;
        }
      }

      if (opts.copyEmailTemplates) {
        const { data: tplRows } = await supabase
          .from('camp_email_templates')
          .select('subject, body, template_kind, is_active')
          .eq('coach_user_id', user.id)
          .eq('camp_id', source.id);
        if (tplRows && tplRows.length > 0) {
          const tplInsert = tplRows.map((t: any) => ({
            coach_user_id: user.id,
            camp_id: newCampId,
            subject: t.subject,
            body: t.body,
            template_kind: t.template_kind,
            is_active: t.is_active ?? true,
          }));
          const { error: tplErr } = await supabase
            .from('camp_email_templates')
            .insert(tplInsert as any);
          if (!tplErr) result.copied.emailTemplates = tplInsert.length;
        }
      }

      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['camps'] });
    },
  });
}
