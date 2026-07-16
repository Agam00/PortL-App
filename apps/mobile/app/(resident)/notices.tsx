import { useState } from "react";
import { View, Text, ScrollView, RefreshControl, Pressable } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { trpc } from "../../lib/trpc";
import { ScreenHeader } from "../../components/ui/screen-header";
import { Input } from "../../components/ui/input";
import { EmptyState } from "../../components/ui/empty-state";
import { ListLoading } from "../../components/ui/list-loading";
import { shadowCard } from "../../lib/shadows";

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
      <ScreenHeader title="Notice Board" role="resident" />
      <ScrollView
        contentContainerClassName="gap-4 p-4 pb-8"
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={noticesQuery.isRefetching} onRefresh={() => noticesQuery.refetch()} />}
      >
        <Text className="text-body-sm text-text-muted">Stay updated with the latest community announcements.</Text>
        <Input
          placeholder="Search notices..."
          value={search}
          onChangeText={setSearch}
          leftElement={<MaterialIcons name="search" size={20} color="#797585" />}
        />

        {noticesQuery.isLoading ? (
          <ListLoading />
        ) : notices.length === 0 ? (
          <View className="rounded-card bg-surface">
            <EmptyState title="No notices yet" description="Society announcements will show up here." icon="campaign" />
          </View>
        ) : (
          <View className="gap-3">
            {notices.map((notice) => (
              <Pressable
                key={notice.id}
                onPress={() => !notice.isRead && markReadMutation.mutate({ noticeId: notice.id })}
                className="gap-2 rounded-card bg-surface p-4"
                style={shadowCard}
              >
                <View className="flex-row items-start justify-between gap-2">
                  <View className="flex-1 flex-row items-center gap-2">
                    {!notice.isRead && <View className="h-2 w-2 rounded-full bg-primary-container" />}
                    <Text className="text-meta-text text-text-muted">{formatPublishedAt(notice.publishedAt)}</Text>
                  </View>
                </View>
                <Text
                  className={`text-body-md ${notice.isRead ? "text-on-surface-variant" : "font-extrabold text-on-surface"}`}
                >
                  {notice.title}
                </Text>
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
