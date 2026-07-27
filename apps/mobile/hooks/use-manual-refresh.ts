import { useCallback, useState } from "react";

/**
 * Pull-to-refresh state that only spins for a *user-initiated* refresh.
 * Binding RefreshControl's `refreshing` to react-query's `isRefetching` makes the
 * spinner blip on every background poll (refetchInterval) — this avoids that flicker.
 */
export function useManualRefresh(refetch: () => Promise<unknown>) {
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  }, [refetch]);
  return { refreshing, onRefresh };
}
