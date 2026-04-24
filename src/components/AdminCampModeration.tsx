// Ported verbatim from Lovable src/components/AdminCampModeration.tsx
// Web → RN mapping:
//   - Tailwind classes → StyleSheet using @/lib/theme tokens
//   - shadcn/ui imports → @/components/ui/* (PascalCase)
//   - lucide-react → lucide-react-native
//   - <Table> → RN View-based rows (no shadcn Table primitive in RN port)
//   - <AlertDialog> → <Dialog> from @/components/ui/Dialog (AlertDialog not ported;
//     Dialog provides equivalent modal confirm UX)
//   - asChild <a> wrapping a Button → Pressable + Linking.openURL
//   - sonner toast → @/components/ui/toast (react-native-toast-message wrapper)
//   - input onChange(e.target.value) → onChangeText(text)
//   - peer-disabled / cursor-* utility classes are no-ops in RN
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  ScrollView,
  Linking,
} from 'react-native';
import { supabase } from '@/integrations/supabase/client';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Checkbox } from '@/components/ui/Checkbox';
import { Label } from '@/components/ui/Label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog';
import {
  Calendar,
  CheckCircle,
  XCircle,
  Search,
  Loader2,
  ExternalLink,
  MapPin,
  Bell,
} from 'lucide-react-native';
import { format } from 'date-fns';
import { toast } from '@/components/ui/toast';
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

  const fetchCamps = async () => {
    try {
      setIsLoading(true);
      let query = supabase
        .from('college_camps')
        .select('*')
        .order('created_at', { ascending: false });

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
      const location =
        camp.city && camp.state
          ? `${camp.city}, ${camp.state}`
          : camp.location || undefined;

      const { data, error } = await supabase.functions.invoke(
        'send-camp-alert-notification',
        {
          body: {
            campId: camp.id,
            campName: camp.name,
            school: camp.school,
            sport: camp.sport,
            startDate: camp.start_date,
            location,
            registrationUrl: camp.registration_url,
          },
        },
      );

      if (error) {
        console.error('Error sending camp alert notifications:', error);
        toast.error('Camp verified but failed to send notifications');
      } else if (data) {
        const { successCount, totalSubscribers } = data as {
          successCount: number;
          totalSubscribers: number;
        };
        if (totalSubscribers > 0) {
          toast.success(
            `Notifications sent to ${successCount} ${camp.sport} subscribers`,
          );
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
      const { error } = await supabase
        .from('college_camps')
        .update({ is_verified: true })
        .eq('id', actionCamp.id);

      if (error) throw error;

      toast.success(`"${actionCamp.name}" has been verified`);

      // Send notifications to subscribers of this sport (if enabled)
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
      setShouldNotify(true); // Reset for next time
      setSubscriberCount(null); // Reset subscriber count
    }
  };

  const handleReject = async () => {
    if (!actionCamp) return;
    setIsProcessing(true);

    try {
      const { error } = await supabase
        .from('college_camps')
        .delete()
        .eq('id', actionCamp.id);

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
          <Calendar width={20} height={20} color={colors.foreground} />
          <CardTitle>Camp Moderation</CardTitle>
          {pendingCount > 0 && (
            <Badge variant="destructive" style={s.titleBadge}>
              {pendingCount} pending
            </Badge>
          )}
        </View>
        <CardDescription>
          Review and verify community-submitted camps
        </CardDescription>
      </CardHeader>
      <CardContent>
        <View style={s.controlsRow}>
          <View style={s.searchWrap}>
            <View style={s.searchIcon} pointerEvents="none">
              <Search width={16} height={16} color={colors.mutedForeground} />
            </View>
            <Input
              placeholder="Search camps..."
              value={searchQuery}
              onChangeText={(text) => setSearchQuery(text)}
              style={s.searchInput}
            />
          </View>
          <View style={s.filterRow}>
            <Button
              variant={filter === 'pending' ? 'default' : 'outline'}
              size="sm"
              onPress={() => setFilter('pending')}
            >
              Pending
            </Button>
            <Button
              variant={filter === 'verified' ? 'default' : 'outline'}
              size="sm"
              onPress={() => setFilter('verified')}
            >
              Verified
            </Button>
            <Button
              variant={filter === 'all' ? 'default' : 'outline'}
              size="sm"
              onPress={() => setFilter('all')}
            >
              All
            </Button>
          </View>
        </View>

        {isLoading ? (
          <View style={s.loadingWrap}>
            <ActivityIndicator size="large" color={colors.mutedForeground} />
          </View>
        ) : filteredCamps.length === 0 ? (
          <View style={s.emptyWrap}>
            <Calendar width={48} height={48} color={colors.mutedForeground} style={s.emptyIcon} />
            <Text style={s.emptyText}>No camps found</Text>
          </View>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={s.table}>
              {/* Header */}
              <View style={[s.row, s.headerRow]}>
                <Text style={[s.headerCell, s.colCamp]}>Camp</Text>
                <Text style={[s.headerCell, s.colSchool]}>School</Text>
                <Text style={[s.headerCell, s.colDate]}>Date</Text>
                <Text style={[s.headerCell, s.colLocation]}>Location</Text>
                <Text style={[s.headerCell, s.colStatus]}>Status</Text>
                <Text style={[s.headerCell, s.colActions, s.alignRight]}>Actions</Text>
              </View>

              {filteredCamps.map((camp) => (
                <View key={camp.id} style={s.row}>
                  {/* Camp */}
                  <View style={s.colCamp}>
                    <Text style={s.cellMedium}>{camp.name}</Text>
                    <Badge variant="outline" style={s.typeBadge}>
                      {camp.camp_type}
                    </Badge>
                  </View>
                  {/* School */}
                  <View style={s.colSchool}>
                    <Text style={s.cellText}>{camp.school}</Text>
                    {camp.division ? (
                      <Text style={s.cellSubtle}>{camp.division}</Text>
                    ) : null}
                  </View>
                  {/* Date */}
                  <View style={s.colDate}>
                    <Text style={s.cellText}>
                      {format(new Date(camp.start_date), 'MMM d, yyyy')}
                    </Text>
                  </View>
                  {/* Location */}
                  <View style={s.colLocation}>
                    {camp.city && camp.state ? (
                      <View style={s.locationInline}>
                        <MapPin width={12} height={12} color={colors.foreground} />
                        <Text style={s.cellText}>
                          {camp.city}, {camp.state}
                        </Text>
                      </View>
                    ) : (
                      <Text style={s.cellSubtle}>—</Text>
                    )}
                  </View>
                  {/* Status */}
                  <View style={s.colStatus}>
                    {camp.is_verified ? (
                      <Badge variant="success" style={s.statusBadge}>
                        ✓ Verified
                      </Badge>
                    ) : camp.submitted_by ? (
                      <Badge variant="secondary">Pending Review</Badge>
                    ) : (
                      <Badge variant="outline">Official</Badge>
                    )}
                  </View>
                  {/* Actions */}
                  <View style={[s.colActions, s.actionsCell]}>
                    {camp.registration_url ? (
                      <Pressable
                        onPress={() =>
                          camp.registration_url &&
                          Linking.openURL(camp.registration_url)
                        }
                        style={s.iconBtn}
                      >
                        <ExternalLink width={16} height={16} color={colors.foreground} />
                      </Pressable>
                    ) : null}
                    {!camp.is_verified && camp.submitted_by ? (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onPress={() => {
                            void onClickVerify(camp);
                          }}
                        >
                          Verify
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onPress={() => {
                            setActionCamp(camp);
                            setActionType('reject');
                          }}
                        >
                          Reject
                        </Button>
                      </>
                    ) : null}
                  </View>
                </View>
              ))}
            </View>
          </ScrollView>
        )}
      </CardContent>

      {/* Verify dialog */}
      <Dialog
        open={actionType === 'verify'}
        onOpenChange={(open) => {
          if (!open) setActionType(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Verify Camp</DialogTitle>
            <DialogDescription>
              {`This will mark "${actionCamp?.name ?? ''}" as a verified camp.`}
            </DialogDescription>
          </DialogHeader>

          <View style={s.checkboxRow}>
            <Checkbox
              checked={shouldNotify}
              onCheckedChange={(checked) => setShouldNotify(checked === true)}
            />
            <Pressable onPress={() => setShouldNotify(!shouldNotify)} style={s.checkboxLabelWrap}>
              <Label>
                {`Send email notifications to ${actionCamp?.sport ?? ''} subscribers`}
                {loadingSubscriberCount ? (
                  <Text style={s.checkboxHint}> (loading...)</Text>
                ) : subscriberCount !== null ? (
                  <Text style={s.checkboxHint}>
                    {` (${subscriberCount} subscriber${subscriberCount !== 1 ? 's' : ''})`}
                  </Text>
                ) : null}
              </Label>
            </Pressable>
          </View>

          <DialogFooter>
            <Button
              variant="outline"
              onPress={() => setActionType(null)}
              disabled={isProcessing || sendingNotifications}
            >
              Cancel
            </Button>
            <Button
              variant="default"
              onPress={() => {
                void handleVerify();
              }}
              disabled={isProcessing || sendingNotifications}
            >
              <View style={s.btnInline}>
                {isProcessing || sendingNotifications ? (
                  <>
                    <Loader2 width={16} height={16} color={colors.primaryForeground} />
                    <Text style={s.btnInlineText}>
                      {sendingNotifications ? 'Notifying...' : 'Verifying...'}
                    </Text>
                  </>
                ) : shouldNotify ? (
                  <>
                    <Bell width={16} height={16} color={colors.primaryForeground} />
                    <Text style={s.btnInlineText}>Verify & Notify</Text>
                  </>
                ) : (
                  <>
                    <CheckCircle width={16} height={16} color={colors.primaryForeground} />
                    <Text style={s.btnInlineText}>Verify Only</Text>
                  </>
                )}
              </View>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject dialog */}
      <Dialog
        open={actionType === 'reject'}
        onOpenChange={(open) => {
          if (!open) setActionType(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Camp</DialogTitle>
            <DialogDescription>
              {`This will permanently delete "${actionCamp?.name ?? ''}". This action cannot be undone.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onPress={() => setActionType(null)}
              disabled={isProcessing}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onPress={() => {
                void handleReject();
              }}
              disabled={isProcessing}
            >
              <View style={s.btnInline}>
                {isProcessing ? (
                  <Loader2 width={16} height={16} color={colors.destructiveForeground} />
                ) : null}
                <Text style={[s.btnInlineText, { color: colors.destructiveForeground }]}>
                  Reject & Delete
                </Text>
              </View>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

const s = StyleSheet.create({
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  titleBadge: { marginLeft: spacing.sm },
  controlsRow: {
    flexDirection: 'column',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  searchWrap: {
    flex: 1,
    position: 'relative',
    justifyContent: 'center',
  },
  searchIcon: {
    position: 'absolute',
    left: spacing.sm,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    zIndex: 1,
  },
  searchInput: {
    paddingLeft: spacing.xl,
  },
  filterRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  loadingWrap: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyWrap: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyIcon: { opacity: 0.5, marginBottom: spacing.sm },
  emptyText: {
    color: colors.mutedForeground,
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.sm,
    textAlign: 'center',
  },
  table: {
    minWidth: 760,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.sm,
  },
  headerRow: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerCell: {
    fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: typography.fontSize.xs,
    color: colors.mutedForeground,
    textTransform: 'uppercase',
  },
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
  cellSubtle: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.xs,
    color: colors.mutedForeground,
  },
  colCamp: { width: 200 },
  colSchool: { width: 160 },
  colDate: { width: 110 },
  colLocation: { width: 140 },
  colStatus: { width: 130 },
  colActions: { width: 200 },
  alignRight: { textAlign: 'right' },
  typeBadge: { alignSelf: 'flex-start', marginTop: 4 },
  statusBadge: { alignSelf: 'flex-start' },
  locationInline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionsCell: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  iconBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.sm,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
  checkboxLabelWrap: { flex: 1 },
  checkboxHint: {
    color: colors.mutedForeground,
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.sm,
  },
  btnInline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  btnInlineText: {
    fontFamily: typography.fontFamily.bodySemiBold,
    color: colors.primaryForeground,
    fontSize: typography.fontSize.sm,
  },
});
