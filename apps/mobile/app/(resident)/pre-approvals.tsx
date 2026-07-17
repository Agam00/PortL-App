import { View, Text, ScrollView, RefreshControl, Alert } from "react-native";
import { useRouter } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import type { VisitorOutput } from "@repo/services/visitor/model";
import { trpc } from "../../lib/trpc";
import { useUiStore } from "../../stores/ui-store";
import { getErrorMessage } from "../../lib/error-message";
import { hapticSuccess, hapticError } from "../../lib/haptics";
import { ScreenHeader } from "../../components/ui/screen-header";
import { EmptyState } from "../../components/ui/empty-state";
import { ListLoading } from "../../components/ui/list-loading";
import { PressableScale } from "../../components/ui/pressable-scale";
import { shadowCard } from "../../lib/shadows";

type Tone = "pending" | "completed" | "expired" | "cancelled";

const TYPE_ICON: Record<VisitorOutput["type"], React.ComponentProps<typeof MaterialIcons>["name"]> = {
  guest: "face",
  delivery: "local-shipping",
  cab: "local-taxi",
  service: "handyman",
  other: "person",
};

// my_pre_approvals mockup pills: Pending = solid amber, Completed = soft gray,
// Expired = soft red.
const PILL: Record<Tone, { label: string; bg: string; fg: string }> = {
  pending: { label: "Pending", bg: "#FEB246", fg: "#3D2E00" },
  completed: { label: "Completed", bg: "#ECE6F2", fg: "#48454F" },
  expired: { label: "Expired", bg: "#F8C9C9", fg: "#8C1D18" },
  cancelled: { label: "Cancelled", bg: "#ECE6F2", fg: "#48454F" },
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
      <View style={{ height: 1, backgroundColor: "#E4DEEC" }} />
    </View>
  );
}

function PreApprovalCard({
  visitor,
  tone,
  muted,
  onCancel,
  cancelling,
}: {
  visitor: VisitorOutput;
  tone: Tone;
  muted?: boolean;
  onCancel?: () => void;
  cancelling?: boolean;
}) {
  const pill = PILL[tone];
  return (
    <View className="gap-3 rounded-xl bg-surface p-4" style={shadowCard}>
      <View className="flex-row items-start justify-between gap-2">
        <View className="min-w-0 flex-1 flex-row items-center gap-3">
          <View
            className="items-center justify-center"
            style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: muted ? "#F1ECF8" : "#E4DAFB" }}
          >
            <MaterialIcons name={TYPE_ICON[visitor.type]} size={22} color={muted ? "#797585" : "#4A27B5"} />
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
        <View className="flex-row items-center gap-2 rounded-lg px-3 py-2.5" style={{ backgroundColor: "#F5F1FB" }}>
          <MaterialIcons name="calendar-month" size={18} color="#6244CD" />
          <Text className="text-body-md font-bold text-on-surface">{formatWindow(visitor)}</Text>
        </View>
      ) : (
        <View className="flex-row items-center gap-2">
          <MaterialIcons name="history" size={16} color="#797585" />
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
  const showToast = useUiStore((s) => s.showToast);
  const utils = trpc.useUtils();
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
    <View className="flex-1" style={{ backgroundColor: "#FAF7FD" }}>
      <ScreenHeader title="" role="resident" />
      <View className="flex-row items-start justify-between gap-3 px-5 pb-2 pt-5">
        <Text className="flex-1 text-headline-lg font-extrabold text-on-surface">My Pre-approvals</Text>
        <PressableScale
          scaleTo={0.95}
          onPress={() => router.push("/(resident)/pre-approve")}
          className="flex-row items-center gap-1.5 rounded-full px-4 py-2.5"
          style={[{ backgroundColor: "#7B5FE8" }, shadowCard]}
          accessibilityLabel="New invite"
          accessibilityRole="button"
        >
          <MaterialIcons name="add" size={18} color="#fff" />
          <Text className="text-body-md font-bold" style={{ color: "#FFFFFF" }}>
            New Invite
          </Text>
        </PressableScale>
      </View>

      <ScrollView
        contentContainerClassName="gap-4 px-5 pb-8 pt-2"
        refreshControl={<RefreshControl refreshing={query.isRefetching} onRefresh={() => query.refetch()} />}
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
