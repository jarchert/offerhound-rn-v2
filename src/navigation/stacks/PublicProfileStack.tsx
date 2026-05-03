// PublicProfileStack — deep-linked share targets per Part 2 §2.1
// PublicProfile (/p/:customUrl), PublicScoutProfile, InfluencerProfile, InfluencerBlogPost, InviteShareCard
// Session-parity-port phase 1-2: + Gallery, SampleAthlete, SampleAthleteGallery,
// PublicClubDiscovery, ContactActivity, SubmitTestimonial, SubmitReference.
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { colors } from '@/lib/theme';

import PublicProfileScreen from '@/screens/public/PublicProfileScreen';
import PublicScoutProfileScreen from '@/screens/public/PublicScoutProfileScreen';
import PublicCoachProfileScreen from '@/screens/public/PublicCoachProfileScreen';
import PublicHSCoachProfileScreen from '@/screens/public/PublicHSCoachProfileScreen';
import PublicClubCoachProfileScreen from '@/screens/public/PublicClubCoachProfileScreen';
import PublicAgencyProfileScreen from '@/screens/public/PublicAgencyProfileScreen';
import InfluencerProfileScreen from '@/screens/public/InfluencerProfileScreen';
import InfluencerBlogPostScreen from '@/screens/public/InfluencerBlogPostScreen';
import InviteShareCardScreen from '@/screens/public/InviteShareCardScreen';
import GalleryScreen from '@/screens/public/GalleryScreen';
import SampleAthleteScreen from '@/screens/public/SampleAthleteScreen';
import SampleAthleteGalleryScreen from '@/screens/public/SampleAthleteGalleryScreen';
import PublicClubDiscoveryScreen from '@/screens/public/PublicClubDiscoveryScreen';
import ContactActivityScreen from '@/screens/public/ContactActivityScreen';
import SubmitTestimonialScreen from '@/screens/public/SubmitTestimonialScreen';
import SubmitReferenceScreen from '@/screens/public/SubmitReferenceScreen';

export type PublicProfileStackParamList = {
  PublicProfile: { customUrl: string };
  AthleteProfileByUrl: { customUrl: string };
  ProfileLegacy: { customUrl: string };
  PublicScoutProfile: { scoutId?: string; id?: string };
  PublicCoachProfile: { coachId?: string; id?: string };
  PublicHSCoachProfile: { id: string };
  PublicClubCoachProfile: { id: string };
  PublicAgencyProfile: { id: string };
  InfluencerProfile: { handle: string };
  InfluencerBlogPost: { handle: string; slug: string };
  InviteShareCard: { token?: string; from?: string; role?: string } | undefined;
  Gallery: undefined;
  SampleAthlete: undefined;
  SampleAthleteGallery: undefined;
  PublicClubDiscovery: undefined;
  ContactActivity: undefined;
  SubmitTestimonial: { profile?: string } | undefined;
  SubmitReference: { token?: string } | undefined;
};

const Stack = createNativeStackNavigator<PublicProfileStackParamList>();

export default function PublicProfileStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}>
      <Stack.Screen name="PublicProfile" component={PublicProfileScreen} />
      <Stack.Screen name="AthleteProfileByUrl" component={PublicProfileScreen} />
      <Stack.Screen name="ProfileLegacy" component={PublicProfileScreen} />
      <Stack.Screen name="PublicScoutProfile" component={PublicScoutProfileScreen} />
      <Stack.Screen name="PublicCoachProfile" component={PublicCoachProfileScreen} />
      <Stack.Screen name="PublicHSCoachProfile" component={PublicHSCoachProfileScreen} />
      <Stack.Screen name="PublicClubCoachProfile" component={PublicClubCoachProfileScreen} />
      <Stack.Screen name="PublicAgencyProfile" component={PublicAgencyProfileScreen} />
      <Stack.Screen name="InfluencerProfile" component={InfluencerProfileScreen} />
      <Stack.Screen name="InfluencerBlogPost" component={InfluencerBlogPostScreen} />
      <Stack.Screen name="InviteShareCard" component={InviteShareCardScreen} />
      <Stack.Screen name="Gallery" component={GalleryScreen} />
      <Stack.Screen name="SampleAthlete" component={SampleAthleteScreen} />
      <Stack.Screen name="SampleAthleteGallery" component={SampleAthleteGalleryScreen} />
      <Stack.Screen name="PublicClubDiscovery" component={PublicClubDiscoveryScreen} />
      <Stack.Screen name="ContactActivity" component={ContactActivityScreen} />
      <Stack.Screen name="SubmitTestimonial" component={SubmitTestimonialScreen} />
      <Stack.Screen name="SubmitReference" component={SubmitReferenceScreen} />
    </Stack.Navigator>
  );
}
