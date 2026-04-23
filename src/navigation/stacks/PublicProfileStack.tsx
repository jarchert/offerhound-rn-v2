// PublicProfileStack — deep-linked share targets per Part 2 §2.1
// PublicProfile (/p/:customUrl), PublicScoutProfile, InfluencerProfile, InfluencerBlogPost, InviteShareCard
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { colors } from '@/lib/theme';

import ProfileScreen from '@/screens/shared/ProfileScreen';
import { makePlaceholder } from '@/navigation/PlaceholderScreen';

const PublicAthleteProfile = makePlaceholder('Athlete Profile', 'Arrives in Session 3', 'Public athlete profile with highlight media + share card.');
const PublicScoutProfile = makePlaceholder('Scout Profile', 'Arrives in Session 3', 'Public scout profile.');
const InfluencerProfile = makePlaceholder('Influencer Profile', 'Arrives in Session 8', 'Public influencer profile.');
const InfluencerBlogPost = makePlaceholder('Blog Post', 'Arrives in Session 8', 'Influencer blog post renderer.');
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
