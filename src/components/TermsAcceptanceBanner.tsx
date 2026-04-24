import { View, Text, StyleSheet } from "react-native";
import { useNavigation, NavigationProp } from "@react-navigation/native";
import { AlertTriangle } from "lucide-react-native";
import { Button } from "@/components/ui/Button";
import { useHasAcceptedTerms, useActiveTermsVersion } from "@/hooks/useTermsAcceptance";
import { colors, spacing, radius, typography, shadows } from "@/lib/theme";

export function TermsAcceptanceBanner() {
  const nav = useNavigation<NavigationProp<any>>();
  const { hasAccepted, isLoading: acceptanceLoading } = useHasAcceptedTerms();
  const { data: activeTerms, isLoading: termsLoading } = useActiveTermsVersion();

  // Don't show banner while loading or if there's no active terms version
  if (acceptanceLoading || termsLoading || !activeTerms) {
    return null;
  }

  // User has already accepted the latest terms
  if (hasAccepted) {
    return null;
  }

  return (
    <View style={styles.banner}>
      <View style={styles.row}>
        <View style={styles.left}>
          <AlertTriangle size={20} color="#451a03" style={styles.icon} />
          <Text style={styles.message}>
            Our Terms of Use have been updated (v{activeTerms.version}). Please review and accept to continue using all features.
          </Text>
        </View>
        <Button
          size="sm"
          variant="outline"
          onPress={() => nav.navigate("Terms" as any)}
          style={styles.button}
          textStyle={styles.buttonText}
        >
          Review Terms
        </Button>
      </View>
    </View>
  );
}

// bg-amber-500/90 → rgba(245,158,11,0.9); text-amber-950 → #451a03; border-amber-600 → #d97706
const styles = StyleSheet.create({
  banner: {
    backgroundColor: "rgba(245, 158, 11, 0.9)",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4, // py-3 ≈ 12px
    borderRadius: radius.lg,
    ...shadows.subtle,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  left: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm + 4, // gap-3 ≈ 12px
    flexShrink: 1,
  },
  icon: {
    flexShrink: 0,
  },
  message: {
    flexShrink: 1,
    color: "#451a03",
    fontSize: typography.size.sm,
    fontFamily: typography.fontFamily.bodyMedium,
  },
  button: {
    flexShrink: 0,
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    borderColor: "#d97706",
  },
  buttonText: {
    color: "#451a03",
  },
});
