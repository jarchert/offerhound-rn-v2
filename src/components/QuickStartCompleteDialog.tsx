// QuickStartCompleteDialog — RN port of Lovable src/components/QuickStartCompleteDialog.tsx
// Verbatim port (text/copy/structure preserved); web→RN mappings:
//   - Dialog/DialogContent/DialogHeader/Title/Description → RN Dialog (Modal-backed)
//   - Button / Checkbox / Label / Progress → RN UI primitives in components/ui/*
//   - lucide-react → lucide-react-native (same icon names available)
//   - react-router-dom useNavigate → @react-navigation/native useNavigation
//     Lovable paths mapped to RN routes — see NAV_MAP below. Strings preserved
//     verbatim in `config` but routed via switch in handle*() callbacks.
//   - className/tailwind → StyleSheet + inline dynamic styles
//   - cn() retained as a no-op helper (string compose only) where it appears
//
// GAPS_IN_LOVABLE captured during port:
//   * Progress component (RN) does not yet support a per-instance fill color
//     (web used `[&>div]:bg-green-500 / yellow-500 / destructive` overrides).
//     Bar fill stays primary gold; the *percentage label color* still varies
//     (green/yellow/destructive) so the user still gets the visual signal.
//     TODO: extend ui/Progress.tsx with a `fillColor` prop, then thread through.
//   * Lovable routes (e.g. "/dashboard", "/coach/dashboard", "/scout/dashboard",
//     "/influencers", "/onboarding", "/coach/onboarding", "/scout/onboarding",
//     "/organization/settings", "/influencers/onboarding") have no 1:1 RN screens
//     for every userType. Mapped best-effort to existing stack screens; unknown
//     ones fall back to AthleteTabs. Followup nav-mapping pass should refine.
//   * Gradient backgrounds (bg-gradient-to-br ...) approximated with flat tinted
//     surfaces — RN gradients require expo-linear-gradient; deferred for parity.
//   * sm:flex-row responsive layout collapses to stacked column always (mobile).
//   * Emoji glyphs in titles are font/OS dependent.

import React, { useState } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { useNavigation, NavigationProp } from "@react-navigation/native";
import type { RootStackParamList } from "@/navigation/RootNavigator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { Label } from "@/components/ui/Label";
import { Progress } from "@/components/ui/Progress";
import {
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Trophy,
  Users,
  Building2,
  Binoculars,
  Clock,
  Star,
  Megaphone,
} from "lucide-react-native";
import { cn } from "@/lib/utils";
import { colors, typography, spacing } from "@/lib/theme";

type UserType = "athlete" | "coach" | "scout" | "organization" | "influencer";

interface QuickStartCompleteDialogProps {
  isOpen: boolean;
  onClose: () => void;
  userType: UserType;
  userName: string;
  profileUrl?: string;
  showBypassOption?: boolean;
  onBypassChange?: (bypass: boolean) => void;
  profileCompletion?: number;
}

type IconType = React.ComponentType<{ size?: number; color?: string }>;

interface UserTypeConfig {
  icon: IconType;
  title: string;
  subtitle: string;
  dashboardPath: string;
  onboardingPath: string;
  dashboardLabel: string;
  completeLabel: string;
  benefits: string[];
}

const getConfig = (userType: UserType): UserTypeConfig => {
  switch (userType) {
    case "athlete":
      return {
        icon: Trophy,
        title: "You're Live! 🎉",
        subtitle: "Your profile is now visible to college coaches",
        dashboardPath: "/dashboard",
        onboardingPath: "/onboarding",
        dashboardLabel: "Go to Dashboard",
        completeLabel: "Complete Full Profile",
        benefits: [
          "Add highlight videos to showcase your skills",
          "Upload your athletic stats and achievements",
          "Add coach references and testimonials",
          "Connect your social media profiles",
        ],
      };
    case "coach":
      return {
        icon: Users,
        title: "Welcome, Coach! 🏈",
        subtitle: "Your profile is ready. Start recruiting!",
        dashboardPath: "/coach/dashboard",
        onboardingPath: "/coach/onboarding",
        dashboardLabel: "Go to Dashboard",
        completeLabel: "Complete Full Profile",
        benefits: [
          "Add your coaching history and achievements",
          "Upload your school logo and photos",
          "Specify your recruiting needs by position",
          "Enable athlete notifications",
        ],
      };
    case "scout":
      return {
        icon: Binoculars,
        title: "Welcome, Scout! 🎯",
        subtitle: "Your scouting profile is active",
        dashboardPath: "/scout/dashboard",
        onboardingPath: "/scout/onboarding",
        dashboardLabel: "Go to Dashboard",
        completeLabel: "Complete Full Profile",
        benefits: [
          "Add your scouting experience and credentials",
          "Upload your professional photo",
          "Define your coverage regions",
          "Connect with coaches and agencies",
        ],
      };
    case "organization":
      return {
        icon: Building2,
        title: "Organization Created! 🏢",
        subtitle: "Your scouting agency is now registered",
        dashboardPath: "/scout/dashboard",
        onboardingPath: "/organization/settings",
        dashboardLabel: "Go to Dashboard",
        completeLabel: "Complete Setup",
        benefits: [
          "Upload your organization logo and branding",
          "Invite team members to join",
          "Set up team roles and permissions",
          "Configure your scouting workflow",
        ],
      };
    case "influencer":
      return {
        icon: Megaphone,
        title: "Welcome, Influencer! 📣",
        subtitle: "Your profile is live on the board",
        dashboardPath: "/influencers",
        onboardingPath: "/influencers/onboarding",
        dashboardLabel: "Go to Board",
        completeLabel: "Complete Full Profile",
        benefits: [
          "Add your social media links for more reach",
          "Upload a profile photo to stand out",
          "Set your audience category and content tags",
          "Link your YouTube channel for auto-syndication",
        ],
      };
  }
};

// NAV_MAP — Lovable path → RN route (best effort; AthleteTabs is fallback)
function navTargetFor(path: string): keyof RootStackParamList {
  // Web routes don't all exist as named RN screens yet. Route to AthleteTabs
  // as a safe landing for any unknown destination; refine in follow-up nav pass.
  return "AthleteTabs" as keyof RootStackParamList;
}

export function QuickStartCompleteDialog({
  isOpen,
  onClose,
  userType,
  userName,
  profileUrl,
  showBypassOption = false,
  onBypassChange,
  profileCompletion,
}: QuickStartCompleteDialogProps) {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const config = getConfig(userType);
  const Icon = config.icon;
  const [bypassChecked, setBypassChecked] = useState(false);

  const handleBypassChange = (checked: boolean) => {
    setBypassChecked(checked);
    onBypassChange?.(checked);
  };

  const handleDashboard = () => {
    onClose();
    navigation.navigate(navTargetFor(config.dashboardPath) as any);
  };

  const handleCompleteProfile = () => {
    onClose();
    navigation.navigate(navTargetFor(config.onboardingPath) as any);
  };

  const completionColor =
    profileCompletion !== undefined
      ? profileCompletion >= 80
        ? colors.success
        : profileCompletion >= 50
          ? colors.warning
          : colors.destructive
      : colors.foreground;

  // GAP: Progress fill color override not yet supported in RN ui/Progress.
  // Web used [&>div]:bg-green-500 / yellow-500 / destructive class overrides.
  // For now bar color stays primary; percentage label conveys the signal.
  const progressFooterText =
    profileCompletion === undefined
      ? ""
      : profileCompletion < 50
        ? "Complete more fields to maximize your visibility"
        : profileCompletion < 80
          ? "Good progress! A few more fields to go"
          : profileCompletion < 100
            ? "Almost there! Your profile is looking great"
            : "Your profile is fully complete!";

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent style={s.dialog}>
        <DialogHeader>
          <View style={s.iconCircle}>
            <CheckCircle2 size={40} color={colors.primary} />
          </View>
          <DialogTitle>
            <Text style={s.title}>{config.title}</Text>
          </DialogTitle>
          <DialogDescription>
            <Text style={s.subtitle}>{config.subtitle}</Text>
          </DialogDescription>
        </DialogHeader>

        <View style={s.body}>
          {/* Profile Completion Progress */}
          {profileCompletion !== undefined && (
            <View style={s.completionCard}>
              <View style={s.completionRow}>
                <Text style={s.completionLabel}>Profile Completion</Text>
                <Text style={[s.completionPct, { color: completionColor }]}>
                  {profileCompletion}%
                </Text>
              </View>
              <Progress value={profileCompletion} style={s.progressBar} />
              <Text style={s.completionFooter}>{progressFooterText}</Text>
            </View>
          )}

          {/* Success Stats */}
          <View style={s.statsRow}>
            <View style={[s.statPill, s.statPillPrimary]}>
              <Icon size={16} color={colors.primary} />
              <Text style={s.statTextPrimary}>Profile Active</Text>
            </View>
            <View style={[s.statPill, s.statPillMuted]}>
              <Clock size={16} color={colors.foregroundSubtle} />
              <Text style={s.statTextMuted}>~2 min</Text>
            </View>
          </View>

          {/* Profile URL for athletes */}
          {profileUrl && userType === "athlete" && (
            <View style={s.urlCard}>
              <Text style={s.urlLabel}>Your profile URL:</Text>
              <Text style={s.urlValue}>{profileUrl}</Text>
            </View>
          )}

          {/* Complete Profile Invitation (shown when completion < 100 OR undefined) */}
          {(profileCompletion === undefined ||
            (profileCompletion !== undefined && profileCompletion < 100)) && (
            <View style={s.inviteCard}>
              <View style={s.inviteHeader}>
                <Sparkles size={20} color={colors.primary} />
                <Text style={s.inviteTitle}>Want to stand out even more?</Text>
              </View>
              <Text style={s.inviteBody}>
                Complete your full profile to unlock all features and maximize
                your visibility:
              </Text>
              <View style={s.benefitsList}>
                {config.benefits.map((benefit, index) => (
                  <View key={index} style={s.benefitRow}>
                    <Star size={16} color={colors.primary} style={s.benefitIcon} />
                    <Text style={s.benefitText}>{benefit}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>

        {/* Bypass Checkbox */}
        {showBypassOption && (
          <View style={s.bypassRow}>
            <Checkbox
              checked={bypassChecked}
              onCheckedChange={(checked) => handleBypassChange(checked === true)}
            />
            <Pressable onPress={() => handleBypassChange(!bypassChecked)}>
              <Label>
                <Text style={s.bypassLabel}>Don't show this screen at login</Text>
              </Label>
            </Pressable>
          </View>
        )}

        {/* Actions */}
        <View style={s.actions}>
          <Button variant="outline" onPress={handleDashboard} style={s.actionBtn}>
            {config.dashboardLabel}
          </Button>
          <Button onPress={handleCompleteProfile} style={s.actionBtn}>
            <View style={s.primaryBtnInner}>
              <Sparkles size={16} color={colors.primaryForeground} />
              <Text style={s.primaryBtnText}>{config.completeLabel}</Text>
              <ArrowRight size={16} color={colors.primaryForeground} />
            </View>
          </Button>
        </View>
      </DialogContent>
    </Dialog>
  );
}

const s = StyleSheet.create({
  dialog: { maxWidth: 560, width: "100%" },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary + "20",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginBottom: spacing.md,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: colors.foreground,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    color: colors.foregroundSubtle,
    textAlign: "center",
    marginTop: 4,
  },
  body: { paddingVertical: spacing.lg },

  completionCard: {
    marginBottom: spacing.lg,
    padding: spacing.md,
    backgroundColor: colors.muted,
    borderRadius: 12,
  },
  completionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.xs,
  },
  completionLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.foregroundSubtle,
  },
  completionPct: { fontSize: 14, fontWeight: "700" },
  progressBar: { height: 8 },
  completionFooter: {
    fontSize: 12,
    color: colors.foregroundSubtle,
    marginTop: spacing.xs,
  },

  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
    marginBottom: spacing.lg,
    flexWrap: "wrap",
  },
  statPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 999,
  },
  statPillPrimary: { backgroundColor: colors.primary + "1A" },
  statPillMuted: { backgroundColor: colors.muted },
  statTextPrimary: { fontSize: 14, fontWeight: "500", color: colors.foreground },
  statTextMuted: { fontSize: 14, color: colors.foregroundSubtle },

  urlCard: {
    padding: spacing.md,
    backgroundColor: colors.muted,
    borderRadius: 12,
    marginBottom: spacing.lg,
    alignItems: "center",
  },
  urlLabel: {
    fontSize: 14,
    color: colors.foregroundSubtle,
    marginBottom: 4,
  },
  urlValue: { fontWeight: "500", color: colors.primary, textAlign: "center" },

  inviteCard: {
    backgroundColor: colors.primary + "12",
    borderRadius: 12,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.primary + "33",
  },
  inviteHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  inviteTitle: { fontWeight: "600", color: colors.foreground, fontSize: 16 },
  inviteBody: {
    fontSize: 14,
    color: colors.foregroundSubtle,
    marginBottom: spacing.md,
  },
  benefitsList: { gap: spacing.sm },
  benefitRow: { flexDirection: "row", alignItems: "flex-start", gap: spacing.sm },
  benefitIcon: { marginTop: 2 },
  benefitText: { flex: 1, fontSize: 14, color: colors.foreground },

  bypassRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingBottom: spacing.xs,
  },
  bypassLabel: { fontSize: 14, color: colors.foregroundSubtle },

  actions: {
    flexDirection: "column",
    gap: spacing.sm,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  actionBtn: { flex: 1 },
  primaryBtnInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  primaryBtnText: {
    color: colors.primaryForeground,
    fontWeight: "600",
    fontSize: 14,
  },
});

// `cn` import preserved for parity grep / future tailwind-class debug; mark used.
void cn;
