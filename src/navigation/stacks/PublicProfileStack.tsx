// PublicProfileStack — deep-linked share targets per Part 2 §2.1
// PublicProfile (/p/:customUrl), PublicScoutProfile, InfluencerProfile, InfluencerBlogPost, InviteShareCard
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { colors } from '@/lib/theme';

import ProfileScreen from '@/screens/shared/ProfileScreen';
import PublicProfileScreen from '@/screens/public/PublicProfileScreen';
import PublicScoutProfileScreen from '@/screens/public/PublicScoutProfileScreen';
import { makePlaceholder } from '@/navigation/PlaceholderScreen';

// PORT-PENDING: Lovable source at offerhound-repo/src/pages/PublicProfile.tsx (219 LOC) — ported in this commit.
const PublicAthleteProfile = PublicProfileScreen;
// PORT-PENDING: Lovable source at offerhound-repo/src/pages/PublicScoutProfile.tsx (122 LOC) — ported in this commit; aliased name kept for stack mapping.
const PublicScoutProfile = PublicScoutProfileScreen;
// PORT-PENDING: Lovable source at offerhound-repo/src/pages/InfluencerProfile.tsx (317 LOC) — schedule in next wave
const InfluencerProfile = makePlaceholder('Influencer Profile', 'Arrives in Session 8', 'Public influencer profile.');
// PORT-PENDING: Lovable source at offerhound-repo/src/pages/InfluencerBlogPost.tsx (210 LOC) — schedule in next wave
const InfluencerBlogPost = makePlaceholder('Blog Post', 'Arrives in Session 8', 'Influencer blog post renderer.');
// PORT-PENDING: Lovable source at offerhound-repo/src/pages/InviteShareCard.tsx (295 LOC); ShareRoleCardDialog / SharePlayerCardDialog components are ported but the standalone share-card screen isn't. Schedule in next wave.
const InviteShareCard = makePlaceholder('Invite Card', 'Arrives in Session 3', 'Share-card invite preview.');

export type PublicProfileStackParamList = {
  PublicProfile: { customUrl: string };
  AthleteProfileByUrl: { customUrl: string };
  ProfileLegacy: { customUrl: string };
  PublicScoutProfile: { scoutId: string };
  InfluencerProfile: { handle: string };
  InfluencerBlogPost: { handle: string; slug: string };
  InviteShareCard: undefined;
};

const Stack = createNativeStackNavigator<PublicProfileStackParamList>();

export default function PublicProfileStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}>
      <Stack.Screen name="PublicProfile" component={PublicAthleteProfile} />
      <Stack.Screen name="AthleteProfileByUrl" component={PublicAthleteProfile} />
      <Stack.Screen name="ProfileLegacy" component={PublicAthleteProfile} />
      <Stack.Screen name="PublicScoutProfile" component={PublicScoutProfile} />
      <Stack.Screen name="InfluencerProfile" component={InfluencerProfile} />
      <Stack.Screen name="InfluencerBlogPost" component={InfluencerBlogPost} />
      <Stack.Screen name="InviteShareCard" component={InviteShareCard} />
    </Stack.Navigator>
  );
}
