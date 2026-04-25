// Ported from Lovable web (src/components/CampTop10PacketButton.tsx) — RN-adapted.
// Translations:
//   - shadcn Button → src/components/ui/Button (RN)
//   - lucide-react → lucide-react-native
//   - useToast → @/hooks/use-toast
//   - Tailwind classes → StyleSheet via theme tokens
//   - Loader2 spinner → ActivityIndicator
//   - jsPDF (web-only) → expo-file-system + expo-sharing emitting plain-text packet.
//     Same approach as AdminBetaFeedbackDashboard.exportToPDF in this codebase.
//     The recruiter packet now ships as a `.txt` file the user can share / save.
import React, { useState } from 'react';
import { Text, ActivityIndicator } from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { FileDown } from 'lucide-react-native';
import { colors } from '@/lib/theme';

interface Props {
  campId: string;
  campName: string;
}

interface AthleteRow {
  enrollmentId: string;
  athleteProfileId: string | null;
  fullName: string;
  position: string | null;
  jerseyNumber: string | null;
  composite: number;
  rank: number;
  forty: number | null;
  shuttle: number | null;
  threeCone: number | null;
  vertical: number | null;
  broad: number | null;
  aiSummary: string | null;
}

const minOf = (arr?: number[] | null) => Array.isArray(arr) && arr.length ? Math.min(...arr) : null;
const maxOf = (arr?: number[] | null) => Array.isArray(arr) && arr.length ? Math.max(...arr) : null;

export function CampTop10PacketButton({ campId, campName }: Props) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const writeAndShareFile = async (filename: string, content: string) => {
    const dir = (FileSystem as any).cacheDirectory || (FileSystem as any).documentDirectory;
    const uri = `${dir}${filename}`;
    await (FileSystem as any).writeAsStringAsync(uri, content);
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri, { mimeType: 'text/plain', dialogTitle: filename });
    } else {
      toast({ title: 'Saved', description: uri });
    }
  };

  const generate = async () => {
    setIsLoading(true);
    try {
      const { data: scores } = await supabase
        .from('camp_ai_scores')
        .select('composite_score, ai_rank, ai_summary, athlete_profile_id, enrollment_id')
        .eq('camp_id', campId)
        .order('composite_score', { ascending: false })
        .limit(10);

      if (!scores || scores.length === 0) {
        toast({
          title: 'No scored athletes yet',
          description: 'Run AI scoring before generating the packet.',
          variant: 'destructive',
        });
        setIsLoading(false);
        return;
      }

      const enrollmentIds = scores.map((s: any) => s.enrollment_id).filter(Boolean) as string[];
      const profileIds = scores.map((s: any) => s.athlete_profile_id).filter(Boolean) as string[];

      const [{ data: enrollments }, { data: profiles }, { data: perf }] = await Promise.all([
        enrollmentIds.length
          ? supabase
              .from('camp_enrollments')
              .select('id, jersey_number, position_group, athlete_profile_id')
              .in('id', enrollmentIds)
          : Promise.resolve({ data: [] as any[] }),
        profileIds.length
          ? supabase
              .from('player_profiles')
              .select('id, full_name, position, height, weight, graduation_year')
              .in('id', profileIds)
          : Promise.resolve({ data: [] as any[] }),
        enrollmentIds.length
          ? supabase
              .from('camp_performance_entries')
              .select('enrollment_id, forty_yard_dash, shuttle_5_10_5, three_cone_drill, vertical_jump, broad_jump')
              .in('enrollment_id', enrollmentIds)
          : Promise.resolve({ data: [] as any[] }),
      ]);

      const enrollmentById = new Map((enrollments || []).map((e: any) => [e.id, e]));
      const profileById = new Map((profiles || []).map((p: any) => [p.id, p]));
      const perfByEnrollment = new Map((perf || []).map((p: any) => [p.enrollment_id, p]));

      const rows: AthleteRow[] = scores.map((s: any, idx: number) => {
        const enrollment = s.enrollment_id ? enrollmentById.get(s.enrollment_id) : null;
        const profile = s.athlete_profile_id ? profileById.get(s.athlete_profile_id) : null;
        const p = s.enrollment_id ? perfByEnrollment.get(s.enrollment_id) : null;
        return {
          enrollmentId: s.enrollment_id || '',
          athleteProfileId: s.athlete_profile_id,
          fullName: profile?.full_name || 'Unnamed athlete',
          position: profile?.position || enrollment?.position_group || null,
          jerseyNumber: enrollment?.jersey_number || null,
          composite: Number(s.composite_score) || 0,
          rank: s.ai_rank ?? idx + 1,
          forty: minOf(p?.forty_yard_dash),
          shuttle: minOf(p?.shuttle_5_10_5),
          threeCone: minOf(p?.three_cone_drill),
          vertical: maxOf(p?.vertical_jump),
          broad: maxOf(p?.broad_jump),
          aiSummary: s.ai_summary,
        };
      });

      // GAP: jsPDF is web-only. Emit a plain-text packet that mirrors the PDF layout.
      const lines: string[] = [];
      lines.push('Top 10 Recruiting Packet');
      lines.push(campName);
      lines.push(`Generated ${new Date().toLocaleDateString()} · OfferHound™ Camp Manager`);
      lines.push('');

      rows.forEach((a, idx) => {
        lines.push('-----------------------------------------');
        lines.push(`#${idx + 1}  ${a.fullName}`);
        const meta = [a.position, a.jerseyNumber ? `Jersey ${a.jerseyNumber}` : null]
          .filter(Boolean)
          .join(' · ');
        if (meta) lines.push(meta);
        lines.push(`AI Composite: ${a.composite.toFixed(1)}`);
        const drills = [
          a.forty != null ? `40yd: ${a.forty.toFixed(2)}s` : null,
          a.shuttle != null ? `Shuttle: ${a.shuttle.toFixed(2)}s` : null,
          a.threeCone != null ? `3-cone: ${a.threeCone.toFixed(2)}s` : null,
          a.vertical != null ? `Vert: ${a.vertical.toFixed(1)}"` : null,
          a.broad != null ? `Broad: ${a.broad.toFixed(1)}"` : null,
        ].filter(Boolean).join('   ');
        if (drills) lines.push(drills);
        if (a.aiSummary) lines.push(a.aiSummary);
        lines.push('');
      });

      const filename = `${campName.replace(/[^a-z0-9]+/gi, '-')}-top10-packet.txt`;
      await writeAndShareFile(filename, lines.join('\n'));
      toast({ title: 'Packet generated', description: `${rows.length} athletes included` });
    } catch (err: any) {
      console.error(err);
      toast({ title: 'Failed to generate packet', description: err.message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button variant="outline" onPress={generate} disabled={isLoading}>
      {isLoading ? (
        <ActivityIndicator size="small" color={colors.foreground} style={{ marginRight: 4 }} />
      ) : (
        <FileDown size={16} color={colors.foreground} style={{ marginRight: 4 }} />
      )}
      <Text style={{ color: colors.foreground }}>Top-10 Recruiter Packet</Text>
    </Button>
  );
}
