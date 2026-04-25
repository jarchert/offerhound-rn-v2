// CampMobileCheckinScreen — RN port of Lovable web src/pages/CampMobileCheckin.tsx (433 LOC).
// Coach-side mobile check-in: scan athlete QR, manual token entry, walk-up registration.
//
// PORT-PENDING (camera/QR scan):
//   Web uses BarcodeDetector + getUserMedia. RN equivalent is `expo-barcode-scanner` or
//   `expo-camera`'s onBarCodeScanned, but neither is currently in package.json. For now
//   the "Scan" tab renders a stub explaining the limitation and pushes users to the
//   "Manual" token-entry tab. When expo-barcode-scanner is installed, replace
//   <ScanStub /> with a real <BarCodeScanner /> wrapper.
//
// PORT-PENDING (offline queue):
//   Web uses useCampCheckinSync + checkinQueue (IndexedDB). RN replacement (AsyncStorage
//   + NetInfo) is not yet ported. We always treat the device as online and call Supabase
//   directly. When the offline queue lands, swap `isOnline=true` with the hook's value.
//
// PORT-PENDING (walk-up registration):
//   CampWalkupRegistration component is web-only. We render an inline placeholder card
//   directing staff to the future RN equivalent.
import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  Pressable,
  TextInput,
} from 'react-native';
import { useNavigation, useRoute, type NavigationProp, type RouteProp } from '@react-navigation/native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  QrCode,
  RefreshCw,
  UserCheck,
  Users,
  Wifi,
} from 'lucide-react-native';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';
import { colors, spacing } from '@/lib/theme';
import type { CampStackParamList } from '@/navigation/stacks/CampStack';

interface Enrollment {
  id: string;
  camp_id: string;
  status: string;
  jersey_number: string | null;
  position_group: string | null;
  qr_code_token: string | null;
  checked_in_at: string | null;
  notes: string | null;
}

interface CampSummary {
  id: string;
  name: string;
  positions: string[] | null;
  coach_user_id: string;
}

export default function CampMobileCheckinScreen() {
  const route = useRoute<RouteProp<CampStackParamList, 'CampMobileCheckin'>>();
  const navigation = useNavigation<NavigationProp<any>>();
  const campId = route.params?.campId;
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState('scan');
  const [manualToken, setManualToken] = useState('');

  // PORT-PENDING: offline queue not yet wired in RN. Always treat as online.
  const isOnline = true;
  const queueCount = 0;
  const isFlushing = false;
  const flushNow = () => {};
  const refreshQueue = () => {};

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      // Auth gate parity with web (web redirects to /auth?redirect=...).
      navigation.navigate('Auth' as never);
    }
  }, [authLoading, isAuthenticated, navigation]);

  const { data: camp, isLoading: campLoading } = useQuery({
    queryKey: ['camp-mobile-checkin-camp', campId],
    queryFn: async () => {
      if (!campId) return null;
      const { data, error } = await supabase
        .from('camps')
        .select('id, name, positions, coach_user_id')
        .eq('id', campId)
        .maybeSingle();
      if (error) throw error;
      return data as CampSummary | null;
    },
    enabled: !!campId,
  });

  const { data: enrollments = [], isLoading: enrollmentsLoading } = useQuery({
    queryKey: ['camp-ops-enrollments', campId],
    queryFn: async () => {
      if (!campId) return [];
      const { data, error } = await supabase
        .from('camp_enrollments')
        .select(
          'id, camp_id, status, jersey_number, position_group, qr_code_token, checked_in_at, notes',
        )
        .eq('camp_id', campId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data || []) as Enrollment[];
    },
    enabled: !!campId,
    refetchInterval: isOnline ? 8000 : false,
  });

  const checkInMutation = useMutation({
    mutationFn: async (enrollmentId: string) => {
      // PORT-PENDING: when offline queue ships, branch on isOnline and enqueueOp here.
      const { error } = await supabase
        .from('camp_enrollments')
        .update({
          status: 'checked_in',
          checked_in_at: new Date().toISOString(),
        } as any)
        .eq('id', enrollmentId);
      if (error) throw error;
      return { queued: false as const, enrollmentId };
    },
    onSuccess: () => {
      toast({ title: '✓ Checked in' });
      queryClient.invalidateQueries({ queryKey: ['camp-ops-enrollments', campId] });
    },
    onError: (err: any) => {
      toast({
        title: 'Could not check in',
        description: err?.message ?? 'Unknown error',
        variant: 'destructive',
      });
    },
  });

  const handleScanned = (decoded: string) => {
    const trimmed = decoded.trim();
    let token = trimmed;
    try {
      // RN doesn't have URL constructor on all engines; guard.
      const url = new URL(trimmed);
      const candidate =
        url.searchParams.get('token') || url.pathname.split('/').filter(Boolean).pop() || '';
      if (candidate) token = candidate;
    } catch {
      // not a URL — use the raw value
    }

    const match = enrollments.find(
      (e) =>
        e.qr_code_token === token ||
        (e.qr_code_token && e.qr_code_token.startsWith(token)),
    );
    if (!match) {
      toast({
        title: 'No match',
        description: 'No enrollment found for that QR code.',
        variant: 'destructive',
      });
      return;
    }
    if (match.status === 'checked_in') {
      toast({
        title: 'Already checked in',
        description: `Athlete #${match.jersey_number || match.id.slice(0, 8)}`,
      });
      return;
    }
    checkInMutation.mutate(match.id);
  };

  const handleManualSubmit = () => {
    if (!manualToken.trim()) return;
    handleScanned(manualToken);
    setManualToken('');
  };

  const stats = useMemo(() => {
    const total = enrollments.length;
    const checkedIn = enrollments.filter((e) => e.status === 'checked_in').length;
    return { total, checkedIn, pending: total - checkedIn };
  }, [enrollments]);

  const pendingList = enrollments
    .filter((e) => e.status !== 'checked_in' && e.status !== 'cancelled')
    .slice(0, 25);

  if (authLoading || campLoading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  if (!camp) {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={styles.muted}>Camp not found.</Text>
        <Button variant="outline" onPress={() => navigation.goBack()}>
          Back to camps
        </Button>
      </SafeAreaView>
    );
  }

  const isOwner = user?.id === camp.coach_user_id;

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back"
            onPress={() => navigation.goBack()}
            style={styles.iconBtn}>
            <ArrowLeft size={20} color={colors.foreground} />
          </Pressable>
          <View style={{ flexShrink: 1 }}>
            <Text style={styles.title} numberOfLines={1}>
              {camp.name}
            </Text>
            <Text style={styles.subtitle}>Mobile check-in</Text>
          </View>
        </View>
        <View style={styles.headerRight}>
          <Badge variant="secondary" style={styles.statusBadge}>
            <Wifi size={12} color={colors.foreground} />
            <Text style={styles.statusBadgeText}> Online</Text>
          </Badge>
          {queueCount > 0 ? (
            <Badge variant="outline" style={styles.statusBadge}>
              <RefreshCw size={12} color={colors.foreground} />
              <Text style={styles.statusBadgeText}> {queueCount}</Text>
            </Badge>
          ) : null}
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {!isOwner ? (
          <Card>
            <CardContent style={{ paddingVertical: 12 }}>
              <Text style={styles.muted}>
                You don't appear to be the owner of this camp. Some actions may be blocked by access
                rules.
              </Text>
            </CardContent>
          </Card>
        ) : null}

        {/* live stats */}
        <View style={styles.statsRow}>
          <Card style={styles.statCard}>
            <CardContent style={styles.statContent}>
              <View style={styles.statHead}>
                <Users size={16} color={colors.primary} />
                <Text style={styles.statNum}>{stats.total}</Text>
              </View>
              <Text style={styles.statLabel}>Registered</Text>
            </CardContent>
          </Card>
          <Card style={styles.statCard}>
            <CardContent style={styles.statContent}>
              <View style={styles.statHead}>
                <CheckCircle2 size={16} color={colors.primary} />
                <Text style={styles.statNum}>{stats.checkedIn}</Text>
              </View>
              <Text style={styles.statLabel}>Present</Text>
            </CardContent>
          </Card>
          <Card style={styles.statCard}>
            <CardContent style={styles.statContent}>
              <View style={styles.statHead}>
                <Clock size={16} color={colors.mutedForeground} />
                <Text style={[styles.statNum, { color: colors.mutedForeground }]}>
                  {stats.pending}
                </Text>
              </View>
              <Text style={styles.statLabel}>Pending</Text>
            </CardContent>
          </Card>
        </View>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="scan">Scan</TabsTrigger>
            <TabsTrigger value="manual">Manual</TabsTrigger>
            <TabsTrigger value="walkup">Walk-up</TabsTrigger>
          </TabsList>

          <TabsContent value="scan">
            <Card>
              <CardHeader style={{ paddingBottom: spacing.xs }}>
                <CardTitle>Scan athlete QR</CardTitle>
              </CardHeader>
              <CardContent>
                {/* PORT-PENDING: install expo-barcode-scanner and replace this stub. */}
                <View style={styles.scanStub}>
                  <QrCode size={48} color={colors.mutedForeground} />
                  <Text style={[styles.muted, { textAlign: 'center', marginTop: 12 }]}>
                    Camera-based QR scanning is not yet wired in the native app. Use the Manual tab
                    to paste a token.
                  </Text>
                  <Button
                    variant="outline"
                    style={{ marginTop: 12 }}
                    onPress={() => setTab('manual')}>
                    Open manual entry
                  </Button>
                </View>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="manual">
            <Card>
              <CardHeader style={{ paddingBottom: spacing.xs }}>
                <CardTitle>Enter token</CardTitle>
              </CardHeader>
              <CardContent>
                <View style={styles.tokenRow}>
                  <View style={{ flex: 1 }}>
                    <Input
                      value={manualToken}
                      onChangeText={setManualToken}
                      placeholder="Paste QR token"
                      onSubmitEditing={handleManualSubmit}
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                  </View>
                  <Button
                    onPress={handleManualSubmit}
                    disabled={!manualToken.trim()}
                    style={{ marginLeft: 8 }}>
                    <UserCheck size={16} color={colors.primaryForeground} />
                  </Button>
                </View>

                <Text style={[styles.label, { marginTop: 16 }]}>
                  Pending ({pendingList.length})
                </Text>
                {enrollmentsLoading ? (
                  <View style={{ paddingVertical: 24, alignItems: 'center' }}>
                    <ActivityIndicator color={colors.primary} />
                  </View>
                ) : pendingList.length === 0 ? (
                  <Text style={[styles.muted, { textAlign: 'center', paddingVertical: 16 }]}>
                    Everyone is checked in 🎉
                  </Text>
                ) : (
                  pendingList.map((e) => (
                    <View key={e.id} style={styles.pendingRow}>
                      <View style={styles.pendingLeft}>
                        {e.jersey_number ? (
                          <Text style={styles.jersey}>{e.jersey_number}</Text>
                        ) : null}
                        <Text style={styles.pendingId} numberOfLines={1}>
                          #{e.id.slice(0, 8)}
                        </Text>
                        {e.position_group ? (
                          <Badge variant="outline" style={styles.posBadge}>
                            <Text style={styles.posBadgeText}>{e.position_group}</Text>
                          </Badge>
                        ) : null}
                      </View>
                      <Button
                        size="sm"
                        variant="secondary"
                        onPress={() => checkInMutation.mutate(e.id)}
                        disabled={checkInMutation.isPending}>
                        <UserCheck size={14} color={colors.foreground} />
                      </Button>
                    </View>
                  ))
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="walkup">
            {/* PORT-PENDING: Lovable CampWalkupRegistration not yet ported to RN. */}
            <Card>
              <CardContent style={{ paddingVertical: 24 }}>
                <Text style={[styles.muted, { textAlign: 'center' }]}>
                  Walk-up registration form is coming soon to the native app. For now, register the
                  athlete on the web dashboard, then check them in here.
                </Text>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {queueCount > 0 ? (
          <Card>
            <CardContent style={styles.queueCard}>
              <View style={{ flexShrink: 1 }}>
                <Text style={styles.queueTitle}>{queueCount} pending sync</Text>
                <Text style={styles.muted}>Saved locally and will retry automatically.</Text>
              </View>
              <Button
                size="sm"
                variant="outline"
                onPress={flushNow}
                disabled={!isOnline || isFlushing}>
                <RefreshCw size={14} color={colors.foreground} />
                <Text style={{ marginLeft: 4, color: colors.foreground }}>Sync now</Text>
              </Button>
            </CardContent>
          </Card>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    paddingHorizontal: 16,
    gap: 12,
  },
  muted: { color: colors.mutedForeground, fontSize: 14 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    backgroundColor: colors.card,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  iconBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 16, color: colors.foreground, fontWeight: '700' },
  subtitle: { fontSize: 11, color: colors.mutedForeground, marginTop: 2 },
  statusBadge: { flexDirection: 'row', alignItems: 'center' },
  statusBadgeText: { fontSize: 11, color: colors.foreground },
  scroll: { padding: 16, paddingBottom: 96, gap: spacing.md },
  statsRow: { flexDirection: 'row', gap: spacing.xs, marginBottom: spacing.sm },
  statCard: { flex: 1 },
  statContent: { paddingVertical: 12, alignItems: 'center' },
  statHead: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statNum: { fontSize: 20, fontWeight: '700', color: colors.primary },
  statLabel: {
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    color: colors.mutedForeground,
    marginTop: 4,
  },
  scanStub: {
    paddingVertical: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tokenRow: { flexDirection: 'row', alignItems: 'center' },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.mutedForeground,
    marginBottom: 6,
  },
  pendingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 8,
    borderRadius: 6,
    backgroundColor: colors.secondary,
    marginTop: 6,
  },
  pendingLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 },
  jersey: {
    width: 28,
    textAlign: 'center',
    fontWeight: '700',
    color: colors.foreground,
  },
  pendingId: { fontSize: 12, color: colors.foreground, flexShrink: 1 },
  posBadge: { paddingHorizontal: 6, paddingVertical: 1 },
  posBadgeText: { fontSize: 10, color: colors.foreground },
  queueCard: {
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  queueTitle: { color: colors.foreground, fontWeight: '600', fontSize: 14 },
});
