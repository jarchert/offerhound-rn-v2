import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Avatar } from '@/components/ui/Avatar';
import { colors, spacing, typography } from '@/lib/theme';

/** Displays only supplied profile information; never invents a user's biography or metrics. */
export function UserProfileHeader({ profile, label }: { profile: any; label?: string }) {
  if (!profile) return null;
  const name = profile.full_name || profile.name || 'Your profile';
  const image = profile.profile_image_url || profile.image_url || profile.avatar_url;
  const details = [profile.title, profile.position, profile.school || profile.organization,
    profile.sport, [profile.city, profile.state].filter(Boolean).join(', ')].filter(Boolean);
  return <View style={s.card}>
    <Avatar size={112} source={image ? { uri: image } : undefined} fallback={name} />
    <Text style={s.name}>{name}</Text>
    {label ? <Text style={s.detail}>{label}</Text> : null}
    {details.length ? <Text style={s.detail}>{details.join(' · ')}</Text> : null}
    {profile.bio || profile.biography ? <Text style={s.bio}>{profile.bio || profile.biography}</Text> : null}
  </View>;
}
const s = StyleSheet.create({
  card: { padding: spacing.lg, gap: spacing.sm, alignItems: 'center', backgroundColor: colors.card, borderRadius: 16, marginBottom: spacing.md },
  name: { fontFamily: typography.fontFamily.heading, color: colors.foreground, fontSize: 28, textAlign: 'center' },
  detail: { color: colors.mutedForeground, textAlign: 'center' },
  bio: { color: colors.foreground, lineHeight: 22, alignSelf: 'stretch' },
});
