import { useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { format } from 'date-fns';
import { Bell, BellOff, Trash2, RefreshCw, Plus } from 'lucide-react-native';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select';
import { useCampAlertSubscriptions } from '@/hooks/useCampAlertSubscriptions';
import { useAuth } from '@/hooks/useAuth';
import { SPORTS_LIST } from '@/lib/data/sports';
import { colors, typography, spacing } from '@/lib/theme';

export function MyCampAlertSubscriptions() {
  const { user } = useAuth();
  const {
    subscriptions,
    activeSubscriptions,
    isLoading,
    subscribe,
    unsubscribe,
    resubscribe,
    deleteSubscription,
    isSubscribing,
    isUnsubscribing,
    isResubscribing,
  } = useCampAlertSubscriptions();

  const [selectedSport, setSelectedSport] = useState<string>('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [deleteDialogId, setDeleteDialogId] = useState<string | null>(null);

  // Get sports that the user is already subscribed to (active only)
  const subscribedSports = activeSubscriptions.map((s) => s.sport);
  const availableSports = SPORTS_LIST.filter(
    (sport) => !subscribedSports.includes(sport.name),
  );

  const handleSubscribe = () => {
    if (!selectedSport || !user?.email) return;
    subscribe({ email: user.email, sport: selectedSport });
    setSelectedSport('');
    setShowAddForm(false);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <View style={styles.titleRow}>
            <Bell size={20} color={colors.primary} />
            <CardTitle>Camp Alert Subscriptions</CardTitle>
          </View>
        </CardHeader>
        <CardContent style={styles.loadingContent}>
          <ActivityIndicator size="small" color={colors.mutedForeground} />
        </CardContent>
      </Card>
    );
  }

  const deleteTarget = subscriptions.find((s) => s.id === deleteDialogId);

  return (
    <Card>
      <CardHeader>
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <View style={styles.iconCircle}>
              <Bell size={20} color={colors.primary} />
            </View>
            <View style={styles.headerText}>
              <CardTitle>Camp Alert Subscriptions</CardTitle>
              <CardDescription>
                Get notified when new camps are added for your sports
              </CardDescription>
            </View>
          </View>
          {availableSports.length > 0 && !showAddForm && (
            <Button
              variant="outline"
              size="sm"
              onPress={() => setShowAddForm(true)}
              leftIcon={<Plus size={16} color={colors.foreground} />}
            >
              Add Sport
            </Button>
          )}
        </View>
      </CardHeader>
      <CardContent style={styles.content}>
        {/* Add new subscription form */}
        {showAddForm && availableSports.length > 0 && (
          <View style={styles.addForm}>
            <View style={styles.selectWrap}>
              <Select value={selectedSport} onValueChange={setSelectedSport}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a sport" />
                </SelectTrigger>
                <SelectContent>
                  {availableSports.map((sport) => (
                    <SelectItem key={sport.id} value={sport.name}>
                      {sport.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </View>
            <Button
              onPress={handleSubscribe}
              disabled={!selectedSport || isSubscribing}
              loading={isSubscribing}
              leftIcon={!isSubscribing ? <Bell size={16} color={colors.primaryForeground} /> : undefined}
            >
              Subscribe
            </Button>
            <Button
              variant="ghost"
              onPress={() => {
                setShowAddForm(false);
                setSelectedSport('');
              }}
            >
              Cancel
            </Button>
          </View>
        )}

        {/* No subscriptions message */}
        {subscriptions.length === 0 && !showAddForm && (
          <View style={styles.emptyState}>
            <BellOff size={48} color={colors.mutedForeground} style={{ opacity: 0.5 }} />
            <Text style={styles.emptyText}>
              You haven't subscribed to any camp alerts yet.
            </Text>
            <Button
              onPress={() => setShowAddForm(true)}
              leftIcon={<Plus size={16} color={colors.primaryForeground} />}
            >
              Subscribe to Camp Alerts
            </Button>
          </View>
        )}

        {/* Subscription list */}
        {subscriptions.length > 0 && (
          <View style={styles.list}>
            {subscriptions.map((subscription) => {
              const isUnsubscribed = !!subscription.unsubscribed_at;
              return (
                <View
                  key={subscription.id}
                  style={[styles.subRow, isUnsubscribed && styles.subRowUnsubscribed]}
                >
                  <View style={styles.subLeft}>
                    <View
                      style={[
                        styles.subIcon,
                        isUnsubscribed ? styles.subIconMuted : styles.subIconPrimary,
                      ]}
                    >
                      {isUnsubscribed ? (
                        <BellOff size={16} color={colors.mutedForeground} />
                      ) : (
                        <Bell size={16} color={colors.primary} />
                      )}
                    </View>
                    <View style={styles.subInfo}>
                      <View style={styles.subTitleRow}>
                        <Text style={styles.subSport}>{subscription.sport}</Text>
                        {isUnsubscribed ? (
                          <Badge variant="secondary">Unsubscribed</Badge>
                        ) : (
                          <Badge variant="success">Active</Badge>
                        )}
                      </View>
                      <Text style={styles.subDate}>
                        {isUnsubscribed
                          ? `Unsubscribed ${format(new Date(subscription.unsubscribed_at!), 'MMM d, yyyy')}`
                          : `Subscribed ${format(new Date(subscription.created_at), 'MMM d, yyyy')}`}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.subActions}>
                    {isUnsubscribed ? (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onPress={() => resubscribe(subscription.id)}
                          disabled={isResubscribing}
                          leftIcon={<RefreshCw size={16} color={colors.foreground} />}
                        >
                          Resubscribe
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onPress={() => setDeleteDialogId(subscription.id)}
                        >
                          <Trash2 size={16} color={colors.destructive} />
                        </Button>
                      </>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        onPress={() => unsubscribe(subscription.id)}
                        disabled={isUnsubscribing}
                        leftIcon={<BellOff size={16} color={colors.foreground} />}
                      >
                        Unsubscribe
                      </Button>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* Info text */}
        <Text style={styles.infoText}>
          You'll receive email notifications when new camps are added for your subscribed sports.
        </Text>
      </CardContent>

      {/* Delete confirmation dialog (replaces AlertDialog) */}
      <Dialog
        open={!!deleteDialogId}
        onOpenChange={(v) => {
          if (!v) setDeleteDialogId(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Subscription?</DialogTitle>
            <DialogDescription>
              {deleteTarget
                ? `This will permanently remove your ${deleteTarget.sport} camp alert subscription.`
                : ''}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onPress={() => setDeleteDialogId(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onPress={() => {
                if (deleteDialogId) deleteSubscription(deleteDialogId);
                setDeleteDialogId(null);
              }}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

const styles = StyleSheet.create({
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  loadingContent: { alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.xl },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1 },
  iconCircle: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: colors.primary + '33',
    alignItems: 'center', justifyContent: 'center',
  },
  headerText: { flex: 1 },
  content: { gap: spacing.md },
  addForm: {
    flexDirection: 'row', gap: spacing.sm, padding: spacing.md,
    borderWidth: 1, borderColor: colors.border, borderRadius: 8,
    backgroundColor: colors.muted, alignItems: 'center', flexWrap: 'wrap',
  },
  selectWrap: { flex: 1, minWidth: 160 },
  emptyState: { alignItems: 'center', paddingVertical: spacing.xl, gap: spacing.sm },
  emptyText: {
    color: colors.mutedForeground,
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.sm,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  list: { gap: spacing.sm },
  subRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: spacing.md, borderWidth: 1, borderColor: colors.border, borderRadius: 8,
    gap: spacing.sm,
  },
  subRowUnsubscribed: { backgroundColor: colors.muted, opacity: 0.75 },
  subLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1 },
  subIcon: {
    width: 32, height: 32, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
  },
  subIconMuted: { backgroundColor: colors.muted },
  subIconPrimary: { backgroundColor: colors.primary + '33' },
  subInfo: { flex: 1 },
  subTitleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  subSport: {
    fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: typography.fontSize.base,
    color: colors.foreground,
  },
  subDate: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.xs,
    color: colors.mutedForeground,
    marginTop: 2,
  },
  subActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  infoText: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.xs,
    color: colors.mutedForeground,
    textAlign: 'center',
    paddingTop: spacing.sm,
  },
});
