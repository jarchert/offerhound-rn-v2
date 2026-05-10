// Push notifications — registers the device with Expo / APNs / FCM and stores
// the token in Supabase so backend functions can target the user.

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { supabase } from '@/integrations/supabase/client';

// NOTE: setNotificationHandler is intentionally NOT called at module-eval
// time. On iOS 26 + New Architecture, calling any void TurboModule method
// at module-eval scope triggers the __cxa_rethrow -> std::terminate crash
// on the turbomodulemanager queue. Call initNotificationHandler() from a
// useEffect after the first render instead.
export function initNotificationHandler(): void {
  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
  } catch (e) {
    console.warn('[push] setNotificationHandler failed (iOS 26?):', e);
  }
}

export async function requestPushPermissions(): Promise<boolean> {
  if (!Device.isDevice) return false;
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

export async function registerForPushNotifications(userId: string): Promise<string | null> {
  const granted = await requestPushPermissions();
  if (!granted) return null;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Default',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  const tokenResp = await Notifications.getExpoPushTokenAsync();
  const token = tokenResp.data;
  if (!token) return null;

  await supabase.from('push_tokens' as any).upsert(
    {
      user_id: userId,
      token,
      platform: Platform.OS,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'token' },
  );

  return token;
}

export async function unregisterPushToken(token: string): Promise<void> {
  await supabase.from('push_tokens' as any).delete().eq('token', token);
}
