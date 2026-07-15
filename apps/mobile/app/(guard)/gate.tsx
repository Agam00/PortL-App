import { useState } from "react";
import { View, Text, ScrollView, RefreshControl, LayoutAnimation, Platform, UIManager } from "react-native";

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}
import { useRouter } from "expo-router";
import { trpc } from "../../lib/trpc";
import { useUiStore } from "../../stores/ui-store";
import { getErrorMessage } from "../../lib/error-message";
import { hapticSuccess, hapticError } from "../../lib/haptics";
import { ScreenHeader } from "../../components/ui/screen-header";
import { Button } from "../../components/ui/button";
import { EmptyState } from "../../components/ui/empty-state";
import { GroupLabel } from "../../components/ui/group-label";
import { GuardQueueRow } from "../../components/guard-queue-row";
import { ListLoading } from "../../components/ui/list-loading";

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
      <ScreenHeader title="Gate" role="guard" />
      <ScrollView
        contentContainerClassName="gap-4 p-4 pb-8"
        refreshControl={
          <RefreshControl refreshing={queueQuery.isRefetching} onRefresh={() => queueQuery.refetch()} />
        }
      >
        <View className="flex-row gap-3">
          <View className="flex-1 justify-center gap-1 rounded-lg border border-border-subtle bg-surface-elevated p-3">
            <Text className="text-meta-text text-text-muted">Pending</Text>
            <Text className="text-headline-lg font-semibold text-on-surface">{pending.length}</Text>
          </View>
          <View className="flex-1 justify-center gap-1 rounded-lg border border-border-subtle bg-surface-elevated p-3">
            <Text className="text-meta-text text-text-muted">Checked In</Text>
            <Text className="text-headline-lg font-semibold text-on-surface">{checkedIn.length}</Text>
          </View>
          <View className="flex-1 justify-center gap-1 rounded-lg border border-border-subtle bg-surface-elevated p-3">
            <Text className="text-meta-text text-text-muted">Expiring Soon</Text>
            <View className="flex-row items-center gap-1.5">
              <Text className="text-headline-lg font-semibold text-on-surface">{expiringSoon.length}</Text>
              {expiringSoon.length > 0 && <View className="h-1.5 w-1.5 rounded-full bg-status-amber" />}
            </View>
          </View>
        </View>

        <View className="flex-row gap-2">
          <Button className="flex-1" variant="primary" onPress={() => router.push("/(guard)/visitors")}>
            Register Visitor
          </Button>
          <Button className="flex-1" variant="outline" onPress={() => router.push("/(guard)/check-preapproved")}>
            Pre-Approved
          </Button>
        </View>

        <Button variant="outline" onPress={() => router.push("/(guard)/resident-directory")}>
          Resident Directory
        </Button>

        {queueQuery.isLoading ? (
          <ListLoading />
        ) : queueQuery.isError ? (
          <View className="rounded-lg border border-border-subtle bg-surface-elevated">
            <EmptyState
              title="Couldn't load the queue"
              description="Pull down to refresh and try again."
              icon="error-outline"
            />
          </View>
        ) : queue.length === 0 ? (
          <View className="rounded-lg border border-border-subtle bg-surface-elevated">
            <EmptyState
              title="No requests yet"
              description="Requests you register will show up here with live status."
              icon="local-shipping"
            />
          </View>
        ) : (
          <>
            {pending.length > 0 && (
              <View className="gap-2">
                <GroupLabel label="Pending" />
                {pending.map((visitor) => (
                  <GuardQueueRow key={visitor.id} visitor={visitor} />
                ))}
              </View>
            )}

            {approved.length > 0 && (
              <View className="gap-2">
                <GroupLabel label="Approved — awaiting entry" />
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
              <View className="gap-2">
                <GroupLabel label="Checked in" />
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
