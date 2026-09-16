// ParentDashboard — RN port of Lovable src/pages/ParentDashboard.tsx (~563 LOC).
//
// Web → RN adaptations:
//   - react-router-dom navigate          → @react-navigation/native useNavigation
//   - Tailwind className utilities       → StyleSheet
//   - lucide-react                       → lucide-react-native
//   - @/components/ui/* (web shadcn)     → @/components/ui/* (RN ports)
//   - @/hooks/use-toast (web)            → react-native-toast-message
//   - Tabs/Dialog/Select primitives      → existing RN ports under @/components/ui
//   - SEO/Footer head bits dropped (RN)
//
// Feature parity (per subagent task):
//   - Linked athletes list (parent_athlete_relationships ⨝ player_profiles)
//   - Add-linked-athlete form (athlete email → insert relationship row)
//   - Safety panel link → ParentTabs.TrustSafetyTab
//   - COPPA consent status display (under-13 → coppa_parent_verifications row)
//   - Parent-initiated profile delete for under-19 athletes (Lovable parity)
//
// Single-file write per subagent contract.
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  Pressable,
  Alert,
} from 'react-native';
import { useNavigation, NavigationProp, CommonActions } from '@react-navigation/native';
import {
  Shield,
  Users,
  Eye,
  GraduationCap,
  School,
  MapPin,
  Mail,
  Phone,
  Calendar,
  Trash2,
  AlertTriangle,
  UserPlus,
  CheckCircle2,
  XCircle,
  Clock,
  ChevronRight,
} from 'lucide-react-native';
import Toast from 'react-native-toast-message';

import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Navbar } from '@/components/Navbar';
import { BackButton } from '@/components/BackButton';
import { Footer } from '@/components/Footer';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/Dialog';
import { colors, typography, spacing } from '@/lib/theme';
import type { RootStackParamList } from '@/navigation/RootNavigator';

type Nav = NavigationProp<RootStackParamList>;

interface LinkedAthlete {
  id: string;
  user_id: string;
  full_name: string | null;
  profile_image_url: string | null;
  school: string | null;
  graduation_year: string | null;
  is_published: boolean | null;
  custom_url: string | null;
  date_of_birth: string | null;
  sport: string | null;
  position: string | null;
  height: string | null;
  weight: string | null;
  gpa: string | null;
  city: string | null;
  state: string | null;
  email: string | null;
  phone: string | null;
  bio: string | null;
  highlight_video_url: string | null;
  [key: string]: any;
}

interface CoppaStatus {
  athleteId: string;
  required: boolean;        // under 13
  verified: boolean;        // verification row exists & accepted
  pendingSince: string | null;
}

function calculateAge(dob: string | null): number | null {
  if (!dob) return null;
  const birth = new Date(dob);
  if (isNaN(birth.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

const toast = {
  success: (title: string, description?: string) =>
    Toast.show({ type: 'success', text1: title, text2: description }),
  error: (title: string, description?: string) =>
    Toast.show({ type: 'error', text1: title, text2: description }),
};

export default function ParentDashboard() {
  const nav = useNavigation<Nav>();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();

  const [athletes, setAthletes] = useState<LinkedAthlete[]>([]);
  const [coppaByAthlete, setCoppaByAthlete] = useState<Record<string, CoppaStatus>>({});
  const [selectedAthleteId, setSelectedAthleteId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Add-linked-athlete form state
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteSubmitting, setInviteSubmitting] = useState(false);

  // Delete confirmation dialog state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Pending visibility proposals awaiting this parent's decision
  const [pendingProposals, setPendingProposals] = useState<Array<{ id: string; athlete_profile_id: string; proposed_state: string | null; proposed_at: string }>>([]);

  // Redirect to AuthStack if logged out (parity with Lovable navigate('/auth'))
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      nav.dispatch(
        CommonActions.reset({ index: 0, routes: [{ name: 'AuthStack' as any }] })
      );
    }
  }, [authLoading, isAuthenticated, nav]);

  const fetchAthletes = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      // 1) Pull accepted parent↔athlete relationship rows
      const { data: relData, error: relErr } = await supabase
        .from('parent_athlete_relationships')
        .select('athlete_profile_id')
        .eq('parent_user_id', user.id)
        .eq('invitation_accepted', true);
      if (relErr) throw relErr;

      const ids = (relData || []).map((r: any) => r.athlete_profile_id).filter(Boolean);
      if (ids.length === 0) {
        setAthletes([]);
        setCoppaByAthlete({});
        setSelectedAthleteId(null);
        return;
      }

      // 2) Join → player_profiles
      const { data: profiles, error: profErr } = await supabase
        .from('player_profiles')
        .select('*')
        .in('id', ids);
      if (profErr) throw profErr;

      const mapped = (profiles || []) as LinkedAthlete[];
      setAthletes(mapped);
      setSelectedAthleteId((prev) =>
        prev && mapped.some((a) => a.id === prev) ? prev : mapped[0]?.id ?? null
      );

      // 3) Compute COPPA status per athlete (only under-13 require it)
      const under13 = mapped.filter((a) => {
        const age = calculateAge(a.date_of_birth);
        return age !== null && age < 13;
      });
      if (under13.length > 0) {
        const userIds = under13.map((a) => a.user_id);
        const { data: coppaRows } = await supabase
          .from('coppa_parent_verifications' as any)
          .select('athlete_user_id, verified_at, created_at')
          .in('athlete_user_id', userIds);
        const byUser = new Map<string, any>();
        (coppaRows || []).forEach((r: any) => byUser.set(r.athlete_user_id, r));
        const next: Record<string, CoppaStatus> = {};
        mapped.forEach((a) => {
          const age = calculateAge(a.date_of_birth);
          const required = age !== null && age < 13;
          const row = byUser.get(a.user_id);
          next[a.id] = {
            athleteId: a.id,
            required,
            verified: !!row?.verified_at,
            pendingSince: row?.created_at ?? null,
          };
        });
        setCoppaByAthlete(next);
      } else {
        const next: Record<string, CoppaStatus> = {};
        mapped.forEach((a) => {
          next[a.id] = {
            athleteId: a.id,
            required: false,
            verified: false,
            pendingSince: null,
          };
        });
        setCoppaByAthlete(next);
      }
    } catch (err: any) {
      console.error('[ParentDashboard] fetchAthletes failed', err);
      toast.error('Could not load linked athletes', err?.message);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) fetchAthletes();
  }, [user, fetchAthletes]);

  // ─── Pending proposals query ────────────────────────────────────────────────
  const fetchPendingProposals = useCallback(async () => {
    if (!user) return;
    try {
      const { data, error } = await (supabase.from as any)('athlete_visibility_proposals')
        .select('id, athlete_profile_id, proposed_state, proposed_at')
        .eq('awaiting_parent_user_id', user.id)
        .in('status', ['pending', 'pending_parent_invite'])
        .order('proposed_at', { ascending: false });
      if (!error) setPendingProposals(data || []);
    } catch (err) {
      console.error('[ParentDashboard] fetchPendingProposals failed', err);
    }
  }, [user]);

  useEffect(() => {
    if (user) fetchPendingProposals();
  }, [user, fetchPendingProposals]);

  const selectedAthlete = useMemo(
    () => athletes.find((a) => a.id === selectedAthleteId) ?? null,
    [athletes, selectedAthleteId]
  );
  const athleteAge = selectedAthlete ? calculateAge(selectedAthlete.date_of_birth) : null;
  const canDelete = athleteAge !== null && athleteAge < 19;

  // ─── Add-linked-athlete form ────────────────────────────────────────────────
  const handleInviteAthlete = async () => {
    if (!user) return;
    const email = inviteEmail.trim().toLowerCase();
    if (!email || !email.includes('@')) {
      toast.error('Enter a valid athlete email');
      return;
    }
    setInviteSubmitting(true);
    try {
      // Look up athlete profile by email
      const { data: profile, error: lookupErr } = await supabase
        .from('player_profiles')
        .select('id, full_name, email')
        .eq('email', email)
        .maybeSingle();
      if (lookupErr) throw lookupErr;
      if (!profile) {
        toast.error(
          'No athlete found with that email',
          'They must create their OfferHound athlete profile first.'
        );
        return;
      }

      // Insert pending relationship row (mirrors useParentInvitation)
      const { error: insertErr } = await supabase.from('parent_athlete_relationships').insert({
        parent_user_id: user.id,
        athlete_profile_id: profile.id,
        relationship_type: 'parent',
        invitation_email: email,
        invitation_sent_at: new Date().toISOString(),
        invitation_accepted: false,
        invited_by: user.id,
      });
      if (insertErr) {
        if (insertErr.code === '23505') {
          toast.error('Invitation already exists for this athlete');
        } else {
          throw insertErr;
        }
        return;
      }

      toast.success('Invitation sent', `Waiting for ${profile.full_name ?? 'athlete'} to accept.`);
      setInviteEmail('');
      // Note: relationship will appear in list once athlete accepts.
    } catch (err: any) {
      console.error('[ParentDashboard] invite failed', err);
      toast.error('Invite failed', err?.message ?? 'Please try again.');
    } finally {
      setInviteSubmitting(false);
    }
  };

  // ─── Parent-initiated profile delete (under-19 only) ───────────────────────
  const handleDeleteProfile = async () => {
    if (!selectedAthlete || !canDelete) return;
    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('player_profiles')
        .delete()
        .eq('id', selectedAthlete.id);
      if (error) throw error;
      toast.success(
        'Profile deleted',
        `${selectedAthlete.full_name ?? 'Athlete'}'s profile has been permanently deleted.`
      );
      setAthletes((prev) => prev.filter((a) => a.id !== selectedAthlete.id));
      setSelectedAthleteId((prev) => {
        const remaining = athletes.filter((a) => a.id !== prev);
        return remaining[0]?.id ?? null;
      });
      setShowDeleteConfirm(false);
    } catch (err: any) {
      Alert.alert('Delete failed', err?.message ?? 'Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  // ─── Render ─────────────────────────────────────────────────────────────────
  if (authLoading || isLoading) {
    return (
      <SafeAreaView style={s.container}>
        <Navbar />
        <View style={s.loaderWrap}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  const selectedCoppa = selectedAthleteId ? coppaByAthlete[selectedAthleteId] : null;

  return (
    <SafeAreaView style={s.container}>
      <Navbar />
      <ScrollView contentContainerStyle={s.content}>
        <BackButton label="Back" />

        {/* Header */}
        <View style={s.headerRow}>
          <View style={s.headerIcon}>
            <Shield size={22} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <View style={s.headerTitleRow}>
              <Text style={s.h1}>Parent View</Text>
              <Badge variant="secondary">
                <Eye size={10} color={colors.primary} /> Viewer
              </Badge>
            </View>
            <Text style={s.muted}>
              Full visibility into your athlete's recruiting profile
            </Text>
          </View>
        </View>

        {/* Pending visibility-decision banners */}
        {pendingProposals.map((proposal) => {
          const athlete = athletes.find((a) => a.id === proposal.athlete_profile_id);
          return (
            <Pressable
              key={proposal.id}
              style={s.proposalBanner}
              onPress={() =>
                (nav as any).navigate('AuthStack', {
                  screen: 'VisibilityDecision',
                  params: { proposalId: proposal.id },
                })
              }
              accessibilityRole="button"
              accessibilityLabel="Review visibility decision"
            >
              <AlertTriangle size={18} color={colors.primary} />
              <View style={{ flex: 1 }}>
                <Text style={s.proposalBannerTitle}>
                  Visibility decision needed
                </Text>
                <Text style={s.proposalBannerBody}>
                  {athlete?.full_name ?? 'Your athlete'}'s profile is awaiting your
                  approval to become {proposal.proposed_state ?? 'publicly visible'}.
                </Text>
              </View>
              <ChevronRight size={16} color={colors.primary} />
            </Pressable>
          );
        })}

        {/* Athlete switcher (multiple linked) */}
        {athletes.length > 1 && (
          <Card style={{ padding: spacing.sm }}>
            <View style={s.switcherHeader}>
              <Users size={14} color={colors.mutedForeground} />
              <Text style={s.switcherLabel}>Linked athletes</Text>
            </View>
            <View style={s.switcherList}>
              {athletes.map((a) => {
                const active = a.id === selectedAthleteId;
                return (
                  <Pressable
                    key={a.id}
                    style={[s.switcherItem, active && s.switcherItemActive]}
                    onPress={() => setSelectedAthleteId(a.id)}
                  >
                    <Avatar
                      size={28}
                      source={a.profile_image_url ? { uri: a.profile_image_url } : null}
                      fallback={a.full_name ?? '?'}
                    />
                    <Text
                      style={[s.switcherItemText, active && s.switcherItemTextActive]}
                      numberOfLines={1}
                    >
                      {a.full_name ?? 'Athlete'}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </Card>
        )}

        {/* Empty state — no linked athletes */}
        {athletes.length === 0 ? (
          <Card>
            <CardContent style={{ paddingVertical: spacing.xl, alignItems: 'center' }}>
              <Users size={48} color={colors.mutedForeground} style={{ opacity: 0.5 }} />
              <Text style={[s.h2, { marginTop: spacing.md }]}>No connected athletes</Text>
              <Text style={[s.muted, { textAlign: 'center', marginTop: 4 }]}>
                Invite your athlete by email below, or ask them to send you an invitation
                from their dashboard.
              </Text>
            </CardContent>
          </Card>
        ) : (
          selectedAthlete && (
            <>
              {/* Profile summary */}
              <Card>
                <CardContent style={s.profileSummary}>
                  <Avatar
                    size={88}
                    source={
                      selectedAthlete.profile_image_url
                        ? { uri: selectedAthlete.profile_image_url }
                        : null
                    }
                    fallback={selectedAthlete.full_name ?? '?'}
                  />
                  <Text style={s.profileName}>{selectedAthlete.full_name ?? 'Athlete'}</Text>
                  <View style={s.badgeRow}>
                    {selectedAthlete.sport ? <Badge>{selectedAthlete.sport}</Badge> : null}
                    {selectedAthlete.position ? (
                      <Badge variant="outline">{selectedAthlete.position}</Badge>
                    ) : null}
                    <Badge variant={selectedAthlete.is_published ? 'default' : 'outline'}>
                      {selectedAthlete.is_published ? 'Published' : 'Draft'}
                    </Badge>
                    {selectedAthlete.graduation_year ? (
                      <Badge variant="secondary">
                        <GraduationCap size={10} color={colors.foreground} />{' '}
                        {selectedAthlete.graduation_year}
                      </Badge>
                    ) : null}
                  </View>
                </CardContent>
              </Card>

              {/* Profile details */}
              <Card>
                <CardHeader>
                  <CardTitle>Profile details</CardTitle>
                </CardHeader>
                <CardContent style={{ gap: spacing.sm }}>
                  {selectedAthlete.school && (
                    <DetailRow icon={<School size={14} color={colors.mutedForeground} />} label="School" value={selectedAthlete.school} />
                  )}
                  {(selectedAthlete.city || selectedAthlete.state) && (
                    <DetailRow
                      icon={<MapPin size={14} color={colors.mutedForeground} />}
                      label="Location"
                      value={[selectedAthlete.city, selectedAthlete.state].filter(Boolean).join(', ')}
                    />
                  )}
                  {selectedAthlete.height && (
                    <DetailRow icon={<Users size={14} color={colors.mutedForeground} />} label="Height" value={selectedAthlete.height} />
                  )}
                  {selectedAthlete.weight && (
                    <DetailRow icon={<Users size={14} color={colors.mutedForeground} />} label="Weight" value={`${selectedAthlete.weight} lbs`} />
                  )}
                  {selectedAthlete.email && (
                    <DetailRow icon={<Mail size={14} color={colors.mutedForeground} />} label="Email" value={selectedAthlete.email} />
                  )}
                  {selectedAthlete.phone && (
                    <DetailRow icon={<Phone size={14} color={colors.mutedForeground} />} label="Phone" value={selectedAthlete.phone} />
                  )}
                  {selectedAthlete.date_of_birth && athleteAge !== null && (
                    <DetailRow
                      icon={<Calendar size={14} color={colors.mutedForeground} />}
                      label="Age"
                      value={`${athleteAge} years old`}
                    />
                  )}
                  {selectedAthlete.gpa && (
                    <DetailRow icon={<GraduationCap size={14} color={colors.mutedForeground} />} label="GPA" value={String(selectedAthlete.gpa)} />
                  )}
                </CardContent>
              </Card>

              {/* COPPA consent status */}
              {selectedCoppa && (
                <Card>
                  <CardHeader>
                    <CardTitle>COPPA consent</CardTitle>
                    <CardDescription>
                      Required for athletes under 13 — protects your child's data.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {!selectedCoppa.required ? (
                      <View style={s.coppaRow}>
                        <CheckCircle2 size={18} color={colors.mutedForeground} />
                        <Text style={s.muted}>Not required (athlete is 13 or older).</Text>
                      </View>
                    ) : selectedCoppa.verified ? (
                      <View style={s.coppaRow}>
                        <CheckCircle2 size={18} color={colors.primary} />
                        <View style={{ flex: 1 }}>
                          <Text style={s.coppaTitle}>Verified</Text>
                          <Text style={s.muted}>
                            You have completed COPPA parental consent for this athlete.
                          </Text>
                        </View>
                      </View>
                    ) : selectedCoppa.pendingSince ? (
                      <View style={s.coppaRow}>
                        <Clock size={18} color={colors.warning ?? colors.foreground} />
                        <View style={{ flex: 1 }}>
                          <Text style={s.coppaTitle}>Pending verification</Text>
                          <Text style={s.muted}>
                            Check your email — we sent a verification link on{' '}
                            {new Date(selectedCoppa.pendingSince).toLocaleDateString()}.
                          </Text>
                        </View>
                      </View>
                    ) : (
                      <View style={s.coppaRow}>
                        <XCircle size={18} color={colors.destructive} />
                        <View style={{ flex: 1 }}>
                          <Text style={s.coppaTitle}>Action required</Text>
                          <Text style={s.muted}>
                            Your athlete is under 13. Complete COPPA verification to keep
                            their account active.
                          </Text>
                        </View>
                      </View>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Safety panel → TrustSafetyTab */}
              <Pressable
                onPress={() =>
                  nav.navigate('ParentTabs' as any, { screen: 'TrustSafetyTab' } as any)
                }
              >
                <Card>
                  <CardContent style={s.safetyPanel}>
                    <View style={s.safetyIcon}>
                      <Shield size={20} color={colors.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.safetyTitle}>Trust & Safety center</Text>
                      <Text style={s.muted}>
                        Privacy controls, activity alerts, and data protection.
                      </Text>
                    </View>
                    <ChevronRight size={18} color={colors.mutedForeground} />
                  </CardContent>
                </Card>
              </Pressable>

              {/* Danger zone — delete profile (under-19 only, parity with Lovable) */}
              <Card style={s.dangerCard}>
                <CardHeader>
                  <View style={s.row}>
                    <AlertTriangle size={18} color={colors.destructive} />
                    <CardTitle>Danger zone</CardTitle>
                  </View>
                  <CardDescription>
                    Parent controls for {selectedAthlete.full_name ?? "this athlete"}'s profile.
                  </CardDescription>
                </CardHeader>
                <CardContent style={{ gap: spacing.sm }}>
                  {canDelete ? (
                    <>
                      <Text style={s.muted}>
                        As a parent, you can permanently delete this profile while your
                        athlete is under 19. This cannot be undone.
                      </Text>
                      <Button
                        variant="destructive"
                        size="sm"
                        onPress={() => setShowDeleteConfirm(true)}
                        leftIcon={<Trash2 size={14} color={colors.destructiveForeground} />}
                      >
                        Delete profile
                      </Button>
                    </>
                  ) : (
                    <Text style={s.muted}>
                      {athleteAge === null
                        ? 'Date of birth not set — cannot determine eligibility for profile deletion.'
                        : `Your athlete is ${athleteAge} years old. Profile deletion by parents is only available for athletes under 19.`}
                    </Text>
                  )}
                </CardContent>
              </Card>
            </>
          )
        )}

        {/* Add-linked-athlete form (always available) */}
        <Card>
          <CardHeader>
            <View style={s.row}>
              <UserPlus size={18} color={colors.foreground} />
              <CardTitle>Link another athlete</CardTitle>
            </View>
            <CardDescription>
              Enter your athlete's email to send them a parent-link invitation.
            </CardDescription>
          </CardHeader>
          <CardContent style={{ gap: spacing.sm }}>
            <View style={{ gap: spacing.xs }}>
              <Label>Athlete email</Label>
              <Input
                value={inviteEmail}
                onChangeText={setInviteEmail}
                placeholder="athlete@example.com"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
            <Button
              onPress={handleInviteAthlete}
              disabled={inviteSubmitting || !inviteEmail.trim()}
              loading={inviteSubmitting}
            >
              Send invitation
            </Button>
          </CardContent>
        </Card>
      </ScrollView>
      <Footer />

      {/* Delete confirmation dialog */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent>
          <DialogHeader>
            <View style={s.row}>
              <AlertTriangle size={18} color={colors.destructive} />
              <DialogTitle>Delete athlete profile</DialogTitle>
            </View>
            <DialogDescription>
              You are about to permanently delete{' '}
              {selectedAthlete?.full_name ?? 'this athlete'}'s entire profile, including
              all recruiting data, saved coaches, letters, and media. This cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onPress={() => setShowDeleteConfirm(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onPress={handleDeleteProfile}
              disabled={isDeleting}
              loading={isDeleting}
            >
              Permanently delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SafeAreaView>
  );
}

function DetailRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <View style={s.detailRow}>
      {icon}
      <Text style={s.detailLabel}>{label}:</Text>
      <Text style={s.detailValue} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, gap: spacing.md, paddingBottom: spacing.xxl },
  loaderWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  headerIcon: {
    width: 40, height: 40, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(231,175,8,0.12)',
  },
  headerTitleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  h1: {
    fontFamily: typography.fontFamily.heading, fontSize: typography.fontSize['2xl'],
    color: colors.foreground, letterSpacing: typography.letterSpacing.heading,
  },
  h2: {
    fontFamily: typography.fontFamily.heading, fontSize: typography.fontSize.lg,
    color: colors.foreground, letterSpacing: typography.letterSpacing.heading,
  },
  muted: {
    fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.sm,
    color: colors.mutedForeground, lineHeight: 20,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  switcherHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 4, marginBottom: spacing.xs },
  switcherLabel: {
    fontFamily: typography.fontFamily.bodySemiBold, fontSize: typography.fontSize.xs,
    color: colors.mutedForeground, textTransform: 'uppercase', letterSpacing: 0.5,
  },
  switcherList: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  switcherItem: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
    paddingVertical: 6, paddingHorizontal: spacing.sm,
    borderRadius: 20, borderWidth: 1, borderColor: colors.border,
    backgroundColor: colors.card,
  },
  switcherItemActive: { borderColor: colors.primary, backgroundColor: 'rgba(231,175,8,0.10)' },
  switcherItemText: { fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.sm, color: colors.foreground, maxWidth: 160 },
  switcherItemTextActive: { fontFamily: typography.fontFamily.bodySemiBold, color: colors.primary },
  profileSummary: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.lg },
  profileName: {
    fontFamily: typography.fontFamily.heading, fontSize: typography.fontSize.xl,
    color: colors.foreground, letterSpacing: typography.letterSpacing.heading,
  },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, justifyContent: 'center' },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  detailLabel: { fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.sm, color: colors.mutedForeground },
  detailValue: { fontFamily: typography.fontFamily.bodySemiBold, fontSize: typography.fontSize.sm, color: colors.foreground, flex: 1 },
  coppaRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  coppaTitle: { fontFamily: typography.fontFamily.bodySemiBold, fontSize: typography.fontSize.sm, color: colors.foreground },
  safetyPanel: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md },
  safetyIcon: {
    width: 40, height: 40, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(231,175,8,0.12)',
  },
  safetyTitle: { fontFamily: typography.fontFamily.bodySemiBold, fontSize: typography.fontSize.base, color: colors.foreground },
  dangerCard: { borderColor: 'rgba(220,40,40,0.4)' },
  proposalBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: `${colors.primary}12`,
    borderWidth: 1,
    borderColor: `${colors.primary}40`,
    borderRadius: 12,
    padding: spacing.md,
  },
  proposalBannerTitle: {
    fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: typography.fontSize.sm,
    color: colors.foreground,
  },
  proposalBannerBody: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.xs,
    color: colors.mutedForeground,
    marginTop: 2,
    lineHeight: 16,
  },
});
