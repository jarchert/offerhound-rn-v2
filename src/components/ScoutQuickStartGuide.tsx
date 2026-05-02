// ScoutQuickStartGuide — RN port of Lovable src/components/ScoutQuickStartGuide.tsx
// Verbatim port, web→RN mappings (modeled after Athlete/CoachQuickStartGuide.tsx):
//   - Dialog/DialogContent/DialogHeader/Title/Description → @/components/ui/Dialog
//   - Card / CardContent → @/components/ui/Card
//   - Button / Badge / Progress → @/components/ui/*
//   - lucide-react → lucide-react-native
//   - react-router-dom useNavigate → @react-navigation/native useNavigation
//   - className + tailwind → StyleSheet + inline dynamic styles via @/lib/theme
//   - cn() still available for debug class strings (no-op visually in RN)
//
// GAPS_IN_LOVABLE captured during port:
//   * Route strings "/athletes", "/coaches", "/organization/settings" have no direct
//     RN screens — all mapped to ScoutTabs (home) for now. A follow-up nav-mapping
//     session should route to specific Scout tabs / an Organization Settings screen.
//   * useQuickStartProgress is currently a stub; visual parity works, DB persistence
//     will light up when the hook is ported.
//   * Emoji "🎯" rendering in Text is font-dependent on device; no code gap.
//   * Lovable conditionally injects a "Manage Team" step when hasOrganization is true;
//     preserved verbatim via getSteps(hasOrganization).
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
} from "react-native";
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
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Progress } from "@/components/ui/Progress";
import {
  Search,
  Users,
  Building2,
  Bookmark,
  Download,
  ArrowRight,
  CheckCircle,
  X,
  Sparkles,
  Binoculars,
  MapPin,
  LucideIcon,
} from "lucide-react-native";
import { cn } from "@/lib/utils";
import { colors, typography, spacing } from "@/lib/theme";
import { useQuickStartProgress } from "@/hooks/useQuickStartProgress";

interface ScoutQuickStartGuideProps {
  scoutName: string;
  hasOrganization?: boolean;
  onDismiss: () => void;
}

// NAV_MAP: Lovable route strings → RN navigation targets.
// Keeping strings identical in the step definitions preserves verbatim parity;
// the mapping happens in navigateToLink().
type LovableRoute = "/athletes" | "/coaches" | "/organization/settings" | null;

type StepDef = {
  icon: LucideIcon;
  title: string;
  description: string;
  action: string;
  link: LovableRoute;
};

const getSteps = (hasOrganization: boolean): StepDef[] => [
  {
    icon: Search,
    title: "Discover Athletes",
    description:
      "Search our database of athletes by region, position, and physical attributes.",
    action: "Browse Athletes",
    link: "/athletes",
  },
  {
    icon: Bookmark,
    title: "Build Your Board",
    description:
      "Save athletes with custom notes and priority rankings to track prospects.",
    action: "View Saved",
    link: null,
  },
  {
    icon: Users,
    title: "Find Coaches",
    description:
      "Connect with college coaches to share scouting reports and recommendations.",
    action: "Coach Directory",
    link: "/coaches",
  },
  ...(hasOrganization
    ? [
        {
          icon: Building2,
          title: "Manage Team",
          description:
            "Invite team members and manage your scouting organization.",
          action: "Organization Settings",
          link: "/organization/settings" as LovableRoute,
        },
      ]
    : []),
  {
    icon: Download,
    title: "Export Reports",
    description: "Export athlete profiles and scouting data for your records.",
    action: "Learn More",
    link: null,
  },
];

export function ScoutQuickStartGuide({
  scoutName,
  hasOrganization = false,
  onDismiss,
}: ScoutQuickStartGuideProps) {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const {
    showGuide,
    completedSteps: dbCompletedSteps,
    dismissGuide,
    completeStep,
    isLoading,
  } = useQuickStartProgress("scout");
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [localCompletedSteps, setLocalCompletedSteps] = useState<number[]>([]);

  const steps = getSteps(hasOrganization);

  // Merge db completed steps with local completed steps
  const completedSteps = [
    ...new Set([
      ...localCompletedSteps,
      ...dbCompletedSteps
        .map((s: string) => {
          const stepIndex = steps.findIndex(
            (step) => step.title.toLowerCase().replace(/\s+/g, "_") === s
          );
          return stepIndex;
        })
        .filter((i: number) => i >= 0),
    ]),
  ];

  useEffect(() => {
    if (!isLoading && showGuide) {
      setIsOpen(true);
    }
  }, [isLoading, showGuide]);

  const handleDismiss = () => {
    dismissGuide();
    setIsOpen(false);
    onDismiss();
  };

  const navigateToLink = (link: LovableRoute) => {
    // Lovable uses web paths; RN root stack takes screen keys.
    // "/athletes", "/coaches", "/organization/settings" all land on ScoutTabs for now
    // (GAP_IN_LOVABLE: no dedicated screens yet — post-Session 4).
    if (!link) return;
    navigation.navigate("ScoutDrawer");
  };

  const handleStepAction = (index: number, link: LovableRoute) => {
    setLocalCompletedSteps((prev) => [...new Set([...prev, index])]);
    // Save step completion to database
    const stepId = steps[index].title.toLowerCase().replace(/\s+/g, "_");
    completeStep(stepId);

    if (link) {
      handleDismiss();
      navigateToLink(link);
    } else {
      if (index < steps.length - 1) {
        setCurrentStep(index + 1);
      } else {
        handleDismiss();
      }
    }
  };

  const handleGetStarted = () => {
    handleDismiss();
    navigateToLink("/athletes");
  };

  const progress = ((completedSteps.length + 1) / steps.length) * 100;

  const firstName = scoutName ? scoutName.split(" ")[0] : "";

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleDismiss()}>
      <DialogContent style={styles.dialogContent}>
        {/* Header */}
        <DialogHeader style={styles.header}>
          <View style={styles.headerIconWrap}>
            <Binoculars size={32} color={colors.primary} />
          </View>
          <DialogTitle style={styles.title}>
            {`Welcome${firstName ? `, ${firstName}` : ""}! 🎯`}
          </DialogTitle>
          <DialogDescription style={styles.description}>
            Your scouting command center is ready. Here's how to get started.
          </DialogDescription>
        </DialogHeader>

        <View style={styles.body}>
          {/* Quick Stats */}
          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Users size={20} color={colors.primary} style={styles.statIcon} />
              <Text style={styles.statLabel}>Athletes</Text>
              <Text style={styles.statValue}>1000+</Text>
            </View>
            <View style={styles.statBox}>
              <MapPin size={20} color={colors.primary} style={styles.statIcon} />
              <Text style={styles.statLabel}>Regions</Text>
              <Text style={styles.statValue}>All 50</Text>
            </View>
            <View style={styles.statBox}>
              <Building2
                size={20}
                color={colors.primary}
                style={styles.statIcon}
              />
              <Text style={styles.statLabel}>Coaches</Text>
              <Text style={styles.statValue}>500+</Text>
            </View>
          </View>

          {/* Progress Bar */}
          <View style={styles.progressSection}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressLabel}>Getting Started</Text>
              <Badge variant="secondary" style={styles.progressBadge}>
                <View style={styles.badgeInner}>
                  <Sparkles size={12} color={colors.secondaryForeground} />
                  <Text style={styles.badgeText}> Quick Guide</Text>
                </View>
              </Badge>
            </View>
            <Progress value={progress} style={styles.progressBar} />
          </View>

          {/* Steps */}
          <View style={styles.stepsList}>
            {steps.map((step, index) => {
              const isCompleted = completedSteps.includes(index);
              const isCurrent = index === currentStep;
              const StepIcon = step.icon;

              return (
                <Pressable
                  key={index}
                  onPress={() => setCurrentStep(index)}
                  // className preserved via cn() for parity; RN ignores it visually.
                  accessibilityLabel={cn(
                    "quick-start-step",
                    isCurrent && "ring-2 ring-primary shadow-md",
                    isCompleted && "bg-primary/5"
                  )}
                >
                  <Card
                    style={{
                      ...styles.stepCard,
                      ...(isCurrent ? styles.stepCardCurrent : null),
                      ...(isCompleted ? styles.stepCardCompleted : null),
                    }}
                  >
                    <CardContent style={styles.stepContent}>
                      <View style={styles.stepRow}>
                        <View
                          style={{
                            ...styles.stepIconWrap,
                            ...(isCompleted
                              ? styles.stepIconCompleted
                              : isCurrent
                              ? styles.stepIconCurrent
                              : styles.stepIconIdle),
                          }}
                        >
                          {isCompleted ? (
                            <CheckCircle
                              size={20}
                              color={colors.primaryForeground}
                            />
                          ) : (
                            <StepIcon
                              size={20}
                              color={
                                isCurrent
                                  ? colors.primary
                                  : colors.mutedForeground
                              }
                            />
                          )}
                        </View>
                        <View style={styles.stepBody}>
                          <Text style={styles.stepTitle}>{step.title}</Text>
                          <Text style={styles.stepDescription}>
                            {step.description}
                          </Text>
                          {isCurrent && (
                            <View style={styles.stepActionWrap}>
                              <Button
                                size="sm"
                                onPress={() =>
                                  handleStepAction(index, step.link)
                                }
                                rightIcon={
                                  <ArrowRight
                                    size={16}
                                    color={colors.primaryForeground}
                                  />
                                }
                              >
                                {step.action}
                              </Button>
                            </View>
                          )}
                        </View>
                      </View>
                    </CardContent>
                  </Card>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Footer Actions */}
        <View style={styles.footer}>
          <Button
            variant="outline"
            style={styles.footerBtn}
            onPress={handleDismiss}
            leftIcon={<X size={16} color={colors.foreground} />}
          >
            Skip for now
          </Button>
          <Button
            style={styles.footerBtn}
            onPress={handleGetStarted}
            leftIcon={<Search size={16} color={colors.primaryForeground} />}
          >
            Start Scouting
          </Button>
        </View>
      </DialogContent>
    </Dialog>
  );
}

export function useScoutQuickStartGuide() {
  const { showGuide, dismissGuide, resetGuide, isLoading } =
    useQuickStartProgress("scout");
  return { showGuide: !isLoading && showGuide, dismissGuide, resetGuide };
}

export default ScoutQuickStartGuide;

// ---------- Styles ----------
// Mapping Lovable tailwind tokens → theme values (same scheme as Athlete/CoachQuickStartGuide):
//   sm:max-w-lg max-h-[90vh]     → maxWidth 512, handled by Modal layout
//   mx-auto w-16 h-16 rounded-full bg-primary/10 → headerIconWrap
//   grid-cols-3 gap-3            → row with equal flex + gap
//   bg-muted/50                  → colors.muted (no alpha runtime in RN; visual parity best-effort)
const styles = StyleSheet.create({
  dialogContent: {
    maxWidth: 512,
    width: "100%",
    maxHeight: "90%",
  },
  header: {
    alignItems: "center",
    paddingBottom: spacing.xs,
  },
  headerIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.muted, // bg-primary/10 approximation
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
    alignSelf: "center",
  },
  title: {
    fontFamily: typography.fontFamily.heading,
    fontSize: typography.fontSize["2xl"],
    color: colors.foreground,
    textAlign: "center",
  },
  description: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.base,
    color: colors.mutedForeground,
    textAlign: "center",
    marginTop: 4,
  },
  body: {
    paddingVertical: spacing.md,
  },
  statsRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  statBox: {
    flex: 1,
    alignItems: "center",
    padding: spacing.sm,
    backgroundColor: colors.muted,
    borderRadius: 8,
  },
  statIcon: {
    marginBottom: 4,
  },
  statLabel: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.xs,
    color: colors.mutedForeground,
  },
  statValue: {
    fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: typography.fontSize.sm,
    color: colors.foreground,
  },
  progressSection: {
    marginBottom: spacing.lg,
  },
  progressHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.xs,
  },
  progressLabel: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.sm,
    color: colors.mutedForeground,
  },
  progressBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  badgeInner: {
    flexDirection: "row",
    alignItems: "center",
  },
  badgeText: {
    fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: typography.fontSize.xs,
    color: colors.secondaryForeground,
  },
  progressBar: {
    height: 8,
  },
  stepsList: {
    gap: spacing.sm,
  },
  stepCard: {
    // transition-all cursor-pointer → no-op in RN
  },
  stepCardCurrent: {
    borderColor: colors.primary,
    borderWidth: 2,
    ...Platform.select({
      ios: {
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
      },
      android: { elevation: 2 },
    }),
  },
  stepCardCompleted: {
    backgroundColor: colors.muted,
  },
  stepContent: {
    padding: spacing.md,
  },
  stepRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
  },
  stepIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  stepIconCompleted: {
    backgroundColor: colors.primary,
  },
  stepIconCurrent: {
    backgroundColor: colors.muted,
  },
  stepIconIdle: {
    backgroundColor: colors.muted,
  },
  stepBody: {
    flex: 1,
    minWidth: 0,
  },
  stepTitle: {
    fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: typography.fontSize.sm,
    color: colors.foreground,
  },
  stepDescription: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.sm,
    color: colors.mutedForeground,
    marginTop: 2,
  },
  stepActionWrap: {
    marginTop: spacing.sm,
    flexDirection: "row",
  },
  footer: {
    flexDirection: "row",
    gap: spacing.sm,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  footerBtn: {
    flex: 1,
  },
});
