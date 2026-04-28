import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  FlatList,
  Pressable,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import Toast from 'react-native-toast-message';
import {
  LayoutDashboard,
  Users,
  Target,
  Tent,
  User as UserIcon,
  MessageSquare,
  Send,
  Trash2,
  Edit,
  Save,
  BookUser,
  Calendar,
  ExternalLink,
} from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useCoachProfile } from '@/hooks/useCoachProfile';
import { useUpdateCoachProfile } from '@/hooks/useUpdateCoachProfile';
import {
  useSavedAthletes,
  useRemoveSavedAthlete,
} from '@/hooks/useSavedAthletes';
import { useCoachActivityStats } from '@/hooks/useCoachActivity';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { colors, typography, spacing } from '@/lib/theme';
import type { RootStackParamList } from '@/navigation/RootNavigator';

type InnerTab = 'overview' | 'athletes' | 'pipeline' | 'camps' | 'profile';

const TABS: { key: InnerTab; label: string; icon: any }[] = [
  { key: 'overview', label: 'Overview', icon: LayoutDashboard },
  { key: 'athletes', label: 'Athletes', icon: BookUser },
  { key: 'pipeline', label: 'Pipeline', icon: Target },
  { key: 'camps', label: 'Camps', icon: Tent },
  { key: 'profile', label: 'Profile', icon: UserIcon },
];

export default function CoachDashboard() {
  const nav = useNavigation<NavigationProp<RootStackParamList>>();
  const { user } = useAuth();
  const { data: profile, isLoading: profileLoading, refetch: refetchProfile } = useCoachProfile();
  const { data: savedAthletes = [], isLoading: athletesLoading, refetch: refetchAthletes } =
    useSavedAthletes() as any;
  const { data: stats } = useCoachActivityStats();
  const removeSavedAthlete = useRemoveSavedAthlete();
  const updateProfile = useUpdateCoachProfile();

  const [activeTab, setActiveTab] = useState<InnerTab>('overview');
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [quickStartDismissed, setQuickStartDismissed] = useState(false);

  const [editForm, setEditForm] = useState({
    name: '',
    school: '',
    conference: '',
    division: '',
    sport: '',
    position_coached: '',
    title: '',
    email: '',
    phone: '',
    bio: '',
  });

  useEffect(() => {
    if (profile) {
      setEditForm({
        name: (profile as any).name || '',
        school: (profile as any).school || '',
        conference: (profile as any).conference || '',
        division: (profile as any).division || '',
        sport: (profile as any).sport || '',
        position_coached: (profile as any).position_coached || '',
        title: (profile as any).title || '',
        email: (profile as any).email || '',
        phone: (profile as any).phone || '',
        bio: (profile as any).bio || '',
      });
    }
  }, [profile]);

  const upcomingCamps = 0;
  const contactsThisWeek = (stats as any)?.athletesContacted || 0;

  const handleSave = async () => {
    try {
      await updateProfile.mutateAsync(editForm);
      setIsEditingProfile(false);
      Toast.show({ type: 'success', text1: 'Profile updated' });
    } catch (e: any) {
      Toast.show({ type: 'error', text1: 'Update failed', text2: e?.message });
    }
  };

  const handleRemove = async (id: string) => {
    try {
      await removeSavedAthlete.mutateAsync(id);
      Toast.show({ type: 'success', text1: 'Athlete removed' });
    } catch (e: any) {
      Toast.show({ type: 'error', text1: 'Failed to remove', text2: e?.message });
    }
  };

  const goPipeline = () => {
    (nav as any).navigate('CoachTabs', { screen: 'PipelineTab' });
  };
  const goCamps = () => {
    (nav as any).navigate('CoachTabs', { screen: 'CampsTab' });
  };
  const goMessages = (athleteName?: string) => {
    (nav as any).navigate('Messages', athleteName ? { recipientName: athleteName } : undefined);
  };
  const goLetter = (athlete: any) => {
    (nav as any).navigate('LetterComposer', { seed: { athlete } });
  };

  if (profileLoading) {
    return (
      <SafeAreaView style={[s.container, s.center]}>
        <ActivityIndicator color={colors.primary} />
      </SafeAreaView>
    );
  }

  if (!profile) {
    return (
      <SafeAreaView style={[s.container, s.center]}>
        <Text style={s.muted}>No coach profile found.</Text>
      </SafeAreaView>
    );
  }

  const initials = ((profile as any).name || 'C').slice(0, 2);

  return (
    <SafeAreaView style={s.container}>
      <ScrollView
        contentContainerStyle={s.content}
        refreshControl={
          <RefreshControl
            refreshing={profileLoading || athletesLoading}
            onRefresh={() => {
              refetchProfile();
              refetchAthletes();
            }}
            tintColor={colors.primary}
          />
        }
      >
        {/* Profile Header */}
        <Card>
          <CardContent style={{ paddingTop: spacing.md }}>
            <View style={s.headerRow}>
              <Avatar
                size={64}
                source={(profile as any).image_url ? { uri: (profile as any).image_url } : undefined}
                fallback={initials}
              />
              <View style={{ flex: 1 }}>
                <Text style={s.name}>{(profile as any).name}</Text>
                {(profile as any).title ? (
                  <Text style={s.titleText}>{(profile as any).title}</Text>
                ) : null}
                <Text style={s.muted}>{(profile as any).school}</Text>
              </View>
              <Button
                size="sm"
                variant="outline"
                onPress={() => {
                  setActiveTab('profile');
                  setIsEditingProfile(true);
                }}
                leftIcon={<Edit size={14} color={colors.foreground} />}
              >
                Edit Profile
              </Button>
            </View>
            <View style={s.badgeRow}>
              {(profile as any).division ? <Badge variant="secondary">{(profile as any).division}</Badge> : null}
              {(profile as any).conference ? <Badge variant="outline">{(profile as any).conference}</Badge> : null}
              {(profile as any).position_coached ? (
                <Badge variant="outline">{(profile as any).position_coached}</Badge>
              ) : null}
            </View>
          </CardContent>
        </Card>

        {/* Inner Tab Strip */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.tabStrip}
        >
          {TABS.map(t => {
            const Icon = t.icon;
            const active = activeTab === t.key;
            return (
              <Pressable
                key={t.key}
                onPress={() => setActiveTab(t.key)}
                style={[s.tab, active && s.tabActive]}
              >
                <Icon
                  size={16}
                  color={active ? colors.primaryForeground : colors.foreground}
                />
                <Text style={[s.tabText, active && s.tabTextActive]}>{t.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {activeTab === 'overview' && (
          <View style={{ gap: spacing.md }}>
            <View style={s.statsRow}>
              <StatTile label="Saved Athletes" value={savedAthletes.length} icon={BookUser} />
              <StatTile label="Contacts/Week" value={contactsThisWeek} icon={MessageSquare} />
            </View>
            <View style={s.statsRow}>
              <StatTile label="Upcoming Camps" value={upcomingCamps} icon={Calendar} />
              <StatTile label="Profile Views" value={(stats as any)?.profileViews || 0} icon={UserIcon} />
            </View>
            {!quickStartDismissed && (
              <Card>
                <CardHeader>
                  <CardTitle>Quick Start Guide</CardTitle>
                  <CardDescription>Set up your recruiting workflow in 3 steps.</CardDescription>
                </CardHeader>
                <CardContent style={{ gap: spacing.sm, paddingBottom: spacing.md }}>
                  <Text style={s.guideStep}>1. Complete your profile</Text>
                  <Text style={s.guideStep}>2. Search for athletes that match your needs</Text>
                  <Text style={s.guideStep}>3. Save athletes to your recruiting board</Text>
                  <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm }}>
                    <Button size="sm" onPress={() => setActiveTab('profile')}>
                      Edit Profile
                    </Button>
                    <Button size="sm" variant="ghost" onPress={() => setQuickStartDismissed(true)}>
                      Dismiss
                    </Button>
                  </View>
                </CardContent>
              </Card>
            )}
          </View>
        )}

        {activeTab === 'athletes' && (
          <Card>
            <CardHeader>
              <CardTitle>Saved Athletes</CardTitle>
              <CardDescription>Your recruiting board</CardDescription>
            </CardHeader>
            <CardContent style={{ paddingBottom: spacing.md }}>
              {athletesLoading ? (
                <ActivityIndicator color={colors.primary} />
              ) : savedAthletes.length === 0 ? (
                <Text style={s.muted}>No saved athletes yet.</Text>
              ) : (
                <FlatList
                  data={savedAthletes}
                  scrollEnabled={false}
                  keyExtractor={(item: any) => item.id}
                  ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
                  renderItem={({ item }: any) => {
                    const a = item.athlete || {};
                    return (
                      <View style={s.athleteRow}>
                        <Avatar
                          size={48}
                          source={a.profile_image_url ? { uri: a.profile_image_url } : undefined}
                          fallback={(a.full_name || 'A').slice(0, 2)}
                        />
                        <View style={{ flex: 1 }}>
                          <Text style={s.athleteName}>{a.full_name || 'Athlete'}</Text>
                          <Text style={s.muted}>
                            {[a.position, a.school].filter(Boolean).join(' • ')}
                          </Text>
                          <View style={s.actionsRow}>
                            <Button
                              size="sm"
                              variant="outline"
                              onPress={() => goMessages(a.full_name)}
                              leftIcon={<MessageSquare size={12} color={colors.foreground} />}
                            >
                              Message
                            </Button>
                            <Button
                              size="sm"
                              onPress={() => goLetter(a)}
                              leftIcon={<Send size={12} color={colors.primaryForeground} />}
                            >
                              Letter
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onPress={() => handleRemove(item.id)}
                              leftIcon={<Trash2 size={12} color={colors.destructive} />}
                              textStyle={{ color: colors.destructive }}
                            >
                              Remove
                            </Button>
                          </View>
                        </View>
                      </View>
                    );
                  }}
                />
              )}
            </CardContent>
          </Card>
        )}

        {activeTab === 'pipeline' && (
          <Card>
            <CardHeader>
              <CardTitle>Recruiting Pipeline</CardTitle>
              <CardDescription>Track prospects through your recruiting funnel</CardDescription>
            </CardHeader>
            <CardContent style={{ paddingBottom: spacing.md }}>
              <Button
                onPress={goPipeline}
                leftIcon={<ExternalLink size={14} color={colors.primaryForeground} />}
              >
                View Recruiting Pipeline
              </Button>
            </CardContent>
          </Card>
        )}

        {activeTab === 'camps' && (
          <Card>
            <CardHeader>
              <CardTitle>Camps</CardTitle>
              <CardDescription>Manage your camps and discover events</CardDescription>
            </CardHeader>
            <CardContent style={{ paddingBottom: spacing.md }}>
              <Button
                onPress={goCamps}
                leftIcon={<Tent size={14} color={colors.primaryForeground} />}
              >
                Camp Manager
              </Button>
            </CardContent>
          </Card>
        )}

        {activeTab === 'profile' && (
          <Card>
            <CardHeader>
              <CardTitle>My Profile</CardTitle>
              <CardDescription>Update your coach information</CardDescription>
            </CardHeader>
            <CardContent style={{ gap: spacing.sm, paddingBottom: spacing.md }}>
              {isEditingProfile ? (
                <>
                  <Input
                    label="Full Name"
                    value={editForm.name}
                    onChangeText={t => setEditForm(f => ({ ...f, name: t }))}
                  />
                  <Input
                    label="Title"
                    value={editForm.title}
                    onChangeText={t => setEditForm(f => ({ ...f, title: t }))}
                  />
                  <Input
                    label="School"
                    value={editForm.school}
                    onChangeText={t => setEditForm(f => ({ ...f, school: t }))}
                  />
                  <Input
                    label="Conference"
                    value={editForm.conference}
                    onChangeText={t => setEditForm(f => ({ ...f, conference: t }))}
                  />
                  <Input
                    label="Division"
                    value={editForm.division}
                    onChangeText={t => setEditForm(f => ({ ...f, division: t }))}
                  />
                  <Input
                    label="Sport"
                    value={editForm.sport}
                    onChangeText={t => setEditForm(f => ({ ...f, sport: t }))}
                    autoCapitalize="none"
                  />
                  <Input
                    label="Position Coached"
                    value={editForm.position_coached}
                    onChangeText={t => setEditForm(f => ({ ...f, position_coached: t }))}
                  />
                  <Input
                    label="Email"
                    value={editForm.email}
                    onChangeText={t => setEditForm(f => ({ ...f, email: t }))}
                    autoCapitalize="none"
                    keyboardType="email-address"
                  />
                  <Input
                    label="Phone"
                    value={editForm.phone}
                    onChangeText={t => setEditForm(f => ({ ...f, phone: t }))}
                    keyboardType="phone-pad"
                  />
                  <Input
                    label="Bio"
                    value={editForm.bio}
                    onChangeText={t => setEditForm(f => ({ ...f, bio: t }))}
                    multiline
                    numberOfLines={4}
                    style={{ minHeight: 96, textAlignVertical: 'top' }}
                  />
                  <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm }}>
                    <Button
                      onPress={handleSave}
                      loading={updateProfile.isPending}
                      leftIcon={<Save size={14} color={colors.primaryForeground} />}
                    >
                      Save Changes
                    </Button>
                    <Button variant="outline" onPress={() => setIsEditingProfile(false)}>
                      Cancel
                    </Button>
                  </View>
                </>
              ) : (
                <>
                  <ProfileField label="Name" value={(profile as any).name} />
                  <ProfileField label="Title" value={(profile as any).title} />
                  <ProfileField label="School" value={(profile as any).school} />
                  <ProfileField label="Conference" value={(profile as any).conference} />
                  <ProfileField label="Division" value={(profile as any).division} />
                  <ProfileField label="Sport" value={(profile as any).sport} />
                  <ProfileField label="Position Coached" value={(profile as any).position_coached} />
                  <ProfileField label="Email" value={(profile as any).email} />
                  <ProfileField label="Phone" value={(profile as any).phone} />
                  {(profile as any).bio ? <ProfileField label="Bio" value={(profile as any).bio} /> : null}
                  <Button
                    onPress={() => setIsEditingProfile(true)}
                    leftIcon={<Edit size={14} color={colors.primaryForeground} />}
                    style={{ marginTop: spacing.sm }}
                  >
                    Edit Profile
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function StatTile({ label, value, icon: Icon }: { label: string; value: number | string; icon: any }) {
  return (
    <View style={s.statTile}>
      <View style={s.statIcon}>
        <Icon size={18} color={colors.primary} />
      </View>
      <View>
        <Text style={s.statValue}>{value}</Text>
        <Text style={s.statLabel}>{label}</Text>
      </View>
    </View>
  );
}

function ProfileField({ label, value }: { label: string; value?: string }) {
  return (
    <View style={s.field}>
      <Text style={s.fieldLabel}>{label}</Text>
      <Text style={s.fieldValue}>{value || '—'}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, gap: spacing.md, paddingBottom: spacing.xxl },
  center: { alignItems: 'center', justifyContent: 'center' },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  name: {
    fontFamily: typography.fontFamily.heading,
    fontSize: typography.fontSize.lg,
    color: colors.foreground,
  },
  titleText: {
    fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: typography.fontSize.sm,
    color: colors.primary,
  },
  muted: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.sm,
    color: colors.mutedForeground,
  },
  badgeRow: { flexDirection: 'row', gap: spacing.xs, flexWrap: 'wrap', marginTop: spacing.sm },
  tabStrip: { gap: spacing.xs, paddingVertical: spacing.xs },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  tabActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  tabText: {
    fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: typography.fontSize.sm,
    color: colors.foreground,
  },
  tabTextActive: { color: colors.primaryForeground },
  statsRow: { flexDirection: 'row', gap: spacing.sm },
  statTile: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statIcon: {
    padding: spacing.xs,
    backgroundColor: colors.primary + '20',
    borderRadius: 8,
  },
  statValue: {
    fontFamily: typography.fontFamily.heading,
    fontSize: typography.fontSize.xl,
    color: colors.primary,
  },
  statLabel: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.xs,
    color: colors.mutedForeground,
  },
  guideStep: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.sm,
    color: colors.foreground,
  },
  athleteRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.sm,
    backgroundColor: colors.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  athleteName: {
    fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: typography.fontSize.base,
    color: colors.foreground,
  },
  actionsRow: { flexDirection: 'row', gap: spacing.xs, flexWrap: 'wrap', marginTop: spacing.xs },
  field: { gap: 2 },
  fieldLabel: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.xs,
    color: colors.mutedForeground,
  },
  fieldValue: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.base,
    color: colors.foreground,
  },
});
