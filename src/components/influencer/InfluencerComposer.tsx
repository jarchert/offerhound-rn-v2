// Verbatim port from Lovable web — RN-adapted.
// Source: offerhound-repo/src/components/influencer/InfluencerComposer.tsx
//
// Adaptations:
//   - Tailwind / shadcn primitives → @/components/ui/* (PascalCase)
//   - lucide-react → lucide-react-native
//   - sonner toast → @/components/ui/toast wrapper (success / error)
//   - Popover + Calendar → two Inputs (YYYY-MM-DD + HH:MM). The RN app
//     does not yet ship a native date picker; text entry keeps parity
//     without adding @react-native-community/datetimepicker.
//   - <input type="time"> → Input with numeric keyboard & HH:MM pattern hint
//   - <img>/<video> thumbnail grid → Image/Video placeholder tiles
//   - Wrapped in KeyboardAvoidingView (padding on iOS) — many multi-line
//     Text fields; the keyboard would otherwise obscure them.
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Label } from '@/components/ui/Label';
import { Badge } from '@/components/ui/Badge';
import { Switch } from '@/components/ui/Switch';
import { toast } from '@/components/ui/toast';
import {
  CalendarIcon,
  Send,
  Save,
  Clock,
  Image as ImageIcon,
  Webhook,
  FolderOpen,
  Video as VideoIcon,
} from 'lucide-react-native';
import { useSchedulePost, useContentLibrary } from '@/hooks/useInfluencerHootsuite';
import { colors, typography, spacing, radius } from '@/lib/theme';

interface ComposerSeed {
  title?: string;
  description?: string;
  url?: string;
  image?: string;
}

export function InfluencerComposer({
  influencerId,
  seed,
  onCleared,
  syndicationEnabled,
}: {
  influencerId: string;
  seed?: ComposerSeed | null;
  onCleared?: () => void;
  syndicationEnabled?: boolean;
}) {
  const [form, setForm] = useState({
    title: '',
    description: '',
    media_url: '',
    embed_url: '',
    cta_label: '',
    cta_url: '',
    tags: '',
  });
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [dateStr, setDateStr] = useState(''); // YYYY-MM-DD
  const [time, setTime] = useState('09:00');  // HH:MM
  const [syndicate, setSyndicate] = useState(syndicationEnabled || false);
  const [showLibrary, setShowLibrary] = useState(false);

  const schedule = useSchedulePost();
  const { data: library = [] } = useContentLibrary(influencerId);

  // Hydrate from seed (e.g. "Draft from news article")
  useEffect(() => {
    if (!seed) return;
    setForm((f) => ({
      ...f,
      title: seed.title || f.title,
      description: seed.description ? `${seed.description}\n\nMy take: ` : f.description,
      cta_url: seed.url || f.cta_url,
      cta_label: seed.url ? 'Read source' : f.cta_label,
      media_url: seed.image || f.media_url,
    }));
  }, [seed]);

  const reset = () => {
    setForm({ title: '', description: '', media_url: '', embed_url: '', cta_label: '', cta_url: '', tags: '' });
    setScheduleEnabled(false);
    setDateStr('');
    setTime('09:00');
    onCleared?.();
  };

  const buildScheduledFor = (): string | null => {
    if (!scheduleEnabled || !dateStr) return null;
    const [y, m, d] = dateStr.split('-').map(Number);
    const [hh, mm] = time.split(':').map(Number);
    if (!y || !m || !d) return null;
    const dt = new Date(y, m - 1, d, hh || 0, mm || 0, 0, 0);
    if (Number.isNaN(dt.getTime())) return null;
    return dt.toISOString();
  };

  const submit = async (asDraft = false) => {
    if (!form.title.trim() || !form.description.trim()) {
      toast.error('Title and content are required');
      return;
    }
    const scheduledFor = buildScheduledFor();
    if (scheduleEnabled && !scheduledFor) {
      toast.error('Pick a date for the scheduled post');
      return;
    }
    try {
      await schedule.mutateAsync({
        influencerId,
        title: form.title.trim(),
        description: form.description.trim(),
        mediaUrl: form.media_url || undefined,
        embedUrl: form.embed_url || undefined,
        ctaLabel: form.cta_label || undefined,
        ctaUrl: form.cta_url || undefined,
        tags: form.tags ? form.tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
        scheduledFor,
        asDraft,
        syndicationTargets: syndicate ? ['webhook'] : [],
      });
      toast.success(
        asDraft
          ? 'Draft saved'
          : scheduledFor
          ? `Scheduled for ${format(new Date(scheduledFor), 'PPp')}`
          : 'Posted',
      );
      reset();
    } catch (e: any) {
      toast.error(e?.message || 'Failed to save post');
    }
  };

  const dateLabel = dateStr
    ? (() => {
        try {
          const [y, m, d] = dateStr.split('-').map(Number);
          return format(new Date(y, (m || 1) - 1, d || 1), 'PPP');
        } catch {
          return dateStr;
        }
      })()
    : null;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={80}
    >
      <Card>
        <CardHeader>
          <CardTitle>Compose</CardTitle>
          <CardDescription>
            Write once, post now or schedule for later. Optionally syndicate to your connected channels.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <View style={{ gap: spacing.md }}>
            <View>
              <Label>Title *</Label>
              <Input
                value={form.title}
                onChangeText={(t) => setForm((f) => ({ ...f, title: t }))}
                placeholder="Headline for the post"
              />
            </View>
            <View>
              <Label>Content *</Label>
              <Textarea
                rows={5}
                value={form.description}
                onChangeText={(t) => setForm((f) => ({ ...f, description: t }))}
                placeholder="What's the story? Add hooks, hashtags, links."
              />
              <Text style={s.charCount}>{form.description.length} characters</Text>
            </View>

            <View style={{ gap: spacing.sm }}>
              <View>
                <View style={s.labelRow}>
                  <ImageIcon size={14} color={colors.foreground} />
                  <Label>Image URL</Label>
                </View>
                <View style={s.imageRow}>
                  <View style={{ flex: 1 }}>
                    <Input
                      value={form.media_url}
                      onChangeText={(t) => setForm((f) => ({ ...f, media_url: t }))}
                      placeholder="https://…"
                      autoCapitalize="none"
                      keyboardType="url"
                    />
                  </View>
                  <Button
                    variant="outline"
                    size="icon"
                    onPress={() => setShowLibrary((v) => !v)}
                    leftIcon={<FolderOpen size={16} color={colors.foreground} />}
                  />
                </View>
              </View>
              <View>
                <Label>Embed URL (YouTube, Spotify, etc.)</Label>
                <Input
                  value={form.embed_url}
                  onChangeText={(t) => setForm((f) => ({ ...f, embed_url: t }))}
                  autoCapitalize="none"
                  keyboardType="url"
                />
              </View>
              <View>
                <Label>Button label</Label>
                <Input
                  value={form.cta_label}
                  onChangeText={(t) => setForm((f) => ({ ...f, cta_label: t }))}
                  placeholder="Read more"
                />
              </View>
              <View>
                <Label>Button URL</Label>
                <Input
                  value={form.cta_url}
                  onChangeText={(t) => setForm((f) => ({ ...f, cta_url: t }))}
                  placeholder="https://…"
                  autoCapitalize="none"
                  keyboardType="url"
                />
              </View>
              <View>
                <Label>Tags (comma-separated)</Label>
                <Input
                  value={form.tags}
                  onChangeText={(t) => setForm((f) => ({ ...f, tags: t }))}
                  placeholder="football, recruiting, hudl"
                  autoCapitalize="none"
                />
              </View>
            </View>

            {showLibrary && library.length > 0 && (
              <View style={s.libraryBox}>
                <Text style={s.libraryTitle}>Content Library</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={s.libraryGrid}>
                    {library
                      .filter((l: any) => l.asset_type === 'image' || l.asset_type === 'video')
                      .map((l: any) => (
                        <Pressable
                          key={l.id}
                          onPress={() => {
                            setForm((f) => ({ ...f, media_url: l.asset_url || '' }));
                            setShowLibrary(false);
                          }}
                          style={s.libraryTile}
                        >
                          {l.asset_type === 'video' ? (
                            <View style={s.libraryVideo}>
                              <VideoIcon size={24} color={colors.mutedForeground} />
                            </View>
                          ) : (
                            <Image
                              source={{ uri: l.thumbnail_url || l.asset_url }}
                              style={s.libraryImg}
                            />
                          )}
                        </Pressable>
                      ))}
                  </View>
                </ScrollView>
              </View>
            )}

            {/* Schedule + Syndication */}
            <View style={s.scheduleBox}>
              <View style={s.row}>
                <View style={s.labelRow}>
                  <Clock size={16} color={colors.foreground} />
                  <Label>Schedule for later</Label>
                </View>
                <Switch value={scheduleEnabled} onValueChange={setScheduleEnabled} />
              </View>
              {scheduleEnabled && (
                <View style={{ gap: spacing.sm }}>
                  <View style={s.labelRow}>
                    <CalendarIcon size={14} color={colors.mutedForeground} />
                    <Text style={s.hint}>
                      {dateLabel ? dateLabel : 'Enter date below (YYYY-MM-DD)'}
                    </Text>
                  </View>
                  <View style={s.dateRow}>
                    <View style={{ flex: 1 }}>
                      <Input
                        value={dateStr}
                        onChangeText={setDateStr}
                        placeholder="2026-04-30"
                        keyboardType="numbers-and-punctuation"
                        autoCapitalize="none"
                      />
                    </View>
                    <View style={{ width: 110 }}>
                      <Input
                        value={time}
                        onChangeText={setTime}
                        placeholder="09:00"
                        keyboardType="numbers-and-punctuation"
                      />
                    </View>
                  </View>
                </View>
              )}

              <View style={[s.row, s.rowDivider]}>
                <View style={s.labelRow}>
                  <Webhook size={16} color={colors.foreground} />
                  <Label>Auto-syndicate via webhook</Label>
                  {!syndicationEnabled && (
                    <Badge variant="outline">
                      <Text style={s.tinyBadge}>Configure in Settings</Text>
                    </Badge>
                  )}
                </View>
                <Switch
                  value={syndicate}
                  onValueChange={setSyndicate}
                  disabled={!syndicationEnabled}
                />
              </View>
            </View>

            <View style={s.actions}>
              <Button
                onPress={() => submit(false)}
                disabled={schedule.isPending}
                style={{ flex: 1, minWidth: 140 }}
                leftIcon={<Send size={16} color={colors.primaryForeground} />}
              >
                {scheduleEnabled ? 'Schedule' : 'Post Now'}
              </Button>
              <Button
                variant="outline"
                onPress={() => submit(true)}
                disabled={schedule.isPending}
                leftIcon={<Save size={16} color={colors.foreground} />}
              >
                Save Draft
              </Button>
            </View>
          </View>
        </CardContent>
      </Card>
    </KeyboardAvoidingView>
  );
}

export default InfluencerComposer;

const s = StyleSheet.create({
  charCount: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.xs,
    color: colors.mutedForeground,
    marginTop: 2,
  },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  imageRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  libraryBox: {
    borderWidth: 1, borderStyle: 'dashed', borderColor: colors.border,
    borderRadius: radius.md, padding: spacing.sm, gap: spacing.sm,
  },
  libraryTitle: {
    fontFamily: typography.fontFamily.bodyMedium,
    fontSize: typography.fontSize.xs, color: colors.foreground,
  },
  libraryGrid: { flexDirection: 'row', gap: spacing.sm },
  libraryTile: {
    width: 72, height: 72, borderRadius: radius.sm, overflow: 'hidden',
    backgroundColor: colors.muted, borderWidth: 1, borderColor: colors.border,
  },
  libraryImg: { width: '100%', height: '100%' },
  libraryVideo: {
    width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center',
  },
  scheduleBox: {
    gap: spacing.sm, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.md, padding: spacing.sm,
  },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  rowDivider: { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.sm },
  dateRow: { flexDirection: 'row', gap: spacing.sm },
  hint: { fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.xs, color: colors.mutedForeground },
  tinyBadge: { fontSize: 10, color: colors.foreground, fontFamily: typography.fontFamily.bodyMedium },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});
