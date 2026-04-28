import React from 'react';
import { View, Text, ScrollView, StyleSheet, SafeAreaView, Image, Pressable, Alert } from 'react-native';
import { useNavigation, NavigationProp, CommonActions } from '@react-navigation/native';
import { Edit, Globe, Lock } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { usePlayerProfile } from '@/hooks/usePlayerProfile';
import { Navbar } from '@/components/Navbar';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { colors, typography, spacing } from '@/lib/theme';
import type { RootStackParamList } from '@/navigation/RootNavigator';

export default function ProfileScreen() {
  const nav = useNavigation<NavigationProp<RootStackParamList>>();
  const { user, userRole, signOut } = useAuth();
  const { profile, publishProfile, updateProfile } = usePlayerProfile();

  const handlePublishToggle = async () => {
    try {
      if (profile?.is_published) {
        await updateProfile({ is_published: false });
      } else {
        await publishProfile();
      }
    } catch (e: any) {
      if (e?.code === 'SUBSCRIPTION_REQUIRED') {
        Alert.alert('Subscription required', 'Publish your profile with a Recruit Pro subscription.');
      } else {
        Alert.alert('Error', e?.message ?? 'Failed to update profile');
      }
    }
  };

  return (
    <SafeAreaView style={s.container}>
      <Navbar />
      <ScrollView contentContainerStyle={s.content}>
        <View style={s.card}>
          <View style={s.avatarRow}>
            <Avatar source={profile?.profile_image_url ? { uri: profile.profile_image_url } : null} fallback={profile?.full_name || user?.email || '?'} size={80} />
            <View style={s.avatarInfo}>
              <Text style={s.name}>{profile?.full_name || 'Unnamed athlete'}</Text>
              {profile?.position && <Text style={s.position}>{profile.position}</Text>}
              <View style={s.badgeRow}>
                {userRole && <Badge variant="secondary">{userRole}</Badge>}
                {profile?.is_published ? (
                  <Badge variant="success">Published</Badge>
                ) : (
                  <Badge variant="outline">Draft</Badge>
                )}
              </View>
            </View>
          </View>

          <View style={s.stats}>
            {profile?.height && <Stat label="Height" value={profile.height} />}
            {profile?.weight && <Stat label="Weight" value={profile.weight} />}
            {profile?.graduation_year && <Stat label="Class of" value={profile.graduation_year} />}
            {profile?.gpa && <Stat label="GPA" value={profile.gpa} />}
          </View>
        </View>

        <View style={s.actions}>
          <Button
            variant="default"
            onPress={handlePublishToggle}
            leftIcon={profile?.is_published ? <Lock size={16} color={colors.primaryForeground} /> : <Globe size={16} color={colors.primaryForeground} />}
          >
            {profile?.is_published ? 'Unpublish' : 'Publish Profile'}
          </Button>

          <Button
            variant="outline"
            onPress={() => nav.navigate('SettingsStack' as any)}
            leftIcon={<Edit size={16} color={colors.foreground} />}
          >
            Edit Profile
          </Button>
        </View>

        <Pressable style={s.signOut} onPress={async () => {
          try {
            await signOut();
          } catch (e: any) {
            Alert.alert('Sign out failed', e?.message ?? 'Please try again.');
          }
        }}>
          <Text style={s.signOutText}>Sign out</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={s.stat}>
      <Text style={s.statLabel}>{label}</Text>
      <Text style={s.statValue}>{value}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, gap: spacing.md, paddingBottom: spacing.xxl },
  card: { padding: spacing.md, backgroundColor: colors.card, borderRadius: 12, borderWidth: 1, borderColor: colors.border, gap: spacing.md },
  avatarRow: { flexDirection: 'row', gap: spacing.md, alignItems: 'center' },
  avatarInfo: { flex: 1, gap: 4 },
  name: { fontFamily: typography.fontFamily.heading, fontSize: typography.fontSize.xl, color: colors.foreground, letterSpacing: typography.letterSpacing.heading },
  position: { fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.sm, color: colors.mutedForeground },
  badgeRow: { flexDirection: 'row', gap: 4, flexWrap: 'wrap', marginTop: 4 },
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  stat: { flexGrow: 1 },
  statLabel: { fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.xs, color: colors.mutedForeground, textTransform: 'uppercase', letterSpacing: 0.5 },
  statValue: { fontFamily: typography.fontFamily.bodyBold, fontSize: typography.fontSize.base, color: colors.foreground, marginTop: 2 },
  actions: { gap: spacing.sm },
  signOut: { alignItems: 'center', padding: spacing.md, marginTop: spacing.md },
  signOutText: { fontFamily: typography.fontFamily.bodySemiBold, color: colors.destructive, fontSize: typography.fontSize.base },
});
