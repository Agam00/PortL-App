import { useState } from "react";
import { View, Text, ScrollView, RefreshControl, Alert, Pressable, Modal } from "react-native";
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
import { PressableScale } from "../../components/ui/pressable-scale";
import { shadowCard, shadowElevated } from "../../lib/shadows";

type Tone = "pending" | "completed" | "expired" | "cancelled";

const TYPE_ICON: Record<VisitorOutput["type"], React.ComponentProps<typeof MaterialIcons>["name"]> = {
  guest: "face",
  delivery: "local-shipping",
  cab: "local-taxi",
  service: "handyman",
  other: "person",
};

// The "+ New Invite" flow starts by asking WHAT is being pre-approved, then routes to the form.
const INVITE_TYPES: { type: "guest" | "delivery" | "service" | "cab"; label: string; icon: React.ComponentProps<typeof MaterialIcons>["name"] }[] = [
  { type: "guest", label: "Guest", icon: "face" },
  { type: "delivery", label: "Delivery", icon: "local-shipping" },
  { type: "service", label: "Service", icon: "handyman" },
  { type: "cab", label: "Cab", icon: "local-taxi" },
];

// my_pre_approvals mockup pills: Pending = solid amber, Completed = soft gray,
// Expired = soft red.
const PILL: Record<Tone, { label: string; bg: string; fg: string }> = {
  pending: { label: "Pending", bg: "#FEB246", fg: "#3D2E00" },
  completed: { label: "Completed", bg: "#262626", fg: "#C4C4C4" },
  expired: { label: "Expired", bg: "#3A1A1A", fg: "#8C1D18" },
  cancelled: { label: "Cancelled", bg: "#262626", fg: "#C4C4C4" },
};

function formatWindow(visitor: VisitorOutput) {
  const from = visitor.validFrom ? new Date(visitor.validFrom) : null;
  const until = visitor.validUntil ? new Date(visitor.validUntil) : null;
  if (!from || !until) return "No time window";
  const day = from.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
  const opts: Intl.DateTimeFormatOptions = { hour: "numeric", minute: "2-digit" };
  const isAllDay =
    from.getHours() === 0 && from.getMinutes() === 0 && until.getHours() === 23 && until.getMinutes() === 59;
  return isAllDay
    ? `${day} • All Day`
    : `${day} • ${from.toLocaleTimeString([], opts)} - ${until.toLocaleTimeString([], opts)}`;
}

function SectionHeading({ label }: { label: string }) {
  return (
    <View className="gap-2 pt-2">
      <Text className="text-body-lg text-on-surface-variant">{label}</Text>
      <View style={{ height: 1, backgroundColor: "#333333" }} />
    </View>
  );
}

function PreApprovalCard({
  visitor,
  tone,
  muted,
  onCancel,
  onShare,
  cancelling,
}: {
  visitor: VisitorOutput;
  tone: Tone;
  muted?: boolean;
  onCancel?: () => void;
  onShare?: () => void;
  cancelling?: boolean;
}) {
  const pill = PILL[tone];
  return (
    <View className="gap-3 rounded-xl bg-surface p-4" style={shadowCard}>
      <View className="flex-row items-start justify-between gap-2">
        <View className="min-w-0 flex-1 flex-row items-center gap-3">
          <View
            className="items-center justify-center"
            style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: muted ? "#242424" : "#2A2320" }}
          >
            <MaterialIcons name={TYPE_ICON[visitor.type]} size={22} color={muted ? "#8A8A8A" : "#FF9A3D"} />
          </View>
          <View className="min-w-0 flex-1">
            <Text
              className={`text-headline-md font-extrabold ${muted ? "text-on-surface-variant" : "text-on-surface"}`}
              numberOfLines={2}
            >
              {visitor.name}
            </Text>
            <Text className="text-body-sm capitalize text-text-muted">{visitor.type}</Text>
          </View>
        </View>
        <View className="rounded-full px-3 py-1" style={{ backgroundColor: pill.bg }}>
          <Text className="text-body-sm font-bold" style={{ color: pill.fg }}>
            {pill.label}
          </Text>
        </View>
      </View>

      {tone === "pending" ? (
        <View className="gap-2">
          <View className="flex-row items-center gap-2 rounded-lg px-3 py-2.5" style={{ backgroundColor: "#242424" }}>
            <MaterialIcons name="calendar-month" size={18} color="#F5821F" />
            <Text className="text-body-md font-bold text-on-surface">{formatWindow(visitor)}</Text>
          </View>
          {visitor.passCode && (
            <View className="flex-row items-center justify-between rounded-lg px-3 py-2.5" style={{ backgroundColor: "rgba(245,130,31,0.12)" }}>
              <View className="flex-row items-center gap-2">
                <MaterialIcons name="pin" size={18} color="#F5821F" />
                <Text className="text-body-sm text-text-muted">Gate code — share with your visitor</Text>
              </View>
              <Text className="text-body-lg font-extrabold tracking-widest" style={{ color: "#F5821F" }}>
                {visitor.passCode}
              </Text>
            </View>
          )}
          {visitor.passCode && onShare && (
            <PressableScale
              scaleTo={0.97}
              onPress={onShare}
              className="h-11 flex-row items-center justify-center gap-2 rounded-full"
              style={{ backgroundColor: "#F5821F" }}
              accessibilityLabel={`Share gate pass for ${visitor.name}`}
              accessibilityRole="button"
            >
              <MaterialIcons name="qr-code-2" size={18} color="#141118" />
              <Text className="text-body-md font-bold" style={{ color: "#141118" }}>
                Share Pass
              </Text>
            </PressableScale>
          )}
        </View>
      ) : (
        <View className="flex-row items-center gap-2">
          <MaterialIcons name="history" size={16} color="#8A8A8A" />
          <Text className="text-body-sm text-text-muted">{formatWindow(visitor)}</Text>
        </View>
      )}

      {onCancel && (
        <PressableScale
          scaleTo={0.97}
          onPress={onCancel}
          disabled={cancelling}
          className="flex-row items-center gap-1.5 self-start"
          accessibilityLabel={`Cancel pre-approval for ${visitor.name}`}
          accessibilityRole="button"
        >
          <MaterialIcons name="cancel" size={16} color="#FF5F5F" />
          <Text className="text-body-sm font-bold text-status-red-strong">
            {cancelling ? "Cancelling..." : "Cancel"}
          </Text>
        </PressableScale>
      )}
    </View>
  );
}

export default function MyPreApprovals() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  const showToast = useUiStore((s) => s.showToast);
  const utils = trpc.useUtils();
  const [pickerOpen, setPickerOpen] = useState(false);
  const query = trpc.visitors.listPreApprovedForResident.useQuery();
  const all = query.data ?? [];
  const now = Date.now();

  const cancelMutation = trpc.visitors.cancelPreApproval.useMutation({
    onSuccess: () => {
      hapticSuccess();
      showToast("Pre-approval cancelled", "success");
      utils.visitors.listPreApprovedForResident.invalidate();
    },
    onError: (error) => {
      hapticError();
      showToast(getErrorMessage(error), "error");
    },
  });

  function confirmCancel(visitor: VisitorOutput) {
    Alert.alert("Cancel pre-approval?", `${visitor.name} will no longer be able to enter using this pre-approval.`, [
      { text: "Keep it", style: "cancel" },
      { text: "Cancel Pre-approval", style: "destructive", onPress: () => cancelMutation.mutate({ visitorId: visitor.id }) },
    ]);
  }

  const upcoming = all.filter((v) => v.status === "approved" && (!v.validUntil || new Date(v.validUntil).getTime() >= now));
  const expired = all.filter((v) => v.status === "approved" && v.validUntil && new Date(v.validUntil).getTime() < now);
  const used = all.filter((v) => v.status === "checked_in" || v.status === "checked_out");
  const cancelled = all.filter((v) => v.status === "cancelled");

  return (
    <View className="flex-1" style={{ backgroundColor: "#0D0D0D" }}>
      {/* Top bar: notifications (left) · brand (center) · profile (right) — matches Home. */}
      <View
        className="flex-row items-center justify-between px-5 pb-3"
        style={{ paddingTop: insets.top + 10, backgroundColor: "#0D0D0D" }}
      >
        <Pressable
          onPress={() => router.push("/(resident)/notifications")}
          hitSlop={8}
          className="h-11 w-11 items-center justify-center rounded-full bg-surface"
          style={shadowCard}
          accessibilityLabel="Notifications"
          accessibilityRole="button"
        >
          <MaterialIcons name="notifications-none" size={24} color="#C4C4C4" />
        </Pressable>
        <Text className="text-headline-md font-extrabold text-on-surface">Portl</Text>
        <Pressable
          onPress={() => router.push("/(resident)/profile")}
          hitSlop={8}
          accessibilityLabel="Profile"
          accessibilityRole="button"
        >
          <View className="rounded-full" style={shadowCard}>
            <Avatar name={user?.fullName ?? "Resident"} size={44} />
          </View>
        </Pressable>
      </View>

      <View className="flex-row items-start justify-between gap-3 px-5 pb-2 pt-5">
        <Text className="flex-1 text-headline-lg font-extrabold text-on-surface">My Pre-approvals</Text>
        <PressableScale
          scaleTo={0.95}
          onPress={() => {
            hapticTap();
            setPickerOpen(true);
          }}
          className="flex-row items-center gap-1.5 rounded-full px-4 py-2.5"
          style={[{ backgroundColor: "#FF9A3D" }, shadowCard]}
          accessibilityLabel="New invite"
          accessibilityRole="button"
        >
          <MaterialIcons name="add" size={18} color="#fff" />
          <Text className="text-body-md font-bold" style={{ color: "#FFFFFF" }}>
            New Invite
          </Text>
        </PressableScale>
      </View>

      {/* Type picker — ask what's being pre-approved before opening the form. */}
      <Modal visible={pickerOpen} transparent animationType="fade" onRequestClose={() => setPickerOpen(false)}>
        <Pressable className="flex-1 justify-end" style={{ backgroundColor: "rgba(0,0,0,0.55)" }} onPress={() => setPickerOpen(false)}>
          <Pressable
            onPress={() => {}}
            className="gap-1 rounded-t-3xl px-5 pb-8 pt-5"
            style={[{ backgroundColor: "#1A1A1A" }, shadowElevated]}
          >
            <View className="mb-2 h-1 w-10 self-center rounded-full" style={{ backgroundColor: "#333333" }} />
            <Text className="pb-2 text-headline-md font-extrabold text-on-surface">Who are you expecting?</Text>
            {INVITE_TYPES.map((t) => (
              <Pressable
                key={t.type}
                onPress={() => {
                  setPickerOpen(false);
                  router.push(`/(resident)/pre-approve?type=${t.type}`);
                }}
                className="flex-row items-center gap-3 rounded-2xl px-4 py-3.5"
                style={{ backgroundColor: "#242424" }}
                accessibilityRole="button"
                accessibilityLabel={t.label}
              >
                <View className="items-center justify-center" style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: "#2A2320" }}>
                  <MaterialIcons name={t.icon} size={22} color="#FF9A3D" />
                </View>
                <Text className="flex-1 text-body-lg font-bold text-on-surface">{t.label}</Text>
                <MaterialIcons name="chevron-right" size={22} color="#8A8A8A" />
              </Pressable>
            ))}
          </Pressable>
        </Pressable>
      </Modal>

      <ScrollView
        contentContainerClassName="gap-4 px-5 pb-8 pt-2"
        refreshControl={<RefreshControl tintColor="#F5821F" colors={["#F5821F"]} progressBackgroundColor="#1A1A1A" refreshing={query.isRefetching} onRefresh={() => query.refetch()} />}
      >
        {query.isLoading ? (
          <ListLoading />
        ) : all.length === 0 ? (
          <View className="rounded-xl bg-surface">
            <EmptyState title="No pre-approvals yet" description="Pre-approve a guest and it'll show up here." icon="qr-code" />
          </View>
        ) : (
          <>
            {upcoming.length > 0 && (
              <View className="gap-4">
                <SectionHeading label="Upcoming" />
                {upcoming.map((v) => (
                  <PreApprovalCard
                    key={v.id}
                    visitor={v}
                    tone="pending"
                    onShare={() => router.push(`/(resident)/visitor-pass?visitorId=${v.id}`)}
                    onCancel={() => confirmCancel(v)}
                    cancelling={cancelMutation.isPending && cancelMutation.variables?.visitorId === v.id}
                  />
                ))}
              </View>
            )}
            {used.length > 0 && (
              <View className="gap-4">
                <SectionHeading label="Used" />
                {used.map((v) => (
                  <PreApprovalCard key={v.id} visitor={v} tone="completed" muted />
                ))}
              </View>
            )}
            {expired.length > 0 && (
              <View className="gap-4">
                <SectionHeading label="Expired" />
                {expired.map((v) => (
                  <PreApprovalCard key={v.id} visitor={v} tone="expired" muted />
                ))}
              </View>
            )}
            {cancelled.length > 0 && (
              <View className="gap-4">
                <SectionHeading label="Cancelled" />
                {cancelled.map((v) => (
                  <PreApprovalCard key={v.id} visitor={v} tone="cancelled" muted />
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}
