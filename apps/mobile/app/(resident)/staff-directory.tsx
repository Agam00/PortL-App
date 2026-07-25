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
    <View className="flex-1" style={{ backgroundColor: "#0D0D0D" }}>
      <ScreenHeader title="Directory" subtitle="Find trusted service providers in your community." role="resident" />
      <ScrollView
        contentContainerClassName="gap-4 px-5 pb-8 pt-2"
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl tintColor="#F5821F" colors={["#F5821F"]} progressBackgroundColor="#1A1A1A" refreshing={staffQuery.isRefetching} onRefresh={() => staffQuery.refetch()} />}
      >
        <Input
          placeholder="Search plumbers, electricians..."
          value={search}
          onChangeText={setSearch}
          leftElement={<MaterialIcons name="search" size={20} color="#8A8A8A" />}
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
                <ListRowCard key={entry.id} className="flex-row items-center gap-4">
                  <View>
                    <Avatar name={entry.name} imageUrl={entry.photoUrl} size={56} />
                    {entry.isVerifiedByAdmin && (
                      <View
                        className="items-center justify-center"
                        style={{
                          position: "absolute",
                          bottom: -2,
                          right: -2,
                          width: 20,
                          height: 20,
                          borderRadius: 10,
                          backgroundColor: "#1A1A1A",
                        }}
                      >
                        <MaterialIcons name="verified" size={16} color="#F5821F" />
                      </View>
                    )}
                  </View>
                  <View className="min-w-0 flex-1">
                    <Text className="text-body-lg font-extrabold text-on-surface" numberOfLines={1}>
                      {entry.name}
                    </Text>
                    <Text className="text-body-sm font-bold" style={{ color: "#F5821F" }} numberOfLines={1}>
                      {entry.category}
                    </Text>
                  </View>
                  <PressableScale
                    onPress={() => Linking.openURL(`tel:${entry.phone}`)}
                    scaleTo={0.9}
                    className="items-center justify-center rounded-full"
                    style={[{ width: 52, height: 52, backgroundColor: "#FF9A3D" }, shadowCard]}
                    accessibilityLabel={`Call ${entry.name}`}
                    accessibilityRole="button"
                  >
                    <MaterialIcons name="call" size={20} color="#fff" />
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
