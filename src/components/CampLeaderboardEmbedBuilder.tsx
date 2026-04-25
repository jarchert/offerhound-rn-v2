// Ported from Lovable web (src/components/CampLeaderboardEmbedBuilder.tsx) — RN-adapted.
// Translations:
//   - shadcn Card/Button/Label/Select/Input/Textarea → src/components/ui (RN)
//   - lucide-react → lucide-react-native
//   - Tailwind → StyleSheet via theme tokens
//   - navigator.clipboard → expo-clipboard (Clipboard.setStringAsync)
//   - window.location.origin → constant 'https://offerhound.app' (no window in RN)
//   - <iframe> preview → Linking.openURL via "Preview" button (no native iframe)
//   - <a href> "Preview" anchor → Pressable + Linking.openURL
import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, Linking } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Label } from '@/components/ui/Label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { useToast } from '@/hooks/use-toast';
import { Code2, Copy, ExternalLink } from 'lucide-react-native';
import { colors, spacing, typography, radius } from '@/lib/theme';

interface CampLeaderboardEmbedBuilderProps {
  campId: string;
  campName: string;
}

// GAP: RN has no window.location.origin — use stable web base URL.
const WEB_ORIGIN = 'https://offerhound.app';

const METRIC_OPTIONS = [
  { value: 'composite_score', label: 'AI composite (recommended)' },
  { value: 'forty_yard_dash', label: '40-yard dash' },
  { value: 'shuttle_5_10_5', label: '5-10-5 shuttle' },
  { value: 'three_cone_drill', label: '3-cone drill' },
  { value: 'vertical_jump', label: 'Vertical jump' },
  { value: 'broad_jump', label: 'Broad jump' },
];

export function CampLeaderboardEmbedBuilder({ campId, campName }: CampLeaderboardEmbedBuilderProps) {
  const { toast } = useToast();
  const [metric, setMetric] = useState('composite_score');
  const [limit, setLimit] = useState(10);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [width, setWidth] = useState(360);
  const [height, setHeight] = useState(560);

  const embedUrl = useMemo(() => {
    return `${WEB_ORIGIN}/embed/leaderboard/${campId}?metric=${metric}&limit=${limit}&theme=${theme}`;
  }, [campId, metric, limit, theme]);

  const embedCode = useMemo(() => {
    return `<iframe src="${embedUrl}" width="${width}" height="${height}" frameborder="0" loading="lazy" title="${campName} leaderboard"></iframe>`;
  }, [embedUrl, width, height, campName]);

  const copyCode = async () => {
    await Clipboard.setStringAsync(embedCode);
    toast({ title: 'Embed copied', description: 'Paste into any HTML page.' });
  };

  const openPreview = () => {
    Linking.openURL(embedUrl).catch(() => {
      toast({ title: 'Could not open preview', variant: 'destructive' });
    });
  };

  const parseInt10 = (s: string, fallback: number) => {
    const n = parseInt(s, 10);
    return Number.isFinite(n) ? n : fallback;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle style={styles.titleRow}>
          <Code2 size={16} color={colors.foreground} />
          <Text style={styles.titleText}> Embeddable leaderboard widget</Text>
        </CardTitle>
        <CardDescription>
          Drop the live leaderboard into your school site, athletic department page, or blog.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <View style={styles.grid}>
          <View style={styles.gridCell}>
            <Label style={styles.smallLabel}>Metric</Label>
            <Select value={metric} onValueChange={setMetric}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {METRIC_OPTIONS.map((m) => (
                  <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </View>
          <View style={styles.gridCell}>
            <Label style={styles.smallLabel}>Theme</Label>
            <Select value={theme} onValueChange={(v) => setTheme(v as 'dark' | 'light')}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="dark">Dark</SelectItem>
                <SelectItem value="light">Light</SelectItem>
              </SelectContent>
            </Select>
          </View>
          <View style={styles.gridCell}>
            <Label style={styles.smallLabel}>Top N</Label>
            <Input
              keyboardType="number-pad"
              value={String(limit)}
              onChangeText={(t) => setLimit(Math.max(3, Math.min(25, parseInt10(t, 10))))}
            />
          </View>
          <View style={styles.gridCell}>
            <Label style={styles.smallLabel}>Width × Height</Label>
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Input
                  keyboardType="number-pad"
                  value={String(width)}
                  onChangeText={(t) => setWidth(parseInt10(t, 360))}
                />
              </View>
              <View style={{ width: spacing.xs }} />
              <View style={{ flex: 1 }}>
                <Input
                  keyboardType="number-pad"
                  value={String(height)}
                  onChangeText={(t) => setHeight(parseInt10(t, 560))}
                />
              </View>
            </View>
          </View>
        </View>

        <View style={{ marginTop: spacing.md }}>
          <Label style={styles.smallLabel}>Embed code</Label>
          <Textarea editable={false} value={embedCode} style={styles.codeArea} />
        </View>

        <View style={[styles.row, { marginTop: spacing.md }]}>
          <View style={{ flex: 1 }}>
            <Button onPress={copyCode}>
              <Copy size={16} color={colors.primaryForeground} />
              <Text style={styles.btnText}> Copy embed</Text>
            </Button>
          </View>
          <View style={{ width: spacing.xs }} />
          <Button variant="outline" onPress={openPreview}>
            <ExternalLink size={16} color={colors.foreground} />
            <Text style={styles.btnTextOutline}> Preview</Text>
          </Button>
        </View>

        {/* GAP: native RN has no <iframe>. Live preview replaced by external URL launch above. */}
        <View style={styles.previewBox}>
          <Text style={styles.previewHint}>
            Live HTML preview is web-only. Tap “Preview” to open the embeddable
            leaderboard in your browser.
          </Text>
        </View>
      </CardContent>
    </Card>
  );
}

const styles = StyleSheet.create({
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  titleText: { color: colors.foreground, fontSize: typography.size.lg, fontWeight: '600' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  gridCell: { flexBasis: '48%', flexGrow: 1 },
  smallLabel: { fontSize: typography.size.xs, marginBottom: 4 },
  row: { flexDirection: 'row', alignItems: 'center' },
  codeArea: {
    fontFamily: 'Courier',
    fontSize: typography.size.xs,
    minHeight: 80,
  },
  btnText: { color: colors.primaryForeground, fontWeight: '600' },
  btnTextOutline: { color: colors.foreground, fontWeight: '600' },
  previewBox: {
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    backgroundColor: colors.muted,
  },
  previewHint: { fontSize: typography.size.xs, color: colors.mutedForeground },
});
