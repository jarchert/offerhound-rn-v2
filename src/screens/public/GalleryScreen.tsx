// Ported from Lovable web src/pages/Gallery.tsx (295 LOC).
// Web → RN translation:
//   - useNavigate → useNavigation().navigate / dispatch
//   - sonner toast → react-native-toast-message via @/components/ui/toast
//   - lucide-react → lucide-react-native
//   - <img>/<video> → <Image>/<Video> (expo-av is not yet wired; using <Image>
//     for thumbnails; full <Video> playback marked PORT-PENDING below)
//   - <div modal> overlay → <Modal> (RN built-in)
//   - <Card>/<Switch>/<Badge>/<Button> mapped to RN @/components/ui
//   - SEO is a no-op shim (RN has no <head>); kept for parity.
//   - PORT-PENDING: MediaShareButtons component does not yet exist in RN.
//     Rendered as a placeholder text fallback. Tracked under
//     session-parity-port.
//   - PORT-PENDING: video playback uses static thumbnails (Image of poster/url)
//     since @/components/ui has no <Video>. Wire expo-av in a follow-up.
import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Image,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { useNavigation, CommonActions } from '@react-navigation/native';
import {
  Camera,
  Grid3X3,
  LayoutGrid,
  X,
  Video,
  Star,
  Check,
  Upload,
  Eye,
  EyeOff,
} from 'lucide-react-native';

import { usePlayerProfile } from '@/hooks/usePlayerProfile';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { BackButton } from '@/components/BackButton';
import { Footer } from '@/components/Footer';
import { PageBreadcrumb } from '@/components/PageBreadcrumb';
import { GalleryImageManager } from '@/components/GalleryImageManager';
import { HighlightVideoUpload } from '@/components/HighlightVideoUpload';
import SEO from '@/components/SEO';
import { Badge, Button, Switch, toast } from '@/components/ui';
import { colors, typography, spacing } from '@/lib/theme';

type MediaItem = {
  id: number;
  src: string;
  title: string;
  category: string;
  type: 'image' | 'video';
};

const categories = [
  { id: 'all', label: 'All Media' },
  { id: 'video', label: 'Videos' },
  { id: 'action', label: 'Photos' },
];

export default function GalleryScreen() {
  const [activeCategory, setActiveCategory] = useState('all');
  const [selectedImage, setSelectedImage] = useState<MediaItem | null>(null);
  const [gridSize, setGridSize] = useState<'compact' | 'large'>('large');
  const [featuredHighlight, setFeaturedHighlight] = useState<number>(0);
  const [isOwnerView] = useState(true);
  const [showHighlightVideo, setShowHighlightVideo] = useState(true);
  const [isTogglingVisibility, setIsTogglingVisibility] = useState(false);

  const { profile, isLoading, fetchProfile } = usePlayerProfile();
  const { user, loading: authLoading } = useAuth();
  const isAuthenticated = !!user;
  const nav = useNavigation<any>();

  useEffect(() => {
    if (profile) {
      setShowHighlightVideo((profile as any).show_highlight_video !== false);
    }
  }, [profile]);

  const handleToggleVideoVisibility = async (visible: boolean) => {
    if (!profile) return;
    setIsTogglingVisibility(true);
    try {
      const { error } = await supabase
        .from('player_profiles')
        .update({ show_highlight_video: visible } as any)
        .eq('id', (profile as any).id);
      if (error) throw error;
      setShowHighlightVideo(visible);
      toast.success(
        visible
          ? 'Video is now visible on your profile'
          : 'Video is now hidden from your profile',
      );
      fetchProfile();
    } catch {
      toast.error('Failed to update video visibility');
    } finally {
      setIsTogglingVisibility(false);
    }
  };

  const galleryItems: MediaItem[] = useMemo(() => {
    if (!profile) return [];
    const p = profile as any;
    const items: MediaItem[] = [];
    let idCounter = 0;
    if (p.highlight_video_url) {
      items.push({ id: idCounter++, src: p.highlight_video_url, title: 'Highlight Reel', category: 'video', type: 'video' });
    }
    if (p.profile_image_url) {
      items.push({ id: idCounter++, src: p.profile_image_url, title: 'Profile Photo', category: 'action', type: 'image' });
    }
    if (p.banner_image_url) {
      items.push({ id: idCounter++, src: p.banner_image_url, title: 'Banner Photo', category: 'action', type: 'image' });
    }
    if (p.action_image_url) {
      items.push({ id: idCounter++, src: p.action_image_url, title: 'Action Shot', category: 'action', type: 'image' });
    }
    if (p.family_image_url) {
      items.push({ id: idCounter++, src: p.family_image_url, title: 'Family Photo', category: 'action', type: 'image' });
    }
    if (p.hero_background_image_url) {
      items.push({ id: idCounter++, src: p.hero_background_image_url, title: 'Hero Background', category: 'action', type: 'image' });
    }
    if (p.footer_image_url) {
      items.push({ id: idCounter++, src: p.footer_image_url, title: 'Footer Image', category: 'action', type: 'image' });
    }
    if (p.gallery_images && Array.isArray(p.gallery_images)) {
      p.gallery_images.forEach((img: any, index: number) => {
        if (img && img.url) {
          items.push({
            id: idCounter++,
            src: img.url,
            title: img.title || `Gallery Photo ${index + 1}`,
            category: 'action',
            type: 'image',
          });
        }
      });
    }
    return items;
  }, [profile]);

  const filteredItems =
    activeCategory === 'all'
      ? galleryItems
      : galleryItems.filter((item) => item.category === activeCategory);

  const handleSetFeatured = (item: MediaItem) => {
    if (item.type !== 'video') {
      toast.error('Only videos can be set as the featured highlight');
      return;
    }
    setFeaturedHighlight(item.id);
    toast.success(`"${item.title}" set as featured highlight on your profile`);
  };

  if (!authLoading && !isAuthenticated) {
    nav.dispatch(CommonActions.navigate({ name: 'Landing' as any }));
    return null;
  }
  if (isLoading || authLoading) {
    return (
      <View style={s.loading}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }
  if (!profile) {
    nav.dispatch(CommonActions.navigate({ name: 'Onboarding' as any }));
    return null;
  }

  const p = profile as any;

  return (
    <View style={s.container}>
      <SEO
        title="Photo Gallery - OfferHound™"
        description="View action shots, training moments, and highlights from your athletic journey."
        noIndex
      />
      <ScrollView contentContainerStyle={s.scroll}>
        {/* Hero */}
        <View style={s.hero}>
          {p.hero_background_image_url && (
            <Image source={{ uri: p.hero_background_image_url }} style={s.heroBg} />
          )}
          <View style={s.heroContent}>
            <BackButton label="Back" />
            <PageBreadcrumb />
            <View style={s.heroBadge}>
              <Camera size={14} color={colors.primary} />
              <Text style={s.heroBadgeText}>Photo Gallery</Text>
            </View>
            <Text style={s.heroTitle}>
              <Text style={{ color: colors.foreground }}>MY </Text>
              <Text style={{ color: colors.primary }}>GALLERY</Text>
            </Text>
            <Text style={s.heroDesc}>
              Action shots, training moments, and memories from my athletic
              journey.
            </Text>
          </View>
        </View>

        {/* Owner upload tools */}
        {isOwnerView && (
          <View style={s.section}>
            <View style={s.toolCard}>
              <View style={s.toolHeader}>
                <Camera size={20} color={colors.primary} />
                <Text style={s.toolTitle}>Upload Photos</Text>
              </View>
              <GalleryImageManager
                athleteId={p.id}
                galleryImages={(p.gallery_images as any) || []}
                onImagesUpdated={async (images: any) => {
                  await supabase
                    .from('player_profiles')
                    .update({ gallery_images: images } as any)
                    .eq('id', p.id);
                  fetchProfile();
                }}
              />
            </View>
            <View style={s.toolCard}>
              <View style={s.toolHeader}>
                <Video size={20} color={colors.primary} />
                <Text style={s.toolTitle}>Highlight Video</Text>
              </View>
              <HighlightVideoUpload
                athleteId={p.id}
                currentVideoUrl={p.highlight_video_url}
                onVideoUpdated={() => fetchProfile()}
              />
            </View>
          </View>
        )}

        {/* Filters */}
        <View style={s.filterRow}>
          <View style={s.categoryPills}>
            {categories.map((category) => (
              <Button
                key={category.id}
                variant={activeCategory === category.id ? 'default' : 'outline'}
                size="sm"
                onPress={() => setActiveCategory(category.id)}>
                {category.label}
              </Button>
            ))}
          </View>
          <View style={s.gridToggle}>
            <Pressable
              onPress={() => setGridSize('large')}
              style={[s.gridIcon, gridSize === 'large' && s.gridIconActive]}>
              <LayoutGrid size={16} color={gridSize === 'large' ? colors.primaryForeground : colors.mutedForeground} />
            </Pressable>
            <Pressable
              onPress={() => setGridSize('compact')}
              style={[s.gridIcon, gridSize === 'compact' && s.gridIconActive]}>
              <Grid3X3 size={16} color={gridSize === 'compact' ? colors.primaryForeground : colors.mutedForeground} />
            </Pressable>
          </View>
        </View>

        {/* Highlight visibility toggle */}
        {isOwnerView && p.highlight_video_url && (
          <View style={s.visibilityCard}>
            <View style={s.visibilityLeft}>
              <Video size={20} color={colors.primary} />
              <View style={{ flex: 1 }}>
                <Text style={s.visibilityTitle}>Featured Highlight Video</Text>
                <Text style={s.visibilityDesc}>
                  Control whether your highlight video is visible on your public profile
                </Text>
              </View>
            </View>
            <View style={s.visibilityRight}>
              {showHighlightVideo ? (
                <Badge variant="default" style={s.iconBadge}>
                  <Eye size={12} color={colors.primaryForeground} /> Visible
                </Badge>
              ) : (
                <Badge variant="secondary" style={s.iconBadge}>
                  <EyeOff size={12} color={colors.mutedForeground} /> Hidden
                </Badge>
              )}
              <Switch
                value={showHighlightVideo}
                onValueChange={handleToggleVideoVisibility}
                disabled={isTogglingVisibility}
              />
            </View>
          </View>
        )}

        {/* Grid */}
        <View
          style={[
            s.grid,
            gridSize === 'compact' ? s.gridCompact : s.gridLarge,
          ]}>
          {filteredItems.map((item) => (
            <Pressable
              key={item.id}
              style={[
                s.tile,
                gridSize === 'compact' ? s.tileCompact : s.tileLarge,
              ]}
              onPress={() => setSelectedImage(item)}>
              <Image source={{ uri: item.src }} style={s.tileImg} />
              {item.type === 'video' && (
                <View style={s.videoBadge}>
                  <Video size={12} color={colors.primaryForeground} />
                  <Text style={s.videoBadgeText}>Video</Text>
                </View>
              )}
              {item.id === featuredHighlight && item.type === 'video' && (
                <View style={s.featuredBadge}>
                  <Star size={12} color={colors.primaryForeground} />
                  <Text style={s.videoBadgeText}>Featured</Text>
                </View>
              )}
              <View style={s.tileFooter}>
                <Text style={s.tileTitle}>{item.title}</Text>
                <Text style={s.tileType}>
                  {item.type === 'video' ? 'Video' : 'Photo'}
                </Text>
              </View>
            </Pressable>
          ))}
        </View>

        {filteredItems.length === 0 && (
          <View style={s.emptyState}>
            <Camera size={48} color={colors.mutedForeground} />
            <Text style={s.emptyText}>
              {galleryItems.length === 0
                ? 'No photos or videos uploaded yet.'
                : 'No items in this category.'}
            </Text>
            {isOwnerView && galleryItems.length === 0 && (
              <Button
                onPress={() =>
                  nav.dispatch(CommonActions.navigate({ name: 'Dashboard' as any }))
                }
                leftIcon={<Upload size={16} color={colors.primaryForeground} />}>
                Upload Photos
              </Button>
            )}
          </View>
        )}

        <Footer />
      </ScrollView>

      {/* Lightbox */}
      <Modal
        visible={!!selectedImage}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedImage(null)}>
        <Pressable style={s.modalBg} onPress={() => setSelectedImage(null)}>
          <Pressable
            style={s.closeBtn}
            onPress={() => setSelectedImage(null)}>
            <X size={28} color={colors.foreground} />
          </Pressable>
          {selectedImage && (
            <Pressable style={s.modalContent} onPress={(e) => e.stopPropagation()}>
              <Image
                source={{ uri: selectedImage.src }}
                style={s.modalImg}
                resizeMode="contain"
              />
              <Text style={s.modalTitle}>{selectedImage.title}</Text>
              <Text style={s.modalType}>
                {selectedImage.type === 'video' ? 'Video' : 'Photo'}
              </Text>
              {/* PORT-PENDING: MediaShareButtons not yet ported */}
              {isOwnerView &&
                selectedImage.type === 'video' &&
                selectedImage.id !== featuredHighlight && (
                  <Button
                    onPress={() => handleSetFeatured(selectedImage)}
                    leftIcon={<Star size={16} color={colors.primaryForeground} />}>
                    Set as Featured Highlight
                  </Button>
                )}
              {selectedImage.id === featuredHighlight &&
                selectedImage.type === 'video' && (
                  <View style={s.featuredRow}>
                    <Check size={18} color={colors.primary} />
                    <Text style={s.featuredText}>Current Featured Highlight</Text>
                  </View>
                )}
            </Pressable>
          )}
        </Pressable>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  scroll: { paddingBottom: spacing.xxxl },
  hero: { paddingTop: spacing.xxxl, paddingBottom: spacing.xl, position: 'relative' },
  heroBg: { ...StyleSheet.absoluteFillObject, opacity: 0.2 },
  heroContent: { paddingHorizontal: spacing.lg, gap: spacing.sm, alignItems: 'center' },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: colors.secondary,
    borderRadius: 999,
    marginVertical: spacing.sm,
  },
  heroBadgeText: { color: colors.secondaryForeground, fontSize: 13, fontFamily: typography.fontFamily.bodyMedium },
  heroTitle: { fontFamily: typography.fontFamily.heading, fontSize: 44, textAlign: 'center' },
  heroDesc: { color: colors.mutedForeground, textAlign: 'center', fontFamily: typography.fontFamily.body },
  section: { padding: spacing.lg, gap: spacing.md },
  toolCard: {
    padding: spacing.md,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
  },
  toolHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: spacing.sm },
  toolTitle: { fontFamily: typography.fontFamily.heading, fontSize: 18, color: colors.foreground },
  filterRow: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  categoryPills: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  gridToggle: {
    flexDirection: 'row',
    alignSelf: 'flex-end',
    backgroundColor: colors.secondary,
    borderRadius: 999,
    padding: 4,
    gap: 4,
  },
  gridIcon: { padding: 8, borderRadius: 999 },
  gridIconActive: { backgroundColor: colors.primary },
  visibilityCard: {
    margin: spacing.lg,
    padding: spacing.md,
    backgroundColor: 'rgba(237,189,42,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(237,189,42,0.2)',
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
  },
  visibilityLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1 },
  visibilityRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  visibilityTitle: { color: colors.foreground, fontFamily: typography.fontFamily.bodyMedium },
  visibilityDesc: { color: colors.mutedForeground, fontSize: 12 },
  iconBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  grid: { padding: spacing.lg, gap: spacing.sm, flexDirection: 'row', flexWrap: 'wrap' },
  gridLarge: {},
  gridCompact: {},
  tile: {
    aspectRatio: 4 / 3,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: colors.secondary,
  },
  tileLarge: { width: '47%' },
  tileCompact: { width: '30%' },
  tileImg: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  videoBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  videoBadgeText: { color: colors.primaryForeground, fontSize: 11, fontFamily: typography.fontFamily.bodyMedium },
  featuredBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  tileFooter: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: spacing.sm,
    backgroundColor: 'rgba(16,19,24,0.7)',
  },
  tileTitle: { color: colors.foreground, fontFamily: typography.fontFamily.bodyMedium },
  tileType: { color: colors.mutedForeground, fontSize: 12 },
  emptyState: { alignItems: 'center', padding: spacing.xxl, gap: spacing.md },
  emptyText: { color: colors.mutedForeground, textAlign: 'center' },
  modalBg: {
    flex: 1,
    backgroundColor: 'rgba(16,19,24,0.95)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  closeBtn: { position: 'absolute', top: 40, right: 24, padding: 8, zIndex: 1 },
  modalContent: { width: '100%', maxWidth: 800, alignItems: 'center', gap: spacing.sm },
  modalImg: { width: '100%', aspectRatio: 16 / 9, borderRadius: 12 },
  modalTitle: { fontFamily: typography.fontFamily.heading, fontSize: 22, color: colors.foreground },
  modalType: { color: colors.mutedForeground, marginBottom: spacing.sm },
  featuredRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  featuredText: { color: colors.primary, fontFamily: typography.fontFamily.bodyMedium },
});
