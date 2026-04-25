// Ported from Lovable src/components/transcripts/TranscriptManager.tsx
// Web → RN mapping:
//   - lucide-react → lucide-react-native
//   - shadcn/ui Card/Button/Input/Label/Badge → @/components/ui/*
//   - useToast → @/hooks/use-toast (compat shim over react-native-toast-message)
//   - <input type="file"> + ref.click() → expo-document-picker
//     (DocumentPicker.getDocumentAsync), already used elsewhere in this app
//   - File built from picker asset as { uri, name, type, size } and cast to
//     File for the existing `useTranscripts().upload` hook (which is shared
//     with web; supabase-js storage upload accepts the RN file shape).
//   - window.open(url) → Linking.openURL(url)
//   - confirm() → Alert.alert with destructive action
//   - Tailwind utility classes → StyleSheet using @/lib/theme tokens
//   - Loader2 spinner → ActivityIndicator
import React, { useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Alert, Linking } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { FileText, Upload, Trash2, Eye, Share2, Lock } from 'lucide-react-native';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Badge } from '@/components/ui/Badge';
import { useTranscripts, AcademicTranscript } from '@/hooks/useTranscripts';
import { useToast } from '@/hooks/use-toast';
import { ShareTranscriptDialog } from './ShareTranscriptDialog';
import { colors, typography, spacing } from '@/lib/theme';

interface PendingFile {
  uri: string;
  name: string;
  type: string;
  size: number;
}

interface Props {
  /** When true, render a more compact card suitable for ProfileManagement (next to GPA). */
  compact?: boolean;
}

export function TranscriptManager({ compact = false }: Props) {
  const { data: transcripts = [], isLoading, upload, remove, getDownloadUrl } = useTranscripts();
  const { toast } = useToast();
  const [gpa, setGpa] = useState('');
  const [semester, setSemester] = useState('');
  const [year, setYear] = useState('');
  const [pendingFile, setPendingFile] = useState<PendingFile | null>(null);
  const [shareTarget, setShareTarget] = useState<AcademicTranscript | null>(null);

  const handlePickFile = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: 'application/pdf',
      copyToCacheDirectory: true,
    });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    if (asset.mimeType && asset.mimeType !== 'application/pdf') {
      toast({ title: 'PDF only', description: 'Please upload a PDF file.', variant: 'destructive' });
      return;
    }
    if ((asset.size ?? 0) > 10 * 1024 * 1024) {
      toast({ title: 'File too large', description: 'Max 10MB.', variant: 'destructive' });
      return;
    }
    setPendingFile({
      uri: asset.uri,
      name: asset.name || 'transcript.pdf',
      type: 'application/pdf',
      size: asset.size ?? 0,
    });
  };

  const handleUpload = async () => {
    if (!pendingFile) return;
    try {
      await upload.mutateAsync({
        // The existing useTranscripts hook is shared with the web app and types
        // the file as `File`. The RN `{uri,name,type,size}` shape is accepted
        // by supabase-js storage upload; cast through unknown to satisfy TS.
        file: pendingFile as unknown as File,
        gpa: gpa || undefined,
        semester: semester || undefined,
        year: year || undefined,
      });
      toast({ title: 'Transcript uploaded', description: 'Your transcript is private and only shared on your approval.' });
      setPendingFile(null);
      setGpa('');
      setSemester('');
      setYear('');
    } catch (e: any) {
      toast({ title: 'Upload failed', description: e.message || 'Try again', variant: 'destructive' });
    }
  };

  const handlePreview = async (t: AcademicTranscript) => {
    const url = await getDownloadUrl(t);
    if (url) {
      try {
        await Linking.openURL(url);
      } catch {
        toast({ title: 'Could not open', variant: 'destructive' });
      }
    } else {
      toast({ title: 'Could not open', variant: 'destructive' });
    }
  };

  const handleDelete = (t: AcademicTranscript) => {
    Alert.alert(
      'Delete transcript?',
      `Delete "${t.file_name}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await remove.mutateAsync(t);
              toast({ title: 'Deleted' });
            } catch (e: any) {
              toast({ title: 'Delete failed', description: e.message, variant: 'destructive' });
            }
          },
        },
      ]
    );
  };

  return (
    <Card>
      <CardHeader style={compact ? s.headerCompact : undefined}>
        <View style={s.titleRow}>
          <FileText size={16} color={colors.primary} />
          <CardTitle style={s.titleText as any}>Academic Transcript</CardTitle>
          <Badge variant="outline" style={s.privateBadge}>
            <View style={s.privateBadgeInner}>
              <Lock size={12} color={colors.foreground} />
              <Text style={s.privateBadgeText}> Private</Text>
            </View>
          </Badge>
        </View>
        <CardDescription style={s.descText}>
          PDF only · Max 10MB · Shared only when you approve a request
        </CardDescription>
      </CardHeader>
      <CardContent style={s.content}>
        {/* Upload row */}
        <View style={s.uploadBox}>
          <View style={s.uploadGrid}>
            <View style={s.gridCell}>
              <Label style={s.fieldLabel}>GPA</Label>
              <Input placeholder="3.85" value={gpa} onChangeText={setGpa} />
            </View>
            <View style={s.gridCell}>
              <Label style={s.fieldLabel}>Semester</Label>
              <Input placeholder="Fall" value={semester} onChangeText={setSemester} />
            </View>
            <View style={s.gridCell}>
              <Label style={s.fieldLabel}>Year</Label>
              <Input placeholder="2025" value={year} onChangeText={setYear} keyboardType="number-pad" />
            </View>
          </View>

          {!pendingFile ? (
            <Button
              variant="outline"
              size="sm"
              style={s.fullBtn}
              onPress={handlePickFile}
              leftIcon={<Upload size={16} color={colors.foreground} style={{ marginRight: 4 }} />}
            >
              Choose PDF
            </Button>
          ) : (
            <View style={s.pendingRow}>
              <Badge variant="secondary" style={s.pendingBadge}>
                <Text style={s.pendingBadgeText} numberOfLines={1}>{pendingFile.name}</Text>
              </Badge>
              <Button size="sm" onPress={handleUpload} disabled={upload.isPending}>
                {upload.isPending ? '...' : 'Upload'}
              </Button>
              <Button size="sm" variant="ghost" onPress={() => setPendingFile(null)}>
                Cancel
              </Button>
            </View>
          )}
        </View>

        {/* Existing transcripts */}
        {isLoading ? (
          <View style={s.centerSm}>
            <ActivityIndicator size="small" color={colors.primary} />
          </View>
        ) : transcripts.length === 0 ? (
          <Text style={s.emptyText}>No transcripts uploaded yet.</Text>
        ) : (
          <View style={s.listWrap}>
            {transcripts.map((t) => (
              <View key={t.id} style={s.listRow}>
                <FileText size={16} color={colors.primary} />
                <View style={s.listMain}>
                  <Text style={s.listName} numberOfLines={1}>{t.file_name}</Text>
                  <Text style={s.listMeta}>
                    {[t.gpa && `GPA ${t.gpa}`, t.semester, t.year].filter(Boolean).join(' · ') || '—'}
                  </Text>
                </View>
                <Button
                  size="sm"
                  variant="ghost"
                  onPress={() => handlePreview(t)}
                  leftIcon={<Eye size={14} color={colors.foreground} />}
                />
                <Button
                  size="sm"
                  variant="ghost"
                  onPress={() => setShareTarget(t)}
                  leftIcon={<Share2 size={14} color={colors.foreground} />}
                />
                <Button
                  size="sm"
                  variant="ghost"
                  onPress={() => handleDelete(t)}
                  leftIcon={<Trash2 size={14} color={colors.destructive} />}
                />
              </View>
            ))}
          </View>
        )}
      </CardContent>

      {shareTarget && (
        <ShareTranscriptDialog
          transcript={shareTarget}
          open={!!shareTarget}
          onOpenChange={(open) => !open && setShareTarget(null)}
        />
      )}
    </Card>
  );
}

export default TranscriptManager;

const s = StyleSheet.create({
  headerCompact: { paddingBottom: spacing.sm },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  titleText: { fontSize: typography.fontSize.base, color: colors.foreground },
  privateBadge: { marginLeft: spacing.sm, paddingHorizontal: 6 },
  privateBadgeInner: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  privateBadgeText: { fontSize: 10, color: colors.foreground, fontFamily: typography.fontFamily.bodySemiBold },
  descText: { fontSize: typography.fontSize.xs, color: colors.mutedForeground },
  content: { gap: spacing.md },

  uploadBox: {
    gap: spacing.sm, padding: spacing.sm, borderRadius: 12,
    borderWidth: 1, borderStyle: 'dashed', borderColor: colors.border,
  },
  uploadGrid: { flexDirection: 'row', gap: spacing.sm },
  gridCell: { flex: 1, gap: 4 },
  fieldLabel: { fontSize: typography.fontSize.xs, color: colors.foreground },

  fullBtn: { width: '100%' },
  pendingRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  pendingBadge: { flex: 1, alignSelf: 'stretch', justifyContent: 'flex-start' },
  pendingBadgeText: { fontSize: typography.fontSize.xs, color: colors.secondaryForeground },

  centerSm: { alignItems: 'center', paddingVertical: spacing.md },
  emptyText: {
    fontSize: typography.fontSize.xs, color: colors.mutedForeground,
    textAlign: 'center', paddingVertical: spacing.sm, fontFamily: typography.fontFamily.body,
  },
  listWrap: { gap: spacing.sm },
  listRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    padding: spacing.sm, borderRadius: 8,
    backgroundColor: colors.secondary + '66', borderWidth: 1, borderColor: colors.border,
  },
  listMain: { flex: 1, minWidth: 0 },
  listName: { fontSize: typography.fontSize.xs, fontFamily: typography.fontFamily.bodySemiBold, color: colors.foreground },
  listMeta: { fontSize: 10, color: colors.mutedForeground, fontFamily: typography.fontFamily.body },
});
