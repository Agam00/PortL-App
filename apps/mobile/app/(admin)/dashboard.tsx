import { View, Text, ScrollView, ActivityIndicator } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { trpc } from "../../lib/trpc";
import { ScreenHeader } from "../../components/ui/screen-header";
import { StatusDot } from "../../components/ui/status-dot";
import { EmptyState } from "../../components/ui/empty-state";

const STATUS_TONE: Record<string, "green" | "amber" | "red" | "neutral"> = {
  pending: "amber",
  approved: "green",
  checked_in: "green",
  checked_out: "neutral",
  rejected: "red",
  expired: "neutral",
};

export default function AdminDashboard() {
  const metricsQuery = trpc.admin.metrics.useQuery();
  const feedQuery = trpc.visitors.history.useQuery({}, { refetchInterval: 5000 });

  const metrics = metricsQuery.data;
  const feed = (feedQuery.data ?? []).slice(0, 8);

  const STATS: {
    label: string;
    value: string;
    icon: React.ComponentProps<typeof MaterialIcons>["name"];
    dot?: "green" | "amber";
  }[] = [
    { label: "OCCUPIED FLATS", value: metrics ? `${metrics.occupiedFlats}/${metrics.totalFlats}` : "—", icon: "group" },
    { label: "VISITORS TODAY", value: metrics ? `${metrics.todayVisitorCount}` : "—", icon: "badge", dot: "green" },
    { label: "OPEN COMPLAINTS", value: metrics ? `${metrics.openComplaints}` : "—", icon: "report-problem", dot: metrics && metrics.openComplaints > 0 ? "amber" : undefined },
    { label: "DUES PENDING", value: metrics ? `${metrics.pendingDues}` : "—", icon: "payments" },
  ];

  return (
    <View className="flex-1 bg-background">
      <ScreenHeader title="Dashboard" role="admin" />
      <ScrollView contentContainerClassName="gap-6 p-4 pb-8">
        <View className="gap-3">
          {[STATS.slice(0, 2), STATS.slice(2, 4)].map((row, rowIndex) => (
            <View key={rowIndex} className="flex-row gap-3">
              {row.map((stat) => (
                <View
                  key={stat.label}
                  className="flex-1 justify-between gap-4 rounded-lg border border-border-subtle bg-surface-elevated p-4"
                >
                  <View className="flex-row items-start justify-between">
                    <Text className="flex-1 text-meta-text uppercase tracking-wider text-text-muted">
                      {stat.label}
                    </Text>
                    <MaterialIcons name={stat.icon} size={18} color="#8A8F98" />
                  </View>
                  <View className="flex-row items-center gap-2">
                    <Text className="text-headline-lg font-medium text-on-surface">{stat.value}</Text>
                    {stat.dot && (
                      <View
                        className={`h-1.5 w-1.5 rounded-full ${stat.dot === "green" ? "bg-status-green" : "bg-status-amber"}`}
                      />
                    )}
                  </View>
                </View>
              ))}
            </View>
          ))}
        </View>

        <View className="gap-3">
          <Text className="text-headline-md font-semibold text-on-surface">Live Activity</Text>
          <View className="rounded-lg border border-border-subtle bg-surface-elevated">
            {feedQuery.isLoading ? (
              <ActivityIndicator className="py-8" color="#5e6ad2" />
            ) : feed.length === 0 ? (
              <EmptyState title="No gate activity yet" description="Visitor activity across the society will appear here." icon="local-shipping" />
            ) : (
              feed.map((visitor, index) => (
                <View
                  key={visitor.id}
                  className={`flex-row items-center justify-between gap-3 p-4 ${index > 0 ? "border-t border-border-subtle" : ""}`}
                >
                  <View className="min-w-0 flex-1">
                    <Text className="text-body-sm font-medium text-on-surface" numberOfLines={1}>
                      {visitor.name}
                      {visitor.flatNumber ? ` · ${visitor.flatNumber}` : ""}
                    </Text>
                    <Text className="text-meta-text text-text-muted">{visitor.type}</Text>
                  </View>
                  <StatusDot label={visitor.status.replace("_", " ")} tone={STATUS_TONE[visitor.status] ?? "neutral"} />
                </View>
              ))
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
