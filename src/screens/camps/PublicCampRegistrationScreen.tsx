// PublicCampRegistrationScreen — RN port of Lovable web src/pages/PublicCampRegistration.tsx (966 LOC).
// Public-facing camp registration screen. Anyone can view a published camp;
// authenticated athletes can self-enroll inline. Non-auth visitors are pushed
// to the Auth flow. At-capacity camps surface a waitlist email capture.
//
// PORT-PENDING (web-only deps replaced with placeholders / no-ops):
//   - <Navbar /> + <Footer />          → web chrome, RN screens use stack header instead.
//   - <SEO />                          → no-op on RN; meta tags don't apply.
//   - canonical/robots/og head tags    → noop on RN (no <head>).
//   - <SharePreviewModal />            → web-only React modal preview.
//   - <CampQRCodeButton />             → web-only QR generator (replace with expo-print/svg later).
//   - copyToClipboard()                → routed through @/lib/utils which uses Clipboard on RN.
//   - confirm()                        → replaced with React Native Alert.alert.
//   - document.referrer / window.*     → not available on RN; we always pass referrer=null.
//   - functions.invoke('notify-camp-enrollment') → still works through supabase client.
//
// PORT-PENDING (sport stat focus block): renders the same data via simple
// View/Text rows — no <ul>/<li>; layout uses flex wraps.
import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
  Image,
  Alert,
} from 'react-native';
import { useNavigation, useRoute, type NavigationProp, type RouteProp } from '@react-navigation/native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Calendar,
  MapPin,
  Users,
  CheckCircle2,
  Clock,
  DollarSign,
  Tent,
  ArrowLeft,
  Copy,
  Check,
  AlertCircle,
  X,
  BellRing,
  Activity,
} from 'lucide-react-native';

import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { copyToClipboard } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import {
  CAMP_SPORT_STAT_FOCUS,
  getCampSportMetrics,
} from '@/lib/data/campManagerSports';
import { SPORTS_CONFIG, type SportType } from '@/lib/data/sports';
import { buildCanonicalUrl } from '@/lib/canonicalDomain';
import { normalizeReferrerUrl } from '@/lib/utm';
import { colors, typography, spacing } from '@/lib/theme';
import type { CampStackParamList } from '@/navigation/stacks/CampStack';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface FormState {
  name: string;
  email: string;
  grade: string;
  hudl: string;
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

export default function PublicCampRegistrationScreen() {
  const route = useRoute<RouteProp<CampStackParamList, 'CampDetail'>>();
  const navigation = useNavigation<NavigationProp<any>>();
  const campId = route.params?.campId;
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [copied, setCopied] = useState(false);
  const [confirmedEnrollmentId, setConfirmedEnrollmentId] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [waitlistEmail, setWaitlistEmail] = useState('');
  const [waitlistJoined, setWaitlistJoined] = useState(false);
  const [form, setForm] = useState<FormState>({ name: '', email: '', grade: '', hudl: '' });

  const isValidId = !!campId && UUID_RE.test(campId);

  const { data: camp, isLoading, isError } = useQuery({
    queryKey: ['public-camp', campId],
    queryFn: async () => {
      if (!campId) return null;
      const { data, error } = await supabase
        .from('camps')
        .select('*')
        .eq('id', campId)
        .in('status', ['published', 'active'])
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: isValidId,
    retry: false,
  });

  const { data: enrollmentCount = 0 } = useQuery({
    queryKey: ['public-camp-count', campId],
    queryFn: async () => {
      if (!campId) return 0;
      const { count } = await supabase
        .from('camp_enrollments')
        .select('id', { count: 'exact', head: true })
        .eq('camp_id', campId)
        .neq('status', 'cancelled');
      return count || 0;
    },
    enabled: !!camp,
  });

  const { data: existingEnrollment } = useQuery({
    queryKey: ['public-camp-mine', campId, user?.id],
    queryFn: async () => {
      if (!campId || !user) return null;
      const { data } = await supabase
        .from('camp_enrollments')
        .select('id, status, payment_status, notes')
        .eq('camp_id', campId)
        .eq('user_id', user.id)
        .maybeSingle();
      return data;
    },
    enabled: !!camp && !!user,
  });

  const { data: athleteProfile } = useQuery({
    queryKey: ['public-camp-athlete-profile', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase
        .from('player_profiles')
        .select('id, position, full_name, email, graduation_year')
        .eq('user_id', user.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  // Pre-populate form from athlete profile once available.
  useEffect(() => {
    if (athleteProfile && !form.name && !form.email) {
      setForm((prev) => ({
        ...prev,
        name: (athleteProfile as any).full_name || prev.name,
        email: (athleteProfile as any).email || prev.email,
        grade: (athleteProfile as any).graduation_year
          ? String((athleteProfile as any).graduation_year)
          : prev.grade,
      }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [(athleteProfile as any)?.id]);

  const capacityFull = useMemo(() => {
    if (!camp?.capacity) return false;
    return enrollmentCount >= camp.capacity;
  }, [camp, enrollmentCount]);

  const isActiveEnrollment =
    !!existingEnrollment && (existingEnrollment as any).status !== 'cancelled';

  const enroll = useMutation({
    mutationFn: async () => {
      if (!user || !campId) throw new Error('Sign in required');
      if (capacityFull) throw new Error('Camp is at capacity');

      const noteLines = [
        `Name: ${form.name.trim()}`,
        `Email: ${form.email.trim()}`,
        form.grade ? `Grade/Class of: ${form.grade.trim()}` : null,
        form.hudl ? `HUDL: ${form.hudl.trim()}` : null,
      ]
        .filter(Boolean)
        .join('\n');

      // PORT-PENDING: web captured document.referrer + window.location UTMs.
      // RN has no document/window; we always normalize the (null) referrer.
      const referrer: string | null = normalizeReferrerUrl(null);

      const { data, error } = await supabase
        .from('camp_enrollments')
        .insert({
          camp_id: campId,
          user_id: user.id,
          athlete_profile_id: (athleteProfile as any)?.id ?? null,
          position_group: (athleteProfile as any)?.position ?? null,
          payment_status: (camp as any)?.is_free ? 'paid' : 'pending',
          status: 'registered',
          notes: noteLines || null,
          referrer_url: referrer,
        } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: async (data: any) => {
      setConfirmedEnrollmentId(data.id);
      setServerError(null);
      setFieldErrors({});
      queryClient.invalidateQueries({ queryKey: ['public-camp-mine', campId] });
      queryClient.invalidateQueries({ queryKey: ['public-camp-count', campId] });
      toast({ title: "You're registered!", description: 'Confirmation below.' });

      try {
        await supabase.functions.invoke('notify-camp-enrollment', {
          body: { enrollment_id: data.id },
        });
      } catch (e) {
        console.warn('notify-camp-enrollment failed:', e);
      }
    },
    onError: (err: any) => {
      const raw = String(err?.message || '');
      let friendly = raw || 'Something went wrong. Please try again.';
      if (/capacity/i.test(raw)) {
        friendly =
          'This camp just filled up while you were registering. Join the waitlist below and we\'ll notify you the moment a spot opens.';
      } else if (/duplicate key|unique constraint/i.test(raw)) {
        friendly = "Looks like you're already registered for this camp.";
      } else if (/permission|policy|rls/i.test(raw)) {
        friendly = "You don't have permission to register for this camp. Try signing in again.";
      }
      setServerError(friendly);
      queryClient.invalidateQueries({ queryKey: ['public-camp-count', campId] });
    },
  });

  const cancelEnrollment = useMutation({
    mutationFn: async () => {
      if (!existingEnrollment) throw new Error('No enrollment to cancel');
      const { error } = await supabase
        .from('camp_enrollments')
        .update({ status: 'cancelled' })
        .eq('id', (existingEnrollment as any).id);
      if (error) throw error;
    },
    onSuccess: () => {
      setConfirmedEnrollmentId(null);
      queryClient.invalidateQueries({ queryKey: ['public-camp-mine', campId] });
      queryClient.invalidateQueries({ queryKey: ['public-camp-count', campId] });
      toast({
        title: 'Enrollment cancelled',
        description: 'Your spot has been released. The camp organizer was notified.',
      });
    },
    onError: (err: any) => {
      toast({
        title: 'Could not cancel',
        description: err?.message || 'Please try again.',
        variant: 'destructive',
      });
    },
  });

  const joinWaitlist = useMutation({
    mutationFn: async () => {
      if (!campId) throw new Error('Missing camp');
      const trimmed = waitlistEmail.trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
        throw new Error('Please enter a valid email address.');
      }
      const { error } = await supabase
        .from('camp_waitlist')
        .insert({ camp_id: campId, email: trimmed, waitlist_position: 0 } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      setWaitlistJoined(true);
      toast({
        title: "You're on the waitlist",
        description: "We'll email you the moment a spot opens.",
      });
    },
    onError: (err: any) => {
      toast({
        title: 'Could not join waitlist',
        description: err?.message || 'Please try again.',
        variant: 'destructive',
      });
    },
  });

  const validateForm = (): Record<string, string> => {
    const errors: Record<string, string> = {};
    if (!form.name.trim()) errors.name = 'Please enter your full name.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim()))
      errors.email = 'Please enter a valid email address.';
    if (form.hudl && !/^https?:\/\/.+/i.test(form.hudl.trim()))
      errors.hudl = 'HUDL link must start with http:// or https://';
    return errors;
  };

  const handleEnroll = async () => {
    setServerError(null);
    if (!isAuthenticated) {
      // PORT-PENDING: web pushes to /auth?redirect=/camps/:id; RN bounces to Auth root.
      try {
        navigation.navigate('AuthStack' as never);
      } catch {
        /* noop */
      }
      return;
    }
    const errors = validateForm();
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;
    if (capacityFull) {
      setServerError(
        "This camp is at capacity. Join the waitlist below — we'll alert you when a spot opens.",
      );
      return;
    }
    await enroll.mutateAsync();
  };

  const handleCopyLink = async () => {
    if (!campId) return;
    const url = buildCanonicalUrl(`/camps/${campId}`);
    const ok = await copyToClipboard(url);
    if (ok) {
      setCopied(true);
      toast({ title: 'Link copied', description: url });
      setTimeout(() => setCopied(false), 2000);
    } else {
      toast({
        title: 'Copy failed',
        description: 'Please copy the URL manually.',
        variant: 'destructive',
      });
    }
  };

  const confirmCancel = () => {
    Alert.alert(
      'Cancel registration?',
      'Your spot will be released and the organizer will be notified.',
      [
        { text: 'Keep it', style: 'cancel' },
        {
          text: 'Cancel registration',
          style: 'destructive',
          onPress: () => cancelEnrollment.mutate(),
        },
      ],
    );
  };

  // ─── Render branches ────────────────────────────────────────────────────

  if (!isValidId) {
    return (
      <SafeAreaView style={s.container}>
        <ScrollView contentContainerStyle={s.errorScroll}>
          <Tent size={48} color={colors.mutedForeground} />
          <Text style={s.errorTitle}>Invalid camp link</Text>
          <Text style={s.muted}>
            That link doesn't look right. Double-check the URL or browse our camp directory.
          </Text>
          <Button
            onPress={() => navigation.navigate('CampDiscovery' as never)}
            leftIcon={<ArrowLeft size={16} color={colors.primaryForeground} />}
          >
            Browse camps
          </Button>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (isLoading) {
    return (
      <SafeAreaView style={s.container}>
        <View style={s.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (isError || !camp) {
    return (
      <SafeAreaView style={s.container}>
        <ScrollView contentContainerStyle={s.errorScroll}>
          <Tent size={48} color={colors.mutedForeground} />
          <Text style={s.errorTitle}>Camp not found</Text>
          <Text style={s.muted}>
            This camp may have been removed or is no longer accepting registrations.
          </Text>
          <Button
            onPress={() => navigation.goBack()}
            leftIcon={<ArrowLeft size={16} color={colors.primaryForeground} />}
          >
            Back
          </Button>
        </ScrollView>
      </SafeAreaView>
    );
  }

  const c = camp as any;
  const priceLabel = c.is_free ? 'Free' : `$${((c.price_cents ?? 0) / 100).toFixed(2)}`;
  const dateLabel = `${formatDate(c.start_date)}${c.end_date ? ` – ${formatDate(c.end_date)}` : ''}`;
  const isConfirmed = !!confirmedEnrollmentId || isActiveEnrollment;

  const focus = CAMP_SPORT_STAT_FOCUS[c.sport];
  const metrics = getCampSportMetrics(c.sport);
  const sportName = SPORTS_CONFIG[c.sport as SportType]?.name || c.sport;

  const unitLongForm: Record<string, string> = {
    sec: 'seconds (timed)',
    in: 'inches',
    '%': 'percent',
    mph: 'miles per hour',
    yd: 'yards',
    m: 'meters',
    lvl: 'level',
    reps: 'repetitions',
  };

  return (
    <SafeAreaView style={s.container}>
      <ScrollView contentContainerStyle={s.scroll}>
        {/* PORT-PENDING: web rendered <Navbar />; RN uses native stack header. */}

        {/* Top bar */}
        <View style={s.topBar}>
          <Button
            variant="ghost"
            size="sm"
            onPress={() => navigation.goBack()}
            leftIcon={<ArrowLeft size={16} color={colors.foreground} />}
          >
            Back
          </Button>
          <View style={s.topBarRight}>
            {/* PORT-PENDING: SharePreviewModal + CampQRCodeButton */}
            <Button
              variant="outline"
              size="sm"
              onPress={handleCopyLink}
              leftIcon={
                copied ? (
                  <Check size={16} color={colors.foreground} />
                ) : (
                  <Copy size={16} color={colors.foreground} />
                )
              }
            >
              {copied ? 'Copied!' : 'Copy link'}
            </Button>
          </View>
        </View>

        <Card style={s.heroCard}>
          {c.image_url ? (
            <Image source={{ uri: c.image_url }} style={s.heroImage} resizeMode="cover" />
          ) : null}
          <CardHeader>
            <View style={s.headerRow}>
              <View style={{ flex: 1 }}>
                <CardTitle style={s.heroTitle}>{c.name}</CardTitle>
                <CardDescription style={s.heroSubtitle}>
                  <Calendar size={14} color={colors.mutedForeground} />
                  {'  '}
                  {dateLabel}
                </CardDescription>
              </View>
              <View style={s.badgeStack}>
                {c.camp_type ? (
                  <Badge variant="outline">
                    {String(c.camp_type).replace('_', ' ')}
                  </Badge>
                ) : null}
                {capacityFull ? <Badge variant="destructive">At capacity</Badge> : null}
              </View>
            </View>
          </CardHeader>

          <CardContent style={s.cardBody}>
            {/* Quick facts grid */}
            <View style={s.factsGrid}>
              {(c.city || c.state || c.location) && (
                <View style={s.factRow}>
                  <MapPin size={16} color={colors.primary} />
                  <View style={{ flex: 1 }}>
                    {c.location ? <Text style={s.factPrimary}>{c.location}</Text> : null}
                    <Text style={s.muted}>
                      {[c.city, c.state].filter(Boolean).join(', ')}
                    </Text>
                  </View>
                </View>
              )}
              {(c.start_time || c.end_time) && (
                <View style={s.factRow}>
                  <Clock size={16} color={colors.primary} />
                  <Text style={s.factPrimary}>
                    {c.start_time}
                    {c.end_time ? ` – ${c.end_time}` : ''}
                  </Text>
                </View>
              )}
              <View style={s.factRow}>
                <Users size={16} color={colors.primary} />
                <View style={{ flex: 1 }}>
                  <Text style={s.factPrimary}>
                    {enrollmentCount}
                    {c.capacity ? ` / ${c.capacity}` : ''} registered
                  </Text>
                  {capacityFull ? (
                    <Text style={s.destructiveText}>Camp is full</Text>
                  ) : null}
                </View>
              </View>
              <View style={s.factRow}>
                <DollarSign size={16} color={colors.primary} />
                <Text style={s.factPrimary}>{priceLabel}</Text>
              </View>
            </View>

            {c.description ? (
              <View>
                <Text style={s.sectionHeading}>About this camp</Text>
                <Text style={[s.muted, { textAlign: 'left' }]}>{c.description}</Text>
              </View>
            ) : null}

            {Array.isArray(c.positions) && c.positions.length > 0 ? (
              <View>
                <Text style={s.sectionHeading}>Positions evaluated</Text>
                <View style={s.badgeWrap}>
                  {c.positions.map((p: string) => (
                    <Badge key={p} variant="outline">
                      {p}
                    </Badge>
                  ))}
                </View>
              </View>
            ) : null}

            {/* Sport-specific stat focus */}
            {(focus || metrics.length > 0) && (
              <View style={s.statBlock}>
                <View style={s.statHeaderRow}>
                  <View style={s.statHeading}>
                    <Activity size={16} color={colors.primary} />
                    <Text style={s.sectionHeading}>{sportName} stat focus</Text>
                  </View>
                  {focus ? <Badge variant="outline">{focus.label}</Badge> : null}
                </View>

                {focus ? (
                  <View style={{ marginBottom: spacing.md }}>
                    <Text style={s.muted}>Categories evaluated:</Text>
                    <View style={s.badgeWrap}>
                      {focus.stats.map((stat) => (
                        <Badge key={stat} variant="secondary">
                          {stat}
                        </Badge>
                      ))}
                    </View>
                  </View>
                ) : null}

                {metrics.length > 0 ? (
                  <View>
                    <Text style={s.muted}>
                      Measurables you'll be evaluated on (↓ = lower is better)
                    </Text>
                    <View style={s.metricList}>
                      {metrics.map((m) => {
                        const unitLabel = unitLongForm[m.unit] || m.unit;
                        return (
                          <View key={m.key} style={s.metricRow}>
                            <View style={s.metricDot} />
                            <Text style={s.metricLabel} numberOfLines={1}>
                              {m.label}
                            </Text>
                            <View style={s.metricUnitWrap}>
                              <Text style={s.metricUnit}>{m.unit}</Text>
                              {m.lowerIsBetter ? (
                                <Text style={s.metricArrow} accessibilityLabel={unitLabel}>
                                  ↓
                                </Text>
                              ) : null}
                            </View>
                          </View>
                        );
                      })}
                    </View>
                  </View>
                ) : null}
              </View>
            )}

            {/* Enrollment area */}
            <View style={s.enrollBlock}>
              {isConfirmed ? (
                <View style={s.confirmedBox}>
                  <View style={{ alignItems: 'center', gap: spacing.xs }}>
                    <CheckCircle2 size={40} color={colors.primary} />
                    <Text style={s.confirmedHeading}>You're registered!</Text>
                    <Text style={[s.muted, { textAlign: 'center' }]}>
                      A confirmation has been emailed to you. The camp organizer was notified
                      and will follow up with check-in details.
                    </Text>
                  </View>
                  {existingEnrollment ? (
                    <View style={{ alignItems: 'center', marginTop: spacing.sm }}>
                      <Button
                        variant="outline"
                        size="sm"
                        onPress={confirmCancel}
                        loading={cancelEnrollment.isPending}
                        leftIcon={<X size={16} color={colors.foreground} />}
                      >
                        Cancel my registration
                      </Button>
                    </View>
                  ) : null}
                </View>
              ) : capacityFull ? (
                <View style={s.capacityBox}>
                  <View style={{ alignItems: 'center', gap: spacing.xs }}>
                    <Text style={s.capacityHeading}>At capacity</Text>
                    <Text style={[s.muted, { textAlign: 'center' }]}>
                      This camp has reached its registration limit. Join the waitlist and we'll
                      email you the moment a spot opens up.
                    </Text>
                  </View>
                  {waitlistJoined ? (
                    <View style={s.waitlistJoinedRow}>
                      <BellRing size={16} color={colors.primary} />
                      <Text style={[s.factPrimary, { color: colors.primary }]}>
                        You're on the waitlist for this camp.
                      </Text>
                    </View>
                  ) : (
                    <View style={s.waitlistRow}>
                      <Input
                        placeholder="you@email.com"
                        keyboardType="email-address"
                        autoCapitalize="none"
                        value={waitlistEmail}
                        onChangeText={setWaitlistEmail}
                        containerStyle={{ flex: 1 }}
                      />
                      <Button
                        onPress={() => joinWaitlist.mutate()}
                        loading={joinWaitlist.isPending}
                        leftIcon={<BellRing size={16} color={colors.primaryForeground} />}
                      >
                        Notify me
                      </Button>
                    </View>
                  )}
                </View>
              ) : !isAuthenticated ? (
                <View style={{ alignItems: 'center', gap: spacing.sm }}>
                  <Text style={s.muted}>Sign in or create an account to register.</Text>
                  <Button size="lg" onPress={handleEnroll}>
                    Sign in to Register
                  </Button>
                </View>
              ) : (
                <View style={{ gap: spacing.md }}>
                  <Text style={s.sectionHeading}>Athlete details</Text>

                  {serverError ? (
                    <View style={s.alertBox} accessibilityRole="alert">
                      <AlertCircle size={16} color={colors.destructive} />
                      <Text style={s.alertText}>{serverError}</Text>
                    </View>
                  ) : null}

                  <View style={s.fieldGrid}>
                    <View style={s.fieldCell}>
                      <Label>Full name *</Label>
                      <Input
                        value={form.name}
                        maxLength={120}
                        error={fieldErrors.name}
                        onChangeText={(text) => {
                          setForm({ ...form, name: text });
                          if (fieldErrors.name) setFieldErrors((p) => ({ ...p, name: '' }));
                        }}
                      />
                    </View>
                    <View style={s.fieldCell}>
                      <Label>Email *</Label>
                      <Input
                        value={form.email}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        maxLength={255}
                        error={fieldErrors.email}
                        onChangeText={(text) => {
                          setForm({ ...form, email: text });
                          if (fieldErrors.email) setFieldErrors((p) => ({ ...p, email: '' }));
                        }}
                      />
                    </View>
                    <View style={s.fieldCell}>
                      <Label>Grade / Class of</Label>
                      <Input
                        placeholder="e.g. 2026"
                        value={form.grade}
                        maxLength={20}
                        onChangeText={(text) => setForm({ ...form, grade: text })}
                      />
                    </View>
                    <View style={s.fieldCell}>
                      <Label>HUDL link</Label>
                      <Input
                        placeholder="https://hudl.com/..."
                        value={form.hudl}
                        autoCapitalize="none"
                        maxLength={500}
                        error={fieldErrors.hudl}
                        onChangeText={(text) => {
                          setForm({ ...form, hudl: text });
                          if (fieldErrors.hudl) setFieldErrors((p) => ({ ...p, hudl: '' }));
                        }}
                      />
                    </View>
                  </View>

                  <Button
                    size="lg"
                    onPress={handleEnroll}
                    loading={enroll.isPending}
                  >
                    Register Now
                  </Button>
                </View>
              )}

              {!c.is_free && !isConfirmed ? (
                <Text style={[s.muted, { textAlign: 'center', marginTop: spacing.sm }]}>
                  Payment will be coordinated by the camp organizer after registration.
                </Text>
              ) : null}
            </View>
          </CardContent>
        </Card>

        {/* PORT-PENDING: web rendered <Footer />. RN omits a global footer. */}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: spacing.md, paddingBottom: spacing.xxl, gap: spacing.md },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  errorScroll: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    gap: spacing.md,
  },
  errorTitle: {
    fontFamily: typography.fontFamily.heading,
    fontSize: typography.fontSize['2xl'],
    color: colors.foreground,
    textAlign: 'center',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  topBarRight: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  heroCard: { overflow: 'hidden' },
  heroImage: { width: '100%', aspectRatio: 16 / 6, backgroundColor: colors.muted },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  badgeStack: { alignItems: 'flex-end', gap: 6 },
  heroTitle: {
    fontFamily: typography.fontFamily.heading,
    fontSize: typography.heading.h2,
    color: colors.foreground,
  },
  heroSubtitle: {
    marginTop: spacing.xs,
    fontSize: typography.fontSize.base,
    color: colors.mutedForeground,
  },
  cardBody: { gap: spacing.lg },
  factsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  factRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs + 2,
    minWidth: '45%',
    flexBasis: '45%',
    flexGrow: 1,
  },
  factPrimary: {
    fontFamily: typography.fontFamily.bodyMedium,
    fontSize: typography.fontSize.sm,
    color: colors.foreground,
  },
  destructiveText: {
    color: colors.destructive,
    fontSize: typography.fontSize.xs,
  },
  muted: {
    color: colors.mutedForeground,
    fontSize: typography.fontSize.sm,
    lineHeight: typography.fontSize.sm * 1.5,
  },
  sectionHeading: {
    fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: typography.fontSize.base,
    color: colors.foreground,
    marginBottom: spacing.xs,
  },
  badgeWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: spacing.xs },
  statBlock: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.muted,
    padding: spacing.md,
  },
  statHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  statHeading: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  metricList: { gap: spacing.xs, marginTop: spacing.xs },
  metricRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.background,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },
  metricDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary,
  },
  metricLabel: {
    flex: 1,
    fontFamily: typography.fontFamily.bodyMedium,
    fontSize: typography.fontSize.xs,
    color: colors.foreground,
  },
  metricUnitWrap: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metricUnit: {
    fontSize: typography.fontSize.xs,
    color: colors.foreground,
    backgroundColor: colors.muted,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  metricArrow: { color: colors.mutedForeground, fontSize: typography.fontSize.xs },
  enrollBlock: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
    gap: spacing.md,
  },
  confirmedBox: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(231, 175, 8, 0.2)',
    backgroundColor: 'rgba(231, 175, 8, 0.1)',
    padding: spacing.md + 4,
    gap: spacing.sm,
  },
  confirmedHeading: {
    fontFamily: typography.fontFamily.heading,
    fontSize: typography.fontSize.xl,
    color: colors.foreground,
  },
  capacityBox: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(220, 40, 40, 0.3)',
    backgroundColor: 'rgba(220, 40, 40, 0.1)',
    padding: spacing.md + 4,
    gap: spacing.md,
  },
  capacityHeading: {
    fontFamily: typography.fontFamily.heading,
    fontSize: typography.fontSize.xl,
    color: colors.foreground,
  },
  waitlistRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    alignItems: 'center',
  },
  waitlistJoinedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  alertBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(220, 40, 40, 0.4)',
    backgroundColor: 'rgba(220, 40, 40, 0.1)',
    padding: spacing.sm + 4,
  },
  alertText: {
    flex: 1,
    color: colors.destructive,
    fontSize: typography.fontSize.sm,
    lineHeight: typography.fontSize.sm * 1.4,
  },
  fieldGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  fieldCell: { flexBasis: '48%', flexGrow: 1, minWidth: 200, gap: 6 },
});
