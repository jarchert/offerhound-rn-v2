// PublicAgencyProfile — read-only profile for scout organizations / agencies.
// New for Build 50 (parity/2026-04-29) — universal user-card → profile flow.
//
// Data: scout_organizations where id=:id. Staff scouts via scout_profiles
// where organization_id=:id. Each scout card taps → PublicScoutProfile.
import React from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Linking, Pressable } from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { Globe, Mail, Phone, Users } from 'lucide-react-native';

import { supabase } from '@/integrations/supabase/client';
import { BackButton } from '@/components/BackButton';
import { Footer } from '@/components/Footer';
import { Card, CardContent } from '@/components/ui/Card';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { NotRegisteredUser } from '@/components/NotRegisteredUser';

import { colors, typography, spacing, radius } from '@/lib/theme';
import { navigateToProfile } from '@/lib/openUserProfile';
import type { PublicProfileStackParamList } from '@/navigation/stacks/PublicProfileStack';

type R = RouteProp<PublicProfileStackParamList, 'PublicAgencyProfile'>;

export default function PublicAgencyProfileScreen() {
  const { params } = useRoute<R>();
  const id = params?.id;
  const nav = useNavigation<any>();

  const { data: org, isLoading } = useQuery({
    queryKey: ['public-agency', id],
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

  const { data: scouts } = useQuery({
    queryKey: ['public-agency-scouts', id],
    queryFn: async () => {
      if (!id) return [];
      const { data } = await supabase
        .from('scout_profiles' as any)
        .select('id,name,title,profile_image_url,specialization,sports')
        .eq('organization_id', id);
      return (data as any[]) || [];
    },
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <View style={s.loading}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }
  if (!org) {
    return <NotRegisteredUser />;
  }

  return (
    <View style={s.container}>
      <ScrollView contentContainerStyle={s.content}>
        <BackButton />
        <Card style={s.card}>
          <CardContent style={s.cardContent}>
            <View style={s.headRow}>
              <Avatar
                size={84}
                source={org.logo_url ? { uri: org.logo_url } : null}
                fallback={org.name || '?'}
              />
              <View style={s.headInfo}>
                <Text style={s.name}>{org.name}</Text>
                <Badge variant="secondary">Agency</Badge>
              </View>
            </View>

            {!!org.description && <Text style={s.bio}>{org.description}</Text>}

            <View style={s.linksRow}>
              {!!org.website_url && (
                <Pressable style={s.linkBtn} onPress={() => Linking.openURL(org.website_url)}>
                  <Globe size={14} color={colors.foreground} />
                  <Text style={s.linkBtnText}>Website</Text>
                </Pressable>
              )}
              {!!org.contact_email && (
                <Pressable style={[s.linkBtn, s.linkBtnPrimary]} onPress={() => Linking.openURL(`mailto:${org.contact_email}`)}>
                  <Mail size={14} color={colors.primaryForeground} />
                  <Text style={[s.linkBtnText, s.linkBtnTextPrimary]}>Email</Text>
                </Pressable>
              )}
              {!!org.contact_phone && (
                <Pressable style={[s.linkBtn, s.linkBtnPrimary]} onPress={() => Linking.openURL(`tel:${org.contact_phone}`)}>
                  <Phone size={14} color={colors.primaryForeground} />
                  <Text style={[s.linkBtnText, s.linkBtnTextPrimary]}>Call</Text>
                </Pressable>
              )}
            </View>

            {scouts && scouts.length > 0 && (
              <View style={s.section}>
                <View style={s.sectionHead}>
                  <Users size={14} color={colors.primary} />
                  <Text style={s.sectionTitle}>Staff Scouts</Text>
                </View>
                <View style={s.scoutGrid}>
                  {scouts.map((sc) => (
                    <Pressable
                      key={sc.id}
                      style={s.scoutCard}
                      onPress={() => navigateToProfile(nav, { kind: 'scout', id: sc.id })}>
                      <Avatar
                        size={48}
                        source={sc.profile_image_url ? { uri: sc.profile_image_url } : null}
                        fallback={sc.name || '?'}
                      />
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={s.scoutName} numberOfLines={1}>{sc.name}</Text>
                        {!!sc.title && <Text style={s.scoutMeta} numberOfLines={1}>{sc.title}</Text>}
                        {!!sc.specialization && <Text style={s.scoutMeta} numberOfLines={1}>{sc.specialization}</Text>}
                      </View>
                    </Pressable>
                  ))}
                </View>
              </View>
            )}
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
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  card: { marginTop: spacing.lg },
  cardContent: { padding: spacing.lg },
  headRow: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.lg, alignItems: 'center' },
  headInfo: { flex: 1, minWidth: 0, gap: spacing.xs },
  name: { fontFamily: typography.fontFamily.heading, fontSize: 26, color: colors.foreground, letterSpacing: 0.5 },
  bio: { color: colors.foreground, marginTop: spacing.sm, fontFamily: typography.fontFamily.body, lineHeight: 20 },
  linksRow: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap', marginTop: spacing.md },
  linkBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radius?.md ?? 8 },
  linkBtnPrimary: { backgroundColor: colors.primary, borderColor: colors.primary },
  linkBtnText: { color: colors.foreground, fontFamily: typography.fontFamily.body, fontSize: 13 },
  linkBtnTextPrimary: { color: colors.primaryForeground, fontFamily: typography.fontFamily.bodySemiBold },
  section: { marginTop: spacing.lg, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.border, gap: spacing.sm },
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sectionTitle: { color: colors.foreground, fontFamily: typography.fontFamily.bodySemiBold, fontSize: 15 },
  scoutGrid: { gap: spacing.sm },
  scoutCard: { flexDirection: 'row', gap: spacing.md, alignItems: 'center', padding: spacing.sm, borderWidth: 1, borderColor: colors.border, borderRadius: radius?.md ?? 8 },
  scoutName: { color: colors.foreground, fontFamily: typography.fontFamily.bodySemiBold, fontSize: 14 },
  scoutMeta: { color: colors.mutedForeground, fontFamily: typography.fontFamily.body, fontSize: 12 },
});
