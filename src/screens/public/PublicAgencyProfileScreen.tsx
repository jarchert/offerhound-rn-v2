// Ported from Lovable web src/pages/PublicAgencyProfile.tsx (157 LOC).
// Web → RN translation:
//   - useParams({ id })                  → useRoute<RouteProp>().params.agencyId
//   - <Link to={`/scouts/${s.id}`}>      → nav.navigate to PublicScoutProfile
//   - tailwind/shadcn                    → @/components/ui/* + StyleSheet
//   - lucide-react                       → lucide-react-native
//   - <a href="mailto:">, tel:, href     → Linking.openURL
//   - NotRegisteredUser                  → inline not-found (scout screen pattern)
//   - SEO / ScrollToTop                  → no-op on native
//
// Tables:
//   Primary : scout_organizations (eq id) — NO is_published filter (matches MAIN)
//   Roster  : scout_profiles (eq organization_id, select id/name/title/profile_image_url/specialization)
//
// Contact gating: NONE — MAIN shows contact_email / contact_phone / website_url
//   unconditionally when present. No show_contact_info field on scout_organizations.
// Avatar field: logo_url (not image_url).
//
// Navigator: PublicProfileStack (same as PublicScoutProfile — share-target stack).
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Linking,
  Pressable,
} from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { Mail, Phone, Globe, Users, Building2 } from 'lucide-react-native';

import { supabase } from '@/integrations/supabase/client';
import { BackButton } from '@/components/BackButton';
import { Footer } from '@/components/Footer';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';

import { colors, typography, spacing } from '@/lib/theme';
import type { PublicProfileStackParamList } from '@/navigation/stacks/PublicProfileStack';

type R = RouteProp<PublicProfileStackParamList, 'PublicAgencyProfile'>;

export default function PublicAgencyProfileScreen() {
  const { params } = useRoute<R>();
  const id = params?.agencyId;
  const nav = useNavigation<any>();

  const { data: agency, isLoading } = useQuery({
    queryKey: ['public-agency-profile', id],
    queryFn: async () => {
      if (!id) return null;
      const { data } = await supabase
        .from('scout_organizations' as any)
        .select('*')
        .eq('id', id)
        .maybeSingle();
      return data as any;
    },
    enabled: !!id,
  });

  const { data: scouts = [] } = useQuery({
    queryKey: ['public-agency-scouts', (agency as any)?.id],
    queryFn: async () => {
      if (!(agency as any)?.id) return [];
      const { data } = await supabase
        .from('scout_profiles' as any)
        .select('id, name, title, profile_image_url, specialization')
        .eq('organization_id', (agency as any).id)
        .order('name');
      return (data ?? []) as any[];
    },
    enabled: !!(agency as any)?.id,
  });

  const openURL = (url: string) => {
    Linking.openURL(url).catch(() => {});
  };

  // Roster card tap → PublicScoutProfile inside same PublicProfileStack
  const handleOpenScout = (scoutId: string) => {
    nav.navigate('PublicScoutProfile' as any, { scoutId });
  };

  if (isLoading) {
    return (
      <View style={s.loading}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!agency) {
    return (
      <View style={s.loading}>
        <Text style={s.muted}>Agency not found.</Text>
      </View>
    );
  }

  const initials = ((agency as any).name || 'A')
    .split(' ')
    .map((w: string) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <View style={s.container}>
      <ScrollView contentContainerStyle={s.content}>
        <BackButton />
        <Card style={s.card}>
          <CardContent style={s.cardContent}>
            {/* ── Header: logo + name / type label ── */}
            <View style={s.headRow}>
              <Avatar
                size={80}
                source={(agency as any).logo_url ? { uri: (agency as any).logo_url } : null}
                fallback={initials}
              />
              <View style={s.headInfo}>
                <Text style={s.name}>{(agency as any).name}</Text>
                <View style={s.typeRow}>
                  <Building2 size={14} color={colors.mutedForeground} />
                  <Text style={s.typeText}>Recruiting Agency</Text>
                </View>
              </View>
            </View>

            {/* ── About / description ── */}
            {!!(agency as any).description && (
              <>
                <Text style={s.sectionTitle}>About</Text>
                <Text style={s.bio}>{(agency as any).description}</Text>
              </>
            )}

            {/* ── Scout roster ── */}
            {scouts.length > 0 && (
              <View style={s.rosterSection}>
                <View style={s.rosterTitleRow}>
                  <Users size={16} color={colors.foreground} />
                  <Text style={s.sectionTitle}>Scouts on Staff</Text>
                </View>
                <View style={s.rosterGrid}>
                  {scouts.map((scout: any) => (
                    <Pressable
                      key={scout.id}
                      onPress={() => handleOpenScout(scout.id)}
                      accessibilityRole="button"
                      testID={`scout-card-${scout.id}`}
                    >
                      <Card style={s.scoutCard}>
                        <CardContent style={s.scoutCardContent}>
                          <Avatar
                            size={40}
                            source={
                              scout.profile_image_url
                                ? { uri: scout.profile_image_url }
                                : null
                            }
                            fallback={(scout.name || '?')[0]}
                          />
                          <View style={s.scoutInfo}>
                            <Text style={s.scoutName} numberOfLines={1}>
                              {scout.name}
                            </Text>
                            <Text style={s.scoutTitle} numberOfLines={1}>
                              {scout.title || 'Scout'}
                            </Text>
                            {!!scout.specialization && (
                              <Badge variant="outline" style={s.specBadge}>
                                {String(scout.specialization)}
                              </Badge>
                            )}
                          </View>
                        </CardContent>
                      </Card>
                    </Pressable>
                  ))}
                </View>
              </View>
            )}

            {/* ── Contact actions: no auth gate (matches MAIN) ── */}
            <View style={s.ctaWrap}>
              {!!(agency as any).contact_email && (
                <Button
                  size="lg"
                  onPress={() => openURL(`mailto:${(agency as any).contact_email}`)}
                  leftIcon={<Mail size={16} color={colors.primaryForeground} />}
                >
                  Email Agency
                </Button>
              )}
              {!!(agency as any).contact_phone && (
                <Button
                  size="sm"
                  variant="outline"
                  onPress={() => openURL(`tel:${(agency as any).contact_phone}`)}
                  leftIcon={<Phone size={14} color={colors.foreground} />}
                >
                  Call
                </Button>
              )}
              {!!(agency as any).website_url && (
                <Button
                  size="sm"
                  variant="ghost"
                  onPress={() => openURL((agency as any).website_url)}
                  leftIcon={<Globe size={14} color={colors.foreground} />}
                >
                  Website
                </Button>
              )}
            </View>
          </CardContent>
        </Card>
      </ScrollView>
      <Footer />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: spacing.xxxl },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  muted: {
    color: colors.mutedForeground,
    fontFamily: typography.fontFamily.body,
    textAlign: 'center',
  },
  card: { marginTop: spacing.lg },
  cardContent: { padding: spacing.lg },

  headRow: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.lg, alignItems: 'center' },
  headInfo: { flex: 1, minWidth: 0 },
  name: {
    fontFamily: typography.fontFamily.heading,
    fontSize: 24,
    color: colors.foreground,
  },
  typeRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  typeText: {
    color: colors.mutedForeground,
    fontSize: 13,
    fontFamily: typography.fontFamily.body,
  },

  sectionTitle: {
    fontFamily: typography.fontFamily.heading,
    fontSize: 18,
    color: colors.foreground,
    marginBottom: spacing.xs,
  },
  bio: {
    color: colors.mutedForeground,
    marginBottom: spacing.lg,
    fontFamily: typography.fontFamily.body,
    lineHeight: 22,
  },

  rosterSection: { marginBottom: spacing.md },
  rosterTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  rosterGrid: { gap: spacing.sm },
  scoutCard: { backgroundColor: `${colors.secondary}4d` },
  scoutCardContent: {
    padding: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  scoutInfo: { flex: 1, minWidth: 0 },
  scoutName: {
    fontFamily: typography.fontFamily.bodySemiBold ?? typography.fontFamily.body,
    fontSize: 13,
    color: colors.foreground,
  },
  scoutTitle: {
    fontSize: 11,
    color: colors.mutedForeground,
    fontFamily: typography.fontFamily.body,
  },
  specBadge: { marginTop: 2, alignSelf: 'flex-start' },

  ctaWrap: {
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
});
