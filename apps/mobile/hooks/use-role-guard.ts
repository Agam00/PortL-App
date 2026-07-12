import { useEffect } from "react";
import { useRouter } from "expo-router";
import { useAuthStore } from "../stores/auth-store";
import type { AuthUser } from "../lib/trpc";

/**
 * Client-side routing guard: keeps a resident/guard/admin from landing on
 * another role's tab group. The real access control is server-side (Phase 2
 * RBAC) — this only exists so the UI never even shows the wrong shell.
 */
export function useRoleGuard(expectedRole: AuthUser["role"]) {
  const router = useRouter();
  const hasHydrated = useAuthStore((s) => s.hasHydrated);
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    if (!hasHydrated) return;
    if (!user) {
      router.replace("/(auth)/login");
      return;
    }
    if (user.mustResetPassword) {
      router.replace("/(auth)/set-password");
      return;
    }
    if (user.role !== expectedRole) {
      router.replace("/");
    }
  }, [hasHydrated, user, expectedRole, router]);

  return { user, hasHydrated };
}
