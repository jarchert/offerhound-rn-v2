// AthleteFeaturesSection — RN port of Lovable src/components/landing/AthleteFeaturesSection.tsx.
// Verbatim copy/text. Web `text-gradient-gold` rendered with MaskedView+LinearGradient.
// Responsive md:/lg: grid collapsed to a flex-wrap column/row layout for native.
import React from 'react';
import { View, Text, ImageBackground, StyleSheet, useWindowDimensions } from 'react-native';
import {
  TrendingUp,
  Users,
  Search,
  Mail,
  MessageSquare,
  BarChart3,
  Clock,
  BookUser,
} from 'lucide-react-native';
import MaskedView from '@react-native-masked-view/masked-view';
import { LinearGradient } from 'expo-linear-gradient';
import { PatentPendingBadge } from '@/components/ui/PatentPendingBadge';
import { colors, typography, spacing, radius, gradients, shadows } from '@/lib/theme';

// Lovable imports `@/assets/bg-features-training.webp`. In the RN app the asset
// lives under assets/lovable/ (jpg). Require statically so Metro bundles it.
const bgFeaturesTraining = require('../../../assets/lovable/bg-features-training.jpg');

type Feature = {
  icon: React.ComponentType<{ width?: number; height?: number; color?: string }>;
  title: string;
  description: string;
  patentPending?: boolean;
};

const features: Feature[] = [
  { icon: TrendingUp, title: 'Get Discovered', description: "Your highlights, stats, and media are showcased to coaches actively searching for athletes with YOUR specific traits." },
  { icon: Users, title: 'Professional Profile', description: 'Create a stunning athlete profile with your stats, highlights, academics, and personal story.' },
  { icon: Search, title: 'Coach Database', description: 'Access thousands of college coaches across all divisions. Search by school, conference, position coached.' },
  { icon: Mail, title: 'AI-Powered Letters', description: 'Generate personalized introduction and interest letters for any coach using our patent-pending AI.', patentPending: true },
  { icon: MessageSquare, title: 'OfferHound Coach AI', description: 'Get personalized recruiting advice from our patent-pending AI coach.', patentPending: true },
  { icon: BarChart3, title: 'Activity Tracking', description: 'Keep track of every coach contact, letter sent, and response received.' },
  { icon: Clock, title: 'Scheduled Outreach', description: 'Schedule your letters to be sent at the perfect time.' },
  { icon: BookUser, title: 'Personal Contact Book', description: 'Build and maintain your own coaches contact book with notes and priorities.' },
];

export function AthleteFeaturesSection() {
  const { width } = useWindowDimensions();
  // Tailwind md: ≥768, lg: ≥1024 → 2 / 4 cols. Narrower = 1 col.
  const cols = width >= 1024 ? 4 : width >= 768 ? 2 : 1;
  const gap = spacing.md; // gap-6 ≈ 24 in web; keep 16 for compact native feel (matches sibling sections)
  const cardWidth = cols === 1 ? '100%' : `${100 / cols}%`;

  return (
    <View style={s.section}>
      {/* Background image @ opacity 0.1 + card/90 overlay */}
      <ImageBackground
        source={bgFeaturesTraining}
        resizeMode="cover"
        style={StyleSheet.absoluteFill}
        imageStyle={{ opacity: 0.1 }}
      />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(25,28,36,0.9)' }]} />

      <View style={s.container}>
        <View style={s.header}>
          <Text style={s.h2}>
            <Text style={s.h2Fg}>EVERYTHING YOU NEED TO </Text>
            <GradientWord text="GET NOTICED" />
          </Text>
          <Text style={s.lead}>
            OfferHound gives you the tools to stand out, connect with coaches, and manage your entire recruiting process.
          </Text>
        </View>

        <View style={[s.grid, { marginHorizontal: -gap / 2 }]}>
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <View
                key={index}
                style={[
                  s.cardWrap,
                  { width: cardWidth as any, paddingHorizontal: gap / 2, marginBottom: gap },
                ]}
              >
                <View style={s.card}>
                  <View style={s.iconWrap}>
                    <Icon width={24} height={24} color={colors.primary} />
                  </View>
                  <View style={s.titleRow}>
                    <Text style={s.title}>{feature.title}</Text>
                    {feature.patentPending && <PatentPendingBadge size="xs" />}
                  </View>
                  <Text style={s.desc}>{feature.description}</Text>
                </View>
              </View>
            );
          })}
        </View>
      </View>
    </View>
  );
}

// Inline word with gold gradient — mirrors Lovable .text-gradient-gold span.
function GradientWord({ text }: { text: string }) {
  return (
    <MaskedView maskElement={<Text style={[s.h2, s.h2Fg]}>{text}</Text>}>
      <LinearGradient
        colors={gradients.gold}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <Text style={[s.h2, { opacity: 0 }]}>{text}</Text>
      </LinearGradient>
    </MaskedView>
  );
}

export default AthleteFeaturesSection;

const s = StyleSheet.create({
  // section: py-24 + bg-card/50 + overflow-hidden + relative
  section: {
    position: 'relative',
    paddingVertical: 96,
    backgroundColor: 'rgba(25,28,36,0.5)',
    overflow: 'hidden',
  },
  container: {
    paddingHorizontal: spacing.lg, // px-6
    position: 'relative',
    zIndex: 10,
  },
  header: {
    alignItems: 'center',
    marginBottom: 64, // mb-16
  },
  h2: {
    fontFamily: typography.fontFamily.heading,
    fontSize: 44, // text-4xl md:text-5xl — native-friendly midpoint
    lineHeight: 48,
    textAlign: 'center',
    letterSpacing: typography.letterSpacing.heading,
    marginBottom: spacing.md, // mb-4
  },
  h2Fg: { color: colors.foreground },
  lead: {
    fontFamily: typography.fontFamily.body,
    fontSize: 18, // text-lg
    color: colors.mutedForeground,
    textAlign: 'center',
    maxWidth: 560, // max-w-2xl
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  cardWrap: {},
  // card: bg-gradient-card p-6 rounded-2xl border border-border/50 shadow-card
  card: {
    backgroundColor: colors.cardHigh, // gradient start; flat on native
    padding: spacing.lg, // p-6
    borderRadius: 16, // rounded-2xl
    borderWidth: 1,
    borderColor: 'rgba(43,48,58,0.5)', // border/50
    ...shadows.card,
  },
  // iconWrap: w-12 h-12 bg-primary/10 rounded-xl
  iconWrap: {
    width: 48,
    height: 48,
    backgroundColor: 'rgba(231,175,8,0.1)',
    borderRadius: radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  title: {
    fontFamily: typography.fontFamily.heading,
    fontSize: typography.size.xl, // text-xl
    color: colors.foreground,
    letterSpacing: typography.letterSpacing.heading,
  },
  desc: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.sm, // text-sm
    color: colors.mutedForeground,
    lineHeight: 20,
  },
});
