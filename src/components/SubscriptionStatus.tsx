// Ported verbatim from Lovable: src/components/SubscriptionStatus.tsx
// Tailwind classes → StyleSheet using theme tokens.
// shadcn/ui primitives → @/components/ui/*.
// lucide-react → lucide-react-native.
// react-router-dom <Link to="/pricing"> → navigation.navigate('SettingsStack', { screen: 'Pricing' }).
// The v2 useSubscription hook exposes `tierName` instead of `planType`, and does not
// expose `openCustomerPortal`; we mirror the original behaviour by invoking the
// `customer-portal` edge function locally and opening the returned URL.

import React, { useState } from "react";
import { View, Text, StyleSheet, Linking, ActivityIndicator } from "react-native";
import { Crown, CreditCard, Calendar, ExternalLink, Sparkles, Users } from "lucide-react-native";
import { useNavigation } from "@react-navigation/native";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { useSubscription } from "@/hooks/useSubscription";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { colors, typography, spacing } from "@/lib/theme";

export function SubscriptionStatus() {
  const { isSubscribed, tierName, subscriptionEnd, isLoading, isCoachOrScout } = useSubscription();
  const [isOpeningPortal, setIsOpeningPortal] = useState(false);
  const { toast } = useToast();
  const navigation = useNavigation<any>();

  // Derive planType from tierName to mirror original verbatim semantics.
  const planType = tierName && tierName.toLowerCase().includes("year") ? "yearly" : "monthly";

  const handleManageSubscription = async () => {
    setIsOpeningPortal(true);
    try {
      const { data, error } = await supabase.functions.invoke("customer-portal");
      if (error) throw error;
      if (data?.url) {
        await Linking.openURL(data.url);
      } else {
        throw new Error("No portal URL returned");
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Unable to open subscription management. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsOpeningPortal(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent style={s.loadingContent}>
          <View style={s.centerRow}>
            <ActivityIndicator color={colors.mutedForeground} />
          </View>
        </CardContent>
      </Card>
    );
  }

  if (!isSubscribed) {
    return (
      <Card style={s.upgradeCard}>
        <CardHeader style={s.headerPb}>
          <View style={s.rowGap2}>
            <Sparkles size={20} color={colors.primary} />
            <CardTitle>Upgrade Your Profile</CardTitle>
          </View>
          <CardDescription>
            Get access to AI recruiting letters, coach search, and more
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            style={s.fullWidth}
            onPress={() => navigation.navigate("SettingsStack", { screen: "Pricing" })}
            leftIcon={<Crown size={16} color={colors.primaryForeground} style={s.iconMr} />}
          >
            View Plans
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Free access for coaches and scouts
  if (isCoachOrScout) {
    return (
      <Card style={s.coachCard}>
        <CardHeader style={s.headerPb}>
          <View style={s.rowBetween}>
            <View style={s.rowGap2}>
              <Users size={20} color={EMERALD_500} />
              <CardTitle>Access Status</CardTitle>
            </View>
            <Badge style={s.emeraldBadge}>
              <Text style={s.emeraldBadgeText}>Free Access</Text>
            </Badge>
          </View>
          <CardDescription>
            Coaches and scouts enjoy complimentary access to OfferHound™
          </CardDescription>
        </CardHeader>
        <CardContent>
          <View style={s.row3}>
            <Crown size={16} color={EMERALD_600} />
            <Text style={s.emeraldText}>All premium features included</Text>
          </View>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card style={s.primaryCard}>
      <CardHeader style={s.headerPb}>
        <View style={s.rowBetween}>
          <View style={s.rowGap2}>
            <Crown size={20} color={colors.primary} />
            <CardTitle>Subscription</CardTitle>
          </View>
          <Badge style={s.primaryBadge}>
            <Text style={s.primaryBadgeText}>
              {planType === "yearly" ? "Yearly" : "Monthly"}
            </Text>
          </Badge>
        </View>
        <CardDescription>Your athlete profile subscription</CardDescription>
      </CardHeader>
      <CardContent style={s.contentSpacing}>
        <View style={s.row3}>
          <Calendar size={16} color={colors.mutedForeground} />
          <Text style={s.mutedText}>
            {subscriptionEnd ? `Renews on ${formatDate(subscriptionEnd)}` : "Active subscription"}
          </Text>
        </View>

        <Button
          variant="outline"
          onPress={handleManageSubscription}
          disabled={isOpeningPortal}
          style={s.fullWidth}
          leftIcon={
            isOpeningPortal ? (
              <ActivityIndicator size="small" color={colors.foreground} style={s.iconMr} />
            ) : (
              <CreditCard size={16} color={colors.foreground} style={s.iconMr} />
            )
          }
          rightIcon={
            !isOpeningPortal ? (
              <ExternalLink size={12} color={colors.foreground} style={s.iconMl} />
            ) : undefined
          }
        >
          {isOpeningPortal ? "Opening..." : "Manage Subscription"}
        </Button>
      </CardContent>
    </Card>
  );
}

export default SubscriptionStatus;

const EMERALD_500 = "#10b981";
const EMERALD_600 = "#059669";

const s = StyleSheet.create({
  loadingContent: { padding: spacing.lg },
  centerRow: { flexDirection: "row", alignItems: "center", justifyContent: "center" },
  upgradeCard: {
    borderStyle: "dashed",
    borderWidth: 2,
    borderColor: colors.primary + "33",
    backgroundColor: colors.primary + "0D",
  },
  coachCard: {
    borderColor: EMERALD_500 + "4D",
    backgroundColor: EMERALD_500 + "1A",
  },
  primaryCard: {
    borderColor: colors.primary + "33",
    backgroundColor: colors.primary + "0D",
  },
  headerPb: { paddingBottom: spacing.sm },
  rowGap2: { flexDirection: "row", alignItems: "center", gap: 8 },
  rowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  row3: { flexDirection: "row", alignItems: "center", gap: 12 },
  fullWidth: { width: "100%" },
  iconMr: { marginRight: 8 },
  iconMl: { marginLeft: 8 },
  contentSpacing: { gap: spacing.md },
  mutedText: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.sm,
    color: colors.mutedForeground,
  },
  emeraldText: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.sm,
    color: EMERALD_600,
  },
  emeraldBadge: {
    backgroundColor: EMERALD_500 + "33",
    borderWidth: 1,
    borderColor: EMERALD_500 + "4D",
  },
  emeraldBadgeText: {
    fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: typography.fontSize.xs,
    color: EMERALD_600,
  },
  primaryBadge: {
    backgroundColor: colors.primary + "33",
    borderWidth: 0,
  },
  primaryBadgeText: {
    fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: typography.fontSize.xs,
    color: colors.primary,
  },
});
