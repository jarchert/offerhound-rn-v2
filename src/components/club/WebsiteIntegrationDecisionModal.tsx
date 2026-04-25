import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { AlertTriangle, Check, Globe, Code, Server, Monitor, Smartphone } from 'lucide-react-native';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { RadioGroup } from '@/components/ui/RadioGroup';
import { Badge } from '@/components/ui/Badge';
import { colors, typography, spacing } from '@/lib/theme';
import { isNativePlatform } from '@/lib/platform';
import { useToast } from '@/hooks/use-toast';

type Tier = 'link' | 'embed' | 'subdomain';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (tier: Tier) => void;
}

const TIERS: Array<{
  value: Tier;
  title: string;
  effort: string;
  time: string;
  bestFor: string;
  risk: 'low' | 'medium' | 'high';
  icon: typeof Globe;
}> = [
  {
    value: 'link',
    title: 'Link Only',
    effort: 'None',
    time: '1 minute',
    bestFor: 'Coaches who just want a clickable link from their site',
    risk: 'low',
    icon: Globe,
  },
  {
    value: 'embed',
    title: 'Embed Widget',
    effort: 'Copy/paste 1 line of code',
    time: '5 minutes',
    bestFor: 'Coaches with a Wix, Squarespace, or WordPress site',
    risk: 'medium',
    icon: Code,
  },
  {
    value: 'subdomain',
    title: 'Custom Subdomain',
    effort: 'Edit DNS records (e.g. roster.myclub.com)',
    time: '30 min + up to 24h DNS propagation',
    bestFor: 'Tech-savvy coaches with full control of their domain',
    risk: 'high',
    icon: Server,
  },
];

// Risk badge palette (approximates Lovable green/amber/red tinted chips)
const RISK_BADGE: Record<'low' | 'medium' | 'high', { bg: string; border: string; text: string; label: string }> = {
  low:    { bg: 'rgba(22,161,73,0.10)',  border: 'rgba(22,161,73,0.30)',  text: '#16a149', label: 'Low risk' },
  medium: { bg: 'rgba(244,158,10,0.10)', border: 'rgba(244,158,10,0.30)', text: '#f49e0a', label: 'Medium' },
  high:   { bg: 'rgba(220,40,40,0.10)',  border: 'rgba(220,40,40,0.30)',  text: '#dc2828', label: 'Advanced' },
};

export const WebsiteIntegrationDecisionModal = ({ open, onOpenChange, onConfirm }: Props) => {
  const [selected, setSelected] = useState<Tier | null>(null);
  const { toast } = useToast();
  const native = isNativePlatform();

  // Native guard: show a toast and close instead of rendering full modal
  if (native && open) {
    toast({
      title: 'Web-only feature',
      description: "Website integrations are configured on the OfferHound web app. Open offerhound.com on your computer to set this up.",
    });
    onOpenChange(false);
    return null;
  }

  const handleConfirm = () => {
    if (!selected) return;
    onConfirm(selected);
    onOpenChange(false);
    setSelected(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent style={s.content}>
        <DialogHeader>
          <View style={s.titleRow}>
            <Globe size={24} color={colors.primary} />
            <DialogTitle>Before You Connect Your Website</DialogTitle>
          </View>
          <DialogDescription>
            Choose how deeply you want to integrate your existing club website with OfferHound.
          </DialogDescription>
        </DialogHeader>

        <ScrollView contentContainerStyle={s.body}>
          {/* Web-only banner */}
          <View style={s.banner}>
            <AlertTriangle size={20} color="#f49e0a" style={{ marginTop: 2 }} />
            <View style={s.bannerBody}>
              <View style={s.bannerTitleRow}>
                <Monitor size={16} color={colors.foreground} />
                <Text style={s.bannerTitle}>This is a web-only feature</Text>
                <View style={{ opacity: 0.5 }}><Smartphone size={16} color={colors.foreground} /></View>
              </View>
              <Text style={s.bannerText}>
                Website integrations are managed from the OfferHound web app and won't appear in the iOS/Android mobile app.
                Your athletes and parents will still see your roster normally on mobile.
              </Text>
            </View>
          </View>

          {/* Decision matrix */}
          <View style={s.matrix}>
            <View style={s.matrixCard}>
              <Text style={s.matrixHeading}>✅ OfferHound Provides</Text>
              <View style={s.bulletItem}><Check size={12} color="#16a149" style={s.bulletIcon} /><Text style={s.bulletText}>Embed code snippet</Text></View>
              <View style={s.bulletItem}><Check size={12} color="#16a149" style={s.bulletIcon} /><Text style={s.bulletText}>Live roster widget (auto-updates)</Text></View>
              <View style={s.bulletItem}><Check size={12} color="#16a149" style={s.bulletIcon} /><Text style={s.bulletText}>"Powered by OfferHound" badge</Text></View>
              <View style={s.bulletItem}><Check size={12} color="#16a149" style={s.bulletIcon} /><Text style={s.bulletText}>Widget view analytics</Text></View>
            </View>
            <View style={s.matrixCard}>
              <Text style={s.matrixHeading}>🛠 You Provide</Text>
              <Text style={s.bulletText}>Access to edit your website's HTML</Text>
              <Text style={s.bulletText}>A page on your site to host the widget</Text>
              <Text style={s.bulletText}>DNS access (only for custom subdomain)</Text>
              <Text style={s.bulletText}>Ongoing maintenance of your external site</Text>
            </View>
          </View>

          {/* Tier selector */}
          <View>
            <Text style={s.sectionLabel}>Pick an integration tier</Text>
            <RadioGroup value={selected ?? ''} onValueChange={(v: string) => setSelected(v as Tier)}>
              {TIERS.map((tier) => {
                const Icon = tier.icon;
                const isSelected = selected === tier.value;
                const riskStyle = RISK_BADGE[tier.risk];
                return (
                  <Pressable
                    key={tier.value}
                    onPress={() => setSelected(tier.value)}
                    style={[s.tierRow, isSelected ? s.tierRowSelected : null]}
                  >
                    <View style={[s.radioOuter, isSelected && s.radioOuterSelected]}>
                      {isSelected && <View style={s.radioInner} />}
                    </View>
                    <Icon size={20} color={colors.primary} style={{ marginTop: 2 }} />
                    <View style={s.tierBody}>
                      <View style={s.tierTitleRow}>
                        <Text style={s.tierTitle}>{tier.title}</Text>
                        <Badge variant="outline" style={{ backgroundColor: riskStyle.bg, borderColor: riskStyle.border }}>
                          <Text style={{ color: riskStyle.text, fontSize: 10, fontFamily: typography.fontFamily.bodySemiBold }}>{riskStyle.label}</Text>
                        </Badge>
                      </View>
                      <Text style={s.tierMeta}>
                        <Text style={s.tierMetaStrong}>Effort:</Text> {tier.effort} · <Text style={s.tierMetaStrong}>Setup:</Text> {tier.time}
                      </Text>
                      <Text style={s.tierBestFor}>{tier.bestFor}</Text>
                      {tier.value === 'subdomain' && (
                        <View style={s.warnRow}>
                          <AlertTriangle size={12} color="#dc2828" style={{ marginTop: 2 }} />
                          <Text style={s.warnText}>
                            Incorrect DNS settings can break your existing website. Test on a staging subdomain first.
                          </Text>
                        </View>
                      )}
                    </View>
                  </Pressable>
                );
              })}
            </RadioGroup>
          </View>

          <Text style={s.footnote}>
            You can disconnect any integration at any time from this same screen.
          </Text>
        </ScrollView>

        <DialogFooter>
          <Button variant="ghost" onPress={() => onOpenChange(false)}>Cancel</Button>
          <Button onPress={handleConfirm} disabled={!selected}>
            I Understand — Continue
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default WebsiteIntegrationDecisionModal;

const s = StyleSheet.create({
  content: { maxWidth: 640, width: '100%' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  body: { gap: spacing.md, paddingBottom: spacing.sm },

  banner: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(244,158,10,0.30)',
    backgroundColor: 'rgba(244,158,10,0.10)',
  },
  bannerBody: { flex: 1, gap: 4 },
  bannerTitleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, flexWrap: 'wrap' },
  bannerTitle: { fontFamily: typography.fontFamily.bodySemiBold, fontSize: typography.fontSize.sm, color: colors.foreground },
  bannerText: { fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.sm, color: colors.mutedForeground },

  matrix: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  matrixCard: { flex: 1, minWidth: 220, borderRadius: 8, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, padding: spacing.sm, gap: 4 },
  matrixHeading: { fontFamily: typography.fontFamily.bodySemiBold, fontSize: typography.fontSize.sm, color: colors.foreground, marginBottom: 4 },
  bulletItem: { flexDirection: 'row', gap: spacing.xs, alignItems: 'flex-start' },
  bulletIcon: { marginTop: 3 },
  bulletText: { fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.xs, color: colors.mutedForeground },

  sectionLabel: { fontFamily: typography.fontFamily.bodySemiBold, fontSize: typography.fontSize.sm, color: colors.foreground, marginBottom: spacing.xs },

  tierRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.xs,
  },
  tierRowSelected: { borderColor: colors.primary, backgroundColor: 'rgba(231,175,8,0.05)' },
  radioOuter: { width: 18, height: 18, borderRadius: 9, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  radioOuterSelected: { borderColor: colors.primary },
  radioInner: { width: 9, height: 9, borderRadius: 5, backgroundColor: colors.primary },
  tierBody: { flex: 1, minWidth: 0, gap: 2 },
  tierTitleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, flexWrap: 'wrap' },
  tierTitle: { fontFamily: typography.fontFamily.bodySemiBold, fontSize: typography.fontSize.base, color: colors.foreground },
  tierMeta: { fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.xs, color: colors.mutedForeground, marginTop: 2 },
  tierMetaStrong: { fontFamily: typography.fontFamily.bodySemiBold, color: colors.foreground },
  tierBestFor: { fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.xs, color: colors.mutedForeground, marginTop: 2 },
  warnRow: { flexDirection: 'row', gap: 4, marginTop: spacing.xs },
  warnText: { flex: 1, fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.xs, color: '#dc2828' },

  footnote: { fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.xs, color: colors.mutedForeground, textAlign: 'center', marginTop: spacing.xs },
});
