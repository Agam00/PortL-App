import { View, Text, ScrollView, RefreshControl } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { trpc } from "../../lib/trpc";
import { ScreenHeader } from "../../components/ui/screen-header";
import { StatusDot } from "../../components/ui/status-dot";
import { EmptyState } from "../../components/ui/empty-state";
import { VISITOR_STATUS_TONE, VISITOR_STATUS_LABEL, VISITOR_TYPE_LABEL } from "../../lib/visitor-status";
import { ListLoading } from "../../components/ui/list-loading";

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
              <ListLoading />
            ) : feedQuery.isError ? (
              <EmptyState title="Couldn't load activity" description="Pull down to refresh and try again." icon="error-outline" />
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
                    <Text className="text-meta-text text-text-muted">{VISITOR_TYPE_LABEL[visitor.type]}</Text>
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
