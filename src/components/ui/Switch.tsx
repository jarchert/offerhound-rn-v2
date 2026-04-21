import React from 'react';
import { Switch as RNSwitch, SwitchProps } from 'react-native';
import { colors } from '@/lib/theme';

export function Switch(props: SwitchProps) {
  return (
    <RNSwitch
      trackColor={{ false: colors.muted, true: colors.primary }}
      thumbColor={props.value ? colors.primaryForeground : '#f4f3f4'}
      {...props}
    />
  );
}
