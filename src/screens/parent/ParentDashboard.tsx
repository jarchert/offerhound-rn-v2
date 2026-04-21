import React from 'react';
import { View, Text, ScrollView, StyleSheet, SafeAreaView } from 'react-native';
import { useAthleteProfile } from '@/contexts/AthleteProfileContext';
import { useAuth } from '@/contexts/AuthContext';
import { Navbar } from '@/components/Navbar';
import { Card } from '@/components/ui/Card';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { colors, typography, spacing } from '@/lib/theme';
import type { RootStackParamList } from '@/navigation/RootNavigator';

export default function ParentDashboard() {
  const nav = useNavigation<NavigationProp<RootStackParamList>>();
  const { user } = useAuth();
  const { profile, linkedAthletes, selectedAthleteId, selectAthlete } = useAthleteProfile();

  return (
    <SafeAreaView style={s.container}>
      <Navbar />
      <ScrollView contentContainerStyle={s.content}>
        <View style={s.header}>
          <Text style={s.title}>Parent Dashboard</Text>
          <Text style={s.subtitle}>{linkedAthletes.length} linked athlete{linkedAthletes.length === 1 ? '' : 's'}</Text>
        </View>

        {linkedAthletes.length === 0 ? (
          <Card style={s.empty}>
            <Text style={s.emptyTitle}>Link an athlete</Text>
            <Text style={s.emptyText}>Send an invite to your child to manage their recruiting profile together.</Text>
            <Button variant="default" onPress={() => {/* invite flow */}}>Invite athlete</Button>
          </Card>
        ) : (
          linkedAthletes.map(a => (
            <Card key={a.id} style={s.athleteCard}>
              <View style={s.athleteRow}>
                <Avatar source={a.profile_image_url ? { uri: a.profile_image_url } : null} fallback={a.full_name} size={56} />
                <View style={s.athleteInfo}>
                  <Text style={s.athleteName}>{String(a.full_name ?? '')}</Text>
                  {a.position && <Text style={s.athleteMeta}>{String(a.position)}</Text>}
                  {a.school && <Text style={s.athleteMeta}>{String(a.school)}</Text>}
                </View>
              </View>
              <Button
                variant={selectedAthleteId === a.id ? 'default' : 'outline'}
                size="sm"
                onPress={() => selectAthlete(a.id)}
              >
                {selectedAthleteId === a.id ? 'Viewing' : 'View profile'}
              </Button>
            </Card>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, gap: spacing.md, paddingBottom: spacing.xxl },
  header: { marginBottom: spacing.xs },
  title: { fontFamily: typography.fontFamily.heading, fontSize: typography.fontSize['2xl'], color: colors.foreground, letterSpacing: typography.letterSpacing.heading },
  subtitle: { fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.sm, color: colors.mutedForeground, marginTop: 2 },
  athleteCard: { padding: spacing.md, gap: spacing.sm },
  athleteRow: { flexDirection: 'row', gap: spacing.md, alignItems: 'center' },
  athleteInfo: { flex: 1, gap: 2 },
  athleteName: { fontFamily: typography.fontFamily.bodyBold, fontSize: typography.fontSize.lg, color: colors.foreground },
  athleteMeta: { fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.sm, color: colors.mutedForeground },
  empty: { padding: spacing.lg, alignItems: 'center', gap: spacing.sm },
  emptyTitle: { fontFamily: typography.fontFamily.heading, fontSize: typography.fontSize.lg, color: colors.foreground, letterSpacing: typography.letterSpacing.heading },
  emptyText: { fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.sm, color: colors.mutedForeground, textAlign: 'center' },
});
