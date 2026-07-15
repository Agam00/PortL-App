import { View, Text, Pressable } from "react-native";
import { useRouter, usePathname } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { trpc } from "../../lib/trpc";
import { RoleBadge } from "./role-badge";

const NOTIFICATIONS_ROUTE: Record<string, string> = {
  resident: "/(resident)/notifications",
  guard: "/(guard)/notifications",
  admin: "/(admin)/notifications",
};

export function ScreenHeader({ title, role }: { title: string; role: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const notificationsRoute = NOTIFICATIONS_ROUTE[role];

  const notificationsQuery = trpc.notifications.list.useQuery(undefined, {
    enabled: !!notificationsRoute,
    refetchInterval: 15_000,
  });
  const unreadCount = (notificationsQuery.data ?? []).filter((n) => !n.readAt).length;
  const onInboxScreen = notificationsRoute && pathname === notificationsRoute;

  return (
    <View className="flex-row items-center justify-between border-b border-border-subtle bg-background px-4 py-4">
      <Text className="flex-1 text-headline-lg font-semibold text-on-surface">{title}</Text>
      <View className="flex-row items-center gap-3">
        {notificationsRoute && !onInboxScreen && (
          <Pressable
            onPress={() => router.push(notificationsRoute as never)}
            hitSlop={8}
            className="relative"
            accessibilityLabel={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : "Notifications"}
            accessibilityRole="button"
          >
            <MaterialIcons name="notifications-none" size={22} color="#c6c5d5" />
            {unreadCount > 0 && (
              <View className="absolute -right-1 -top-1 h-4 min-w-4 items-center justify-center rounded-full bg-status-red px-1">
                <Text className="text-[10px] font-semibold text-white">{unreadCount > 9 ? "9+" : unreadCount}</Text>
              </View>
            )}
          </Pressable>
        )}
        <RoleBadge role={role} />
      </View>
    </View>
  );
}
