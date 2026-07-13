import { useState } from "react";
import { View, ScrollView, RefreshControl, ActivityIndicator } from "react-native";
import type { VisitorOutput } from "@repo/services/visitor/model";
import { trpc } from "../../lib/trpc";
import { ScreenHeader } from "../../components/ui/screen-header";
import { EmptyState } from "../../components/ui/empty-state";
import { Chip } from "../../components/ui/chip";
import { HistoryRow } from "../../components/history-row";

const FILTERS: { label: string; status?: VisitorOutput["status"] }[] = [
  { label: "All" },
  { label: "Pending", status: "pending" },
  { label: "Approved", status: "approved" },
  { label: "Checked In", status: "checked_in" },
  { label: "Checked Out", status: "checked_out" },
  { label: "Rejected", status: "rejected" },
];

export default function ResidentVisitorHistory() {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>(FILTERS[0]);

  const query = trpc.visitors.history.useQuery({ status: filter.status });
  const visitors = query.data ?? [];

  return (
    <View className="flex-1 bg-background">
      <ScreenHeader title="Visitor History" role="resident" />
      <ScrollView
        contentContainerClassName="gap-4 p-4 pb-8"
        refreshControl={<RefreshControl refreshing={query.isRefetching} onRefresh={() => query.refetch()} />}
      >
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2">
          {FILTERS.map((f) => (
            <Chip key={f.label} label={f.label} selected={filter.label === f.label} onPress={() => setFilter(f)} />
          ))}
        </ScrollView>

        {query.isLoading ? (
          <ActivityIndicator className="py-8" color="#5e6ad2" />
        ) : visitors.length === 0 ? (
          <View className="rounded-lg border border-border-subtle bg-surface-elevated">
            <EmptyState
              title="No visitors found"
              description="Nothing matches this filter yet."
              icon="history"
            />
          </View>
        ) : (
          <View className="rounded-lg border border-border-subtle bg-surface-elevated">
            {visitors.map((visitor) => (
              <HistoryRow key={visitor.id} visitor={visitor} />
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
