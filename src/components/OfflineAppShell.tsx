import { WifiOff, RefreshCw, Home, FileText } from "lucide-react-native";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { useNetInfo, fetch as fetchNetInfo } from "@react-native-community/netinfo";
import { useEffect, useState } from "react";
import { StyleSheet, View, Text, ScrollView, ActivityIndicator } from "react-native";
import { colors, typography, spacing, radius } from "@/lib/theme";

interface OfflineAppShellProps {
  children: React.ReactNode;
}

export const OfflineAppShell = ({ children }: OfflineAppShellProps) => {
  const netInfo = useNetInfo();
  // Parity: mirror web's navigator.onLine. Treat unknown (null) as online to avoid
  // flashing the offline shell on first render.
  const isOnline = netInfo.isConnected !== false;
  const [showOffline, setShowOffline] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Debounce the offline state to prevent flickering
  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    if (!isOnline) {
      // Show offline screen after a short delay to avoid flicker
      timeoutId = setTimeout(() => {
        setShowOffline(true);
      }, 500);
    } else {
      setShowOffline(false);
    }

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [isOnline]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    // Wait a moment then re-check connectivity. On RN we can't "reload" the page
    // like the web version; instead we re-fetch NetInfo and let the effect above
    // flip showOffline back to false when connected.
    setTimeout(() => {
      fetchNetInfo()
        .catch(() => undefined)
        .finally(() => setIsRefreshing(false));
    }, 300);
  };

  const handleGoHome = () => {
    // Parity note: web version does window.location.href = '/'. In RN there is no
    // global router handle here; dismissing the offline shell is the closest
    // equivalent — when connectivity returns the app re-renders its root.
    setShowOffline(false);
  };

  // If online, render children normally
  if (!showOffline) {
    return <>{children}</>;
  }

  // Render offline shell
  return (
    <View style={styles.root}>
      {/* Decorative background blobs (blur approximated with low-opacity fills) */}
      <View style={styles.bgLayer} pointerEvents="none">
        <View style={styles.blobTopLeft} />
        <View style={styles.blobBottomRight} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Card style={styles.card}>
          <CardHeader style={styles.cardHeader}>
            <View style={styles.iconCircle}>
              <WifiOff size={40} color={colors.warning} />
            </View>
            <CardTitle style={styles.title}>You're Offline</CardTitle>
            <CardDescription style={styles.description}>
              It looks like you've lost your internet connection. Don't worry - your data is safe!
            </CardDescription>
          </CardHeader>

          <CardContent style={styles.cardContent}>
            {/* What you can do section */}
            <View style={styles.infoBox}>
              <Text style={styles.infoHeading}>While you're offline, you can:</Text>
              <View style={styles.infoList}>
                <View style={styles.infoRow}>
                  <FileText size={16} color={colors.primary} style={styles.infoIcon} />
                  <Text style={styles.infoText}>
                    View cached profile data (if previously loaded)
                  </Text>
                </View>
                <View style={styles.infoRow}>
                  <Home size={16} color={colors.primary} style={styles.infoIcon} />
                  <Text style={styles.infoText}>Access the app when you reconnect</Text>
                </View>
              </View>
            </View>

            {/* Actions */}
            <View style={styles.actions}>
              <Button
                onPress={handleRefresh}
                disabled={isRefreshing}
                style={styles.actionButton}
              >
                {isRefreshing ? (
                  <View style={styles.buttonInner}>
                    <ActivityIndicator size="small" color={colors.primaryForeground} style={styles.buttonIcon} />
                    <Text style={styles.buttonLabel}>Checking connection...</Text>
                  </View>
                ) : (
                  <View style={styles.buttonInner}>
                    <RefreshCw size={16} color={colors.primaryForeground} style={styles.buttonIcon} />
                    <Text style={styles.buttonLabel}>Try Again</Text>
                  </View>
                )}
              </Button>

              <Button
                variant="outline"
                onPress={handleGoHome}
                style={styles.actionButton}
              >
                <View style={styles.buttonInner}>
                  <Home size={16} color={colors.foreground} style={styles.buttonIcon} />
                  <Text style={[styles.buttonLabel, styles.buttonLabelOutline]}>Go to Home</Text>
                </View>
              </Button>
            </View>

            {/* Tip */}
            <Text style={styles.tip}>
              💡 Tip: Make sure you're connected to Wi-Fi or mobile data
            </Text>
          </CardContent>
        </Card>

        {/* Branding */}
        <View style={styles.branding}>
          <Text style={styles.brandTitle}>OFFERHOUND™</Text>
          <Text style={styles.brandSubtitle}>
            Your recruiting journey continues when you're back online
          </Text>
        </View>
      </ScrollView>
    </View>
  );
};

export default OfflineAppShell;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  bgLayer: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  blobTopLeft: {
    position: 'absolute',
    top: 80,
    left: 40,
    width: 288,
    height: 288,
    borderRadius: 144,
    backgroundColor: 'rgba(244, 158, 10, 0.05)', // warning/5
  },
  blobBottomRight: {
    position: 'absolute',
    bottom: 80,
    right: 40,
    width: 384,
    height: 384,
    borderRadius: 192,
    backgroundColor: 'rgba(244, 158, 10, 0.05)',
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  card: {
    width: '100%',
    maxWidth: 448, // max-w-md
    borderColor: 'rgba(244, 158, 10, 0.3)', // amber-500/30
    backgroundColor: colors.card,
    zIndex: 10,
  },
  cardHeader: {
    alignItems: 'center',
    paddingBottom: spacing.md,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(244, 158, 10, 0.1)', // amber-500/10
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  title: {
    fontFamily: typography.fontFamily.heading,
    fontSize: typography.size['2xl'],
    color: colors.foreground,
    textAlign: 'center',
  },
  description: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.base,
    color: colors.mutedForeground,
    textAlign: 'center',
  },
  cardContent: {
    gap: spacing.lg,
  },
  infoBox: {
    backgroundColor: 'rgba(32, 36, 43, 0.5)', // muted/50
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.sm + 4,
  },
  infoHeading: {
    fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: typography.size.sm,
    color: colors.foreground,
  },
  infoList: {
    gap: spacing.sm,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  infoIcon: {
    marginTop: 2,
  },
  infoText: {
    flex: 1,
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.sm,
    color: colors.mutedForeground,
  },
  actions: {
    gap: spacing.sm + 4,
  },
  actionButton: {
    width: '100%',
  },
  buttonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonIcon: {
    marginRight: spacing.sm,
  },
  buttonLabel: {
    fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: typography.size.sm,
    color: colors.primaryForeground,
  },
  buttonLabelOutline: {
    color: colors.foreground,
  },
  tip: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.xs,
    color: colors.mutedForeground,
    textAlign: 'center',
  },
  branding: {
    marginTop: spacing.xl,
    alignItems: 'center',
    zIndex: 10,
  },
  brandTitle: {
    fontFamily: typography.fontFamily.heading,
    fontSize: typography.size.xl,
    color: colors.primary,
    letterSpacing: typography.letterSpacing.heading,
  },
  brandSubtitle: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.xs,
    color: colors.mutedForeground,
    marginTop: 4,
    textAlign: 'center',
  },
});
