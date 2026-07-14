import { useState } from "react";
import { View, Text, ScrollView, Pressable, Image, ActivityIndicator, KeyboardAvoidingView, Platform } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { trpc } from "../../lib/trpc";
import { useUiStore } from "../../stores/ui-store";
import { getErrorMessage } from "../../lib/error-message";
import { captureVisitorPhoto } from "../../lib/capture-visitor-photo";
import { ScreenHeader } from "../../components/ui/screen-header";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Chip } from "../../components/ui/chip";
import { StatusDot } from "../../components/ui/status-dot";
import { EmptyState } from "../../components/ui/empty-state";

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
  }

  const createMutation = trpc.complaints.create.useMutation({
    onSuccess: () => {
      showToast("Ticket raised", "success");
      resetForm();
      utils.complaints.mine.invalidate();
    },
    onError: (error) => showToast(getErrorMessage(error), "error"),
  });

  const addCommentMutation = trpc.complaints.addComment.useMutation({
    onSuccess: () => {
      setCommentBody("");
      utils.complaints.listComments.invalidate({ complaintId: selectedId ?? "" });
    },
    onError: (error) => showToast(getErrorMessage(error), "error"),
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
    if (!title.trim() || !description.trim()) {
      showToast("Title and description are required", "error");
      return;
    }
    createMutation.mutate({ category, title: title.trim(), description: description.trim(), photoBase64: photo ?? undefined });
  }

  const tickets = ticketsQuery.data ?? [];

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} className="flex-1 bg-background">
      <ScreenHeader title="Helpdesk Tickets" role="resident" />
      <ScrollView contentContainerClassName="gap-4 p-4 pb-8" keyboardShouldPersistTaps="handled">
        <View className="flex-row items-center justify-between">
          <Text className="flex-1 text-body-sm text-text-muted">Manage and track your maintenance requests and society complaints.</Text>
          <Pressable
            onPress={() => (showForm ? resetForm() : setShowForm(true))}
            className="h-9 w-9 items-center justify-center rounded-md border border-border-subtle active:bg-white/5"
          >
            <MaterialIcons name={showForm ? "close" : "add"} size={20} color="#c6c5d5" />
          </Pressable>
        </View>

        {showForm && (
          <View className="gap-3 rounded-lg border border-border-subtle bg-surface p-4">
            <Text className="text-body-md font-semibold text-on-surface">Raise a Ticket</Text>
            <View className="flex-row flex-wrap gap-2">
              {CATEGORIES.map((c) => (
                <Chip key={c} label={c} selected={category === c} onPress={() => setCategory(c)} />
              ))}
            </View>
            <Input label="Title" placeholder="e.g. Water leak in bathroom" value={title} onChangeText={setTitle} />
            <Input
              label="Description"
              placeholder="Describe the issue..."
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              className="min-h-[96px]"
            />
            <View className="gap-2">
              <Text className="text-label-caps uppercase text-text-muted">Photo (Optional)</Text>
              {photo ? (
                <View className="flex-row items-center gap-3">
                  <Image source={{ uri: photo }} className="h-16 w-16 rounded-lg border border-border-subtle" />
                  <Button variant="outline" onPress={() => setPhoto(null)}>
                    Remove
                  </Button>
                </View>
              ) : (
                <Button variant="outline" loading={isCapturing} onPress={handleCapturePhoto}>
                  Take Photo
                </Button>
              )}
            </View>
            <Button onPress={handleSubmit} loading={createMutation.isPending}>
              Submit Ticket
            </Button>
          </View>
        )}

        {ticketsQuery.isLoading ? (
          <ActivityIndicator className="py-8" color="#5e6ad2" />
        ) : tickets.length === 0 ? (
          <View className="rounded-lg border border-border-subtle bg-surface-elevated">
            <EmptyState title="No tickets yet" description="Raise a ticket above to get help from society staff." icon="support-agent" />
          </View>
        ) : (
          <View className="gap-2">
            {tickets.map((ticket) => (
              <Pressable
                key={ticket.id}
                onPress={() => setSelectedId(selectedId === ticket.id ? null : ticket.id)}
                className={`gap-2 rounded-xl border p-4 ${selectedId === ticket.id ? "border-primary-container bg-white/5" : "border-border-subtle bg-surface"}`}
              >
                <View className="flex-row items-center justify-between">
                  <StatusDot label={ticket.status.replace("_", " ")} tone={STATUS_TONE[ticket.status] ?? "neutral"} />
                  <Text className="text-meta-text text-text-muted">{timeAgo(ticket.createdAt)}</Text>
                </View>
                <Text className="text-body-md font-medium text-on-surface">{ticket.title}</Text>
                <Text className="text-body-sm text-text-muted" numberOfLines={2}>
                  {ticket.description}
                </Text>
                <View className="flex-row gap-2">
                  <View className="rounded-md border border-border-subtle px-2 py-0.5">
                    <Text className="text-meta-text uppercase text-text-muted">{ticket.category}</Text>
                  </View>
                </View>

                {selectedId === ticket.id && (
                  <View className="gap-3 border-t border-border-subtle pt-3">
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
                      <ActivityIndicator color="#5e6ad2" />
                    ) : (commentsQuery.data ?? []).length === 0 ? (
                      <Text className="text-body-sm text-text-muted">No replies yet.</Text>
                    ) : (
                      <View className="gap-2">
                        {(commentsQuery.data ?? []).map((comment) => (
                          <View key={comment.id} className="rounded-lg border border-border-subtle bg-surface-elevated p-3">
                            <View className="flex-row items-center justify-between">
                              <Text className="text-body-sm font-medium text-on-surface">
                                {comment.authorName} {comment.authorRole !== "resident" ? `(${comment.authorRole})` : ""}
                              </Text>
                              <Text className="text-meta-text text-text-muted">{timeAgo(comment.createdAt)}</Text>
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
                        className="h-11 w-11 items-center justify-center rounded-lg bg-primary-container active:bg-inverse-primary"
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
