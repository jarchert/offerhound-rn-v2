// AdminSocialScreen — thin screen wrapper for AdminTestimonialManager.
// Wave 1 wiring: new "Social" tab in AdminTabs.
import React from 'react';
import { SafeAreaView, StyleSheet } from 'react-native';
import { AdminTestimonialManager } from '@/components/AdminTestimonialManager';
import { colors } from '@/lib/theme';

export default function AdminSocialScreen() {
  return (
    <SafeAreaView style={s.root}>
      <AdminTestimonialManager />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
});
