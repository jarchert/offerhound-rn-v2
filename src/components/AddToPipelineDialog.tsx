// Parity port from Lovable src/components/AddToPipelineDialog.tsx (verbatim logic).
// Web→RN mapping: shadcn Dialog/Select/Input/Textarea/Button/Avatar/Label →
// src/components/ui/*; lucide-react → lucide-react-native; Tailwind → StyleSheet @/lib/theme.
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, ActivityIndicator, TextInput } from 'react-native';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Label } from '@/components/ui/Label';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select';
import { Avatar } from '@/components/ui/Avatar';
import { Loader2, Search, Target, UserPlus } from 'lucide-react-native';
import { useAuth } from '@/hooks/useAuth';
import {
  useScoutPipelineStages,
  useScoutPipelineAthletes,
  useAddToPipeline,
} from '@/hooks/useScoutPipeline';
import { supabase } from '@/integrations/supabase/client';
import { colors, typography, spacing } from '@/lib/theme';

interface AthleteOption {
  id: string;
  full_name: string;
  position: string | null;
  school: string | null;
  profile_image_url: string | null;
}

interface AddToPipelineDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // If athleteId and athleteData are provided, skip the athlete search
  athleteId?: string;
  athleteData?: {
    full_name: string;
    position?: string | null;
    school?: string | null;
    profile_image_url?: string | null;
  };
  defaultStageId?: string;
  onSuccess?: () => void;
}

export function AddToPipelineDialog({
  open,
  onOpenChange,
  athleteId,
  athleteData,
  defaultStageId,
  onSuccess,
}: AddToPipelineDialogProps) {
  const { user } = useAuth();
  const { data: stages, isLoading: stagesLoading } = useScoutPipelineStages();
  const { data: pipelineAthletes } = useScoutPipelineAthletes();
  const addToPipeline = useAddToPipeline();

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<AthleteOption[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedAthlete, setSelectedAthlete] = useState<AthleteOption | null>(null);
  const [selectedStageId, setSelectedStageId] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [priority, setPriority] = useState<string>('medium');

  // Get IDs of athletes already in the pipeline
  const existingAthleteIds = new Set(
    pipelineAthletes?.map((a: any) => a.athlete_profile_id) || []
  );

  // If we have a pre-selected athlete, set it
  useEffect(() => {
    if (athleteId && athleteData) {
      setSelectedAthlete({
        id: athleteId,
        full_name: athleteData.full_name,
        position: athleteData.position || null,
        school: athleteData.school || null,
        profile_image_url: athleteData.profile_image_url || null,
      });
    }
  }, [athleteId, athleteData]);

  // Set default stage when stages load
  useEffect(() => {
    if (stages && stages.length > 0 && !selectedStageId) {
      setSelectedStageId(defaultStageId || stages[0].id);
    }
  }, [stages, defaultStageId, selectedStageId]);

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      if (!athleteId) {
        setSelectedAthlete(null);
        setSearchQuery('');
        setSearchResults([]);
      }
      setNotes('');
      setPriority('medium');
    }
  }, [open, athleteId]);

  const handleSearch = async () => {
    if (!searchQuery.trim() || !user) return;

    setIsSearching(true);
    try {
      const { data, error } = await supabase
        .from('player_profiles')
        .select('id, full_name, position, school, profile_image_url')
        .or(
          `full_name.ilike.%${searchQuery}%,school.ilike.%${searchQuery}%,position.ilike.%${searchQuery}%`
        )
        .eq('is_published', true)
        .eq('is_suspended', false)
        .limit(10);

      if (error) throw error;
      setSearchResults((data as AthleteOption[]) || []);
    } catch (error) {
      console.error('Error searching athletes:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSubmit = () => {
    if (!selectedAthlete || !selectedStageId) return;

    addToPipeline.mutate(
      {
        athleteProfileId: selectedAthlete.id,
        stageId: selectedStageId,
        notes: notes.trim() || undefined,
        priority,
      },
      {
        onSuccess: () => {
          onOpenChange(false);
          onSuccess?.();
        },
      }
    );
  };

  const isAlreadyInPipeline =
    !!selectedAthlete && existingAthleteIds.has(selectedAthlete.id);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent style={s.dialogContent}>
        <DialogHeader>
          <View style={s.titleRow}>
            <Target size={20} color={colors.primary} />
            <DialogTitle>Add to Pipeline</DialogTitle>
          </View>
          <DialogDescription>
            Add an athlete to your recruiting pipeline for tracking
          </DialogDescription>
        </DialogHeader>

        <View style={s.body}>
          {/* Athlete Selection */}
          {!athleteId && (
            <View style={s.field}>
              <Label>Search Athlete</Label>
              <View style={s.searchRow}>
                <View style={s.searchInputWrap}>
                  <View style={s.searchIcon} pointerEvents="none">
                    <Search size={16} color={colors.mutedForeground} />
                  </View>
                  <Input
                    placeholder="Search by name, school, or position..."
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    onSubmitEditing={handleSearch}
                    returnKeyType="search"
                    style={s.searchInput}
                    containerStyle={s.flex1}
                  />
                </View>
                <Button
                  variant="outline"
                  onPress={handleSearch}
                  disabled={isSearching || !searchQuery.trim()}
                >
                  {isSearching ? (
                    <ActivityIndicator size="small" color={colors.foreground} />
                  ) : (
                    'Search'
                  )}
                </Button>
              </View>

              {/* Search Results */}
              {searchResults.length > 0 && (
                <ScrollView style={s.resultsBox} nestedScrollEnabled>
                  {searchResults.map((athlete) => {
                    const isInPipeline = existingAthleteIds.has(athlete.id);
                    const isSelected = selectedAthlete?.id === athlete.id;
                    return (
                      <Pressable
                        key={athlete.id}
                        disabled={isInPipeline}
                        style={[
                          s.resultRow,
                          isSelected && s.resultRowSelected,
                          isInPipeline && s.resultRowDisabled,
                        ]}
                        onPress={() => !isInPipeline && setSelectedAthlete(athlete)}
                      >
                        <Avatar
                          size={32}
                          source={
                            athlete.profile_image_url
                              ? { uri: athlete.profile_image_url }
                              : undefined
                          }
                          fallback={athlete.full_name?.charAt(0) || 'A'}
                        />
                        <View style={s.resultText}>
                          <Text style={s.resultName} numberOfLines={1}>
                            {athlete.full_name}
                          </Text>
                          <Text style={s.resultMeta} numberOfLines={1}>
                            {athlete.position}
                            {athlete.school ? ` • ${athlete.school}` : ''}
                          </Text>
                        </View>
                        {isInPipeline && (
                          <Text style={s.inPipelineText}>In pipeline</Text>
                        )}
                      </Pressable>
                    );
                  })}
                </ScrollView>
              )}
            </View>
          )}

          {/* Selected Athlete Display */}
          {selectedAthlete && (
            <View style={s.selectedBox}>
              <View style={s.selectedRow}>
                <Avatar
                  size={40}
                  source={
                    selectedAthlete.profile_image_url
                      ? { uri: selectedAthlete.profile_image_url }
                      : undefined
                  }
                  fallback={selectedAthlete.full_name?.charAt(0) || 'A'}
                />
                <View style={s.flex1}>
                  <Text style={s.selectedName}>{selectedAthlete.full_name}</Text>
                  <Text style={s.selectedMeta}>
                    {selectedAthlete.position}
                    {selectedAthlete.school ? ` • ${selectedAthlete.school}` : ''}
                  </Text>
                </View>
                {!athleteId && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onPress={() => setSelectedAthlete(null)}
                  >
                    Change
                  </Button>
                )}
              </View>
              {isAlreadyInPipeline && (
                <Text style={s.warnText}>
                  This athlete is already in your pipeline
                </Text>
              )}
            </View>
          )}

          {/* Stage Selection */}
          <View style={s.field}>
            <Label>Pipeline Stage</Label>
            {stagesLoading ? (
              <View style={s.loadingRow}>
                <ActivityIndicator size="small" color={colors.mutedForeground} />
                <Text style={s.mutedText}>Loading stages...</Text>
              </View>
            ) : (
              <Select value={selectedStageId} onValueChange={setSelectedStageId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a stage" />
                </SelectTrigger>
                <SelectContent>
                  {stages?.map((stage) => (
                    <SelectItem key={stage.id} value={stage.id}>
                      {stage.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </View>

          {/* Priority Selection */}
          <View style={s.field}>
            <Label>Priority</Label>
            <Select value={priority} onValueChange={setPriority}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="high">🔥 High Priority</SelectItem>
                <SelectItem value="medium">⭐ Medium Priority</SelectItem>
                <SelectItem value="low">💡 Low Priority</SelectItem>
              </SelectContent>
            </Select>
          </View>

          {/* Notes */}
          <View style={s.field}>
            <Label>Notes (optional)</Label>
            <Textarea
              placeholder="Add notes about this prospect..."
              value={notes}
              onChangeText={setNotes}
              rows={3}
            />
          </View>
        </View>

        <DialogFooter>
          <Button variant="outline" onPress={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onPress={handleSubmit}
            disabled={
              !selectedAthlete ||
              !selectedStageId ||
              addToPipeline.isPending ||
              isAlreadyInPipeline
            }
            loading={addToPipeline.isPending}
            leftIcon={
              !addToPipeline.isPending ? (
                <UserPlus size={16} color={colors.primaryForeground} />
              ) : undefined
            }
          >
            {addToPipeline.isPending ? 'Adding...' : 'Add to Pipeline'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default AddToPipelineDialog;

const s = StyleSheet.create({
  dialogContent: { maxWidth: 448 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  body: { gap: spacing.md },
  field: { gap: spacing.xs },
  flex1: { flex: 1 },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  searchInputWrap: { flex: 1, position: 'relative', justifyContent: 'center' },
  searchIcon: {
    position: 'absolute',
    left: spacing.md,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    zIndex: 1,
  },
  searchInput: { paddingLeft: 36 },
  resultsBox: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    maxHeight: 192,
    marginTop: spacing.xs,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm,
  },
  resultRowSelected: { backgroundColor: 'rgba(231, 175, 8, 0.10)' },
  resultRowDisabled: { opacity: 0.5 },
  resultText: { flex: 1, minWidth: 0 },
  resultName: {
    fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: typography.fontSize.sm,
    color: colors.foreground,
  },
  resultMeta: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.xs,
    color: colors.mutedForeground,
  },
  inPipelineText: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.xs,
    color: colors.mutedForeground,
  },
  selectedBox: {
    padding: spacing.sm,
    backgroundColor: 'rgba(39, 43, 52, 0.3)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  selectedRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  selectedName: {
    fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: typography.fontSize.base,
    color: colors.foreground,
  },
  selectedMeta: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.sm,
    color: colors.mutedForeground,
  },
  warnText: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.sm,
    color: colors.warning,
    marginTop: spacing.xs,
  },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  mutedText: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.sm,
    color: colors.mutedForeground,
  },
});
