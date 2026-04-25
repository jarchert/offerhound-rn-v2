// Parity port from Lovable src/components/EditCampDialog.tsx (verbatim logic).
// Web→RN translations:
//   <div>/<p>/<span>/<h3>/<aside>/<input type=checkbox>/<img> → <View>/<Text>/Checkbox/Image
//   Tailwind classes → StyleSheet via @/lib/theme tokens
//   @/components/ui/* (lowercase) → PascalCase RN ports
//   lucide-react → lucide-react-native
//   onChange e.target.value → onChangeText
//   window.open → Linking.openURL
//   KeyboardAvoidingView wraps the dialog form (per session-parity checklist).
// GAPs:
//   - CampHeroImageUpload not yet ported — inlined as a minimal placeholder
//     that displays the current image and offers a remove control.
//   - Native HTML date/time inputs translated to plain string Inputs with
//     "YYYY-MM-DD" / "HH:MM" placeholders, matching CampScheduleBuilder.
import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Image,
  Linking,
  KeyboardAvoidingView,
  Platform as RNPlatform,
  ScrollView,
} from 'react-native';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Textarea } from '@/components/ui/Textarea';
import { Badge } from '@/components/ui/Badge';
import { Checkbox } from '@/components/ui/Checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select';
import {
  Calendar as CalendarIcon,
  Clock,
  DollarSign,
  Eye,
  Loader2,
  MapPin,
  Save,
  Tent,
  Users,
} from 'lucide-react-native';
import { format } from 'date-fns';
import { useUpdateCamp, type Camp } from '@/hooks/useCampManager';
import { SPORT_POSITIONS } from '@/lib/data/sportPositions';
import { SPORTS_LIST } from '@/lib/data/sports';
import {
  CAMP_MANAGER_SUPPORTED_SPORTS,
  CAMP_SPORT_STAT_FOCUS,
} from '@/lib/data/campManagerSports';
import { useToast } from '@/hooks/use-toast';
import { colors, spacing, typography, radius } from '@/lib/theme';

const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD',
  'MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC',
  'SD','TN','TX','UT','VT','VA','WA','WV','WI','WY',
];

interface EditCampDialogProps {
  camp: Camp | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// GAP: CampHeroImageUpload not yet ported. Minimal inline shim.
function CampHeroImageUploadShim({
  currentImageUrl,
  onRemoved,
}: {
  campId?: string;
  currentImageUrl: string | null;
  onUploaded: (url: string) => void;
  onRemoved: () => void;
}) {
  return (
    <View style={s.heroShim}>
      <Label>Hero Image</Label>
      {currentImageUrl ? (
        <View style={s.heroPreviewRow}>
          <Image source={{ uri: currentImageUrl }} style={s.heroThumb} resizeMode="cover" />
          <Button variant="outline" size="sm" onPress={onRemoved}>Remove</Button>
        </View>
      ) : (
        <Text style={s.heroEmpty}>
          (Image upload UI is rendered inline in mobile builds — placeholder.)
        </Text>
      )}
    </View>
  );
}

export function EditCampDialog({ camp, open, onOpenChange }: EditCampDialogProps) {
  const updateCamp = useUpdateCamp();
  const { toast } = useToast();

  const [form, setForm] = useState({
    name: '',
    description: '',
    camp_type: 'college_camp',
    sport: 'football',
    start_date: '',
    end_date: '',
    start_time: '',
    end_time: '',
    location: '',
    city: '',
    state: '',
    positions: [] as string[],
    capacity: '',
    is_free: true,
    price_cents: 0,
    status: 'draft',
    image_url: '' as string,
  });

  useEffect(() => {
    if (!camp) return;
    setForm({
      name: camp.name || '',
      description: camp.description || '',
      camp_type: camp.camp_type || 'college_camp',
      sport: camp.sport || 'football',
      start_date: camp.start_date || '',
      end_date: camp.end_date || '',
      start_time: camp.start_time || '',
      end_time: camp.end_time || '',
      location: camp.location || '',
      city: camp.city || '',
      state: camp.state || '',
      positions: camp.positions || [],
      capacity: camp.capacity != null ? String(camp.capacity) : '',
      is_free: !!camp.is_free,
      price_cents: camp.price_cents ?? 0,
      status: camp.status || 'draft',
      image_url: camp.image_url || '',
    });
  }, [camp]);

  const sportPositions = SPORT_POSITIONS[form.sport] || [];

  const handleSave = async () => {
    if (!camp) return;
    if (!form.name || !form.start_date) {
      toast({
        title: 'Missing fields',
        description: 'Camp name and start date are required.',
        variant: 'destructive',
      });
      return;
    }
    try {
      await updateCamp.mutateAsync({
        id: camp.id,
        name: form.name,
        description: form.description || null,
        camp_type: form.camp_type,
        sport: form.sport,
        start_date: form.start_date,
        end_date: form.end_date || null,
        start_time: form.start_time || null,
        end_time: form.end_time || null,
        location: form.location || null,
        city: form.city || null,
        state: form.state || null,
        positions: form.positions,
        capacity: form.capacity ? parseInt(form.capacity, 10) : null,
        is_free: form.is_free,
        price_cents: form.is_free ? 0 : form.price_cents,
        status: form.status,
        image_url: form.image_url || null,
      } as any);
      toast({ title: 'Camp updated' });
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const previewDateLabel = useMemo(() => {
    if (!form.start_date) return 'Select a start date';
    try {
      const start = format(new Date(form.start_date), 'MMM d, yyyy');
      if (!form.end_date) return start;
      return `${start} – ${format(new Date(form.end_date), 'MMM d, yyyy')}`;
    } catch {
      return form.start_date;
    }
  }, [form.start_date, form.end_date]);

  const previewPriceLabel = form.is_free
    ? 'Free'
    : `$${(form.price_cents / 100).toFixed(2)}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent style={s.dialogContent}>
        <KeyboardAvoidingView
          behavior={RNPlatform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={80}
          style={s.flex1}
        >
          <DialogHeader>
            <DialogTitle>Edit Camp</DialogTitle>
            <DialogDescription>
              Update details, dates, capacity, positions, and pricing. The preview below shows what athletes will see on the public registration page.
            </DialogDescription>
          </DialogHeader>

          <View style={s.formCol}>
            <View style={s.field}>
              <Label>Camp Name *</Label>
              <Input value={form.name} onChangeText={(v) => setForm({ ...form, name: v })} />
            </View>

            <View style={s.gridRow}>
              <View style={s.gridCell}>
                <Label>Camp Type</Label>
                <Select value={form.camp_type} onValueChange={(v) => setForm({ ...form, camp_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="college_camp">College Camp</SelectItem>
                    <SelectItem value="club_camp">Club Camp</SelectItem>
                    <SelectItem value="showcase">Showcase</SelectItem>
                    <SelectItem value="combine">Combine</SelectItem>
                  </SelectContent>
                </Select>
              </View>
              <View style={s.gridCell}>
                <Label>Sport</Label>
                <Select
                  value={form.sport}
                  onValueChange={(v) => setForm({ ...form, sport: v, positions: [] })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SPORTS_LIST
                      .filter((sp: any) => CAMP_MANAGER_SUPPORTED_SPORTS.includes(sp.id))
                      .map((sp: any) => (
                        <SelectItem key={sp.id} value={sp.id}>{sp.name}</SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                {CAMP_SPORT_STAT_FOCUS[form.sport] && (
                  <Text style={s.statFocus}>
                    <Text style={s.statFocusBold}>{CAMP_SPORT_STAT_FOCUS[form.sport].label}:</Text>{' '}
                    {CAMP_SPORT_STAT_FOCUS[form.sport].stats.join(' · ')}
                  </Text>
                )}
              </View>
            </View>

            <View style={s.gridRow}>
              <View style={s.gridCell}>
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </View>
              <View style={s.gridCell}>
                <Label>Capacity</Label>
                <Input
                  keyboardType="number-pad"
                  value={form.capacity}
                  onChangeText={(v) => setForm({ ...form, capacity: v })}
                  placeholder="Max athletes"
                />
              </View>
            </View>

            <View style={s.gridRow}>
              <View style={s.gridCell}>
                <Label>Start Date *</Label>
                <Input
                  placeholder="YYYY-MM-DD"
                  value={form.start_date}
                  onChangeText={(v) => setForm({ ...form, start_date: v })}
                />
              </View>
              <View style={s.gridCell}>
                <Label>End Date</Label>
                <Input
                  placeholder="YYYY-MM-DD"
                  value={form.end_date}
                  onChangeText={(v) => setForm({ ...form, end_date: v })}
                />
              </View>
            </View>

            <View style={s.gridRow}>
              <View style={s.gridCell}>
                <Label>Start Time</Label>
                <Input
                  placeholder="HH:MM"
                  value={form.start_time}
                  onChangeText={(v) => setForm({ ...form, start_time: v })}
                />
              </View>
              <View style={s.gridCell}>
                <Label>End Time</Label>
                <Input
                  placeholder="HH:MM"
                  value={form.end_time}
                  onChangeText={(v) => setForm({ ...form, end_time: v })}
                />
              </View>
            </View>

            <View style={s.field}>
              <Label>Location/Venue</Label>
              <Input value={form.location} onChangeText={(v) => setForm({ ...form, location: v })} />
            </View>

            <View style={s.gridRow}>
              <View style={s.gridCell}>
                <Label>City</Label>
                <Input value={form.city} onChangeText={(v) => setForm({ ...form, city: v })} />
              </View>
              <View style={s.gridCell}>
                <Label>State</Label>
                <Select value={form.state} onValueChange={(v) => setForm({ ...form, state: v })}>
                  <SelectTrigger><SelectValue placeholder="Select state" /></SelectTrigger>
                  <SelectContent>
                    {US_STATES.map((st) => (
                      <SelectItem key={st} value={st}>{st}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </View>
            </View>

            <View style={s.field}>
              <Label>Positions</Label>
              <View style={s.positionWrap}>
                {sportPositions.map((p: any) => {
                  const active = form.positions.includes(p.label);
                  return (
                    <Pressable
                      key={p.label}
                      onPress={() => {
                        setForm((prev) => ({
                          ...prev,
                          positions: prev.positions.includes(p.label)
                            ? prev.positions.filter((pos) => pos !== p.label)
                            : [...prev.positions, p.label],
                        }));
                      }}
                    >
                      <Badge variant={active ? 'default' : 'outline'}>{p.label}</Badge>
                    </Pressable>
                  );
                })}
                {sportPositions.length === 0 && (
                  <Text style={s.muted}>No positions defined for this sport</Text>
                )}
              </View>
            </View>

            <View style={s.field}>
              <Label>Description</Label>
              <Textarea
                value={form.description}
                onChangeText={(v) => setForm({ ...form, description: v })}
                rows={3}
              />
            </View>

            <CampHeroImageUploadShim
              campId={camp?.id}
              currentImageUrl={form.image_url || null}
              onUploaded={(url) => setForm((prev) => ({ ...prev, image_url: url }))}
              onRemoved={() => setForm((prev) => ({ ...prev, image_url: '' }))}
            />

            <View style={s.priceRow}>
              <Pressable
                style={s.checkRow}
                onPress={() => setForm({ ...form, is_free: !form.is_free })}
              >
                <Checkbox
                  checked={form.is_free}
                  onCheckedChange={(v: boolean) => setForm({ ...form, is_free: v })}
                />
                <Label>Free camp</Label>
              </Pressable>
              {!form.is_free && (
                <View style={s.priceInner}>
                  <Label>Price ($)</Label>
                  <Input
                    keyboardType="decimal-pad"
                    style={s.priceInput}
                    value={String(form.price_cents / 100)}
                    onChangeText={(v) =>
                      setForm({
                        ...form,
                        price_cents: Math.round(parseFloat(v || '0') * 100),
                      })
                    }
                  />
                </View>
              )}
            </View>
          </View>

          {/* === Live preview panel === */}
          <View style={s.previewPanel} accessibilityLabel="Public page preview">
            <View style={s.previewHeader}>
              <Eye size={14} color={colors.mutedForeground} />
              <Text style={s.previewHeaderText}>Public page preview</Text>
            </View>

            <View style={s.previewCard}>
              <View style={s.previewHero}>
                {form.image_url ? (
                  <Image
                    source={{ uri: form.image_url }}
                    style={s.previewHeroImg}
                    resizeMode="cover"
                  />
                ) : (
                  <Tent size={40} color={colors.primary} />
                )}
              </View>
              <View style={s.previewBody}>
                <View style={s.previewTitleRow}>
                  <Text style={s.previewTitle} numberOfLines={2}>
                    {form.name || 'Untitled Camp'}
                  </Text>
                  <Badge variant="outline">{form.camp_type.replace('_', ' ')}</Badge>
                </View>

                <View style={s.previewMetaRow}>
                  <CalendarIcon size={12} color={colors.mutedForeground} />
                  <Text style={s.previewMeta}>{previewDateLabel}</Text>
                </View>

                {(form.location || form.city || form.state) && (
                  <View style={s.previewMetaRow}>
                    <MapPin size={12} color={colors.mutedForeground} style={{ marginTop: 2 }} />
                    <View style={s.flex1}>
                      {!!form.location && <Text style={s.previewLocBold}>{form.location}</Text>}
                      <Text style={s.previewMeta}>{[form.city, form.state].filter(Boolean).join(', ')}</Text>
                    </View>
                  </View>
                )}

                {(form.start_time || form.end_time) && (
                  <View style={s.previewMetaRow}>
                    <Clock size={12} color={colors.mutedForeground} />
                    <Text style={s.previewMeta}>
                      {form.start_time}
                      {form.end_time ? ` – ${form.end_time}` : ''}
                    </Text>
                  </View>
                )}

                <View style={s.previewFooterRow}>
                  <View style={s.previewMetaRow}>
                    <Users size={12} color={colors.mutedForeground} />
                    <Text style={s.previewMeta}>Capacity: {form.capacity || 'Unlimited'}</Text>
                  </View>
                  <View style={s.previewMetaRow}>
                    <DollarSign size={12} color={colors.foreground} />
                    <Text style={s.previewPrice}>{previewPriceLabel}</Text>
                  </View>
                </View>

                {!!form.description && (
                  <View style={s.previewDivider}>
                    <Text style={s.previewMeta} numberOfLines={3}>{form.description}</Text>
                  </View>
                )}

                {form.positions.length > 0 && (
                  <View style={s.previewPositions}>
                    {form.positions.slice(0, 6).map((p) => (
                      <Badge key={p} variant="outline">{p}</Badge>
                    ))}
                    {form.positions.length > 6 && (
                      <Badge variant="outline">+{form.positions.length - 6}</Badge>
                    )}
                  </View>
                )}
              </View>
            </View>

            {form.status !== 'published' && form.status !== 'active' && (
              <Text style={s.previewItalic}>
                Status is "{form.status}" — set to Published to make this page live at /camps/{camp?.id?.slice(0, 8) || '…'}.
              </Text>
            )}

            {!!camp?.id && (
              <Button
                variant="outline"
                size="sm"
                onPress={() => Linking.openURL(`https://offerhound.app/camps/${camp.id}`)}
                leftIcon={<Eye size={14} color={colors.foreground} />}
              >
                Open public page
              </Button>
            )}
          </View>

          <DialogFooter>
            <Button variant="outline" onPress={() => onOpenChange(false)}>Cancel</Button>
            <Button
              onPress={handleSave}
              disabled={updateCamp.isPending}
              leftIcon={
                updateCamp.isPending ? (
                  <Loader2 size={16} color={colors.primaryForeground} />
                ) : (
                  <Save size={16} color={colors.primaryForeground} />
                )
              }
            >
              Save Changes
            </Button>
          </DialogFooter>
        </KeyboardAvoidingView>
      </DialogContent>
    </Dialog>
  );
}

const s = StyleSheet.create({
  flex1: { flex: 1 },
  dialogContent: { maxWidth: 720 },
  formCol: { gap: spacing.sm },
  field: { gap: 6 },
  gridRow: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  gridCell: { flexBasis: '47%', flexGrow: 1, gap: 6 },
  statFocus: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.xs,
    color: colors.mutedForeground,
  },
  statFocusBold: {
    fontFamily: typography.fontFamily.bodyMedium,
    color: colors.foreground,
  },
  positionWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    maxHeight: 128,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
  },
  muted: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.sm,
    color: colors.mutedForeground,
  },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, flexWrap: 'wrap' },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  priceInner: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  priceInput: { width: 112 },
  heroShim: { gap: 6 },
  heroPreviewRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  heroThumb: { width: 96, height: 56, borderRadius: radius.md, backgroundColor: colors.muted },
  heroEmpty: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.xs,
    color: colors.mutedForeground,
  },
  previewPanel: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.muted,
    padding: spacing.md,
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  previewHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  previewHeaderText: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.xs,
    color: colors.mutedForeground,
    textTransform: 'uppercase',
    letterSpacing: typography.letterSpacing.wide,
  },
  previewCard: {
    borderRadius: radius.md,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  previewHero: {
    aspectRatio: 16 / 8,
    backgroundColor: 'rgba(231,175,8,0.07)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewHeroImg: { width: '100%', height: '100%' },
  previewBody: { padding: spacing.sm, gap: 6 },
  previewTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  previewTitle: {
    flex: 1,
    fontFamily: typography.fontFamily.heading,
    fontSize: typography.size.base,
    color: colors.foreground,
    lineHeight: 20,
    letterSpacing: typography.letterSpacing.heading,
  },
  previewMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  previewMeta: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.xs,
    color: colors.mutedForeground,
  },
  previewLocBold: {
    fontFamily: typography.fontFamily.bodyMedium,
    fontSize: typography.size.xs,
    color: colors.foreground,
  },
  previewFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  previewPrice: {
    fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: typography.size.xs,
    color: colors.foreground,
  },
  previewDivider: { paddingTop: 4, borderTopWidth: 1, borderTopColor: colors.border },
  previewPositions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  previewItalic: {
    fontFamily: typography.fontFamily.body,
    fontSize: 11,
    color: colors.mutedForeground,
    fontStyle: 'italic',
  },
});
