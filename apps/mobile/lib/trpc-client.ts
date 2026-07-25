import { httpBatchLink } from "@repo/trpc/client";
import { trpc } from "./trpc";
import { getApiBase } from "./runtime-config";
import { useAuthStore } from "../stores/auth-store";

const REQUEST_TIMEOUT_MS = 10_000;

/** Fails fast with a clear error instead of hanging when the API is unreachable. */
async function fetchWithTimeout(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error("Request timed out — check that the server is reachable.");
    }
    throw new Error("Network error — check your connection and that the server is running.");
  } finally {
    clearTimeout(timer);
  }
}

let refreshPromise: Promise<string | null> | null = null;

/** Calls auth.refresh directly (not through the trpc react client) to avoid a circular dependency. */
async function refreshAccessToken(): Promise<string | null> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    const refreshToken = useAuthStore.getState().refreshToken;
    if (!refreshToken) return null;

    try {
      const res = await fetchWithTimeout(`${getApiBase()}/trpc/auth.refresh`, {
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

  let response = await fetchWithTimeout(input, withAuth(accessToken));

  if (response.status === 401 && accessToken) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      response = await fetchWithTimeout(input, withAuth(newToken));
    }
  }

  return response;
}

export function createTRPCClient() {
  return trpc.createClient({
    links: [
      httpBatchLink({
        url: `${getApiBase()}/trpc`,
        fetch: authFetch,
      }),
    ],
  });
}
