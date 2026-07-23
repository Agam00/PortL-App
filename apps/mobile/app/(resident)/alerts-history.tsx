import { View, Text, ScrollView, RefreshControl, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { trpc } from "../../lib/trpc";
import { EmptyState } from "../../components/ui/empty-state";
import { ListLoading } from "../../components/ui/list-loading";
import { shadowCard } from "../../lib/shadows";

function when(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  const today = new Date().toDateString() === d.toDateString();
  const time = d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  return today ? `Today, ${time}` : `${d.toLocaleDateString([], { day: "numeric", month: "short" })}, ${time}`;
}

export default function AlertsHistory() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const query = trpc.alerts.myHistory.useQuery();
  const items = query.data ?? [];

  return (
    <View className="flex-1" style={{ backgroundColor: "#0D0D0D" }}>
      <View className="flex-row items-center gap-3 px-5 pb-3" style={{ paddingTop: insets.top + 10 }}>
        <Pressable onPress={() => router.back()} hitSlop={8} accessibilityLabel="Back" accessibilityRole="button">
          <MaterialIcons name="arrow-back" size={24} color="#F5F5F5" />
        </Pressable>
        <Text className="text-headline-lg font-extrabold text-on-surface">Alert History</Text>
      </View>

      <ScrollView
        contentContainerClassName="gap-3 px-5 pb-8 pt-2"
        refreshControl={<RefreshControl refreshing={query.isRefetching} onRefresh={() => query.refetch()} />}
      >
        {query.isLoading ? (
          <ListLoading />
        ) : items.length === 0 ? (
          <View className="rounded-xl bg-surface">
            <EmptyState
              title="No alerts sent yet"
              description="Alerts and messages you send from the + menu are recorded here with the time."
              icon="notifications-active"
            />
          </View>
        ) : (
          items.map((n) => {
            const emergency = (n.data as { emergency?: boolean } | null)?.emergency ?? false;
            const target = (n.data as { target?: string } | null)?.target ?? "";
            return (
              <View key={n.id} className="flex-row items-center gap-3 rounded-2xl bg-surface p-4" style={shadowCard}>
                <View
                  className="items-center justify-center"
                  style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: emergency ? "#3A1A1A" : "#242424" }}
                >
                  <MaterialIcons name={emergency ? "warning" : "chat"} size={22} color={emergency ? "#FF5F5F" : "#F5821F"} />
                </View>
                <View className="min-w-0 flex-1">
                  <Text className="text-body-md font-extrabold text-on-surface" numberOfLines={1}>
                    {n.title}
                  </Text>
                  {target ? <Text className="text-body-sm text-text-muted">Sent to {target}</Text> : null}
                  <View className="mt-0.5 flex-row items-center gap-1">
                    <MaterialIcons name="schedule" size={12} color="#8A8A8A" />
                    <Text className="text-body-sm text-text-muted">{when(n.createdAt)}</Text>
                  </View>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}
