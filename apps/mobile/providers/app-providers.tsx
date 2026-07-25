import { useState, useEffect } from "react";
import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { trpc } from "../lib/trpc";
import { createTRPCClient } from "../lib/trpc-client";
import { resolveApiBase } from "../lib/runtime-config";
import { LoadingScreen } from "../components/ui/loading-screen";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
  },
});

export function AppProviders({ children }: { children: ReactNode }) {
  // Resolve the backend URL (remote config → cache → build default) BEFORE creating
  // the tRPC client, so moving the backend never requires a new APK.
  const [trpcClient, setTrpcClient] = useState<ReturnType<typeof createTRPCClient> | null>(null);

  useEffect(() => {
    let mounted = true;
    resolveApiBase().finally(() => {
      if (mounted) setTrpcClient(createTRPCClient());
    });
    return () => {
      mounted = false;
    };
  }, []);

  if (!trpcClient) return <LoadingScreen />;

  return (
    <QueryClientProvider client={queryClient}>
      <trpc.Provider client={trpcClient} queryClient={queryClient}>
        {children}
      </trpc.Provider>
    </QueryClientProvider>
  );
}
