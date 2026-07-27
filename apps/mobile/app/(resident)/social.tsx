import { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  Pressable,
  Image,
  ActivityIndicator,
  Linking,
  Modal,
  TextInput,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { trpc } from "../../lib/trpc";
import { useAuthStore } from "../../stores/auth-store";
import { useUiStore } from "../../stores/ui-store";
import { getErrorMessage } from "../../lib/error-message";
import { RoleTag } from "../../components/ui/role-tag";
import { useManualRefresh } from "../../hooks/use-manual-refresh";
import { hapticSuccess, hapticError, hapticTap } from "../../lib/haptics";
import { captureVisitorPhoto, pickImageFromGallery } from "../../lib/capture-visitor-photo";
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

const TABS = ["Post", "Chat", "Residents"] as const;

export default function ResidentSocial() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  const [tab, setTab] = useState<(typeof TABS)[number]>("Post");

  const notificationsQuery = trpc.notifications.list.useQuery(undefined, { refetchInterval: 15_000 });
  const unread = (notificationsQuery.data ?? []).filter((n) => !n.readAt).length;

  return (
    <View className="flex-1" style={{ backgroundColor: "#0D0D0D" }}>
      {/* Top bar */}
      <View className="flex-row items-center justify-between px-5 pb-3" style={{ paddingTop: insets.top + 10 }}>
        <Pressable
          onPress={() => router.push("/(resident)/notifications")}
          hitSlop={8}
          className="relative h-11 w-11 items-center justify-center rounded-full bg-surface"
          style={shadowCard}
          accessibilityLabel="Notifications"
          accessibilityRole="button"
        >
          <MaterialIcons name="notifications-none" size={24} color="#C4C4C4" />
          {unread > 0 && (
            <View className="absolute right-1 top-1 h-4 min-w-4 items-center justify-center rounded-full bg-status-red-strong px-1">
              <Text className="font-bold text-white" style={{ fontSize: 10, lineHeight: 12 }}>
                {unread > 9 ? "9+" : unread}
              </Text>
            </View>
          )}
        </Pressable>
        <Text className="text-headline-md font-extrabold text-on-surface">Social</Text>
        <Pressable onPress={() => router.push("/(resident)/profile")} hitSlop={8} accessibilityLabel="Profile" accessibilityRole="button">
          <View className="rounded-full" style={shadowCard}>
            <Avatar name={user?.fullName ?? "Resident"} size={44} />
          </View>
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

      {tab === "Post" ? <PostsFeed /> : tab === "Chat" ? <ChatTab /> : <ResidentsTab />}
    </View>
  );
}

/* ------------------------------- Posts ------------------------------- */

function PostsFeed() {
  const utils = trpc.useUtils();
  const showToast = useUiStore((s) => s.showToast);
  const [composeOpen, setComposeOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [commentBody, setCommentBody] = useState("");
  const [saved, setSaved] = useState<Record<string, boolean>>({});

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

  const posts = postsQuery.data ?? [];

  return (
    <>
      <ScrollView
        contentContainerClassName="gap-3 px-4 pb-28 pt-1"
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl tintColor="#F5821F" colors={["#F5821F"]} progressBackgroundColor="#1A1A1A" refreshing={postsQuery.isRefetching} onRefresh={() => postsQuery.refetch()} />}
      >
        {/* Compose entry */}
        <Pressable
          onPress={() => setComposeOpen(true)}
          className="flex-row items-center gap-3 rounded-2xl bg-surface p-4"
          style={shadowCard}
          accessibilityLabel="Create a post"
          accessibilityRole="button"
        >
          <MaterialIcons name="edit" size={20} color="#F5821F" />
          <Text className="flex-1 text-body-md text-text-muted">Share something with your community...</Text>
          <MaterialIcons name="add-photo-alternate" size={22} color="#8A8A8A" />
        </Pressable>

        {postsQuery.isLoading ? (
          <ListLoading />
        ) : postsQuery.isError ? (
          <View className="rounded-xl bg-surface">
            <EmptyState title="Couldn't load posts" description="Pull down to refresh and try again." icon="error-outline" />
          </View>
        ) : posts.length === 0 ? (
          <View className="rounded-xl bg-surface">
            <EmptyState title="No posts yet" description="Be the first to share something with your community." icon="dynamic-feed" />
          </View>
        ) : (
          posts.map((post) => {
            const expanded = expandedId === post.id;
            return (
              <View key={post.id} className="gap-3 rounded-2xl bg-surface p-4" style={shadowCard}>
                <View className="flex-row items-center gap-3">
                  <Avatar name={post.authorName} size={40} />
                  <View className="min-w-0 flex-1">
                    <View className="flex-row items-center gap-2">
                      <Text className="shrink text-body-md font-extrabold text-on-surface" numberOfLines={1}>
                        {post.authorName}
                      </Text>
                      <RoleTag role={post.authorRole} size="sm" />
                    </View>
                    {post.flatNumber && <Text className="text-body-sm text-text-muted">{post.flatNumber}</Text>}
                  </View>
                  <Text className="text-body-sm text-text-muted">{timeAgo(post.createdAt)}</Text>
                </View>

                <Text className="text-body-md text-on-surface-variant">{post.body}</Text>

                {post.imageUrl && (
                  <Image source={{ uri: post.imageUrl }} style={{ width: "100%", height: 220, borderRadius: 14 }} resizeMode="cover" />
                )}

                <View className="flex-row items-center justify-between border-t pt-2" style={{ borderTopColor: "#2A2A2A" }}>
                  <Pressable
                    onPress={() => setSaved((s) => ({ ...s, [post.id]: !s[post.id] }))}
                    className="flex-row items-center gap-1.5"
                    accessibilityLabel="Save post"
                    accessibilityRole="button"
                  >
                    <MaterialIcons name={saved[post.id] ? "bookmark" : "bookmark-border"} size={18} color={saved[post.id] ? "#F5821F" : "#8A8A8A"} />
                    <Text className="text-body-sm text-text-muted">Save</Text>
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
                      <Text className="text-body-sm text-text-muted">No comments yet. Be the first!</Text>
                    ) : (
                      <View className="gap-2">
                        {(commentsQuery.data ?? []).map((c) => (
                          <View key={c.id} className="flex-row gap-2">
                            <Avatar name={c.authorName} size={28} />
                            <View className="min-w-0 flex-1 rounded-xl p-2.5" style={{ backgroundColor: "#242424" }}>
                              <View className="flex-row items-center gap-2">
                                <Text className="shrink text-body-sm font-bold text-on-surface" numberOfLines={1}>
                                  {c.authorName}
                                  {c.flatNumber ? ` · ${c.flatNumber}` : ""}
                                </Text>
                                <RoleTag role={c.authorRole} size="sm" />
                              </View>
                              <Text className="text-body-sm text-on-surface-variant">{c.body}</Text>
                            </View>
                          </View>
                        ))}
                      </View>
                    )}
                    <View className="flex-row items-center gap-2">
                      <TextInput
                        placeholder="Add a comment..."
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
                        accessibilityLabel="Send comment"
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

      <ComposeModal open={composeOpen} onClose={() => setComposeOpen(false)} />
    </>
  );
}

function ComposeModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const utils = trpc.useUtils();
  const showToast = useUiStore((s) => s.showToast);
  const [body, setBody] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);
  const [capturing, setCapturing] = useState(false);

  const createMutation = trpc.posts.create.useMutation({
    onSuccess: () => {
      hapticSuccess();
      showToast("Posted", "success");
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

  async function attach(source: "camera" | "gallery") {
    setCapturing(true);
    try {
      const url = source === "camera" ? await captureVisitorPhoto() : await pickImageFromGallery();
      if (url) setPhoto(url);
    } catch {
      showToast(source === "camera" ? "Couldn't open the camera." : "Couldn't open the gallery.", "error");
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
              <Text className="text-headline-md font-extrabold text-on-surface">New Post</Text>
              <Pressable onPress={onClose} hitSlop={8} accessibilityLabel="Close" accessibilityRole="button">
                <MaterialIcons name="close" size={24} color="#C4C4C4" />
              </Pressable>
            </View>

            <TextInput
              placeholder="What's happening in your community?"
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
              <View className="flex-row items-center gap-2.5">
                <Pressable
                  onPress={() => attach("gallery")}
                  disabled={capturing}
                  className="flex-row items-center gap-2 self-start rounded-full px-4 py-2.5"
                  style={{ backgroundColor: "#242424" }}
                  accessibilityLabel="Choose from gallery"
                  accessibilityRole="button"
                >
                  {capturing ? (
                    <ActivityIndicator size="small" color="#F5821F" />
                  ) : (
                    <MaterialIcons name="photo-library" size={20} color="#F5821F" />
                  )}
                  <Text className="text-body-md font-bold" style={{ color: "#F5821F" }}>
                    Gallery
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => attach("camera")}
                  disabled={capturing}
                  className="flex-row items-center gap-2 self-start rounded-full px-4 py-2.5"
                  style={{ backgroundColor: "#242424" }}
                  accessibilityLabel="Take a photo"
                  accessibilityRole="button"
                >
                  <MaterialIcons name="photo-camera" size={20} color="#F5821F" />
                  <Text className="text-body-md font-bold" style={{ color: "#F5821F" }}>
                    Camera
                  </Text>
                </Pressable>
              </View>
            )}

            <Pressable
              onPress={() => body.trim() && createMutation.mutate({ body: body.trim(), imageBase64: photo ?? undefined })}
              disabled={!body.trim() || createMutation.isPending}
              className="items-center justify-center rounded-full py-3.5"
              style={{ backgroundColor: body.trim() ? "#F5821F" : "#4A3416" }}
              accessibilityLabel="Publish post"
              accessibilityRole="button"
            >
              <Text className="text-body-lg font-bold" style={{ color: "#141118" }}>
                {createMutation.isPending ? "Posting..." : "Post"}
              </Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

/* ------------------------------- Chat ------------------------------- */

type RoleFilter = "resident" | "guard" | "admin" | null;
const ROLE_FILTERS: { label: string; value: RoleFilter }[] = [
  { label: "All", value: null },
  { label: "🏠 Residents", value: "resident" },
  { label: "🛡️ Guards", value: "guard" },
  { label: "⭐ Admin", value: "admin" },
];

function RoleFilterChips({ value, onChange }: { value: RoleFilter; onChange: (v: RoleFilter) => void }) {
  return (
    <View className="flex-row flex-wrap gap-2 px-4 pb-2 pt-1">
      {ROLE_FILTERS.map((f) => {
        const active = value === f.value;
        return (
          <Pressable
            key={f.label}
            onPress={() => onChange(f.value)}
            className="rounded-full px-3.5 py-1.5"
            style={{ backgroundColor: active ? "#F5821F" : "#1A1A1A", borderWidth: 1, borderColor: active ? "#F5821F" : "#333333" }}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
          >
            <Text className="text-body-sm font-bold" style={{ color: active ? "#141118" : "#C4C4C4" }}>
              {f.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function chatTime(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  if (d.toDateString() === new Date().toDateString()) return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return d.toLocaleDateString([], { day: "numeric", month: "short" });
}

function ChatTab() {
  const router = useRouter();
  const convQuery = trpc.chat.conversations.useQuery(undefined, { refetchInterval: 8000 });
  const { refreshing, onRefresh } = useManualRefresh(() => convQuery.refetch());
  const [roleFilter, setRoleFilter] = useState<RoleFilter>(null);
  const convs = (convQuery.data ?? []).filter((c) => !roleFilter || c.peerRole === roleFilter);

  return (
    <View className="flex-1">
      <RoleFilterChips value={roleFilter} onChange={setRoleFilter} />
      <ScrollView
        contentContainerClassName="gap-2 px-4 pb-28 pt-1"
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl tintColor="#F5821F" colors={["#F5821F"]} progressBackgroundColor="#1A1A1A" refreshing={refreshing} onRefresh={onRefresh} />}
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
            Open the Residents tab and tap the chat icon next to anyone to start a conversation.
          </Text>
        </View>
      ) : (
        convs.map((c) => (
          <Pressable
            key={c.peerId}
            onPress={() => router.push(`/(resident)/chat?peerId=${c.peerId}&name=${encodeURIComponent(c.peerName)}`)}
            className="flex-row items-center gap-3 rounded-2xl bg-surface p-3.5"
            style={shadowCard}
            accessibilityLabel={`Chat with ${c.peerName}`}
            accessibilityRole="button"
          >
            <Avatar name={c.peerName} size={48} />
            <View className="min-w-0 flex-1">
              <View className="flex-row items-center gap-2">
                <Text className="shrink text-body-md font-extrabold text-on-surface" numberOfLines={1}>
                  {c.peerName}
                  {c.peerFlat ? ` · ${c.peerFlat}` : ""}
                </Text>
                {c.peerRole !== "resident" && <RoleTag role={c.peerRole} size="sm" />}
                <Text className="ml-auto text-meta-text text-text-muted">{chatTime(c.lastAt)}</Text>
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
    </View>
  );
}

/* ---------------------------- Residents ---------------------------- */

function ResidentsTab() {
  const router = useRouter();
  const meId = useAuthStore((s) => s.user?.id);
  const dirQuery = trpc.residents.directory.useQuery();
  const contactsQuery = trpc.residents.societyContacts.useQuery();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>(null);

  const q = search.trim().toLowerCase();
  const society = (contactsQuery.data ?? [])
    .filter((c) => !roleFilter || c.role === roleFilter)
    .filter((c) => q.length === 0 || c.fullName.toLowerCase().includes(q) || c.role.includes(q) || c.phone.includes(q));

  const showFlats = roleFilter === null || roleFilter === "resident";
  const flats = (showFlats ? dirQuery.data ?? [] : [])
    .map((f) => ({ ...f, residents: f.residents.filter((r) => r.id !== meId) }))
    .filter((f) => f.residents.length > 0)
    .filter((f) => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return f.flatNumber.toLowerCase().includes(q) || f.residents.some((r) => r.fullName.toLowerCase().includes(q) || r.phone.includes(q));
    });

  return (
    <ScrollView
      contentContainerClassName="gap-1 px-4 pb-28 pt-1"
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      refreshControl={<RefreshControl tintColor="#F5821F" colors={["#F5821F"]} progressBackgroundColor="#1A1A1A" refreshing={dirQuery.isRefetching} onRefresh={() => dirQuery.refetch()} />}
    >
      <View className="mb-2 flex-row items-center gap-3 rounded-full px-4" style={{ backgroundColor: "#1A1A1A" }}>
        <MaterialIcons name="search" size={20} color="#8A8A8A" />
        <TextInput
          placeholder="Search by flat, name, or phone"
          placeholderTextColor="#7E7E7E"
          value={search}
          onChangeText={setSearch}
          className="flex-1 py-3 text-body-md text-on-surface"
        />
      </View>

      <RoleFilterChips value={roleFilter} onChange={setRoleFilter} />

      {/* Society staff — guards + admin the resident can call or chat */}
      {society.length > 0 && (
        <View className="mb-1">
          <Text className="px-1 pb-1 pt-2 text-label-caps font-bold uppercase tracking-wider text-text-muted">
            🏢 Society
          </Text>
          {society.map((c) => (
            <View
              key={c.id}
              className="flex-row items-center gap-3 rounded-2xl bg-surface p-3"
              style={[{ marginBottom: 6 }, shadowCard]}
            >
              <Avatar name={c.fullName} size={46} />
              <View className="min-w-0 flex-1">
                <View className="flex-row items-center gap-2">
                  <Text className="shrink text-body-md font-extrabold text-on-surface" numberOfLines={1}>
                    {c.fullName}
                  </Text>
                  <RoleTag role={c.role} size="sm" />
                </View>
                <Text className="text-body-sm text-text-muted">{c.role === "guard" ? "Gate Security" : "Society Admin"}</Text>
              </View>
              <Pressable
                onPress={() => Linking.openURL(`tel:${c.phone}`)}
                className="h-10 w-10 items-center justify-center rounded-full"
                style={{ backgroundColor: "#242424" }}
                hitSlop={4}
                accessibilityLabel={`Call ${c.fullName}`}
                accessibilityRole="button"
              >
                <MaterialIcons name="call" size={19} color="#F5821F" />
              </Pressable>
              <Pressable
                onPress={() => router.push(`/(resident)/chat?peerId=${c.id}&name=${encodeURIComponent(c.fullName)}`)}
                className="h-10 w-10 items-center justify-center rounded-full"
                style={{ backgroundColor: "#242424" }}
                hitSlop={4}
                accessibilityLabel={`Chat with ${c.fullName}`}
                accessibilityRole="button"
              >
                <MaterialIcons name="chat-bubble-outline" size={18} color="#F5821F" />
              </Pressable>
            </View>
          ))}
        </View>
      )}

      {dirQuery.isLoading ? (
        <ListLoading />
      ) : dirQuery.isError ? (
        <View className="rounded-xl bg-surface">
          <EmptyState title="Couldn't load directory" description="Pull down to refresh and try again." icon="error-outline" />
        </View>
      ) : flats.length === 0 && society.length === 0 ? (
        <View className="rounded-xl bg-surface">
          <EmptyState title="No one found" description="Try a different search." icon="contacts" />
        </View>
      ) : (
        flats.map((flat) => (
          <View key={flat.flatId} className="mb-1">
            <Text className="px-1 pb-1 pt-3 text-label-caps font-bold uppercase tracking-wider text-text-muted">
              Flat {flat.flatNumber}
            </Text>
            {flat.residents.map((r) => (
              <View
                key={r.id}
                className="flex-row items-center gap-3 rounded-2xl bg-surface p-3"
                style={[{ marginBottom: 6 }, shadowCard]}
              >
                <Avatar name={r.fullName} size={46} />
                <View className="min-w-0 flex-1">
                  <Text className="text-body-md font-extrabold text-on-surface" numberOfLines={1}>
                    {r.fullName}
                  </Text>
                  <Text className="text-body-sm text-text-muted">Resident</Text>
                </View>
                <Pressable
                  onPress={() => Linking.openURL(`tel:${r.phone}`)}
                  className="h-10 w-10 items-center justify-center rounded-full"
                  style={{ backgroundColor: "#242424" }}
                  hitSlop={4}
                  accessibilityLabel={`Call ${r.fullName}`}
                  accessibilityRole="button"
                >
                  <MaterialIcons name="call" size={19} color="#F5821F" />
                </Pressable>
                <Pressable
                  onPress={() => router.push(`/(resident)/chat?peerId=${r.id}&name=${encodeURIComponent(r.fullName)}`)}
                  className="h-10 w-10 items-center justify-center rounded-full"
                  style={{ backgroundColor: "#242424" }}
                  hitSlop={4}
                  accessibilityLabel={`Chat with ${r.fullName}`}
                  accessibilityRole="button"
                >
                  <MaterialIcons name="chat-bubble-outline" size={18} color="#F5821F" />
                </Pressable>
              </View>
            ))}
          </View>
        ))
      )}
    </ScrollView>
  );
}
