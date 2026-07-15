import { useState } from "react";
import { View, Text, ScrollView, RefreshControl, Pressable, ActivityIndicator } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { trpc } from "../../lib/trpc";
import { useUiStore } from "../../stores/ui-store";
import { getErrorMessage } from "../../lib/error-message";
import { hapticSuccess, hapticError } from "../../lib/haptics";
import { ScreenHeader } from "../../components/ui/screen-header";
import { Input } from "../../components/ui/input";
import { Chip } from "../../components/ui/chip";
import { EmptyState } from "../../components/ui/empty-state";
import { Button } from "../../components/ui/button";

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

const STATUS_FILTERS: { label: string; value?: "open" | "in_progress" | "resolved" | "closed" }[] = [
  { label: "All" },
  { label: "Open", value: "open" },
  { label: "In Progress", value: "in_progress" },
  { label: "Resolved", value: "resolved" },
  { label: "Closed", value: "closed" },
];

const NEXT_STATUS: Record<string, "open" | "in_progress" | "resolved" | "closed"> = {
  open: "in_progress",
  in_progress: "resolved",
  resolved: "closed",
  closed: "closed",
};

const PRIORITY_TONE: Record<string, string> = { high: "bg-status-red", medium: "bg-status-amber", low: "bg-text-muted" };

export default function AdminRequests() {
  const showToast = useUiStore((s) => s.showToast);
  const utils = trpc.useUtils();
  const [filter, setFilter] = useState<(typeof STATUS_FILTERS)[number]>(STATUS_FILTERS[0]);
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [commentBody, setCommentBody] = useState("");

  const guardsQuery = trpc.admin.listGuards.useQuery();
  const complaintsQuery = trpc.complaints.list.useQuery({ status: filter.value });
  const commentsQuery = trpc.complaints.listComments.useQuery(
    { complaintId: expandedId ?? "" },
    { enabled: !!expandedId },
  );

  const complaints = (complaintsQuery.data ?? []).filter(
    (c) =>
      search.trim().length === 0 ||
      c.title.toLowerCase().includes(search.toLowerCase()) ||
      c.raisedByName.toLowerCase().includes(search.toLowerCase()) ||
      c.flatNumber?.toLowerCase().includes(search.toLowerCase()),
  );

  const updateMutation = trpc.complaints.update.useMutation({
    onSuccess: () => {
      hapticSuccess();
      utils.complaints.list.invalidate();
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
    },
    onError: (error) => {
      hapticError();
      showToast(getErrorMessage(error), "error");
    },
  });

  const guards = guardsQuery.data ?? [];

  return (
    <View className="flex-1 bg-background">
      <ScreenHeader title="Complaints Oversight" role="admin" />
      <ScrollView
        contentContainerClassName="gap-4 p-4 pb-8"
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={complaintsQuery.isRefetching || guardsQuery.isRefetching}
            onRefresh={() => {
              complaintsQuery.refetch();
              guardsQuery.refetch();
            }}
          />
        }
      >
        <Text className="text-body-sm text-text-muted">Manage and resolve resident issues.</Text>

        <Input placeholder="Search complaints..." value={search} onChangeText={setSearch} />

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2">
          {STATUS_FILTERS.map((f) => (
            <Chip key={f.label} label={f.label} selected={filter.label === f.label} onPress={() => setFilter(f)} />
          ))}
        </ScrollView>

        {complaintsQuery.isLoading ? (
          <ActivityIndicator className="py-8" color="#5e6ad2" />
        ) : complaintsQuery.isError ? (
          <View className="rounded-lg border border-border-subtle bg-surface-elevated">
            <EmptyState title="Couldn't load complaints" description="Pull down to refresh and try again." icon="error-outline" />
          </View>
        ) : complaints.length === 0 ? (
          <View className="rounded-lg border border-border-subtle bg-surface-elevated">
            <EmptyState title="No matching complaints" description="Nothing found for this search or filter." icon="report-problem" />
          </View>
        ) : (
          <View className="gap-2">
            {complaints.map((complaint) => {
              const expanded = expandedId === complaint.id;
              return (
                <Pressable
                  key={complaint.id}
                  onPress={() => setExpandedId(expanded ? null : complaint.id)}
                  className="gap-2 rounded-xl border border-border-subtle bg-surface p-4"
                >
                  <View className="flex-row items-center justify-between">
                    <View className="flex-row items-center gap-1.5">
                      <View className={`h-1.5 w-1.5 rounded-full ${PRIORITY_TONE[complaint.priority]}`} />
                      <Text className="text-meta-text uppercase text-text-muted">{complaint.priority} priority</Text>
                    </View>
                    <Text className="text-meta-text text-text-muted">{complaint.category}</Text>
                  </View>
                  <Text className="text-body-md font-medium text-on-surface">{complaint.title}</Text>
                  <Text className="text-meta-text text-text-muted">
                    {complaint.raisedByName}
                    {complaint.flatNumber ? ` · ${complaint.flatNumber}` : ""} · {complaint.status.replace("_", " ")}
                  </Text>

                  {expanded && (
                    <View className="gap-3 border-t border-border-subtle pt-3">
                      <Text className="text-body-sm text-on-surface-variant">{complaint.description}</Text>

                      <View className="gap-2">
                        <Text className="text-label-caps uppercase text-text-muted">Assign To</Text>
                        <View className="flex-row flex-wrap gap-2">
                          {guards.map((guard) => (
                            <Chip
                              key={guard.id}
                              label={guard.fullName}
                              selected={complaint.assignedToUserId === guard.id}
                              onPress={() =>
                                updateMutation.mutate({ complaintId: complaint.id, assignedToUserId: guard.id })
                              }
                            />
                          ))}
                        </View>
                      </View>

                      {complaint.status !== "closed" && (
                        <Button
                          variant="outline"
                          loading={updateMutation.isPending}
                          onPress={() =>
                            updateMutation.mutate({ complaintId: complaint.id, status: NEXT_STATUS[complaint.status] })
                          }
                        >
                          {`Mark as ${NEXT_STATUS[complaint.status]?.replace("_", " ")}`}
                        </Button>
                      )}

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
                                  {comment.authorName} {comment.authorRole !== "admin" ? `(${comment.authorRole})` : ""}
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
                          placeholder="Add an internal note or reply..."
                          value={commentBody}
                          onChangeText={setCommentBody}
                        />
                        <Pressable
                          disabled={!commentBody.trim() || addCommentMutation.isPending}
                          onPress={() => addCommentMutation.mutate({ complaintId: complaint.id, body: commentBody.trim() })}
                          className="h-11 w-11 items-center justify-center rounded-lg bg-primary-container active:bg-inverse-primary"
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
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
