import { View, Text, ScrollView, RefreshControl } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { trpc } from "../../lib/trpc";
import { useAuthStore } from "../../stores/auth-store";
import { ScreenHeader } from "../../components/ui/screen-header";
import { EmptyState } from "../../components/ui/empty-state";
import { VISITOR_TYPE_LABEL } from "../../lib/visitor-status";
import type { VisitorOutput } from "@repo/services/visitor/model";
import { ListLoading } from "../../components/ui/list-loading";
import { shadowCard } from "../../lib/shadows";

function timeAgo(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hr ago`;
  return new Date(iso).toLocaleDateString([], { month: "short", day: "numeric" });
}

const STATUS_PHRASE: Record<VisitorOutput["status"], string> = {
  pending: "Waiting at Gate",
  approved: "Approved",
  rejected: "Rejected",
  expired: "Pass Expired",
  checked_in: "Entered",
  checked_out: "Exited",
  cancelled: "Cancelled",
};

const TYPE_ICON: Record<VisitorOutput["type"], React.ComponentProps<typeof MaterialIcons>["name"]> = {
  guest: "door-front",
  delivery: "local-shipping",
  cab: "directions-car",
  service: "build",
  other: "person",
};

const TYPE_ICON_COLOR: Record<VisitorOutput["type"], string> = {
  guest: "#F5821F",
  delivery: "#FEB246",
  cab: "#AA6700",
  service: "#FEB246",
  other: "#F5821F",
};

export default function AdminDashboard() {
  const user = useAuthStore((s) => s.user);
  const metricsQuery = trpc.admin.metrics.useQuery();
  const feedQuery = trpc.visitors.history.useQuery({}, { refetchInterval: 5000 });

  const metrics = metricsQuery.data;
  const feed = (feedQuery.data ?? []).slice(0, 8);
  const occupancyPct = metrics && metrics.totalFlats > 0 ? Math.round((metrics.occupiedFlats / metrics.totalFlats) * 100) : null;

  // dashboard mockup: 2×2 glass cards, tinted icon circle top-left, glowing status dot top-right.
  const STATS: {
    label: string;
    value: string;
    icon: React.ComponentProps<typeof MaterialIcons>["name"];
    tint: string;
    iconColor: string;
    dotColor: string;
  }[] = [
    { label: "OCCUPIED FLATS", value: occupancyPct !== null ? `${occupancyPct}%` : "—", icon: "home", tint: "rgba(245,130,31,0.10)", iconColor: "#F5821F", dotColor: "#22c55e" },
    { label: "VISITORS TODAY", value: metrics ? `${metrics.todayVisitorCount}` : "—", icon: "groups", tint: "rgba(254,178,70,0.20)", iconColor: "#E19613", dotColor: "#FEB246" },
    { label: "OPEN COMPLAINTS", value: metrics ? `${metrics.openComplaints}` : "—", icon: "warning-amber", tint: "rgba(186,26,26,0.10)", iconColor: "#BA1A1A", dotColor: "#BA1A1A" },
    { label: "DUES PENDING", value: metrics ? `${metrics.pendingDues}` : "—", icon: "payments", tint: "rgba(170,103,0,0.15)", iconColor: "#AA6700", dotColor: "#AA6700" },
  ];

  return (
    <View className="flex-1 bg-background">
      <ScreenHeader
        title={`Hello, ${user?.fullName.split(" ")[0] ?? "Admin"}! 👋`}
        subtitle="Here is the current status of your community."
        role="admin"
      />
      <ScrollView
        contentContainerClassName="gap-6 px-4 pb-8 pt-2"
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
        <View className="gap-4">
          {[STATS.slice(0, 2), STATS.slice(2, 4)].map((row, rowIndex) => (
            <View key={rowIndex} className="flex-row gap-4">
              {row.map((stat) => (
                <View key={stat.label} className="flex-1 gap-4 rounded-card bg-surface p-4" style={shadowCard}>
                  <View className="flex-row items-start justify-between">
                    <View
                      className="h-11 w-11 items-center justify-center rounded-full"
                      style={{ backgroundColor: stat.tint }}
                    >
                      <MaterialIcons name={stat.icon} size={22} color={stat.iconColor} />
                    </View>
                    <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: stat.dotColor }} />
                  </View>
                  <View>
                    <Text className="text-headline-lg font-extrabold text-on-surface">{stat.value}</Text>
                    <Text className="text-label-caps uppercase text-text-muted">{stat.label}</Text>
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
                  className={`flex-row items-center gap-4 p-4 ${index > 0 ? "border-t border-outline-variant" : ""}`}
                >
                  <View className="h-12 w-12 items-center justify-center rounded-full bg-surface-container-high">
                    <MaterialIcons name={TYPE_ICON[visitor.type]} size={22} color={TYPE_ICON_COLOR[visitor.type]} />
                  </View>
                  <View className="min-w-0 flex-1">
                    <Text className="text-body-md font-bold text-on-surface" numberOfLines={2}>
                      {VISITOR_TYPE_LABEL[visitor.type]} {STATUS_PHRASE[visitor.status]}
                    </Text>
                    <Text className="text-body-sm text-on-surface-variant" numberOfLines={1}>
                      {visitor.flatNumber ? `Flat ${visitor.flatNumber} - ` : ""}
                      {visitor.name}
                    </Text>
                  </View>
                  <Text className="text-meta-text text-text-muted">{timeAgo(visitor.createdAt)}</Text>
                </View>
              ))
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
