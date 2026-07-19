import { View, Text, ScrollView, RefreshControl, Pressable, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { trpc } from "../lib/trpc";
import { getNotificationRoute } from "../lib/notification-navigation";
import { EmptyState } from "./ui/empty-state";
import { ListLoading } from "./ui/list-loading";
import { PressableScale } from "./ui/pressable-scale";
import { shadowCard } from "../lib/shadows";

// notifications_inbox mockup: each type gets a colored circular icon —
// amber for visitor events, violet for bookings, brown for maintenance,
// red for dues-like alerts, gray for community notices.
const TYPE_STYLE: Record<string, { icon: React.ComponentProps<typeof MaterialIcons>["name"]; bg: string; fg: string }> = {
  visitor_request: { icon: "directions-walk", bg: "#F6A83C", fg: "#3D2E00" },
  visitor_decision: { icon: "verified-user", bg: "#F6A83C", fg: "#3D2E00" },
  // Guard-facing: emergency alerts (threat/fire) and "wants to reach security" messages.
  alert: { icon: "warning", bg: "#5A1A1A", fg: "#FF5F5F" },
  message: { icon: "forum", bg: "#1E2A44", fg: "#5B8DEF" },
  notice: { icon: "campaign", bg: "#333333", fg: "#C4C4C4" },
  poll: { icon: "poll", bg: "#2A2320", fg: "#FF9A3D" },
  complaint_status: { icon: "handyman", bg: "#9A6A00", fg: "#FFFFFF" },
  complaint_comment: { icon: "chat-bubble", bg: "#9A6A00", fg: "#FFFFFF" },
  booking_confirmed: { icon: "event-available", bg: "#FF9A3D", fg: "#FFFFFF" },
};

const DEFAULT_STYLE = { icon: "notifications" as const, bg: "#333333", fg: "#C4C4C4" };

function timeLabel(iso: string | null) {
  if (!iso) return "";
  const date = new Date(iso);
  const now = new Date();
  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  }
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
  if (now.getTime() - date.getTime() < 7 * 86_400_000) {
    return `${date.toLocaleDateString([], { weekday: "short" })}, ${date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`;
  }
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

function groupOf(iso: string | null) {
  if (!iso) return "Earlier";
  const date = new Date(iso);
  const now = new Date();
  if (date.toDateString() === now.toDateString()) return "Today";
  if (now.getTime() - date.getTime() < 7 * 86_400_000) return "Earlier this week";
  return "Earlier";
}

export function NotificationInboxScreen({ role }: { role: "resident" | "guard" | "admin" }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const utils = trpc.useUtils();

  const notificationsQuery = trpc.notifications.list.useQuery();
  const markReadMutation = trpc.notifications.markRead.useMutation({
    onSuccess: () => utils.notifications.list.invalidate(),
  });
  const markAllReadMutation = trpc.notifications.markAllRead.useMutation({
    onSuccess: () => utils.notifications.list.invalidate(),
  });

  const notifications = notificationsQuery.data ?? [];
  const hasUnread = notifications.some((n) => !n.readAt);

  const groups: { label: string; items: typeof notifications }[] = [];
  for (const notification of notifications) {
    const label = groupOf(notification.createdAt);
    const group = groups.find((g) => g.label === label);
    if (group) group.items.push(notification);
    else groups.push({ label, items: [notification] });
  }

  function handlePress(notification: (typeof notifications)[number]) {
    if (!notification.readAt) markReadMutation.mutate({ notificationId: notification.id });
    router.push(getNotificationRoute(notification.type, role, notification.data) as never);
  }

  return (
    <View className="flex-1" style={{ backgroundColor: "#0D0D0D" }}>
      <View className="flex-row items-center gap-3 px-5 pb-3" style={{ paddingTop: insets.top + 10 }}>
        <Pressable onPress={() => router.back()} hitSlop={8} accessibilityLabel="Back" accessibilityRole="button">
          <MaterialIcons name="arrow-back" size={24} color="#F5F5F5" />
        </Pressable>
        <Text className="text-headline-lg font-extrabold text-on-surface">Notifications</Text>
      </View>
      <ScrollView
        contentContainerClassName="gap-4 px-5 pb-8 pt-2"
        refreshControl={
          <RefreshControl refreshing={notificationsQuery.isRefetching} onRefresh={() => notificationsQuery.refetch()} />
        }
      >
        {hasUnread && (
          <Pressable
            onPress={() => markAllReadMutation.mutate(undefined)}
            disabled={markAllReadMutation.isPending}
            className="flex-row items-center gap-1.5 self-end rounded-full px-4 py-2"
            style={{ backgroundColor: "#2A2320" }}
            accessibilityLabel="Mark all as read"
            accessibilityRole="button"
          >
            {markAllReadMutation.isPending ? (
              <ActivityIndicator size="small" color="#FF9A3D" />
            ) : (
              <MaterialIcons name="done-all" size={16} color="#FF9A3D" />
            )}
            <Text className="text-body-sm font-bold" style={{ color: "#FF9A3D" }}>
              Mark all as read
            </Text>
          </Pressable>
        )}

        {notificationsQuery.isLoading ? (
          <ListLoading />
        ) : notificationsQuery.isError ? (
          <View className="rounded-xl bg-surface">
            <EmptyState title="Couldn't load notifications" description="Pull down to refresh and try again." icon="error-outline" />
          </View>
        ) : notifications.length === 0 ? (
          <View className="rounded-xl bg-surface">
            <EmptyState title="No notifications yet" description="Updates and alerts will show up here." icon="notifications-none" />
          </View>
        ) : (
          groups.map((group) => (
            <View key={group.label} className="gap-3">
              <Text className="pt-1 text-body-md font-bold text-text-muted">{group.label}</Text>
              {group.items.map((notification) => {
                const style = TYPE_STYLE[notification.type] ?? DEFAULT_STYLE;
                const unread = !notification.readAt;
                return (
                  <PressableScale key={notification.id} scaleTo={0.98} onPress={() => handlePress(notification)}>
                    <View
                      className="flex-row items-start gap-4 rounded-xl p-4"
                      style={[shadowCard, { backgroundColor: unread ? "#242424" : "#1A1A1A" }]}
                    >
                      <View
                        className="items-center justify-center"
                        style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: style.bg }}
                      >
                        <MaterialIcons name={style.icon} size={24} color={style.fg} />
                      </View>
                      <View className="min-w-0 flex-1">
                        <View className="flex-row items-center justify-between gap-2">
                          <Text
                            className={`flex-1 text-body-lg ${unread ? "font-extrabold text-on-surface" : "font-bold text-on-surface-variant"}`}
                            numberOfLines={1}
                          >
                            {notification.title}
                          </Text>
                          <Text className="text-body-sm text-text-muted">{timeLabel(notification.createdAt)}</Text>
                        </View>
                        {notification.body && (
                          <Text className="text-body-md text-on-surface-variant" numberOfLines={2}>
                            {notification.body}
                          </Text>
                        )}
                      </View>
                      {unread && (
                        <View
                          style={{
                            position: "absolute",
                            top: 10,
                            right: 10,
                            width: 8,
                            height: 8,
                            borderRadius: 4,
                            backgroundColor: "#F5821F",
                          }}
                        />
                      )}
                    </View>
                  </PressableScale>
                );
              })}
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}
