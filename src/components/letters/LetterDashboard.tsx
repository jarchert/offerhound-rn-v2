// Parity port from Lovable src/components/letters/LetterDashboard.tsx.
// Web→RN mapping: shadcn Card/Tabs/Dialog/ScrollArea/Input/Button/Badge → @/components/ui/*;
// react-router-dom useSearchParams → @react-navigation/native useRoute (route.params);
// lucide-react → lucide-react-native; sonner toast → @/components/ui/toast;
// Tailwind → StyleSheet using @/lib/theme tokens. DropdownMenu replaced with inline Dialog action sheet.
import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useRoute } from '@react-navigation/native';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { ScrollArea } from '@/components/ui/ScrollArea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/Dialog';
import { FileText, History, Mail, Search, Loader2, Trash2, Copy, Send, MoreHorizontal, Eye, Sparkles, X, User, GraduationCap, Building2, School } from 'lucide-react-native';
import { format, formatDistanceToNow } from 'date-fns';
import { toast } from '@/components/ui/toast';
import * as Clipboard from 'expo-clipboard';
import { Linking } from 'react-native';
import { LetterTypeCard } from './LetterTypeCard';
import { LetterComposer } from './LetterComposer';
import type { RecipientType, RecipientCategory, SenderType } from './LetterComposer';
import { colors, typography, spacing, radius } from '@/lib/theme';

interface LetterTypeConfig { type: string; title: string; description: string; category?: string; audiences?: RecipientCategory[]; }
interface HistoryEntry { id: string; recipient_name?: string; athlete_name?: string; recipient_email?: string; athlete_email?: string; recipient_type?: string; organization_name?: string; athlete_school?: string | null; letter_type: string; letter_content: string; in_response_to_type?: string | null; sent_at: string; }
interface SenderProfile { name: string; email?: string; phone?: string; title?: string; school?: string; conference?: string; division?: string; position_coached?: string; company?: string; specialization?: string; regions_covered?: string[]; sport?: string; primary_sport?: string; sports?: string[]; secondary_sports?: any; position?: string; graduation_year?: string; gpa?: string; height?: string; weight?: string; city?: string; state?: string; highlights?: string[]; club_name?: string; handle?: string; audience_size?: string; platforms?: string[]; }

interface LetterDashboardProps {
  senderType: SenderType;
  senderProfile: SenderProfile;
  letterTypes: LetterTypeConfig[];
  history: HistoryEntry[];
  historyLoading: boolean;
  onSendLetter: (data: { recipientName: string; recipientEmail: string; recipientType: RecipientType; recipientCategory?: RecipientCategory; organizationName?: string; letterType: string; letterContent: string; athleteName?: string; athleteEmail?: string; athleteSchool?: string; inResponseToType?: string; }) => Promise<void>;
  onDeleteHistory: (id: string) => void;
  isSending?: boolean;
  pageTitle: string;
  pageDescription: string;
}

const CATEGORY_META: Record<RecipientCategory, { label: string; icon: any; description: string; defaultRecipientType: RecipientType }> = {
  'athlete': { label: 'Athlete', icon: User, description: 'Letter to a high school athlete', defaultRecipientType: 'athlete' },
  'parent': { label: 'Parent / Guardian', icon: User, description: "Letter to an athlete's parent or guardian", defaultRecipientType: 'parent' },
  'college-coach': { label: 'College Coach', icon: GraduationCap, description: 'Outreach to a college program', defaultRecipientType: 'coach' },
  'club-coach': { label: 'Club Coach', icon: GraduationCap, description: 'Outreach to a club / travel team coach', defaultRecipientType: 'coach' },
  'scout': { label: 'Scout / Agency', icon: Building2, description: 'Outreach to a recruiting scout or agency', defaultRecipientType: 'coach' },
  'hs-coach': { label: 'High School Coach', icon: School, description: 'Outreach to a high school head coach', defaultRecipientType: 'coach' },
  'influencer': { label: 'Influencer / Media', icon: Building2, description: 'Outreach to a recruiting media creator', defaultRecipientType: 'coach' },
};

// Local prefill sanitizer (mirrors useLetterCenter.sanitizeLetterPrefill on web).
function sanitizeLetterPrefill(params: Record<string, any> = {}) {
  const str = (v: any) => (typeof v === 'string' && v.trim() ? v.trim() : undefined);
  const cat = str(params.recipientCategory) as RecipientCategory | undefined;
  const validCats: RecipientCategory[] = ['athlete','parent','college-coach','club-coach','scout','hs-coach','influencer'];
  const validTypes: RecipientType[] = ['athlete','parent','coach'];
  const rt = str(params.recipientType) as RecipientType | undefined;
  return {
    recipientCategory: cat && validCats.includes(cat) ? cat : undefined,
    recipientType: rt && validTypes.includes(rt) ? rt : undefined,
    recipientName: str(params.recipientName),
    recipientEmail: str(params.recipientEmail),
    organizationName: str(params.organizationName),
    recipientTitle: str(params.recipientTitle),
    letterType: str(params.letterType),
  };
}

export function LetterDashboard({ senderType, senderProfile, letterTypes, history, historyLoading, onSendLetter, onDeleteHistory, isSending, pageTitle, pageDescription }: LetterDashboardProps) {
  const route = useRoute<any>();
  const searchParams = (route?.params || {}) as Record<string, any>;
  const [activeTab, setActiveTab] = useState<'compose' | 'history'>('compose');
  const [selectedType, setSelectedType] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewingLetter, setViewingLetter] = useState<HistoryEntry | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [actionMenuFor, setActionMenuFor] = useState<HistoryEntry | null>(null);
  const [audienceCleared, setAudienceCleared] = useState(false);

  const sanitized = useMemo(() => sanitizeLetterPrefill(searchParams), [searchParams]);
  const recipientCategory = audienceCleared ? null : (sanitized.recipientCategory ?? null);

  const prefill = useMemo(() => ({
    recipientType: sanitized.recipientType ?? (recipientCategory ? CATEGORY_META[recipientCategory]?.defaultRecipientType : undefined),
    recipientName: audienceCleared ? undefined : sanitized.recipientName,
    recipientEmail: audienceCleared ? undefined : sanitized.recipientEmail,
    organizationName: audienceCleared ? undefined : sanitized.organizationName,
    recipientTitle: audienceCleared ? undefined : sanitized.recipientTitle,
  }), [sanitized, recipientCategory, audienceCleared]);

  const visibleLetterTypes = useMemo(() => {
    if (!recipientCategory) return letterTypes;
    return letterTypes.filter((lt) => !lt.audiences || lt.audiences.includes(recipientCategory));
  }, [letterTypes, recipientCategory]);

  useEffect(() => {
    const t = sanitized.letterType;
    if (t && visibleLetterTypes.some((lt) => lt.type === t)) {
      setSelectedType(t);
      setActiveTab('compose');
    } else if (!selectedType && visibleLetterTypes.length > 0 && (prefill.recipientName || prefill.recipientEmail || recipientCategory)) {
      setSelectedType(visibleLetterTypes[0].type);
      setActiveTab('compose');
    } else if (selectedType && !visibleLetterTypes.some((lt) => lt.type === selectedType)) {
      setSelectedType(visibleLetterTypes[0]?.type || '');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sanitized.letterType, visibleLetterTypes]);

  const selectedLetterType = visibleLetterTypes.find((lt) => lt.type === selectedType) || null;
  const categorizedTypes = visibleLetterTypes.reduce<Record<string, LetterTypeConfig[]>>((acc, lt) => { const cat = lt.category || 'general'; if (!acc[cat]) acc[cat] = []; acc[cat].push(lt); return acc; }, {});
  const filteredHistory = history.filter((entry) => {
    const name = entry.recipient_name || entry.athlete_name || '';
    const email = entry.recipient_email || entry.athlete_email || '';
    const q = searchQuery.toLowerCase();
    return name.toLowerCase().includes(q) || email.toLowerCase().includes(q) || entry.letter_type.toLowerCase().includes(q);
  });
  const getLetterTypeTitle = (typeId: string) => letterTypes.find((lt) => lt.type === typeId)?.title || typeId.replace(/-/g, ' ');
  const handleCopyLetter = async (content: string) => { await Clipboard.setStringAsync(content); toast.success('Letter copied to clipboard!'); };
  const handleResend = (entry: HistoryEntry) => {
    const email = entry.recipient_email || entry.athlete_email || '';
    if (email) Linking.openURL(`mailto:${email}?subject=Follow-up&body=${encodeURIComponent(entry.letter_content)}`).catch(() => {});
  };
  const clearAudience = () => { setAudienceCleared(true); setSelectedType(''); };

  const audienceMeta = recipientCategory ? CATEGORY_META[recipientCategory] : null;
  const AudienceIcon = audienceMeta?.icon;

  return (
    <View style={s.root}>
      <View>
        <Text style={s.pageTitle}>{pageTitle}</Text>
        <Text style={s.pageDescription}>{pageDescription}</Text>
      </View>

      {audienceMeta && AudienceIcon && (
        <Card style={s.audienceCard}>
          <CardContent style={s.audienceContent}>
            <View style={s.audienceIconWrap}><AudienceIcon size={20} color={colors.primary} /></View>
            <View style={s.audienceText}>
              <Text style={s.audienceTitle}>Composing for: {audienceMeta.label}{prefill.recipientName ? ` — ${prefill.recipientName}` : ''}</Text>
              <Text style={s.audienceSub}>{audienceMeta.description}. Templates and AI tone are tailored to this audience.</Text>
            </View>
            <Button variant="ghost" size="sm" onPress={clearAudience}>
              <X size={14} color={colors.foreground} /> <Text style={s.btnGhostText}>Show all</Text>
            </Button>
          </CardContent>
        </Card>
      )}

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'compose' | 'history')}>
        <TabsList>
          <TabsTrigger value="compose"><Sparkles size={14} color={colors.foreground} /><Text style={s.tabText}>  Letter Templates</Text></TabsTrigger>
          <TabsTrigger value="history"><History size={14} color={colors.foreground} /><Text style={s.tabText}>  History ({history.length})</Text></TabsTrigger>
        </TabsList>

        <TabsContent value="compose">
          <View style={s.composeGrid}>
            <View style={s.typeListColumn}>
              <View>
                <View style={s.sectionTitleRow}>
                  <FileText size={18} color={colors.primary} />
                  <Text style={s.sectionTitle}>  Choose Letter Type</Text>
                </View>
                <Text style={s.sectionSub}>{audienceMeta ? `Templates for ${audienceMeta.label.toLowerCase()} contact` : 'Select a type, then generate with your profile pre-filled'}</Text>
              </View>
              <ScrollArea style={s.typeScroll}>
                <View style={s.typeListInner}>
                  {visibleLetterTypes.length === 0 ? (
                    <Card><CardContent style={s.emptyContent}><Text style={s.emptyText}>No templates available for this audience.</Text></CardContent></Card>
                  ) : (
                    Object.entries(categorizedTypes).map(([category, types]) => (
                      <View key={category} style={s.categoryGroup}>
                        {Object.keys(categorizedTypes).length > 1 && <Text style={s.categoryHeading}>{category.replace(/-/g, ' ')}</Text>}
                        <View style={s.typeListItems}>
                          {types.map((lt) => (
                            <LetterTypeCard
                              key={lt.type}
                              type={lt.type}
                              title={lt.title}
                              description={lt.description}
                              category={Object.keys(categorizedTypes).length <= 1 ? lt.category : undefined}
                              isSelected={selectedType === lt.type}
                              onClick={() => setSelectedType(lt.type)}
                            />
                          ))}
                        </View>
                      </View>
                    ))
                  )}
                </View>
              </ScrollArea>
            </View>

            <View style={s.composerColumn}>
              {selectedLetterType ? (
                <LetterComposer
                  senderType={senderType}
                  senderProfile={senderProfile}
                  selectedLetterType={selectedLetterType}
                  onSendLetter={onSendLetter}
                  isSending={isSending}
                  initialRecipientType={prefill.recipientType}
                  initialRecipientName={prefill.recipientName}
                  initialRecipientEmail={prefill.recipientEmail}
                  initialOrganizationName={prefill.organizationName}
                  initialRecipientTitle={prefill.recipientTitle}
                  recipientCategory={recipientCategory || undefined}
                />
              ) : (
                <Card style={s.placeholderCard}>
                  <CardContent style={s.placeholderContent}>
                    <FileText size={64} color={colors.mutedForeground} />
                    <Text style={s.placeholderTitle}>Select a Letter Type</Text>
                    <Text style={s.placeholderSub}>Choose a letter template from the left to get started.</Text>
                  </CardContent>
                </Card>
              )}
            </View>
          </View>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader>
              <View style={s.historyHeaderRow}>
                <View style={{ flex: 1 }}>
                  <CardTitle>
                    <View style={s.titleIconRow}><History size={18} color={colors.foreground} /><Text style={s.cardTitleText}>  Letter History</Text></View>
                  </CardTitle>
                  <CardDescription>View, resend, and manage your previous letters</CardDescription>
                </View>
                <View style={s.searchWrap}>
                  <Search size={16} color={colors.mutedForeground} style={s.searchIcon} />
                  <Input placeholder="Search letters..." value={searchQuery} onChangeText={setSearchQuery} style={s.searchInput} />
                </View>
              </View>
            </CardHeader>
            <CardContent>
              {historyLoading ? (
                <View style={s.loadingWrap}><Loader2 size={24} color={colors.primary} /></View>
              ) : filteredHistory.length === 0 ? (
                <View style={s.emptyHistory}>
                  <Mail size={48} color={colors.mutedForeground} />
                  <Text style={s.emptyHistoryTitle}>No letters yet</Text>
                  <Text style={s.emptyHistorySub}>{searchQuery ? 'No letters match your search' : 'Generate and send your first letter to see it here'}</Text>
                </View>
              ) : (
                <ScrollArea style={s.historyScroll}>
                  <View style={s.historyList}>
                    {filteredHistory.map((entry) => {
                      const name = entry.recipient_name || entry.athlete_name || 'Unknown';
                      const email = entry.recipient_email || entry.athlete_email || '';
                      const org = entry.organization_name || entry.athlete_school || '';
                      return (
                        <View key={entry.id} style={s.historyItem}>
                          <View style={s.historyItemRow}>
                            <View style={{ flex: 1 }}>
                              <View style={s.historyTitleRow}>
                                <Text style={s.historyName} numberOfLines={1}>{name}</Text>
                                <Badge variant="secondary"><Text style={s.badgeText}>{getLetterTypeTitle(entry.letter_type)}</Text></Badge>
                              </View>
                              <Text style={s.historyEmail} numberOfLines={1}>{email}{org ? ` • ${org}` : ''}</Text>
                              <Text style={s.historyMeta}>Sent {formatDistanceToNow(new Date(entry.sent_at), { addSuffix: true })} • {format(new Date(entry.sent_at), 'MMM d, yyyy')}</Text>
                            </View>
                            <Button variant="ghost" size="icon" onPress={() => setActionMenuFor(entry)}>
                              <MoreHorizontal size={16} color={colors.foreground} />
                            </Button>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Action menu (DropdownMenu replacement) */}
      <Dialog open={!!actionMenuFor} onOpenChange={(o) => !o && setActionMenuFor(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Actions</DialogTitle></DialogHeader>
          <View style={s.actionList}>
            <Pressable style={s.actionItem} onPress={() => { if (actionMenuFor) { setViewingLetter(actionMenuFor); setActionMenuFor(null); } }}>
              <Eye size={16} color={colors.foreground} /><Text style={s.actionText}>  View</Text>
            </Pressable>
            <Pressable style={s.actionItem} onPress={() => { if (actionMenuFor) { handleCopyLetter(actionMenuFor.letter_content); setActionMenuFor(null); } }}>
              <Copy size={16} color={colors.foreground} /><Text style={s.actionText}>  Copy</Text>
            </Pressable>
            <Pressable style={s.actionItem} onPress={() => { if (actionMenuFor) { handleResend(actionMenuFor); setActionMenuFor(null); } }}>
              <Send size={16} color={colors.foreground} /><Text style={s.actionText}>  Resend</Text>
            </Pressable>
            <Pressable style={s.actionItem} onPress={() => { if (actionMenuFor) { setDeleteConfirmId(actionMenuFor.id); setActionMenuFor(null); } }}>
              <Trash2 size={16} color={colors.destructive} /><Text style={[s.actionText, { color: colors.destructive }]}>  Delete</Text>
            </Pressable>
          </View>
        </DialogContent>
      </Dialog>

      <Dialog open={!!viewingLetter} onOpenChange={(o) => !o && setViewingLetter(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              <View style={s.titleIconRow}><FileText size={18} color={colors.foreground} /><Text style={s.cardTitleText}>  {viewingLetter?.recipient_name || viewingLetter?.athlete_name}</Text></View>
            </DialogTitle>
            <DialogDescription>
              <View style={s.dlgDescRow}>
                <Badge variant="secondary"><Text style={s.badgeText}>{viewingLetter ? getLetterTypeTitle(viewingLetter.letter_type) : ''}</Text></Badge>
                <Text style={s.dlgDescText}>  • {viewingLetter?.sent_at ? format(new Date(viewingLetter.sent_at), "MMMM d, yyyy 'at' h:mm a") : ''}</Text>
              </View>
            </DialogDescription>
          </DialogHeader>
          <ScrollArea style={s.viewerScroll}>
            <View style={s.viewerBody}><Text style={s.viewerText}>{viewingLetter?.letter_content}</Text></View>
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onPress={() => setViewingLetter(null)}><Text style={s.btnText}>Close</Text></Button>
            <Button onPress={() => { if (viewingLetter) handleCopyLetter(viewingLetter.letter_content); }}>
              <Copy size={14} color={colors.primaryForeground} /><Text style={s.btnPrimaryText}>  Copy Letter</Text>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteConfirmId} onOpenChange={(o) => !o && setDeleteConfirmId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Letter</DialogTitle>
            <DialogDescription>Are you sure? This action cannot be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onPress={() => setDeleteConfirmId(null)}><Text style={s.btnText}>Cancel</Text></Button>
            <Button variant="destructive" onPress={() => { if (deleteConfirmId) { onDeleteHistory(deleteConfirmId); setDeleteConfirmId(null); } }}>
              <Text style={s.btnPrimaryText}>Delete</Text>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </View>
  );
}

export default LetterDashboard;

const s = StyleSheet.create({
  root: { gap: spacing.lg, padding: spacing.md },
  pageTitle: { fontFamily: typography.fontFamily.heading, fontSize: typography.heading.h2, color: colors.foreground, letterSpacing: typography.letterSpacing.heading },
  pageDescription: { fontFamily: typography.fontFamily.body, color: colors.mutedForeground, marginTop: spacing.xs, fontSize: typography.size.sm },

  audienceCard: { borderColor: colors.primary + '4D', backgroundColor: colors.primary + '14' },
  audienceContent: { padding: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  audienceIconWrap: { padding: spacing.xs + 2, borderRadius: radius.full, backgroundColor: colors.primary + '1A' },
  audienceText: { flex: 1, minWidth: 0 },
  audienceTitle: { fontFamily: typography.fontFamily.bodySemiBold, fontSize: typography.size.sm, color: colors.foreground },
  audienceSub: { fontFamily: typography.fontFamily.body, fontSize: typography.size.xs, color: colors.mutedForeground, marginTop: 2 },
  btnGhostText: { fontFamily: typography.fontFamily.bodyMedium, color: colors.foreground, fontSize: typography.size.sm },

  tabText: { fontFamily: typography.fontFamily.bodyMedium, color: colors.foreground, fontSize: typography.size.sm },

  composeGrid: { flexDirection: 'column', gap: spacing.md, marginTop: spacing.md },
  typeListColumn: { gap: spacing.sm },
  composerColumn: { },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center' },
  sectionTitle: { fontFamily: typography.fontFamily.bodySemiBold, fontSize: typography.size.lg, color: colors.foreground },
  sectionSub: { fontFamily: typography.fontFamily.body, fontSize: typography.size.xs, color: colors.mutedForeground, marginTop: 2 },
  typeScroll: { maxHeight: 480 },
  typeListInner: { gap: spacing.md, paddingRight: spacing.xs },
  categoryGroup: { gap: spacing.xs },
  categoryHeading: { fontFamily: typography.fontFamily.bodyMedium, fontSize: typography.size.xs, color: colors.mutedForeground, textTransform: 'uppercase', letterSpacing: typography.letterSpacing.wide, marginBottom: spacing.xs },
  typeListItems: { gap: spacing.sm },

  emptyContent: { padding: spacing.lg, alignItems: 'center' },
  emptyText: { fontFamily: typography.fontFamily.body, fontSize: typography.size.sm, color: colors.mutedForeground },

  placeholderCard: { minHeight: 400, alignItems: 'center', justifyContent: 'center' },
  placeholderContent: { alignItems: 'center', paddingVertical: spacing.xl },
  placeholderTitle: { fontFamily: typography.fontFamily.bodySemiBold, fontSize: typography.size.lg, color: colors.foreground, marginTop: spacing.md },
  placeholderSub: { fontFamily: typography.fontFamily.body, fontSize: typography.size.sm, color: colors.mutedForeground, textAlign: 'center', maxWidth: 320, marginTop: spacing.xs },

  historyHeaderRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: spacing.sm },
  cardTitleText: { fontFamily: typography.fontFamily.bodySemiBold, color: colors.foreground, fontSize: typography.size.base },
  titleIconRow: { flexDirection: 'row', alignItems: 'center' },
  searchWrap: { width: '100%', maxWidth: 320, position: 'relative' },
  searchIcon: { position: 'absolute', left: 10, top: 12, zIndex: 1 },
  searchInput: { paddingLeft: 36, height: 36 },

  loadingWrap: { alignItems: 'center', paddingVertical: spacing.lg },

  emptyHistory: { alignItems: 'center', paddingVertical: spacing.xl },
  emptyHistoryTitle: { fontFamily: typography.fontFamily.bodyMedium, color: colors.foreground, marginTop: spacing.md },
  emptyHistorySub: { fontFamily: typography.fontFamily.body, fontSize: typography.size.sm, color: colors.mutedForeground, marginTop: spacing.xs },

  historyScroll: { maxHeight: 500 },
  historyList: { gap: spacing.sm },
  historyItem: { padding: spacing.md, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, backgroundColor: colors.card },
  historyItemRow: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md, alignItems: 'flex-start' },
  historyTitleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, flexWrap: 'wrap' },
  historyName: { fontFamily: typography.fontFamily.bodyMedium, color: colors.foreground, fontSize: typography.size.base },
  historyEmail: { fontFamily: typography.fontFamily.body, color: colors.mutedForeground, fontSize: typography.size.sm, marginTop: 2 },
  historyMeta: { fontFamily: typography.fontFamily.body, color: colors.mutedForeground, fontSize: typography.size.xs, marginTop: 4 },
  badgeText: { fontFamily: typography.fontFamily.bodyMedium, color: colors.secondaryForeground, fontSize: typography.size.xs },

  actionList: { gap: spacing.xs, marginTop: spacing.sm },
  actionItem: { flexDirection: 'row', alignItems: 'center', padding: spacing.sm, borderRadius: radius.sm },
  actionText: { fontFamily: typography.fontFamily.body, color: colors.foreground, fontSize: typography.size.sm },

  dlgDescRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
  dlgDescText: { fontFamily: typography.fontFamily.body, color: colors.mutedForeground, fontSize: typography.size.xs },

  viewerScroll: { maxHeight: 360 },
  viewerBody: { backgroundColor: colors.secondary + '4D', padding: spacing.md, borderRadius: radius.md },
  viewerText: { fontFamily: typography.fontFamily.body, color: colors.foreground, fontSize: typography.size.sm },

  btnText: { fontFamily: typography.fontFamily.bodyMedium, color: colors.foreground, fontSize: typography.size.sm },
  btnPrimaryText: { fontFamily: typography.fontFamily.bodyMedium, color: colors.primaryForeground, fontSize: typography.size.sm },
});
