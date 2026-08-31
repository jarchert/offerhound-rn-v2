// AthleteProfileEditScreen — RN equivalent of Lovable's deep profile editor
// (offerhound-repo/src/pages/Onboarding.tsx + ProfileManagement.tsx).
//
// Composes all of the athlete editing components in tabbed sections:
//   • Photos & Media: profile, banner, gallery, highlight video, family,
//                     hero background, footer
//   • Sports & Stats: SportSelector (multi) + SportStatsEditor (per primary sport)
//   • References:    CoachReferencesManager
//   • Hudl & Links:  HudlImportButton + Twitter/Instagram inputs
//   • Share & Publish: QRShareCard + publish toggle gated by PublishPaywallDialog
//
// Persists to player_profiles via supabase. Reads via usePlayerProfile.
import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ChevronLeft, Save } from 'lucide-react-native';

import { useAuth } from '@/contexts/AuthContext';
import { usePlayerProfile } from '@/hooks/usePlayerProfile';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { AlertTriangle } from 'lucide-react-native';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Switch } from '@/components/ui/Switch';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Separator } from '@/components/ui/Separator';

import { AthleteProfileImageUpload } from '@/components/AthleteProfileImageUpload';
import { BannerImageUpload } from '@/components/BannerImageUpload';
import { GalleryImageManager } from '@/components/GalleryImageManager';
import { HighlightVideoUpload } from '@/components/HighlightVideoUpload';
import { FamilyImageUpload } from '@/components/FamilyImageUpload';
import { HeroBackgroundImageUpload } from '@/components/HeroBackgroundImageUpload';
import { FooterImageUpload } from '@/components/FooterImageUpload';
import { SportSelector } from '@/components/SportSelector';
import { SportStatsEditor, measurableMirrorFromStats } from '@/components/SportStatsEditor';
import { CoachReferencesManager } from '@/components/CoachReferencesManager';
import { HudlImportButton } from '@/components/HudlImportButton';
import { PublishPaywallDialog } from '@/components/PublishPaywallDialog';
import { QRShareCard } from '@/components/QRShareCard';

import { SportType } from '@/lib/data/sports';
import { colors, typography, spacing } from '@/lib/theme';

type Section = 'media' | 'sports' | 'references' | 'links' | 'share';

export default function AthleteProfileEditScreen() {
  const nav = useNavigation<any>();
  const { user } = useAuth();
  const { profile, updateProfile } = usePlayerProfile();
  const { toast } = useToast();

  const [section, setSection] = useState<Section>('media');
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [paywallOpen, setPaywallOpen] = useState(false);

  // Minor-Safe: when is_minor_safe is set (under-13, parent-created profile),
  // bio, video, stats, socials, custom URL, and publish are all hidden/blocked.
  const isMinorSafe = !!(profile as any)?.is_minor_safe;

  // Local form state mirrors the persisted profile.
  const [form, setForm] = useState<any>({});
  useEffect(() => {
    if (!profile) return;
    setForm({
      profile_image_url: (profile as any).profile_image_url || null,
      banner_image_url: (profile as any).banner_image_url || null,
      family_image_url: (profile as any).family_image_url || null,
      action_image_url: (profile as any).action_image_url || null,
      footer_image_url: (profile as any).footer_image_url || null,
      highlight_video_url: (profile as any).highlight_video_url || null,
      gallery_images: (profile as any).gallery_images || [],
      sports: (profile as any).sports || (profile.sport ? [profile.sport] : []),
      sport_stats: (profile as any).sport_stats || {},
      hudl_url: (profile as any).hudl_url || '',
      maxpreps_url: (profile as any).maxpreps_url || '',
      twitter_url: (profile as any).twitter_url || '',
      instagram_url: (profile as any).instagram_url || '',
      custom_url: profile.custom_url || '',
      is_published: !!profile.is_published,
    });
  }, [profile]);

  const primarySport = useMemo<SportType>(
    () => (form.sports?.[0] as SportType) || (profile?.sport as SportType) || 'football',
    [form.sports, profile?.sport]
  );
  const athleteId = profile?.id;
  const athleteName = profile?.full_name || 'Athlete';

  const updateField = (patch: Record<string, any>) => setForm((prev: any) => ({ ...prev, ...patch }));

  const handleSave = async () => {
    if (!athleteId) return;
    setSaving(true);
    try {
      const updates: any = {
        sports: form.sports,
        sport: form.sports?.[0] || null,
        sport_stats: form.sport_stats,
        hudl_url: form.hudl_url || null,
        maxpreps_url: form.maxpreps_url || null,
        twitter_url: form.twitter_url || null,
        instagram_url: form.instagram_url || null,
        custom_url: form.custom_url || null,
        ...measurableMirrorFromStats(form.sport_stats),
      };
      await updateProfile(updates);
      toast({ title: 'Profile saved' });
    } catch (err: any) {
      toast({
        title: 'Save failed',
        description: err?.message,
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handlePublishToggle = async (next: boolean) => {
    if (!athleteId) return;
    // Minor-Safe: publishing blocked until parent consent clears the flag.
    if (next && isMinorSafe) {
      toast({
        title: 'Profile cannot be published',
        description: 'This profile is protected for an athlete under 13. A parent must complete the consent process before the profile can be made public.',
        variant: 'destructive',
      });
      return;
    }
    if (next && !(profile as any)?.subscription_active) {
      // Open paywall — actual paywall flow handled there.
      setPaywallOpen(true);
      return;
    }
    updateField({ is_published: next });
    try {
      const { error } = await supabase
        .from('player_profiles')
        .update({ is_published: next })
        .eq('id', athleteId);
      if (error) throw error;
      toast({ title: next ? 'Profile published!' : 'Profile unpublished' });
    } catch (err: any) {
      updateField({ is_published: !next });
      toast({ title: 'Failed', description: err?.message, variant: 'destructive' });
    }
  };

  const refreshing_ = refreshing;
  const onRefresh = async () => {
    setRefreshing(true);
    try {
      // usePlayerProfile invalidates via mutations; here just simulate a brief reload
      await new Promise((r) => setTimeout(r, 250));
    } finally {
      setRefreshing(false);
    }
  };

  if (!user || !profile || !athleteId) {
    return (
      <SafeAreaView style={s.container}>
        <View style={s.loadingWrap}>
          <ActivityIndicator color={colors.primary} />
          <Text style={s.loadingText}>Loading profile…</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.container}>
      <View style={s.topBar}>
        <Button variant="ghost" size="sm" onPress={() => nav.goBack()} leftIcon={<ChevronLeft size={16} color={colors.foreground} />}>
          Back
        </Button>
        <Text style={s.topTitle}>Edit Profile</Text>
        <Button
          variant="default"
          size="sm"
          onPress={handleSave}
          loading={saving}
          leftIcon={<Save size={14} color={colors.primaryForeground} />}
        >
          Save
        </Button>
      </View>

      <ScrollView
        contentContainerStyle={s.content}
        refreshControl={<RefreshControl refreshing={refreshing_} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {/* Minor-Safe banner */}
        {isMinorSafe && (
          <View style={s.minorSafeBanner}>
            <AlertTriangle size={16} color={colors.destructive} />
            <View style={{ flex: 1 }}>
              <Text style={s.minorSafeTitle}>Minor-Safe Profile</Text>
              <Text style={s.minorSafeBody}>
                This athlete is under 13. Bio, stats, videos, social links, and contact info are hidden until a parent completes the consent process.
              </Text>
            </View>
          </View>
        )}

        <Tabs value={section} onValueChange={(v) => setSection(v as Section)}>
          <TabsList>
            <TabsTrigger value="media">Media</TabsTrigger>
            <TabsTrigger value="sports">Sports</TabsTrigger>
            <TabsTrigger value="references">References</TabsTrigger>
            <TabsTrigger value="links">Links</TabsTrigger>
            <TabsTrigger value="share">Share</TabsTrigger>
          </TabsList>

          {/* ────────────────────── PHOTOS & MEDIA ────────────────────── */}
          <TabsContent value="media">
            <View style={s.sectionStack}>
              <Card>
                <CardHeader>
                  <CardTitle>Profile Photo</CardTitle>
                </CardHeader>
                <CardContent>
                  <AthleteProfileImageUpload
                    athleteId={athleteId}
                    currentImageUrl={form.profile_image_url}
                    athleteName={athleteName}
                    onImageUpdated={(url) => updateField({ profile_image_url: url })}
                    isMinorSafe={isMinorSafe}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Banner Image</CardTitle>
                </CardHeader>
                <CardContent>
                  <BannerImageUpload
                    athleteId={athleteId}
                    currentImageUrl={form.banner_image_url}
                    onImageUpdated={(url) => updateField({ banner_image_url: url })}
                    isMinorSafe={isMinorSafe}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Photo Gallery</CardTitle>
                </CardHeader>
                <CardContent>
                  <GalleryImageManager
                    athleteId={athleteId}
                    galleryImages={form.gallery_images}
                    onImagesUpdated={(images) => updateField({ gallery_images: images })}
                    isMinorSafe={isMinorSafe}
                  />
                </CardContent>
              </Card>

              {/* Minor-Safe: highlight video hidden for under-13 */}
              {!isMinorSafe && (
                <Card>
                  <CardHeader>
                    <CardTitle>Highlight Video</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <HighlightVideoUpload
                      athleteId={athleteId}
                      currentVideoUrl={form.highlight_video_url}
                      onVideoUpdated={(url) => updateField({ highlight_video_url: url })}
                    />
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader>
                  <CardTitle>Family Photo</CardTitle>
                </CardHeader>
                <CardContent>
                  <FamilyImageUpload
                    athleteId={athleteId}
                    currentImageUrl={form.family_image_url}
                    onImageUpdated={(url) => updateField({ family_image_url: url })}
                    isMinorSafe={isMinorSafe}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Hero Background</CardTitle>
                </CardHeader>
                <CardContent>
                  <HeroBackgroundImageUpload
                    athleteId={athleteId}
                    currentImageUrl={form.action_image_url}
                    onImageUpdated={(url) => updateField({ action_image_url: url })}
                    isMinorSafe={isMinorSafe}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Footer Image</CardTitle>
                </CardHeader>
                <CardContent>
                  <FooterImageUpload
                    athleteId={athleteId}
                    currentImageUrl={form.footer_image_url}
                    onImageUpdated={(url) => updateField({ footer_image_url: url })}
                    isMinorSafe={isMinorSafe}
                  />
                </CardContent>
              </Card>
            </View>
          </TabsContent>

          {/* ────────────────────── SPORTS & STATS ────────────────────── */}
          <TabsContent value="sports">
            <View style={s.sectionStack}>
              <Card>
                <CardHeader>
                  <CardTitle>Your Sports</CardTitle>
                </CardHeader>
                <CardContent>
                  <Text style={s.helper}>
                    Pick up to 3 sports. The first one is your primary sport for matches and stats.
                  </Text>
                  <View style={{ height: spacing.sm }} />
                  <SportSelector
                    mode="multi"
                    selectedSports={form.sports || []}
                    onSportsChange={(sports) => updateField({ sports })}
                    max={3}
                  />
                </CardContent>
              </Card>

              {/* Minor-Safe: measurable stats hidden for under-13 */}
              {!isMinorSafe ? (
                <Card>
                  <CardHeader>
                    <CardTitle>Stats — {primarySport}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <SportStatsEditor
                      sport={primarySport}
                      value={form.sport_stats || {}}
                      onChange={(next) => updateField({ sport_stats: next })}
                    />
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent>
                    <Text style={s.helper}>Stats and measurables are not available for athletes under 13. A parent can unlock this section after completing the consent process.</Text>
                  </CardContent>
                </Card>
              )}
            </View>
          </TabsContent>

          {/* ────────────────────── REFERENCES ────────────────────── */}
          <TabsContent value="references">
            <View style={s.sectionStack}>
              <CoachReferencesManager profileId={athleteId} />
            </View>
          </TabsContent>

          {/* ────────────────────── HUDL & LINKS ────────────────────── */}
          <TabsContent value="links">
            <View style={s.sectionStack}>
              <Card>
                <CardHeader>
                  <CardTitle>HUDL / MaxPreps</CardTitle>
                </CardHeader>
                <CardContent>
                  <View style={{ gap: spacing.sm }}>
                    <Input
                      label="HUDL URL"
                      value={form.hudl_url}
                      onChangeText={(t) => updateField({ hudl_url: t })}
                      placeholder="https://www.hudl.com/profile/..."
                      autoCapitalize="none"
                    />
                    <Input
                      label="MaxPreps URL"
                      value={form.maxpreps_url}
                      onChangeText={(t) => updateField({ maxpreps_url: t })}
                      placeholder="https://www.maxpreps.com/athlete/..."
                      autoCapitalize="none"
                    />
                    <HudlImportButton
                      currentHudlUrl={form.hudl_url}
                      currentMaxPrepsUrl={form.maxpreps_url}
                      onImport={({ hudlUrl, maxprepsUrl }) =>
                        updateField({
                          hudl_url: hudlUrl ?? form.hudl_url,
                          maxpreps_url: maxprepsUrl ?? form.maxpreps_url,
                        })
                      }
                    />
                  </View>
                </CardContent>
              </Card>

              {/* Minor-Safe: social links hidden for under-13 */}
              {!isMinorSafe && (
                <Card>
                  <CardHeader>
                    <CardTitle>Social Links</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <View style={{ gap: spacing.sm }}>
                      <Input
                        label="Twitter / X URL"
                        value={form.twitter_url}
                        onChangeText={(t) => updateField({ twitter_url: t })}
                        placeholder="https://x.com/..."
                        autoCapitalize="none"
                      />
                      <Input
                        label="Instagram URL"
                        value={form.instagram_url}
                        onChangeText={(t) => updateField({ instagram_url: t })}
                        placeholder="https://instagram.com/..."
                        autoCapitalize="none"
                      />
                    </View>
                  </CardContent>
                </Card>
              )}
            </View>
          </TabsContent>

          {/* ────────────────────── SHARE & PUBLISH ────────────────────── */}
          <TabsContent value="share">
            <View style={s.sectionStack}>
              {/* Minor-Safe: custom URL and QR removed for under-13 — no public profile until consent */}
              {!isMinorSafe && (
                <>
                  <Card>
                    <CardHeader>
                      <CardTitle>Custom URL</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Input
                        label="Profile Slug"
                        value={form.custom_url}
                        onChangeText={(t) => updateField({ custom_url: t.replace(/[^a-z0-9-]/gi, '').toLowerCase() })}
                        placeholder="jordan-brown"
                        autoCapitalize="none"
                      />
                      <Text style={s.helper}>
                        Your public profile will be at offerhound.com/athlete/{form.custom_url || '<slug>'}
                      </Text>
                    </CardContent>
                  </Card>

                  <QRShareCard customUrl={form.custom_url} athleteName={athleteName} />
                </>
              )}

              <Card>
                <CardHeader>
                  <CardTitle>Publish</CardTitle>
                </CardHeader>
                <CardContent>
                  {isMinorSafe ? (
                    <View style={s.minorSafeBanner}>
                      <AlertTriangle size={14} color={colors.destructive} />
                      <Text style={[s.minorSafeBody, { flex: 1 }]}>
                        Publishing is locked for athletes under 13. A parent must complete the consent process to unlock.
                      </Text>
                    </View>
                  ) : (
                    <View style={s.publishRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={s.publishTitle}>
                          {form.is_published ? 'Profile is live' : 'Profile is private'}
                        </Text>
                        <Text style={s.helper}>
                          {form.is_published
                            ? 'Coaches can find you in search and see your full profile.'
                            : 'Toggle on to make your profile visible. Subscription required.'}
                        </Text>
                      </View>
                      <Switch value={!!form.is_published} onValueChange={handlePublishToggle} />
                    </View>
                  )}
                  {!isMinorSafe && (
                    <>
                      <Separator />
                      <Button
                        variant="default"
                        onPress={handleSave}
                        loading={saving}
                        style={{ marginTop: spacing.sm }}
                      >
                        Save All Changes
                      </Button>
                    </>
                  )}
                </CardContent>
              </Card>
            </View>
          </TabsContent>
        </Tabs>

        <View style={{ height: spacing.xl }} />
      </ScrollView>

      <PublishPaywallDialog open={paywallOpen} onOpenChange={setPaywallOpen} />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.background,
  },
  topTitle: {
    fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: typography.fontSize.lg,
    color: colors.foreground,
  },
  content: { padding: spacing.md, gap: spacing.md },
  sectionStack: { gap: spacing.md, marginTop: spacing.md },
  helper: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.xs,
    color: colors.mutedForeground,
  },
  publishRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  publishTitle: {
    fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: typography.fontSize.base,
    color: colors.foreground,
    marginBottom: 2,
  },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  loadingText: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.sm,
    color: colors.mutedForeground,
  },
  minorSafeBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
    backgroundColor: `${colors.destructive}15`,
    borderWidth: 1,
    borderColor: colors.destructive,
    borderRadius: 8,
    padding: spacing.sm,
    marginBottom: spacing.xs,
  },
  minorSafeTitle: {
    fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: typography.fontSize.sm,
    color: colors.destructive,
    marginBottom: 2,
  },
  minorSafeBody: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.xs,
    color: colors.mutedForeground,
    lineHeight: 18,
  },
});
