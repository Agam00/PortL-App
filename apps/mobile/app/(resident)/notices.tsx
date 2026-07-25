import { useState } from "react";
import { View, Text, ScrollView, RefreshControl, Pressable, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import type { NoticeOutput } from "@repo/services/notice/model";
import type { PollOutput } from "@repo/services/poll/model";
import { trpc } from "../../lib/trpc";
import { useUiStore } from "../../stores/ui-store";
import { getErrorMessage } from "../../lib/error-message";
import { hapticSuccess, hapticError, hapticTap } from "../../lib/haptics";
import { EmptyState } from "../../components/ui/empty-state";
import { Input } from "../../components/ui/input";
import { ListLoading } from "../../components/ui/list-loading";
import { shadowCard } from "../../lib/shadows";

function timeLabel(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  return `${d.toLocaleDateString([], { day: "numeric", month: "short" })}, ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
}

function closesInLabel(closesAt: string | null) {
  if (!closesAt) return null;
  const diffMs = new Date(closesAt).getTime() - Date.now();
  if (diffMs <= 0) return null;
  const days = Math.floor(diffMs / 86_400_000);
  if (days >= 1) return `${days} day${days === 1 ? "" : "s"} left`;
  const hours = Math.max(1, Math.floor(diffMs / 3_600_000));
  return `${hours}h left`;
}

type FeedItem = { kind: "notice"; sort: number; notice: NoticeOutput } | { kind: "poll"; sort: number; poll: PollOutput };

export default function ResidentNotices() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const showToast = useUiStore((s) => s.showToast);
  const utils = trpc.useUtils();

  const [expandedComments, setExpandedComments] = useState<string | null>(null);
  const [commentBody, setCommentBody] = useState("");
  const [selections, setSelections] = useState<Record<string, string[]>>({});

  const noticesQuery = trpc.notices.listForResident.useQuery({});
  const pollsQuery = trpc.polls.listForResident.useQuery();
  const commentsQuery = trpc.notices.listComments.useQuery(
    { noticeId: expandedComments ?? "" },
    { enabled: !!expandedComments },
  );

  const reactMutation = trpc.notices.react.useMutation({
    onSuccess: () => {
      hapticTap();
      utils.notices.listForResident.invalidate();
    },
    onError: (e) => showToast(getErrorMessage(e), "error"),
  });
  const markReadMutation = trpc.notices.markRead.useMutation({
    onSuccess: () => utils.notices.listForResident.invalidate(),
  });
  const addCommentMutation = trpc.notices.addComment.useMutation({
    onSuccess: () => {
      hapticSuccess();
      setCommentBody("");
      utils.notices.listComments.invalidate({ noticeId: expandedComments ?? "" });
      utils.notices.listForResident.invalidate();
    },
    onError: (e) => {
      hapticError();
      showToast(getErrorMessage(e), "error");
    },
  });
  const voteMutation = trpc.polls.vote.useMutation({
    onSuccess: () => {
      hapticSuccess();
      showToast("Vote submitted", "success");
      utils.polls.listForResident.invalidate();
    },
    onError: (e) => {
      hapticError();
      showToast(getErrorMessage(e), "error");
    },
  });

  const notices = noticesQuery.data ?? [];
  const polls = pollsQuery.data ?? [];

  const feed: FeedItem[] = [
    ...notices.map((n) => ({ kind: "notice" as const, sort: n.publishedAt ? new Date(n.publishedAt).getTime() : 0, notice: n })),
    ...polls.map((p) => ({ kind: "poll" as const, sort: p.createdAt ? new Date(p.createdAt).getTime() : 0, poll: p })),
  ].sort((a, b) => b.sort - a.sort);

  const loading = noticesQuery.isLoading || pollsQuery.isLoading;
  const isError = noticesQuery.isError && pollsQuery.isError;

  function onReact(notice: NoticeOutput, target: "like" | "dislike") {
    reactMutation.mutate({ noticeId: notice.id, reaction: notice.myReaction === target ? "none" : target });
  }

  function openComments(noticeId: string, isRead: boolean) {
    setExpandedComments((cur) => (cur === noticeId ? null : noticeId));
    if (!isRead) markReadMutation.mutate({ noticeId });
  }

  function toggleOption(pollId: string, optionId: string, multiSelect: boolean) {
    setSelections((prev) => {
      const current = prev[pollId] ?? [];
      if (multiSelect) {
        return { ...prev, [pollId]: current.includes(optionId) ? current.filter((id) => id !== optionId) : [...current, optionId] };
      }
      return { ...prev, [pollId]: [optionId] };
    });
  }

  return (
    <View className="flex-1" style={{ backgroundColor: "#0D0D0D" }}>
      {/* Header */}
      <View className="flex-row items-center gap-3 px-5 pb-3" style={{ paddingTop: insets.top + 10 }}>
        <Pressable onPress={() => router.back()} hitSlop={8} accessibilityLabel="Back" accessibilityRole="button">
          <MaterialIcons name="arrow-back" size={24} color="#F5F5F5" />
        </Pressable>
        <Text className="text-headline-lg font-extrabold text-on-surface">Notice Board</Text>
      </View>

      <ScrollView
        contentContainerClassName="gap-4 px-4 pb-24 pt-1"
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl tintColor="#F5821F" colors={["#F5821F"]} progressBackgroundColor="#1A1A1A"
            refreshing={noticesQuery.isRefetching || pollsQuery.isRefetching}
            onRefresh={() => {
              noticesQuery.refetch();
              pollsQuery.refetch();
            }}
          />
        }
      >
        {loading ? (
          <ListLoading />
        ) : isError ? (
          <View className="rounded-xl bg-surface">
            <EmptyState title="Couldn't load the board" description="Pull down to refresh and try again." icon="error-outline" />
          </View>
        ) : feed.length === 0 ? (
          <View className="rounded-xl bg-surface">
            <EmptyState title="Nothing here yet" description="Announcements and polls will show up here." icon="campaign" />
          </View>
        ) : (
          feed.map((item) =>
            item.kind === "notice" ? (
              <NoticeCard
                key={`n-${item.notice.id}`}
                notice={item.notice}
                commentsExpanded={expandedComments === item.notice.id}
                comments={expandedComments === item.notice.id ? (commentsQuery.data ?? []) : []}
                commentsLoading={expandedComments === item.notice.id && commentsQuery.isLoading}
                onReact={onReact}
                onToggleComments={() => openComments(item.notice.id, item.notice.isRead)}
                commentBody={commentBody}
                setCommentBody={setCommentBody}
                onSendComment={() => addCommentMutation.mutate({ noticeId: item.notice.id, body: commentBody.trim() })}
                sendDisabled={!commentBody.trim() || addCommentMutation.isPending}
              />
            ) : (
              <PollCard
                key={`p-${item.poll.id}`}
                poll={item.poll}
                selection={selections[item.poll.id] ?? []}
                onToggleOption={(optId) => toggleOption(item.poll.id, optId, item.poll.multiSelect)}
                onVote={() => voteMutation.mutate({ pollId: item.poll.id, optionIds: selections[item.poll.id] ?? [] })}
                voting={voteMutation.isPending}
              />
            ),
          )
        )}
      </ScrollView>
    </View>
  );
}

function NoticeCard({
  notice,
  commentsExpanded,
  comments,
  commentsLoading,
  onReact,
  onToggleComments,
  commentBody,
  setCommentBody,
  onSendComment,
  sendDisabled,
}: {
  notice: NoticeOutput;
  commentsExpanded: boolean;
  comments: { id: string; authorName: string; authorRole: string; body: string; createdAt: string | null }[];
  commentsLoading: boolean;
  onReact: (n: NoticeOutput, target: "like" | "dislike") => void;
  onToggleComments: () => void;
  commentBody: string;
  setCommentBody: (v: string) => void;
  onSendComment: () => void;
  sendDisabled: boolean;
}) {
  const liked = notice.myReaction === "like";
  const disliked = notice.myReaction === "dislike";
  return (
    <View className="gap-3 rounded-2xl bg-surface p-4" style={shadowCard}>
      <View className="flex-row items-center gap-2">
        <MaterialIcons name="campaign" size={18} color="#2E7D32" />
        <Text className="text-body-md font-extrabold" style={{ color: "#2E7D32" }}>
          Announcement
        </Text>
      </View>
      <Text className="text-body-lg font-bold text-on-surface">{notice.title}</Text>
      <Text className="text-body-md text-on-surface-variant">{notice.body}</Text>
      <Text className="text-body-sm text-text-muted">
        Posted by <Text className="font-bold text-on-surface-variant">{notice.authorName}</Text> · {timeLabel(notice.publishedAt)}
      </Text>

      <View className="my-0.5 h-px" style={{ backgroundColor: "#2A2A2A" }} />

      <View className="flex-row items-center gap-6">
        <Pressable
          onPress={() => onReact(notice, "like")}
          className="flex-row items-center gap-1.5"
          accessibilityRole="button"
          accessibilityLabel={`Like${liked ? ", selected" : ""}`}
        >
          <MaterialIcons name={liked ? "thumb-up" : "thumb-up-off-alt"} size={18} color={liked ? "#2E7D32" : "#8A8A8A"} />
          <Text className="text-body-sm font-bold" style={{ color: liked ? "#2E7D32" : "#8A8A8A" }}>
            {notice.likeCount}
          </Text>
        </Pressable>
        <Pressable
          onPress={() => onReact(notice, "dislike")}
          className="flex-row items-center gap-1.5"
          accessibilityRole="button"
          accessibilityLabel={`Dislike${disliked ? ", selected" : ""}`}
        >
          <MaterialIcons name={disliked ? "thumb-down" : "thumb-down-off-alt"} size={18} color={disliked ? "#BA1A1A" : "#8A8A8A"} />
          <Text className="text-body-sm font-bold" style={{ color: disliked ? "#BA1A1A" : "#8A8A8A" }}>
            {notice.dislikeCount}
          </Text>
        </Pressable>
        <Pressable
          onPress={onToggleComments}
          className="flex-row items-center gap-1.5"
          accessibilityRole="button"
          accessibilityLabel="Comments"
        >
          <MaterialIcons name="chat-bubble-outline" size={16} color="#8A8A8A" />
          <Text className="text-body-sm text-text-muted">
            {String(notice.commentCount).padStart(2, "0")} Comments
          </Text>
        </Pressable>
      </View>

      {commentsExpanded && (
        <View className="gap-3 border-t border-outline-variant pt-3">
          {commentsLoading ? (
            <ActivityIndicator color="#F5821F" />
          ) : comments.length === 0 ? (
            <Text className="text-body-sm text-text-muted">No comments yet. Be the first!</Text>
          ) : (
            <View className="gap-2">
              {comments.map((c) => (
                <View key={c.id} className="rounded-md bg-surface-container p-3">
                  <View className="flex-row items-center justify-between">
                    <Text className="text-body-sm font-bold text-on-surface">
                      {c.authorName} {c.authorRole !== "resident" ? `(${c.authorRole})` : ""}
                    </Text>
                    <Text className="text-meta-text text-text-muted">{timeLabel(c.createdAt)}</Text>
                  </View>
                  <Text className="text-body-sm text-on-surface-variant">{c.body}</Text>
                </View>
              ))}
            </View>
          )}
          <View className="flex-row items-center gap-2">
            <View className="flex-1">
              <Input placeholder="Add a comment..." value={commentBody} onChangeText={setCommentBody} />
            </View>
            <Pressable
              disabled={sendDisabled}
              onPress={onSendComment}
              className="h-11 w-11 items-center justify-center rounded-full bg-primary-container"
              accessibilityLabel="Send comment"
              accessibilityRole="button"
            >
              <MaterialIcons name="send" size={18} color="#fff" />
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}

function PollCard({
  poll,
  selection,
  onToggleOption,
  onVote,
  voting,
}: {
  poll: PollOutput;
  selection: string[];
  onToggleOption: (optionId: string) => void;
  onVote: () => void;
  voting: boolean;
}) {
  const voted = poll.myVote.length > 0;
  const showResults = voted || poll.isClosed;
  const closesLabel = closesInLabel(poll.closesAt);

  return (
    <View className="gap-3 rounded-2xl bg-surface p-4" style={shadowCard}>
      <View className="flex-row items-center gap-2">
        <MaterialIcons name="bar-chart" size={18} color="#B7791F" />
        <Text className="text-body-md font-extrabold" style={{ color: "#B7791F" }}>
          Poll
        </Text>
      </View>
      <Text className="text-body-lg font-bold text-on-surface">{poll.question}</Text>

      {showResults ? (
        <View className="gap-3">
          {poll.options.map((option) => {
            const pct = poll.totalVotes > 0 ? Math.round((option.voteCount / poll.totalVotes) * 100) : 0;
            const isMine = poll.myVote.includes(option.id);
            return (
              <View
                key={option.id}
                className="overflow-hidden rounded-xl"
                style={{ backgroundColor: "#242424" }}
              >
                <View
                  style={{
                    position: "absolute",
                    left: 0,
                    top: 0,
                    bottom: 0,
                    width: `${pct}%`,
                    backgroundColor: isMine ? "rgba(245,130,31,0.28)" : "rgba(183,121,31,0.18)",
                  }}
                />
                <View className="flex-row items-center justify-between px-4 py-3">
                  <Text className={`text-body-md ${isMine ? "font-extrabold" : "font-medium text-on-surface"}`} style={isMine ? { color: "#FF9A3D" } : undefined}>
                    {option.label}
                  </Text>
                  <Text className="text-body-md font-extrabold text-on-surface">{pct}%</Text>
                </View>
              </View>
            );
          })}
        </View>
      ) : (
        <>
          <View className="gap-2.5">
            {poll.options.map((option) => {
              const selected = selection.includes(option.id);
              return (
                <Pressable
                  key={option.id}
                  onPress={() => onToggleOption(option.id)}
                  className="flex-row items-center gap-3 rounded-xl px-4 py-3.5"
                  style={{ borderWidth: selected ? 2 : 1, borderColor: selected ? "#F5821F" : "#333333", backgroundColor: selected ? "#242424" : "#1A1A1A" }}
                  accessibilityRole={poll.multiSelect ? "checkbox" : "radio"}
                  accessibilityState={{ selected }}
                >
                  <MaterialIcons
                    name={
                      poll.multiSelect
                        ? selected
                          ? "check-box"
                          : "check-box-outline-blank"
                        : selected
                          ? "radio-button-checked"
                          : "radio-button-unchecked"
                    }
                    size={20}
                    color={selected ? "#F5821F" : "#6E6E6E"}
                  />
                  <Text className="flex-1 text-body-md text-on-surface">{option.label}</Text>
                </Pressable>
              );
            })}
          </View>
          <Pressable
            disabled={selection.length === 0 || voting}
            onPress={onVote}
            className="h-12 flex-row items-center justify-center gap-2 rounded-full"
            style={{ backgroundColor: selection.length === 0 ? "#7A5320" : "#F5821F" }}
            accessibilityLabel="Vote now"
            accessibilityRole="button"
          >
            <Text className="text-body-md font-bold text-white">{voting ? "Submitting..." : "Vote Now"}</Text>
            {!voting && <MaterialIcons name="how-to-vote" size={18} color="#fff" />}
          </Pressable>
        </>
      )}

      <View className="mt-0.5 h-px" style={{ backgroundColor: "#2A2A2A" }} />
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-1.5">
          <MaterialIcons name={poll.isClosed ? "lock-clock" : "schedule"} size={15} color="#8A8A8A" />
          <Text className="text-body-sm text-text-muted">{poll.isClosed ? "Closed" : (closesLabel ?? "Open")}</Text>
        </View>
        <View className="flex-row items-center gap-1.5">
          <MaterialIcons name="groups" size={16} color="#8A8A8A" />
          <Text className="text-body-sm text-text-muted">{poll.totalVotes} Responded</Text>
        </View>
      </View>
    </View>
  );
}
