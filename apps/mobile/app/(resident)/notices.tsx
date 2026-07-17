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

  if (isToday) return `Today, ${date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`;
  if (isYesterday) return "Yesterday";
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

export default function ResidentNotices() {
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
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

  function openNotice(noticeId: string, isRead: boolean) {
    setExpandedId((current) => (current === noticeId ? null : noticeId));
    if (!isRead) markReadMutation.mutate({ noticeId });
  }

  return (
    <View className="flex-1" style={{ backgroundColor: "#FAF7FD" }}>
      <ScreenHeader
        title="Notice Board"
        subtitle="Stay updated with the latest community announcements."
        role="resident"
      />
      <ScrollView
        contentContainerClassName="gap-4 px-5 pb-8 pt-2"
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={noticesQuery.isRefetching} onRefresh={() => noticesQuery.refetch()} />}
      >
        <Input
          placeholder="Search notices..."
          value={search}
          onChangeText={setSearch}
          leftElement={<MaterialIcons name="search" size={20} color="#797585" />}
        />

        {noticesQuery.isLoading ? (
          <ListLoading />
        ) : notices.length === 0 ? (
          <View className="rounded-xl bg-surface">
            <EmptyState title="No notices yet" description="Society announcements will show up here." icon="campaign" />
          </View>
        ) : (
          <View className="gap-4">
            {notices.map((notice) => {
              const expanded = expandedId === notice.id;
              return (
                <Pressable
                  key={notice.id}
                  onPress={() => openNotice(notice.id, notice.isRead)}
                  className="gap-2 rounded-xl bg-surface p-5"
                  style={shadowCard}
                  accessibilityLabel={`Notice: ${notice.title}`}
                  accessibilityRole="button"
                >
                  <View className="flex-row items-center justify-between gap-2">
                    <View className="flex-row items-center gap-2">
                      <MaterialIcons name="campaign" size={16} color="#797585" />
                      <Text className="text-meta-text text-text-muted">{formatPublishedAt(notice.publishedAt)}</Text>
                    </View>
                    {!notice.isRead && (
                      <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: "#B9A8F0" }} />
                    )}
                  </View>
                  <Text
                    className={`text-headline-md ${notice.isRead ? "font-bold text-on-surface-variant" : "font-extrabold text-on-surface"}`}
                  >
                    {notice.title}
                  </Text>
                  <Text
                    className={`text-body-md ${notice.isRead ? "text-text-muted" : "text-on-surface-variant"}`}
                    numberOfLines={expanded ? undefined : 3}
                  >
                    {notice.body}
                  </Text>
                  <View className="flex-row items-center gap-1 pt-1">
                    <Text className="text-body-md font-bold text-primary">
                      {expanded ? "Show less" : "Read more"}
                    </Text>
                    <MaterialIcons name={expanded ? "arrow-upward" : "arrow-forward"} size={16} color="#6244CD" />
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
