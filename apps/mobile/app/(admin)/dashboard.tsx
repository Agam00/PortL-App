import { useState } from "react";
import { View, Text, ScrollView, RefreshControl, Pressable, Modal } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { trpc } from "../../lib/trpc";
import { useAuthStore } from "../../stores/auth-store";
import { AdminHeader } from "../../components/ui/admin-header";
import { EmptyState } from "../../components/ui/empty-state";
import { ListLoading } from "../../components/ui/list-loading";
import { VISITOR_TYPE_LABEL } from "../../lib/visitor-status";
import { shadowElevated } from "../../lib/shadows";
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
  const [detail, setDetail] = useState<VisitorOutput | null>(null);
  const firstName = user?.fullName.trim().split(/\s+/)[0] ?? "Admin";
  const metricsQuery = trpc.admin.metrics.useQuery();
  const residentsQuery = trpc.admin.listResidents.useQuery();
  const dutyQuery = trpc.duty.guards.useQuery(undefined, { refetchInterval: 15_000 });
  const feedQuery = trpc.visitors.history.useQuery({}, { refetchInterval: 5000 });

  const metrics = metricsQuery.data;
  const residentCount = residentsQuery.data?.length ?? null;
  const onDutyGuards = (dutyQuery.data ?? []).filter((g) => g.onDuty);
  const guardsOnDuty = dutyQuery.data ? onDutyGuards.length : null;
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
          <RefreshControl tintColor="#F5821F" colors={["#F5821F"]} progressBackgroundColor="#1A1A1A"
            refreshing={metricsQuery.isRefetching || feedQuery.isRefetching}
            onRefresh={() => {
              metricsQuery.refetch();
              residentsQuery.refetch();
              dutyQuery.refetch();
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

        {/* Guards on duty now */}
        <View style={{ gap: 12 }}>
          <Text className="text-section-header font-bold text-on-surface">Guards on duty</Text>
          <View
            style={{
              backgroundColor: "#1A1A1A",
              borderRadius: 20,
              borderWidth: 1,
              borderColor: "#333333",
              overflow: "hidden",
            }}
          >
            {dutyQuery.isLoading ? (
              <ListLoading />
            ) : onDutyGuards.length === 0 ? (
              <EmptyState
                title="No guards on duty"
                description="Guards appear here when they go on duty from their app."
                icon="security"
              />
            ) : (
              onDutyGuards.map((guard, index) => (
                <View
                  key={guard.id}
                  className="flex-row items-center"
                  style={{ padding: 20, gap: 16, borderTopWidth: index > 0 ? 1 : 0, borderTopColor: "#333333" }}
                >
                  <View
                    className="items-center justify-center"
                    style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: "#242424", borderWidth: 1, borderColor: "#333333" }}
                  >
                    <MaterialIcons name="security" size={20} color="#F5821F" />
                  </View>
                  <View className="min-w-0 flex-1">
                    <Text className="text-body-main text-on-surface" numberOfLines={1}>
                      {guard.name}
                    </Text>
                    <Text className="text-body-sm text-text-muted" numberOfLines={1}>
                      {guard.dutyChangedAt ? `On duty since ${timeAgo(guard.dutyChangedAt)}` : "On duty"}
                    </Text>
                  </View>
                  <View className="flex-row items-center gap-1.5">
                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: "#27C96D" }} />
                    <Text className="font-semibold" style={{ fontSize: 10, letterSpacing: 1, color: "#27C96D" }}>
                      ON DUTY
                    </Text>
                  </View>
                </View>
              ))
            )}
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
                  <Pressable
                    key={visitor.id}
                    onPress={() => setDetail(visitor)}
                    className="flex-row items-center"
                    style={{
                      padding: 20,
                      gap: 16,
                      borderTopWidth: index > 0 ? 1 : 0,
                      borderTopColor: "#333333",
                    }}
                    accessibilityLabel={`${STATUS_PHRASE[visitor.status]} — ${visitor.name}. Tap for details.`}
                    accessibilityRole="button"
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
                  </Pressable>
                );
              })
            )}
          </View>
        </View>
      </ScrollView>

      <GlanceDetailModal visitor={detail} onClose={() => setDetail(null)} />
    </View>
  );
}

function GlanceDetailModal({ visitor, onClose }: { visitor: VisitorOutput | null; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  if (!visitor) return null;
  const pill = PILL[STATUS_PILL[visitor.status]];

  const fmt = (iso: string | null) =>
    iso
      ? `${new Date(iso).toLocaleDateString([], { day: "numeric", month: "short" })}, ${new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`
      : "—";

  const rows: { label: string; value: string }[] = [
    { label: "Visitor", value: visitor.name },
    { label: "Type", value: VISITOR_TYPE_LABEL[visitor.type] },
    { label: "Flat", value: visitor.flatNumber ? `Flat ${visitor.flatNumber}` : "—" },
    { label: "Phone", value: visitor.phone ?? "—" },
    { label: "Requested", value: fmt(visitor.createdAt) },
    { label: "Checked in", value: fmt(visitor.entryAt) },
    { label: "Checked out", value: fmt(visitor.exitAt) },
  ];

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <Pressable className="flex-1 justify-end" style={{ backgroundColor: "rgba(0,0,0,0.6)" }} onPress={onClose}>
        <Pressable
          onPress={() => {}}
          className="gap-1 rounded-t-3xl px-5 pt-5"
          style={[{ backgroundColor: "#1A1A1A", paddingBottom: insets.bottom + 20 }, shadowElevated]}
        >
          <View className="mb-3 h-1 w-10 self-center rounded-full" style={{ backgroundColor: "#333333" }} />
          <View className="flex-row items-center justify-between pb-3">
            <View className="flex-row items-center gap-3">
              <View
                className="items-center justify-center"
                style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: "#242424", borderWidth: 1, borderColor: "#333333" }}
              >
                <MaterialIcons name={TYPE_ICON[visitor.type]} size={22} color="#F5821F" />
              </View>
              <Text className="text-headline-md font-extrabold text-on-surface">{STATUS_PHRASE[visitor.status]}</Text>
            </View>
            <View
              className="items-center justify-center"
              style={{ paddingHorizontal: 12, paddingVertical: 4, borderRadius: 999, backgroundColor: "#242424", borderWidth: 1, borderColor: pill.color }}
            >
              <Text className="font-semibold" style={{ fontSize: 10, letterSpacing: 1, color: pill.color }}>
                {pill.label}
              </Text>
            </View>
          </View>

          <View className="gap-px overflow-hidden rounded-2xl" style={{ backgroundColor: "#242424" }}>
            {rows.map((r) => (
              <View key={r.label} className="flex-row items-center justify-between px-4 py-3">
                <Text className="text-body-sm text-text-muted">{r.label}</Text>
                <Text className="flex-1 text-right text-body-md font-bold text-on-surface" numberOfLines={1}>
                  {r.value}
                </Text>
              </View>
            ))}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
