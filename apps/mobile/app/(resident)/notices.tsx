import { useState } from "react";
import { View, Text, ScrollView, RefreshControl, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { trpc } from "../../lib/trpc";
import { ScreenHeader } from "../../components/ui/screen-header";
import { Input } from "../../components/ui/input";
import { EmptyState } from "../../components/ui/empty-state";
import { ListLoading } from "../../components/ui/list-loading";

function formatPublishedAt(iso: string | null) {
  if (!iso) return "";
  const date = new Date(iso);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday = date.toDateString() === yesterday.toDateString();

  if (isToday) return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  if (isYesterday) return "Yesterday";
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

export default function ResidentNotices() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const utils = trpc.useUtils();

  const noticesQuery = trpc.notices.listForResident.useQuery({});
  const markReadMutation = trpc.notices.markRead.useMutation({
    onSuccess: () => utils.notices.listForResident.invalidate(),
  });

  const notices = (noticesQuery.data ?? []).filter(
    (n) =>
      search.trim().length === 0 ||
      n.title.toLowerCase().includes(search.toLowerCase()) ||
      n.body.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <View className="flex-1 bg-background">
      <ScreenHeader title="Notices" role="resident" />
      <ScrollView
        contentContainerClassName="gap-4 p-4 pb-8"
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={noticesQuery.isRefetching} onRefresh={() => noticesQuery.refetch()} />}
      >
        <Input placeholder="Search notices..." value={search} onChangeText={setSearch} />

        <Pressable
          onPress={() => router.push("/(resident)/polls")}
          className="flex-row items-center gap-3 rounded-lg border border-border-subtle bg-surface-elevated p-4 active:bg-white/5"
        >
          <MaterialIcons name="poll" size={20} color="#5e6ad2" />
          <Text className="flex-1 text-body-md font-medium text-on-surface">Community Polls</Text>
          <MaterialIcons name="chevron-right" size={18} color="#8A8F98" />
        </Pressable>

        {noticesQuery.isLoading ? (
          <ListLoading />
        ) : notices.length === 0 ? (
          <View className="rounded-lg border border-border-subtle bg-surface-elevated">
            <EmptyState title="No notices yet" description="Society announcements will show up here." icon="campaign" />
          </View>
        ) : (
          <View className="gap-2">
            {notices.map((notice) => (
              <Pressable
                key={notice.id}
                onPress={() => !notice.isRead && markReadMutation.mutate({ noticeId: notice.id })}
                className={`gap-1.5 rounded-lg border p-4 ${
                  notice.isRead ? "border-border-subtle bg-surface" : "border-border-subtle bg-surface-elevated"
                }`}
              >
                <View className="flex-row items-start justify-between gap-2">
                  <View className="flex-1 flex-row items-start gap-2">
                    {!notice.isRead && <View className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary-container" />}
                    <Text
                      className={`flex-1 text-body-md ${notice.isRead ? "text-on-surface-variant" : "font-semibold text-on-surface"}`}
                    >
                      {notice.title}
                    </Text>
                  </View>
                  <Text className="text-meta-text text-text-muted">{formatPublishedAt(notice.publishedAt)}</Text>
                </View>
                <Text className={`text-body-sm ${notice.isRead ? "text-text-muted" : "text-on-surface-variant"}`} numberOfLines={2}>
                  {notice.body}
                </Text>
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
