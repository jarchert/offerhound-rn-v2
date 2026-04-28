// CoachOnboardingScreen — RN port of Lovable src/pages/CoachOnboarding.tsx (560 LOC).
// 3-branch wizard: College / High School / Club coach. Each branch has its own
// step list and submit path. Source-of-truth field shape preserved verbatim.
import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, SafeAreaView, ActivityIndicator, Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { CheckCircle, GraduationCap, Users, School } from 'lucide-react-native';
import { useQueryClient } from '@tanstack/react-query';

import { BackButton } from '@/components/BackButton';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Textarea } from '@/components/ui/Textarea';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useCoachProfile, useCreateCoachProfile } from '@/hooks/useCoachProfile';
import { useUpdateCoachProfile } from '@/hooks/useUpdateCoachProfile';
import { supabase } from '@/integrations/supabase/client';
import { colors, typography, spacing } from '@/lib/theme';
import type { OnboardingStackParamList } from '@/navigation/stacks/OnboardingStack';
import type { RootStackParamList } from '@/navigation/RootNavigator';

type Nav = NativeStackNavigationProp<OnboardingStackParamList & RootStackParamList>;
type CoachType = 'college' | 'club' | 'highschool';

const DIVISIONS = ['D1', 'D2', 'D3', 'NAIA', 'JUCO', 'NJCAA'];
const SPORTS = ['football', 'basketball', 'baseball', 'soccer', 'softball', 'volleyball', 'track', 'swimming', 'tennis', 'golf', 'lacrosse', 'wrestling', 'hockey'];
const CLUB_TYPES = ['club', 'little_league', 'amateur', 'recreational', 'travel', 'academy', 'aau', 'private'];
const TEAM_LEVELS = ['recreational', 'competitive', 'elite', 'academy', 'select', 'travel', 'premier'];

const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA',
  'ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK',
  'OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY',
];

const HS_CLASSIFICATIONS = [
  '1A', '2A', '3A', '4A', '5A', '6A', '7A',
  'Class A', 'Class AA', 'Class AAA', 'Class AAAA', 'Class AAAAA', 'Class AAAAAA',
  'Division I', 'Division II', 'Division III', 'Division IV', 'Division V',
  'Group I', 'Group II', 'Group III', 'Group IV', 'Group V',
  'Small School', 'Large School',
];

function getSteps(coachType: CoachType): string[] {
  switch (coachType) {
    case 'college': return ['Personal Info', 'Coach Type', 'School & Position', 'Review'];
    case 'club': return ['Personal Info', 'Coach Type', 'Club Details', 'Club Location', 'Review'];
    case 'highschool': return ['Personal Info', 'Coach Type', 'School Details', 'Review'];
    default: return ['Personal Info', 'Coach Type'];
  }
}

const cap = (s?: string) => (s || '').replace(/_/g, ' ');

export default function CoachOnboardingScreen() {
  const nav = useNavigation<Nav>();
  const queryClient = useQueryClient();
  const { user, isLoading: authLoading } = useAuth();
  const isAuthenticated = !!user;
  const { data: existingProfile, isLoading: profileLoading } = useCoachProfile() as any;
  const createProfile = useCreateCoachProfile() as any;
  const updateProfile = useUpdateCoachProfile() as any;

  // PORT-PENDING: route params for invitation ref_token / coach_type are not yet
  // wired through the RN navigator. Web reads ?ref_token / ?coach_type from URL.
  const refToken: string | null = null;
  const refCoachTypeParam: CoachType | null = null;

  const [step, setStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [coachType, setCoachType] = useState<CoachType | null>(
    refCoachTypeParam && ['college', 'club', 'highschool'].includes(refCoachTypeParam) ? refCoachTypeParam : null,
  );

  const [form, setForm] = useState({
    name: '', title: '', email: user?.email || '', phone: '',
    sport: 'football', bio: '', twitter: '',
    // College
    school: '', conference: '', division: 'D1', position_coached: '',
    // Club
    club_name: '', club_description: '', club_type: 'club',
    city: '', state: '', country: 'US', website: '',
    team_level: 'competitive', age_group: '', years_coaching: '',
    league_association: '', team_slogan: '',
    // HS
    school_name: '', school_city: '', school_state: '',
    school_district: '', school_classification: '',
    conference_name: '', team_mascot: '', career_record: '',
    hs_position_coached: 'Head Coach', hs_years_coaching: '',
    hs_years_at_school: '', hs_website: '',
  });

  const update = (key: string, value: string) => setForm(f => ({ ...f, [key]: value }));

  const STEPS = useMemo(() => (coachType ? getSteps(coachType) : ['Personal Info', 'Coach Type']), [coachType]);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      // Auth lives in AuthStack; getParent() escapes the OnboardingStack.
      nav.getParent()?.reset({ index: 0, routes: [{ name: 'AuthStack' as any }] });
    }
  }, [authLoading, isAuthenticated, nav]);

  useEffect(() => {
    if (!authLoading && !profileLoading && existingProfile) {
      nav.getParent()?.reset({ index: 0, routes: [{ name: 'CoachTabs' as any }] });
    }
  }, [authLoading, profileLoading, existingProfile, nav]);

  useEffect(() => {
    if (user?.email && !form.email) update('email', user.email);
  }, [user?.email]); // eslint-disable-line react-hooks/exhaustive-deps

  // Prefill from coach_references invitation if a refToken arrived (no-op until route params land).
  useEffect(() => {
    if (!refToken) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('coach_references')
        .select('coach_name, coach_email, coach_school, coach_title')
        .eq('invitation_token', refToken)
        .maybeSingle();
      if (cancelled || !data) return;
      setForm(f => ({
        ...f,
        name: f.name || (data as any).coach_name || '',
        email: f.email || (data as any).coach_email || '',
        title: f.title || (data as any).coach_title || '',
        school: f.school || (data as any).coach_school || '',
        school_name: f.school_name || (data as any).coach_school || '',
        club_name: f.club_name || (data as any).coach_school || '',
      }));
      toast({ title: 'Welcome', description: 'Your athlete invited you. Profile prefilled from their reference request.' });
    })();
    return () => { cancelled = true; };
  }, [refToken]);

  const acceptReferralIfPresent = async () => {
    if (!refToken || !user) return;
    try {
      await supabase
        .from('coach_references')
        .update({ invitation_status: 'accepted_onboarded' })
        .eq('invitation_token', refToken);
    } catch (err) {
      console.error('Failed to mark referral accepted', err);
    }
  };

  const handleSubmit = async () => {
    if (!user || !coachType) return;
    setIsSubmitting(true);
    try {
      if (coachType === 'highschool') {
        const { error } = await supabase
          .from('high_school_coach_profiles')
          .insert({
            user_id: user.id,
            name: form.name,
            title: form.title,
            email: form.email,
            phone: form.phone || null,
            sport: form.sport,
            bio: form.bio || null,
            twitter: form.twitter || null,
            school_name: form.school_name,
            school_city: form.school_city || null,
            school_state: form.school_state || null,
            school_district: form.school_district || null,
            school_classification: form.school_classification || null,
            conference_name: form.conference_name || null,
            position_coached: form.hs_position_coached || 'Head Coach',
            team_mascot: form.team_mascot || null,
            career_record: form.career_record || null,
            years_coaching: form.hs_years_coaching ? parseInt(form.hs_years_coaching, 10) : null,
            years_at_school: form.hs_years_at_school ? parseInt(form.hs_years_at_school, 10) : null,
            website: form.hs_website || null,
            is_published: true,
          } as any);
        if (error) throw error;
        await supabase.from('user_roles').upsert({ user_id: user.id, role: 'high_school_coach' as any }, { onConflict: 'user_id' }).select();
        await acceptReferralIfPresent();
        toast({ title: 'High School Coach profile created!' });
        nav.getParent()?.reset({ index: 0, routes: [{ name: 'HSCoachTabs' as any }] });
      } else {
        const coachData =
          coachType === 'club'
            ? {
                name: form.name, title: form.title, email: form.email,
                phone: form.phone || null, bio: form.bio || null, twitter: form.twitter || null,
                sport: form.sport,
                school: form.club_name || 'Club',
                conference: form.league_association || 'Independent Club',
                division: 'Club' as any,
                position_coached: form.title || 'Head Coach',
                is_club_coach: true,
              }
            : {
                name: form.name, title: form.title, email: form.email,
                phone: form.phone || null, school: form.school, conference: form.conference,
                division: form.division, position_coached: form.position_coached,
                sport: form.sport, bio: form.bio || null, twitter: form.twitter || null,
              };

        let coachProfile: any;
        if (existingProfile) {
          await updateProfile.mutateAsync(coachData);
          coachProfile = existingProfile;
          toast({ title: 'Coach profile updated!' });
        } else {
          coachProfile = await createProfile.mutateAsync(coachData);
          toast({ title: 'Coach profile created!' });
        }

        if (coachType === 'club' && coachProfile?.id) {
          const { error: clubError } = await supabase
            .from('club_coach_profiles')
            .insert({
              user_id: user.id,
              coach_profile_id: coachProfile.id,
              club_name: form.club_name,
              club_description: form.club_description || null,
              club_type: form.club_type,
              sport: form.sport,
              city: form.city || null,
              state: form.state || null,
              country: form.country || 'US',
              website: form.website || null,
              team_level: form.team_level || null,
              age_group: form.age_group || null,
              years_coaching: form.years_coaching ? parseInt(form.years_coaching, 10) : null,
              league_association: form.league_association || null,
              team_slogan: form.team_slogan || null,
            } as any);
          if (clubError) {
            console.error('Club profile error:', clubError);
            toast({ title: 'Saved', description: 'Coach profile created, but club details failed to save. You can update them in settings.', variant: 'destructive' });
          } else {
            await supabase.from('user_roles').upsert({ user_id: user.id, role: 'club_coach' as any }, { onConflict: 'user_id' }).select();
            toast({ title: 'Club Coach profile activated!' });
          }
        }

        await queryClient.refetchQueries({ queryKey: ['coach-profile', user.id] });
        await acceptReferralIfPresent();
        const target = coachType === 'club' ? 'ClubCoachTabs' : 'CoachTabs';
        nav.getParent()?.reset({ index: 0, routes: [{ name: target as any }] });
      }
    } catch (e: any) {
      toast({ title: 'Error', description: e?.message || 'Failed to save profile', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading || profileLoading) {
    return (
      <SafeAreaView style={[s.safe, { alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator color={colors.primary} />
      </SafeAreaView>
    );
  }
  if (existingProfile) return null;

  const lastStepIndex = STEPS.length - 1;
  const isReviewStep = step === lastStepIndex && coachType !== null;

  // Type cards (Step 1)
  const typeCards: Array<{ key: CoachType; Icon: any; title: string; desc: string; chips: string[] }> = [
    { key: 'college', Icon: GraduationCap, title: 'College Coach', desc: 'NCAA, NAIA, JUCO — recruit athletes to your college program', chips: ['Recruiting Pipeline', 'Athlete Search', 'Letters'] },
    { key: 'highschool', Icon: School, title: 'High School Coach', desc: 'Manage your roster, refer athletes to college programs, and connect with recruiters', chips: ['Roster Management', 'College Referrals', 'Recruiter Network'] },
    { key: 'club', Icon: Users, title: 'Club / Travel / Rec Coach', desc: 'Club, AAU, travel, little league, or recreational team management', chips: ['Team Management', 'Parent Invites', 'Event Calendar'] },
  ];

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={s.scroll}>
        <BackButton />
        <Text style={s.h1}>COACH SETUP</Text>
        <Text style={s.sub}>Complete your profile to start recruiting.</Text>

        <View style={s.progress}>
          {STEPS.map((label, i) => (
            <View key={label} style={[s.progressBar, i <= step && s.progressBarActive]} />
          ))}
        </View>

        <Card>
          <CardHeader>
            <CardTitle>{STEPS[step]}</CardTitle>
            <CardDescription>Step {step + 1} of {STEPS.length}</CardDescription>
          </CardHeader>
          <CardContent style={{ gap: spacing.md }}>
            {step === 0 && (
              <>
                <View><Label>Full Name *</Label><Input value={form.name} onChangeText={v => update('name', v)} /></View>
                <View><Label>Title *</Label><Input value={form.title} onChangeText={v => update('title', v)} placeholder="Head Coach" /></View>
                <View><Label>Email *</Label><Input value={form.email} onChangeText={v => update('email', v)} keyboardType="email-address" autoCapitalize="none" /></View>
                <View><Label>Phone</Label><Input value={form.phone} onChangeText={v => update('phone', v)} keyboardType="phone-pad" /></View>
                <View>
                  <Label>Sport *</Label>
                  <Select value={form.sport} onValueChange={v => update('sport', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {SPORTS.map(sp => <SelectItem key={sp} value={sp}>{sp}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </View>
                <View><Label>Bio</Label><Textarea value={form.bio} onChangeText={v => update('bio', v)} placeholder="Tell athletes about your coaching philosophy..." /></View>
                <View><Label>Twitter/X</Label><Input value={form.twitter} onChangeText={v => update('twitter', v)} placeholder="@handle" autoCapitalize="none" /></View>
                <Button onPress={() => setStep(1)} disabled={!form.name || !form.title || !form.email}>Continue</Button>
              </>
            )}

            {step === 1 && (
              <>
                <Text style={s.helperText}>Select the type of coaching you do:</Text>
                <View style={{ gap: spacing.sm }}>
                  {typeCards.map(tc => {
                    const Icon = tc.Icon;
                    const sel = coachType === tc.key;
                    return (
                      <Pressable key={tc.key} onPress={() => setCoachType(tc.key)} style={[s.typeCard, sel && s.typeCardSelected]}>
                        <View style={s.typeIconWrap}><Icon size={20} color={colors.primary} /></View>
                        <View style={{ flex: 1 }}>
                          <Text style={s.typeTitle}>{tc.title}</Text>
                          <Text style={s.typeDesc}>{tc.desc}</Text>
                          <View style={s.chipRow}>
                            {tc.chips.map(c => (
                              <Badge key={c} variant="outline">{c}</Badge>
                            ))}
                          </View>
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
                <View style={s.row}>
                  <Button variant="outline" onPress={() => setStep(0)} style={{ flex: 1 }}>Back</Button>
                  <Button onPress={() => setStep(2)} disabled={!coachType} style={{ flex: 1 }}>Continue</Button>
                </View>
              </>
            )}

            {step === 2 && coachType === 'college' && (
              <>
                <View><Label>School *</Label><Input value={form.school} onChangeText={v => update('school', v)} placeholder="University of..." /></View>
                <View><Label>Conference *</Label><Input value={form.conference} onChangeText={v => update('conference', v)} placeholder="SEC, Big Ten..." /></View>
                <View>
                  <Label>Division *</Label>
                  <Select value={form.division} onValueChange={v => update('division', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{DIVISIONS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                  </Select>
                </View>
                <View><Label>Position Coached *</Label><Input value={form.position_coached} onChangeText={v => update('position_coached', v)} placeholder="Quarterbacks" /></View>
                <View style={s.row}>
                  <Button variant="outline" onPress={() => setStep(1)} style={{ flex: 1 }}>Back</Button>
                  <Button onPress={() => setStep(3)} disabled={!form.school || !form.conference || !form.position_coached} style={{ flex: 1 }}>Continue</Button>
                </View>
              </>
            )}

            {step === 2 && coachType === 'highschool' && (
              <>
                <View><Label>High School Name *</Label><Input value={form.school_name} onChangeText={v => update('school_name', v)} placeholder="Lincoln High School" /></View>
                <View>
                  <Label>State *</Label>
                  <Select value={form.school_state} onValueChange={v => update('school_state', v)}>
                    <SelectTrigger><SelectValue placeholder="Select state" /></SelectTrigger>
                    <SelectContent>{US_STATES.map(st => <SelectItem key={st} value={st}>{st}</SelectItem>)}</SelectContent>
                  </Select>
                </View>
                <View><Label>City *</Label><Input value={form.school_city} onChangeText={v => update('school_city', v)} placeholder="Dallas" /></View>
                <View><Label>District / Parish</Label><Input value={form.school_district} onChangeText={v => update('school_district', v)} placeholder="Dallas ISD" /></View>
                <View>
                  <Label>State Classification / Division</Label>
                  <Select value={form.school_classification} onValueChange={v => update('school_classification', v)}>
                    <SelectTrigger><SelectValue placeholder="Select classification" /></SelectTrigger>
                    <SelectContent>{HS_CLASSIFICATIONS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                </View>
                <View><Label>Conference</Label><Input value={form.conference_name} onChangeText={v => update('conference_name', v)} placeholder="District 6-6A" /></View>
                <View><Label>Position Coached</Label><Input value={form.hs_position_coached} onChangeText={v => update('hs_position_coached', v)} placeholder="Head Coach" /></View>
                <View><Label>Team Mascot</Label><Input value={form.team_mascot} onChangeText={v => update('team_mascot', v)} placeholder="Lions" /></View>
                <View><Label>Career Record</Label><Input value={form.career_record} onChangeText={v => update('career_record', v)} placeholder="120-45" /></View>
                <View><Label>Years Coaching</Label><Input value={form.hs_years_coaching} onChangeText={v => update('hs_years_coaching', v)} keyboardType="number-pad" placeholder="15" /></View>
                <View><Label>Years at This School</Label><Input value={form.hs_years_at_school} onChangeText={v => update('hs_years_at_school', v)} keyboardType="number-pad" placeholder="5" /></View>
                <View><Label>School Website</Label><Input value={form.hs_website} onChangeText={v => update('hs_website', v)} placeholder="https://..." autoCapitalize="none" /></View>
                <View style={s.row}>
                  <Button variant="outline" onPress={() => setStep(1)} style={{ flex: 1 }}>Back</Button>
                  <Button onPress={() => setStep(3)} disabled={!form.school_name || !form.school_state || !form.school_city} style={{ flex: 1 }}>Continue</Button>
                </View>
              </>
            )}

            {step === 2 && coachType === 'club' && (
              <>
                <View>
                  <Label>Club/Organization Type *</Label>
                  <Select value={form.club_type} onValueChange={v => update('club_type', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CLUB_TYPES.map(t => <SelectItem key={t} value={t}>{cap(t)}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </View>
                <View>
                  <Label>Team Level</Label>
                  <Select value={form.team_level} onValueChange={v => update('team_level', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {TEAM_LEVELS.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </View>
                <View><Label>Age Group</Label><Input value={form.age_group} onChangeText={v => update('age_group', v)} placeholder="U16, 14-18, etc." /></View>
                <View><Label>Years Coaching</Label><Input value={form.years_coaching} onChangeText={v => update('years_coaching', v)} keyboardType="number-pad" placeholder="5" /></View>
                <View style={s.row}>
                  <Button variant="outline" onPress={() => setStep(1)} style={{ flex: 1 }}>Back</Button>
                  <Button onPress={() => setStep(3)} style={{ flex: 1 }}>Continue</Button>
                </View>
              </>
            )}

            {step === 3 && coachType === 'club' && (
              <>
                <View><Label>Club/Organization Name *</Label><Input value={form.club_name} onChangeText={v => update('club_name', v)} placeholder="Metro Elite Athletics" /></View>
                <View><Label>City</Label><Input value={form.city} onChangeText={v => update('city', v)} placeholder="Dallas" /></View>
                <View><Label>State</Label><Input value={form.state} onChangeText={v => update('state', v)} placeholder="TX" /></View>
                <View><Label>League/Association</Label><Input value={form.league_association} onChangeText={v => update('league_association', v)} placeholder="AAU, USSSA, etc." /></View>
                <View><Label>Website</Label><Input value={form.website} onChangeText={v => update('website', v)} placeholder="https://..." autoCapitalize="none" /></View>
                <View><Label>Club Description</Label><Textarea value={form.club_description} onChangeText={v => update('club_description', v)} placeholder="Tell families what makes your program special..." /></View>
                <View><Label>Team Slogan</Label><Input value={form.team_slogan} onChangeText={v => update('team_slogan', v)} placeholder="Where champions are made" /></View>
                <View style={s.row}>
                  <Button variant="outline" onPress={() => setStep(2)} style={{ flex: 1 }}>Back</Button>
                  <Button onPress={() => setStep(4)} disabled={!form.club_name} style={{ flex: 1 }}>Continue</Button>
                </View>
              </>
            )}

            {isReviewStep && (
              <>
                <View style={{ gap: spacing.sm }}>
                  {(() => {
                    const rows: Array<[string, string]> = [
                      ['Name', form.name],
                      ['Title', form.title],
                      ['Sport', form.sport],
                    ];
                    if (coachType === 'highschool') {
                      rows.push(
                        ['Profile Type', 'High School Coach'],
                        ['School', form.school_name],
                        ['City, State', [form.school_city, form.school_state].filter(Boolean).join(', ') || '—'],
                        ['District / Parish', form.school_district || '—'],
                        ['Classification', form.school_classification || '—'],
                        ['Conference', form.conference_name || '—'],
                        ['Position Coached', form.hs_position_coached || '—'],
                        ['Team Mascot', form.team_mascot || '—'],
                        ['Career Record', form.career_record || '—'],
                        ['Years Coaching', form.hs_years_coaching || '—'],
                      );
                    } else if (coachType === 'club') {
                      rows.push(
                        ['Profile Type', 'Club Coach'],
                        ['Club Name', form.club_name],
                        ['Club Type', cap(form.club_type)],
                        ['Team Level', form.team_level],
                        ['Location', [form.city, form.state].filter(Boolean).join(', ') || '—'],
                        ['League', form.league_association || '—'],
                        ['Age Group', form.age_group || '—'],
                      );
                    } else {
                      rows.push(
                        ['Profile Type', 'College Coach'],
                        ['School', form.school],
                        ['Conference', form.conference],
                        ['Division', form.division],
                        ['Position', form.position_coached],
                      );
                    }
                    return rows.map(([label, val]) => (
                      <View key={label} style={s.reviewRow}>
                        <Text style={s.reviewKey}>{label}</Text>
                        <Text style={s.reviewVal}>{val || '—'}</Text>
                      </View>
                    ));
                  })()}
                </View>
                <View style={s.row}>
                  <Button variant="outline" onPress={() => setStep(step - 1)} style={{ flex: 1 }}>Back</Button>
                  <Button onPress={handleSubmit} disabled={isSubmitting} style={{ flex: 1 }} leftIcon={<CheckCircle size={16} color={colors.primaryForeground} />}>
                    {isSubmitting ? 'Creating...' : 'Create Profile'}
                  </Button>
                </View>
              </>
            )}
          </CardContent>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: spacing.xl, gap: spacing.md, paddingBottom: spacing.xxxl },
  h1: { fontFamily: typography.fontFamily.heading, fontSize: typography.fontSize['3xl'], color: colors.foreground, letterSpacing: typography.letterSpacing.heading, marginTop: spacing.md },
  sub: { fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.base, color: colors.mutedForeground, marginBottom: spacing.md },
  progress: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  progressBar: { flex: 1, height: 6, borderRadius: 999, backgroundColor: colors.muted },
  progressBarActive: { backgroundColor: colors.primary },
  row: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  helperText: { fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.sm, color: colors.mutedForeground },
  typeCard: { flexDirection: 'row', gap: spacing.md, padding: spacing.md, borderRadius: 12, borderWidth: 2, borderColor: colors.border, backgroundColor: colors.card },
  typeCardSelected: { borderColor: colors.primary, backgroundColor: 'rgba(231,175,8,0.05)' },
  typeIconWrap: { width: 40, height: 40, borderRadius: 999, backgroundColor: 'rgba(231,175,8,0.10)', alignItems: 'center', justifyContent: 'center' },
  typeTitle: { fontFamily: typography.fontFamily.bodySemiBold, fontSize: typography.fontSize.base, color: colors.foreground },
  typeDesc: { fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.xs, color: colors.mutedForeground, marginTop: 2 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: spacing.sm },
  reviewRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
  reviewKey: { fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.sm, color: colors.mutedForeground },
  reviewVal: { fontFamily: typography.fontFamily.bodyMedium, fontSize: typography.fontSize.sm, color: colors.foreground, textTransform: 'capitalize', flexShrink: 1, textAlign: 'right' },
});
