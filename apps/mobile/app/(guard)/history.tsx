import { useState } from "react";
import { View, ScrollView, FlatList, RefreshControl, ActivityIndicator } from "react-native";
import type { VisitorOutput } from "@repo/services/visitor/model";
import { trpc } from "../../lib/trpc";
import { ScreenHeader } from "../../components/ui/screen-header";
import { Input } from "../../components/ui/input";
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

export default function GuardHistory() {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>(FILTERS[0]);
  const [search, setSearch] = useState("");

  const query = trpc.visitors.history.useQuery({ status: filter.status });
  const visitors = (query.data ?? []).filter(
    (v) =>
      search.trim().length === 0 ||
      v.name.toLowerCase().includes(search.toLowerCase()) ||
      v.flatNumber?.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <View className="flex-1 bg-background">
      <ScreenHeader title="Entry & Exit Log" role="guard" />
      <FlatList
        data={visitors}
        keyExtractor={(visitor) => visitor.id}
        renderItem={({ item }) => <HistoryRow visitor={item} showFlat />}
        ItemSeparatorComponent={() => <View className="h-2" />}
        contentContainerClassName="gap-4 p-4 pb-8"
        refreshControl={<RefreshControl refreshing={query.isRefetching} onRefresh={() => query.refetch()} />}
        ListHeaderComponent={
          <View className="gap-4 mb-4">
            <Input placeholder="Search by name or flat number" value={search} onChangeText={setSearch} />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2">
              {FILTERS.map((f) => (
                <Chip key={f.label} label={f.label} selected={filter.label === f.label} onPress={() => setFilter(f)} />
              ))}
            </ScrollView>
          </View>
        }
        ListEmptyComponent={
          query.isLoading ? (
            <ActivityIndicator className="py-8" color="#5e6ad2" />
          ) : query.isError ? (
            <View className="rounded-lg border border-border-subtle bg-surface-elevated">
              <EmptyState title="Couldn't load activity" description="Pull down to refresh and try again." icon="error-outline" />
            </View>
          ) : (
            <View className="rounded-lg border border-border-subtle bg-surface-elevated">
              <EmptyState title="No matching activity" description="Nothing found for this search or filter." icon="history" />
            </View>
          )
        }
      />
    </View>
  );
}
