import { useState, useEffect } from "react";
import { View, Text, TextInput, FlatList, Pressable, Linking, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { trpc } from "../../lib/trpc";
import { Avatar } from "../../components/ui/avatar";
import { EmptyState } from "../../components/ui/empty-state";
import { RoleTag } from "../../components/ui/role-tag";

type Tab = "messages" | "residents";
type ResidentRow =
  | { kind: "tower"; key: string; tower: string }
  | { kind: "resident"; key: string; id: string; name: string; phone: string; flatNumber: string; towerName: string };

function timeLabel(iso: string | null) {
  if (!iso) return "";
  const date = new Date(iso);
  const now = new Date();
  if (date.toDateString() === now.toDateString()) return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

export default function GuardMessages() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<Tab>("messages");
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query), 250);
    return () => clearTimeout(t);
  }, [query]);

  const conversationsQuery = trpc.chat.conversations.useQuery(undefined, { refetchInterval: 5000 });
  const conversations = conversationsQuery.data ?? [];
  const unreadTotal = conversations.reduce((s, c) => s + c.unreadCount, 0);

  // Full society directory — shown by default on the Residents tab, filtered locally.
  const directoryQuery = trpc.residents.directory.useQuery(undefined, { enabled: tab === "residents" });
  const q = debounced.trim().toLowerCase();

  const matchedPeople = (directoryQuery.data ?? []).flatMap((flat) =>
    flat.residents
      .filter((r) => q.length === 0 || r.fullName.toLowerCase().includes(q) || flat.flatNumber.toLowerCase().includes(q))
      .map((r) => ({ id: r.id, name: r.fullName, phone: r.phone, flatNumber: flat.flatNumber, towerName: flat.towerName })),
  );

  // Group by tower (first-seen order), residents sorted by flat within each.
  const byTower = new Map<string, typeof matchedPeople>();
  for (const r of matchedPeople) byTower.set(r.towerName, [...(byTower.get(r.towerName) ?? []), r]);
  const residentRows: ResidentRow[] = [];
  for (const [tower, people] of byTower) {
    residentRows.push({ kind: "tower", key: `tower-${tower}`, tower });
    for (const r of [...people].sort((a, b) => a.flatNumber.localeCompare(b.flatNumber))) {
      residentRows.push({
        kind: "resident",
        key: r.id,
        id: r.id,
        name: r.name,
        phone: r.phone,
        flatNumber: r.flatNumber,
        towerName: r.towerName,
      });
    }
  }

  const filteredConversations = conversations.filter(
    (c) => q.length === 0 || c.peerName.toLowerCase().includes(q) || (c.peerFlat ?? "").toLowerCase().includes(q),
  );

  function openChat(peerId: string, name: string) {
    router.push(`/(guard)/chat?peerId=${peerId}&name=${encodeURIComponent(name)}`);
  }

  function switchTab(next: Tab) {
    setTab(next);
    setQuery("");
  }

  return (
    <View className="flex-1" style={{ backgroundColor: "#0D0D0D" }}>
      <View className="flex-row items-center gap-3 px-5 pb-3" style={{ paddingTop: insets.top + 10 }}>
        <Pressable onPress={() => router.back()} hitSlop={8} accessibilityLabel="Back" accessibilityRole="button">
          <MaterialIcons name="arrow-back" size={24} color="#F5F5F5" />
        </Pressable>
        <Text className="text-headline-lg font-extrabold text-on-surface">Messages</Text>
      </View>

      {/* Two options: Messages · Residents */}
      <View className="flex-row gap-6 px-5 pt-1">
        <TabButton label="Messages" count={unreadTotal} active={tab === "messages"} onPress={() => switchTab("messages")} />
        <TabButton label="Residents" active={tab === "residents"} onPress={() => switchTab("residents")} />
      </View>
      <View className="mt-2 h-px" style={{ backgroundColor: "#242424" }} />

      {/* Search box — filters conversations, or the resident directory */}
      <View className="mx-5 my-3 flex-row items-center gap-3 rounded-full px-5" style={{ backgroundColor: "#242424" }}>
        <MaterialIcons name="search" size={22} color="#8A8A8A" />
        <TextInput
          placeholder={tab === "messages" ? "Search your chats…" : "Search flat or name…"}
          placeholderTextColor="#8A8A8A"
          value={query}
          onChangeText={setQuery}
          className="flex-1 py-3 text-body-md text-on-surface"
          accessibilityLabel={tab === "messages" ? "Search conversations" : "Search residents to message"}
        />
        {query.length > 0 && (
          <Pressable onPress={() => setQuery("")} hitSlop={8} accessibilityLabel="Clear search">
            <MaterialIcons name="close" size={18} color="#8A8A8A" />
          </Pressable>
        )}
      </View>

      {tab === "residents" ? (
        <FlatList
          data={residentRows}
          keyExtractor={(row) => row.key}
          keyboardShouldPersistTaps="handled"
          contentContainerClassName="px-5 pb-8 pt-1"
          renderItem={({ item }) =>
            item.kind === "tower" ? (
              <Text className="mb-1 mt-3 pb-1 font-bold uppercase text-text-muted" style={{ fontSize: 12, letterSpacing: 2 }}>
                {item.tower}
              </Text>
            ) : (
              <View className="mb-2 flex-row items-center gap-3 rounded-2xl p-3" style={{ backgroundColor: "#1A1A1A" }}>
                <Avatar name={item.name} size={44} />
                <View className="min-w-0 flex-1">
                  <Text className="text-body-lg font-bold text-on-surface" numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text className="text-body-sm text-text-muted" numberOfLines={1}>
                    Flat {item.flatNumber}
                  </Text>
                </View>
                <Pressable
                  onPress={() => Linking.openURL(`tel:${item.phone}`)}
                  className="items-center justify-center rounded-full"
                  style={{ width: 42, height: 42, backgroundColor: "#22A559" }}
                  accessibilityLabel={`Call ${item.name}`}
                  accessibilityRole="button"
                >
                  <MaterialIcons name="call" size={20} color="#FFFFFF" />
                </Pressable>
                <Pressable
                  onPress={() => openChat(item.id, item.name)}
                  className="items-center justify-center rounded-full"
                  style={{ width: 42, height: 42, backgroundColor: "#F5821F" }}
                  accessibilityLabel={`Message ${item.name}`}
                  accessibilityRole="button"
                >
                  <MaterialIcons name="chat" size={20} color="#141118" />
                </Pressable>
              </View>
            )
          }
          ListEmptyComponent={
            directoryQuery.isLoading ? (
              <ActivityIndicator className="py-6" color="#F5821F" />
            ) : (
              <View className="mt-4 rounded-xl bg-surface">
                <EmptyState title="No residents found" description="Try a different flat number or name." icon="search-off" />
              </View>
            )
          }
        />
      ) : (
        <FlatList
          data={filteredConversations}
          keyExtractor={(c) => c.peerId}
          contentContainerClassName="px-5 pb-8 pt-1"
          ItemSeparatorComponent={() => <View className="h-1" />}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => openChat(item.peerId, item.peerName)}
              className="flex-row items-center gap-3 py-3 active:opacity-80"
              accessibilityLabel={`Open chat with ${item.peerName}`}
              accessibilityRole="button"
            >
              <Avatar name={item.peerName} size={48} />
              <View className="min-w-0 flex-1">
                <View className="flex-row items-center gap-2">
                  <Text className="shrink text-body-lg font-bold text-on-surface" numberOfLines={1}>
                    {item.peerName}
                    {item.peerFlat ? <Text className="text-body-sm text-text-muted"> · {item.peerFlat}</Text> : null}
                  </Text>
                  {item.peerRole !== "resident" && <RoleTag role={item.peerRole} size="sm" />}
                  <Text className="ml-auto text-body-sm text-text-muted">{timeLabel(item.lastAt)}</Text>
                </View>
                <View className="flex-row items-center justify-between gap-2">
                  <Text
                    className={`flex-1 text-body-sm ${item.unreadCount > 0 ? "font-bold text-on-surface" : "text-text-muted"}`}
                    numberOfLines={1}
                  >
                    {item.lastMessage}
                  </Text>
                  {item.unreadCount > 0 && (
                    <View className="items-center justify-center rounded-full px-2" style={{ minWidth: 20, height: 20, backgroundColor: "#F5821F" }}>
                      <Text className="text-white" style={{ fontSize: 11, fontWeight: "800" }}>
                        {item.unreadCount > 9 ? "9+" : item.unreadCount}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            </Pressable>
          )}
          ListEmptyComponent={
            conversationsQuery.isLoading ? (
              <ActivityIndicator className="py-6" color="#F5821F" />
            ) : (
              <View className="mt-4 rounded-xl bg-surface">
                <EmptyState title="No messages yet" description="Open the Residents tab to start a conversation." icon="forum" />
              </View>
            )
          }
        />
      )}
    </View>
  );
}

function TabButton({ label, count, active, onPress }: { label: string; count?: number; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} className="items-center gap-1.5" accessibilityRole="tab" accessibilityState={{ selected: active }}>
      <Text className="text-body-lg font-bold" style={{ color: active ? "#F5F5F5" : "#8A8A8A" }}>
        {label}
        {count && count > 0 ? ` (${count})` : ""}
      </Text>
      <View style={{ height: 3, width: 28, borderRadius: 2, backgroundColor: active ? "#F5821F" : "transparent" }} />
    </Pressable>
  );
}
