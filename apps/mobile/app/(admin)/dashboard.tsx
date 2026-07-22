import { View, Text, ScrollView, RefreshControl, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { trpc } from "../../lib/trpc";
import { useAuthStore } from "../../stores/auth-store";
import { AdminHeader } from "../../components/ui/admin-header";
import { EmptyState } from "../../components/ui/empty-state";
import { ListLoading } from "../../components/ui/list-loading";
import { VISITOR_TYPE_LABEL } from "../../lib/visitor-status";
import type { VisitorOutput } from "@repo/services/visitor/model";

function timeAgo(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return new Date(iso).toLocaleDateString([], { month: "short", day: "numeric" });
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

const STATUS_PHRASE: Record<VisitorOutput["status"], string> = {
  pending: "Waiting at gate",
  approved: "Visitor approved",
  rejected: "Visitor rejected",
  expired: "Pass expired",
  checked_in: "Visitor entered",
  checked_out: "Visitor exited",
  cancelled: "Visit cancelled",
};

// Pill kind → { border, text } — matches the Stitch SUCCESS / WARNING / INFO chips,
// mapped onto the app's semantic status colours.
const PILL: Record<"success" | "warning" | "info" | "error", { label: string; color: string }> = {
  success: { label: "SUCCESS", color: "#27C96D" },
  warning: { label: "WARNING", color: "#F5821F" },
  info: { label: "INFO", color: "#8A8A8A" },
  error: { label: "ERROR", color: "#FF5F5F" },
};

const STATUS_PILL: Record<VisitorOutput["status"], keyof typeof PILL> = {
  pending: "warning",
  approved: "success",
  checked_in: "success",
  checked_out: "info",
  rejected: "error",
  expired: "info",
  cancelled: "info",
};

const TYPE_ICON: Record<VisitorOutput["type"], React.ComponentProps<typeof MaterialIcons>["name"]> = {
  guest: "how-to-reg",
  delivery: "local-shipping",
  cab: "directions-car",
  service: "engineering",
  other: "person",
};

export default function AdminDashboard() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const firstName = user?.fullName.trim().split(/\s+/)[0] ?? "Admin";
  const metricsQuery = trpc.admin.metrics.useQuery();
  const residentsQuery = trpc.admin.listResidents.useQuery();
  const guardsQuery = trpc.admin.listGuards.useQuery();
  const feedQuery = trpc.visitors.history.useQuery({}, { refetchInterval: 5000 });

  const metrics = metricsQuery.data;
  const residentCount = residentsQuery.data?.length ?? null;
  const guardsOnDuty = guardsQuery.data ? guardsQuery.data.filter((g) => g.isActive).length : null;
  const feed = (feedQuery.data ?? []).slice(0, 6);

  const fmt = (n: number | null | undefined) => (n === null || n === undefined ? "—" : `${n}`);

  const METRICS: {
    label: string;
    value: string;
    icon: React.ComponentProps<typeof MaterialIcons>["name"];
  }[] = [
    { label: "Residents", value: fmt(residentCount), icon: "groups" },
    { label: "Guards on duty", value: fmt(guardsOnDuty), icon: "security" },
    { label: "Visitors today", value: fmt(metrics?.todayVisitorCount), icon: "transfer-within-a-station" },
    { label: "Open complaints", value: fmt(metrics?.openComplaints), icon: "report-problem" },
  ];

  const QUICK_ACTIONS: {
    label: string;
    icon: React.ComponentProps<typeof MaterialIcons>["name"];
    onPress: () => void;
  }[] = [
    { label: "Add Resident", icon: "person-add", onPress: () => router.push("/(admin)/residents") },
    { label: "Post Notice", icon: "campaign", onPress: () => router.push("/(admin)/notices") },
    { label: "New Poll", icon: "poll", onPress: () => router.push("/(admin)/polls") },
    { label: "Gate Log", icon: "history", onPress: () => router.push("/(admin)/notifications") },
  ];

  return (
    <View className="flex-1 bg-background">
      <AdminHeader
        eyebrow={`${greeting()},`}
        bigTitle={firstName}
        avatar
        onAvatarPress={() => router.push("/(admin)/profile")}
      />
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 32, gap: 32 }}
        refreshControl={
          <RefreshControl
            refreshing={metricsQuery.isRefetching || feedQuery.isRefetching}
            onRefresh={() => {
              metricsQuery.refetch();
              residentsQuery.refetch();
              guardsQuery.refetch();
              feedQuery.refetch();
            }}
          />
        }
      >
        {/* Metric cards — 2×2 grid */}
        <View style={{ gap: 16 }}>
          {[METRICS.slice(0, 2), METRICS.slice(2, 4)].map((row, rowIndex) => (
            <View key={rowIndex} className="flex-row" style={{ gap: 16 }}>
              {row.map((m) => (
                <View
                  key={m.label}
                  className="flex-1 justify-between"
                  style={{
                    height: 128,
                    backgroundColor: "#1A1A1A",
                    borderRadius: 20,
                    borderWidth: 1,
                    borderColor: "#333333",
                    padding: 20,
                  }}
                >
                  <View className="flex-row items-start justify-between">
                    <Text className="text-body-sm text-text-muted">{m.label}</Text>
                    <MaterialIcons name={m.icon} size={20} color="#8A8A8A" />
                  </View>
                  <Text
                    className="font-extrabold text-primary"
                    style={{ fontSize: 36, lineHeight: 38 }}
                  >
                    {m.value}
                  </Text>
                </View>
              ))}
            </View>
          ))}
        </View>

        {/* Quick actions */}
        <View style={{ gap: 12 }}>
          <Text className="text-section-header font-bold text-on-surface">Quick actions</Text>
          <View className="flex-row items-start justify-between">
            {QUICK_ACTIONS.map((a) => (
              <Pressable
                key={a.label}
                onPress={a.onPress}
                className="items-center"
                style={{ gap: 8, width: 72 }}
                accessibilityLabel={a.label}
                accessibilityRole="button"
              >
                <View
                  className="items-center justify-center"
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 28,
                    backgroundColor: "#242424",
                    borderWidth: 1,
                    borderColor: "#333333",
                  }}
                >
                  <MaterialIcons name={a.icon} size={24} color="#F5821F" />
                </View>
                <Text className="text-center text-text-muted" style={{ fontSize: 11, lineHeight: 14 }}>
                  {a.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Today at a glance */}
        <View style={{ gap: 12 }}>
          <Text className="text-section-header font-bold text-on-surface">Today at a glance</Text>
          <View
            style={{
              backgroundColor: "#1A1A1A",
              borderRadius: 20,
              borderWidth: 1,
              borderColor: "#333333",
              overflow: "hidden",
            }}
          >
            {feedQuery.isLoading ? (
              <ListLoading />
            ) : feedQuery.isError ? (
              <EmptyState title="Couldn't load activity" description="Pull down to refresh and try again." icon="error-outline" />
            ) : feed.length === 0 ? (
              <EmptyState title="No gate activity yet" description="Visitor activity across the society will appear here." icon="local-shipping" />
            ) : (
              feed.map((visitor, index) => {
                const pill = PILL[STATUS_PILL[visitor.status]];
                return (
                  <View
                    key={visitor.id}
                    className="flex-row items-center"
                    style={{
                      padding: 20,
                      gap: 16,
                      borderTopWidth: index > 0 ? 1 : 0,
                      borderTopColor: "#333333",
                    }}
                  >
                    <View
                      className="items-center justify-center"
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 20,
                        backgroundColor: "#242424",
                        borderWidth: 1,
                        borderColor: "#333333",
                      }}
                    >
                      <MaterialIcons name={TYPE_ICON[visitor.type]} size={20} color="#F5821F" />
                    </View>
                    <View className="min-w-0 flex-1">
                      <Text className="text-body-main text-on-surface" numberOfLines={1}>
                        {STATUS_PHRASE[visitor.status]}
                      </Text>
                      <Text className="text-body-sm text-text-muted" numberOfLines={1}>
                        {visitor.flatNumber ? `Flat ${visitor.flatNumber} · ` : ""}
                        {VISITOR_TYPE_LABEL[visitor.type]} · {timeAgo(visitor.createdAt)}
                      </Text>
                    </View>
                    <View
                      className="items-center justify-center"
                      style={{
                        paddingHorizontal: 12,
                        paddingVertical: 4,
                        borderRadius: 999,
                        backgroundColor: "#242424",
                        borderWidth: 1,
                        borderColor: pill.color,
                      }}
                    >
                      <Text
                        className="font-semibold"
                        style={{ fontSize: 10, letterSpacing: 1, color: pill.color }}
                      >
                        {pill.label}
                      </Text>
                    </View>
                  </View>
                );
              })
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
