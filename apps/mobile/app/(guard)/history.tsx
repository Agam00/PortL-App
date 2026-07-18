import { useState } from "react";
import { View, Text, TextInput, FlatList, Pressable, RefreshControl, Platform } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { MaterialIcons } from "@expo/vector-icons";
import type { VisitorOutput } from "@repo/services/visitor/model";
import { trpc } from "../../lib/trpc";
import { ScreenHeader } from "../../components/ui/screen-header";
import { EmptyState } from "../../components/ui/empty-state";
import { GuardHistoryCard } from "../../components/guard-history-card";
import { ListLoading } from "../../components/ui/list-loading";
import { shadowCard } from "../../lib/shadows";

const FILTERS: { label: string; status?: VisitorOutput["status"] }[] = [
  { label: "All" },
  { label: "Pending", status: "pending" },
  { label: "Approved", status: "approved" },
  { label: "Checked In", status: "checked_in" },
  { label: "Checked Out", status: "checked_out" },
  { label: "Rejected", status: "rejected" },
];

type ListItem = { kind: "header"; label: string; tinted: boolean } | { kind: "row"; visitor: VisitorOutput };

// entry_exit_history mockup groups rows under "Last Hour" / "Earlier Today" pills
// with a divider line. Kept as a flat item array so FlatList virtualization stays.
function groupVisitors(visitors: VisitorOutput[]): ListItem[] {
  const now = Date.now();
  const todayKey = new Date().toDateString();
  const buckets: { label: string; tinted: boolean; rows: VisitorOutput[] }[] = [
    { label: "Last Hour", tinted: true, rows: [] },
    { label: "Earlier Today", tinted: false, rows: [] },
    { label: "Earlier", tinted: false, rows: [] },
  ];
  for (const v of visitors) {
    const at = new Date(v.entryAt ?? v.createdAt);
    if (now - at.getTime() < 60 * 60 * 1000) buckets[0].rows.push(v);
    else if (at.toDateString() === todayKey) buckets[1].rows.push(v);
    else buckets[2].rows.push(v);
  }
  return buckets.flatMap((b) =>
    b.rows.length === 0
      ? []
      : [{ kind: "header" as const, label: b.label, tinted: b.tinted }, ...b.rows.map((visitor) => ({ kind: "row" as const, visitor }))],
  );
}

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

export default function GuardHistory() {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>(FILTERS[0]);
  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState<Date | null>(new Date());
  const [showPicker, setShowPicker] = useState(false);

  const query = trpc.visitors.history.useQuery({
    status: filter.status,
    fromDate: dateFilter ? startOfDay(dateFilter).toISOString() : undefined,
    toDate: dateFilter ? endOfDay(dateFilter).toISOString() : undefined,
  });
  const visitors = (query.data ?? []).filter(
    (v) =>
      search.trim().length === 0 ||
      v.name.toLowerCase().includes(search.toLowerCase()) ||
      v.flatNumber?.toLowerCase().includes(search.toLowerCase()),
  );
  // The "Last Hour / Earlier Today" buckets only make sense for today or an all-dates view.
  // When a specific past day is selected, show a flat list — the date is already in the pill.
  const showingPastDay = dateFilter !== null && !isSameDay(dateFilter, new Date());
  const items: ListItem[] = showingPastDay
    ? visitors.map((visitor) => ({ kind: "row" as const, visitor }))
    : groupVisitors(visitors);

  return (
    <View className="flex-1 bg-background">
      <ScreenHeader
        title="Visitor History"
        subtitle="Track entries and exits for all gates today."
        role="guard"
      />
      <FlatList
        data={items}
        keyExtractor={(item) => (item.kind === "header" ? `header-${item.label}` : item.visitor.id)}
        renderItem={({ item }) =>
          item.kind === "header" ? (
            <View className="mt-2 flex-row items-center gap-3">
              <View
                className="rounded-full px-4 py-1.5"
                style={{ backgroundColor: item.tinted ? "#C99A5A" : "#262626" }}
              >
                <Text
                  className="text-body-sm font-bold"
                  style={{ color: item.tinted ? "#C25E0C" : "#C4C4C4" }}
                >
                  {item.label}
                </Text>
              </View>
              <View className="flex-1" style={{ height: 1, backgroundColor: "#333333" }} />
            </View>
          ) : (
            <GuardHistoryCard visitor={item.visitor} />
          )
        }
        ItemSeparatorComponent={() => <View className="h-3" />}
        contentContainerClassName="px-4 pb-8 pt-2"
        refreshControl={<RefreshControl refreshing={query.isRefetching} onRefresh={() => query.refetch()} />}
        ListHeaderComponent={
          <View className="mb-4 gap-4">
            <View className="flex-row items-center gap-2">
              <Pressable
                onPress={() => setShowPicker(true)}
                className="flex-row items-center gap-2 rounded-lg px-4 py-2.5"
                style={{ backgroundColor: "#262626" }}
                accessibilityRole="button"
                accessibilityLabel="Change date"
              >
                <MaterialIcons name="calendar-today" size={18} color="#F5F5F5" />
                <Text className="text-body-md font-bold text-on-surface">{dateLabel(dateFilter)}</Text>
                <MaterialIcons name="arrow-drop-down" size={20} color="#F5F5F5" />
              </Pressable>
              {dateFilter && (
                <Pressable
                  onPress={() => setDateFilter(null)}
                  className="flex-row items-center gap-1 rounded-lg px-3 py-2.5"
                  style={{ backgroundColor: "#262626" }}
                  accessibilityRole="button"
                  accessibilityLabel="Show all dates"
                >
                  <MaterialIcons name="close" size={16} color="#C4C4C4" />
                  <Text className="text-body-sm font-bold" style={{ color: "#C4C4C4" }}>
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

            <View className="gap-3 bg-surface p-4" style={[{ borderRadius: 16 }, shadowCard]}>
              <View
                className="flex-row items-center gap-3 px-4"
                style={{ borderRadius: 12, backgroundColor: "#ECE9F1" }}
              >
                <MaterialIcons name="search" size={22} color="#8A8A8A" />
                <TextInput
                  placeholder="Search by name, flat (e.g. 402), or vendor"
                  placeholderTextColor="#8A8A8A"
                  value={search}
                  onChangeText={setSearch}
                  className="flex-1 py-3 text-body-md text-on-surface"
                  accessibilityLabel="Search history by name or flat"
                />
              </View>
              <View className="flex-row flex-wrap gap-2">
                {FILTERS.map((f) => {
                  const selected = filter.label === f.label;
                  return (
                    <Pressable
                      key={f.label}
                      onPress={() => setFilter(f)}
                      className="rounded-full px-4 py-2"
                      style={{ backgroundColor: selected ? "#F5821F" : "#262626" }}
                      accessibilityLabel={`Filter: ${f.label}`}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                    >
                      <Text
                        className="text-body-sm font-bold"
                        style={{ color: selected ? "#FFFFFF" : "#C4C4C4" }}
                      >
                        {f.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </View>
        }
        ListEmptyComponent={
          query.isLoading ? (
            <ListLoading />
          ) : query.isError ? (
            <View className="rounded-xl bg-surface">
              <EmptyState title="Couldn't load activity" description="Pull down to refresh and try again." icon="error-outline" />
            </View>
          ) : (
            <View className="rounded-xl bg-surface">
              <EmptyState title="No matching activity" description="Nothing found for this search or filter." icon="history" />
            </View>
          )
        }
      />
    </View>
  );
}
