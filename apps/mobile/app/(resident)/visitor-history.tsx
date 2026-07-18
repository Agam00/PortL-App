import { useState } from "react";
import { View, Text, ScrollView, RefreshControl, Pressable, Image, Linking, Alert } from "react-native";
import type { ImageSourcePropType } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import type { VisitorOutput } from "@repo/services/visitor/model";
import { trpc } from "../../lib/trpc";
import { useAuthStore } from "../../stores/auth-store";
import { useUiStore } from "../../stores/ui-store";
import { getErrorMessage } from "../../lib/error-message";
import { hapticSuccess, hapticError, hapticTap } from "../../lib/haptics";
import { Avatar } from "../../components/ui/avatar";
import { EmptyState } from "../../components/ui/empty-state";
import { ListLoading } from "../../components/ui/list-loading";
import { shadowCard } from "../../lib/shadows";

const TYPE_LABEL: Record<VisitorOutput["type"], string> = {
  guest: "Guest",
  delivery: "Delivery",
  cab: "Cab",
  service: "Service",
  other: "Visitor",
};

const TYPE_IMG: Record<VisitorOutput["type"], ImageSourcePropType> = {
  guest: require("../../assets/characters/guest.png"),
  delivery: require("../../assets/characters/delivery.png"),
  cab: require("../../assets/characters/cab.png"),
  service: require("../../assets/characters/service.png"),
  other: require("../../assets/characters/guest.png"),
};

function statusInfo(v: VisitorOutput): { label: string; color: string } {
  switch (v.status) {
    case "pending":
      return { label: "PENDING", color: "#FEB246" };
    case "approved":
      return { label: v.type === "service" ? "SERVICE BOOKED" : "PRE APPROVED", color: "#F5821F" };
    case "checked_in":
      return { label: "INSIDE", color: "#27C96D" };
    case "checked_out":
      return { label: "COMPLETED", color: "#8A8A8A" };
    case "rejected":
      return { label: "REJECTED", color: "#FF5F5F" };
    case "cancelled":
      return { label: "CANCELLED", color: "#8A8A8A" };
    case "expired":
      return { label: "EXPIRED", color: "#8A8A8A" };
    default:
      return { label: String(v.status).toUpperCase(), color: "#8A8A8A" };
  }
}

function whenLabel(v: VisitorOutput) {
  const iso = v.validFrom ?? v.createdAt;
  const d = new Date(iso);
  return `${d.toLocaleDateString([], { day: "2-digit", month: "short" })} | ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }).toLowerCase()}`;
}

function isCancellable(v: VisitorOutput) {
  return (
    v.source === "resident_preapproved" &&
    v.status === "approved" &&
    (!v.validUntil || new Date(v.validUntil).getTime() > Date.now())
  );
}

const TABS = ["Today", "Upcoming"] as const;

export default function ResidentActivity() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  const showToast = useUiStore((s) => s.showToast);
  const utils = trpc.useUtils();
  const [tab, setTab] = useState<(typeof TABS)[number]>("Today");

  const historyQuery = trpc.visitors.history.useQuery({});
  const notificationsQuery = trpc.notifications.list.useQuery(undefined, { refetchInterval: 15_000 });
  const unread = (notificationsQuery.data ?? []).filter((n) => !n.readAt).length;

  const cancelMutation = trpc.visitors.cancelPreApproval.useMutation({
    onSuccess: () => {
      hapticSuccess();
      showToast("Pre-approval cancelled", "success");
      utils.visitors.history.invalidate();
    },
    onError: (e) => {
      hapticError();
      showToast(getErrorMessage(e), "error");
    },
  });

  const all = historyQuery.data ?? [];
  const now = Date.now();
  const upcoming = all.filter((v) => v.validFrom && new Date(v.validFrom).getTime() > now);
  const upcomingIds = new Set(upcoming.map((v) => v.id));
  const today = all.filter((v) => !upcomingIds.has(v.id));
  const shown = tab === "Today" ? today : upcoming;

  function call(v: VisitorOutput) {
    if (!v.phone) return;
    hapticTap();
    Linking.openURL(`tel:${v.phone}`);
  }

  function confirmCancel(v: VisitorOutput) {
    Alert.alert("Cancel pre-approval?", `${v.name} will no longer be able to enter using this pre-approval.`, [
      { text: "Keep it", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => cancelMutation.mutate({ visitorId: v.id }) },
    ]);
  }

  return (
    <View className="flex-1" style={{ backgroundColor: "#0D0D0D" }}>
      {/* Top bar: notifications · Activity · profile */}
      <View className="flex-row items-center justify-between px-5 pb-3" style={{ paddingTop: insets.top + 10 }}>
        <Pressable
          onPress={() => router.push("/(resident)/notifications")}
          hitSlop={8}
          className="relative h-11 w-11 items-center justify-center rounded-full bg-surface"
          style={shadowCard}
          accessibilityLabel={unread > 0 ? `Notifications, ${unread} unread` : "Notifications"}
          accessibilityRole="button"
        >
          <MaterialIcons name="notifications-none" size={24} color="#C4C4C4" />
          {unread > 0 && (
            <View className="absolute right-1 top-1 h-4 min-w-4 items-center justify-center rounded-full bg-status-red-strong px-1">
              <Text className="font-bold text-white" style={{ fontSize: 10, lineHeight: 12 }}>
                {unread > 9 ? "9+" : unread}
              </Text>
            </View>
          )}
        </Pressable>
        <Text className="text-headline-md font-extrabold text-on-surface">Activity</Text>
        <Pressable onPress={() => router.push("/(resident)/profile")} hitSlop={8} accessibilityLabel="Profile" accessibilityRole="button">
          <View className="rounded-full" style={shadowCard}>
            <Avatar name={user?.fullName ?? "Resident"} size={44} />
          </View>
        </Pressable>
      </View>

      {/* Today / Upcoming toggle */}
      <View className="mx-5 mb-2 flex-row rounded-full p-1" style={{ backgroundColor: "#1A1A1A" }}>
        {TABS.map((t) => {
          const active = tab === t;
          return (
            <Pressable
              key={t}
              onPress={() => setTab(t)}
              className="flex-1 items-center rounded-full py-2.5"
              style={{ backgroundColor: active ? "#F5821F" : "transparent" }}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
            >
              <Text className="text-body-md font-bold" style={{ color: active ? "#141118" : "#8A8A8A" }}>
                {t}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <ScrollView
        contentContainerClassName="gap-3 px-4 pb-28 pt-1"
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={historyQuery.isRefetching} onRefresh={() => historyQuery.refetch()} />}
      >
        {historyQuery.isLoading ? (
          <ListLoading />
        ) : historyQuery.isError ? (
          <View className="rounded-xl bg-surface">
            <EmptyState title="Couldn't load activity" description="Pull down to refresh and try again." icon="error-outline" />
          </View>
        ) : shown.length === 0 ? (
          <View className="rounded-xl bg-surface">
            <EmptyState
              title={tab === "Upcoming" ? "No upcoming visitors" : "No activity yet"}
              description={tab === "Upcoming" ? "Pre-approved visitors scheduled for later show up here." : "Recent visitor activity shows up here."}
              icon="history"
            />
          </View>
        ) : (
          shown.map((v) => {
            const status = statusInfo(v);
            const cancellable = isCancellable(v);
            return (
              <View key={v.id} className="rounded-2xl bg-surface p-4" style={shadowCard}>
                <View className="flex-row items-center gap-3">
                  <Image source={TYPE_IMG[v.type]} style={{ width: 56, height: 56 }} resizeMode="contain" />
                  <View className="min-w-0 flex-1 gap-0.5">
                    <Text className="text-body-md font-extrabold text-on-surface" numberOfLines={1}>
                      {TYPE_LABEL[v.type]} | {v.name}
                    </Text>
                    <Text className="text-body-sm font-extrabold" style={{ color: status.color }}>
                      {status.label}
                    </Text>
                    <View className="flex-row items-center gap-1.5">
                      <MaterialIcons name="calendar-today" size={13} color="#8A8A8A" />
                      <Text className="text-body-sm text-text-muted">{whenLabel(v)}</Text>
                    </View>
                  </View>
                </View>

                <View className="mt-3 flex-row border-t pt-2" style={{ borderTopColor: "#2A2A2A" }}>
                  <ActionButton icon="call" label="Call" color="#F5821F" disabled={!v.phone} onPress={() => call(v)} />
                  <View style={{ width: 1, backgroundColor: "#2A2A2A" }} />
                  <ActionButton
                    icon="delete-outline"
                    label="Delete"
                    color="#FF5F5F"
                    disabled={!cancellable || cancelMutation.isPending}
                    onPress={() => confirmCancel(v)}
                  />
                  <View style={{ width: 1, backgroundColor: "#2A2A2A" }} />
                  <ActionButton icon="qr-code-2" label="GatePass" color="#8A8A8A" disabled onPress={() => {}} />
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

function ActionButton({
  icon,
  label,
  color,
  disabled,
  onPress,
}: {
  icon: React.ComponentProps<typeof MaterialIcons>["name"];
  label: string;
  color: string;
  disabled?: boolean;
  onPress: () => void;
}) {
  const tint = disabled ? "#5A5A5A" : color;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      className="flex-1 flex-row items-center justify-center gap-1.5 py-1.5"
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
    >
      <MaterialIcons name={icon} size={16} color={tint} />
      <Text className="text-body-sm font-bold" style={{ color: tint }}>
        {label}
      </Text>
    </Pressable>
  );
}
