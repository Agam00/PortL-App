import { useState } from "react";
import { View, Text, ScrollView, RefreshControl, LayoutAnimation, Platform, UIManager } from "react-native";

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}
import { useRouter } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { trpc } from "../../lib/trpc";
import { useUiStore } from "../../stores/ui-store";
import { getErrorMessage } from "../../lib/error-message";
import { hapticSuccess, hapticError } from "../../lib/haptics";
import { ScreenHeader } from "../../components/ui/screen-header";
import { EmptyState } from "../../components/ui/empty-state";
import { PressableScale } from "../../components/ui/pressable-scale";
import { GuardQueueRow } from "../../components/guard-queue-row";
import { ListLoading } from "../../components/ui/list-loading";
import { shadowCard } from "../../lib/shadows";

function StatTile({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <View className="flex-1 items-center justify-center rounded-xl bg-surface p-4" style={shadowCard}>
      <Text className="text-headline-lg font-extrabold" style={{ color }}>
        {value}
      </Text>
      <Text
        className="text-center font-bold uppercase text-on-surface-variant"
        style={{ fontSize: 11, letterSpacing: 1, marginTop: 2 }}
      >
        {label}
      </Text>
    </View>
  );
}

function SectionHeader({ dotColor, title, badge }: { dotColor: string; title: string; badge?: string }) {
  return (
    <View className="flex-row items-center justify-between">
      <View className="flex-row items-center gap-2">
        <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: dotColor }} />
        <Text className="text-body-lg font-bold text-on-surface">{title}</Text>
      </View>
      {badge && (
        <View className="rounded-full px-2.5 py-1" style={{ backgroundColor: "rgba(254,178,70,0.2)" }}>
          <Text className="font-bold text-secondary" style={{ fontSize: 12 }}>
            {badge}
          </Text>
        </View>
      )}
    </View>
  );
}

export default function GuardGate() {
  const router = useRouter();
  const showToast = useUiStore((s) => s.showToast);
  const utils = trpc.useUtils();
  const [actingOnId, setActingOnId] = useState<string | null>(null);

  const queueQuery = trpc.visitors.listForGuard.useQuery(undefined, {
    refetchInterval: 4000,
  });

  const markEntryMutation = trpc.visitors.markEntry.useMutation({
    onSuccess: () => {
      hapticSuccess();
      LayoutAnimation.configureNext(LayoutAnimation.create(220, LayoutAnimation.Types.easeInEaseOut, LayoutAnimation.Properties.opacity));
      utils.visitors.listForGuard.invalidate();
    },
    onError: (error) => {
      hapticError();
      showToast(getErrorMessage(error), "error");
    },
    onSettled: () => setActingOnId(null),
  });

  const markExitMutation = trpc.visitors.markExit.useMutation({
    onSuccess: () => {
      hapticSuccess();
      LayoutAnimation.configureNext(LayoutAnimation.create(220, LayoutAnimation.Types.easeInEaseOut, LayoutAnimation.Properties.opacity));
      utils.visitors.listForGuard.invalidate();
    },
    onError: (error) => {
      hapticError();
      showToast(getErrorMessage(error), "error");
    },
    onSettled: () => setActingOnId(null),
  });

  const queue = queueQuery.data ?? [];
  const pending = queue.filter((v) => v.status === "pending");
  const approved = queue.filter((v) => v.status === "approved");
  const checkedIn = queue.filter((v) => v.status === "checked_in");

  const now = Date.now();
  const twoHoursMs = 2 * 60 * 60 * 1000;
  const expiringSoon = queue.filter(
    (v) =>
      v.source === "resident_preapproved" &&
      v.status === "approved" &&
      v.validUntil &&
      new Date(v.validUntil).getTime() > now &&
      new Date(v.validUntil).getTime() - now < twoHoursMs,
  );

  return (
    <View className="flex-1 bg-background">
      <ScreenHeader
        title="Gate Dashboard"
        subtitle="Manage incoming visitors and deliveries."
        role="guard"
      />
      <ScrollView
        contentContainerClassName="gap-5 px-4 pb-8 pt-2"
        refreshControl={
          <RefreshControl refreshing={queueQuery.isRefetching} onRefresh={() => queueQuery.refetch()} />
        }
      >
        <View className="flex-row gap-3">
          <StatTile value={pending.length} label="Pending" color="#FEB246" />
          <StatTile value={checkedIn.length} label="Checked In" color="#6244CD" />
          <StatTile value={expiringSoon.length} label="Expiring" color="#BA1A1A" />
        </View>

        <View className="flex-row gap-3">
          <PressableScale
            scaleTo={0.95}
            onPress={() => router.push("/(guard)/visitors")}
            className="flex-1 items-center justify-center gap-2 p-4"
            style={[{ borderRadius: 16, backgroundColor: "#6244CD" }, shadowCard]}
            accessibilityLabel="Register a new visitor"
            accessibilityRole="button"
          >
            <MaterialIcons name="add-circle-outline" size={30} color="#FFFFFF" />
            <Text className="text-body-md font-bold" style={{ color: "#FFFFFF" }}>
              Register Visitor
            </Text>
          </PressableScale>
          <PressableScale
            scaleTo={0.95}
            onPress={() => router.push("/(guard)/check-preapproved")}
            className="flex-1 items-center justify-center gap-2 bg-surface p-4"
            style={[{ borderRadius: 16, borderWidth: 1, borderColor: "rgba(98,68,205,0.2)" }, shadowCard]}
            accessibilityLabel="Check pre-approved visitors"
            accessibilityRole="button"
          >
            <MaterialIcons name="check-circle-outline" size={30} color="#6244CD" />
            <Text className="text-body-md font-bold text-primary">Pre-Approved</Text>
          </PressableScale>
        </View>

        {queueQuery.isLoading ? (
          <ListLoading />
        ) : queueQuery.isError ? (
          <View className="rounded-xl bg-surface">
            <EmptyState
              title="Couldn't load the queue"
              description="Pull down to refresh and try again."
              icon="error-outline"
            />
          </View>
        ) : queue.length === 0 ? (
          <View className="rounded-xl bg-surface">
            <EmptyState
              title="No requests yet"
              description="Requests you register will show up here with live status."
              icon="local-shipping"
            />
          </View>
        ) : (
          <>
            {pending.length > 0 && (
              <View className="gap-3">
                <SectionHeader
                  dotColor="#FEB246"
                  title="Pending Approval"
                  badge={`${pending.length} New`}
                />
                {pending.map((visitor) => (
                  <GuardQueueRow key={visitor.id} visitor={visitor} />
                ))}
              </View>
            )}

            {approved.length > 0 && (
              <View className="gap-3">
                <SectionHeader dotColor="#6244CD" title="Approved / Pre-Booked" />
                {approved.map((visitor) => (
                  <GuardQueueRow
                    key={visitor.id}
                    visitor={visitor}
                    actionLabel="Mark Entry"
                    isActionLoading={actingOnId === visitor.id && markEntryMutation.isPending}
                    onAction={() => {
                      setActingOnId(visitor.id);
                      markEntryMutation.mutate({ visitorId: visitor.id });
                    }}
                  />
                ))}
              </View>
            )}

            {checkedIn.length > 0 && (
              <View className="gap-3">
                <SectionHeader dotColor="#797585" title="Currently On-Site" />
                {checkedIn.map((visitor) => (
                  <GuardQueueRow
                    key={visitor.id}
                    visitor={visitor}
                    actionLabel="Mark Exit"
                    isActionLoading={actingOnId === visitor.id && markExitMutation.isPending}
                    onAction={() => {
                      setActingOnId(visitor.id);
                      markExitMutation.mutate({ visitorId: visitor.id });
                    }}
                  />
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}
