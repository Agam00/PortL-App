import { View, Text, Pressable } from "react-native";
import { useRouter, usePathname } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { trpc } from "../../lib/trpc";
import { useAuthStore } from "../../stores/auth-store";
import { Avatar } from "./avatar";

const NOTIFICATIONS_ROUTE: Record<string, string> = {
  resident: "/(resident)/notifications",
  guard: "/(guard)/notifications",
  admin: "/(admin)/notifications",
};

const PROFILE_ROUTE: Record<string, string> = {
  resident: "/(resident)/profile",
  guard: "/(guard)/profile",
  admin: "/(admin)/profile",
};

/**
 * Global app bar from the Stitch mockups: violet bar with the PORTL wordmark centered,
 * notifications bell left, avatar right; the screen's title renders below as a big
 * content headline (`title`), with an optional muted `subtitle` under it.
 */
export function ScreenHeader({ title, subtitle, role }: { title: string; subtitle?: string; role: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  const notificationsRoute = NOTIFICATIONS_ROUTE[role];
  const profileRoute = PROFILE_ROUTE[role];

  const notificationsQuery = trpc.notifications.list.useQuery(undefined, {
    enabled: !!notificationsRoute,
    refetchInterval: 15_000,
  });
  const unreadCount = (notificationsQuery.data ?? []).filter((n) => !n.readAt).length;
  const onInboxScreen = notificationsRoute && pathname === notificationsRoute;

  return (
    <View>
      <View
        className="px-5 pb-3"
        style={{
          paddingTop: insets.top + 6,
          backgroundColor: "#6244CD",
          borderBottomLeftRadius: 16,
          borderBottomRightRadius: 16,
        }}
      >
        <View className="flex-row items-center justify-between">
          {notificationsRoute && !onInboxScreen ? (
            <Pressable
              onPress={() => router.push(notificationsRoute as never)}
              hitSlop={8}
              className="relative h-10 w-10 items-center justify-center"
              accessibilityLabel={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : "Notifications"}
              accessibilityRole="button"
            >
              <MaterialIcons name="notifications-none" size={24} color="#FFFFFF" />
              {unreadCount > 0 && (
                <View className="absolute right-0.5 top-0.5 h-4 min-w-4 items-center justify-center rounded-full bg-status-red-strong px-1">
                  <Text className="font-bold text-white" style={{ fontSize: 10, lineHeight: 12 }}>
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </Text>
                </View>
              )}
            </Pressable>
          ) : (
            <View className="h-10 w-10" />
          )}

          <Text className="text-headline-md font-extrabold tracking-widest" style={{ color: "#FFFFFF" }}>
            PORTL
          </Text>

          <Pressable
            onPress={() => profileRoute && router.push(profileRoute as never)}
            hitSlop={8}
            accessibilityLabel="Your profile"
            accessibilityRole="button"
            style={{ borderRadius: 20, borderWidth: 2, borderColor: "rgba(255,255,255,0.25)" }}
          >
            <Avatar name={user?.fullName ?? "?"} size={36} />
          </Pressable>
        </View>
      </View>

      {title.length > 0 && (
        <View className="px-5 pb-2 pt-5">
          <Text className="text-headline-lg font-extrabold text-on-surface">{title}</Text>
          {subtitle && <Text className="pt-1 text-body-lg text-on-surface-variant">{subtitle}</Text>}
        </View>
      )}
    </View>
  );
}
