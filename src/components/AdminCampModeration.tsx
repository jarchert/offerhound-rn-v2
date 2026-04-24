// Ported verbatim from Lovable src/components/AdminCampModeration.tsx
// Mapping: shadcn Table -> FlashList rows; AlertDialog -> Dialog modal; sonner -> toast wrapper; lucide-react -> lucide-react-native.
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Linking, useWindowDimensions } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Checkbox } from '@/components/ui/Checkbox';
import { Label } from '@/components/ui/Label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/Dialog';
import { toast } from '@/components/ui/toast';
import { Calendar, CheckCircle, XCircle, Search, ExternalLink, MapPin, Bell } from 'lucide-react-native';
import { format } from 'date-fns';
import { colors, typography, spacing, radius } from '@/lib/theme';

interface Camp {
  id: string;
  name: string;
  school: string;
  sport: string;
  division: string | null;
  camp_type: string;
  start_date: string;
  city: string | null;
  state: string | null;
  location: string | null;
  registration_url: string | null;
  source_url: string | null;
  is_verified: boolean;
  submitted_by: string | null;
  created_at: string;
}

export function AdminCampModeration() {
  const [camps, setCamps] = useState<Camp[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'pending' | 'verified'>('pending');
  const [actionCamp, setActionCamp] = useState<Camp | null>(null);
  const [actionType, setActionType] = useState<'verify' | 'reject' | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [sendingNotifications, setSendingNotifications] = useState(false);
  const [shouldNotify, setShouldNotify] = useState(true);
  const [subscriberCount, setSubscriberCount] = useState<number | null>(null);
  const [loadingSubscriberCount, setLoadingSubscriberCount] = useState(false);

  const { width } = useWindowDimensions();
  const isWide = width >= 640;

  const fetchCamps = async () => {
    try {
      setIsLoading(true);
      let query = supabase.from('college_camps').select('*').order('created_at', { ascending: false });
      if (filter === 'pending') {
        query = query.eq('is_verified', false).not('submitted_by', 'is', null);
      } else if (filter === 'verified') {
        query = query.eq('is_verified', true);
      }
      const { data, error } = await query;
      if (error) throw error;
      setCamps((data as Camp[]) || []);
    } catch (err) {
      console.error('Error fetching camps:', err);
      toast.error('Failed to load camps');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCamps();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const sendCampAlertNotifications = async (camp: Camp) => {
    try {
      setSendingNotifications(true);
      const location = camp.city && camp.state ? `${camp.city}, ${camp.state}` : camp.location || undefined;
      const { data, error } = await supabase.functions.invoke('send-camp-alert-notification', {
        body: {
          campId: camp.id,
          campName: camp.name,
          school: camp.school,
          sport: camp.sport,
          startDate: camp.start_date,
          location,
          registrationUrl: camp.registration_url,
        },
      });
      if (error) {
        console.error('Error sending camp alert notifications:', error);
        toast.error('Camp verified but failed to send notifications');
      } else if (data) {
        const { successCount, totalSubscribers } = data as { successCount: number; totalSubscribers: number };
        if (totalSubscribers > 0) {
          toast.success(`Notifications sent to ${successCount} ${camp.sport} subscribers`);
        }
      }
    } catch (err) {
      console.error('Error invoking notification function:', err);
    } finally {
      setSendingNotifications(false);
    }
  };

  const handleVerify = async () => {
    if (!actionCamp) return;
    setIsProcessing(true);
    try {
      const { error } = await supabase.from('college_camps').update({ is_verified: true }).eq('id', actionCamp.id);
      if (error) throw error;
      toast.success(`"${actionCamp.name}" has been verified`);
      if (shouldNotify) {
        await sendCampAlertNotifications(actionCamp);
      }
      await fetchCamps();
    } catch (err) {
      console.error('Error verifying camp:', err);
      toast.error('Failed to verify camp');
    } finally {
      setIsProcessing(false);
      setActionCamp(null);
      setActionType(null);
      setShouldNotify(true);
      setSubscriberCount(null);
    }
  };

  const handleReject = async () => {
    if (!actionCamp) return;
    setIsProcessing(true);
    try {
      const { error } = await supabase.from('college_camps').delete().eq('id', actionCamp.id);
      if (error) throw error;
      toast.success(`"${actionCamp.name}" has been rejected and removed`);
      await fetchCamps();
    } catch (err) {
      console.error('Error rejecting camp:', err);
      toast.error('Failed to reject camp');
    } finally {
      setIsProcessing(false);
      setActionCamp(null);
      setActionType(null);
    }
  };

  const filteredCamps = camps.filter(
    (camp) =>
      camp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      camp.school.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const pendingCount = camps.filter((c) => !c.is_verified && c.submitted_by).length;

  const onClickVerify = async (camp: Camp) => {
    setActionCamp(camp);
    setActionType('verify');
    setLoadingSubscriberCount(true);
    try {
      const { count, error } = await supabase
        .from('camp_alert_subscriptions')
        .select('*', { count: 'exact', head: true })
        .eq('sport', camp.sport)
        .is('unsubscribed_at', null);
      if (!error) {
        setSubscriberCount(count || 0);
      }
    } catch (err) {
      console.error('Error fetching subscriber count:', err);
    } finally {
      setLoadingSubscriberCount(false);
    }
  };

return (
    <Card>
      <CardHeader>
        <View style={s.titleRow}>
          <Calendar size={20} color={colors.foreground} />
          <CardTitle style={s.titleText}>Camp Moderation</CardTitle>
          {pendingCount > 0 ? (
            <View style={s.titleBadge}>
              <Badge variant="destructive">{`${pendingCount} pending`}</Badge>
            </View>
          ) : null}
        </View>
        <CardDescription>Review and verify community-submitted camps</CardDescription>
      </CardHeader>
      <CardContent>
        <View style={[s.filtersRow, isWide ? s.filtersRowWide : s.filtersRowNarrow]}>
          <View style={s.searchWrap}>
            <View style={s.searchIcon} pointerEvents="none">
              <Search size={16} color={colors.mutedForeground} />
            </View>
            <Input
              placeholder="Search camps..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              containerStyle={s.searchInputContainer}
              style={s.searchInput}
            />
          </View>
          <View style={s.filterButtons}>
            <Button variant={filter === 'pending' ? 'default' : 'outline'} size="sm" onPress={() => setFilter('pending')}>Pending</Button>
            <Button variant={filter === 'verified' ? 'default' : 'outline'} size="sm" onPress={() => setFilter('verified')}>Verified</Button>
            <Button variant={filter === 'all' ? 'default' : 'outline'} size="sm" onPress={() => setFilter('all')}>All</Button>
          </View>
        </View>

        <View style={s.bodyGap} />

        {isLoading ? (
          <View style={s.loadingWrap}>
            <ActivityIndicator size="large" color={colors.mutedForeground} />
          </View>
        ) : filteredCamps.length === 0 ? (
          <View style={s.emptyWrap}>
            <Calendar size={48} color={colors.mutedForeground} />
            <Text style={s.emptyText}>No camps found</Text>
          </View>
        ) : (
          <CampTable
            camps={filteredCamps}
            onVerify={onClickVerify}
            onReject={(c) => { setActionCamp(c); setActionType('reject'); }}
          />
        )}
      </CardContent>

      {/* Verify dialog */}
      <Dialog open={actionType === 'verify'} onOpenChange={(v) => { if (!v) setActionType(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Verify Camp</DialogTitle>
            <DialogDescription>
              {`This will mark "${actionCamp?.name ?? ''}" as a verified camp.`}
            </DialogDescription>
          </DialogHeader>

          <View style={s.notifyRow}>
            <Checkbox checked={shouldNotify} onCheckedChange={(checked) => setShouldNotify(checked === true)} />
            <View style={s.notifyLabelWrap}>
              <Label>
                {`Send email notifications to ${actionCamp?.sport ?? ''} subscribers`}
                {loadingSubscriberCount ? (
                  <Text style={s.notifyMuted}> (loading...)</Text>
                ) : subscriberCount !== null ? (
                  <Text style={s.notifyMuted}>
                    {` (${subscriberCount} subscriber${subscriberCount !== 1 ? 's' : ''})`}
                  </Text>
                ) : null}
              </Label>
            </View>
          </View>

          <DialogFooter>
            <Button variant="outline" onPress={() => setActionType(null)} disabled={isProcessing || sendingNotifications}>Cancel</Button>
            <Button
              onPress={handleVerify}
              disabled={isProcessing || sendingNotifications}
              leftIcon={
                isProcessing || sendingNotifications ? (
                  <ActivityIndicator size="small" color={colors.primaryForeground} />
                ) : shouldNotify ? (
                  <Bell size={16} color={colors.primaryForeground} />
                ) : (
                  <CheckCircle size={16} color={colors.primaryForeground} />
                )
              }
            >
              {isProcessing || sendingNotifications
                ? (sendingNotifications ? 'Notifying...' : 'Verifying...')
                : (shouldNotify ? 'Verify & Notify' : 'Verify Only')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject dialog */}
      <Dialog open={actionType === 'reject'} onOpenChange={(v) => { if (!v) setActionType(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Camp</DialogTitle>
            <DialogDescription>
              {`This will permanently delete "${actionCamp?.name ?? ''}". This action cannot be undone.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onPress={() => setActionType(null)} disabled={isProcessing}>Cancel</Button>
            <Button
              variant="destructive"
              onPress={handleReject}
              disabled={isProcessing}
              leftIcon={isProcessing ? <ActivityIndicator size="small" color={colors.destructiveForeground} /> : undefined}
            >
              Reject & Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

export default AdminCampModeration;

// ---------------- Table ----------------
function CampTable({
  camps,
  onVerify,
  onReject,
}: {
  camps: Camp[];
  onVerify: (c: Camp) => void;
  onReject: (c: Camp) => void;
}) {
  return (
    <View style={s.tableWrap}>
      <View style={[s.tableRow, s.tableHeaderRow]}>
        <Text style={[s.th, s.colCamp]}>Camp</Text>
        <Text style={[s.th, s.colSchool]}>School</Text>
        <Text style={[s.th, s.colDate]}>Date</Text>
        <Text style={[s.th, s.colLocation]}>Location</Text>
        <Text style={[s.th, s.colStatus]}>Status</Text>
        <Text style={[s.th, s.colActions, s.thRight]}>Actions</Text>
      </View>
      <View style={{ height: Math.min(600, camps.length * 72 + 40) }}>
        <FlashList
          data={camps}
          keyExtractor={(c) => c.id}
          renderItem={({ item: camp }) => (
            <View style={s.tableRow}>
              <View style={s.colCamp}>
                <Text style={s.cellMedium} numberOfLines={2}>{camp.name}</Text>
                <View style={s.typeBadgeWrap}>
                  <Badge variant="outline">{String(camp.camp_type).toLowerCase()}</Badge>
                </View>
              </View>
              <View style={s.colSchool}>
                <Text style={s.cellText} numberOfLines={2}>{camp.school}</Text>
                {camp.division ? (
                  <Text style={s.cellTextMuted} numberOfLines={1}>{camp.division}</Text>
                ) : null}
              </View>
              <Text style={[s.colDate, s.cellText]}>
                {format(new Date(camp.start_date), 'MMM d, yyyy')}
              </Text>
              <View style={s.colLocation}>
                {camp.city && camp.state ? (
                  <View style={s.locationRow}>
                    <MapPin size={12} color={colors.foreground} />
                    <Text style={s.cellText} numberOfLines={1}>{`${camp.city}, ${camp.state}`}</Text>
                  </View>
                ) : (
                  <Text style={s.cellTextMuted}>—</Text>
                )}
              </View>
              <View style={s.colStatus}>
                {camp.is_verified ? (
                  <Badge variant="success">
                    <View style={s.statusBadgeInner}>
                      <CheckCircle size={12} color="#ffffff" />
                      <Text style={s.statusBadgeText}> Verified</Text>
                    </View>
                  </Badge>
                ) : camp.submitted_by ? (
                  <Badge variant="secondary">Pending Review</Badge>
                ) : (
                  <Badge variant="outline">Official</Badge>
                )}
              </View>
              <View style={[s.colActions, s.actionsCell]}>
                {camp.registration_url ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onPress={() => Linking.openURL(camp.registration_url!)}
                    leftIcon={<ExternalLink size={16} color={colors.foreground} />}
                  />
                ) : null}
                {!camp.is_verified && camp.submitted_by ? (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onPress={() => onVerify(camp)}
                      leftIcon={<CheckCircle size={16} color={colors.foreground} />}
                    >
                      Verify
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onPress={() => onReject(camp)}
                      leftIcon={<XCircle size={16} color={colors.destructiveForeground} />}
                    >
                      Reject
                    </Button>
                  </>
                ) : null}
              </View>
            </View>
          )}
        />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  // Header
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  titleText: {
    fontFamily: typography.fontFamily.heading,
    fontSize: typography.fontSize.lg,
    color: colors.foreground,
    letterSpacing: typography.letterSpacing.heading,
  },
  titleBadge: { marginLeft: spacing.sm },

  // Filters
  filtersRow: { flexDirection: 'row', gap: spacing.sm + 4 },
  filtersRowWide: { flexDirection: 'row', alignItems: 'center' },
  filtersRowNarrow: { flexDirection: 'column' },
  searchWrap: { flex: 1, minWidth: 200, position: 'relative' },
  searchIcon: {
    position: 'absolute',
    left: spacing.sm + 4,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    zIndex: 1,
  },
  searchInputContainer: { flex: 1 },
  searchInput: { paddingLeft: spacing.xl + 6 },
  filterButtons: { flexDirection: 'row', gap: spacing.sm },

  bodyGap: { height: spacing.md },

  // Loading / empty
  loadingWrap: { alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.xl * 1.5 },
  emptyWrap: { alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.xl * 1.5, gap: spacing.sm + 2, opacity: 0.85 },
  emptyText: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.base,
    color: colors.mutedForeground,
  },

  // Table
  tableWrap: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.sm,
  },
  tableHeaderRow: { backgroundColor: colors.muted },
  th: {
    fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: typography.fontSize.sm,
    color: colors.mutedForeground,
  },
  thRight: { textAlign: 'right' },
  cellText: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.sm,
    color: colors.foreground,
  },
  cellMedium: {
    fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: typography.fontSize.sm,
    color: colors.foreground,
  },
  cellTextMuted: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.xs,
    color: colors.mutedForeground,
  },
  typeBadgeWrap: { marginTop: 4, alignSelf: 'flex-start' },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statusBadgeInner: { flexDirection: 'row', alignItems: 'center' },
  statusBadgeText: {
    color: '#ffffff',
    fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: typography.fontSize.xs,
  },
  actionsCell: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.sm },

  colCamp: { flex: 2, minWidth: 160 },
  colSchool: { flex: 2, minWidth: 140 },
  colDate: { width: 120 },
  colLocation: { flex: 1.5, minWidth: 140 },
  colStatus: { width: 140 },
  colActions: { width: 220 },

  // Dialog
  notifyRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, paddingVertical: spacing.md },
  notifyLabelWrap: { flex: 1 },
  notifyMuted: { color: colors.mutedForeground, fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.sm },
});
