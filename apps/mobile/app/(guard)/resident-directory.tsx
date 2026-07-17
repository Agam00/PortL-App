import { useEffect, useState } from "react";
import { View, Text, TextInput, FlatList, Pressable, Linking, ActivityIndicator } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { trpc } from "../../lib/trpc";
import { ScreenHeader } from "../../components/ui/screen-header";
import { EmptyState } from "../../components/ui/empty-state";
import { shadowCard } from "../../lib/shadows";

function maskPhone(phone: string) {
  if (phone.length <= 4) return phone;
  return phone.slice(0, -4).replace(/\d/g, "•") + phone.slice(-4);
}

export default function ResidentDirectory() {
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [revealedIds, setRevealedIds] = useState<Set<string>>(new Set());
  const [towerFilter, setTowerFilter] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(query), 300);
    return () => clearTimeout(timer);
  }, [query]);

  const searchQuery = trpc.residents.search.useQuery(
    { query: debounced },
    { enabled: debounced.length > 0 },
  );
  const results = searchQuery.data ?? [];

  const towers = [...new Set(results.map((f) => f.towerName))];
  const filtered = towerFilter ? results.filter((f) => f.towerName === towerFilter) : results;

  type Row =
    | { kind: "tower"; key: string; towerName: string }
    | { kind: "resident"; key: string; flat: (typeof results)[number]; resident: (typeof results)[number]["residents"][number] }
    | { kind: "vacant"; key: string; flat: (typeof results)[number] };

  // resident_directory mockup groups cards under uppercase building headers.
  // Flat item array keeps FlatList virtualization intact.
  const rows: Row[] = towers
    .filter((t) => !towerFilter || t === towerFilter)
    .flatMap((tower): Row[] => [
      { kind: "tower", key: `tower-${tower}`, towerName: tower },
      ...filtered
        .filter((f) => f.towerName === tower)
        .flatMap((flat): Row[] =>
          flat.residents.length > 0
            ? flat.residents.map((resident): Row => ({ kind: "resident", key: resident.id, flat, resident }))
            : [{ kind: "vacant", key: flat.flatId, flat }],
        ),
    ]);

  function toggleReveal(id: string) {
    setRevealedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function FlatBadge({ flatNumber }: { flatNumber: string }) {
    return (
      <View
        className="items-center justify-center"
        style={{ width: 72, height: 72, borderRadius: 16, backgroundColor: "#ECE6F8" }}
      >
        <Text className="font-bold uppercase text-text-muted" style={{ fontSize: 11, letterSpacing: 1 }}>
          Flat
        </Text>
        <Text className="text-headline-md font-extrabold text-primary" numberOfLines={1}>
          {flatNumber}
        </Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background">
      <ScreenHeader title="Directory" role="guard" />
      <FlatList
        data={rows}
        keyExtractor={(row) => row.key}
        ItemSeparatorComponent={() => <View className="h-3" />}
        contentContainerClassName="px-4 pb-8 pt-2"
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <View className="mb-4 gap-4">
            <View
              className="flex-row items-center gap-3 rounded-full px-5"
              style={{ backgroundColor: "#E5E0EB" }}
            >
              <MaterialIcons name="search" size={24} color="#797585" />
              <TextInput
                placeholder="Search Flat, Name, or Phone..."
                placeholderTextColor="#797585"
                value={query}
                onChangeText={setQuery}
                autoCapitalize="none"
                className="flex-1 py-3.5 text-body-lg text-on-surface"
                accessibilityLabel="Search by flat number, name, or phone"
              />
            </View>
            {towers.length > 0 && (
              <View className="flex-row flex-wrap gap-2">
                {[null, ...towers].map((tower) => {
                  const selected = towerFilter === tower;
                  return (
                    <Pressable
                      key={tower ?? "all"}
                      onPress={() => setTowerFilter(tower)}
                      className="rounded-full px-5 py-2.5"
                      style={
                        selected
                          ? { backgroundColor: "#6244CD" }
                          : { backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#CAC4D6" }
                      }
                      accessibilityLabel={`Filter by ${tower ?? "all buildings"}`}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                    >
                      <Text
                        className="text-body-md font-bold"
                        style={{ color: selected ? "#FFFFFF" : "#1C1A23" }}
                      >
                        {tower ?? "All"}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            )}
            {searchQuery.isFetching && <ActivityIndicator className="py-4" color="#6244CD" />}
          </View>
        }
        ListEmptyComponent={
          debounced.length === 0 ? (
            <View className="rounded-xl bg-surface">
              <EmptyState
                title="Search the directory"
                description="Find a flat or resident to quickly verify who lives there."
                icon="search"
              />
            </View>
          ) : searchQuery.isFetching ? null : searchQuery.isError ? (
            <View className="rounded-xl bg-surface">
              <EmptyState title="Couldn't search the directory" description="Try again in a moment." icon="error-outline" />
            </View>
          ) : (
            <View className="rounded-xl bg-surface">
              <EmptyState title="No residents found" description="Nothing matches that search." icon="search-off" />
            </View>
          )
        }
        renderItem={({ item: row }) =>
          row.kind === "tower" ? (
            <Text
              className="mt-3 font-bold uppercase text-text-muted"
              style={{ fontSize: 13, letterSpacing: 2 }}
            >
              {row.towerName}
            </Text>
          ) : row.kind === "resident" ? (
            <View className="flex-row items-center gap-4 bg-surface p-4" style={[{ borderRadius: 16 }, shadowCard]}>
              <FlatBadge flatNumber={row.flat.flatNumber} />
              <View className="min-w-0 flex-1">
                <Text className="text-headline-md font-extrabold text-on-surface" numberOfLines={2}>
                  {row.resident.fullName}
                </Text>
                <Pressable
                  onPress={() => toggleReveal(row.resident.id)}
                  hitSlop={6}
                  className="flex-row items-center gap-1.5"
                  accessibilityLabel={
                    revealedIds.has(row.resident.id)
                      ? `Hide phone number for ${row.resident.fullName}`
                      : `Reveal phone number for ${row.resident.fullName}`
                  }
                  accessibilityRole="button"
                >
                  <MaterialIcons
                    name={revealedIds.has(row.resident.id) ? "visibility-off" : "visibility"}
                    size={18}
                    color="#797585"
                  />
                  <Text className="text-body-md text-text-muted" numberOfLines={1}>
                    {revealedIds.has(row.resident.id) ? row.resident.phone : maskPhone(row.resident.phone)}
                  </Text>
                </Pressable>
              </View>
              <Pressable
                onPress={() => Linking.openURL(`tel:${row.resident.phone}`)}
                className="items-center justify-center"
                style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: "#7B5FE8" }}
                accessibilityLabel={`Call ${row.resident.fullName}`}
                accessibilityRole="button"
              >
                <MaterialIcons name="call" size={24} color="#FFFFFF" />
              </Pressable>
            </View>
          ) : (
            <View className="flex-row items-center gap-4 bg-surface p-4" style={[{ borderRadius: 16 }, shadowCard]}>
              <FlatBadge flatNumber={row.flat.flatNumber} />
              <Text className="text-body-md text-text-muted">Vacant · {row.flat.towerName}</Text>
            </View>
          )
        }
      />
    </View>
  );
}
