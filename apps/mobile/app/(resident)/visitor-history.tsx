import { useState } from "react";
import { View, Text, ScrollView, FlatList, RefreshControl, Pressable, Platform } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
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

function isSameDay(a: Date, b: Date) {
  return a.toDateString() === b.toDateString();
}
function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function endOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}
function dateLabel(date: Date | null) {
  if (!date) return "All dates";
  if (isSameDay(date, new Date())) {
    return `Today, ${date.toLocaleDateString([], { day: "numeric", month: "short" })}`;
  }
  return date.toLocaleDateString([], { day: "numeric", month: "short", year: "numeric" });
}

export default function ResidentVisitorHistory() {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>(FILTERS[0]);
  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState<Date | null>(null);
  const [showPicker, setShowPicker] = useState(false);

  const query = trpc.visitors.history.useQuery({
    status: filter.status,
    fromDate: dateFilter ? startOfDay(dateFilter).toISOString() : undefined,
    toDate: dateFilter ? endOfDay(dateFilter).toISOString() : undefined,
  });
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
            <View className="flex-row items-center gap-2">
              <Pressable
                onPress={() => setShowPicker(true)}
                className="flex-row items-center gap-2 rounded-lg px-4 py-2.5"
                style={{ backgroundColor: "#ECE6F2" }}
                accessibilityRole="button"
                accessibilityLabel="Filter by date"
              >
                <MaterialIcons name="calendar-today" size={18} color="#1C1A23" />
                <Text className="text-body-md font-bold text-on-surface">{dateLabel(dateFilter)}</Text>
                <MaterialIcons name="arrow-drop-down" size={20} color="#1C1A23" />
              </Pressable>
              {dateFilter && (
                <Pressable
                  onPress={() => setDateFilter(null)}
                  className="flex-row items-center gap-1 rounded-lg px-3 py-2.5"
                  style={{ backgroundColor: "#E9E4F4" }}
                  accessibilityRole="button"
                  accessibilityLabel="Show all dates"
                >
                  <MaterialIcons name="close" size={16} color="#48454F" />
                  <Text className="text-body-sm font-bold" style={{ color: "#48454F" }}>
                    All dates
                  </Text>
                </Pressable>
              )}
              {showPicker && (
                <DateTimePicker
                  value={dateFilter ?? new Date()}
                  mode="date"
                  maximumDate={new Date()}
                  display={Platform.OS === "ios" ? "spinner" : "default"}
                  onChange={(_, selected) => {
                    setShowPicker(false);
                    if (selected) setDateFilter(selected);
                  }}
                />
              )}
            </View>
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
            <View className="rounded-xl bg-surface">
              <EmptyState title="Couldn't load history" description="Pull down to refresh and try again." icon="error-outline" />
            </View>
          ) : (
            <View className="rounded-xl bg-surface">
              <EmptyState title="No visitors found" description="Nothing matches this filter yet." icon="history" />
            </View>
          )
        }
      />
    </View>
  );
}
