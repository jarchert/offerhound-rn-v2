import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, ViewStyle } from 'react-native';

// Minimal fade-in wrapper — replaces framer-motion page transitions.
export function AnimatedPage({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  const opacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(opacity, { toValue: 1, duration: 250, useNativeDriver: true }).start();
  }, [opacity]);
  return <Animated.View style={[styles.container, { opacity }, style]}>{children}</Animated.View>;
}

export default AnimatedPage;

const styles = StyleSheet.create({ container: { flex: 1 } });
