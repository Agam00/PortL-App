import { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  Pressable,
  Image,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Modal,
} from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import type { ComplaintOutput } from "@repo/services/complaint/model";
import { trpc } from "../../lib/trpc";
import { useUiStore } from "../../stores/ui-store";
import { getErrorMessage } from "../../lib/error-message";
import { hapticSuccess, hapticError } from "../../lib/haptics";
import { captureVisitorPhoto } from "../../lib/capture-visitor-photo";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { EmptyState } from "../../components/ui/empty-state";
import { ListLoading } from "../../components/ui/list-loading";
import { shadowCard, shadowElevated } from "../../lib/shadows";

const CATEGORIES = ["Plumbing", "Electrical", "Security", "Cleaning", "Other"];

const CATEGORY_ICON: Record<string, React.ComponentProps<typeof MaterialIcons>["name"]> = {
  Plumbing: "water-drop",
  Electrical: "bolt",
  Security: "shield",
  Cleaning: "cleaning-services",
  Other: "home-repair-service",
};

// Status pill per the mockup: open = green "NEW", in_progress = amber, resolved/closed = gold "RESOLVED".
function statusPill(status: ComplaintOutput["status"]): { label: string; bg: string; fg: string } {
  switch (status) {
    case "open":
      return { label: "NEW", bg: "#3FB950", fg: "#FFFFFF" };
    case "in_progress":
      return { label: "IN PROGRESS", bg: "#F6A83C", fg: "#3D2E00" };
    case "resolved":
      return { label: "RESOLVED", bg: "#E3B341", fg: "#3D2E00" };
    default:
      return { label: "CLOSED", bg: "#262626", fg: "#C4C4C4" };
  }
}

function formatDateTime(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  return `${d.toLocaleDateString([], { day: "numeric", month: "short" })}, ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
}

const FILTERS = ["All", "My Complaints"] as const;

export default function ResidentHelpdesk() {
  const insets = useSafeAreaInsets();
  const showToast = useUiStore((s) => s.showToast);
  const utils = trpc.useUtils();

  const { complaintId: deepLinkedId } = useLocalSearchParams<{ complaintId?: string }>();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("All");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [commentBody, setCommentBody] = useState("");
  const [showForm, setShowForm] = useState(false);

  // Raise-form state
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [titleError, setTitleError] = useState<string | null>(null);
  const [descriptionError, setDescriptionError] = useState<string | null>(null);

  useEffect(() => {
    if (deepLinkedId) setExpandedId(deepLinkedId);
  }, [deepLinkedId]);

  const listQuery = trpc.complaints.listForResident.useQuery();
  const commentsQuery = trpc.complaints.listComments.useQuery(
    { complaintId: expandedId ?? "" },
    { enabled: !!expandedId },
  );

  const all = listQuery.data ?? [];
  const complaints = filter === "My Complaints" ? all.filter((c) => c.isMine) : all;

  const createMutation = trpc.complaints.create.useMutation({
    onSuccess: () => {
      hapticSuccess();
      showToast("Complaint raised", "success");
      resetForm();
      setShowForm(false);
      utils.complaints.listForResident.invalidate();
    },
    onError: (error) => {
      hapticError();
      showToast(getErrorMessage(error), "error");
    },
  });

  const statusMutation = trpc.complaints.setStatusMine.useMutation({
    onSuccess: () => {
      hapticSuccess();
      utils.complaints.listForResident.invalidate();
    },
    onError: (error) => {
      hapticError();
      showToast(getErrorMessage(error), "error");
    },
  });

  const addCommentMutation = trpc.complaints.addComment.useMutation({
    onSuccess: () => {
      hapticSuccess();
      setCommentBody("");
      utils.complaints.listComments.invalidate({ complaintId: expandedId ?? "" });
      utils.complaints.listForResident.invalidate();
    },
    onError: (error) => {
      hapticError();
      showToast(getErrorMessage(error), "error");
    },
  });

  function resetForm() {
    setCategory(CATEGORIES[0]);
    setTitle("");
    setDescription("");
    setPhoto(null);
    setTitleError(null);
    setDescriptionError(null);
  }

  async function handleCapturePhoto() {
    setIsCapturing(true);
    try {
      const dataUrl = await captureVisitorPhoto();
      if (dataUrl) setPhoto(dataUrl);
    } catch {
      showToast("Couldn't capture photo — camera unavailable.", "error");
    } finally {
      setIsCapturing(false);
    }
  }

  function handleSubmit() {
    const titleMissing = !title.trim();
    const descriptionMissing = !description.trim();
    setTitleError(titleMissing ? "Title is required" : null);
    setDescriptionError(descriptionMissing ? "Description is required" : null);
    if (titleMissing || descriptionMissing) return;
    createMutation.mutate({ category, title: title.trim(), description: description.trim(), photoBase64: photo ?? undefined });
  }

  return (
    <View className="flex-1" style={{ backgroundColor: "#0D0D0D" }}>
      {/* Header */}
      <View className="flex-row items-center justify-between px-5 pb-3" style={{ paddingTop: insets.top + 10 }}>
        <Text className="text-headline-lg font-extrabold text-on-surface">HelpDesk</Text>
        <View className="flex-row rounded-full p-1" style={{ backgroundColor: "#242424" }}>
          {FILTERS.map((f) => {
            const active = filter === f;
            return (
              <Pressable
                key={f}
                onPress={() => setFilter(f)}
                className="rounded-full px-3 py-1.5"
                style={{ backgroundColor: active ? "#F5821F" : "transparent" }}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
              >
                <Text className="text-body-sm font-bold" style={{ color: active ? "#FFFFFF" : "#F5821F" }}>
                  {f}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <ScrollView
        contentContainerClassName="gap-3 px-4 pb-28 pt-1"
        refreshControl={<RefreshControl tintColor="#F5821F" colors={["#F5821F"]} progressBackgroundColor="#1A1A1A" refreshing={listQuery.isRefetching} onRefresh={() => listQuery.refetch()} />}
      >
        {listQuery.isLoading ? (
          <ListLoading />
        ) : listQuery.isError ? (
          <View className="rounded-xl bg-surface">
            <EmptyState title="Couldn't load complaints" description="Pull down to refresh and try again." icon="error-outline" />
          </View>
        ) : complaints.length === 0 ? (
          <View className="rounded-xl bg-surface">
            <EmptyState
              title={filter === "My Complaints" ? "You haven't raised any complaints" : "No complaints yet"}
              description="Tap “Raise New Complaint” below to get help from society staff."
              icon="support-agent"
            />
          </View>
        ) : (
          complaints.map((c) => {
            const pill = statusPill(c.status);
            const resolved = c.status === "resolved" || c.status === "closed";
            const expanded = expandedId === c.id;
            return (
              <Pressable
                key={c.id}
                onPress={() => setExpandedId(expanded ? null : c.id)}
                className="gap-2.5 rounded-2xl bg-surface p-4"
                style={shadowCard}
              >
                {/* Top row: category + community/personal tag + status pill */}
                <View className="flex-row items-center justify-between gap-2">
                  <View className="min-w-0 flex-row items-center gap-2">
                    <MaterialIcons name={CATEGORY_ICON[c.category] ?? "handyman"} size={16} color="#F5821F" />
                    <Text className="text-body-md font-extrabold text-on-surface" numberOfLines={1}>
                      {c.category}
                    </Text>
                    <View className="rounded-full px-2 py-0.5" style={{ backgroundColor: c.isMine ? "#2A2320" : "#242424" }}>
                      <Text className="text-meta-text font-bold" style={{ color: c.isMine ? "#FF9A3D" : "#8A8A8A" }}>
                        {c.isMine ? "Personal" : "Community"}
                      </Text>
                    </View>
                  </View>
                  <View className="rounded-full px-3 py-1" style={{ backgroundColor: pill.bg }}>
                    <Text className="text-meta-text font-extrabold" style={{ color: pill.fg }}>
                      {pill.label}
                    </Text>
                  </View>
                </View>

                {/* Title / description */}
                <Text className={`text-body-lg font-bold ${resolved ? "text-text-muted" : "text-on-surface"}`}>
                  {c.title}
                </Text>

                {/* Raised / resolved by + date */}
                <View className="flex-row items-center justify-between">
                  <Text className="text-body-sm text-text-muted" numberOfLines={1}>
                    {resolved ? "Resolved by " : "Raised by "}
                    <Text className="font-bold text-on-surface-variant">{c.raisedByName}</Text>
                  </Text>
                  <Text className="text-body-sm text-text-muted">
                    {formatDateTime(resolved ? c.resolvedAt : c.createdAt)}
                  </Text>
                </View>

                <View className="my-0.5 h-px" style={{ backgroundColor: "#2A2A2A" }} />

                {/* Action row: resolve/reopen (own only) + comment count */}
                <View className="flex-row items-center justify-between">
                  {c.isMine ? (
                    <Pressable
                      onPress={() =>
                        statusMutation.mutate({ complaintId: c.id, status: resolved ? "open" : "resolved" })
                      }
                      disabled={statusMutation.isPending}
                      className="flex-row items-center gap-1.5"
                      accessibilityRole="button"
                      accessibilityLabel={resolved ? "Re-open complaint" : "Mark as resolved"}
                    >
                      <MaterialIcons
                        name={resolved ? "replay" : "thumb-up"}
                        size={18}
                        color={resolved ? "#F5821F" : "#3FB950"}
                      />
                      <Text className="text-body-sm font-bold" style={{ color: resolved ? "#F5821F" : "#2E7D32" }}>
                        {resolved ? "Re-Open" : "Mark as Resolved"}
                      </Text>
                    </Pressable>
                  ) : (
                    <View />
                  )}
                  <View className="flex-row items-center gap-1.5">
                    <MaterialIcons name="chat-bubble-outline" size={15} color="#8A8A8A" />
                    <Text className="text-body-sm text-text-muted">
                      {String(c.commentCount ?? 0).padStart(2, "0")} Comments
                    </Text>
                  </View>
                </View>

                {/* Expanded: description + comment thread */}
                {expanded && (
                  <View className="gap-3 border-t border-outline-variant pt-3">
                    <Text className="text-body-md text-on-surface-variant">{c.description}</Text>

                    <Text className="text-label-caps uppercase text-text-muted">Comments</Text>
                    {commentsQuery.isLoading ? (
                      <ActivityIndicator color="#F5821F" />
                    ) : (commentsQuery.data ?? []).length === 0 ? (
                      <Text className="text-body-sm text-text-muted">No comments yet.</Text>
                    ) : (
                      <View className="gap-2">
                        {(commentsQuery.data ?? []).map((comment) => (
                          <View key={comment.id} className="rounded-md bg-surface-container p-3">
                            <View className="flex-row items-center justify-between">
                              <Text className="text-body-sm font-bold text-on-surface">
                                {comment.authorName} {comment.authorRole !== "resident" ? `(${comment.authorRole})` : ""}
                              </Text>
                              <Text className="text-meta-text text-text-muted">{formatDateTime(comment.createdAt)}</Text>
                            </View>
                            <Text className="text-body-sm text-on-surface-variant">{comment.body}</Text>
                          </View>
                        ))}
                      </View>
                    )}

                    <View className="flex-row items-center gap-2">
                      <View className="flex-1">
                        <Input placeholder="Add a comment..." value={commentBody} onChangeText={setCommentBody} />
                      </View>
                      <Pressable
                        disabled={!commentBody.trim() || addCommentMutation.isPending}
                        onPress={() => addCommentMutation.mutate({ complaintId: c.id, body: commentBody.trim() })}
                        className="h-11 w-11 items-center justify-center rounded-full bg-primary-container"
                        accessibilityLabel="Send comment"
                        accessibilityRole="button"
                      >
                        <MaterialIcons name="send" size={18} color="#fff" />
                      </Pressable>
                    </View>
                  </View>
                )}
              </Pressable>
            );
          })
        )}
      </ScrollView>

      {/* Floating "Raise New Complaint" */}
      <Pressable
        onPress={() => setShowForm(true)}
        className="absolute flex-row items-center gap-2 self-center rounded-full px-6 py-4"
        style={[{ bottom: insets.bottom + 16, backgroundColor: "#F5821F" }, shadowElevated]}
        accessibilityLabel="Raise new complaint"
        accessibilityRole="button"
      >
        <MaterialIcons name="add" size={20} color="#FFFFFF" />
        <Text className="text-body-md font-bold text-white">Raise New Complaint</Text>
      </Pressable>

      {/* Raise-complaint modal */}
      <Modal visible={showForm} animationType="slide" transparent onRequestClose={() => setShowForm(false)}>
        <View className="flex-1 justify-end" style={{ backgroundColor: "rgba(20,17,24,0.5)" }}>
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
            <View className="gap-4 rounded-t-3xl bg-surface px-5 pt-5" style={{ paddingBottom: insets.bottom + 20 }}>
              <View className="flex-row items-center justify-between">
                <Text className="text-headline-md font-extrabold text-on-surface">Raise a Complaint</Text>
                <Pressable onPress={() => setShowForm(false)} hitSlop={8} accessibilityLabel="Close" accessibilityRole="button">
                  <MaterialIcons name="close" size={24} color="#C4C4C4" />
                </Pressable>
              </View>

              <ScrollView contentContainerClassName="gap-4" keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                <View className="gap-2">
                  <Text className="text-body-md font-bold text-on-surface">Category</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2">
                    {CATEGORIES.map((cat) => {
                      const selected = category === cat;
                      return (
                        <Pressable
                          key={cat}
                          onPress={() => setCategory(cat)}
                          className="flex-row items-center gap-1.5 rounded-full px-4 py-2"
                          style={selected ? { backgroundColor: "#F5821F" } : { backgroundColor: "#1A1A1A", borderWidth: 1, borderColor: "#333333" }}
                          accessibilityRole="radio"
                          accessibilityState={{ selected }}
                        >
                          <MaterialIcons name={CATEGORY_ICON[cat] ?? "handyman"} size={16} color={selected ? "#fff" : "#C4C4C4"} />
                          <Text className="text-body-md font-bold" style={{ color: selected ? "#FFFFFF" : "#C4C4C4" }}>
                            {cat}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </ScrollView>
                </View>

                <Input
                  label="Subject"
                  placeholder="E.g., Leaky faucet in kitchen"
                  value={title}
                  onChangeText={(v) => {
                    setTitle(v);
                    if (titleError) setTitleError(null);
                  }}
                  error={titleError ?? undefined}
                  style={{ backgroundColor: "#1F1F1F" }}
                />
                <Input
                  label="Description"
                  placeholder="Please provide details about the issue..."
                  value={description}
                  onChangeText={(v) => {
                    setDescription(v);
                    if (descriptionError) setDescriptionError(null);
                  }}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                  className="min-h-[96px]"
                  error={descriptionError ?? undefined}
                  style={{ backgroundColor: "#1F1F1F" }}
                />

                {photo ? (
                  <View className="flex-row items-center gap-3">
                    <Image source={{ uri: photo }} className="h-16 w-16 rounded-md" />
                    <Button variant="outline" onPress={() => setPhoto(null)}>
                      Remove
                    </Button>
                  </View>
                ) : (
                  <Pressable
                    onPress={handleCapturePhoto}
                    disabled={isCapturing}
                    className="items-center gap-2 py-6"
                    style={{ borderWidth: 2, borderStyle: "dashed", borderColor: "#3A3A3A", borderRadius: 12 }}
                  >
                    {isCapturing ? (
                      <ActivityIndicator color="#F5821F" />
                    ) : (
                      <>
                        <MaterialIcons name="add-a-photo" size={26} color="#8A8A8A" />
                        <Text className="text-body-md font-bold text-on-surface-variant">Attach a photo (Optional)</Text>
                      </>
                    )}
                  </Pressable>
                )}

                <Pressable
                  onPress={handleSubmit}
                  disabled={createMutation.isPending}
                  className="h-12 flex-row items-center justify-center gap-2 rounded-full"
                  style={{ backgroundColor: "#F5821F" }}
                  accessibilityLabel="Submit complaint"
                  accessibilityRole="button"
                >
                  {!createMutation.isPending && <MaterialIcons name="send" size={18} color="#fff" />}
                  <Text className="text-body-md font-bold text-white">
                    {createMutation.isPending ? "Submitting..." : "Submit Complaint"}
                  </Text>
                </Pressable>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </View>
  );
}
