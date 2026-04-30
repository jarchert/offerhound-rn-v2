// Ported from Lovable web src/pages/SavedCamps.tsx (125 LOC).
// Web → RN translations:
//   - <a href ...target=_blank> → Linking.openURL
//   - downloadICSFile (browser blob download) → addCampToDeviceCalendar (expo-calendar) [RN equiv]
//   - sonner toast → @/hooks/use-toast
//   - lucide-react → lucide-react-native
//   - Tailwind → StyleSheet via @/lib/theme
//   - shadcn lowercase → PascalCase via @/components/ui
//   - useAuth: @/hooks/useAuth (existing)
//   - Footer/SEO removed
import React from 'react';
import {
  View, Text, StyleSheet, ScrollView, SafeAreaView, ActivityIndicator, Pressable, Linking,
} from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { CalendarDays, MapPin, ExternalLink, Trash2 } from 'lucide-react-native';

import { BackButton } from '@/components/BackButton';
import { Card, CardContent, Badge, Button } from '@/components/ui';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import {
  addCampToDeviceCalendar,
  getGoogleCalendarUrl,
  type CollegeCamp,
} from '@/hooks/useCollegeCamps';
import { colors, typography, spacing, radius } from '@/lib/theme';

import { Navbar } from '@/components/Navbar';
interface SavedCampRow {
  id: string;
  camp: CollegeCamp | null;
}

export default function SavedCampsScreen() {
  const { user } = useAuth() as any;
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: camps = [], isLoading } = useQuery({
    queryKey: ['saved-camps-full', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from('saved_camps' as any)
        .select('*, camp:college_camps(*)')
        .eq('user_id', user.id);
      return (data || []) as unknown as SavedCampRow[];
    },
    enabled: !!user,
  });

  const handleRemove = async (savedId: string) => {
    if (!user) return;
    await supabase.from('saved_camps' as any).delete().eq('id', savedId);
    queryClient.invalidateQueries({ queryKey: ['saved-camps-full', user.id] });
    queryClient.invalidateQueries({ queryKey: ['saved-camp-ids', user.id] });
    toast({ title: 'Camp removed from My Camps' });
  };

  const sortedCamps = [...camps].sort((a, b) => {
    const dateA = a.camp?.start_date ? new Date(a.camp.start_date).getTime() : Infinity;
    const dateB = b.camp?.start_date ? new Date(b.camp.start_date).getTime() : Infinity;
    return dateA - dateB;
  });

  return (
    <SafeAreaView style={s.container}>
      <Navbar />
      <ScrollView contentContainerStyle={s.scroll}>
        <BackButton />
        <Text style={s.title}>My Camps ({camps.length})</Text>

        {isLoading ? (
          <View style={s.loading}><ActivityIndicator color={colors.primary} /></View>
        ) : sortedCamps.length === 0 ? (
          <Card style={{ ...s.card, ...s.empty }}>
            <CardContent style={s.emptyBody}>
              <CalendarDays size={40} color={colors.mutedForeground} />
              <Text style={s.emptyText}>
                No saved camps yet. Browse camps on your dashboard to save or add them to your calendar.
              </Text>
            </CardContent>
          </Card>
        ) : (
          <View style={s.list}>
            {sortedCamps.map((item) => {
              const camp = item.camp;
              if (!camp) return null;
              return (
                <Card key={item.id} style={s.card}>
                  <CardContent style={s.cardBody}>
                    <View style={s.row}>
                      <View style={{ flex: 1 }}>
                        <Text style={s.campName}>{camp.name}</Text>
                        <Text style={s.school}>{camp.school}</Text>
                      </View>
                      <Pressable
                        onPress={() => handleRemove(item.id)}
                        hitSlop={8}
                        style={s.iconBtn}>
                        <Trash2 size={16} color={colors.destructive} />
                      </Pressable>
                    </View>

                    <View style={s.metaRow}>
                      <View style={s.metaItem}>
                        <CalendarDays size={12} color={colors.mutedForeground} />
                        <Text style={s.metaText}>
                          {format(new Date(camp.start_date), 'MMM d, yyyy')}
                          {camp.end_date ? ` – ${format(new Date(camp.end_date), 'MMM d')}` : ''}
                        </Text>
                      </View>
                      {(camp.city || camp.state) ? (
                        <View style={s.metaItem}>
                          <MapPin size={12} color={colors.mutedForeground} />
                          <Text style={s.metaText}>
                            {[camp.city, camp.state].filter(Boolean).join(', ')}
                          </Text>
                        </View>
                      ) : null}
                    </View>

                    <View style={s.badgeRow}>
                      <Badge variant="outline">{camp.sport}</Badge>
                    </View>

                    <View style={s.actions}>
                      {camp.registration_url ? (
                        <Button
                          variant="default"
                          size="sm"
                          style={{ flex: 1 }}
                          leftIcon={<ExternalLink size={12} color={colors.primaryForeground} />}
                          onPress={() => Linking.openURL(camp.registration_url!)}>
                          Register / Details
                        </Button>
                      ) : null}
                      <Button
                        variant="ghost"
                        size="sm"
                        onPress={() => addCampToDeviceCalendar(camp)}>
                        📅 Calendar
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onPress={() => Linking.openURL(getGoogleCalendarUrl(camp))}>
                        📆 Google
                      </Button>
                    </View>
                  </CardContent>
                </Card>
              );
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: spacing.md, paddingBottom: spacing.xxl },
  title: {
    fontFamily: typography.fontFamily.heading,
    fontSize: typography.fontSize['2xl'],
    color: colors.foreground,
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  loading: { paddingVertical: spacing.xl, alignItems: 'center' },
  empty: { borderStyle: 'dashed', borderWidth: 1, borderColor: colors.border },
  emptyBody: { paddingVertical: spacing.xl, alignItems: 'center', gap: spacing.sm },
  emptyText: {
    color: colors.mutedForeground,
    fontSize: typography.fontSize.sm,
    textAlign: 'center',
    paddingHorizontal: spacing.md,
  },
  list: { gap: spacing.sm },
  card: { borderRadius: radius.lg },
  cardBody: { padding: spacing.md, gap: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  campName: {
    fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: typography.fontSize.sm,
    color: colors.foreground,
  },
  school: { fontSize: typography.fontSize.xs, color: colors.mutedForeground, marginTop: 2 },
  iconBtn: { padding: 4 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: typography.fontSize.xs, color: colors.mutedForeground },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
  },
});
