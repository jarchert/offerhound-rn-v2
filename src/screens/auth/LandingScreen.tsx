// LandingScreen — full RN port of Lovable src/pages/Landing.tsx
// Zero liberties. All copy verbatim. All sections present.
import React, { useEffect, useMemo, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ImageBackground,
  Pressable,
  Animated,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CheckCircle, Menu } from 'lucide-react-native';

import { colors, typography, spacing, radius } from '@/lib/theme';
import { SportType, SPORTS_CONFIG, getSportConfig } from '@/lib/data/sports';
import { useSport } from '@/contexts/SportContext';
import { useAuth } from '@/contexts/AuthContext';
import {
  SPORT_HERO_IMAGES,
  BG_HERO_ATHLETE,
  BG_COACH_SCOUT,
  BG_WHY_OFFERHOUND,
} from '@/lib/assets';

import { SportSelector } from '@/components/landing/SportSelector';
import { ViewerTypeSelector, ViewerType } from '@/components/landing/ViewerTypeSelector';
import { FounderRibbon } from '@/components/landing/FounderRibbon';
import { LandingHeroContent } from '@/components/landing/LandingHeroContent';
import { LandingFeatures } from '@/components/landing/LandingFeatures';
import { AIUseCasesSection } from '@/components/AIUseCasesSection';
import { LandingPodcastSection } from '@/components/landing/LandingPodcastSection';

const VIEWER_STORAGE_KEY = 'offerhound_viewer_type';
const { width: SCREEN_W } = Dimensions.get('window');

export default function LandingScreen() {
  const nav = useNavigation<any>();
  const route = useRoute();
  const routeParams = (route.params || {}) as { sport?: SportType };
  const { selectedSport: contextSport, setSelectedSport: setContextSport } = useSport();
  const { user } = useAuth();
  const isAuthenticated = user !== null;
  const scrollRef = useRef<ScrollView>(null);
  const scrollY = useRef(new Animated.Value(0)).current;

  // Viewer type — persisted with same key as Lovable
  const [viewerType, setViewerType] = useState<ViewerType>('athlete');
  useEffect(() => {
    AsyncStorage.getItem(VIEWER_STORAGE_KEY).then((v) => {
      if (v === 'athlete' || v === 'coach') setViewerType(v);
    });
  }, []);
  const updateViewerType = (t: ViewerType) => {
    setViewerType(t);
    AsyncStorage.setItem(VIEWER_STORAGE_KEY, t);
  };

  // Sport — route param overrides context
  const initialSport: SportType =
    routeParams.sport && SPORTS_CONFIG[routeParams.sport]
      ? routeParams.sport
      : contextSport;
  const [selectedSport, setSelectedSportLocal] = useState<SportType>(initialSport);
  useEffect(() => {
    if (routeParams.sport && SPORTS_CONFIG[routeParams.sport]) {
      setSelectedSportLocal(routeParams.sport);
      setContextSport(routeParams.sport);
    }
  }, [routeParams.sport]);
  const updateSport = (sport: SportType) => {
    setSelectedSportLocal(sport);
    setContextSport(sport);
  };

  const heroBg =
    viewerType === 'athlete'
      ? SPORT_HERO_IMAGES[selectedSport] || BG_HERO_ATHLETE
      : BG_COACH_SCOUT;

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      {/* Static top navbar — always visible */}
      <View style={s.topNav}>
        <Text style={s.topNavLogo}>
          <Text style={{ color: colors.primary }}>OFFER</Text>
          <Text style={{ color: colors.foreground }}>HOUND</Text>
          <Text style={s.topNavTm}>™</Text>
        </Text>
        <View style={s.topNavActions}>
          {isAuthenticated ? (
            <Pressable onPress={() => nav.navigate('SettingsStack' as any)} hitSlop={8}>
              <Menu size={22} color={colors.foreground} />
            </Pressable>
          ) : (
            <Pressable onPress={() => nav.navigate('AuthStack' as any)} style={s.topNavSignIn}>
              <Text style={s.topNavSignInText}>Sign In</Text>
            </Pressable>
          )}
        </View>
      </View>

      {/* Sticky sport header — appears after scrolling past hero (400px) */}
      <StickyHeader
        scrollY={scrollY}
        selectedSport={selectedSport}
        onSportChange={updateSport}
        isAuthenticated={isAuthenticated}
      />

      <Animated.ScrollView
        ref={scrollRef}
        style={s.scroll}
        contentContainerStyle={s.scrollContent}
        scrollEventThrottle={16}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
      >
        {/* ── Hero section ── */}
        <ImageBackground source={heroBg} style={s.hero} imageStyle={s.heroImage}>
          <View style={s.heroOverlay} />
          {/* Decorative blobs — Lovable uses `blur-3xl` for soft glows; RN has no
              blur-3xl equivalent on plain Views so these render as harsh solid
              yellow circles ("two yellow circles" artifact). Removed on mobile. */}
          {/* Grid pattern overlay */}
          <View style={s.gridOverlay} />

          <View style={s.heroInner}>
            {/* Viewer type selector — hidden when authenticated */}
            {!isAuthenticated && (
              <ViewerTypeSelector
                selectedType={viewerType}
                onTypeChange={updateViewerType}
              />
            )}

            {/* Sport selector — athlete only */}
            {viewerType === 'athlete' && (
              <View style={s.sportSelectorWrap}>
                <SportSelector
                  selectedSport={selectedSport}
                  onSportChange={updateSport}
                  variant="mobile"
                />
              </View>
            )}

            {/* Conditional hero content */}
            <LandingHeroContent
              viewerType={viewerType}
              selectedSport={selectedSport}
              isAuthenticated={isAuthenticated}
            />
          </View>
        </ImageBackground>

        {/* ── Founder ribbon ── */}
        <FounderRibbon />

        {/* ── Features section (conditional) ── */}
        <LandingFeatures viewerType={viewerType} />

        {/* ── AI use cases ── */}
        <AIUseCasesSection showGetStartedCta={!isAuthenticated} />

        {/* ── How it works ── */}
        <HowItWorksSection
          viewerType={viewerType}
          isAuthenticated={isAuthenticated}
          onCta={(route: string) => nav.navigate(route)}
        />

        {/* ── Why OfferHound ── */}
        <WhyOfferhoundSection viewerType={viewerType} />

        {/* ── Podcast section (athlete only) ── */}
        {viewerType === 'athlete' && <LandingPodcastSection />}

        <View style={{ height: 40 }} />
      </Animated.ScrollView>
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Sticky header — mirrors StickyMobileSportHeader.tsx
// Appears after scrolling 400px, hides when back at top
// ─────────────────────────────────────────────────────────────────────────────
function StickyHeader({
  scrollY,
  selectedSport,
  onSportChange,
  isAuthenticated,
}: {
  scrollY: Animated.Value;
  selectedSport: SportType;
  onSportChange: (s: SportType) => void;
  isAuthenticated: boolean;
}) {
  const nav = useNavigation<any>();
  const translateY = scrollY.interpolate({
    inputRange: [380, 420],
    outputRange: [-80, 0],
    extrapolate: 'clamp',
  });
  const opacity = scrollY.interpolate({
    inputRange: [380, 420],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });
  return (
    <Animated.View style={[s.stickyHeader, { transform: [{ translateY }], opacity }]}>
      <Pressable onPress={() => nav.navigate('LandingTab')}>
        <Text style={s.stickyLogo}>
          <Text style={{ color: colors.primary }}>OFFER</Text>
          <Text style={{ color: colors.foreground }}>HOUND</Text>
          <Text style={s.stickyTm}>™</Text>
        </Text>
      </Pressable>
      <Pressable onPress={() => nav.navigate('NILIntelligence')} style={s.stickyNil}>
        <Text style={s.stickyNilText}>✦ NIL AI</Text>
      </Pressable>
      <View style={s.stickySportWrap}>
        <SportSelector
          selectedSport={selectedSport}
          onSportChange={onSportChange}
          variant="compact"
        />
      </View>
    </Animated.View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// How it works — verbatim copy from Lovable Landing.tsx
// ─────────────────────────────────────────────────────────────────────────────
function HowItWorksSection({
  viewerType,
  isAuthenticated,
  onCta,
}: {
  viewerType: ViewerType;
  isAuthenticated: boolean;
  onCta: (route: string) => void;
}) {
  const steps =
    viewerType === 'athlete'
      ? [
          {
            n: '1',
            title: 'CREATE YOUR PROFILE',
            description:
              'Add your stats, highlights, academics, and tell your story. Our AI helps you complete your profile quickly.',
          },
          {
            n: '2',
            title: 'FIND YOUR COACHES',
            description:
              'Search our database of college coaches. Filter by division, conference, position, and save your favorites.',
          },
          {
            n: '3',
            title: 'REACH OUT & TRACK',
            description:
              'Send personalized letters, schedule follow-ups, and track all your recruiting activity in one dashboard.',
          },
        ]
      : [
          {
            n: '1',
            title: 'SEARCH ATHLETES',
            description:
              'Search our growing database by position, graduation year, location, traits, and academic fit.',
          },
          {
            n: '2',
            title: 'BUILD YOUR BOARD',
            description:
              'Save prospects to your recruiting board. Add notes, set priorities, and organize by position needs.',
          },
          {
            n: '3',
            title: 'CONNECT & RECRUIT',
            description:
              'Message athletes directly, track your recruiting pipeline, and export reports for your staff.',
          },
        ];

  const subtitle =
    viewerType === 'athlete'
      ? 'Get started in minutes and begin connecting with college coaches today.'
      : 'Find and evaluate athletes in minutes. Build your recruiting board today.';

  const ctaLabel = viewerType === 'athlete' ? 'Get Started Free' : 'Search Athletes Now';
  const ctaRoute = viewerType === 'athlete' ? 'SignUp' : 'AthleteSearch';

  return (
    <View style={s.section}>
      <Text style={s.sectionLabel}>HOW IT WORKS</Text>
      <Text style={s.sectionTitle}>Simple. Powerful. Effective.</Text>
      <Text style={s.sectionSubtitle}>{subtitle}</Text>

      <View style={s.stepsGrid}>
        {steps.map((step) => (
          <View key={step.n} style={s.stepCard}>
            <View style={s.stepNumber}>
              <Text style={s.stepNumberText}>{step.n}</Text>
            </View>
            <Text style={s.stepTitle}>{step.title}</Text>
            <Text style={s.stepDesc}>{step.description}</Text>
          </View>
        ))}
      </View>

      {!isAuthenticated && (
        <Pressable style={s.ctaBtn} onPress={() => onCta(ctaRoute)}>
          <Text style={s.ctaBtnText}>{ctaLabel}</Text>
        </Pressable>
      )}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Why OfferHound — verbatim copy from Lovable Landing.tsx
// ─────────────────────────────────────────────────────────────────────────────
function WhyOfferhoundSection({ viewerType }: { viewerType: ViewerType }) {
  const athleteItems = [
    {
      title: 'COACHES FIND YOU',
      body: 'Your media, highlights, and profile are presented to coaches actively searching for athletes with your specific traits and intangibles.',
    },
    {
      title: 'DIRECT COACH CONTACT',
      body: 'Unlike services that just list profiles, OfferHound helps you actually reach out to coaches with verified email addresses and AI-generated personalized letters.',
    },
    {
      title: 'AI RECRUITING ASSISTANT',
      body: 'Get 24/7 recruiting advice from our AI coach. No other platform offers personalized guidance on your recruiting strategy, timing, and approach.',
    },
    {
      title: 'AFFORDABLE & ACCESSIBLE',
      body: 'No expensive monthly fees or hidden costs. OfferHound is designed to give every athlete regardless of background the tools to get recruited.',
    },
  ];
  const coachItems = [
    {
      title: 'DISCOVER OVERLOOKED TALENT',
      body: 'Find athletes not on the big recruiting services. Access motivated prospects actively seeking opportunities at all levels.',
    },
    {
      title: 'FILTER BY TRAITS & INTANGIBLES',
      body: 'Search beyond stats. Find athletes with the character traits, work ethic, and intangibles that do not show up on a stat sheet.',
    },
    {
      title: 'AI-POWERED RECOMMENDATIONS',
      body: 'Our AI learns your program needs and recommends athletes who match your position requirements, scheme fit, and academic standards.',
    },
    {
      title: 'FREE FOR COACHES & SCOUTS',
      body: 'Search our database, save prospects, and connect with athletes at no cost. We believe recruiting should be accessible for everyone.',
    },
  ];
  const items = viewerType === 'athlete' ? athleteItems : coachItems;
  const title =
    viewerType === 'athlete'
      ? 'Why Athletes Choose OfferHound'
      : 'Why Coaches & Scouts Choose OfferHound';

  return (
    <View style={s.section}>
      <Text style={s.sectionLabel}>WHY OFFERHOUND</Text>
      <Text style={s.sectionTitle}>{title}</Text>
      <View style={s.whyGrid}>
        {items.map((item) => (
          <View key={item.title} style={s.whyCard}>
            <CheckCircle size={24} color={colors.primary} style={{ flexShrink: 0, marginTop: 2 }} />
            <View style={{ flex: 1 }}>
              <Text style={s.whyTitle}>{item.title}</Text>
              <Text style={s.whyBody}>{item.body}</Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Podcast teaser — placeholder until full LandingPodcastSection is ported
// ─────────────────────────────────────────────────────────────────────────────
function PodcastTeaser({ onPress }: { onPress: () => void }) {
  return (
    <View style={s.section}>
      <Text style={s.sectionLabel}>FEATURED PODCASTS</Text>
      <Text style={s.sectionTitle}>Recruiting Insights</Text>
      <Text style={s.sectionSubtitle}>
        Listen to expert advice on college recruiting, NIL, and athlete development.
      </Text>
      <Pressable style={s.ctaBtn} onPress={onPress}>
        <Text style={s.ctaBtnText}>Browse Podcasts</Text>
      </Pressable>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  // Static top navbar
  topNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    zIndex: 30,
  },
  topNavLogo: {
    fontFamily: typography.fontFamily.heading,
    fontSize: 20,
    letterSpacing: typography.letterSpacing.heading,
  },
  topNavTm: { fontSize: 9, color: colors.primary },
  topNavActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  topNavSignIn: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: 8,
  },
  topNavSignInText: {
    fontFamily: typography.fontFamily.bodySemiBold,
    color: colors.primaryForeground,
    fontSize: typography.fontSize.sm,
  },
  scroll: { flex: 1 },
  scrollContent: { flexGrow: 1 },

  // Sticky header
  stickyHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 40,
    backgroundColor: colors.background + 'F2',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
  },
  stickyLogo: {
    fontFamily: typography.fontFamily.heading,
    fontSize: 18,
    letterSpacing: typography.letterSpacing.heading,
  },
  stickyTm: { fontSize: 9, color: colors.primary },
  stickyNil: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  stickyNilText: {
    fontFamily: typography.fontFamily.body,
    fontSize: 13,
    color: colors.mutedForeground,
  },
  stickySportWrap: { maxWidth: 140 },

  // Hero
  hero: {
    minHeight: Dimensions.get('window').height,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  heroImage: { opacity: 0.5 },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.background + 'B3',
  },
  blob: {
    position: 'absolute',
    borderRadius: 9999,
    backgroundColor: colors.primary + '1A',
  },
  blobTL: { top: 128, left: 40, width: 288, height: 288 },
  blobBR: { bottom: 80, right: 40, width: 384, height: 384 },
  gridOverlay: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.05,
  },
  heroInner: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl * 2,
    alignItems: 'center',
  },
  sportSelectorWrap: { marginTop: spacing.md, width: '100%', maxWidth: 320 },
  heroContentWrap: { width: '100%', marginTop: spacing.lg },

  // Sections
  section: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
    borderTopWidth: 1,
    borderTopColor: colors.border + '40',
  },
  sectionLabel: {
    fontFamily: typography.fontFamily.heading,
    fontSize: typography.fontSize.xs,
    color: colors.primary,
    letterSpacing: 2,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  sectionTitle: {
    fontFamily: typography.fontFamily.heading,
    fontSize: typography.fontSize['3xl'],
    color: colors.foreground,
    letterSpacing: typography.letterSpacing.heading,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  sectionSubtitle: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.base,
    color: colors.mutedForeground,
    textAlign: 'center',
    marginBottom: spacing.lg,
    lineHeight: 24,
  },

  // How it works
  stepsGrid: { gap: spacing.md, marginBottom: spacing.lg },
  stepCard: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    alignItems: 'center',
  },
  stepNumber: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary + '1A',
    borderWidth: 1,
    borderColor: colors.primary + '33',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  stepNumberText: {
    fontFamily: typography.fontFamily.heading,
    fontSize: typography.fontSize['2xl'],
    color: colors.primary,
  },
  stepTitle: {
    fontFamily: typography.fontFamily.heading,
    fontSize: typography.fontSize.lg,
    color: colors.foreground,
    letterSpacing: typography.letterSpacing.heading,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  stepDesc: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.sm,
    color: colors.mutedForeground,
    textAlign: 'center',
    lineHeight: 20,
  },

  // Why OfferHound
  whyGrid: { gap: spacing.md },
  whyCard: {
    flexDirection: 'row',
    gap: spacing.md,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
  },
  whyTitle: {
    fontFamily: typography.fontFamily.heading,
    fontSize: typography.fontSize.lg,
    color: colors.foreground,
    letterSpacing: typography.letterSpacing.heading,
    marginBottom: spacing.xs,
  },
  whyBody: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.sm,
    color: colors.mutedForeground,
    lineHeight: 20,
  },

  // CTA button
  ctaBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
    alignSelf: 'center',
  },
  ctaBtnText: {
    fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: typography.fontSize.base,
    color: colors.primaryForeground,
  },
});
