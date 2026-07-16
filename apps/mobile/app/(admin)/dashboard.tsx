import { View, Text, ScrollView, RefreshControl } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { trpc } from "../../lib/trpc";
import { useAuthStore } from "../../stores/auth-store";
import { ScreenHeader } from "../../components/ui/screen-header";
import { StatusDot } from "../../components/ui/status-dot";
import { EmptyState } from "../../components/ui/empty-state";
import { VISITOR_STATUS_TONE, VISITOR_STATUS_LABEL, VISITOR_TYPE_LABEL } from "../../lib/visitor-status";
import { ListLoading } from "../../components/ui/list-loading";
import { PulsingDot } from "../../components/ui/pulsing-dot";
import { shadowCard } from "../../lib/shadows";

export default function AdminDashboard() {
  const user = useAuthStore((s) => s.user);
  const metricsQuery = trpc.admin.metrics.useQuery();
  const feedQuery = trpc.visitors.history.useQuery({}, { refetchInterval: 5000 });

  const metrics = metricsQuery.data;
  const feed = (feedQuery.data ?? []).slice(0, 8);
  const occupancyPct = metrics && metrics.totalFlats > 0 ? Math.round((metrics.occupiedFlats / metrics.totalFlats) * 100) : null;

  const STATS: {
    label: string;
    value: string;
    icon: React.ComponentProps<typeof MaterialIcons>["name"];
    tint: string;
    iconColor: string;
    dot?: "green" | "amber";
  }[] = [
    { label: "OCCUPIED FLATS", value: occupancyPct !== null ? `${occupancyPct}%` : "—", icon: "home", tint: "bg-surface-container", iconColor: "#6244CD", dot: "green" },
    { label: "VISITORS TODAY", value: metrics ? `${metrics.todayVisitorCount}` : "—", icon: "groups", tint: "bg-secondary-container/30", iconColor: "#845400", dot: "amber" },
    { label: "OPEN COMPLAINTS", value: metrics ? `${metrics.openComplaints}` : "—", icon: "report-problem", tint: "bg-status-red/15", iconColor: "#BA1A1A", dot: metrics && metrics.openComplaints > 0 ? "amber" : undefined },
    { label: "DUES PENDING", value: metrics ? `${metrics.pendingDues}` : "—", icon: "payments", tint: "bg-secondary-container/30", iconColor: "#845400" },
  ];

  return (
    <View className="flex-1 bg-background">
      <ScreenHeader title="Dashboard" role="admin" />
      <ScrollView
        contentContainerClassName="gap-6 p-4 pb-8"
        refreshControl={
          <RefreshControl
            refreshing={metricsQuery.isRefetching || feedQuery.isRefetching}
            onRefresh={() => {
              metricsQuery.refetch();
              feedQuery.refetch();
            }}
          />
        }
      >
        {user && (
          <View className="gap-1">
            <Text className="text-headline-md font-extrabold text-on-surface">Hello, {user.fullName.split(" ")[0]}! 👋</Text>
            <Text className="text-body-sm text-text-muted">Here is the current status of your community.</Text>
          </View>
        )}

        <View className="gap-3">
          {[STATS.slice(0, 2), STATS.slice(2, 4)].map((row, rowIndex) => (
            <View key={rowIndex} className="flex-row gap-3">
              {row.map((stat) => (
                <View key={stat.label} className="flex-1 gap-3 rounded-card bg-surface p-4" style={shadowCard}>
                  <View className="flex-row items-start justify-between">
                    <View className={`h-10 w-10 items-center justify-center rounded-full ${stat.tint}`}>
                      <MaterialIcons name={stat.icon} size={20} color={stat.iconColor} />
                    </View>
                    {stat.dot === "amber" && <PulsingDot />}
                    {stat.dot === "green" && <View className="h-2 w-2 rounded-full bg-status-green" />}
                  </View>
                  <View>
                    <Text className="text-headline-lg font-extrabold text-on-surface">{stat.value}</Text>
                    <Text className="text-label-sm uppercase tracking-wide text-text-muted">{stat.label}</Text>
                  </View>
                </View>
              ))}
            </View>
          ))}
        </View>

        <View className="gap-3">
          <Text className="text-headline-md font-extrabold text-on-surface">Live Activity</Text>
          <View className="rounded-card bg-surface" style={shadowCard}>
            {feedQuery.isLoading ? (
              <ListLoading />
            ) : feedQuery.isError ? (
              <EmptyState title="Couldn't load activity" description="Pull down to refresh and try again." icon="error-outline" />
            ) : feed.length === 0 ? (
              <EmptyState title="No gate activity yet" description="Visitor activity across the society will appear here." icon="local-shipping" />
            ) : (
              feed.map((visitor, index) => (
                <View
                  key={visitor.id}
                  className={`flex-row items-center justify-between gap-3 p-4 ${index > 0 ? "border-t border-outline-variant" : ""}`}
                >
                  <View className="min-w-0 flex-1">
                    <Text className="text-body-sm font-bold text-on-surface" numberOfLines={1}>
                      {visitor.name}
                      {visitor.flatNumber ? ` · ${visitor.flatNumber}` : ""}
                    </Text>
                    <Text className="text-label-sm text-text-muted">{VISITOR_TYPE_LABEL[visitor.type]}</Text>
                  </View>
                  <StatusDot label={VISITOR_STATUS_LABEL[visitor.status]} tone={VISITOR_STATUS_TONE[visitor.status]} />
                </View>
              ))
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
