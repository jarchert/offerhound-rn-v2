import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, type TextInputProps } from 'react-native';
import { Eye, EyeOff } from 'lucide-react-native';
import { colors } from '@/lib/theme';

export function PasswordInput(props: TextInputProps) {
  const [visible, setVisible] = useState(false);
  const Icon = visible ? EyeOff : Eye;
  return <View style={styles.container}>
    <TextInput {...props} autoCapitalize="none" autoCorrect={false}
      secureTextEntry={!visible} style={[props.style, styles.input]} />
    <Pressable accessibilityRole="button" accessibilityLabel={visible ? 'Hide password' : 'Show password'}
      onPress={() => setVisible(v => !v)} style={styles.toggle}>
      <Icon size={20} color={colors.foreground} />
      <Text style={styles.label}>{visible ? 'Hide' : 'Show'}</Text>
    </Pressable>
  </View>;
}
const styles = StyleSheet.create({
  container: { position: 'relative', width: '100%' },
  input: { paddingRight: 100 },
  toggle: { position: 'absolute', right: 4, top: 0, bottom: 0, minWidth: 88, minHeight: 44,
    flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center' },
  label: { color: colors.foreground, fontSize: 14 },
});
