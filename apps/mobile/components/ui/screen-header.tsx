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
    <View className="flex-row items-center justify-between bg-background px-5 pb-4 pt-2">
      <Text className="flex-1 text-headline-md font-extrabold text-on-surface">{title}</Text>
      <View className="flex-row items-center gap-3">
        {notificationsRoute && !onInboxScreen && (
          <Pressable
            onPress={() => router.push(notificationsRoute as never)}
            hitSlop={8}
            className="relative h-10 w-10 items-center justify-center rounded-full bg-surface-container"
            accessibilityLabel={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : "Notifications"}
            accessibilityRole="button"
          >
            <MaterialIcons name="notifications-none" size={20} color="#48454F" />
            {unreadCount > 0 && (
              <View className="absolute -right-0.5 -top-0.5 h-4 min-w-4 items-center justify-center rounded-full bg-status-red-strong px-1">
                <Text className="text-label-sm font-bold text-white" style={{ fontSize: 10, lineHeight: 12 }}>
                  {unreadCount > 9 ? "9+" : unreadCount}
                </Text>
              </View>
            )}
          </Pressable>
        )}
        <RoleBadge role={role} />
      </View>
    </View>
  );
}
