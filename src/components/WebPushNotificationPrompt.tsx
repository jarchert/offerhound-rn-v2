// Ported verbatim from Lovable src/components/WebPushNotificationPrompt.tsx.
// Web Push APIs (Notification.permission, serviceWorker) → expo-notifications.
// Native Capacitor check removed because this Expo RN app IS the native surface.
// localStorage → AsyncStorage. shadcn Card/Button → ui/*. lucide-react → lucide-react-native.

import { useState, useEffect } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Bell, X, CheckCircle } from 'lucide-react-native';
import { Button } from '@/components/ui/Button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/Card';
import { colors, spacing, typography } from '@/lib/theme';

type PushPermission = 'default' | 'granted' | 'denied';

const DISMISS_KEY = 'web-push-notification-dismissed';

function mapStatus(status: Notifications.PermissionStatus): PushPermission {
  if (status === 'granted') return 'granted';
  if (status === 'denied') return 'denied';
  return 'default';
}

function useWebPushNotifications() {
  const isSupported = Device.isDevice;
  const [permission, setPermission] = useState<PushPermission>('default');
  const [isSubscribed, setIsSubscribed] = useState(false);

  useEffect(() => {
    let mounted = true;
    if (!isSupported) return;
    (async () => {
      const { status } = await Notifications.getPermissionsAsync();
      if (!mounted) return;
      const mapped = mapStatus(status);
      setPermission(mapped);
      setIsSubscribed(mapped === 'granted');
    })();
    return () => {
      mounted = false;
    };
  }, [isSupported]);

  const requestPermission = async () => {
    if (!isSupported) return false;
    const { status } = await Notifications.requestPermissionsAsync();
    const mapped = mapStatus(status);
    setPermission(mapped);
    if (mapped === 'granted') {
      try {
        await Notifications.getExpoPushTokenAsync();
        setIsSubscribed(true);
      } catch {
        setIsSubscribed(false);
      }
    }
    return mapped === 'granted';
  };

  return { isSupported, permission, isSubscribed, requestPermission };
}

export function WebPushNotificationPrompt() {
  const { isSupported, permission, requestPermission } = useWebPushNotifications();
  const [isDismissed, setIsDismissed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Check if user has previously dismissed
  useEffect(() => {
    (async () => {
      const dismissed = await AsyncStorage.getItem(DISMISS_KEY);
      if (dismissed) {
        setIsDismissed(true);
      }
    })();
  }, []);

  // Don't show on unsupported (e.g. simulators), or if already granted/denied/dismissed
  if (!isSupported || permission === 'granted' || permission === 'denied' || isDismissed) {
    return null;
  }

  const handleEnable = async () => {
    setIsLoading(true);
    await requestPermission();
    setIsLoading(false);
  };

  const handleDismiss = async () => {
    await AsyncStorage.setItem(DISMISS_KEY, 'true');
    setIsDismissed(true);
  };

  return (
    <View style={styles.wrapper} pointerEvents="box-none">
      <Card style={styles.card}>
        <CardHeader style={styles.header}>
          <Pressable onPress={handleDismiss} style={styles.closeBtn} hitSlop={8}>
            <X size={16} color={colors.mutedForeground} />
          </Pressable>
          <View style={styles.headerRow}>
            <View style={styles.iconCircle}>
              <Bell size={20} color={colors.primary} />
            </View>
            <View style={styles.headerText}>
              <CardTitle style={styles.title}>Enable Notifications</CardTitle>
              <CardDescription style={styles.description}>
                Get instant alerts when coaches interact with your profile
              </CardDescription>
            </View>
          </View>
        </CardHeader>
        <CardContent style={styles.content}>
          <View style={styles.buttonRow}>
            <Button
              onPress={handleEnable}
              size="sm"
              disabled={isLoading}
              loading={isLoading}
              style={styles.enableBtn}
            >
              {isLoading ? 'Enabling...' : 'Enable Notifications'}
            </Button>
            <Button onPress={handleDismiss} size="sm" variant="outline">
              Not Now
            </Button>
          </View>
        </CardContent>
      </Card>
    </View>
  );
}

export function WebNotificationStatus() {
  const { isSupported, permission } = useWebPushNotifications();

  if (!isSupported) {
    return (
      <View style={styles.statusRow}>
        <Bell size={16} color={colors.mutedForeground} />
        <View>
          <CardDescription style={styles.statusText}>
            Browser notifications not supported
          </CardDescription>
        </View>
      </View>
    );
  }

  if (permission === 'granted') {
    return (
      <View style={styles.statusRow}>
        <CheckCircle size={16} color={colors.success} />
        <View>
          <CardDescription style={StyleSheet.flatten([styles.statusText, { color: colors.success }])}>
            Browser notifications enabled
          </CardDescription>
        </View>
      </View>
    );
  }

  if (permission === 'denied') {
    return (
      <View style={styles.statusRow}>
        <Bell size={16} color={colors.destructive} />
        <View>
          <CardDescription style={StyleSheet.flatten([styles.statusText, { color: colors.destructive }])}>
            Notifications blocked by browser
          </CardDescription>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.statusRow}>
      <Bell size={16} color={colors.mutedForeground} />
      <View>
        <CardDescription style={styles.statusText}>
          Browser notifications not enabled
        </CardDescription>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // fixed bottom-4 left-4 right-4 z-50 md:left-auto md:right-4 md:w-96
  wrapper: {
    position: 'absolute',
    bottom: spacing.md,
    left: spacing.md,
    right: spacing.md,
    zIndex: 50,
  },
  // shadow-lg border-primary/20
  card: {
    borderColor: 'rgba(231, 175, 8, 0.2)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 15,
    elevation: 8,
  },
  header: {
    paddingBottom: spacing.sm,
    position: 'relative',
  },
  closeBtn: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    padding: 4,
    zIndex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(231, 175, 8, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: typography.size.base,
  },
  description: {
    fontSize: typography.size.xs,
  },
  content: {
    paddingTop: spacing.sm,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  enableBtn: {
    flex: 1,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  statusText: {
    fontSize: typography.size.sm,
    color: colors.mutedForeground,
  },
});
