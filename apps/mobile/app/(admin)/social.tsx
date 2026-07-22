import { useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  Pressable,
  Image,
  ActivityIndicator,
  Modal,
  TextInput,
  Platform,
  KeyboardAvoidingView,
  Alert,
  Linking,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { trpc } from "../../lib/trpc";
import { useAuthStore } from "../../stores/auth-store";
import { useUiStore } from "../../stores/ui-store";
import { getErrorMessage } from "../../lib/error-message";
import { hapticSuccess, hapticError, hapticTap } from "../../lib/haptics";
import { captureVisitorPhoto } from "../../lib/capture-visitor-photo";
import { Avatar } from "../../components/ui/avatar";
import { EmptyState } from "../../components/ui/empty-state";
import { ListLoading } from "../../components/ui/list-loading";
import { shadowCard } from "../../lib/shadows";

function timeAgo(iso: string | null) {
  if (!iso) return "";
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} d ago`;
  return new Date(iso).toLocaleDateString([], { day: "numeric", month: "short" });
}

const TABS = ["Feed", "Chat", "People"] as const;

/** Small orange "Management" pill shown on admin-authored posts/comments. */
function ManagementBadge() {
  return (
    <View className="flex-row items-center gap-1 rounded-full px-2 py-0.5" style={{ backgroundColor: "#4A3416" }}>
      <MaterialIcons name="verified" size={12} color="#F5821F" />
      <Text className="font-bold" style={{ fontSize: 10, color: "#F5821F" }}>
        MANAGEMENT
      </Text>
    </View>
  );
}

export default function AdminSocial() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  const [tab, setTab] = useState<(typeof TABS)[number]>("Feed");

  return (
    <View className="flex-1" style={{ backgroundColor: "#0D0D0D" }}>
      {/* Top bar */}
      <View className="flex-row items-center justify-between px-5 pb-3" style={{ paddingTop: insets.top + 10 }}>
        <Text className="font-extrabold text-on-surface" style={{ fontSize: 28, letterSpacing: -0.5 }}>
          Community
        </Text>
        <Pressable
          onPress={() => router.push("/(admin)/notifications")}
          hitSlop={8}
          className="h-11 w-11 items-center justify-center rounded-full bg-surface"
          style={shadowCard}
          accessibilityLabel="Alerts"
          accessibilityRole="button"
        >
          <MaterialIcons name="notifications-none" size={24} color="#C4C4C4" />
        </Pressable>
      </View>

      {/* Tabs */}
      <View className="mx-5 mb-2 flex-row rounded-full p-1" style={{ backgroundColor: "#1A1A1A" }}>
        {TABS.map((t) => {
          const active = tab === t;
          return (
            <Pressable
              key={t}
              onPress={() => setTab(t)}
              className="flex-1 items-center rounded-full py-2.5"
              style={{ backgroundColor: active ? "#F5821F" : "transparent" }}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
            >
              <Text className="text-body-md font-bold" style={{ color: active ? "#141118" : "#8A8A8A" }}>
                {t}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {tab === "Feed" ? <FeedTab adminName={user?.fullName ?? "Management"} /> : tab === "Chat" ? <ChatTab /> : <PeopleTab />}
    </View>
  );
}

/* -------------------------------- Feed -------------------------------- */

function FeedTab({ adminName }: { adminName: string }) {
  const utils = trpc.useUtils();
  const showToast = useUiStore((s) => s.showToast);
  const [composeOpen, setComposeOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [commentBody, setCommentBody] = useState("");

  const postsQuery = trpc.posts.list.useQuery();
  const commentsQuery = trpc.posts.listComments.useQuery({ postId: expandedId ?? "" }, { enabled: !!expandedId });

  const likeMutation = trpc.posts.toggleLike.useMutation({
    onSuccess: () => {
      hapticTap();
      utils.posts.list.invalidate();
    },
  });
  const addCommentMutation = trpc.posts.addComment.useMutation({
    onSuccess: () => {
      hapticSuccess();
      setCommentBody("");
      utils.posts.listComments.invalidate({ postId: expandedId ?? "" });
      utils.posts.list.invalidate();
    },
    onError: (e) => {
      hapticError();
      showToast(getErrorMessage(e), "error");
    },
  });
  const pinMutation = trpc.posts.setPinned.useMutation({
    onSuccess: (res) => {
      hapticSuccess();
      showToast(res.isPinned ? "Pinned to top" : "Unpinned", "success");
      utils.posts.list.invalidate();
    },
    onError: (e) => {
      hapticError();
      showToast(getErrorMessage(e), "error");
    },
  });
  const deletePostMutation = trpc.posts.adminDeletePost.useMutation({
    onSuccess: () => {
      hapticSuccess();
      showToast("Post removed", "success");
      setExpandedId(null);
      utils.posts.list.invalidate();
    },
    onError: (e) => {
      hapticError();
      showToast(getErrorMessage(e), "error");
    },
  });
  const deleteCommentMutation = trpc.posts.adminDeleteComment.useMutation({
    onSuccess: () => {
      hapticSuccess();
      showToast("Comment removed", "success");
      utils.posts.listComments.invalidate({ postId: expandedId ?? "" });
      utils.posts.list.invalidate();
    },
    onError: (e) => {
      hapticError();
      showToast(getErrorMessage(e), "error");
    },
  });

  const posts = postsQuery.data ?? [];

  function confirmDeletePost(postId: string) {
    Alert.alert("Remove post", "This permanently deletes the post and its comments for everyone. Continue?", [
      { text: "Cancel", style: "cancel" },
      { text: "Remove", style: "destructive", onPress: () => deletePostMutation.mutate({ postId }) },
    ]);
  }
  function postActions(postId: string, isPinned: boolean) {
    Alert.alert("Moderate post", undefined, [
      { text: isPinned ? "Unpin from top" : "Pin to top", onPress: () => pinMutation.mutate({ postId, pinned: !isPinned }) },
      { text: "Remove post", style: "destructive", onPress: () => confirmDeletePost(postId) },
      { text: "Cancel", style: "cancel" },
    ]);
  }

  return (
    <>
      <ScrollView
        contentContainerClassName="gap-3 px-4 pb-28 pt-1"
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={postsQuery.isRefetching} onRefresh={() => postsQuery.refetch()} />}
      >
        {/* Compose entry — admin posts as Management */}
        <Pressable
          onPress={() => setComposeOpen(true)}
          className="flex-row items-center gap-3 rounded-2xl bg-surface p-4"
          style={shadowCard}
          accessibilityLabel="Post an announcement"
          accessibilityRole="button"
        >
          <MaterialIcons name="campaign" size={20} color="#F5821F" />
          <Text className="flex-1 text-body-md text-text-muted">Post an update as Management…</Text>
          <MaterialIcons name="add-photo-alternate" size={22} color="#8A8A8A" />
        </Pressable>

        {postsQuery.isLoading ? (
          <ListLoading />
        ) : postsQuery.isError ? (
          <View className="rounded-xl bg-surface">
            <EmptyState title="Couldn't load feed" description="Pull down to refresh and try again." icon="error-outline" />
          </View>
        ) : posts.length === 0 ? (
          <View className="rounded-xl bg-surface">
            <EmptyState title="No posts yet" description="Share the first community update." icon="dynamic-feed" />
          </View>
        ) : (
          posts.map((post) => {
            const expanded = expandedId === post.id;
            const isMgmt = post.authorRole === "admin";
            return (
              <View
                key={post.id}
                className="gap-3 rounded-2xl bg-surface p-4"
                style={[shadowCard, post.isPinned ? { borderWidth: 1, borderColor: "#F5821F" } : null]}
              >
                {post.isPinned && (
                  <View className="flex-row items-center gap-1">
                    <MaterialIcons name="push-pin" size={13} color="#F5821F" />
                    <Text className="text-label-caps font-bold uppercase tracking-wider" style={{ color: "#F5821F", fontSize: 10 }}>
                      Pinned
                    </Text>
                  </View>
                )}
                <View className="flex-row items-center gap-3">
                  <Avatar name={post.authorName} size={40} />
                  <View className="min-w-0 flex-1">
                    <View className="flex-row items-center gap-2">
                      <Text className="min-w-0 flex-shrink text-body-md font-extrabold text-on-surface" numberOfLines={1}>
                        {post.authorName}
                      </Text>
                      {isMgmt && <ManagementBadge />}
                    </View>
                    {post.flatNumber && !isMgmt && <Text className="text-body-sm text-text-muted">{post.flatNumber}</Text>}
                  </View>
                  <Text className="text-body-sm text-text-muted">{timeAgo(post.createdAt)}</Text>
                  <Pressable
                    onPress={() => postActions(post.id, post.isPinned)}
                    hitSlop={8}
                    accessibilityLabel="Moderate post"
                    accessibilityRole="button"
                  >
                    <MaterialIcons name="more-vert" size={20} color="#8A8A8A" />
                  </Pressable>
                </View>

                <Text className="text-body-md text-on-surface-variant">{post.body}</Text>

                {post.imageUrl && (
                  <Image source={{ uri: post.imageUrl }} style={{ width: "100%", height: 220, borderRadius: 14 }} resizeMode="cover" />
                )}

                <View className="flex-row items-center justify-between border-t pt-2" style={{ borderTopColor: "#2A2A2A" }}>
                  <Pressable
                    onPress={() => pinMutation.mutate({ postId: post.id, pinned: !post.isPinned })}
                    className="flex-row items-center gap-1.5"
                    accessibilityLabel={post.isPinned ? "Unpin post" : "Pin post"}
                    accessibilityRole="button"
                  >
                    <MaterialIcons name="push-pin" size={16} color={post.isPinned ? "#F5821F" : "#8A8A8A"} />
                    <Text className="text-body-sm" style={{ color: post.isPinned ? "#F5821F" : "#8A8A8A" }}>
                      {post.isPinned ? "Pinned" : "Pin"}
                    </Text>
                  </Pressable>

                  <Pressable
                    onPress={() => setExpandedId(expanded ? null : post.id)}
                    className="flex-row items-center gap-1.5"
                    accessibilityLabel="Comments"
                    accessibilityRole="button"
                  >
                    <MaterialIcons name="chat-bubble-outline" size={16} color="#8A8A8A" />
                    <Text className="text-body-sm text-text-muted">{post.commentCount} Comments</Text>
                  </Pressable>

                  <Pressable
                    onPress={() => likeMutation.mutate({ postId: post.id })}
                    className="flex-row items-center gap-1.5"
                    accessibilityLabel={post.isLiked ? "Unlike" : "Like"}
                    accessibilityRole="button"
                  >
                    <MaterialIcons name={post.isLiked ? "thumb-up" : "thumb-up-off-alt"} size={16} color={post.isLiked ? "#F5821F" : "#8A8A8A"} />
                    <Text className="text-body-sm font-bold" style={{ color: post.isLiked ? "#F5821F" : "#8A8A8A" }}>
                      {post.likeCount} likes
                    </Text>
                  </Pressable>
                </View>

                {expanded && (
                  <View className="gap-3 border-t pt-3" style={{ borderTopColor: "#2A2A2A" }}>
                    {commentsQuery.isLoading ? (
                      <ActivityIndicator color="#F5821F" />
                    ) : (commentsQuery.data ?? []).length === 0 ? (
                      <Text className="text-body-sm text-text-muted">No comments yet.</Text>
                    ) : (
                      <View className="gap-2">
                        {(commentsQuery.data ?? []).map((c) => (
                          <View key={c.id} className="flex-row gap-2">
                            <Avatar name={c.authorName} size={28} />
                            <View className="min-w-0 flex-1 rounded-xl p-2.5" style={{ backgroundColor: "#242424" }}>
                              <View className="flex-row items-center gap-2">
                                <Text className="min-w-0 flex-shrink text-body-sm font-bold text-on-surface" numberOfLines={1}>
                                  {c.authorName}
                                  {c.flatNumber && c.authorRole !== "admin" ? ` · ${c.flatNumber}` : ""}
                                </Text>
                                {c.authorRole === "admin" && <ManagementBadge />}
                              </View>
                              <Text className="text-body-sm text-on-surface-variant">{c.body}</Text>
                            </View>
                            <Pressable
                              onPress={() =>
                                Alert.alert("Remove comment", "Delete this comment for everyone?", [
                                  { text: "Cancel", style: "cancel" },
                                  { text: "Remove", style: "destructive", onPress: () => deleteCommentMutation.mutate({ commentId: c.id }) },
                                ])
                              }
                              hitSlop={6}
                              accessibilityLabel="Remove comment"
                              accessibilityRole="button"
                            >
                              <MaterialIcons name="delete-outline" size={18} color="#8A8A8A" />
                            </Pressable>
                          </View>
                        ))}
                      </View>
                    )}
                    <View className="flex-row items-center gap-2">
                      <TextInput
                        placeholder="Reply as Management…"
                        placeholderTextColor="#7E7E7E"
                        value={commentBody}
                        onChangeText={setCommentBody}
                        className="flex-1 rounded-full px-4 py-2.5 text-body-md text-on-surface"
                        style={{ backgroundColor: "#242424" }}
                      />
                      <Pressable
                        disabled={!commentBody.trim() || addCommentMutation.isPending}
                        onPress={() => addCommentMutation.mutate({ postId: post.id, body: commentBody.trim() })}
                        className="h-10 w-10 items-center justify-center rounded-full"
                        style={{ backgroundColor: "#F5821F" }}
                        accessibilityLabel="Send reply"
                        accessibilityRole="button"
                      >
                        <MaterialIcons name="send" size={18} color="#141118" />
                      </Pressable>
                    </View>
                  </View>
                )}
              </View>
            );
          })
        )}
      </ScrollView>

      <ComposeModal open={composeOpen} onClose={() => setComposeOpen(false)} adminName={adminName} />
    </>
  );
}

function ComposeModal({ open, onClose, adminName }: { open: boolean; onClose: () => void; adminName: string }) {
  const insets = useSafeAreaInsets();
  const utils = trpc.useUtils();
  const showToast = useUiStore((s) => s.showToast);
  const [body, setBody] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);
  const [capturing, setCapturing] = useState(false);

  const createMutation = trpc.posts.create.useMutation({
    onSuccess: () => {
      hapticSuccess();
      showToast("Posted to community", "success");
      setBody("");
      setPhoto(null);
      utils.posts.list.invalidate();
      onClose();
    },
    onError: (e) => {
      hapticError();
      showToast(getErrorMessage(e), "error");
    },
  });

  async function attach() {
    setCapturing(true);
    try {
      const url = await captureVisitorPhoto();
      if (url) setPhoto(url);
    } catch {
      showToast("Couldn't add photo — camera unavailable.", "error");
    } finally {
      setCapturing(false);
    }
  }

  return (
    <Modal visible={open} animationType="slide" transparent onRequestClose={onClose}>
      <View className="flex-1 justify-end" style={{ backgroundColor: "rgba(0,0,0,0.6)" }}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <View className="gap-4 rounded-t-3xl bg-surface px-5 pt-5" style={{ paddingBottom: insets.bottom + 20 }}>
            <View className="flex-row items-center justify-between">
              <View>
                <Text className="text-headline-md font-extrabold text-on-surface">New Announcement</Text>
                <Text className="text-body-sm text-text-muted">Posting as {adminName} · Management</Text>
              </View>
              <Pressable onPress={onClose} hitSlop={8} accessibilityLabel="Close" accessibilityRole="button">
                <MaterialIcons name="close" size={24} color="#C4C4C4" />
              </Pressable>
            </View>

            <TextInput
              placeholder="Share an update with the whole society…"
              placeholderTextColor="#7E7E7E"
              value={body}
              onChangeText={setBody}
              multiline
              className="min-h-[100px] rounded-2xl p-4 text-body-md text-on-surface"
              style={{ backgroundColor: "#242424", textAlignVertical: "top" }}
            />

            {photo ? (
              <View className="flex-row items-center gap-3">
                <Image source={{ uri: photo }} style={{ width: 64, height: 64, borderRadius: 10 }} />
                <Pressable onPress={() => setPhoto(null)} accessibilityLabel="Remove photo" accessibilityRole="button">
                  <Text className="text-body-sm font-bold text-status-red">Remove photo</Text>
                </Pressable>
              </View>
            ) : (
              <Pressable
                onPress={attach}
                disabled={capturing}
                className="flex-row items-center gap-2 self-start rounded-full px-4 py-2.5"
                style={{ backgroundColor: "#242424" }}
                accessibilityLabel="Add photo"
                accessibilityRole="button"
              >
                {capturing ? (
                  <ActivityIndicator size="small" color="#F5821F" />
                ) : (
                  <MaterialIcons name="add-photo-alternate" size={20} color="#F5821F" />
                )}
                <Text className="text-body-md font-bold" style={{ color: "#F5821F" }}>
                  Add photo
                </Text>
              </Pressable>
            )}

            <Pressable
              onPress={() => body.trim() && createMutation.mutate({ body: body.trim(), imageBase64: photo ?? undefined })}
              disabled={!body.trim() || createMutation.isPending}
              className="items-center justify-center rounded-full py-3.5"
              style={{ backgroundColor: body.trim() ? "#F5821F" : "#4A3416" }}
              accessibilityLabel="Publish announcement"
              accessibilityRole="button"
            >
              <Text className="text-body-lg font-bold" style={{ color: "#141118" }}>
                {createMutation.isPending ? "Posting…" : "Post to Community"}
              </Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

/* -------------------------------- Chat -------------------------------- */

function chatTime(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  if (d.toDateString() === new Date().toDateString()) return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return d.toLocaleDateString([], { day: "numeric", month: "short" });
}

function ChatTab() {
  const router = useRouter();
  const convQuery = trpc.chat.conversations.useQuery(undefined, { refetchInterval: 8000 });
  const convs = convQuery.data ?? [];

  return (
    <ScrollView
      contentContainerClassName="gap-2 px-4 pb-28 pt-1"
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={convQuery.isRefetching} onRefresh={() => convQuery.refetch()} />}
    >
      {convQuery.isLoading ? (
        <ListLoading />
      ) : convs.length === 0 ? (
        <View className="flex-1 items-center justify-center px-8 pt-24">
          <View className="items-center justify-center rounded-full" style={{ width: 80, height: 80, backgroundColor: "#1A1A1A" }}>
            <MaterialIcons name="chat-bubble-outline" size={40} color="#F5821F" />
          </View>
          <Text className="pt-4 text-headline-md font-extrabold text-on-surface">No chats yet</Text>
          <Text className="pt-2 text-center text-body-md text-text-muted">
            Open the People tab and tap the chat icon next to any resident or guard to start a conversation.
          </Text>
        </View>
      ) : (
        convs.map((c) => (
          <Pressable
            key={c.peerId}
            onPress={() => router.push(`/(admin)/chat?peerId=${c.peerId}&name=${encodeURIComponent(c.peerName)}`)}
            className="flex-row items-center gap-3 rounded-2xl bg-surface p-3.5"
            style={shadowCard}
            accessibilityLabel={`Chat with ${c.peerName}`}
            accessibilityRole="button"
          >
            <Avatar name={c.peerName} size={48} />
            <View className="min-w-0 flex-1">
              <View className="flex-row items-center justify-between gap-2">
                <Text className="min-w-0 flex-1 text-body-md font-extrabold text-on-surface" numberOfLines={1}>
                  {c.peerName}
                  {c.peerFlat ? ` · ${c.peerFlat}` : ""}
                </Text>
                <Text className="text-meta-text text-text-muted">{chatTime(c.lastAt)}</Text>
              </View>
              <View className="flex-row items-center justify-between gap-2">
                <Text
                  className={`min-w-0 flex-1 text-body-sm ${c.unreadCount > 0 ? "font-bold text-on-surface" : "text-text-muted"}`}
                  numberOfLines={1}
                >
                  {c.lastMessage}
                </Text>
                {c.unreadCount > 0 && (
                  <View className="h-5 min-w-5 items-center justify-center rounded-full px-1.5" style={{ backgroundColor: "#F5821F" }}>
                    <Text className="font-bold" style={{ color: "#141118", fontSize: 11, lineHeight: 14 }}>
                      {c.unreadCount > 9 ? "9+" : c.unreadCount}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </Pressable>
        ))
      )}
    </ScrollView>
  );
}

/* -------------------------------- People -------------------------------- */

function PeopleTab() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "resident" | "guard">("all");

  const residentsQuery = trpc.admin.listResidents.useQuery();
  const guardsQuery = trpc.admin.listGuards.useQuery();

  const people = useMemo(() => {
    const all = [...(residentsQuery.data ?? []), ...(guardsQuery.data ?? [])];
    const q = search.trim().toLowerCase();
    return all
      .filter((p) => filter === "all" || p.role === filter)
      .filter(
        (p) =>
          q.length === 0 ||
          p.fullName.toLowerCase().includes(q) ||
          p.phone.includes(q) ||
          (p.flatNumber ?? "").toLowerCase().includes(q),
      )
      .sort((a, b) => a.fullName.localeCompare(b.fullName));
  }, [residentsQuery.data, guardsQuery.data, search, filter]);

  const loading = residentsQuery.isLoading || guardsQuery.isLoading;

  return (
    <ScrollView
      contentContainerClassName="gap-2 px-4 pb-28 pt-1"
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        <RefreshControl
          refreshing={residentsQuery.isRefetching || guardsQuery.isRefetching}
          onRefresh={() => {
            residentsQuery.refetch();
            guardsQuery.refetch();
          }}
        />
      }
    >
      <View className="flex-row items-center gap-3 rounded-full px-4" style={{ backgroundColor: "#1A1A1A" }}>
        <MaterialIcons name="search" size={20} color="#8A8A8A" />
        <TextInput
          placeholder="Search residents & guards"
          placeholderTextColor="#7E7E7E"
          value={search}
          onChangeText={setSearch}
          className="flex-1 py-3 text-body-md text-on-surface"
        />
      </View>

      {/* Role filter chips */}
      <View className="flex-row gap-2 pt-1">
        {(["all", "resident", "guard"] as const).map((f) => {
          const active = filter === f;
          return (
            <Pressable
              key={f}
              onPress={() => setFilter(f)}
              className="rounded-full px-4 py-1.5"
              style={{ backgroundColor: active ? "#F5821F" : "#1A1A1A" }}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
            >
              <Text className="text-body-sm font-bold capitalize" style={{ color: active ? "#141118" : "#8A8A8A" }}>
                {f === "all" ? "Everyone" : `${f}s`}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {loading ? (
        <ListLoading />
      ) : people.length === 0 ? (
        <View className="rounded-xl bg-surface">
          <EmptyState title="No people found" description="Try a different search or filter." icon="contacts" />
        </View>
      ) : (
        people.map((p) => (
          <View key={p.id} className="flex-row items-center gap-3 rounded-2xl bg-surface p-3" style={shadowCard}>
            <Avatar name={p.fullName} size={46} />
            <View className="min-w-0 flex-1">
              <Text className="text-body-md font-extrabold text-on-surface" numberOfLines={1}>
                {p.fullName}
              </Text>
              <Text className="text-body-sm text-text-muted" numberOfLines={1}>
                {p.role === "guard" ? "Security Guard" : `Resident${p.flatNumber ? ` · ${p.flatNumber}` : ""}`}
              </Text>
            </View>
            <Pressable
              onPress={() => Linking.openURL(`tel:${p.phone}`)}
              className="h-10 w-10 items-center justify-center rounded-full"
              style={{ backgroundColor: "#242424" }}
              hitSlop={4}
              accessibilityLabel={`Call ${p.fullName}`}
              accessibilityRole="button"
            >
              <MaterialIcons name="call" size={19} color="#F5821F" />
            </Pressable>
            <Pressable
              onPress={() => router.push(`/(admin)/chat?peerId=${p.id}&name=${encodeURIComponent(p.fullName)}`)}
              className="h-10 w-10 items-center justify-center rounded-full"
              style={{ backgroundColor: "#242424" }}
              hitSlop={4}
              accessibilityLabel={`Chat with ${p.fullName}`}
              accessibilityRole="button"
            >
              <MaterialIcons name="chat-bubble-outline" size={18} color="#F5821F" />
            </Pressable>
          </View>
        ))
      )}
    </ScrollView>
  );
}
