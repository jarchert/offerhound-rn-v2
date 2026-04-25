// Parity port from Lovable src/components/CampLinkBuilder.tsx (verbatim logic).
// Web→RN translations:
//   <div>/<p>/<span>/<ul>/<li>/<code> → <View>/<Text>
//   Tailwind classes → StyleSheet via @/lib/theme tokens
//   @/components/ui/* (lowercase) → PascalCase RN ports
//   lucide-react → lucide-react-native
//   onChange e.target.value → onChangeText
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Badge } from '@/components/ui/Badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select';
import { Copy, Check, Link2, Eye, Sparkles } from 'lucide-react-native';
import { copyToClipboard } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { colors, spacing, typography, radius } from '@/lib/theme';
import * as utm from '@/lib/utm';
import { buildCanonicalUrl } from '@/lib/canonicalDomain';
import { SharePreviewModal } from '@/components/SharePreviewModal';

type UtmParams = utm.UtmParams;
const { CAMPAIGN_SOURCE_OPTIONS, UTM_PRESETS, buildUtmUrlWithReport, buildUtmUrl, logShareLinkAudit } = utm;

interface CampLinkBuilderProps {
  campId: string;
  campName?: string;
  campDescription?: string | null;
}

export function CampLinkBuilder({
  campId,
  campName,
  campDescription,
}: CampLinkBuilderProps) {
  const { toast } = useToast();
  const baseUrl = buildCanonicalUrl(`/camps/${campId}`);
  const [previewOpen, setPreviewOpen] = useState(false);

  const defaultCampaign = useMemo(
    () =>
      (campName || 'camp')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 40) || 'camp',
    [campName]
  );

  const [params, setParams] = useState<UtmParams>({
    source: 'hudl',
    medium: 'profile',
    campaign: defaultCampaign,
    content: '',
    term: '',
  });
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const report = useMemo(
    () => buildUtmUrlWithReport(baseUrl, params),
    [baseUrl, params]
  );
  const trackedUrl = report.url;

  const lastLoggedRef = useRef<string | null>(null);
  useEffect(() => {
    if (!campId) return;
    if (report.strippedKeys.length === 0 && !report.hadHash) return;
    if (lastLoggedRef.current === trackedUrl) return;
    lastLoggedRef.current = trackedUrl;
    const timer = setTimeout(() => {
      void logShareLinkAudit({
        campId,
        baseUrl,
        finalUrl: trackedUrl,
        strippedKeys: report.strippedKeys,
        hadHash: report.hadHash,
        source: params.source,
      });
    }, 600);
    return () => clearTimeout(timer);
  }, [campId, baseUrl, trackedUrl, report.strippedKeys, report.hadHash, params.source]);

  const handleCopy = async (url: string, key: string) => {
    const ok = await copyToClipboard(url);
    if (ok) {
      setCopiedKey(key);
      toast({ title: 'Link copied', description: url });
      setTimeout(() => setCopiedKey(null), 1800);
    } else {
      toast({
        title: 'Copy failed',
        description: 'Please copy the URL manually.',
        variant: 'destructive',
      });
    }
  };

  const handleSelectSource = (value: string) => {
    const preset = CAMPAIGN_SOURCE_OPTIONS.find((o) => o.value === value);
    if (preset) {
      setParams((prev) => ({
        ...prev,
        source: preset.value,
        medium: preset.medium,
      }));
    } else {
      setParams((prev) => ({ ...prev, source: value }));
    }
  };

  return (
    <Card>
      <CardHeader>
        <View style={s.headerRow}>
          <View style={s.headerLeft}>
            <CardTitle>
              <View style={s.titleRow}>
                <Link2 size={20} color={colors.foreground} />
                <Text style={s.titleText}>Share-link builder</Text>
              </View>
            </CardTitle>
            <CardDescription>
              Add UTM tags so your analytics can show exactly which placements drove registrations.
            </CardDescription>
          </View>
          <Button
            variant="outline"
            size="sm"
            onPress={() => setPreviewOpen(true)}
            leftIcon={<Eye size={16} color={colors.foreground} />}
          >
            Preview share card
          </Button>
        </View>
      </CardHeader>
      <CardContent style={s.content}>
        <View style={s.field}>
          <Label>
            <View style={s.titleRow}>
              <Sparkles size={14} color={colors.primary} />
              <Text style={s.labelText}>Campaign source</Text>
            </View>
          </Label>
          <Select value={params.source} onValueChange={handleSelectSource}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {CAMPAIGN_SOURCE_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Text style={s.hint}>
            Stored as <Text style={s.mono}>utm_source</Text> on every registration that arrives via this link.
          </Text>
        </View>

        <View>
          <Label style={s.uppercase}>Quick presets</Label>
          <View style={s.presetRow}>
            {UTM_PRESETS.map((p) => {
              const active = params.source === p.source && params.medium === p.medium;
              return (
                <Pressable
                  key={p.label}
                  onPress={() =>
                    setParams((prev) => ({ ...prev, source: p.source, medium: p.medium }))
                  }
                >
                  <Badge variant={active ? 'default' : 'outline'}>{p.label}</Badge>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={s.grid}>
          <View style={s.gridCell}>
            <Label>Source *</Label>
            <Input
              value={params.source}
              onChangeText={(v) => setParams({ ...params, source: v })}
              placeholder="hudl"
            />
          </View>
          <View style={s.gridCell}>
            <Label>Medium *</Label>
            <Input
              value={params.medium}
              onChangeText={(v) => setParams({ ...params, medium: v })}
              placeholder="profile"
            />
          </View>
          <View style={s.gridCell}>
            <Label>Campaign *</Label>
            <Input
              value={params.campaign}
              onChangeText={(v) => setParams({ ...params, campaign: v })}
              placeholder={defaultCampaign}
            />
          </View>
          <View style={s.gridCell}>
            <Label>Content (optional)</Label>
            <Input
              value={params.content || ''}
              onChangeText={(v) => setParams({ ...params, content: v })}
              placeholder="hero-banner"
            />
          </View>
        </View>

        <View style={s.field}>
          <Label style={s.uppercase}>Trackable URL</Label>
          <View style={s.urlRow}>
            <View style={s.urlInputWrap}>
              <Input editable={false} value={trackedUrl} style={s.monoInput} />
            </View>
            <Button
              variant="outline"
              size="icon"
              onPress={() => handleCopy(trackedUrl, 'main')}
            >
              {copiedKey === 'main' ? (
                <Check size={16} color={colors.foreground} />
              ) : (
                <Copy size={16} color={colors.foreground} />
              )}
            </Button>
          </View>
          {(report.strippedKeys.length > 0 || report.hadHash) && (
            <Text style={s.sanitized}>
              ✓ Sanitized for sharing — removed{' '}
              {report.strippedKeys.length > 0
                ? `${report.strippedKeys.length} internal param${report.strippedKeys.length === 1 ? '' : 's'}`
                : ''}
              {report.strippedKeys.length > 0 && report.hadHash ? ' and ' : ''}
              {report.hadHash ? 'hash fragment' : ''}. Logged to audit trail.
            </Text>
          )}
        </View>

        <View>
          <Label style={s.uppercase}>One-click links</Label>
          <View style={s.linksList}>
            {UTM_PRESETS.slice(0, 4).map((p) => {
              const url = buildUtmUrl(baseUrl, {
                source: p.source,
                medium: p.medium,
                campaign: params.campaign || defaultCampaign,
              });
              return (
                <View key={p.label} style={s.linkRow}>
                  <Text style={s.linkLabel} numberOfLines={1}>{p.label}</Text>
                  <Button
                    variant="ghost"
                    size="sm"
                    onPress={() => handleCopy(url, p.label)}
                    leftIcon={
                      copiedKey === p.label ? (
                        <Check size={14} color={colors.foreground} />
                      ) : (
                        <Copy size={14} color={colors.foreground} />
                      )
                    }
                  >
                    Copy
                  </Button>
                </View>
              );
            })}
          </View>
        </View>
      </CardContent>

      <SharePreviewModal
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        url={trackedUrl}
        title={campName || 'Camp registration'}
        description={
          campDescription ||
          'Open Graph preview of how your share link will appear on social and chat apps.'
        }
      />
    </Card>
  );
}

const s = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  headerLeft: { flexShrink: 1, gap: 4 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  titleText: {
    fontFamily: typography.fontFamily.heading,
    fontSize: typography.size.lg,
    color: colors.foreground,
    letterSpacing: typography.letterSpacing.heading,
  },
  labelText: { fontFamily: typography.fontFamily.bodyMedium, fontSize: typography.size.sm, color: colors.foreground },
  content: { gap: spacing.md },
  field: { gap: 6 },
  hint: {
    fontFamily: typography.fontFamily.body,
    fontSize: 11,
    color: colors.mutedForeground,
  },
  mono: { fontFamily: 'Courier' },
  uppercase: {
    fontSize: typography.size.xs,
    color: colors.mutedForeground,
    textTransform: 'uppercase',
    letterSpacing: typography.letterSpacing.wide,
  },
  presetRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  gridCell: { flexBasis: '48%', flexGrow: 1, gap: 6 },
  urlRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
  urlInputWrap: { flex: 1 },
  monoInput: {
    fontFamily: 'Courier',
    fontSize: typography.size.xs,
    color: colors.foreground,
  },
  sanitized: { fontFamily: typography.fontFamily.body, fontSize: 11, color: colors.mutedForeground },
  linksList: { gap: 6, marginTop: 6 },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.muted,
  },
  linkLabel: { flex: 1, fontFamily: typography.fontFamily.body, fontSize: typography.size.sm, color: colors.foreground },
});
