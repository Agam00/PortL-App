import { useState } from "react";
import { View, Text, ScrollView, RefreshControl, Pressable, Image, ActivityIndicator, KeyboardAvoidingView, Platform } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { trpc } from "../../lib/trpc";
import { useUiStore } from "../../stores/ui-store";
import { getErrorMessage } from "../../lib/error-message";
import { hapticSuccess, hapticError } from "../../lib/haptics";
import { captureVisitorPhoto } from "../../lib/capture-visitor-photo";
import { ScreenHeader } from "../../components/ui/screen-header";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Chip } from "../../components/ui/chip";
import { StatusDot } from "../../components/ui/status-dot";
import { EmptyState } from "../../components/ui/empty-state";
import { ListLoading } from "../../components/ui/list-loading";
import { PressableScale } from "../../components/ui/pressable-scale";
import { shadowCard } from "../../lib/shadows";

const CATEGORIES = ["Plumbing", "Electrical", "Security", "Cleaning", "Other"];

const STATUS_TONE: Record<string, "green" | "amber" | "red" | "neutral"> = {
  open: "red",
  in_progress: "amber",
  resolved: "green",
  closed: "neutral",
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
  const [showForm, setShowForm] = useState(false);
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [commentBody, setCommentBody] = useState("");
  const [titleError, setTitleError] = useState<string | null>(null);
  const [descriptionError, setDescriptionError] = useState<string | null>(null);

  const ticketsQuery = trpc.complaints.mine.useQuery();
  const commentsQuery = trpc.complaints.listComments.useQuery(
    { complaintId: selectedId ?? "" },
    { enabled: !!selectedId },
  );

  function resetForm() {
    setShowForm(false);
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
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} className="flex-1 bg-background">
      <ScreenHeader title="Helpdesk Tickets" role="resident" />
      <ScrollView
        contentContainerClassName="gap-4 p-4 pb-8"
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={ticketsQuery.isRefetching} onRefresh={() => ticketsQuery.refetch()} />}
      >
        <View className="flex-row items-center justify-between">
          <Text className="flex-1 text-body-sm text-text-muted">Manage and track your maintenance requests and society complaints.</Text>
          <PressableScale
            onPress={() => (showForm ? resetForm() : setShowForm(true))}
            scaleTo={0.92}
            className="h-10 w-10 items-center justify-center rounded-full bg-surface-container"
            style={shadowCard}
            accessibilityLabel={showForm ? "Close ticket form" : "Raise a new ticket"}
            accessibilityRole="button"
          >
            <MaterialIcons name={showForm ? "close" : "add"} size={22} color="#6244CD" />
          </PressableScale>
        </View>

        {showForm && (
          <View className="gap-4 rounded-card bg-surface p-5" style={shadowCard}>
            <View className="flex-row items-center gap-2">
              <MaterialIcons name="support-agent" size={22} color="#6244CD" />
              <Text className="text-headline-md font-extrabold text-on-surface">Raise a Ticket</Text>
            </View>
            <View className="flex-row flex-wrap gap-2">
              {CATEGORIES.map((c) => (
                <Chip key={c} label={c} selected={category === c} onPress={() => setCategory(c)} />
              ))}
            </View>
            <Input
              label="Subject"
              placeholder="e.g. Water leak in bathroom"
              value={title}
              onChangeText={(v) => {
                setTitle(v);
                if (titleError) setTitleError(null);
              }}
              error={titleError ?? undefined}
            />
            <Input
              label="Description"
              placeholder="Describe the issue..."
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
                  className="items-center gap-2 rounded-md border-2 border-dashed border-outline-variant bg-surface-container py-6"
                >
                  {isCapturing ? (
                    <ActivityIndicator color="#6244CD" />
                  ) : (
                    <>
                      <MaterialIcons name="photo-camera" size={24} color="#797585" />
                      <Text className="text-body-sm text-text-muted">Attach a photo (Optional)</Text>
                    </>
                  )}
                </Pressable>
              )}
            </View>
            <Button onPress={handleSubmit} loading={createMutation.isPending}>
              Submit Ticket
            </Button>
          </View>
        )}

        <Text className="text-headline-md font-extrabold text-on-surface">My Tickets</Text>

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
                className="gap-2 rounded-card bg-surface p-4"
                style={shadowCard}
              >
                <View className="flex-row items-center justify-between">
                  <View className="rounded-full bg-surface-container px-2.5 py-1">
                    <Text className="text-label-sm font-bold uppercase text-text-muted">{ticket.category}</Text>
                  </View>
                  <StatusDot label={ticket.status.replace("_", " ")} tone={STATUS_TONE[ticket.status] ?? "neutral"} />
                </View>
                <Text
                  className={`text-body-md font-bold ${ticket.status === "resolved" || ticket.status === "closed" ? "text-text-muted line-through" : "text-on-surface"}`}
                >
                  {ticket.title}
                </Text>
                <Text className="text-body-sm text-text-muted" numberOfLines={2}>
                  {ticket.description}
                </Text>
                <Text className="text-label-sm text-text-muted">{timeAgo(ticket.createdAt)}</Text>

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
                      <Input
                        className="flex-1"
                        placeholder="Add a comment..."
                        value={commentBody}
                        onChangeText={setCommentBody}
                      />
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
