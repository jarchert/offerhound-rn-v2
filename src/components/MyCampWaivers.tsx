import React from "react";
import { View, Text } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/Button";
import { CampGuardianWaiver } from "@/components/CampGuardianWaiver";
import { colors, spacing } from "@/lib/theme";
type PendingWaiver = {
  enrollment_id: string;
  camp_id: string;
  camp_name: string;
  attendee_name: string;
};
export function MyCampWaivers() {
  const { user } = useAuth();
  const pending = useQuery({
    queryKey: ["native-my-camp-waivers", user?.id],
    enabled: !!user,
    retry: false,
    queryFn: async () => {
      const result = await (supabase.rpc as any)("my_camp_waivers");
      if (result.error) throw result.error;
      return (result.data ?? []) as PendingWaiver[];
    },
  });
  if (!user || pending.isPending) return null;
  if (pending.isError)
    return (
      <View>
        <Text style={{ color: colors.destructive }}>
          Camp waivers could not be loaded.
        </Text>
        <Button
          onPress={() => {
            void pending.refetch();
          }}
        >
          Retry camp waivers
        </Button>
      </View>
    );
  if (!pending.data?.length) return null;
  return (
    <View
      style={{
        gap: spacing.md,
        padding: 16,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 16,
      }}
    >
      <Text
        style={{ color: colors.foreground, fontWeight: "bold", fontSize: 22 }}
      >
        Camp waivers
      </Text>
      <Text style={{ color: colors.mutedForeground }}>
        Choose a participant to review and sign. One parent or guardian
        signature is enough. No guardian account is required.
      </Text>
      {pending.data.map((item) => (
        <View
          key={item.enrollment_id}
          style={{
            gap: spacing.sm,
            padding: 14,
            borderRadius: 12,
            backgroundColor: colors.card,
          }}
        >
          <Text style={{ color: colors.foreground }}>
            {item.camp_name} · {item.attendee_name}
          </Text>
          <CampGuardianWaiver
            campId={item.camp_id}
            enrollmentId={item.enrollment_id}
          />
        </View>
      ))}
    </View>
  );
}
