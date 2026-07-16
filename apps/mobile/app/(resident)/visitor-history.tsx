import { useState } from "react";
import { View, Text, ScrollView, FlatList, RefreshControl } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import type { VisitorOutput } from "@repo/services/visitor/model";
import { trpc } from "../../lib/trpc";
import { ScreenHeader } from "../../components/ui/screen-header";
import { EmptyState } from "../../components/ui/empty-state";
import { Chip } from "../../components/ui/chip";
import { Input } from "../../components/ui/input";
import { HistoryRow } from "../../components/history-row";
import { ListLoading } from "../../components/ui/list-loading";

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
  const [search, setSearch] = useState("");

  const query = trpc.visitors.history.useQuery({ status: filter.status });
  const visitors = (query.data ?? []).filter(
    (v) => search.trim().length === 0 || v.name.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <View className="flex-1 bg-background">
      <ScreenHeader title="Visitor History" role="resident" />
      <FlatList
        data={visitors}
        keyExtractor={(visitor) => visitor.id}
        renderItem={({ item }) => <HistoryRow visitor={item} />}
        ItemSeparatorComponent={() => <View className="h-3" />}
        contentContainerClassName="gap-4 p-4 pb-8"
        refreshControl={<RefreshControl refreshing={query.isRefetching} onRefresh={() => query.refetch()} />}
        ListHeaderComponent={
          <View className="gap-4 mb-4">
            <Input
              placeholder="Search visitors..."
              value={search}
              onChangeText={setSearch}
              leftElement={<MaterialIcons name="search" size={20} color="#797585" />}
            />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2">
              {FILTERS.map((f) => (
                <Chip key={f.label} label={f.label} selected={filter.label === f.label} onPress={() => setFilter(f)} />
              ))}
            </ScrollView>
          </View>
        }
        ListEmptyComponent={
          query.isLoading ? (
            <ListLoading />
          ) : query.isError ? (
            <View className="rounded-card bg-surface">
              <EmptyState title="Couldn't load history" description="Pull down to refresh and try again." icon="error-outline" />
            </View>
          ) : (
            <View className="rounded-card bg-surface">
              <EmptyState title="No visitors found" description="Nothing matches this filter yet." icon="history" />
            </View>
          )
        }
      />
    </View>
  );
}
