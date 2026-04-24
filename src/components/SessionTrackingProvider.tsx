import { useEffect } from "react";
import { useSessionTracking, setGlobalTracker } from "@/hooks/useSessionTracking";

interface SessionTrackingProviderProps {
  children: React.ReactNode;
}

export function SessionTrackingProvider({ children }: SessionTrackingProviderProps) {
  const { trackEvent } = useSessionTracking();

  // Set the global tracker for use outside of React components
  useEffect(() => {
    setGlobalTracker(trackEvent);
  }, [trackEvent]);

  return <>{children}</>;
}
