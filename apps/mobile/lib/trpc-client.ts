import { httpBatchLink } from "@repo/trpc/client";
import { trpc } from "./trpc";
import { env } from "./env";
import { useAuthStore } from "../stores/auth-store";

let refreshPromise: Promise<string | null> | null = null;

/** Calls auth.refresh directly (not through the trpc react client) to avoid a circular dependency. */
async function refreshAccessToken(): Promise<string | null> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    const refreshToken = useAuthStore.getState().refreshToken;
    if (!refreshToken) return null;

    try {
      const res = await fetch(`${env.API_URL}/trpc/auth.refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      });
      if (!res.ok) throw new Error("refresh failed");

      const json = await res.json();
      const data = json?.result?.data as
        | { accessToken: string; refreshToken: string }
        | undefined;
      if (!data) throw new Error("refresh failed");

      useAuthStore.getState().setTokens(data);
      return data.accessToken;
    } catch {
      useAuthStore.getState().logout();
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

/** Attaches the current access token; on a 401, refreshes once and retries. */
async function authFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const accessToken = useAuthStore.getState().accessToken;

  const withAuth = (token: string | null): RequestInit => ({
    ...init,
    headers: {
      ...(init?.headers as Record<string, string> | undefined),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  let response = await fetch(input, withAuth(accessToken));

  if (response.status === 401 && accessToken) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      response = await fetch(input, withAuth(newToken));
    }
  }

  return response;
}

export function createTRPCClient() {
  return trpc.createClient({
    links: [
      httpBatchLink({
        url: `${env.API_URL}/trpc`,
        fetch: authFetch,
      }),
    ],
  });
}
