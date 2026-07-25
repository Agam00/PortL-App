import * as SecureStore from "expo-secure-store";
import { env } from "./env";

/**
 * Lets the backend URL change WITHOUT shipping a new APK.
 * At launch the app reads its API base from a tiny JSON file hosted at a stable URL
 * (your GitHub repo). To move the backend later, just edit that file — no rebuild.
 * Resolution order: remote config → last cached value → the URL baked in at build time.
 */
const CONFIG_URL = "https://raw.githubusercontent.com/Agam00/PortL-App/main/mobile-config.json";
const CACHE_KEY = "portl_api_base";
const FETCH_TIMEOUT_MS = 2500;

let apiBase = normalize(env.API_URL);

function normalize(url: string): string {
  return url.trim().replace(/\/+$/, "");
}
function isValidUrl(url: unknown): url is string {
  return typeof url === "string" && /^https?:\/\/.+/i.test(url.trim());
}

/** The currently resolved backend base URL (no trailing slash). */
export function getApiBase(): string {
  return apiBase;
}

async function fetchRemoteBase(): Promise<string | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(`${CONFIG_URL}?t=${Date.now()}`, { signal: controller.signal });
    if (!res.ok) return null;
    const json = (await res.json()) as { apiUrl?: unknown };
    return isValidUrl(json?.apiUrl) ? normalize(json.apiUrl) : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Resolves and stores the backend URL. Best-effort — never throws.
 * Seeds from cache first (so we're fine offline), then prefers the remote config.
 */
export async function resolveApiBase(): Promise<string> {
  try {
    const cached = await SecureStore.getItemAsync(CACHE_KEY);
    if (isValidUrl(cached)) apiBase = normalize(cached);
  } catch {
    // ignore — fall back to the build-time default
  }

  const remote = await fetchRemoteBase();
  if (remote) {
    apiBase = remote;
    try {
      await SecureStore.setItemAsync(CACHE_KEY, remote);
    } catch {
      // caching is best-effort
    }
  }

  return apiBase;
}
