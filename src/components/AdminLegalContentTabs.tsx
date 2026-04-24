// Ported verbatim from Lovable web (src/components/AdminLegalContentTabs.tsx).
// Web → RN mappings:
//   - localStorage → @react-native-async-storage/async-storage (async, loaded in useEffect)
//   - dangerouslySetInnerHTML + sanitizeHtml → plain-text preview via htmlToPlainText (RN has no native HTML renderer)
//   - lucide-react → lucide-react-native
//   - Tabs: controlled (value/onValueChange) instead of uncontrolled defaultValue
//   - Button: onPress + leftIcon/loading instead of children-icon + onClick
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { Badge } from '@/components/ui/Badge';
import { Label } from '@/components/ui/Label';
import { useToast } from '@/hooks/use-toast';
import { Save, FileText, Eye, Edit, Users, MessageSquare, Heart } from 'lucide-react-native';
import { sanitizeHtml, htmlToPlainText } from '@/lib/sanitizeHtml';
import { AdminLegalContentEditor } from './AdminLegalContentEditor';
import { colors, typography, spacing } from '@/lib/theme';

interface ContentEditorProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  storageKey: string;
  defaultContent: string;
}

function SimpleContentEditor({ title, description, icon, storageKey, defaultContent }: ContentEditorProps) {
  const { toast } = useToast();
  const [content, setContent] = useState<string>(defaultContent);
  const [isPreview, setIsPreview] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [saving, setSaving] = useState(false);

  // Mirror of web `useState(() => localStorage.getItem(storageKey) || defaultContent)`
  // — AsyncStorage is async, so hydrate after mount.
  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(storageKey).then((saved) => {
      if (!cancelled && saved != null) setContent(saved);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [storageKey]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await AsyncStorage.setItem(storageKey, content);
      setHasChanges(false);
      toast({
        title: 'Content Saved',
        description: `${title} content has been saved successfully.`,
      });
    } catch (_error: any) {
      toast({
        title: 'Error',
        description: 'Failed to save content',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleContentChange = (value: string) => {
    setContent(value);
    setHasChanges(true);
  };

  const formatContentForPreview = (text: string): string => {
    return text.replace(/\n\n/g, '</p><p>').replace(/\n/g, '<br>');
  };

  return (
    <Card>
      <CardHeader>
        <View style={s.headerRow}>
          <View style={s.headerLeft}>
            <View style={s.titleRow}>
              {icon}
              <CardTitle style={s.titleText}>{title}</CardTitle>
            </View>
            <CardDescription>{description}</CardDescription>
          </View>
          <View style={s.actions}>
            {hasChanges && (
              <Badge variant="outline" style={s.unsavedBadge}>Unsaved Changes</Badge>
            )}
            <Button
              variant="outline"
              size="sm"
              onPress={() => setIsPreview(!isPreview)}
              leftIcon={isPreview
                ? <Edit size={16} color={colors.foreground} />
                : <Eye size={16} color={colors.foreground} />}
            >
              {isPreview ? 'Edit' : 'Preview'}
            </Button>
            <Button
              onPress={handleSave}
              disabled={!hasChanges || saving}
              loading={saving}
              size="sm"
              leftIcon={!saving ? <Save size={16} color={colors.primaryForeground} /> : undefined}
            >
              Save Changes
            </Button>
          </View>
        </View>
      </CardHeader>

      <CardContent style={s.content}>
        {isPreview ? (
          <ScrollView style={s.previewBox} nestedScrollEnabled>
            {/* GAP: RN has no native HTML renderer; preview shows plain text (tags stripped).
                Web uses dangerouslySetInnerHTML={{ __html: sanitizeHtml(formatContentForPreview(content)) }}. */}
            <Text style={s.previewText}>
              {htmlToPlainText(sanitizeHtml(formatContentForPreview(content)))}
            </Text>
          </ScrollView>
        ) : (
          <View style={s.editorBlock}>
            <View style={s.editorHeader}>
              <Label>{`${title} Content`}</Label>
              <Text style={s.hint}>Supports basic HTML formatting</Text>
            </View>
            <Textarea
              value={content}
              onChangeText={handleContentChange}
              rows={20}
              style={s.textarea}
              placeholder={`Enter ${title} content...`}
            />
          </View>
        )}

        {/* Formatting Help */}
        <View style={s.helpBox}>
          <Text style={s.helpTitle}>Formatting Guide</Text>
          <View style={s.helpGrid}>
            {[
              ['<h2>', 'Section headings'],
              ['<h3>', 'Subsection headings'],
              ['<p>', 'Paragraphs'],
              ['<ul><li>', 'Lists'],
              ['<strong>', 'Bold text'],
              ['<em>', 'Italic text'],
              ['<a href="">', 'Links'],
              ['<br>', 'Line breaks'],
            ].map(([tag, label]) => (
              <View key={tag} style={s.helpRow}>
                <Text style={s.code}>{tag}</Text>
                <Text style={s.helpLabel}> {label}</Text>
              </View>
            ))}
          </View>
        </View>
      </CardContent>
    </Card>
  );
}

const defaultCommunityGuidelines = `<h2>1. Our Community Values</h2>
<p>OfferHound is committed to creating a safe, respectful, and supportive environment for all athletes, coaches, scouts, and families in our community.</p>

<h2>2. Respect & Professionalism</h2>
<p>All interactions on our platform should be conducted with professionalism and mutual respect. Harassment, bullying, or discriminatory behavior of any kind will not be tolerated.</p>

<h2>3. Authentic Representation</h2>
<p>Users must represent themselves and their accomplishments honestly. Falsifying athletic achievements, academic records, or other credentials is strictly prohibited.</p>

<h2>4. Privacy & Safety</h2>
<p>Protect the privacy of others. Do not share personal information about other users without their consent. Report any suspicious or inappropriate behavior immediately.</p>

<h2>5. Content Standards</h2>
<p>All content uploaded to the platform must be appropriate for all ages and relevant to athletic recruiting. Inappropriate, offensive, or irrelevant content will be removed.</p>

<h2>6. Enforcement</h2>
<p>Violations of these guidelines may result in warnings, temporary suspension, or permanent removal from the platform, depending on the severity of the offense.</p>`;

const defaultCoachScoutCommunicationRules = `<h2>1. Communication Guidelines</h2>
<p>OfferHound facilitates communication between athletes and college coaches, scouts, and scouting agencies while maintaining appropriate boundaries and NCAA compliance.</p>

<h2>2. NCAA Compliance</h2>
<p>All communications must comply with applicable NCAA, NAIA, and conference recruiting rules. Coaches, scouts, and agencies are responsible for ensuring their communications adhere to applicable policies.</p>

<h2>3. For College Coaches</h2>
<ul>
<li>Only initiate contact with athletes who have expressed interest in your program</li>
<li>Follow NCAA/NAIA/NJCAA recruiting calendars and contact rules</li>
<li>Include parents/guardians in communications for athletes under 18</li>
<li>Maintain professional, recruiting-focused communications</li>
</ul>

<h2>4. For Independent Scouts</h2>
<ul>
<li>Clearly identify yourself as an independent scout</li>
<li>Be transparent about your experience and any affiliations</li>
<li>Provide honest, constructive feedback to athletes</li>
<li>Never promise roster spots or scholarships</li>
<li>Maintain confidentiality of athlete evaluations</li>
</ul>

<h2>5. For Scouting Agencies</h2>
<ul>
<li>Complete OfferHound agency verification</li>
<li>Clearly disclose all fees and services upfront</li>
<li>Never guarantee specific recruiting outcomes</li>
<li>Operate with full transparency regarding program relationships</li>
<li>Provide written contracts outlining services and costs</li>
</ul>

<h2>6. Prohibited Communications</h2>
<ul>
<li>Requests for personal financial information</li>
<li>Pressure tactics or ultimatums</li>
<li>Guaranteed outcomes in exchange for payment</li>
<li>Disparaging other coaches, scouts, or agencies</li>
<li>Communications outside of platform guidelines</li>
</ul>

<h2>7. Reporting Concerns</h2>
<p>If you receive inappropriate communications, please report them immediately using our platform's reporting feature or contact compliance@offer-hound.com.</p>`;

const defaultParentSafety = `<h2>1. Our Commitment to Safety</h2>
<p>OfferHound prioritizes the safety and well-being of all young athletes on our platform. We work diligently to create a secure environment for the recruiting process.</p>

<h2>2. Parental Involvement</h2>
<p>We encourage parents and guardians to be actively involved in their athlete's recruiting journey. Our platform provides tools for:</p>
<ul>
<li>Linked family accounts for visibility into athlete activity</li>
<li>Optional parental approval for communications</li>
<li>Email notifications for profile views and coach contacts</li>
</ul>

<h2>3. Privacy Protections</h2>
<p>We implement robust privacy measures to protect athlete information:</p>
<ul>
<li>Athletes control what personal information is publicly visible</li>
<li>Contact information can be hidden from public view</li>
<li>Only verified coaches and scouts can access athlete profiles</li>
</ul>

<h2>4. Age-Appropriate Safeguards</h2>
<p>For athletes under 18, we implement additional protections including parental consent requirements and content filtering.</p>

<h2>5. Verified Users</h2>
<p>Coaches and scouts undergo verification before gaining full platform access. This includes institutional email verification and background screening for certain access levels.</p>

<h2>6. Reporting & Support</h2>
<p>If you have concerns about any interaction on our platform, please contact us immediately at:</p>
<ul>
<li>Email: safety@offer-hound.com</li>
<li>Phone: 214-707-5708</li>
</ul>

<h2>7. Educational Resources</h2>
<p>We provide resources to help families navigate the recruiting process safely and effectively. Visit our Help Center for guides, FAQs, and best practices.</p>`;

export function AdminLegalContentTabs() {
  // Web uses <Tabs defaultValue="terms-privacy">. RN Tabs here is controlled.
  const [tab, setTab] = useState('terms-privacy');
  return (
    <Tabs value={tab} onValueChange={setTab} style={s.tabsRoot}>
      <TabsList style={s.tabsList}>
        <TabsTrigger value="terms-privacy" style={s.triggerGap}>
          <View style={s.triggerInner}>
            <FileText size={16} color={colors.foreground} />
            <Text style={s.triggerLabel}> Terms & Privacy</Text>
          </View>
        </TabsTrigger>
        <TabsTrigger value="community-guidelines" style={s.triggerGap}>
          <View style={s.triggerInner}>
            <Users size={16} color={colors.foreground} />
            <Text style={s.triggerLabel}> Community Guidelines</Text>
          </View>
        </TabsTrigger>
        <TabsTrigger value="coach-communication" style={s.triggerGap}>
          <View style={s.triggerInner}>
            <MessageSquare size={16} color={colors.foreground} />
            <Text style={s.triggerLabel}> Coach & Scout Rules</Text>
          </View>
        </TabsTrigger>
        <TabsTrigger value="parent-safety" style={s.triggerGap}>
          <View style={s.triggerInner}>
            <Heart size={16} color={colors.foreground} />
            <Text style={s.triggerLabel}> Parent Trust & Safety</Text>
          </View>
        </TabsTrigger>
      </TabsList>

      <TabsContent value="terms-privacy">
        <AdminLegalContentEditor />
      </TabsContent>

      <TabsContent value="community-guidelines">
        <SimpleContentEditor
          title="Community Guidelines"
          description="Define the standards and expectations for all OfferHound community members"
          icon={<Users size={20} color={colors.foreground} />}
          storageKey="offerhound_community_guidelines"
          defaultContent={defaultCommunityGuidelines}
        />
      </TabsContent>

      <TabsContent value="coach-communication">
        <SimpleContentEditor
          title="Coach & Scout Communication Rules"
          description="Guidelines for appropriate communication between coaches, scouts, scouting agencies, and athletes"
          icon={<MessageSquare size={20} color={colors.foreground} />}
          storageKey="offerhound_coach_scout_communication_rules"
          defaultContent={defaultCoachScoutCommunicationRules}
        />
      </TabsContent>

      <TabsContent value="parent-safety">
        <SimpleContentEditor
          title="Parent Trust & Safety"
          description="Information and safeguards for parents and guardians of athletes"
          icon={<Heart size={20} color={colors.foreground} />}
          storageKey="offerhound_parent_safety"
          defaultContent={defaultParentSafety}
        />
      </TabsContent>
    </Tabs>
  );
}

export default AdminLegalContentTabs;

const s = StyleSheet.create({
  tabsRoot: { gap: spacing.md },
  tabsList: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, padding: spacing.xs },
  triggerGap: { flexDirection: 'row' },
  triggerInner: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  triggerLabel: { fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.sm, color: colors.foreground },

  headerRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: spacing.sm },
  headerLeft: { flex: 1, minWidth: 200 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  titleText: { marginLeft: 0 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, flexWrap: 'wrap' },
  unsavedBadge: { borderColor: '#d97706' },

  content: { gap: spacing.lg },
  previewBox: {
    borderWidth: 1, borderColor: colors.border, borderRadius: 12,
    padding: spacing.lg, backgroundColor: colors.card, maxHeight: 600,
  },
  previewText: { fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.sm, color: colors.foreground, lineHeight: 20 },

  editorBlock: { gap: spacing.xs },
  editorHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  hint: { fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.xs, color: colors.mutedForeground },
  textarea: { minHeight: 500, fontFamily: 'monospace' as any, fontSize: typography.fontSize.sm },

  helpBox: { backgroundColor: colors.muted, borderRadius: 12, padding: spacing.md },
  helpTitle: { fontFamily: typography.fontFamily.bodySemiBold, fontSize: typography.fontSize.sm, color: colors.foreground, marginBottom: spacing.xs },
  helpGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  helpRow: { flexDirection: 'row', alignItems: 'center', minWidth: '45%' },
  code: {
    fontFamily: 'monospace' as any, fontSize: typography.fontSize.xs,
    color: colors.foreground, backgroundColor: colors.card,
    paddingHorizontal: 4, borderRadius: 4,
  },
  helpLabel: { fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.xs, color: colors.mutedForeground },
});
