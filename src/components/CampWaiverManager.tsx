// Parity port from Lovable src/components/CampWaiverManager.tsx (verbatim logic).
// Web→RN mapping: shadcn Card/Button/Input/Label/Textarea/Switch/Select → src/components/ui/*;
// lucide-react → lucide-react-native; sonner toast → @/components/ui/toast;
// Tailwind → StyleSheet using @/lib/theme tokens.
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Textarea } from '@/components/ui/Textarea';
import { Switch } from '@/components/ui/Switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';
import { toast } from '@/components/ui/toast';
import { FileSignature, Loader2 } from 'lucide-react-native';
import { colors, typography, spacing } from '@/lib/theme';

interface Props { campId: string; }

const DEFAULT_BODY = `In consideration of being permitted to participate in this camp, I, the undersigned, on behalf of myself, my heirs, executors and assigns, hereby release the camp organizers, coaches, staff, and host facility from any and all liability for personal injury, property damage, or other loss arising from my participation. I represent that I am physically fit to participate and that I have disclosed any relevant medical conditions. Photo/media release: I grant permission for photographs and video taken during the camp to be used in promotional materials.`;

export const CampWaiverManager = ({ campId }: Props) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [waiver, setWaiver] = useState<any>(null);
  const [title, setTitle] = useState('Camp Liability Waiver');
  const [body, setBody] = useState(DEFAULT_BODY);
  const [signatureMode, setSignatureMode] = useState<'typed' | 'drawn' | 'either'>('either');
  const [isRequired, setIsRequired] = useState(true);
  const [signatureCount, setSignatureCount] = useState(0);

  useEffect(() => {
    (async () => {
      const { data: w } = await supabase
        .from('camp_waiver_templates' as any)
        .select('*')
        .eq('camp_id', campId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (w) {
        setWaiver(w);
        setTitle((w as any).title);
        setBody((w as any).body);
        setSignatureMode((w as any).signature_mode);
        setIsRequired((w as any).is_required);
      }
      const { count } = await supabase
        .from('camp_waiver_signatures' as any)
        .select('id', { count: 'exact', head: true })
        .eq('camp_id', campId);
      setSignatureCount(count ?? 0);
      setLoading(false);
    })();
  }, [campId]);

  const save = async () => {
    setSaving(true);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) { toast.error('Login required'); setSaving(false); return; }
    const payload = {
      camp_id: campId,
      title,
      body,
      signature_mode: signatureMode,
      is_required: isRequired,
      created_by: u.user.id,
      version: waiver ? (waiver.version ?? 1) + 1 : 1,
    };
    const { error } = waiver
      ? await supabase.from('camp_waiver_templates' as any).update(payload).eq('id', waiver.id)
      : await supabase.from('camp_waiver_templates' as any).insert(payload);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Waiver saved');
  };

  if (loading) {
    return <Text style={styles.loadingText}>Loading…</Text>;
  }

  return (
    <Card>
      <CardHeader>
        <View style={styles.titleRow}>
          <FileSignature size={16} color={colors.foreground} />
          <CardTitle style={styles.title}>Liability waiver</CardTitle>
          <Text style={styles.signedCount}>{signatureCount} signed</Text>
        </View>
      </CardHeader>
      <CardContent style={styles.content}>
        <View>
          <Label style={styles.fieldLabel}>Title</Label>
          <Input value={title} onChangeText={setTitle} />
        </View>
        <View>
          <Label style={styles.fieldLabel}>Body</Label>
          <Textarea rows={8} value={body} onChangeText={setBody} />
        </View>
        <View style={styles.gridRow}>
          <View style={styles.gridCol}>
            <Label style={styles.fieldLabel}>Signature method</Label>
            <Select value={signatureMode} onValueChange={(v: any) => setSignatureMode(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="typed">Typed name</SelectItem>
                <SelectItem value="drawn">Drawn signature</SelectItem>
                <SelectItem value="either">Either</SelectItem>
              </SelectContent>
            </Select>
          </View>
          <View style={styles.requiredCol}>
            <Switch value={isRequired} onValueChange={setIsRequired} />
            <Label style={styles.fieldLabel}>Required at registration</Label>
          </View>
        </View>
        <Button
          onPress={save}
          disabled={saving}
          size="sm"
          leftIcon={saving ? <Loader2 size={12} color={colors.primaryForeground} /> : undefined}
        >
          {waiver ? 'Update waiver' : 'Create waiver'}
        </Button>
      </CardContent>
    </Card>
  );
};

const styles = StyleSheet.create({
  loadingText: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.sm,
    color: colors.foregroundSubtle,
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  title: { fontSize: typography.fontSize.base },
  signedCount: {
    marginLeft: 'auto',
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.xs,
    color: colors.foregroundSubtle,
  },
  content: { gap: spacing.sm },
  fieldLabel: {
    fontSize: typography.fontSize.xs,
    marginBottom: 4,
  },
  gridRow: { flexDirection: 'row', gap: spacing.sm },
  gridCol: { flex: 1 },
  requiredCol: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
  },
});
