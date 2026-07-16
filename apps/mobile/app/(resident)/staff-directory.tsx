import { useState } from "react";
import { View, Text, ScrollView, RefreshControl, Linking } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { trpc } from "../../lib/trpc";
import { ScreenHeader } from "../../components/ui/screen-header";
import { Input } from "../../components/ui/input";
import { Chip } from "../../components/ui/chip";
import { Avatar } from "../../components/ui/avatar";
import { EmptyState } from "../../components/ui/empty-state";
import { GroupLabel } from "../../components/ui/group-label";
import { ListLoading } from "../../components/ui/list-loading";
import { ListRowCard } from "../../components/ui/list-row-card";
import { PressableScale } from "../../components/ui/pressable-scale";
import { shadowCard } from "../../lib/shadows";

export default function ResidentStaffDirectory() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string | null>(null);

  const staffQuery = trpc.staffDirectory.listForResident.useQuery();
  const allStaff = staffQuery.data ?? [];
  const categories = Array.from(new Set(allStaff.map((s) => s.category)));

  const staff = allStaff.filter(
    (s) =>
      (category === null || s.category === category) &&
      (search.trim().length === 0 ||
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        s.category.toLowerCase().includes(search.toLowerCase())),
  );

  const byCategory = new Map<string, typeof staff>();
  for (const entry of staff) {
    const list = byCategory.get(entry.category) ?? [];
    list.push(entry);
    byCategory.set(entry.category, list);
  }

  return (
    <View className="flex-1 bg-background">
      <ScreenHeader title="Directory" role="resident" />
      <ScrollView
        contentContainerClassName="gap-4 p-4 pb-8"
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={staffQuery.isRefetching} onRefresh={() => staffQuery.refetch()} />}
      >
        <Text className="text-body-sm text-text-muted">Find trusted service providers in your community.</Text>
        <Input
          placeholder="Search plumbers, electricians..."
          value={search}
          onChangeText={setSearch}
          leftElement={<MaterialIcons name="search" size={20} color="#797585" />}
        />

        {categories.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2">
            <Chip label="All" selected={category === null} onPress={() => setCategory(null)} />
            {categories.map((c) => (
              <Chip key={c} label={c} selected={category === c} onPress={() => setCategory(c)} />
            ))}
          </ScrollView>
        )}

        {staffQuery.isLoading ? (
          <ListLoading />
        ) : staffQuery.isError ? (
          <View className="rounded-card bg-surface">
            <EmptyState title="Couldn't load directory" description="Pull down to refresh and try again." icon="error-outline" />
          </View>
        ) : staff.length === 0 ? (
          <View className="rounded-card bg-surface">
            <EmptyState title="No entries found" description="Nothing matches that search." icon="badge" />
          </View>
        ) : (
          Array.from(byCategory.entries()).map(([cat, entries]) => (
            <View key={cat} className="gap-2">
              <GroupLabel label={cat} />
              {entries.map((entry) => (
                <ListRowCard key={entry.id} className="flex-row items-center gap-3">
                  <Avatar name={entry.name} imageUrl={entry.photoUrl} />
                  <View className="min-w-0 flex-1">
                    <Text className="text-body-md font-bold text-on-surface" numberOfLines={1}>
                      {entry.name}
                    </Text>
                    <View className="flex-row items-center gap-1.5">
                      <Text className="text-body-sm font-bold text-primary-container" numberOfLines={1}>
                        {entry.category}
                      </Text>
                      {entry.isVerifiedByAdmin && <MaterialIcons name="verified" size={14} color="#6244CD" />}
                    </View>
                  </View>
                  <PressableScale
                    onPress={() => Linking.openURL(`tel:${entry.phone}`)}
                    scaleTo={0.9}
                    className="h-11 w-11 items-center justify-center rounded-full bg-primary-container"
                    style={shadowCard}
                    accessibilityLabel={`Call ${entry.name}`}
                    accessibilityRole="button"
                  >
                    <MaterialIcons name="call" size={18} color="#fff" />
                  </PressableScale>
                </ListRowCard>
              ))}
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}
