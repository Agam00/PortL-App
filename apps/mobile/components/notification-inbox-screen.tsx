import { View, Text, ScrollView, RefreshControl } from "react-native";
import { useRouter } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { trpc } from "../lib/trpc";
import { getNotificationRoute } from "../lib/notification-navigation";
import { ScreenHeader } from "./ui/screen-header";
import { EmptyState } from "./ui/empty-state";
import { Button } from "./ui/button";
import { ListLoading } from "./ui/list-loading";
import { PressableScale } from "./ui/pressable-scale";
import { shadowCard } from "../lib/shadows";

const TYPE_ICON: Record<string, React.ComponentProps<typeof MaterialIcons>["name"]> = {
  visitor_request: "person",
  visitor_decision: "verified-user",
  notice: "campaign",
  poll: "poll",
  complaint_status: "report-problem",
  complaint_comment: "chat-bubble",
  booking_confirmed: "event-available",
};

function timeAgo(iso: string | null) {
  if (!iso) return "";
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return new Date(iso).toLocaleDateString([], { month: "short", day: "numeric" });
}

export function NotificationInboxScreen({ role }: { role: "resident" | "guard" | "admin" }) {
  const router = useRouter();
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

  function handlePress(notification: (typeof notifications)[number]) {
    if (!notification.readAt) markReadMutation.mutate({ notificationId: notification.id });
    router.push(getNotificationRoute(notification.type, role) as never);
  }

  return (
    <View className="flex-1 bg-background">
      <ScreenHeader title="Notifications" role={role} />
      <ScrollView
        contentContainerClassName="gap-4 p-4 pb-8"
        refreshControl={
          <RefreshControl refreshing={notificationsQuery.isRefetching} onRefresh={() => notificationsQuery.refetch()} />
        }
      >
        {hasUnread && (
          <Button variant="outline" onPress={() => markAllReadMutation.mutate(undefined)} loading={markAllReadMutation.isPending}>
            Mark all as read
          </Button>
        )}

        {notificationsQuery.isLoading ? (
          <ListLoading />
        ) : notificationsQuery.isError ? (
          <View className="rounded-card bg-surface">
            <EmptyState title="Couldn't load notifications" description="Pull down to refresh and try again." icon="error-outline" />
          </View>
        ) : notifications.length === 0 ? (
          <View className="rounded-card bg-surface">
            <EmptyState title="No notifications yet" description="Updates and alerts will show up here." icon="notifications-none" />
          </View>
        ) : (
          <View className="gap-2">
            {notifications.map((notification) => (
              <PressableScale key={notification.id} scaleTo={0.98} onPress={() => handlePress(notification)}>
                <View
                  className="flex-row items-start gap-3 rounded-card p-4"
                  style={[shadowCard, { backgroundColor: notification.readAt ? "#FFFFFF" : "#F1ECF8" }]}
                >
                  <View className="h-10 w-10 items-center justify-center rounded-full bg-surface-container-high">
                    <MaterialIcons name={TYPE_ICON[notification.type] ?? "notifications"} size={18} color="#6244CD" />
                  </View>
                  <View className="min-w-0 flex-1">
                    <View className="flex-row items-start justify-between gap-2">
                      <Text
                        className={`flex-1 text-body-md ${notification.readAt ? "text-on-surface-variant" : "font-bold text-on-surface"}`}
                      >
                        {notification.title}
                      </Text>
                      {!notification.readAt && <View className="mt-1.5 h-2 w-2 rounded-full bg-primary-container" />}
                    </View>
                    {notification.body && (
                      <Text className="text-body-sm text-text-muted" numberOfLines={2}>
                        {notification.body}
                      </Text>
                    )}
                    <Text className="mt-1 text-label-sm text-text-muted">{timeAgo(notification.createdAt)}</Text>
                  </View>
                </View>
              </PressableScale>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
