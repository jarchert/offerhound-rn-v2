// AthleteQuickStartGuide — RN port of Lovable src/components/AthleteQuickStartGuide.tsx
// Verbatim port, web→RN mappings:
//   - Dialog/DialogContent/DialogHeader/Title/Description → local RN Dialog + composed Text blocks
//   - Card / CardContent → RN Card
//   - Button / Badge / Progress → RN primitives
//   - lucide-react → lucide-react-native
//   - react-router-dom useNavigate → @react-navigation/native useNavigation
//     ("/dashboard" → AthleteTabs, "/coaches" → AthleteTabs with initial tab; we call navigate
//     on the root stack. GAP_IN_LOVABLE: Lovable routes don't 1:1 map to RN tabs; see NAV_MAP below.)
//   - className + tailwind → StyleSheet + inline dynamic styles
//   - cn() still available for debug class strings (no-op visually in RN)
//
// GAPS_IN_LOVABLE captured during port:
//   * Route strings "/dashboard" and "/coaches" have no direct RN screen — mapped to
//     AthleteTabs (home). A follow-up nav-mapping session should route to the specific tab.
//   * useCoaches + useQuickStartProgress are currently stubs (see their files). Visual
//     parity works; DB persistence / real coach counts will light up when hooks are ported.
//   * Emoji "🎉" rendering in Text is font-dependent on device; no code gap but worth noting.
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
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
  Camera,
  Video,
  Share2,
  Mail,
  Trophy,
  ArrowRight,
  CheckCircle,
  X,
  Sparkles,
  Target,
  Users,
  LucideIcon,
} from "lucide-react-native";
import { cn } from "@/lib/utils";
import { colors, typography, spacing } from "@/lib/theme";
import { useQuickStartProgress } from "@/hooks/useQuickStartProgress";
import { useCoaches } from "@/hooks/useCoaches";
import { useAthleteMatches } from "@/hooks/useAthleteMatches";

interface AthleteQuickStartGuideProps {
  athleteName: string;
  hasProfileImage?: boolean;
  hasHighlightVideo?: boolean;
  onDismiss: () => void;
}

// NAV_MAP: Lovable route strings → RN navigation targets.
// Keeping strings identical in the step definitions preserves verbatim parity;
// the mapping happens in navigateToLink().
type LovableRoute = "/dashboard" | "/coaches" | null;

type StepDef = {
  icon: LucideIcon;
  title: string;
  description: string;
  action: string;
  link: LovableRoute;
  completed: boolean;
};

const getSteps = (
  hasProfileImage: boolean,
  hasHighlightVideo: boolean
): StepDef[] => [
  {
    icon: Camera,
    title: "Add Your Photo",
    description:
      "A professional headshot helps coaches recognize you and makes your profile stand out.",
    action: hasProfileImage ? "Update Photo" : "Add Photo",
    link: "/dashboard",
    completed: hasProfileImage,
  },
  {
    icon: Video,
    title: "Upload Highlights",
    description:
      "Show coaches what you can do with your best game footage and highlight reels.",
    action: hasHighlightVideo ? "Manage Videos" : "Add Video",
    link: "/dashboard",
    completed: hasHighlightVideo,
  },
  {
    icon: Trophy,
    title: "Complete Your Stats",
    description:
      "Add your athletic stats, GPA, and achievements to give coaches the full picture.",
    action: "Edit Profile",
    link: "/dashboard",
    completed: false,
  },
  {
    icon: Mail,
    title: "Contact Coaches",
    description:
      "Find and reach out to college coaches who are recruiting for your position.",
    action: "Find Coaches",
    link: "/coaches",
    completed: false,
  },
  {
    icon: Share2,
    title: "Share Your Profile",
    description:
      "Share your profile link with coaches, recruiters, and on social media.",
    action: "View Profile",
    link: null,
    completed: false,
  },
];

export function AthleteQuickStartGuide({
  athleteName,
  hasProfileImage = false,
  hasHighlightVideo = false,
  onDismiss,
}: AthleteQuickStartGuideProps) {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const {
    showGuide,
    completedSteps: dbCompletedSteps,
    dismissGuide,
    completeStep,
    isLoading,
  } = useQuickStartProgress("athlete");
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [localCompletedSteps, setLocalCompletedSteps] = useState<number[]>([]);

  // Get real coach data
  const { data: coaches = [] } = useCoaches();
  const { data: athleteMatches = [] } = useAthleteMatches();

  // Calculate unique schools from coaches
  const uniqueSchools = new Set(coaches.map((c) => c.school)).size;

  const steps = getSteps(hasProfileImage, hasHighlightVideo);

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
      // Mark already completed steps based on profile state
      const initialCompleted: number[] = [];
      steps.forEach((step, index) => {
        if (step.completed) {
          initialCompleted.push(index);
        }
      });
      setLocalCompletedSteps(initialCompleted);
      // Set current step to first incomplete step
      const firstIncomplete = steps.findIndex((s) => !s.completed);
      setCurrentStep(firstIncomplete >= 0 ? firstIncomplete : 0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, showGuide]);

  const handleDismiss = () => {
    dismissGuide();
    setIsOpen(false);
    onDismiss();
  };

  const navigateToLink = (link: LovableRoute) => {
    // Lovable uses web paths; RN root stack takes screen keys.
    // "/dashboard" and "/coaches" both land on the athlete tabs for now
    // (GAP_IN_LOVABLE: no dedicated Coaches stack yet — post-Session 4).
    if (!link) return;
    navigation.navigate("AthleteTabs");
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
      // For share action, stay and move to next or close
      if (index < steps.length - 1) {
        setCurrentStep(index + 1);
      } else {
        handleDismiss();
      }
    }
  };

  const handleGetStarted = () => {
    handleDismiss();
    navigateToLink("/dashboard");
  };

  const totalSteps = steps.length;
  const completedCount = completedSteps.length;
  const progress = ((completedCount + 1) / totalSteps) * 100;

  const firstName = athleteName ? athleteName.split(" ")[0] : "";

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleDismiss()}>
      <DialogContent style={styles.dialogContent}>
        {/* Header */}
        <DialogHeader style={styles.header}>
          <View style={styles.headerIconWrap}>
            <Target size={32} color={colors.primary} />
          </View>
          <DialogTitle style={styles.title}>
            {`Welcome${firstName ? `, ${firstName}` : ""}! 🎉`}
          </DialogTitle>
          <DialogDescription style={styles.description}>
            Your profile is live! Here's how to get noticed by coaches.
          </DialogDescription>
        </DialogHeader>

        <View style={styles.body}>
          {/* Quick Stats */}
          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Sparkles size={20} color={colors.primary} style={styles.statIcon} />
              <Text style={styles.statLabel}>AI Matches</Text>
              <Text style={styles.statValue}>{athleteMatches.length}</Text>
            </View>
            <View style={styles.statBox}>
              <Users size={20} color={colors.primary} style={styles.statIcon} />
              <Text style={styles.statLabel}>Coaches</Text>
              <Text style={styles.statValue}>
                {coaches.length > 0 ? coaches.length.toLocaleString() : "0"}
              </Text>
            </View>
            <View style={styles.statBox}>
              <Trophy size={20} color={colors.primary} style={styles.statIcon} />
              <Text style={styles.statLabel}>Schools</Text>
              <Text style={styles.statValue}>
                {uniqueSchools > 0 ? uniqueSchools.toLocaleString() : "0"}
              </Text>
            </View>
          </View>

          {/* Progress Bar */}
          <View style={styles.progressSection}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressLabel}>Profile Strength</Text>
              <Badge variant="secondary" style={styles.progressBadge}>
                <View style={styles.badgeInner}>
                  <Sparkles size={12} color={colors.secondaryForeground} />
                  <Text style={styles.badgeText}>
                    {` ${completedCount}/${totalSteps} Complete`}
                  </Text>
                </View>
              </Badge>
            </View>
            <Progress value={progress} style={styles.progressBar} />
          </View>

          {/* Steps */}
          <View style={styles.stepsList}>
            {steps.map((step, index) => {
              const isCompleted =
                completedSteps.includes(index) || step.completed;
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
                                isCurrent ? colors.primary : colors.mutedForeground
                              }
                            />
                          )}
                        </View>
                        <View style={styles.stepBody}>
                          <View style={styles.stepTitleRow}>
                            <Text style={styles.stepTitle}>{step.title}</Text>
                            {isCompleted && (
                              <Badge variant="secondary" style={styles.doneBadge}>
                                <Text style={styles.doneBadgeText}>Done</Text>
                              </Badge>
                            )}
                          </View>
                          <Text style={styles.stepDescription}>
                            {step.description}
                          </Text>
                          {isCurrent && !isCompleted && (
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
            I'll explore later
          </Button>
          <Button
            style={styles.footerBtn}
            onPress={handleGetStarted}
            leftIcon={<Trophy size={16} color={colors.primaryForeground} />}
          >
            Complete My Profile
          </Button>
        </View>
      </DialogContent>
    </Dialog>
  );
}

export function useAthleteQuickStartGuide() {
  const { showGuide, dismissGuide, resetGuide, isLoading } =
    useQuickStartProgress("athlete");
  return {
    showGuide: !isLoading && showGuide,
    dismissGuide,
    resetGuide,
  };
}

export default AthleteQuickStartGuide;

// ---------- Styles ----------
// Mapping Lovable tailwind tokens → theme values:
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
    backgroundColor: colors.muted, // bg-primary/10 approximation; RN has no bg-alpha token
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
  stepTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  stepTitle: {
    fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: typography.fontSize.sm,
    color: colors.foreground,
  },
  doneBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 0,
  },
  doneBadgeText: {
    fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: typography.fontSize.xs,
    color: colors.secondaryForeground,
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
