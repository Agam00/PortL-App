import { View, Text, ScrollView, RefreshControl } from "react-native";
import { useRouter } from "expo-router";
import { trpc } from "../../lib/trpc";
import { ScreenHeader } from "../../components/ui/screen-header";
import { Button } from "../../components/ui/button";
import { EmptyState } from "../../components/ui/empty-state";
import { GroupLabel } from "../../components/ui/group-label";
import { GuardQueueRow } from "../../components/guard-queue-row";

export default function GuardGate() {
  const router = useRouter();

  const queueQuery = trpc.visitors.listForGuard.useQuery(undefined, {
    refetchInterval: 4000,
  });

  const queue = queueQuery.data ?? [];
  const totalIn = queue.filter((v) => v.status === "checked_in").length;
  const totalOut = queue.filter((v) => v.status === "checked_out").length;

  return (
    <View className="flex-1 bg-background">
      <ScreenHeader title="Gate" role="guard" />
      <ScrollView
        contentContainerClassName="gap-4 p-4 pb-8"
        refreshControl={
          <RefreshControl refreshing={queueQuery.isRefetching} onRefresh={() => queueQuery.refetch()} />
        }
      >
        <View className="flex-row gap-4">
          <View className="flex-1 justify-center gap-1 rounded-lg border border-border-subtle bg-surface-elevated p-3">
            <Text className="text-meta-text text-text-muted">Checked In</Text>
            <Text className="text-headline-lg font-semibold text-on-surface">{totalIn}</Text>
          </View>
          <View className="flex-1 justify-center gap-1 rounded-lg border border-border-subtle bg-surface-elevated p-3">
            <Text className="text-meta-text text-text-muted">Checked Out</Text>
            <Text className="text-headline-lg font-semibold text-on-surface">{totalOut}</Text>
          </View>
        </View>

        <View className="flex-row gap-2">
          <Button className="flex-1" variant="primary" onPress={() => router.push("/(guard)/visitors")}>
            Register Visitor
          </Button>
          <Button className="flex-1" variant="outline" disabled>
            Scan Pass
          </Button>
        </View>

        {queue.length === 0 ? (
          <View className="rounded-lg border border-border-subtle bg-surface-elevated">
            <EmptyState
              title="No requests yet"
              description="Requests you register will show up here with live status."
              icon="local-shipping"
            />
          </View>
        ) : (
          <View className="gap-2">
            <GroupLabel label="Your requests" />
            {queue.map((visitor) => (
              <GuardQueueRow key={visitor.id} visitor={visitor} />
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
