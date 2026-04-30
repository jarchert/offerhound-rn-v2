// ScoutDirectoryScreen — RN port of Lovable web ScoutDirectory page.
// Source: offerhound-repo/src/pages/ScoutDirectory.tsx (129 LOC)
//
// Distinct from CoachDirectoryScreen — this lists verified scouts from
// `scout_profiles`, with role-aware "Send Letter" CTA that branches by
// viewer role (athlete → /letters, scout → initial-interest, coach → scout-
// introduction). Tap a card to open a public scout profile (PORT-PENDING:
// no PublicScoutProfile route yet in RN, so we fall back to the inline
// LetterComposer for now).
//
// Adaptations (web → RN):
//   - <div>/<h1>/<p>           → <View>/<Text>
//   - className utility        → StyleSheet
//   - useNavigate (router)     → useNavigation (react-navigation)
//   - lucide-react             → lucide-react-native
//   - shadcn Input             → @/components/ui/Input
//   - useRouter URLSearchParams → encoded into LetterComposer seed payload
//   - md:grid-cols-2           → single-column on mobile (RN-native pattern)
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Pressable,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { Search } from 'lucide-react-native';
import { supabase } from '@/integrations/supabase/client';
import { BackButton } from '@/components/BackButton';
import { Footer } from '@/components/Footer';
import { Input } from '@/components/ui/Input';
import { CoachMatchCard } from '@/components/coach/CoachMatchCard';
import { usePlayerProfile } from '@/hooks/usePlayerProfile';
import { useCoachProfile } from '@/hooks/useCoachProfile';
import { useScoutProfile } from '@/hooks/useScoutProfile';
import { useHSCoachProfile } from '@/hooks/useHSCoachProfile';
import { partitionByFullName } from '@/lib/utils/nameSorting';
import { colors, typography, spacing, radius } from '@/lib/theme';
import type { RootStackParamList } from '@/navigation/RootNavigator';

import { Navbar } from '@/components/Navbar';
export default function ScoutDirectoryScreen() {
  const nav = useNavigation<NavigationProp<RootStackParamList>>();
  const [search, setSearch] = useState('');

  const { profile: athleteProfile } = usePlayerProfile() as any;
  const { data: coachProfile } = useCoachProfile();
  const { data: scoutProfile } = useScoutProfile();
  const { data: hsCoachProfile } = useHSCoachProfile();

  const isAthlete = !!athleteProfile?.id;
  const isClubCoach = !!(coachProfile as any)?.is_club_coach;
  const isHSCoach = !!hsCoachProfile;
  const isCollegeCoach = !!coachProfile && !isClubCoach;
  const isScout = !!scoutProfile;

  const { data: scouts = [], isLoading } = useQuery({
    queryKey: ['scout-directory', search],
    queryFn: async () => {
      let q = supabase
        .from('scout_profiles' as any)
        .select('*')
        .eq('is_verified', true)
        .order('name');
      if (search) q = q.ilike('name', `%${search}%`);
      const { data } = await q.limit(50);
      // Push scouts without a populated first+last name to the bottom.
      return partitionByFullName((data as any) || [], (s: any) => s.name);
    },
  });

  const handleSendLetter = (scout: any) => {
    if (isAthlete) {
      nav.navigate('LetterComposer', {
        seed: {
          coach: {
            name: scout.name || '',
            school: scout.company || scout.title || 'Scout',
            email: scout.email || '',
          },
        },
      });
      return;
    }
    nav.navigate('LetterComposer', {
      seed: {
        recipientCategory: 'scout',
        recipientType: 'coach',
        recipientName: scout.name || '',
        recipientEmail: scout.email || '',
        organizationName: scout.company || scout.title || '',
        recipientTitle: scout.title || '',
        letterType: isScout ? 'initial-interest' : 'scout-introduction',
      },
    });
  };

  // PORT-PENDING: no PublicScoutProfile route in RN yet.
  // Tapping a card currently opens the LetterComposer instead.
  const handleOpenProfile = (scout: any) => {
    handleSendLetter(scout);
  };

  const viewerRole: 'athlete' | 'coach' | 'club-coach' | 'hs-coach' | 'scout' =
    isHSCoach
      ? 'hs-coach'
      : isClubCoach
      ? 'club-coach'
      : isCollegeCoach
      ? 'coach'
      : isScout
      ? 'scout'
      : 'athlete';

  return (
    <SafeAreaView style={s.root}>
      <Navbar />
      <ScrollView contentContainerStyle={s.content}>
        <BackButton />

        <Text style={s.title}>Scout Directory</Text>
        <Text style={s.subtitle}>
          Browse verified scouts and recruiting professionals. Tap a card to
          send an AI-powered letter.
        </Text>

        <View style={s.searchBox}>
          <Search size={16} color={colors.mutedForeground} />
          <Input
            placeholder="Search scouts by name..."
            value={search}
            onChangeText={setSearch}
            containerStyle={{ flex: 1 }}
            style={s.searchInput}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        {isLoading ? (
          <Text style={s.statusText}>Loading scouts...</Text>
        ) : scouts.length === 0 ? (
          <Text style={s.statusText}>No scouts found.</Text>
        ) : (
          <View style={s.list}>
            {scouts.map((scout: any) => (
              <Pressable
                key={scout.id}
                onPress={() => handleOpenProfile(scout)}
                accessibilityRole="button"
                style={({ pressed }) => [
                  s.cardWrap,
                  pressed && { opacity: 0.85 },
                ]}
              >
                <CoachMatchCard
                  variant="compact"
                  coach={{
                    id: scout.id,
                    name: scout.name,
                    title: scout.title || 'Scout',
                    school:
                      scout.company || scout.specialization || 'Multi-sport',
                    email: scout.email,
                    image_url: scout.profile_image_url,
                  }}
                  proximityLabel={scout.is_verified ? 'Verified' : null}
                  viewerRole={viewerRole}
                  onContact={() => handleSendLetter(scout)}
                />
              </Pressable>
            ))}
          </View>
        )}

        <Footer />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: {
    padding: spacing.md,
    paddingBottom: spacing.xxxl,
    gap: spacing.sm,
  },
  title: {
    fontFamily: typography.fontFamily.heading,
    fontSize: typography.fontSize['3xl'],
    color: colors.foreground,
    letterSpacing: typography.letterSpacing.heading,
    marginTop: spacing.sm,
  },
  subtitle: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.sm,
    color: colors.mutedForeground,
    marginBottom: spacing.sm,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.card,
    marginBottom: spacing.sm,
  },
  searchInput: {
    borderWidth: 0,
    paddingVertical: spacing.sm,
    backgroundColor: 'transparent',
  },
  statusText: {
    textAlign: 'center',
    paddingVertical: spacing.xl,
    color: colors.mutedForeground,
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.sm,
  },
  list: { gap: spacing.sm },
  cardWrap: {},
});
