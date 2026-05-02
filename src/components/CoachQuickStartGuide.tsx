// CoachQuickStartGuide — RN port of Lovable src/components/CoachQuickStartGuide.tsx
// Verbatim port, web→RN mappings (modeled after AthleteQuickStartGuide.tsx):
//   - Dialog/DialogContent/DialogHeader/Title/Description → @/components/ui/Dialog
//   - Card / CardContent → @/components/ui/Card
//   - Button / Badge / Progress → @/components/ui/*
//   - lucide-react → lucide-react-native
//   - react-router-dom useNavigate → @react-navigation/native useNavigation
//   - className + tailwind → StyleSheet + inline dynamic styles via @/lib/theme
//   - cn() still available for debug class strings (no-op visually in RN)
//
// GAPS_IN_LOVABLE captured during port:
//   * Route string "/athletes" has no direct RN screen — mapped to CoachTabs (home).
//     A follow-up nav-mapping session should route to the specific Athletes tab.
//   * useQuickStartProgress is currently a stub; visual parity works, DB persistence
//     will light up when the hook is ported.
//   * Emoji "🏈" rendering in Text is font-dependent on device; no code gap.
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
  Mail,
  BookUser,
  Star,
  ArrowRight,
  CheckCircle,
  X,
  Sparkles,
  GraduationCap,
  LucideIcon,
} from "lucide-react-native";
import { cn } from "@/lib/utils";
import { colors, typography, spacing } from "@/lib/theme";
import { useQuickStartProgress } from "@/hooks/useQuickStartProgress";

interface CoachQuickStartGuideProps {
  coachName: string;
  onDismiss: () => void;
}

// NAV_MAP: Lovable route strings → RN navigation targets.
// Keeping the string identical in the step definitions preserves verbatim parity;
// the mapping happens in navigateToLink().
type LovableRoute = "/athletes" | null;

type StepDef = {
  icon: LucideIcon;
  title: string;
  description: string;
  action: string;
  link: LovableRoute;
};

const steps: StepDef[] = [
  {
    icon: Search,
    title: "Browse Athletes",
    description:
      "Search and filter athletes by position, location, graduation year, and more.",
    action: "Search Athletes",
    link: "/athletes",
  },
  {
    icon: Star,
    title: "Save Favorites",
    description:
      "Save athletes to your recruitment board with notes and priority levels.",
    action: "View Saved",
    link: null,
  },
  {
    icon: Mail,
    title: "Contact Athletes",
    description:
      "View contact info and reach out directly to potential recruits.",
    action: "Start Recruiting",
    link: "/athletes",
  },
  {
    icon: BookUser,
    title: "Track Activity",
    description: "Keep track of your recruiting activity and profile views.",
    action: "View Activity",
    link: null,
  },
];

export function CoachQuickStartGuide({
  coachName,
  onDismiss,
}: CoachQuickStartGuideProps) {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const {
    showGuide,
    completedSteps: dbCompletedSteps,
    dismissGuide,
    completeStep,
    isLoading,
  } = useQuickStartProgress("coach");
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [localCompletedSteps, setLocalCompletedSteps] = useState<number[]>([]);

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
    // "/athletes" lands on the coach tabs for now
    // (GAP_IN_LOVABLE: no dedicated Athletes screen in coach flow yet).
    if (!link) return;
    navigation.navigate("CoachDrawer");
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

  const firstName = coachName ? coachName.split(" ")[0] : "";

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleDismiss()}>
      <DialogContent style={styles.dialogContent}>
        {/* Header */}
        <DialogHeader style={styles.header}>
          <View style={styles.headerIconWrap}>
            <GraduationCap size={32} color={colors.primary} />
          </View>
          <DialogTitle style={styles.title}>
            {`Welcome, Coach${firstName ? ` ${firstName}` : ""}! 🏈`}
          </DialogTitle>
          <DialogDescription style={styles.description}>
            Let's get you started with recruiting on OfferHound™
          </DialogDescription>
        </DialogHeader>

        <View style={styles.body}>
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
            leftIcon={<Users size={16} color={colors.primaryForeground} />}
          >
            Start Recruiting
          </Button>
        </View>
      </DialogContent>
    </Dialog>
  );
}

export function useCoachQuickStartGuide() {
  const { showGuide, dismissGuide, resetGuide, isLoading } =
    useQuickStartProgress("coach");
  return { showGuide: !isLoading && showGuide, dismissGuide, resetGuide };
}

export default CoachQuickStartGuide;

// ---------- Styles ----------
// Mapping Lovable tailwind tokens → theme values (same scheme as AthleteQuickStartGuide):
//   sm:max-w-lg max-h-[90vh]     → maxWidth 512, handled by Modal layout
//   mx-auto w-16 h-16 rounded-full bg-primary/10 → headerIconWrap
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
