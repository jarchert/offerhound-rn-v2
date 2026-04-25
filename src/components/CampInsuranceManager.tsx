// Ported from Lovable web (src/components/CampInsuranceManager.tsx) — RN-adapted.
// Translations:
//   - shadcn Card/Button/Input/Label/Badge → src/components/ui (RN)
//   - lucide-react → lucide-react-native
//   - sonner toast → useToast hook
//   - <input type="file"> → expo-document-picker (PDF/image)
//   - document.createElement('a').click() → Linking.openURL(signedUrl)
//   - confirm() → Alert.alert with Cancel/Delete
//   - Tailwind classes → StyleSheet via theme tokens
//   - Loader2 spinner → ActivityIndicator
//   - <input type="number"> → TextInput keyboardType="decimal-pad"
//   - <input type="date"> → plain text "YYYY-MM-DD" (no native picker added; matches existing port style)
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Alert, Linking, Pressable } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { format, differenceInDays, parseISO } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Badge } from '@/components/ui/Badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Shield, AlertTriangle, Trash2, Download } from 'lucide-react-native';
import { colors, spacing, typography, radius } from '@/lib/theme';

interface Props { campId: string }

interface PickedFile { uri: string; name: string; mimeType: string | null; size: number }

export const CampInsuranceManager = ({ campId }: Props) => {
  const { toast } = useToast();
  const [list, setList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [insurer, setInsurer] = useState('');
  const [policy, setPolicy] = useState('');
  const [coverage, setCoverage] = useState('');
  const [effective, setEffective] = useState('');
  const [expiration, setExpiration] = useState('');
  const [file, setFile] = useState<PickedFile | null>(null);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('camp_insurance_certificates' as any)
      .select('*').eq('camp_id', campId)
      .order('expiration_date', { ascending: false });
    setList((data as any[]) ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, [campId]);

  const pickFile = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['application/pdf', 'image/*'],
      copyToCacheDirectory: true,
    });
    if (result.canceled || !result.assets?.[0]) return;
    const a = result.assets[0];
    setFile({ uri: a.uri, name: a.name, mimeType: a.mimeType ?? null, size: a.size ?? 0 });
  };

  const upload = async () => {
    if (!file || !insurer || !effective || !expiration) {
      toast({ title: 'Insurer, dates, and file are required', variant: 'destructive' });
      return;
    }
    setUploading(true);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) { toast({ title: 'Login required', variant: 'destructive' }); setUploading(false); return; }
    const path = `${u.user.id}/${campId}/${Date.now()}-${file.name}`;
    // Read file body for upload (RN file URIs need fetch → blob/arrayBuffer for supabase upload).
    let body: Blob | ArrayBuffer;
    try {
      const resp = await fetch(file.uri);
      body = await resp.blob();
    } catch (e: any) {
      toast({ title: 'Read file failed', description: e.message, variant: 'destructive' });
      setUploading(false);
      return;
    }
    const up = await supabase.storage.from('camp-insurance').upload(path, body, {
      contentType: file.mimeType ?? 'application/octet-stream',
    });
    if (up.error) { toast({ title: up.error.message, variant: 'destructive' }); setUploading(false); return; }
    const { error } = await supabase.from('camp_insurance_certificates' as any).insert({
      camp_id: campId,
      uploaded_by: u.user.id,
      insurer_name: insurer,
      policy_number: policy || null,
      coverage_amount_cents: coverage ? Math.round(parseFloat(coverage) * 100) : null,
      effective_date: effective,
      expiration_date: expiration,
      file_path: path,
      file_name: file.name,
    });
    setUploading(false);
    if (error) { toast({ title: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Insurance certificate uploaded' });
    setInsurer(''); setPolicy(''); setCoverage(''); setEffective(''); setExpiration(''); setFile(null);
    load();
  };

  const downloadFile = async (path: string, _name: string) => {
    const { data, error } = await supabase.storage.from('camp-insurance').createSignedUrl(path, 60);
    if (error || !data) { toast({ title: 'Download failed', variant: 'destructive' }); return; }
    // GAP: RN can't trigger an anchor download. Open the signed URL — OS handles save.
    Linking.openURL(data.signedUrl).catch(() =>
      toast({ title: 'Could not open file', variant: 'destructive' }),
    );
  };

  const remove = (id: string, path: string) => {
    Alert.alert('Delete this certificate?', undefined, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          await supabase.storage.from('camp-insurance').remove([path]);
          await supabase.from('camp_insurance_certificates' as any).delete().eq('id', id);
          load();
        },
      },
    ]);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle style={styles.titleRow}>
          <Shield size={16} color={colors.foreground} />
          <Text style={styles.titleText}> Insurance certificates</Text>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <View style={styles.grid}>
          <View style={styles.cellFull}>
            <Label style={styles.smallLabel}>Insurer name</Label>
            <Input value={insurer} onChangeText={setInsurer} />
          </View>
          <View style={styles.cellHalf}>
            <Label style={styles.smallLabel}>Policy #</Label>
            <Input value={policy} onChangeText={setPolicy} />
          </View>
          <View style={styles.cellHalf}>
            <Label style={styles.smallLabel}>Coverage ($)</Label>
            <Input keyboardType="decimal-pad" value={coverage} onChangeText={setCoverage} />
          </View>
          <View style={styles.cellHalf}>
            <Label style={styles.smallLabel}>Effective date</Label>
            <Input placeholder="YYYY-MM-DD" value={effective} onChangeText={setEffective} />
          </View>
          <View style={styles.cellHalf}>
            <Label style={styles.smallLabel}>Expiration date</Label>
            <Input placeholder="YYYY-MM-DD" value={expiration} onChangeText={setExpiration} />
          </View>
          <View style={styles.cellFull}>
            <Label style={styles.smallLabel}>COI PDF</Label>
            <Button variant="outline" onPress={pickFile}>
              <Text style={styles.btnTextOutline}>{file ? file.name : 'Choose file'}</Text>
            </Button>
          </View>
        </View>

        <Button onPress={upload} disabled={uploading} style={{ marginTop: spacing.md }}>
          {uploading && <ActivityIndicator size="small" color={colors.primaryForeground} style={{ marginRight: 6 }} />}
          <Text style={styles.btnText}>Upload certificate</Text>
        </Button>

        <View style={styles.listWrap}>
          {loading ? (
            <Text style={styles.muted}>Loading…</Text>
          ) : list.length === 0 ? (
            <Text style={styles.muted}>No certificates uploaded yet.</Text>
          ) : (
            list.map((c) => {
              const daysLeft = differenceInDays(parseISO(c.expiration_date), new Date());
              const expired = daysLeft < 0;
              const expiringSoon = !expired && daysLeft <= 30;
              return (
                <View key={c.id} style={styles.itemRow}>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.itemTitle} numberOfLines={1}>{c.insurer_name}</Text>
                    <Text style={styles.itemMeta}>
                      Expires {format(parseISO(c.expiration_date), 'MMM d, yyyy')}
                      {c.coverage_amount_cents ? ` · $${(c.coverage_amount_cents / 100).toLocaleString()} coverage` : ''}
                    </Text>
                  </View>
                  {expired && (
                    <Badge variant="destructive">
                      <View style={styles.badgeInner}>
                        <AlertTriangle size={12} color={colors.destructiveForeground} />
                        <Text style={styles.badgeText}>Expired</Text>
                      </View>
                    </Badge>
                  )}
                  {expiringSoon && (
                    <Badge variant="secondary">
                      <View style={styles.badgeInner}>
                        <AlertTriangle size={12} color={colors.foreground} />
                        <Text style={[styles.badgeText, { color: colors.foreground }]}>{daysLeft}d</Text>
                      </View>
                    </Badge>
                  )}
                  <Pressable onPress={() => downloadFile(c.file_path, c.file_name)} style={styles.iconBtn}>
                    <Download size={14} color={colors.foreground} />
                  </Pressable>
                  <Pressable onPress={() => remove(c.id, c.file_path)} style={styles.iconBtn}>
                    <Trash2 size={14} color={colors.foreground} />
                  </Pressable>
                </View>
              );
            })
          )}
        </View>
      </CardContent>
    </Card>
  );
};

const styles = StyleSheet.create({
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  titleText: { color: colors.foreground, fontSize: typography.size.base, fontWeight: '600' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', columnGap: spacing.sm, rowGap: spacing.sm },
  cellFull: { flexBasis: '100%' },
  cellHalf: { flexBasis: '48%', flexGrow: 1 },
  smallLabel: { fontSize: typography.size.xs, marginBottom: 4 },
  btnText: { color: colors.primaryForeground, fontWeight: '600' },
  btnTextOutline: { color: colors.foreground },
  listWrap: {
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: spacing.xs,
  },
  muted: { fontSize: typography.size.xs, color: colors.mutedForeground },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    padding: spacing.xs + 2,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
  },
  itemTitle: { fontSize: typography.size.sm, fontWeight: '500', color: colors.foreground },
  itemMeta: { fontSize: typography.size.xs, color: colors.mutedForeground },
  badgeInner: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  badgeText: { fontSize: 10, color: colors.destructiveForeground, fontWeight: '500' },
  iconBtn: { padding: 4 },
});
