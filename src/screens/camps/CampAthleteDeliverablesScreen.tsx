// CampAthleteDeliverablesScreen — RN port of Lovable web src/pages/CampAthleteDeliverables.tsx (116 LOC).
// Athlete-side post-camp page. Pulls camp + enrollment from Supabase and shows
// four tabs: Report (PDF export), Highlight reel, Rate camp (NPS), Refund.
//
// PORT-PENDING (heavy components — placeholders rendered as cards for now):
//   - CampReportExportButton  → web-only PDF export with print/share
//   - CampHighlightReelManager → web-only video composition surface
//   - CampNPSCapture           → web-only star/NPS form
//   - CampRefundRequestCard    → web-only refund-request form
//   - CampSpectatorShareButton → web-only Web Share API surface
//   - CampSmsOptInToggle       → web-only Twilio opt-in flow
//   - AddToCalendarButton      → web-only ICS download
// Each surfaces a Card with PORT-PENDING copy explaining the gap. Replace the
// placeholders one-by-one as each component lands in the RN tree.
import React, { useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, ActivityIndicator } from 'react-native';
import { useNavigation, useRoute, type NavigationProp, type RouteProp } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react-native';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';
import CampHighlightReelManager from '@/components/CampHighlightReelManager';
import CampNPSCapture from '@/components/CampNPSCapture';
import CampRefundRequestCard from '@/components/CampRefundRequestCard';
import CampReportExportButton from '@/components/CampReportExportButton';
import { colors, typography, spacing } from '@/lib/theme';
import type { CampStackParamList } from '@/navigation/stacks/CampStack';

interface Camp {
  id: string;
  name: string;
  description: string | null;
  sport: string;
  start_date: string;
  end_date: string | null;
  start_time: string | null;
  end_time: string | null;
  location: string | null;
  city: string | null;
  state: string | null;
}

interface Enrollment {
  id: string;
  camp_id: string;
  athlete_profile_id: string | null;
}

export default function CampAthleteDeliverablesScreen() {
  const route = useRoute<RouteProp<CampStackParamList, 'CampDeliverables'>>();
  const navigation = useNavigation<NavigationProp<any>>();
  const { campId, enrollmentId } = route.params;
  const { user, loading: authLoading } = useAuth();
  const [tab, setTab] = React.useState('report');

  // Web pushes to /auth when unauthenticated; RN equivalent is to bounce to
  // the auth stack root. We do this defensively and then bail out below.
  useEffect(() => {
    if (!authLoading && !user) {
      // Best-effort navigation; silent if 'Auth' isn't reachable from the
      // current navigator (deep link directly into deliverables shouldn't
      // crash if auth route is unmounted).
      try {
        navigation.navigate('Auth' as never);
      } catch {
        /* noop */
      }
    }
  }, [user, authLoading, navigation]);

  const { data, isLoading } = useQuery({
    queryKey: ['camp-deliverables', campId, enrollmentId],
    enabled: !!campId && !!enrollmentId,
    queryFn: async () => {
      const [enrollmentRes, campRes] = await Promise.all([
        supabase.from('camp_enrollments').select('*').eq('id', enrollmentId).maybeSingle(),
        supabase
          .from('camps')
          .select('id,name,description,sport,start_date,end_date,start_time,end_time,location,city,state')
          .eq('id', campId)
          .maybeSingle(),
      ]);
      return {
        enrollment: enrollmentRes.data as Enrollment | null,
        camp: campRes.data as Camp | null,
      };
    },
  });

  if (authLoading || isLoading) {
    return (
      <SafeAreaView style={s.container}>
        <View style={s.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!data?.camp || !data?.enrollment) {
    return (
      <SafeAreaView style={s.container}>
        <View style={s.center}>
          <Text style={s.muted}>Camp not found.</Text>
          <Button variant="outline" onPress={() => navigation.goBack()} style={{ marginTop: spacing.md }}>
            Go home
          </Button>
        </View>
      </SafeAreaView>
    );
  }

  const camp = data.camp;
  const subtitle = `${new Date(camp.start_date).toLocaleDateString()}${
    camp.city ? ` • ${camp.city}, ${camp.state || ''}` : ''
  }`;

  return (
    <SafeAreaView style={s.container}>
      <ScrollView contentContainerStyle={s.scroll}>
        <Button
          variant="ghost"
          size="sm"
          onPress={() => navigation.goBack()}
          leftIcon={<ArrowLeft size={16} color={colors.foreground} />}
          style={s.backBtn}
        >
          Back
        </Button>

        <Text style={s.title}>{camp.name}</Text>
        <Text style={s.subtitle}>{subtitle}</Text>

        {/* PORT-PENDING action row: AddToCalendar / SpectatorShare / ReportExport */}
        <Card style={s.placeholderCard}>
          <CardContent style={s.placeholderInner}>
            <Text style={s.placeholderTitle}>Quick actions (coming soon)</Text>
            <Text style={s.muted}>
              Add-to-calendar, spectator share, and the recruiter PDF export are pending RN ports of
              {' '}AddToCalendarButton, CampSpectatorShareButton, and CampReportExportButton.
            </Text>
          </CardContent>
        </Card>

        {/* PORT-PENDING: CampSmsOptInToggle (Twilio opt-in) */}
        <Card style={s.placeholderCard}>
          <CardContent style={s.placeholderInner}>
            <Text style={s.placeholderTitle}>SMS alerts</Text>
            <Text style={s.muted}>
              SMS opt-in toggle is pending the RN port of CampSmsOptInToggle.
            </Text>
          </CardContent>
        </Card>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="report">Report</TabsTrigger>
            <TabsTrigger value="reel">Highlight reel</TabsTrigger>
            <TabsTrigger value="feedback">Rate camp</TabsTrigger>
            <TabsTrigger value="refund">Refund</TabsTrigger>
          </TabsList>

          <TabsContent value="report">
            <Card>
              <CardContent style={s.tabPaneCenter}>
                <Text style={s.tabPaneHeading}>Recruiter-ready report</Text>
                <Text style={[s.muted, { maxWidth: 420 }]}>
                  Share a summary of this camp with college coaches. Detailed PDF
                  exports with evaluator breakdowns will arrive when the server-side
                  pipeline ships.
                </Text>
                <CampReportExportButton
                  campName={camp.name}
                  campId={camp.id}
                  enrollmentId={data.enrollment.id}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reel">
            <CampHighlightReelManager
              campId={camp.id}
              enrollmentId={data.enrollment.id}
              athleteUserId={user?.id ?? null}
            />
          </TabsContent>

          <TabsContent value="feedback">
            <CampNPSCapture
              campId={camp.id}
              enrollmentId={data.enrollment.id}
              athleteUserId={user?.id ?? null}
            />
          </TabsContent>

          <TabsContent value="refund">
            <CampRefundRequestCard
              campId={camp.id}
              enrollmentId={data.enrollment.id}
              athleteUserId={user?.id ?? null}
            />
          </TabsContent>
        </Tabs>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: spacing.md, paddingBottom: spacing.xxl, gap: spacing.md },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  backBtn: { alignSelf: 'flex-start' },
  title: {
    fontFamily: typography.fontFamily.bodyBold,
    fontSize: typography.fontSize['2xl'],
    color: colors.foreground,
    marginTop: spacing.xs,
  },
  subtitle: {
    fontSize: typography.fontSize.sm,
    color: colors.mutedForeground,
    marginBottom: spacing.sm,
  },
  muted: {
    color: colors.mutedForeground,
    fontSize: typography.fontSize.sm,
    textAlign: 'center',
    lineHeight: typography.fontSize.sm * 1.5,
  },
  placeholderCard: { marginBottom: spacing.xs },
  placeholderInner: { gap: spacing.xs, paddingVertical: spacing.md, alignItems: 'center' },
  placeholderTitle: {
    fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: typography.fontSize.base,
    color: colors.foreground,
    textAlign: 'center',
  },
  tabPaneCenter: { paddingVertical: spacing.xl, alignItems: 'center', gap: spacing.sm + 4 },
  tabPaneHeading: {
    fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: typography.fontSize.lg,
    color: colors.foreground,
    textAlign: 'center',
  },
});
