import React from 'react';
import { View, Text, FlatList, StyleSheet, SafeAreaView, Pressable, RefreshControl, Alert, Linking } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Calendar, MapPin, ExternalLink } from 'lucide-react-native';
import { supabase } from '@/integrations/supabase/client';
import { Navbar } from '@/components/Navbar';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { addCampToDeviceCalendar, type CollegeCamp } from '@/hooks/useCollegeCamps';
import { colors, typography, spacing } from '@/lib/theme';

export default function CampsScreen() {
  const { data: camps = [], isLoading, refetch } = useQuery({
    queryKey: ['college-camps'],
    queryFn: async () => {
      const { data } = await supabase
        .from('college_camps')
        .select('*')
        .gte('start_date', new Date().toISOString().split('T')[0])
        .order('start_date', { ascending: true })
        .limit(100);
      return (data || []) as any as CollegeCamp[];
    },
  });

  const handleAddToCalendar = async (camp: CollegeCamp) => {
    const id = await addCampToDeviceCalendar(camp);
    if (id) {
      Alert.alert('Added to calendar', `${camp.name} has been added to your calendar.`);
    } else {
      Alert.alert('Calendar permission required', 'Please grant calendar access in Settings.');
    }
  };

  return (
    <SafeAreaView style={s.container}>
      <Navbar />
      <View style={s.header}>
        <Text style={s.title}>Camps & Combines</Text>
        <Text style={s.subtitle}>Upcoming college recruiting events</Text>
      </View>
      <FlatList
        data={camps}
        keyExtractor={c => c.id}
        contentContainerStyle={s.list}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={colors.primary} />}
        ListEmptyComponent={<Text style={s.empty}>No upcoming camps found</Text>}
        renderItem={({ item }) => (
          <Card style={s.card}>
            <View style={s.cardHeader}>
              <Text style={s.campName}>{item.name}</Text>
              <Badge variant="outline">{item.sport}</Badge>
            </View>
            <Text style={s.campSchool}>{item.school}</Text>
            <View style={s.metaRow}>
              <Calendar size={12} color={colors.mutedForeground} />
              <Text style={s.metaText}>
                {new Date(item.start_date).toLocaleDateString()}
                {item.end_date && ` – ${new Date(item.end_date).toLocaleDateString()}`}
              </Text>
            </View>
            {(item.city || item.state) && (
              <View style={s.metaRow}>
                <MapPin size={12} color={colors.mutedForeground} />
                <Text style={s.metaText}>{[item.city, item.state].filter(Boolean).join(', ')}</Text>
              </View>
            )}
            <View style={s.actions}>
              <Button variant="outline" size="sm" onPress={() => handleAddToCalendar(item)}>
                Add to Calendar
              </Button>
              {item.registration_url && (
                <Button
                  variant="default"
                  size="sm"
                  onPress={() => Linking.openURL(item.registration_url!)}
                  rightIcon={<ExternalLink size={12} color={colors.primaryForeground} />}
                >
                  Register
                </Button>
              )}
            </View>
          </Card>
        )}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { padding: spacing.md },
  title: { fontFamily: typography.fontFamily.heading, fontSize: typography.fontSize['2xl'], color: colors.foreground, letterSpacing: typography.letterSpacing.heading },
  subtitle: { fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.sm, color: colors.mutedForeground, marginTop: 2 },
  list: { padding: spacing.md, gap: spacing.sm, paddingTop: 0 },
  card: { padding: spacing.md, gap: 4 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm },
  campName: { fontFamily: typography.fontFamily.bodyBold, fontSize: typography.fontSize.base, color: colors.foreground, flex: 1 },
  campSchool: { fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.sm, color: colors.mutedForeground, marginBottom: 4 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.xs, color: colors.mutedForeground },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  empty: { fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.base, color: colors.mutedForeground, textAlign: 'center', padding: spacing.xl },
});
