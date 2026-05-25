import { useCallback } from "react";
import { useRealtimeSubscription } from "./useRealtimeSubscription";

interface UseRealtimeRefreshOptions {
  table: string;
  filter?: string;
  onRefresh: () => void;
  enabled?: boolean;
}

export function useRealtimeRefresh({
  table,
  filter,
  onRefresh,
  enabled = true,
}: UseRealtimeRefreshOptions) {
  const stableRefresh = useCallback(() => {
    onRefresh();
  }, [onRefresh]);

  useRealtimeSubscription({
    table,
    filter,
    onChanged: stableRefresh,
    enabled,
  });
}