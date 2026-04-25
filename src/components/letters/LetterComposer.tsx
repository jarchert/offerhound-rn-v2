// Parity port from Lovable src/components/letters/LetterComposer.tsx.
// Web→RN mapping: shadcn Card/Button/Input/Label/Textarea/Badge/Dialog → @/components/ui/*;
// lucide-react → lucide-react-native; sonner toast → @/components/ui/toast;
// fetch to Supabase edge function kept verbatim (reads EXPO_PUBLIC_* env);
// KeyboardAvoidingView wraps the screen body so the textarea stays visible on iOS.
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Textarea } from '@/components/ui/Textarea';
import { Badge } from '@/components/ui/Badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/Dialog';
import { FileText, Sparkles, Loader2, Send, Copy, Check, User, Users, GraduationCap, Building2, School, Mic } from 'lucide-react-native';
import { toast } from '@/components/ui/toast';
import * as Clipboard from 'expo-clipboard';
import { colors, typography, spacing, radius } from '@/lib/theme';

export type RecipientType = 'athlete' | 'parent' | 'coach';
export type RecipientCategory = 'athlete' | 'parent' | 'college-coach' | 'club-coach' | 'scout' | 'hs-coach' | 'influencer';
export type SenderType = 'athlete' | 'coach' | 'club-coach' | 'hs-coach' | 'scout' | 'influencer';

interface SenderProfile {
  name: string;
  email?: string;
  phone?: string;
  title?: string;
  school?: string;
  conference?: string;
  division?: string;
  position_coached?: string;
  company?: string;
  specialization?: string;
  regions_covered?: string[];
  sport?: string;
  primary_sport?: string;
  sports?: string[];
  secondary_sports?: any;
  position?: string;
  graduation_year?: string;
  gpa?: string;
  height?: string;
  weight?: string;
  city?: string;
  state?: string;
  highlights?: string[];
  club_name?: string;
  handle?: string;
  audience_size?: string;
  platforms?: string[];
}

interface LetterComposerProps {
  senderType: SenderType;
  senderProfile: SenderProfile;
  selectedLetterType: { type: string; title: string; description: string } | null;
  onSendLetter: (data: {
    recipientName: string;
    recipientEmail: string;
    recipientType: RecipientType;
    recipientCategory?: RecipientCategory;
    organizationName?: string;
    letterType: string;
    letterContent: string;
    athleteName?: string;
    athleteEmail?: string;
    athleteSchool?: string;
    inResponseToType?: string;
  }) => Promise<void>;
  isSending?: boolean;
  initialRecipientType?: RecipientType;
  initialRecipientName?: string;
  initialRecipientEmail?: string;
  initialOrganizationName?: string;
  initialRecipientTitle?: string;
  recipientCategory?: RecipientCategory;
}

const CATEGORY_TO_RECIPIENT_TYPE: Record<RecipientCategory, RecipientType> = {
  'athlete': 'athlete',
  'parent': 'parent',
  'college-coach': 'coach',
  'club-coach': 'coach',
  'scout': 'coach',
  'hs-coach': 'coach',
  'influencer': 'coach',
};

const SENDER_ICONS: Record<SenderType, any> = {
  athlete: User,
  coach: GraduationCap,
  'club-coach': Users,
  'hs-coach': School,
  scout: Building2,
  influencer: Mic,
};

export function LetterComposer({
  senderType,
  senderProfile,
  selectedLetterType,
  onSendLetter,
  isSending = false,
  initialRecipientType,
  initialRecipientName,
  initialRecipientEmail,
  initialOrganizationName,
  initialRecipientTitle,
  recipientCategory,
}: LetterComposerProps) {
  const lockedRecipientType = recipientCategory ? CATEGORY_TO_RECIPIENT_TYPE[recipientCategory] : undefined;
  const [recipientType, setRecipientType] = useState<RecipientType>(lockedRecipientType || initialRecipientType || 'athlete');
  const [recipientName, setRecipientName] = useState(initialRecipientName || '');
  const [recipientEmail, setRecipientEmail] = useState(initialRecipientEmail || '');
  const [organizationName, setOrganizationName] = useState(initialOrganizationName || '');
  const [recipientTitle, setRecipientTitle] = useState(initialRecipientTitle || '');
  const [athletePosition, setAthletePosition] = useState('');
  const [athleteSchool, setAthleteSchool] = useState('');
  const [athleteGradYear, setAthleteGradYear] = useState('');
  const [customContext, setCustomContext] = useState('');
  const [letterContent, setLetterContent] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [showSendDialog, setShowSendDialog] = useState(false);

  useEffect(() => { if (lockedRecipientType) setRecipientType(lockedRecipientType); else if (initialRecipientType) setRecipientType(initialRecipientType); }, [lockedRecipientType, initialRecipientType]);
  useEffect(() => { if (initialRecipientName) setRecipientName(initialRecipientName); }, [initialRecipientName]);
  useEffect(() => { if (initialRecipientEmail) setRecipientEmail(initialRecipientEmail); }, [initialRecipientEmail]);
  useEffect(() => { if (initialOrganizationName) setOrganizationName(initialOrganizationName); }, [initialOrganizationName]);
  useEffect(() => { if (initialRecipientTitle) setRecipientTitle(initialRecipientTitle); }, [initialRecipientTitle]);

  const isAthleteAudience = recipientCategory ? (recipientCategory === 'athlete' || recipientCategory === 'parent') : recipientType !== 'coach';
  const orgFieldLabel =
    recipientCategory === 'scout' ? 'Agency'
    : recipientCategory === 'hs-coach' ? 'High School'
    : recipientCategory === 'college-coach' ? 'Institution'
    : recipientCategory === 'club-coach' ? 'Club / Team'
    : recipientCategory === 'influencer' ? 'Outlet / Platform'
    : 'School / Organization';

  const handleGenerate = async () => {
    if (!selectedLetterType) { toast.error('Please select a letter type first'); return; }
    setIsGenerating(true);
    try {
      const body: Record<string, any> = {
        senderType,
        letterType: selectedLetterType.type,
        recipientType,
        recipientCategory: recipientCategory || (recipientType === 'coach' ? 'college-coach' : recipientType),
        customContext: customContext || undefined,
        senderProfile,
      };
      if (recipientName) {
        body.recipientInfo = {
          name: recipientName,
          email: recipientEmail || undefined,
          title: recipientTitle || undefined,
          organization: organizationName || undefined,
          position: isAthleteAudience ? (athletePosition || undefined) : undefined,
          school: isAthleteAudience ? (athleteSchool || undefined) : undefined,
          graduation_year: isAthleteAudience ? (athleteGradYear || undefined) : undefined,
        };
        body.athleteInfo = body.recipientInfo;
      }
      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
      const response = await fetch(`${supabaseUrl}/functions/v1/generate-coach-scout-letter`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${supabaseKey}` },
        body: JSON.stringify(body),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({} as any));
        toast.error(errorData.error || 'Failed to generate letter');
        return;
      }
      const data = await response.json();
      if (data.letter) { setLetterContent(data.letter); toast.success('Letter generated for this contact!'); }
    } catch (error) {
      console.error('Error generating letter:', error);
      toast.error('Failed to generate letter');
    } finally { setIsGenerating(false); }
  };

  const handleCopy = async () => { await Clipboard.setStringAsync(letterContent); setIsCopied(true); toast.success('Letter copied to clipboard'); setTimeout(() => setIsCopied(false), 2000); };

  const handleSend = async () => {
    if (!recipientEmail) { toast.error("Please enter the recipient's email"); return; }
    if (!letterContent.trim()) { toast.error('Letter content is empty'); return; }
    if (!selectedLetterType) return;
    try {
      await onSendLetter({
        recipientName: recipientName || 'Recipient',
        recipientEmail,
        recipientType,
        recipientCategory,
        organizationName: organizationName || undefined,
        letterType: selectedLetterType.type,
        letterContent,
        athleteName: isAthleteAudience ? recipientName : undefined,
        athleteEmail: isAthleteAudience ? recipientEmail : undefined,
        athleteSchool: athleteSchool || undefined,
      });
      setShowSendDialog(false);
      setLetterContent('');
      setRecipientName('');
      setRecipientEmail('');
      setOrganizationName('');
      setCustomContext('');
    } catch (error) { /* handled by parent */ }
  };

  const allRecipientButtons = [
    { type: 'athlete' as const, icon: User, label: 'Athlete' },
    { type: 'parent' as const, icon: Users, label: 'Parent' },
    { type: 'coach' as const, icon: GraduationCap, label: 'Coach' },
  ];
  const showRecipientSelector = !lockedRecipientType;

  const headingForRecipient =
    recipientCategory === 'athlete' ? 'Athlete Information'
    : recipientCategory === 'parent' ? 'Parent Information'
    : recipientCategory === 'college-coach' ? 'College Coach Information'
    : recipientCategory === 'club-coach' ? 'Club Coach Information'
    : recipientCategory === 'scout' ? 'Scout / Agency Information'
    : recipientCategory === 'hs-coach' ? 'High School Coach Information'
    : recipientCategory === 'influencer' ? 'Influencer / Media Information'
    : (recipientType === 'coach' ? 'Coach' : recipientType === 'parent' ? 'Parent' : 'Athlete') + ' Information';

  const SenderIcon = SENDER_ICONS[senderType] || User;
  const senderOrg = senderProfile.school || senderProfile.club_name || senderProfile.company || '';

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={s.kav}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}
    >
      <ScrollView contentContainerStyle={s.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={s.root}>
          {/* Sender profile card */}
          <Card style={s.senderCard}>
            <CardContent style={s.senderContent}>
              <View style={s.senderRow}>
                <View style={s.senderIconWrap}><SenderIcon size={20} color={colors.primary} /></View>
                <View style={{ flex: 1 }}>
                  <Text style={s.senderName}>{senderProfile.name}</Text>
                  <Text style={s.senderMeta} numberOfLines={1}>
                    {senderProfile.title ? `${senderProfile.title} • ` : ''}{senderOrg}{senderProfile.email ? ` • ${senderProfile.email}` : ''}
                  </Text>
                </View>
                <Badge variant="secondary"><Text style={s.badgeText}>{senderType.replace('-', ' ')} Profile</Text></Badge>
              </View>
            </CardContent>
          </Card>

          {showRecipientSelector && (
            <Card>
              <CardHeader><CardTitle><Text style={s.cardTitle}>Recipient Type</Text></CardTitle></CardHeader>
              <CardContent>
                <View style={s.recipientTypeRow}>
                  {allRecipientButtons.map(({ type, icon: Icon, label }) => (
                    <Button
                      key={type}
                      variant={recipientType === type ? 'default' : 'outline'}
                      size="sm"
                      onPress={() => setRecipientType(type)}
                      style={s.recipientTypeBtn}
                    >
                      <Icon size={14} color={recipientType === type ? colors.primaryForeground : colors.foreground} />
                      <Text style={[s.recipientTypeLabel, recipientType === type && { color: colors.primaryForeground }]}>  {label}</Text>
                    </Button>
                  ))}
                </View>
              </CardContent>
            </Card>
          )}

          {/* Recipient info form */}
          <Card>
            <CardHeader>
              <CardTitle>
                <Text style={s.cardTitle}>{headingForRecipient}<Text style={s.cardTitleSub}>  (optional for generation)</Text></Text>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <View style={s.formGroup}>
                <View style={s.formRow}>
                  <View style={s.formCol}>
                    <Label><Text style={s.labelText}>Name</Text></Label>
                    <Input value={recipientName} onChangeText={setRecipientName} placeholder="Recipient name" style={s.field} />
                  </View>
                  <View style={s.formCol}>
                    <Label><Text style={s.labelText}>Email</Text></Label>
                    <Input value={recipientEmail} onChangeText={setRecipientEmail} placeholder="email@example.com" keyboardType="email-address" autoCapitalize="none" style={s.field} />
                  </View>
                </View>

                {!isAthleteAudience && (
                  <View style={s.formRow}>
                    <View style={s.formCol}>
                      <Label><Text style={s.labelText}>{orgFieldLabel}</Text></Label>
                      <Input value={organizationName} onChangeText={setOrganizationName} placeholder={orgFieldLabel} style={s.field} />
                    </View>
                    <View style={s.formCol}>
                      <Label><Text style={s.labelText}>Title</Text></Label>
                      <Input value={recipientTitle} onChangeText={setRecipientTitle} placeholder="Head Coach, Director..." style={s.field} />
                    </View>
                  </View>
                )}

                {isAthleteAudience && (
                  <View style={s.formRow}>
                    <View style={s.formCol3}>
                      <Label><Text style={s.labelText}>Position</Text></Label>
                      <Input value={athletePosition} onChangeText={setAthletePosition} placeholder="QB, WR..." style={s.field} />
                    </View>
                    <View style={s.formCol3}>
                      <Label><Text style={s.labelText}>School</Text></Label>
                      <Input value={athleteSchool} onChangeText={setAthleteSchool} placeholder="High School" style={s.field} />
                    </View>
                    <View style={s.formCol3}>
                      <Label><Text style={s.labelText}>Class</Text></Label>
                      <Input value={athleteGradYear} onChangeText={setAthleteGradYear} placeholder="2026" style={s.field} />
                    </View>
                  </View>
                )}

                <View>
                  <Label><Text style={s.labelText}>Additional Context (Optional)</Text></Label>
                  <Textarea value={customContext} onChangeText={setCustomContext} placeholder="Add specific details to personalize the letter..." numberOfLines={2} style={s.textarea} />
                </View>
              </View>
            </CardContent>
          </Card>

          <Button onPress={handleGenerate} disabled={isGenerating || !selectedLetterType} size="lg" style={s.generateBtn}>
            {isGenerating ? (
              <View style={s.btnRow}><Loader2 size={16} color={colors.primaryForeground} /><Text style={s.btnPrimaryText}>  Generating tailored letter...</Text></View>
            ) : (
              <View style={s.btnRow}><Sparkles size={16} color={colors.primaryForeground} /><Text style={s.btnPrimaryText}>  Generate {selectedLetterType?.title || 'Letter'}</Text></View>
            )}
          </Button>

          {letterContent ? (
            <Card>
              <CardHeader>
                <View style={s.generatedHeaderRow}>
                  <CardTitle>
                    <View style={s.titleIconRow}><FileText size={14} color={colors.foreground} /><Text style={s.cardTitle}>  Generated Letter</Text></View>
                  </CardTitle>
                  <Badge variant="secondary"><Text style={s.badgeText}>{selectedLetterType?.title}</Text></Badge>
                </View>
                <CardDescription><Text style={s.cardDescText}>Edit below then copy or send</Text></CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea value={letterContent} onChangeText={setLetterContent} style={s.letterTextarea} multiline />
                <View style={s.actionsRow}>
                  <Button
                    onPress={() => { if (!recipientEmail) setShowSendDialog(true); else handleSend(); }}
                    disabled={isSending || !letterContent.trim()}
                    style={s.actionPrimary}
                  >
                    <View style={s.btnRow}>
                      {isSending ? <Loader2 size={16} color={colors.primaryForeground} /> : <Send size={16} color={colors.primaryForeground} />}
                      <Text style={s.btnPrimaryText}>  Save & Send</Text>
                    </View>
                  </Button>
                  <Button variant="outline" onPress={handleCopy} disabled={!letterContent.trim()}>
                    <View style={s.btnRow}>
                      {isCopied ? <Check size={16} color={colors.foreground} /> : <Copy size={16} color={colors.foreground} />}
                      <Text style={s.btnText}>  {isCopied ? 'Copied!' : 'Copy'}</Text>
                    </View>
                  </Button>
                  <Button variant="outline" onPress={handleGenerate} disabled={isGenerating}>
                    <View style={s.btnRow}><Sparkles size={16} color={colors.foreground} /><Text style={s.btnText}>  Regenerate</Text></View>
                  </Button>
                </View>
              </CardContent>
            </Card>
          ) : null}

          <Dialog open={showSendDialog} onOpenChange={setShowSendDialog}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Send Letter</DialogTitle>
                <DialogDescription>Enter the recipient's email to save and send this letter.</DialogDescription>
              </DialogHeader>
              <View style={s.dlgFormGroup}>
                <View>
                  <Label><Text style={s.labelText}>Recipient Name</Text></Label>
                  <Input value={recipientName} onChangeText={setRecipientName} placeholder="Recipient name" />
                </View>
                <View>
                  <Label><Text style={s.labelText}>Recipient Email</Text></Label>
                  <Input value={recipientEmail} onChangeText={setRecipientEmail} placeholder="email@example.com" keyboardType="email-address" autoCapitalize="none" />
                </View>
              </View>
              <DialogFooter>
                <Button variant="outline" onPress={() => setShowSendDialog(false)}><Text style={s.btnText}>Cancel</Text></Button>
                <Button onPress={handleSend} disabled={isSending || !recipientEmail}>
                  <View style={s.btnRow}>
                    {isSending ? <Loader2 size={16} color={colors.primaryForeground} /> : <Send size={16} color={colors.primaryForeground} />}
                    <Text style={s.btnPrimaryText}>  Send</Text>
                  </View>
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

export default LetterComposer;

const s = StyleSheet.create({
  kav: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  root: { gap: spacing.md, padding: spacing.sm },

  senderCard: { borderColor: colors.primary + '33', backgroundColor: colors.primary + '14' },
  senderContent: { padding: spacing.md },
  senderRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  senderIconWrap: { padding: spacing.xs + 2, borderRadius: radius.full, backgroundColor: colors.primary + '1A' },
  senderName: { fontFamily: typography.fontFamily.bodySemiBold, fontSize: typography.size.sm, color: colors.foreground },
  senderMeta: { fontFamily: typography.fontFamily.body, fontSize: typography.size.xs, color: colors.mutedForeground, marginTop: 2 },

  cardTitle: { fontFamily: typography.fontFamily.bodySemiBold, fontSize: typography.size.sm, color: colors.foreground },
  cardTitleSub: { fontFamily: typography.fontFamily.body, fontSize: typography.size.xs, color: colors.mutedForeground },
  cardDescText: { fontFamily: typography.fontFamily.body, fontSize: typography.size.xs, color: colors.mutedForeground },

  recipientTypeRow: { flexDirection: 'row', gap: spacing.xs },
  recipientTypeBtn: { flex: 1 },
  recipientTypeLabel: { fontFamily: typography.fontFamily.bodyMedium, fontSize: typography.size.sm, color: colors.foreground },

  formGroup: { gap: spacing.sm },
  formRow: { flexDirection: 'row', gap: spacing.sm },
  formCol: { flex: 1 },
  formCol3: { flex: 1 },
  field: { height: 36 },
  textarea: { minHeight: 60 },
  letterTextarea: { minHeight: 280, fontFamily: typography.fontFamily.body },

  labelText: { fontFamily: typography.fontFamily.bodyMedium, fontSize: typography.size.xs, color: colors.foreground },

  generateBtn: { width: '100%' },

  generatedHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  titleIconRow: { flexDirection: 'row', alignItems: 'center' },

  actionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.md },
  actionPrimary: { flex: 1 },

  btnRow: { flexDirection: 'row', alignItems: 'center' },
  btnPrimaryText: { fontFamily: typography.fontFamily.bodyMedium, color: colors.primaryForeground, fontSize: typography.size.sm },
  btnText: { fontFamily: typography.fontFamily.bodyMedium, color: colors.foreground, fontSize: typography.size.sm },

  badgeText: { fontFamily: typography.fontFamily.bodyMedium, color: colors.secondaryForeground, fontSize: typography.size.xs, textTransform: 'capitalize' },

  dlgFormGroup: { gap: spacing.md, marginTop: spacing.sm },
});
