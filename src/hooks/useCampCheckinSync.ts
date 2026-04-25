import { useCallback, useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import NetInfo from "@react-native-community/netinfo";
import { flushQueue, listQueue, type QueuedOp } from "@/lib/checkinQueue";
import { useToast } from "@/hooks/use-toast";

/**
 * Manages the offline check-in queue for a camp.
 * Auto-flushes whenever the device comes back online.
 *
 * RN port of Lovable web src/hooks/useCampCheckinSync.ts. The web version listened
 * to `window` online/offline events; this version subscribes to NetInfo. Queue/flush
 * logic is preserved verbatim; only the connectivity source and storage layer changed.
 */
export function useCampCheckinSync(campId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [queue, setQueue] = useState<QueuedOp[]>([]);
  const [isFlushing, setIsFlushing] = useState(false);

  const refreshQueue = useCallback(async () => {
    const items = await listQueue(campId);
    setQueue(items);
  }, [campId]);

  const doFlush = useCallback(async () => {
    if (isFlushing) return;
    setIsFlushing(true);
    try {
      const result = await flushQueue(campId);
      if (result.flushed > 0) {
        toast({
          title: "Synced offline check-ins",
          description: `${result.flushed} operation${result.flushed === 1 ? "" : "s"} synced${
            result.failed > 0 ? `, ${result.failed} failed` : ""
          }.`,
        });
        queryClient.invalidateQueries({ queryKey: ["camp-ops-enrollments", campId] });
      }
      await refreshQueue();
    } finally {
      setIsFlushing(false);
    }
  }, [campId, isFlushing, queryClient, refreshQueue, toast]);

  // initial load + NetInfo subscription
  useEffect(() => {
    refreshQueue();

    // Seed initial state from current NetInfo snapshot.
    NetInfo.fetch().then((state) => {
      const online = state.isConnected !== false && state.isInternetReachable !== false;
      setIsOnline(online);
    });

    const unsubscribe = NetInfo.addEventListener((state) => {
      const online = state.isConnected !== false && state.isInternetReachable !== false;
      setIsOnline((prev) => {
        if (!prev && online) {
          // transitioned offline → online: flush
          doFlush();
        }
        return online;
      });
    });

    return () => {
      unsubscribe();
    };
  }, [doFlush, refreshQueue]);

  // poll every 10s in case the online event was missed
  useEffect(() => {
    if (!isOnline) return;
    const t = setInterval(() => {
      if (queue.length > 0) doFlush();
    }, 10_000);
    return () => clearInterval(t);
  }, [isOnline, queue.length, doFlush]);

  return {
    isOnline,
    queue,
    queueCount: queue.length,
    isFlushing,
    flushNow: doFlush,
    refreshQueue,
  };
}
