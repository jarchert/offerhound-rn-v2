// CampNewsFeedCard — RN port of Lovable CampNewsFeed.tsx (camp discovery CTA stub).
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { CalendarDays, Bell } from 'lucide-react-native';
import { Card, CardContent, Button } from '@/components/ui';
import { colors, spacing, typography } from '@/lib/theme';

export function CampNewsFeedCard() {
  const nav = useNavigation<any>();
  const browse = () => {
    try { nav.navigate('CampStack' as never); } catch {
      try { nav.navigate('Camps' as never); } catch { /* noop */ }
    }
  };
  return (
    <Card style={{ borderStyle: 'dashed' }}>
      <CardContent style={s.content}>
        <View style={s.iconWrap}>
          <CalendarDays size={24} color={colors.primary} />
        </View>
        <View style={{ alignItems: 'center', gap: 4 }}>
          <Text style={s.title}>Camp & Event Updates</Text>
          <Text style={s.desc}>
            Upcoming prospect camps, showcases, and events tailored to your sport and region will appear here.
          </Text>
        </View>
        <Button variant="outline" size="sm" onPress={browse} leftIcon={<Bell size={14} color={colors.foreground} />}>
          Browse Camps
        </Button>
      </CardContent>
    </Card>
  );
}

const s = StyleSheet.create({
  content: { alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.lg, gap: spacing.sm },
  iconWrap: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(231,175,8,0.18)', alignItems: 'center', justifyContent: 'center' },
  title: { color: colors.foreground, fontFamily: typography.fontFamily.bodySemiBold, fontSize: typography.fontSize.base },
  desc: { color: colors.mutedForeground, fontSize: typography.fontSize.sm, textAlign: 'center', maxWidth: 320 },
});

export default CampNewsFeedCard;
