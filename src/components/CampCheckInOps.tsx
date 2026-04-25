// Ported verbatim from Lovable src/components/CampCheckInOps.tsx
// Web → RN mapping:
//   - Tailwind classes → StyleSheet using @/lib/theme tokens
//   - shadcn/ui imports → @/components/ui/* (PascalCase)
//   - lucide-react → lucide-react-native
//   - useToast hook → @/components/ui/toast (toast() function)
//   - <Input ref> + onKeyDown Enter → TextInput ref + onSubmitEditing
//   - autoFocus retained via TextInput autoFocus
//   - input onChange(e.target.value) → onChangeText(text)
//   - GAP: QR camera scanning UI not implemented — expo-barcode-scanner /
//     expo-camera are NOT installed. Manual token entry path is fully ported;
//     a future enhancement can wire a Pressable that opens a Camera scanner
//     and writes its result into scanInput.
//   - Hover/transition/responsive utility classes are no-ops in RN
import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { toast } from '@/components/ui/toast';
import {
  QrCode,
  UserCheck,
  Users,
  Clock,
  Loader2,
  Search,
  Shuffle,
  LayoutGrid,
  CheckCircle2,
} from 'lucide-react-native';
import { colors, typography, spacing, radius } from '@/lib/theme';

interface Enrollment {
  id: string;
  camp_id: string;
  user_id: string;
  athlete_profile_id: string | null;
  status: string;
  payment_status: string;
  jersey_number: string | null;
  group_assignment: string | null;
  position_group: string | null;
  qr_code_token: string | null;
  checked_in_at: string | null;
  notes: string | null;
  created_at: string;
}

interface CampCheckInOpsProps {
  campId: string;
  campName: string;
  drillStations?: any[];
  positions?: string[];
}

export function CampCheckInOps({ campId, campName, drillStations = [], positions = [] }: CampCheckInOpsProps) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('checkin');
  const [scanInput, setScanInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const scanRef = useRef<TextInput>(null);

  const { data: enrollments = [], isLoading } = useQuery({
    queryKey: ['camp-ops-enrollments', campId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('camp_enrollments')
        .select('*')
        .eq('camp_id', campId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data || []) as Enrollment[];
    },
    refetchInterval: 5000,
  });

  const checkIn = useMutation({
    mutationFn: async (enrollmentId: string) => {
      const { error } = await supabase
        .from('camp_enrollments')
        .update({ status: 'checked_in', checked_in_at: new Date().toISOString() } as any)
        .eq('id', enrollmentId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['camp-ops-enrollments', campId] });
    },
  });

  const bulkUpdate = useMutation({
    mutationFn: async (updates: { id: string; group_assignment?: string; position_group?: string }[]) => {
      for (const { id, ...rest } of updates) {
        const { error } = await supabase
          .from('camp_enrollments')
          .update(rest as any)
          .eq('id', id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['camp-ops-enrollments', campId] });
      toast.success('Assignments Updated');
    },
  });

  const handleScan = async () => {
    const token = scanInput.trim();
    if (!token) return;
    const match = enrollments.find(e => e.qr_code_token === token || e.qr_code_token?.startsWith(token));
    if (match) {
      if (match.status === 'checked_in') {
        toast.success('Already Checked In', `Athlete #${match.jersey_number || match.id.slice(0, 8)} is already checked in.`);
      } else {
        await checkIn.mutateAsync(match.id);
        toast.success('✓ Checked In!', `Athlete #${match.jersey_number || match.id.slice(0, 8)} checked in successfully.`);
      }
    } else {
      toast.error('Not Found', 'No enrollment found for this QR code.');
    }
    setScanInput('');
    scanRef.current?.focus();
  };

  const handleAutoAssignGroups = () => {
    const checkedIn = enrollments.filter(e => e.status === 'checked_in');
    const groupCount = Math.max(2, Math.min(8, Math.ceil(checkedIn.length / 10)));
    const groupLetters = 'ABCDEFGH'.split('').slice(0, groupCount);
    const updates = checkedIn.map((e, i) => ({ id: e.id, group_assignment: groupLetters[i % groupLetters.length] }));
    bulkUpdate.mutate(updates);
  };

  const handleAutoAssignPositions = () => {
    const checkedIn = enrollments.filter(e => e.status === 'checked_in' && !e.position_group);
    if (positions.length === 0) {
      toast.error('No Positions', 'This camp has no positions configured.');
      return;
    }
    const updates = checkedIn.map((e, i) => ({ id: e.id, position_group: positions[i % positions.length] }));
    bulkUpdate.mutate(updates);
  };

  const total = enrollments.length;
  const checkedInCount = enrollments.filter(e => e.status === 'checked_in').length;
  const pendingCount = enrollments.filter(e => e.status === 'registered' || e.status === 'paid').length;
  const groups = ([...new Set(enrollments.map(e => e.group_assignment).filter(Boolean))] as string[]).sort();
  const positionGroups = ([...new Set(enrollments.map(e => e.position_group).filter(Boolean))] as string[]).sort();

  const filteredEnrollments = enrollments.filter(e => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      e.jersey_number?.toLowerCase().includes(term) ||
      e.group_assignment?.toLowerCase().includes(term) ||
      e.position_group?.toLowerCase().includes(term) ||
      e.id.toLowerCase().includes(term)
    );
  });

  const stats = [
    { label: 'Total Registered', value: total, Icon: Users, color: colors.primary },
    { label: 'Checked In', value: checkedInCount, Icon: CheckCircle2, color: colors.success },
    { label: 'Pending', value: pendingCount, Icon: Clock, color: colors.warning },
    { label: 'Groups', value: groups.length, Icon: LayoutGrid, color: colors.info },
  ];

  const checkInPct = total > 0 ? Math.round((checkedInCount / total) * 100) : 0;

  return (
    <View style={s.root}>
      <View>
        <Text style={s.h3}>Camp Operations — {campName}</Text>
        <Text style={s.muted}>Check-in, attendance, and group management</Text>
      </View>

      {/* Live Stats Bar */}
      <View style={s.statsGrid}>
        {stats.map(({ label, value, Icon, color }) => (
          <Card key={label} style={s.statCard}>
            <CardContent style={s.statContent}>
              <View style={s.statRow}>
                <Icon width={16} height={16} color={color} />
                <Text style={s.statValue}>{value}</Text>
              </View>
              <Text style={s.statLabel}>{label}</Text>
            </CardContent>
          </Card>
        ))}
      </View>

      {/* Check-in rate bar */}
      <View style={{ gap: 4 }}>
        <View style={s.progressLabelRow}>
          <Text style={s.muted}>Check-in Progress</Text>
          <Text style={s.progressPct}>{checkInPct}%</Text>
        </View>
        <View style={s.progressTrack}>
          <View style={[s.progressFill, { width: `${checkInPct}%` }]} />
        </View>
      </View>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="checkin">Check-In</TabsTrigger>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
          <TabsTrigger value="groups">Groups</TabsTrigger>
        </TabsList>

        {/* CHECK-IN TAB */}
        <TabsContent value="checkin" style={{ gap: spacing.md }}>
          <Card>
            <CardHeader>
              <CardTitle style={s.cardTitleRow}>
                <QrCode width={20} height={20} color={colors.foreground} />
                <Text style={s.cardTitleText}>  QR Code / Manual Check-In</Text>
              </CardTitle>
            </CardHeader>
            <CardContent style={{ gap: spacing.md }}>
              <View style={s.scanRow}>
                <View style={{ flex: 1 }}>
                  <Input
                    ref={scanRef as any}
                    placeholder="Scan QR code or enter token..."
                    value={scanInput}
                    onChangeText={setScanInput}
                    onSubmitEditing={handleScan}
                    autoFocus
                    style={s.mono}
                  />
                </View>
                <Button onPress={handleScan} disabled={!scanInput.trim()}>
                  Check In
                </Button>
              </View>
              <Text style={s.tinyMuted}>
                Scan an athlete's QR code or paste their token to check them in instantly.
              </Text>
            </CardContent>
          </Card>

          {/* Quick check-in list */}
          <View style={{ gap: spacing.xs }}>
            <Text style={s.sectionLabel}>Pending Check-Ins ({pendingCount})</Text>
            {enrollments
              .filter(e => e.status !== 'checked_in' && e.status !== 'cancelled')
              .map(e => (
                <Card key={e.id}>
                  <CardContent style={s.pendingRow}>
                    <View style={s.pendingLeft}>
                      {e.jersey_number ? (
                        <View style={s.jerseyBubble}>
                          <Text style={s.jerseyText}>{e.jersey_number}</Text>
                        </View>
                      ) : null}
                      <View>
                        <Text style={s.pendingName}>Athlete #{e.id.slice(0, 8)}</Text>
                        <View style={s.badgeRow}>
                          {e.position_group ? <Badge variant="outline">{e.position_group}</Badge> : null}
                          <Badge variant="secondary">{e.payment_status}</Badge>
                        </View>
                      </View>
                    </View>
                    <Button
                      size="sm"
                      onPress={() => {
                        checkIn.mutate(e.id);
                        toast.success('✓ Checked In!');
                      }}
                      disabled={checkIn.isPending}
                    >
                      Check In
                    </Button>
                  </CardContent>
                </Card>
              ))}
            {pendingCount === 0 ? (
              <Text style={s.centerMuted}>All athletes checked in! 🎉</Text>
            ) : null}
          </View>
        </TabsContent>

        {/* ATTENDANCE TAB */}
        <TabsContent value="attendance" style={{ gap: spacing.md }}>
          <View style={s.searchWrap}>
            <Search width={16} height={16} color={colors.mutedForeground} style={s.searchIcon} />
            <Input
              placeholder="Search by jersey, group, position..."
              value={searchTerm}
              onChangeText={setSearchTerm}
              style={{ paddingLeft: 36 }}
            />
          </View>

          <View style={{ gap: 4 }}>
            {isLoading ? (
              <View style={s.centerPad}>
                <ActivityIndicator size="small" color={colors.primary} />
              </View>
            ) : filteredEnrollments.length === 0 ? (
              <Text style={s.centerMuted}>No enrollments found</Text>
            ) : (
              filteredEnrollments.map(e => (
                <View
                  key={e.id}
                  style={[
                    s.attendRow,
                    e.status === 'checked_in' ? s.attendRowCheckedIn : s.attendRowDefault,
                  ]}
                >
                  <View style={s.pendingLeft}>
                    <View style={[s.dot, { backgroundColor: e.status === 'checked_in' ? colors.success : colors.warning }]} />
                    {e.jersey_number ? <Text style={s.jerseyInline}>{e.jersey_number}</Text> : null}
                    <Text style={s.bodySm}>#{e.id.slice(0, 8)}</Text>
                    {e.position_group ? <Badge variant="outline">{e.position_group}</Badge> : null}
                    {e.group_assignment ? <Badge variant="secondary">Group {e.group_assignment}</Badge> : null}
                  </View>
                  <View style={s.attendRight}>
                    {e.checked_in_at ? (
                      <Text style={s.tinyMuted}>
                        {new Date(e.checked_in_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </Text>
                    ) : null}
                    <Badge variant={e.status === 'checked_in' ? 'default' : 'secondary'}>
                      {e.status === 'checked_in' ? 'Present' : e.status}
                    </Badge>
                  </View>
                </View>
              ))
            )}
          </View>
        </TabsContent>

        {/* GROUPS & ROTATION TAB */}
        <TabsContent value="groups" style={{ gap: spacing.md }}>
          <View style={s.actionRow}>
            <Button size="sm" variant="outline" onPress={handleAutoAssignGroups} disabled={bulkUpdate.isPending}>
              Auto-Assign Groups
            </Button>
            <Button size="sm" variant="outline" onPress={handleAutoAssignPositions} disabled={bulkUpdate.isPending}>
              Auto-Assign Positions
            </Button>
            {bulkUpdate.isPending ? <ActivityIndicator size="small" color={colors.primary} /> : null}
          </View>

          {groups.length > 0 ? (
            <View style={s.groupGrid}>
              {groups.map(group => {
                const members = enrollments.filter(e => e.group_assignment === group);
                return (
                  <Card key={group} style={s.groupCard}>
                    <CardHeader style={{ paddingBottom: spacing.xs }}>
                      <CardTitle style={s.groupTitleRow}>
                        <Text style={s.cardTitleText}>Group {group}</Text>
                        <Badge variant="secondary">{String(members.length)}</Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent style={{ gap: 4 }}>
                      {members.map(m => (
                        <View key={m.id} style={s.memberRow}>
                          <View style={s.pendingLeft}>
                            {m.jersey_number ? <Text style={s.jerseyInline}>{m.jersey_number}</Text> : null}
                            <Text style={s.bodySm}>#{m.id.slice(0, 6)}</Text>
                          </View>
                          <View style={s.memberRight}>
                            {m.position_group ? <Badge variant="outline">{m.position_group}</Badge> : null}
                            <View style={[s.dotSm, { backgroundColor: m.status === 'checked_in' ? colors.success : colors.warning }]} />
                          </View>
                        </View>
                      ))}
                    </CardContent>
                  </Card>
                );
              })}
            </View>
          ) : (
            <Card>
              <CardContent style={s.emptyContent}>
                <LayoutGrid width={48} height={48} color={colors.mutedForeground} />
                <Text style={[s.muted, { marginTop: spacing.md }]}>No groups assigned yet</Text>
                <Text style={s.tinyMutedCenter}>
                  Use "Auto-Assign Groups" to distribute checked-in athletes into groups.
                </Text>
              </CardContent>
            </Card>
          )}

          {/* Position Groups */}
          {positionGroups.length > 0 ? (
            <View>
              <Text style={[s.sectionLabel, { marginBottom: spacing.sm }]}>By Position</Text>
              <View style={s.groupGrid}>
                {positionGroups.map(pos => {
                  const members = enrollments.filter(e => e.position_group === pos);
                  return (
                    <Card key={pos} style={s.groupCard}>
                      <CardHeader style={{ paddingBottom: spacing.xs }}>
                        <CardTitle style={s.groupTitleRow}>
                          <Text style={s.cardTitleText}>{pos}</Text>
                          <Badge variant="outline">{String(members.length)}</Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent style={{ gap: 4 }}>
                        {members.map(m => (
                          <View key={m.id} style={s.memberRow}>
                            <View style={s.pendingLeft}>
                              {m.jersey_number ? <Text style={s.jerseyInline}>{m.jersey_number}</Text> : null}
                              <Text style={s.bodySm}>#{m.id.slice(0, 6)}</Text>
                            </View>
                            <View style={[s.dotSm, { backgroundColor: m.status === 'checked_in' ? colors.success : colors.warning }]} />
                          </View>
                        ))}
                      </CardContent>
                    </Card>
                  );
                })}
              </View>
            </View>
          ) : null}
        </TabsContent>
      </Tabs>
    </View>
  );
}

const s = StyleSheet.create({
  root: { gap: spacing.lg },
  h3: { fontFamily: typography.fontFamily.heading, fontSize: typography.heading.h5, color: colors.foreground, letterSpacing: typography.letterSpacing.heading },
  muted: { fontSize: typography.size.sm, color: colors.mutedForeground },
  tinyMuted: { fontSize: typography.size.xs, color: colors.mutedForeground },
  tinyMutedCenter: { fontSize: typography.size.xs, color: colors.mutedForeground, textAlign: 'center' },
  centerMuted: { fontSize: typography.size.sm, color: colors.mutedForeground, textAlign: 'center', paddingVertical: spacing.md },
  centerPad: { alignItems: 'center', paddingVertical: spacing.lg },

  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  statCard: { flexBasis: '48%', flexGrow: 1 },
  statContent: { paddingTop: spacing.md, paddingBottom: spacing.sm },
  statRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  statValue: { fontFamily: typography.fontFamily.heading, fontSize: typography.size.xl, color: colors.primary, letterSpacing: typography.letterSpacing.heading },
  statLabel: { fontSize: typography.size.xs, color: colors.mutedForeground, marginTop: 4 },

  progressLabelRow: { flexDirection: 'row', justifyContent: 'space-between' },
  progressPct: { fontSize: typography.size.sm, color: colors.foreground, fontFamily: typography.fontFamily.bodyMedium },
  progressTrack: { height: 12, backgroundColor: colors.secondary, borderRadius: 999, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: colors.primary, borderRadius: 999 },

  cardTitleRow: { flexDirection: 'row', alignItems: 'center' },
  cardTitleText: { fontFamily: typography.fontFamily.bodySemiBold, fontSize: typography.size.base, color: colors.foreground },

  scanRow: { flexDirection: 'row', gap: spacing.xs, alignItems: 'center' },
  mono: { fontFamily: 'Courier' },

  sectionLabel: { fontSize: typography.size.sm, color: colors.mutedForeground, fontFamily: typography.fontFamily.bodySemiBold },

  pendingRow: { paddingVertical: spacing.sm, paddingHorizontal: spacing.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  pendingLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexShrink: 1 },
  pendingName: { fontSize: typography.size.sm, color: colors.foreground, fontFamily: typography.fontFamily.bodyMedium },
  badgeRow: { flexDirection: 'row', gap: 4, marginTop: 2 },
  jerseyBubble: { width: 36, height: 36, borderRadius: 999, backgroundColor: colors.secondary, alignItems: 'center', justifyContent: 'center' },
  jerseyText: { fontFamily: typography.fontFamily.heading, fontSize: typography.size.sm, color: colors.foreground },
  jerseyInline: { fontFamily: typography.fontFamily.heading, fontSize: typography.size.sm, color: colors.foreground, width: 28, textAlign: 'center' },
  bodySm: { fontSize: typography.size.sm, color: colors.foreground },

  searchWrap: { position: 'relative', flex: 1 },
  searchIcon: { position: 'absolute', left: 12, top: '50%', marginTop: -8, zIndex: 1 },

  attendRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.sm, borderRadius: radius.md },
  attendRowCheckedIn: { backgroundColor: 'rgba(22,161,73,0.05)', borderWidth: 1, borderColor: 'rgba(22,161,73,0.2)' },
  attendRowDefault: { backgroundColor: 'rgba(39,43,52,0.3)' },
  attendRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  dot: { width: 10, height: 10, borderRadius: 999 },
  dotSm: { width: 8, height: 8, borderRadius: 999 },

  actionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, alignItems: 'center' },
  groupGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  groupCard: { flexBasis: '100%', flexGrow: 1 },
  groupTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  memberRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 6, borderRadius: radius.sm },
  memberRight: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  emptyContent: { paddingVertical: spacing.xl, alignItems: 'center' },
});
