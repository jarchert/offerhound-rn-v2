import React from 'react';
import { View, Text, FlatList, StyleSheet, SafeAreaView, RefreshControl } from 'react-native';
import { useUnifiedLetterHistory } from '@/hooks/useUnifiedLetterHistory';
import { useAuth } from '@/contexts/AuthContext';
import { Navbar } from '@/components/Navbar';
import { BackButton } from '@/components/BackButton';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { colors, typography, spacing } from '@/lib/theme';

export default function LettersScreen() {
  const { data: letters = [], isLoading, refetch } = useUnifiedLetterHistory();

  return (
    <SafeAreaView style={s.container}>
      <Navbar />
      <View style={s.header}>
        <BackButton />
        <View style={s.headerText}>
          <Text style={s.title}>Letters</Text>
          <Text style={s.subtitle}>{letters.length} letters</Text>
        </View>
      </View>
      <FlatList
        data={letters as any[]}
        keyExtractor={l => l.id}
        contentContainerStyle={s.list}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={colors.primary} />}
        ListEmptyComponent={<Text style={s.empty}>No letters yet. Compose your first one from the coach directory.</Text>}
        renderItem={({ item }) => (
          <Card style={s.card}>
            <View style={s.cardHeader}>
              <Text style={s.coachName}>{item.coach_name ?? 'Unknown recipient'}</Text>
              {item.letter_type && <Badge variant="outline">{item.letter_type}</Badge>}
            </View>
            {item.school_name && <Text style={s.school}>{item.school_name}</Text>}
            {item.subject && <Text style={s.subject} numberOfLines={1}>{item.subject}</Text>}
            <Text style={s.date}>{new Date(item.sent_at || item.created_at).toLocaleDateString()}</Text>
          </Card>
        )}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md },
  headerText: { flex: 1 },
  title: { fontFamily: typography.fontFamily.heading, fontSize: typography.fontSize['2xl'], color: colors.foreground, letterSpacing: typography.letterSpacing.heading },
  subtitle: { fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.sm, color: colors.mutedForeground },
  list: { padding: spacing.md, gap: spacing.sm, paddingTop: 0 },
  card: { padding: spacing.md, gap: 4 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  coachName: { fontFamily: typography.fontFamily.bodyBold, fontSize: typography.fontSize.base, color: colors.foreground, flex: 1 },
  school: { fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.sm, color: colors.mutedForeground },
  subject: { fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.sm, color: colors.foreground, fontStyle: 'italic' },
  date: { fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.xs, color: colors.mutedForeground, marginTop: spacing.xs },
  empty: { fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.base, color: colors.mutedForeground, textAlign: 'center', padding: spacing.xl },
});
