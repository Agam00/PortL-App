import { useEffect, useState } from "react";
import { View, Text, ScrollView, Pressable, Linking, ActivityIndicator } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { trpc } from "../../lib/trpc";
import { ScreenHeader } from "../../components/ui/screen-header";
import { Input } from "../../components/ui/input";
import { EmptyState } from "../../components/ui/empty-state";

function maskPhone(phone: string) {
  if (phone.length <= 4) return phone;
  return phone.slice(0, -4).replace(/\d/g, "•") + phone.slice(-4);
}

export default function ResidentDirectory() {
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [revealedIds, setRevealedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(query), 300);
    return () => clearTimeout(timer);
  }, [query]);

  const searchQuery = trpc.residents.search.useQuery(
    { query: debounced },
    { enabled: debounced.length > 0 },
  );
  const results = searchQuery.data ?? [];

  function toggleReveal(id: string) {
    setRevealedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <View className="flex-1 bg-background">
      <ScreenHeader title="Resident Directory" role="guard" />
      <ScrollView contentContainerClassName="gap-4 p-4 pb-8" keyboardShouldPersistTaps="handled">
        <Input
          placeholder="Search by flat number, name, or phone"
          value={query}
          onChangeText={setQuery}
          autoCapitalize="none"
        />

        {searchQuery.isFetching && <ActivityIndicator className="py-4" color="#5e6ad2" />}

        {debounced.length === 0 ? (
          <View className="rounded-lg border border-border-subtle bg-surface-elevated">
            <EmptyState
              title="Search the directory"
              description="Find a flat or resident to quickly verify who lives there."
              icon="search"
            />
          </View>
        ) : !searchQuery.isFetching && results.length === 0 ? (
          <View className="rounded-lg border border-border-subtle bg-surface-elevated">
            <EmptyState title="No residents found" description="Nothing matches that search." icon="search-off" />
          </View>
        ) : (
          <View className="gap-2">
            {results.map((flat) =>
              flat.residents.length > 0 ? (
                flat.residents.map((resident) => {
                  const revealed = revealedIds.has(resident.id);
                  return (
                    <View
                      key={resident.id}
                      className="flex-row items-center justify-between gap-3 rounded-xl border border-border-subtle bg-surface p-4"
                    >
                      <View className="min-w-0 flex-1 flex-row items-center gap-4">
                        <View className="h-12 w-12 items-center justify-center rounded-lg border border-border-subtle bg-surface-elevated">
                          <Text className="text-body-sm font-semibold text-on-surface">
                            {flat.flatNumber}
                          </Text>
                        </View>
                        <View className="min-w-0 flex-1">
                          <Text className="text-body-md font-medium text-on-surface" numberOfLines={1}>
                            {resident.fullName}
                          </Text>
                          <Pressable onPress={() => toggleReveal(resident.id)} hitSlop={6}>
                            <Text className="text-meta-text text-text-muted">
                              {revealed ? resident.phone : maskPhone(resident.phone)} · tap to{" "}
                              {revealed ? "hide" : "reveal"}
                            </Text>
                          </Pressable>
                        </View>
                      </View>
                      <Pressable
                        onPress={() => Linking.openURL(`tel:${resident.phone}`)}
                        hitSlop={10}
                        className="h-11 w-11 items-center justify-center rounded-full border border-border-subtle active:bg-white/5"
                      >
                        <MaterialIcons name="call" size={20} color="#c6c5d5" />
                      </Pressable>
                    </View>
                  );
                })
              ) : (
                <View
                  key={flat.flatId}
                  className="flex-row items-center gap-4 rounded-xl border border-border-subtle bg-surface p-4"
                >
                  <View className="h-12 w-12 items-center justify-center rounded-lg border border-border-subtle bg-surface-elevated">
                    <Text className="text-body-sm font-semibold text-on-surface">{flat.flatNumber}</Text>
                  </View>
                  <Text className="text-body-sm text-text-muted">Vacant · {flat.towerName}</Text>
                </View>
              ),
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
