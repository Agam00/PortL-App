import { View, Text, ScrollView, Pressable, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { trpc } from "../lib/trpc";
import { getNotificationRoute } from "../lib/notification-navigation";
import { ScreenHeader } from "./ui/screen-header";
import { EmptyState } from "./ui/empty-state";
import { Button } from "./ui/button";

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
      <ScrollView contentContainerClassName="gap-4 p-4 pb-8">
        {hasUnread && (
          <Button variant="outline" onPress={() => markAllReadMutation.mutate(undefined)} loading={markAllReadMutation.isPending}>
            Mark all as read
          </Button>
        )}

        {notificationsQuery.isLoading ? (
          <ActivityIndicator className="py-8" color="#5e6ad2" />
        ) : notifications.length === 0 ? (
          <View className="rounded-lg border border-border-subtle bg-surface-elevated">
            <EmptyState title="No notifications yet" description="Updates and alerts will show up here." icon="notifications-none" />
          </View>
        ) : (
          <View className="gap-2">
            {notifications.map((notification) => (
              <Pressable
                key={notification.id}
                onPress={() => handlePress(notification)}
                className={`flex-row items-start gap-3 rounded-lg border p-4 ${
                  notification.readAt ? "border-border-subtle bg-surface" : "border-border-subtle bg-surface-elevated"
                }`}
              >
                <View className="h-9 w-9 items-center justify-center rounded-full border border-border-subtle bg-surface-container-high">
                  <MaterialIcons name={TYPE_ICON[notification.type] ?? "notifications"} size={18} color="#c6c5d5" />
                </View>
                <View className="min-w-0 flex-1">
                  <View className="flex-row items-start justify-between gap-2">
                    <Text
                      className={`flex-1 text-body-md ${notification.readAt ? "text-on-surface-variant" : "font-semibold text-on-surface"}`}
                    >
                      {notification.title}
                    </Text>
                    {!notification.readAt && <View className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary-container" />}
                  </View>
                  {notification.body && (
                    <Text className="text-body-sm text-text-muted" numberOfLines={2}>
                      {notification.body}
                    </Text>
                  )}
                  <Text className="text-meta-text text-text-muted">{timeAgo(notification.createdAt)}</Text>
                </View>
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
