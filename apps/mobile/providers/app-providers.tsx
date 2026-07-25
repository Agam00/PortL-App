import { useState, useEffect } from "react";
import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { trpc } from "../lib/trpc";
import { createTRPCClient } from "../lib/trpc-client";
import { resolveApiBase } from "../lib/runtime-config";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
  },
});

export function AppProviders({ children }: { children: ReactNode }) {
  // Create the client immediately (using the build-time default / last-known base) so the
  // app never blocks on startup. Then resolve the remote config in the background — the
  // tRPC fetch reads the current base at call time, so a changed URL applies without a
  // new APK, and a slow/failed config fetch can never freeze the app.
  const [trpcClient] = useState(() => createTRPCClient());

  useEffect(() => {
    resolveApiBase().catch(() => {});
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <trpc.Provider client={trpcClient} queryClient={queryClient}>
        {children}
      </trpc.Provider>
    </QueryClientProvider>
  );
}
