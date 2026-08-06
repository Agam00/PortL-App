import { httpBatchLink } from "@repo/trpc/client";
import { trpc } from "./trpc";
import { getApiBase } from "./runtime-config";
import { useAuthStore } from "../stores/auth-store";

/**
 * 30s, not the 10s this used to be. 10s is fine on a warm connection from the
 * same region, but the first request of a session also pays DNS, the TCP
 * handshake and a full TLS negotiation from wherever the user is — and if the
 * API happens to be restarting, everything queues behind that. App Review
 * rejected a build for "unable to login" that was a 10s timeout firing on the
 * very first request; nothing was actually wrong with the credentials.
 */
const REQUEST_TIMEOUT_MS = 30_000;

/** One retry, because the failure this guards against is usually momentary. */
const MAX_ATTEMPTS = 2;
const RETRY_DELAY_MS = 1_000;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchOnce(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/** Fails with a clear error instead of hanging when the API is unreachable. */
async function fetchWithTimeout(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      return await fetchOnce(input, init);
    } catch (err) {
      lastError = err;
      // A caller-initiated abort must not be retried — only our own timeout and
      // transport errors are worth a second attempt.
      if (init?.signal?.aborted) break;
      if (attempt < MAX_ATTEMPTS) await sleep(RETRY_DELAY_MS);
    }
  }

  if (lastError instanceof Error && lastError.name === "AbortError") {
    throw new Error("Request timed out — check that the server is reachable.");
  }
  throw new Error("Network error — check your connection and that the server is running.");
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

/** Rewrites a request's origin to the currently-resolved API base, so a remote
 *  backend-URL change takes effect without recreating the client (or a new APK). */
function toCurrentBase(input: RequestInfo | URL): RequestInfo | URL {
  const base = getApiBase();
  const swap = (u: string) => u.replace(/^https?:\/\/[^/]+/i, base);
  if (typeof input === "string") return swap(input);
  if (input instanceof URL) return swap(input.toString());
  return new Request(swap(input.url), input);
}

/** Attaches the current access token; on a 401, refreshes once and retries. */
async function authFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const accessToken = useAuthStore.getState().accessToken;
  const target = toCurrentBase(input);

  const withAuth = (token: string | null): RequestInit => ({
    ...init,
    headers: {
      ...(init?.headers as Record<string, string> | undefined),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  let response = await fetchWithTimeout(target, withAuth(accessToken));

  if (response.status === 401 && accessToken) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      response = await fetchWithTimeout(target, withAuth(newToken));
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
