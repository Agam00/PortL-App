import { View, Text, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { trpc } from "../lib/trpc";

/** Bell + live unread badge for the guard's custom dark header. Opens the inbox. */
export function GuardNotificationBell({ color = "#F5F5F5" }: { color?: string }) {
  const router = useRouter();
  const query = trpc.notifications.list.useQuery(undefined, { refetchInterval: 15_000 });
  const unread = (query.data ?? []).filter((n) => !n.readAt).length;

  return (
    <Pressable
      onPress={() => router.push("/(guard)/notifications")}
      hitSlop={16}
      className="items-center justify-center rounded-full"
      style={{ width: 44, height: 44, backgroundColor: "rgba(255,255,255,0.06)" }}
      accessibilityRole="button"
      accessibilityLabel={unread > 0 ? `Notifications, ${unread} unread` : "Notifications"}
    >
      <MaterialIcons name="notifications-none" size={26} color={color} />
      {unread > 0 && (
        <View
          className="absolute items-center justify-center rounded-full"
          style={{ top: 4, right: 4, minWidth: 18, height: 18, paddingHorizontal: 4, backgroundColor: "#E5484D" }}
          pointerEvents="none"
        >
          <Text className="text-white" style={{ fontSize: 10, fontWeight: "800" }}>
            {unread > 9 ? "9+" : unread}
          </Text>
        </View>
      )}
    </Pressable>
  );
}
