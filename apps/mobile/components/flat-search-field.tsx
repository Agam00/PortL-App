import { useEffect, useState } from "react";
import { View, Text, Pressable, ActivityIndicator } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import type { FlatSearchResult } from "@repo/services/resident/model";
import { trpc } from "../lib/trpc";
import { Input } from "./ui/input";

export function FlatSearchField({
  onSelect,
  selected,
  onClear,
  error,
}: {
  onSelect: (flat: FlatSearchResult) => void;
  selected: FlatSearchResult | null;
  onClear: () => void;
  error?: string;
}) {
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(query), 300);
    return () => clearTimeout(timer);
  }, [query]);

  const searchQuery = trpc.residents.search.useQuery(
    { query: debounced },
    { enabled: debounced.length > 0 && !selected },
  );

  if (selected) {
    return (
      <View className="gap-1.5">
        <Text className="text-label-caps uppercase tracking-wide text-text-muted">Flat</Text>
        <View className="flex-row items-center justify-between rounded-lg border border-primary-container bg-white/5 px-3 py-2.5">
          <Text className="flex-1 text-body-md text-on-surface" numberOfLines={1}>
            {selected.flatNumber} · {selected.towerName}
            {selected.residents[0] ? ` · ${selected.residents[0].fullName}` : ""}
          </Text>
          <Pressable onPress={onClear} hitSlop={8} accessibilityLabel="Clear selected flat">
            <MaterialIcons name="close" size={18} color="#8A8F98" />
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View className="gap-1.5">
      <Input
        label="Flat"
        placeholder="Search flat number or resident name"
        value={query}
        onChangeText={setQuery}
        error={error}
      />
      {searchQuery.isFetching && <ActivityIndicator size="small" color="#5e6ad2" />}
      {searchQuery.data && searchQuery.data.length > 0 && (
        <View className="rounded-lg border border-border-subtle bg-surface-elevated">
          {searchQuery.data.map((flat, index) => (
            <Pressable
              key={flat.flatId}
              className={`flex-row items-center justify-between p-3 active:bg-white/5 ${
                index > 0 ? "border-t border-border-subtle" : ""
              }`}
              onPress={() => {
                onSelect(flat);
                setQuery("");
              }}
            >
              <View className="flex-1">
                <Text className="text-body-md text-on-surface">
                  {flat.flatNumber} · {flat.towerName}
                </Text>
                {flat.residents.length > 0 && (
                  <Text className="text-meta-text text-text-muted" numberOfLines={1}>
                    {flat.residents.map((r) => r.fullName).join(", ")}
                  </Text>
                )}
              </View>
              <MaterialIcons name="chevron-right" size={18} color="#8A8F98" />
            </Pressable>
          ))}
        </View>
      )}
      {debounced.length > 0 && !searchQuery.isFetching && searchQuery.data?.length === 0 && (
        <Text className="px-1 text-body-sm text-text-muted">No matching flats found.</Text>
      )}
    </View>
  );
}
