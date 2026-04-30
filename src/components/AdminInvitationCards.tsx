// Ported verbatim from Lovable src/components/AdminInvitationCards.tsx
// Web → RN mapping:
//   - Tailwind classes → StyleSheet using @/lib/theme tokens
//   - shadcn/ui imports → @/components/ui/*
//   - lucide-react → lucide-react-native (CheckCircle → CircleCheck; lucide v1.x rename)
//   - sonner toast → @/components/ui/toast
//   - QRCodeCanvas (qrcode.react) → QRCode (react-native-qrcode-svg)
//   - HTML <canvas> download flow → Share/copy URL only (GAP: no canvas API in RN)
//   - navigator.clipboard → expo-clipboard
//   - window.open → Linking.openURL
//   - window.location.origin → Constants.expoConfig?.extra?.webBaseUrl (GAP: stubbed; RN has no window)
//   - grid grid-cols-1 md:grid-cols-2 → useWindowDimensions width >= 768 → 2-col, else 1-col
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Linking,
  useWindowDimensions,
  ViewStyle,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import {
  Download,
  ExternalLink,
  Users,
  GraduationCap,
  Search,
  Building2,
  Share2,
  Copy,
  CircleCheck as CheckCircle, // GAP: lucide-react-native v1.x renamed CheckCircle → CircleCheck
} from 'lucide-react-native';
import { toast } from '@/components/ui/toast';
import QRCode from 'react-native-qrcode-svg';
import { FounderInvitationCard } from './FounderInvitationCard';
import { colors, typography, spacing } from '@/lib/theme';

interface InvitationCardProps {
  type: 'athlete' | 'coach' | 'scout' | 'agency';
  title: string;
  description: string;
  icon: React.ReactNode;
  landingUrl: string;
  gradientStyle: ViewStyle; // Lovable: gradientClass tailwind string
}

const InvitationCard = ({
  type,
  title,
  description,
  icon,
  landingUrl,
  gradientStyle,
}: InvitationCardProps) => {
  const [copied, setCopied] = useState(false);

  const handleDownload = () => {
    // GAP: Lovable composes a card PNG via HTML canvas + drawImage(qr, ...).
    // RN has no <canvas>; full PNG export requires react-native-view-shot +
    // Swapped to react-native-qrcode-svg (installed for parity with Lovable).
    toast.error('Download not available in mobile app yet');
  };

  const handleCopyLink = async () => {
    await Clipboard.setStringAsync(landingUrl);
    setCopied(true);
    toast.success('Link copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenLink = () => {
    Linking.openURL(landingUrl).catch(() => toast.error('Could not open link'));
  };

  return (
    <Card style={StyleSheet.flatten([s.invCard, gradientStyle])}>
      {/* absolute inset overlay for from-white/5 → transparent (decorative, omitted on RN) */}
      <CardHeader>
        <View style={s.headerRow}>
          <Badge variant="outline" style={s.typeBadge}>
            <View style={s.badgeInner}>
              {icon}
              <Text style={s.badgeText}>{title}</Text>
            </View>
          </Badge>
          <Pressable
            onPress={handleOpenLink}
            style={s.iconBtn}
            hitSlop={8}
          >
            <ExternalLink size={16} color={colors.foregroundSubtle} />
          </Pressable>
        </View>
        <CardTitle style={s.invTitle}>{title} Invitation Card</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent style={{ gap: spacing.md }}>
        {/* QR Code Display */}
        <View style={s.qrWrap}>
          <View style={s.qrInner}>
            <View nativeID={`qr-${type}`} style={s.qrBox}>
              <QRCode value={landingUrl} size={140} color="#000" backgroundColor="#fff" />
            </View>
          </View>
        </View>

        {/* URL Display */}
        <View style={s.urlRow}>
          <Text style={s.urlText} numberOfLines={1} ellipsizeMode="tail">
            {landingUrl}
          </Text>
          <Pressable onPress={handleCopyLink} style={s.urlCopyBtn} hitSlop={6}>
            {copied ? (
              <CheckCircle size={14} color={colors.success} />
            ) : (
              <Copy size={14} color={colors.foregroundSubtle} />
            )}
          </Pressable>
        </View>

        {/* Action Buttons */}
        <View style={s.actionsRow}>
          <Button onPress={handleDownload} style={{ flex: 1 }}>
            <View style={s.btnInner}>
              <Download size={16} color={colors.primaryForeground} />
              <Text style={[s.btnText, { color: colors.primaryForeground }]}>
                Download Card
              </Text>
            </View>
          </Button>
          <Button variant="outline" onPress={handleCopyLink}>
            <Share2 size={16} color={colors.foreground} />
          </Button>
        </View>
      </CardContent>
    </Card>
  );
};

export function AdminInvitationCards() {
  const { width } = useWindowDimensions();
  const isMd = width >= 768;

  // GAP: RN has no window.location.origin. Use a stable web baseUrl placeholder.
  // TODO: pull from app config / EAS env once wired.
  const baseUrl = 'https://offerhound.app';

  const invitationTypes: InvitationCardProps[] = [
    {
      type: 'athlete',
      title: 'Athlete',
      description:
        'Invite student-athletes to create their recruiting profile and connect with college coaches.',
      icon: <Users size={16} color={colors.primary} />,
      landingUrl: `${baseUrl}/`,
      gradientStyle: { backgroundColor: '#0d1b2e' }, // approximation of from-blue-950/50 to-card
    },
    {
      type: 'coach',
      title: 'Coach',
      description:
        'Invite college coaches to join OfferHound and discover talented student-athletes.',
      icon: <GraduationCap size={16} color={colors.primary} />,
      landingUrl: `${baseUrl}/`,
      gradientStyle: { backgroundColor: '#0d1f17' }, // from-green-950/50 to-card
    },
    {
      type: 'scout',
      title: 'Scout',
      description:
        'Invite independent scouts to evaluate and recommend athletes to college programs.',
      icon: <Search size={16} color={colors.primary} />,
      landingUrl: `${baseUrl}/`,
      gradientStyle: { backgroundColor: '#241511' }, // from-orange-950/50 to-card
    },
    {
      type: 'agency',
      title: 'Scouting Agency',
      description:
        'Invite scouting agencies to manage their team and streamline athlete evaluations.',
      icon: <Building2 size={16} color={colors.primary} />,
      landingUrl: `${baseUrl}/`,
      gradientStyle: { backgroundColor: '#1f1130' }, // from-purple-950/50 to-card
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle style={s.rootTitle}>
          <View style={s.rootTitleRow}>
            <Share2 size={20} color={colors.primary} />
            <Text style={s.rootTitleText}>User Invitation Cards</Text>
          </View>
        </CardTitle>
        <CardDescription>
          Download and share invitation cards with QR codes to invite new users
          to OfferHound™. Each card links to the landing page where users can
          sign up.
        </CardDescription>
      </CardHeader>
      <CardContent style={{ gap: spacing.xl }}>
        {/* Founder Card - Featured */}
        <View>
          <Text style={s.sectionHeader}>Founder Card</Text>
          <View style={s.founderWrap}>
            <FounderInvitationCard />
          </View>
        </View>

        {/* User Type Cards */}
        <View>
          <Text style={s.sectionHeader}>User Type Invitation Cards</Text>
          <View style={[s.grid, isMd && s.gridMd]}>
            {invitationTypes.map((invitation) => (
              <View
                key={invitation.type}
                style={isMd ? s.gridItemMd : s.gridItem}
              >
                <InvitationCard {...invitation} />
              </View>
            ))}
          </View>
        </View>
      </CardContent>
    </Card>
  );
}

const s = StyleSheet.create({
  invCard: {
    position: 'relative',
    overflow: 'hidden',
    borderColor: colors.border,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  typeBadge: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(231,175,8,0.10)',
  },
  badgeInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  badgeText: {
    color: colors.primary,
    fontSize: typography.size.sm,
    fontWeight: '600',
  },
  iconBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
  },
  invTitle: {
    fontSize: typography.size.xl,
    color: colors.foreground,
    marginTop: spacing.sm,
  },
  qrWrap: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  qrInner: {
    backgroundColor: '#ffffff',
    padding: spacing.md,
    borderRadius: 12,
    // shadow-lg approximation
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
  qrPlaceholder: {
    width: 150,
    height: 150,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  qrPlaceholderText: {
    color: '#0f172a',
    fontWeight: '700',
    fontSize: 24,
  },
  qrPlaceholderHint: {
    color: '#475569',
    fontSize: 11,
    marginTop: 4,
  },
  urlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  urlText: {
    color: colors.foregroundSubtle,
    fontSize: typography.size.sm,
    maxWidth: 200,
  },
  urlCopyBtn: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  btnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  btnText: {
    fontSize: typography.size.sm,
    fontWeight: '600',
  },
  rootTitle: { padding: 0 },
  rootTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rootTitleText: {
    color: colors.foreground,
    fontSize: typography.size.lg,
    fontWeight: '700',
  },
  sectionHeader: {
    fontSize: typography.size.lg,
    fontWeight: '600',
    color: colors.foreground,
    marginBottom: spacing.md,
  },
  founderWrap: {
    maxWidth: 448,
    alignSelf: 'center',
    width: '100%',
  },
  grid: {
    gap: spacing.lg,
  },
  gridMd: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  gridItem: {
    width: '100%',
  },
  gridItemMd: {
    width: '48%',
  },
});
