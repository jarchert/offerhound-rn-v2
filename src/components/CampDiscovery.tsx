// Ported from Lovable web: src/components/CampDiscovery.tsx
// Translations:
//   <div>/<p>/<span>/<h2>/<h3>/<a> → <View>/<Text>/Linking
//   Tailwind classes → StyleSheet via @/lib/theme tokens
//   @/components/ui/* (lowercase) → PascalCase RN ports
//   lucide-react → lucide-react-native
//   onChange e.target.value → onChangeText
//   <a target="_blank"> → Pressable + Linking.openURL
//   Dialog `open` controlled by `!!detailCamp`
import React, { useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Pressable, Linking, ScrollView } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/Dialog';
import {
  Search, Calendar, MapPin, Users, Bookmark, BookmarkCheck,
  ExternalLink, Eye, Tent,
} from 'lucide-react-native';
import { format } from 'date-fns';
import { SPORTS_LIST } from '@/lib/data/sports';
import { AddToCalendarButton } from '@/components/AddToCalendarButton';
import { colors, spacing, typography, radius } from '@/lib/theme';

const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD',
  'MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC',
  'SD','TN','TX','UT','VT','VA','WA','WV','WI','WY',
];

interface CampDiscoveryProps {
  coachSport?: string;
  coachState?: string;
}

export function CampDiscovery({ coachSport, coachState: _coachState }: CampDiscoveryProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [sportFilter, setSportFilter] = useState(coachSport || 'all');
  const [stateFilter, setStateFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [viewTab, setViewTab] = useState('browse');
  const [detailCamp, setDetailCamp] = useState<any | null>(null);

  const { data: camps = [], isLoading } = useQuery({
    queryKey: ['discover-camps', sportFilter, stateFilter, typeFilter],
    queryFn: async () => {
      let query = supabase
        .from('camps')
        .select('*')
        .eq('status', 'published')
        .gte('start_date', new Date().toISOString().split('T')[0])
        .order('start_date', { ascending: true });

      if (sportFilter && sportFilter !== 'all') query = query.eq('sport', sportFilter);
      if (stateFilter && stateFilter !== 'all') query = query.eq('state', stateFilter);
      if (typeFilter && typeFilter !== 'all') query = query.eq('camp_type', typeFilter);

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  const { data: savedIds = [] } = useQuery({
    queryKey: ['coach-saved-camp-ids', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from('coach_saved_camps')
        .select('camp_id')
        .eq('user_id', user.id);
      return (data || []).map((d: any) => d.camp_id);
    },
    enabled: !!user,
  });

  const { data: savedCamps = [] } = useQuery({
    queryKey: ['coach-saved-camps-full', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data: saved } = await supabase
        .from('coach_saved_camps')
        .select('*')
        .eq('user_id', user.id);
      if (!saved || saved.length === 0) return [];
      const campIds = saved.map((s: any) => s.camp_id);
      const { data: campData } = await supabase
        .from('camps')
        .select('*')
        .in('id', campIds);
      return saved.map((s: any) => ({
        ...s,
        camp: (campData || []).find((c: any) => c.id === s.camp_id),
      }));
    },
    enabled: !!user,
  });

  const toggleSave = useMutation({
    mutationFn: async (campId: string) => {
      if (!user) throw new Error('Not authenticated');
      const isSaved = savedIds.includes(campId);
      if (isSaved) {
        await supabase.from('coach_saved_camps').delete().eq('user_id', user.id).eq('camp_id', campId);
      } else {
        await supabase.from('coach_saved_camps').insert({ user_id: user.id, camp_id: campId });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coach-saved-camp-ids'] });
      queryClient.invalidateQueries({ queryKey: ['coach-saved-camps-full'] });
    },
  });

  const filtered = (camps as any[]).filter((c: any) => {
    if (search) {
      const q = search.toLowerCase();
      if (
        !c.name?.toLowerCase().includes(q) &&
        !c.city?.toLowerCase().includes(q) &&
        !c.location?.toLowerCase().includes(q)
      ) return false;
    }
    return true;
  });

  const CampCard = ({ camp, showSaveButton = true }: { camp: any; showSaveButton?: boolean }) => {
    const isSaved = savedIds.includes(camp.id);
    return (
      <Card style={s.campCard}>
        <CardHeader style={{ paddingBottom: spacing.sm }}>
          <View style={s.row}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <CardTitle style={s.cardTitle}>{camp.name}</CardTitle>
              <View style={[s.rowGap, { marginTop: 4 }]}>
                <Calendar size={12} color={colors.mutedForeground} />
                <Text style={s.muted}>
                  {format(new Date(camp.start_date), 'MMM d, yyyy')}
                  {camp.end_date ? ` – ${format(new Date(camp.end_date), 'MMM d, yyyy')}` : ''}
                </Text>
              </View>
            </View>
            {showSaveButton && (
              <Pressable
                onPress={() => toggleSave.mutate(camp.id)}
                hitSlop={8}
                style={s.iconBtn}
              >
                {isSaved
                  ? <BookmarkCheck size={18} color={colors.primary} />
                  : <Bookmark size={18} color={colors.mutedForeground} />}
              </Pressable>
            )}
          </View>
        </CardHeader>
        <CardContent style={{ gap: spacing.sm }}>
          {(camp.city || camp.state) && (
            <View style={s.rowGap}>
              <MapPin size={12} color={colors.mutedForeground} />
              <Text style={s.muted}>{[camp.city, camp.state].filter(Boolean).join(', ')}</Text>
            </View>
          )}
          {camp.description ? (
            <Text style={s.muted} numberOfLines={2}>{camp.description}</Text>
          ) : null}
          <View style={s.badgeRow}>
            <Badge variant="outline">{String(camp.camp_type || '').replace('_', ' ')}</Badge>
            <Badge variant="outline">{camp.sport}</Badge>
            {camp.capacity ? (
              <Badge variant="outline">{`${camp.capacity} spots`}</Badge>
            ) : null}
            {camp.is_free ? (
              <Badge variant="secondary">Free</Badge>
            ) : camp.price_cents ? (
              <Badge variant="secondary">{`$${(camp.price_cents / 100).toFixed(2)}`}</Badge>
            ) : null}
          </View>
          {camp.positions && camp.positions.length > 0 && (
            <View style={s.badgeRow}>
              {camp.positions.slice(0, 5).map((p: string) => (
                <Badge key={p} variant="outline">{p}</Badge>
              ))}
              {camp.positions.length > 5 && (
                <Badge variant="outline">{`+${camp.positions.length - 5}`}</Badge>
              )}
            </View>
          )}
          <View style={[s.rowGap, { paddingTop: 4 }]}>
            <Button
              size="sm"
              variant="outline"
              onPress={() => setDetailCamp(camp)}
              leftIcon={<Eye size={12} color={colors.foreground} />}
            >
              Details
            </Button>
            <AddToCalendarButton camp={camp} variant="outline" size="sm" label="Calendar" />
            {camp.registration_url && (
              <Button
                size="sm"
                variant="outline"
                onPress={() => Linking.openURL(camp.registration_url)}
                leftIcon={<ExternalLink size={12} color={colors.foreground} />}
              >
                Register
              </Button>
            )}
          </View>
        </CardContent>
      </Card>
    );
  };

  return (
    <View style={{ gap: spacing.md }}>
      <Tabs value={viewTab} onValueChange={setViewTab}>
        <View style={s.headerRow}>
          <View style={{ flexShrink: 1 }}>
            <View style={s.rowGap}>
              <Tent size={20} color={colors.primary} />
              <Text style={s.h2}>Camp Directory</Text>
            </View>
            <Text style={s.muted}>Find and save upcoming camps</Text>
          </View>
          <TabsList>
            <TabsTrigger value="browse">{`Browse (${filtered.length})`}</TabsTrigger>
            <TabsTrigger value="saved">{`My Saved (${savedCamps.length})`}</TabsTrigger>
          </TabsList>
        </View>

        <TabsContent value="browse" style={{ gap: spacing.md }}>
          <Card>
            <CardContent style={{ paddingVertical: spacing.sm }}>
              <View style={s.filterWrap}>
                <View style={s.searchWrap}>
                  <View style={s.searchIcon}>
                    <Search size={16} color={colors.mutedForeground} />
                  </View>
                  <Input
                    placeholder="Search camps..."
                    value={search}
                    onChangeText={setSearch}
                    style={{ paddingLeft: 36 }}
                    containerStyle={{ flex: 1 }}
                  />
                </View>
                <View style={{ minWidth: 140 }}>
                  <Select value={sportFilter} onValueChange={setSportFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sport" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Sports</SelectItem>
                      {SPORTS_LIST.map((sp: any) => (
                        <SelectItem key={sp.id} value={sp.id}>{sp.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </View>
                <View style={{ minWidth: 100 }}>
                  <Select value={stateFilter} onValueChange={setStateFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="State" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      {US_STATES.map(st => (
                        <SelectItem key={st} value={st}>{st}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </View>
                <View style={{ minWidth: 140 }}>
                  <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="college_camp">College Camp</SelectItem>
                      <SelectItem value="club_camp">Club Camp</SelectItem>
                      <SelectItem value="showcase">Showcase</SelectItem>
                      <SelectItem value="combine">Combine</SelectItem>
                    </SelectContent>
                  </Select>
                </View>
              </View>
            </CardContent>
          </Card>

          {isLoading ? (
            <View style={s.loading}>
              <ActivityIndicator size="large" color={colors.mutedForeground} />
            </View>
          ) : filtered.length === 0 ? (
            <Card>
              <CardContent style={s.empty}>
                <Tent size={48} color={colors.mutedForeground} style={{ marginBottom: spacing.md }} />
                <Text style={s.emptyTitle}>No Camps Found</Text>
                <Text style={[s.muted, { textAlign: 'center' }]}>
                  Try adjusting your filters or check back later for new camps.
                </Text>
              </CardContent>
            </Card>
          ) : (
            <View style={{ gap: spacing.md }}>
              {filtered.map((camp: any) => <CampCard key={camp.id} camp={camp} />)}
            </View>
          )}
        </TabsContent>

        <TabsContent value="saved" style={{ gap: spacing.md }}>
          {savedCamps.length === 0 ? (
            <Card>
              <CardContent style={s.empty}>
                <Bookmark size={48} color={colors.mutedForeground} style={{ marginBottom: spacing.md }} />
                <Text style={s.emptyTitle}>No Saved Camps</Text>
                <Text style={[s.muted, { textAlign: 'center', marginBottom: spacing.md }]}>
                  Browse camps and tap the bookmark icon to save them.
                </Text>
                <Button onPress={() => setViewTab('browse')}>Browse Camps</Button>
              </CardContent>
            </Card>
          ) : (
            <View style={{ gap: spacing.md }}>
              {(savedCamps as any[]).map((saved: any) =>
                saved.camp ? <CampCard key={saved.id} camp={saved.camp} /> : null
              )}
            </View>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={!!detailCamp} onOpenChange={(o) => { if (!o) setDetailCamp(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{detailCamp?.name}</DialogTitle>
            <DialogDescription>
              {detailCamp?.start_date ? format(new Date(detailCamp.start_date), 'MMMM d, yyyy') : ''}
              {detailCamp?.end_date ? ` – ${format(new Date(detailCamp.end_date), 'MMMM d, yyyy')}` : ''}
            </DialogDescription>
          </DialogHeader>
          {detailCamp && (
            <ScrollView style={{ maxHeight: 360 }} contentContainerStyle={{ gap: spacing.md }}>
              {detailCamp.description ? (
                <Text style={s.body}>{detailCamp.description}</Text>
              ) : null}
              <View style={s.detailGrid}>
                <View style={s.detailCell}>
                  <Text style={s.muted}>Sport: </Text>
                  <Text style={s.body}>{detailCamp.sport}</Text>
                </View>
                <View style={s.detailCell}>
                  <Text style={s.muted}>Type: </Text>
                  <Text style={s.body}>{String(detailCamp.camp_type || '').replace('_', ' ')}</Text>
                </View>
                {detailCamp.location ? (
                  <View style={[s.detailCell, { width: '100%' }]}>
                    <Text style={s.muted}>Venue: </Text>
                    <Text style={s.body}>{detailCamp.location}</Text>
                  </View>
                ) : null}
                {(detailCamp.city || detailCamp.state) ? (
                  <View style={s.detailCell}>
                    <Text style={s.muted}>Location: </Text>
                    <Text style={s.body}>{[detailCamp.city, detailCamp.state].filter(Boolean).join(', ')}</Text>
                  </View>
                ) : null}
                {detailCamp.capacity ? (
                  <View style={s.detailCell}>
                    <Text style={s.muted}>Capacity: </Text>
                    <Text style={s.body}>{String(detailCamp.capacity)}</Text>
                  </View>
                ) : null}
                {detailCamp.start_time ? (
                  <View style={s.detailCell}>
                    <Text style={s.muted}>Time: </Text>
                    <Text style={s.body}>
                      {detailCamp.start_time}
                      {detailCamp.end_time ? ` – ${detailCamp.end_time}` : ''}
                    </Text>
                  </View>
                ) : null}
                <View style={s.detailCell}>
                  <Text style={s.muted}>Price: </Text>
                  <Text style={s.body}>
                    {detailCamp.is_free ? 'Free' : `$${((detailCamp.price_cents || 0) / 100).toFixed(2)}`}
                  </Text>
                </View>
              </View>
              {detailCamp.positions?.length > 0 && (
                <View>
                  <Text style={[s.muted, { marginBottom: 4 }]}>Positions:</Text>
                  <View style={s.badgeRow}>
                    {detailCamp.positions.map((p: string) => (
                      <Badge key={p} variant="outline">{p}</Badge>
                    ))}
                  </View>
                </View>
              )}
            </ScrollView>
          )}
          <DialogFooter>
            {detailCamp && (
              <AddToCalendarButton camp={detailCamp} variant="outline" size="default" label="Add to Calendar" />
            )}
            {detailCamp && (
              <Button
                variant="outline"
                onPress={() => toggleSave.mutate(detailCamp.id)}
                leftIcon={
                  savedIds.includes(detailCamp?.id)
                    ? <BookmarkCheck size={16} color={colors.foreground} />
                    : <Bookmark size={16} color={colors.foreground} />
                }
              >
                {savedIds.includes(detailCamp?.id) ? 'Saved' : 'Save Camp'}
              </Button>
            )}
            {detailCamp?.registration_url && (
              <Button
                onPress={() => Linking.openURL(detailCamp.registration_url)}
                leftIcon={<ExternalLink size={16} color={colors.primaryForeground} />}
              >
                Register
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </View>
  );
}

export default CampDiscovery;

const s = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.sm },
  rowGap: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.sm },
  h2: { fontFamily: typography.fontFamily.heading, fontSize: typography.fontSize.xl, color: colors.foreground, letterSpacing: typography.letterSpacing.heading },
  muted: { fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.sm, color: colors.mutedForeground },
  body: { fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.sm, color: colors.foreground },
  cardTitle: { fontFamily: typography.fontFamily.bodySemiBold, fontSize: typography.fontSize.base, color: colors.foreground },
  campCard: {},
  iconBtn: { padding: 6, borderRadius: 6 },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  filterWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, alignItems: 'center' },
  searchWrap: { flexGrow: 1, minWidth: 200, position: 'relative' },
  searchIcon: { position: 'absolute', left: 10, top: 0, bottom: 0, justifyContent: 'center', zIndex: 1 },
  loading: { paddingVertical: 48, alignItems: 'center', justifyContent: 'center' },
  empty: { paddingVertical: 48, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontFamily: typography.fontFamily.bodySemiBold, fontSize: typography.fontSize.base, color: colors.foreground, marginBottom: 8 },
  detailGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  detailCell: { flexDirection: 'row', flexWrap: 'wrap', width: '48%' },
});
