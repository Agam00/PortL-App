import { useState } from "react";
import { View, Text, ScrollView, RefreshControl, Pressable, Linking } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { trpc } from "../../lib/trpc";
import { ScreenHeader } from "../../components/ui/screen-header";
import { Input } from "../../components/ui/input";
import { Avatar } from "../../components/ui/avatar";
import { EmptyState } from "../../components/ui/empty-state";
import { GroupLabel } from "../../components/ui/group-label";
import { ListLoading } from "../../components/ui/list-loading";

export default function ResidentStaffDirectory() {
  const [search, setSearch] = useState("");

  const staffQuery = trpc.staffDirectory.listForResident.useQuery();
  const staff = (staffQuery.data ?? []).filter(
    (s) => search.trim().length === 0 || s.name.toLowerCase().includes(search.toLowerCase()) || s.category.toLowerCase().includes(search.toLowerCase()),
  );

  const byCategory = new Map<string, typeof staff>();
  for (const entry of staff) {
    const list = byCategory.get(entry.category) ?? [];
    list.push(entry);
    byCategory.set(entry.category, list);
  }

  return (
    <View className="flex-1 bg-background">
      <ScreenHeader title="Society Directory" role="resident" />
      <ScrollView
        contentContainerClassName="gap-4 p-4 pb-8"
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={staffQuery.isRefetching} onRefresh={() => staffQuery.refetch()} />}
      >
        <Text className="text-body-sm text-text-muted">Browse staff and service providers by category.</Text>
        <Input placeholder="Search by name or category..." value={search} onChangeText={setSearch} />

        {staffQuery.isLoading ? (
          <ListLoading />
        ) : staffQuery.isError ? (
          <View className="rounded-lg border border-border-subtle bg-surface-elevated">
            <EmptyState title="Couldn't load directory" description="Pull down to refresh and try again." icon="error-outline" />
          </View>
        ) : staff.length === 0 ? (
          <View className="rounded-lg border border-border-subtle bg-surface-elevated">
            <EmptyState title="No entries found" description="Nothing matches that search." icon="badge" />
          </View>
        ) : (
          Array.from(byCategory.entries()).map(([category, entries]) => (
            <View key={category} className="gap-2">
              <GroupLabel label={category} />
              {entries.map((entry) => (
                <View key={entry.id} className="flex-row items-center gap-3 rounded-xl border border-border-subtle bg-surface p-4">
                  <Avatar name={entry.name} imageUrl={entry.photoUrl} />
                  <View className="min-w-0 flex-1">
                    <View className="flex-row items-center gap-1.5">
                      <Text className="text-body-md font-medium text-on-surface" numberOfLines={1}>
                        {entry.name}
                      </Text>
                      {entry.isVerifiedByAdmin && <MaterialIcons name="verified" size={16} color="#5e6ad2" />}
                    </View>
                    <Text className="text-meta-text text-text-muted">{entry.phone}</Text>
                  </View>
                  <Pressable
                    onPress={() => Linking.openURL(`tel:${entry.phone}`)}
                    hitSlop={10}
                    className="h-11 w-11 items-center justify-center rounded-full border border-border-subtle active:bg-white/5"
                    accessibilityLabel={`Call ${entry.name}`}
                    accessibilityRole="button"
                  >
                    <MaterialIcons name="call" size={20} color="#c6c5d5" />
                  </Pressable>
                </View>
              ))}
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}
