import { WifiOff } from "lucide-react-native";
import { memo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useNetInfo } from "@react-native-community/netinfo";

interface OfflineBannerProps {
  isOfflineData?: boolean;
}

// Memoize to prevent unnecessary re-renders
export const OfflineBanner = memo(({ isOfflineData }: OfflineBannerProps) => {
  const netInfo = useNetInfo();
  const isOffline = netInfo.isConnected === false;
  const show = isOfflineData || isOffline;

  if (!show) return null;

  return (
    <View style={styles.alert}>
      <WifiOff size={16} color="#f59e0b" style={styles.icon} />
      <Text style={styles.description}>
        You're viewing cached data. Some features may be limited while offline.
      </Text>
    </View>
  );
});

OfflineBanner.displayName = 'OfflineBanner';

export default OfflineBanner;

const styles = StyleSheet.create({
  alert: {
    marginBottom: 16,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.5)',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    marginRight: 8,
  },
  description: {
    color: '#f59e0b',
    flex: 1,
  },
});
