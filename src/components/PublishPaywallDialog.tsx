// Ported from Lovable web (src/components/PublishPaywallDialog.tsx) — RN-adapted.
// Translations:
//   - shadcn Dialog → src/components/ui/Dialog (Modal-based)
//   - shadcn Button → src/components/ui/Button (variant="ghost", leftIcon)
//   - lucide-react → lucide-react-native
//   - react-router-dom useNavigate("/pricing") → useNavigation().navigate('SettingsStack', { screen: 'Pricing' })
//   - Tailwind classes → StyleSheet via tokens (colors/spacing/typography)
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Crown, Lock } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { colors, spacing, typography } from '@/lib/theme';

interface PublishPaywallDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PublishPaywallDialog({ open, onOpenChange }: PublishPaywallDialogProps) {
  const navigation = useNavigation<any>();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent style={s.content}>
        <DialogHeader style={s.header}>
          <View style={s.iconCircle}>
            <Lock size={24} color={colors.primary} />
          </View>
          <DialogTitle style={s.title}>Subscription Required</DialogTitle>
          <DialogDescription style={s.description}>
            To make your profile public and visible to college coaches and scouts, you need at least a{' '}
            <Text style={s.strong}>Recruit Pro</Text> subscription ($4.99/mo).
          </DialogDescription>
        </DialogHeader>

        <View style={s.benefitsBox}>
          <View style={s.benefitsHeader}>
            <Crown size={16} color={colors.primary} />
            <Text style={s.benefitsHeaderText}>What you get with Recruit Pro:</Text>
          </View>
          <View style={s.list}>
            {[
              'Professional public athlete profile',
              'AI-powered recruiting letters',
              'Coach search & contact tools',
              'Performance stats showcase',
              'Photo & video gallery',
            ].map((item) => (
              <View key={item} style={s.listItem}>
                <Text style={s.bullet}>•</Text>
                <Text style={s.listText}>{item}</Text>
              </View>
            ))}
          </View>
        </View>

        <DialogFooter style={s.footer}>
          <Button
            onPress={() => {
              onOpenChange(false);
              navigation.navigate('Pricing' as never);
            }}
            style={s.fullWidth}
            leftIcon={<Crown size={16} color={colors.primaryForeground} />}
          >
            View Plans & Subscribe
          </Button>
          <Button variant="ghost" onPress={() => onOpenChange(false)} style={s.fullWidth}>
            Stay on Free (Profile stays private)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const s = StyleSheet.create({
  content: { maxWidth: 448 },
  header: { alignItems: 'center', gap: spacing.xs },
  iconCircle: {
    height: 48,
    width: 48,
    borderRadius: 24,
    backgroundColor: colors.primary + '1A', // ~10% alpha
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
    alignSelf: 'center',
  },
  title: { textAlign: 'center' },
  description: { textAlign: 'center' },
  strong: { fontFamily: typography.fontFamily.body, fontWeight: '700', color: colors.foreground },
  benefitsBox: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.primary + '33', // ~20% alpha
    backgroundColor: colors.primary + '0D', // ~5% alpha
    padding: spacing.md,
    gap: spacing.xs,
  },
  benefitsHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  benefitsHeaderText: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    color: colors.foreground,
  },
  list: { gap: 4, marginLeft: spacing.md },
  listItem: { flexDirection: 'row', gap: spacing.xs },
  bullet: { color: colors.mutedForeground, fontSize: typography.fontSize.sm },
  listText: {
    flex: 1,
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.sm,
    color: colors.mutedForeground,
  },
  footer: { flexDirection: 'column', gap: spacing.sm, marginTop: spacing.md },
  fullWidth: { width: '100%' },
});
