import { useState, useEffect } from "react";
import { View, Text, ScrollView, RefreshControl, Pressable, Image, ActivityIndicator, KeyboardAvoidingView, Platform } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { trpc } from "../../lib/trpc";
import { useUiStore } from "../../stores/ui-store";
import { getErrorMessage } from "../../lib/error-message";
import { hapticSuccess, hapticError } from "../../lib/haptics";
import { captureVisitorPhoto } from "../../lib/capture-visitor-photo";
import { ScreenHeader } from "../../components/ui/screen-header";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { EmptyState } from "../../components/ui/empty-state";
import { ListLoading } from "../../components/ui/list-loading";
import { shadowCard } from "../../lib/shadows";

const CATEGORIES = ["Plumbing", "Electrical", "Security", "Cleaning", "Other"];

const CATEGORY_ICON: Record<string, React.ComponentProps<typeof MaterialIcons>["name"]> = {
  Plumbing: "water-drop",
  Electrical: "bolt",
  Security: "shield",
  Cleaning: "cleaning-services",
  Other: "home-repair-service",
};

// helpdesk mockup status chips: Open = soft red, In Progress = solid amber,
// Resolved/Closed = soft gray with check.
const STATUS_CHIP: Record<string, { label: string; bg: string; fg: string; icon?: React.ComponentProps<typeof MaterialIcons>["name"] }> = {
  open: { label: "Open", bg: "#FBDADA", fg: "#BA1A1A" },
  in_progress: { label: "In Progress", bg: "#FEB246", fg: "#3D2E00" },
  resolved: { label: "Resolved", bg: "#ECE6F2", fg: "#48454F", icon: "check-circle-outline" },
  closed: { label: "Closed", bg: "#ECE6F2", fg: "#48454F", icon: "check-circle-outline" },
};

function timeAgo(iso: string | null) {
  if (!iso) return "";
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return new Date(iso).toLocaleDateString([], { month: "short", day: "numeric" });
}

export default function ResidentHelpdesk() {
  const showToast = useUiStore((s) => s.showToast);
  const utils = trpc.useUtils();
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const { complaintId: deepLinkedId } = useLocalSearchParams<{ complaintId?: string }>();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [commentBody, setCommentBody] = useState("");
  const [titleError, setTitleError] = useState<string | null>(null);
  const [descriptionError, setDescriptionError] = useState<string | null>(null);

  // Arriving from a complaint notification: open that exact ticket's thread.
  useEffect(() => {
    if (deepLinkedId) setSelectedId(deepLinkedId);
  }, [deepLinkedId]);

  const ticketsQuery = trpc.complaints.mine.useQuery();
  const commentsQuery = trpc.complaints.listComments.useQuery(
    { complaintId: selectedId ?? "" },
    { enabled: !!selectedId },
  );

  function resetForm() {
    setCategory(CATEGORIES[0]);
    setTitle("");
    setDescription("");
    setPhoto(null);
    setTitleError(null);
    setDescriptionError(null);
  }

  const createMutation = trpc.complaints.create.useMutation({
    onSuccess: () => {
      hapticSuccess();
      showToast("Ticket raised", "success");
      resetForm();
      utils.complaints.mine.invalidate();
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
      utils.complaints.listComments.invalidate({ complaintId: selectedId ?? "" });
    },
    onError: (error) => {
      hapticError();
      showToast(getErrorMessage(error), "error");
    },
  });

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

  const tickets = ticketsQuery.data ?? [];

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} className="flex-1" style={{ backgroundColor: "#FAF7FD" }}>
      <ScreenHeader
        title="Raise a Ticket"
        subtitle="Need help with something in your unit or the building? Let us know below."
        role="resident"
      />
      <ScrollView
        contentContainerClassName="gap-4 px-5 pb-8 pt-2"
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={ticketsQuery.isRefetching} onRefresh={() => ticketsQuery.refetch()} />}
      >
        <View className="gap-4 rounded-xl bg-surface p-5" style={shadowCard}>
          <View className="gap-2">
            <Text className="text-body-md font-bold text-on-surface">Category</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2">
              {CATEGORIES.map((c) => {
                const selected = category === c;
                return (
                  <Pressable
                    key={c}
                    onPress={() => setCategory(c)}
                    className="flex-row items-center gap-1.5 rounded-full px-4 py-2"
                    style={
                      selected
                        ? { backgroundColor: "#6244CD" }
                        : { backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E4DEEC" }
                    }
                    accessibilityRole="radio"
                    accessibilityState={{ selected }}
                  >
                    <MaterialIcons name={CATEGORY_ICON[c] ?? "handyman"} size={16} color={selected ? "#fff" : "#48454F"} />
                    <Text className="text-body-md font-bold" style={{ color: selected ? "#FFFFFF" : "#48454F" }}>
                      {c}
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
            style={{ backgroundColor: "#F8F5FC" }}
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
            style={{ backgroundColor: "#F8F5FC" }}
          />
          <View className="gap-2">
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
                style={{ borderWidth: 2, borderStyle: "dashed", borderColor: "#D9D3E2", borderRadius: 12 }}
              >
                {isCapturing ? (
                  <ActivityIndicator color="#6244CD" />
                ) : (
                  <>
                    <MaterialIcons name="add-a-photo" size={26} color="#797585" />
                    <Text className="text-body-md font-bold text-on-surface-variant">Attach a photo (Optional)</Text>
                  </>
                )}
              </Pressable>
            )}
          </View>
          <Pressable
            onPress={handleSubmit}
            disabled={createMutation.isPending}
            className="h-12 flex-row items-center justify-center gap-2 rounded-full"
            style={{ backgroundColor: "#6244CD" }}
            accessibilityLabel="Submit ticket"
            accessibilityRole="button"
          >
            {!createMutation.isPending && <MaterialIcons name="send" size={18} color="#fff" />}
            <Text className="text-body-md font-bold" style={{ color: "#FFFFFF" }}>
              {createMutation.isPending ? "Submitting..." : "Submit Ticket"}
            </Text>
          </Pressable>
        </View>

        <Text className="pt-2 text-headline-lg font-extrabold text-on-surface">My Tickets</Text>

        {ticketsQuery.isLoading ? (
          <ListLoading />
        ) : ticketsQuery.isError ? (
          <View className="rounded-card bg-surface">
            <EmptyState title="Couldn't load tickets" description="Pull down to refresh and try again." icon="error-outline" />
          </View>
        ) : tickets.length === 0 ? (
          <View className="rounded-card bg-surface">
            <EmptyState title="No tickets yet" description="Raise a ticket above to get help from society staff." icon="support-agent" />
          </View>
        ) : (
          <View className="gap-3">
            {tickets.map((ticket) => (
              <Pressable
                key={ticket.id}
                onPress={() => setSelectedId(selectedId === ticket.id ? null : ticket.id)}
                className="gap-2 rounded-xl bg-surface p-4"
                style={shadowCard}
              >
                <View className="flex-row items-center justify-between gap-2">
                  <View className="flex-row items-center gap-1.5">
                    <MaterialIcons name={CATEGORY_ICON[ticket.category] ?? "handyman"} size={16} color="#6244CD" />
                    <Text className="text-body-sm font-bold" style={{ color: "#6244CD" }}>
                      {ticket.category}
                    </Text>
                  </View>
                  {(() => {
                    const chip = STATUS_CHIP[ticket.status] ?? STATUS_CHIP.open;
                    return (
                      <View
                        className="flex-row items-center gap-1 rounded-full px-3 py-1"
                        style={{ backgroundColor: chip.bg }}
                      >
                        {chip.icon && <MaterialIcons name={chip.icon} size={13} color={chip.fg} />}
                        <Text className="text-body-sm font-bold" style={{ color: chip.fg }}>
                          {chip.label}
                        </Text>
                      </View>
                    );
                  })()}
                </View>
                <Text
                  className={`text-body-lg font-bold ${ticket.status === "resolved" || ticket.status === "closed" ? "text-text-muted line-through" : "text-on-surface"}`}
                >
                  {ticket.title}
                </Text>
                <Text className="text-body-sm text-text-muted" numberOfLines={2}>
                  {ticket.description}
                </Text>
                <Text className="text-body-sm text-text-muted">
                  {ticket.status === "resolved" && ticket.resolvedAt
                    ? `Resolved ${timeAgo(ticket.resolvedAt)}`
                    : `Submitted ${timeAgo(ticket.createdAt)}`}
                </Text>

                {selectedId === ticket.id && (
                  <View className="gap-3 border-t border-outline-variant pt-3">
                    <View className="gap-3">
                      <View className="flex-row items-center gap-3">
                        <View className="h-2.5 w-2.5 rounded-full bg-primary-container" />
                        <Text className="text-body-sm text-on-surface">Ticket Created · {timeAgo(ticket.createdAt)}</Text>
                      </View>
                      {ticket.assignedToName && (
                        <View className="flex-row items-center gap-3">
                          <View className="h-2.5 w-2.5 rounded-full bg-primary-container" />
                          <Text className="text-body-sm text-on-surface">Assigned to {ticket.assignedToName}</Text>
                        </View>
                      )}
                      {ticket.resolvedAt && (
                        <View className="flex-row items-center gap-3">
                          <View className="h-2.5 w-2.5 rounded-full bg-status-green" />
                          <Text className="text-body-sm text-on-surface">Resolved · {timeAgo(ticket.resolvedAt)}</Text>
                        </View>
                      )}
                    </View>

                    <Text className="text-label-caps uppercase text-text-muted">Updates</Text>
                    {commentsQuery.isLoading ? (
                      <ActivityIndicator color="#6244CD" />
                    ) : (commentsQuery.data ?? []).length === 0 ? (
                      <Text className="text-body-sm text-text-muted">No replies yet.</Text>
                    ) : (
                      <View className="gap-2">
                        {(commentsQuery.data ?? []).map((comment) => (
                          <View key={comment.id} className="rounded-md bg-surface-container p-3">
                            <View className="flex-row items-center justify-between">
                              <Text className="text-body-sm font-bold text-on-surface">
                                {comment.authorName} {comment.authorRole !== "resident" ? `(${comment.authorRole})` : ""}
                              </Text>
                              <Text className="text-label-sm text-text-muted">{timeAgo(comment.createdAt)}</Text>
                            </View>
                            <Text className="text-body-sm text-on-surface-variant">{comment.body}</Text>
                          </View>
                        ))}
                      </View>
                    )}

                    <View className="flex-row items-center gap-2">
                      <View className="flex-1">
                        <Input
                          placeholder="Add a comment..."
                          value={commentBody}
                          onChangeText={setCommentBody}
                        />
                      </View>
                      <Pressable
                        disabled={!commentBody.trim() || addCommentMutation.isPending}
                        onPress={() => addCommentMutation.mutate({ complaintId: ticket.id, body: commentBody.trim() })}
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
            ))}
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
