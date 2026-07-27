import { useEffect, useRef } from "react";
import * as Notifications from "expo-notifications";
import { useRouter } from "expo-router";
import { Platform } from "react-native";
import { useAuthStore } from "../stores/auth-store";
import { trpc } from "../lib/trpc";
import { registerForPushNotifications } from "../lib/push-notifications";
import { getNotificationRoute } from "../lib/notification-navigation";

/** Invisible: registers the device's Expo push token on login, and deep-links on notification tap. */
export function PushRegistration() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const registerMutation = trpc.pushTokens.register.useMutation();
  const hasRegistered = useRef<string | null>(null);

  useEffect(() => {
    // On logout, clear the marker so the next login (even the same user) re-registers,
    // since the token is unregistered from the backend at logout.
    if (!user) {
      hasRegistered.current = null;
      return;
    }
    if (hasRegistered.current === user.id) return;
    hasRegistered.current = user.id;

    registerForPushNotifications()
      .then((token) => {
        if (token) {
          registerMutation.mutate({ expoPushToken: token, deviceInfo: Platform.OS });
        }
      })
      .catch(() => {
        // Non-fatal: permission prompt or token fetch can throw; device just won't get push.
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as
        | ({ type?: string } & Record<string, unknown>)
        | undefined;
      const currentUser = useAuthStore.getState().user;
      if (!data?.type || !currentUser) return;

      router.push(getNotificationRoute(data.type, currentUser.role, data) as never);
    });
    return () => subscription.remove();
  }, [router]);

  return null;
}
