// ScrollArea is just a ScrollView on RN — shadcn's custom scrollbar styling is web-only.
import React from 'react';
import { ScrollView, ScrollViewProps, StyleSheet } from 'react-native';

export function ScrollArea({ children, ...props }: ScrollViewProps & { children?: React.ReactNode }) {
  return (
    <ScrollView showsVerticalScrollIndicator={false} {...props}>
      {children}
    </ScrollView>
  );
}
