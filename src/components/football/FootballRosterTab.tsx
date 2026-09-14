import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ActivityIndicator, Pressable, ScrollView,
} from 'react-native';
import { Plus, Trash2, Save, ChevronDown, ChevronUp } from 'lucide-react-native';

import { useFootballRoster, ROSTER_ATHLETE_EMPTY, RosterAthlete, RosterAthletePayload } from '@/hooks/useFootballRoster';
import { useAuth } from '@/hooks/useAuth';
import { Button }  from '@/components/ui/Button';
import { Input }   from '@/components/ui/Input';
import { Label }   from '@/components/ui/Label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { colors, typography, spacing, radius } from '@/lib/theme';

// ── Types ────────────────────────────────────────────────────────────────────

type DraftAthlete = Omit<RosterAthlete, 'id' | 'owner_user_id' | 'created_at' | 'updated_at'>;

type DraftEntry =
  | { kind: 'existing'; id: string; draft: DraftAthlete; dirty: boolean; expanded: boolean }
  | { kind: 'new';      key: string; draft: DraftAthlete; expanded: boolean };

// ── Helpers ──────────────────────────────────────────────────────────────────

function athleteToDraft(a: RosterAthlete): DraftAthlete {
  return {
    athlete_name:         a.athlete_name,
    jersey_number:        a.jersey_number,
    position:             a.position,
    class_year:           a.class_year,
    height:               a.height,
    weight:               a.weight,
    gpa:                  a.gpa,
    hudl_url:             a.hudl_url,
    highlight_video_urls: [...(a.highlight_video_urls ?? [])],
    twitter_handle:       a.twitter_handle,
    instagram_handle:     a.instagram_handle,
    tiktok_handle:        a.tiktok_handle,
    youtube_handle:       a.youtube_handle,
    notes:                a.notes,
    is_active:            a.is_active,
    display_order:        a.display_order,
  };
}

// ── Main component ────────────────────────────────────────────────────────────

export function FootballRosterTab() {
  const { user } = useAuth();
  const { athletes, isLoading, isSaving, isDeleting, saveAthlete, deleteAthlete } = useFootballRoster();

  const [entries, setEntries] = useState<DraftEntry[]>(() =>
    athletes.map(a => ({ kind: 'existing' as const, id: a.id!, draft: athleteToDraft(a), dirty: false, expanded: false }))
  );
  const [seedIds, setSeedIds] = useState<string[]>(() => athletes.map(a => a.id!));

  // Sync server athletes into local draft state when the server list changes
  // by id set — avoids stomping in-progress edits.
  const serverIds = athletes.map(a => a.id!).join(',');
  React.useEffect(() => {
    const prevIds = seedIds.join(',');
    if (serverIds === prevIds) return;
    setSeedIds(athletes.map(a => a.id!));
    setEntries(prev => {
      const existingById = new Map(
        prev.filter(e => e.kind === 'existing').map(e => [e.id, e])
      );
      const serverEntries: DraftEntry[] = athletes.map(a => {
        const existing = existingById.get(a.id!);
        if (existing && existing.kind === 'existing') return existing;
        return { kind: 'existing', id: a.id!, draft: athleteToDraft(a), dirty: false, expanded: false };
      });
      const newEntries = prev.filter(e => e.kind === 'new');
      return [...serverEntries, ...newEntries];
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverIds]);

  const updateDraft = (index: number, key: keyof DraftAthlete, value: any) => {
    setEntries(prev => prev.map((e, i) => {
      if (i !== index) return e;
      const next = { ...e, draft: { ...e.draft, [key]: value } };
      if (next.kind === 'existing') return { ...next, dirty: true };
      return next;
    }));
  };

  const addVideoUrl = (index: number) => {
    setEntries(prev => prev.map((e, i) => {
      if (i !== index) return e;
      const next = { ...e, draft: { ...e.draft, highlight_video_urls: [...e.draft.highlight_video_urls, ''] } };
      if (next.kind === 'existing') return { ...next, dirty: true };
      return next;
    }));
  };

  const updateVideoUrl = (index: number, urlIndex: number, value: string) => {
    setEntries(prev => prev.map((e, i) => {
      if (i !== index) return e;
      const urls = [...e.draft.highlight_video_urls];
      urls[urlIndex] = value;
      const next = { ...e, draft: { ...e.draft, highlight_video_urls: urls } };
      if (next.kind === 'existing') return { ...next, dirty: true };
      return next;
    }));
  };

  const removeVideoUrl = (index: number, urlIndex: number) => {
    setEntries(prev => prev.map((e, i) => {
      if (i !== index) return e;
      const urls = e.draft.highlight_video_urls.filter((_, ui) => ui !== urlIndex);
      const next = { ...e, draft: { ...e.draft, highlight_video_urls: urls } };
      if (next.kind === 'existing') return { ...next, dirty: true };
      return next;
    }));
  };

  const toggleExpanded = (index: number) => {
    setEntries(prev => prev.map((e, i) =>
      i === index ? { ...e, expanded: !e.expanded } : e
    ));
  };

  const handleSave = (index: number) => {
    const e = entries[index];
    const payload: RosterAthletePayload = { ...e.draft, owner_user_id: user?.id };
    if (e.kind === 'existing') {
      saveAthlete(e.id, payload);
      setEntries(prev => prev.map((en, i) =>
        i === index && en.kind === 'existing' ? { ...en, dirty: false } : en
      ));
    } else {
      saveAthlete(undefined, payload);
      setEntries(prev => prev.filter((_, i) => i !== index));
    }
  };

  const handleDelete = (index: number) => {
    const e = entries[index];
    if (e.kind === 'existing') {
      deleteAthlete(e.id);
    } else {
      setEntries(prev => prev.filter((_, i) => i !== index));
    }
  };

  const handleAddNew = () => {
    const key = `new-${Date.now()}`;
    setEntries(prev => [
      ...prev,
      { kind: 'new', key, draft: { ...ROSTER_ATHLETE_EMPTY, highlight_video_urls: [] }, expanded: true },
    ]);
  };

  if (isLoading) {
    return (
      <View style={s.center} testID="roster-loading">
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={s.root}>
      <View style={s.headerRow}>
        <Text style={s.heading}>Football Roster</Text>
        <Button
          testID="add-athlete"
          size="sm"
          leftIcon={<Plus size={14} color={colors.primaryForeground} />}
          onPress={handleAddNew}
        >
          Add Athlete
        </Button>
      </View>

      {entries.length === 0 ? (
        <View style={s.empty} testID="roster-empty">
          <Text style={s.emptyText}>No athletes yet. Tap Add Athlete to get started.</Text>
        </View>
      ) : (
        <ScrollView scrollEnabled={false}>
          {entries.map((entry, index) => (
            <AthleteCard
              key={(entry.kind === 'existing' ? entry.id : entry.key) + '-' + index}
              entry={entry}
              index={index}
              isSaving={isSaving}
              isDeleting={isDeleting}
              onUpdate={updateDraft}
              onAddVideo={addVideoUrl}
              onUpdateVideo={updateVideoUrl}
              onRemoveVideo={removeVideoUrl}
              onToggleExpand={toggleExpanded}
              onSave={handleSave}
              onDelete={handleDelete}
            />
          ))}
        </ScrollView>
      )}
    </View>
  );
}

// ── AthleteCard ───────────────────────────────────────────────────────────────

type AthleteCardProps = {
  entry: DraftEntry;
  index: number;
  isSaving: boolean;
  isDeleting: boolean;
  onUpdate: (index: number, key: keyof DraftAthlete, value: any) => void;
  onAddVideo: (index: number) => void;
  onUpdateVideo: (index: number, urlIndex: number, value: string) => void;
  onRemoveVideo: (index: number, urlIndex: number) => void;
  onToggleExpand: (index: number) => void;
  onSave: (index: number) => void;
  onDelete: (index: number) => void;
};

function AthleteCard({
  entry, index, isSaving, isDeleting,
  onUpdate, onAddVideo, onUpdateVideo, onRemoveVideo,
  onToggleExpand, onSave, onDelete,
}: AthleteCardProps) {
  const { draft, expanded } = entry;
  const isDirty = entry.kind === 'new' || (entry.kind === 'existing' && entry.dirty);
  const prefix  = entry.kind === 'existing' ? entry.id : entry.key;

  return (
    <Card style={s.card}>
      <Pressable onPress={() => onToggleExpand(index)} style={s.cardSummary} testID={`athlete-header-${prefix}`}>
        <View style={{ flex: 1 }}>
          <Text style={s.athleteName} testID={`athlete-name-display-${prefix}`}>
            {draft.athlete_name || 'New Athlete'}
          </Text>
          <Text style={s.athleteMeta}>
            {[draft.position, draft.class_year, draft.jersey_number ? `#${draft.jersey_number}` : '']
              .filter(Boolean).join(' · ')}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
          {isDirty && <View style={s.dirtyDot} testID={`dirty-indicator-${prefix}`} />}
          {expanded ? <ChevronUp size={16} color={colors.foregroundSubtle} /> : <ChevronDown size={16} color={colors.foregroundSubtle} />}
        </View>
      </Pressable>

      {expanded && (
        <CardContent>
          <View style={s.fieldGrid}>
            <Field label="Athlete Name" testID={`field-athlete_name-${prefix}`}
              value={draft.athlete_name} onChange={v => onUpdate(index, 'athlete_name', v)} />
            <Field label="Jersey #" testID={`field-jersey_number-${prefix}`}
              value={draft.jersey_number} onChange={v => onUpdate(index, 'jersey_number', v)}
              keyboardType="numeric" />
            <Field label="Position" testID={`field-position-${prefix}`}
              value={draft.position} onChange={v => onUpdate(index, 'position', v)} />
            <Field label="Class Year" testID={`field-class_year-${prefix}`}
              value={draft.class_year} onChange={v => onUpdate(index, 'class_year', v)} />
            <Field label="Height" testID={`field-height-${prefix}`}
              value={draft.height} onChange={v => onUpdate(index, 'height', v)} />
            <Field label="Weight" testID={`field-weight-${prefix}`}
              value={draft.weight} onChange={v => onUpdate(index, 'weight', v)}
              keyboardType="numeric" />
            <Field label="GPA" testID={`field-gpa-${prefix}`}
              value={draft.gpa} onChange={v => onUpdate(index, 'gpa', v)}
              keyboardType="decimal-pad" />
            <Field label="Hudl URL" testID={`field-hudl_url-${prefix}`}
              value={draft.hudl_url} onChange={v => onUpdate(index, 'hudl_url', v)} />
          </View>

          <View style={s.section}>
            <Text style={s.sectionLabel}>Highlight Videos</Text>
            {draft.highlight_video_urls.map((url, ui) => (
              <View key={ui} style={s.urlRow}>
                <Input
                  testID={`field-highlight_video_url-${prefix}-${ui}`}
                  value={url}
                  onChangeText={v => onUpdateVideo(index, ui, v)}
                  placeholder="https://..."
                  style={{ flex: 1 }}
                />
                <Pressable
                  testID={`remove-video-${prefix}-${ui}`}
                  onPress={() => onRemoveVideo(index, ui)}
                  style={s.removeBtn}
                >
                  <Trash2 size={14} color={colors.destructive} />
                </Pressable>
              </View>
            ))}
            <Button
              testID={`add-video-${prefix}`}
              variant="outline"
              size="sm"
              leftIcon={<Plus size={12} color={colors.primary} />}
              onPress={() => onAddVideo(index)}
            >
              Add Video URL
            </Button>
          </View>

          <View style={s.section}>
            <Text style={s.sectionLabel}>Social</Text>
            <View style={s.fieldGrid}>
              <Field label="Twitter/X" testID={`field-twitter_handle-${prefix}`}
                value={draft.twitter_handle} onChange={v => onUpdate(index, 'twitter_handle', v)}
                placeholder="@handle" />
              <Field label="Instagram" testID={`field-instagram_handle-${prefix}`}
                value={draft.instagram_handle} onChange={v => onUpdate(index, 'instagram_handle', v)}
                placeholder="@handle" />
              <Field label="TikTok" testID={`field-tiktok_handle-${prefix}`}
                value={draft.tiktok_handle} onChange={v => onUpdate(index, 'tiktok_handle', v)}
                placeholder="@handle" />
              <Field label="YouTube" testID={`field-youtube_handle-${prefix}`}
                value={draft.youtube_handle} onChange={v => onUpdate(index, 'youtube_handle', v)}
                placeholder="@handle" />
            </View>
          </View>

          <View style={s.section}>
            <Label>Notes</Label>
            <Input
              testID={`field-notes-${prefix}`}
              value={draft.notes}
              onChangeText={v => onUpdate(index, 'notes', v)}
              placeholder="Recruiting notes, observations..."
            />
          </View>

          <View style={s.actionRow}>
            <Button
              testID={`save-athlete-${prefix}`}
              disabled={!isDirty || isSaving}
              onPress={() => onSave(index)}
              leftIcon={<Save size={14} color={colors.primaryForeground} />}
              size="sm"
            >
              {isSaving ? 'Saving...' : 'Save'}
            </Button>
            <Button
              testID={`delete-athlete-${prefix}`}
              variant="outline"
              size="sm"
              disabled={isDeleting}
              onPress={() => onDelete(index)}
              leftIcon={<Trash2 size={14} color={colors.destructive} />}
            >
              {entry.kind === 'new' ? 'Cancel' : 'Remove'}
            </Button>
          </View>
        </CardContent>
      )}
    </Card>
  );
}

// ── Field helper ──────────────────────────────────────────────────────────────

function Field({
  label, value, onChange, testID, placeholder, keyboardType,
}: {
  label: string; value: string; onChange: (v: string) => void;
  testID: string; placeholder?: string;
  keyboardType?: 'numeric' | 'decimal-pad' | 'default';
}) {
  return (
    <View style={s.fieldWrap}>
      <Label>{label}</Label>
      <Input
        testID={testID}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        keyboardType={keyboardType || 'default'}
      />
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root:        { gap: spacing.md },
  headerRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  heading:     { fontFamily: typography.fontFamily.heading, fontSize: typography.fontSize.lg, color: colors.foreground },
  center:      { paddingVertical: 40, alignItems: 'center' },
  empty:       { paddingVertical: spacing.xl, alignItems: 'center' },
  emptyText:   { color: colors.foregroundSubtle, fontSize: typography.fontSize.sm },
  card:        { marginBottom: spacing.sm },
  cardSummary: { flexDirection: 'row', alignItems: 'center', padding: spacing.md, gap: spacing.sm },
  athleteName: { fontFamily: typography.fontFamily.bodyMedium, fontSize: typography.fontSize.base, color: colors.foreground },
  athleteMeta: { color: colors.foregroundSubtle, fontSize: typography.fontSize.xs, marginTop: 2 },
  dirtyDot:    { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary },
  fieldGrid:   { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  fieldWrap:   { flexGrow: 1, flexBasis: '47%', minWidth: 140 },
  section:     { marginTop: spacing.md, gap: spacing.xs },
  sectionLabel: { fontFamily: typography.fontFamily.bodyMedium, fontSize: typography.fontSize.sm, color: colors.foreground },
  urlRow:      { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  removeBtn:   { padding: spacing.xs },
  actionRow:   { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md, justifyContent: 'flex-end' },
});
