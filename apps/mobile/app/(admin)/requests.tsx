import { useState, useEffect } from "react";
import { View, Text, ScrollView, RefreshControl, Pressable, ActivityIndicator } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { trpc } from "../../lib/trpc";
import { useUiStore } from "../../stores/ui-store";
import { getErrorMessage } from "../../lib/error-message";
import { hapticSuccess, hapticError } from "../../lib/haptics";
import { AdminHeader } from "../../components/ui/admin-header";
import { Input } from "../../components/ui/input";
import { Chip } from "../../components/ui/chip";
import { Avatar } from "../../components/ui/avatar";
import { EmptyState } from "../../components/ui/empty-state";
import { Button } from "../../components/ui/button";
import { ListLoading } from "../../components/ui/list-loading";
import { shadowCard } from "../../lib/shadows";

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

type ComplaintStatus = "open" | "in_progress" | "resolved" | "closed";

const STATUS_FILTERS: { label: string; value?: ComplaintStatus }[] = [
  { label: "All" },
  { label: "Open", value: "open" },
  { label: "In Progress", value: "in_progress" },
  { label: "Resolved", value: "resolved" },
  { label: "Closed", value: "closed" },
];

// complaints_oversight mockup: each status keeps its own hue on pills and chips
const FILTER_COLORS: Record<string, { selBg: string; selText: string; bg: string; text: string }> = {
  All: { selBg: "#F5821F", selText: "#FFFFFF", bg: "#262626", text: "#C4C4C4" },
  Open: { selBg: "#BA1A1A", selText: "#FFFFFF", bg: "rgba(186,26,26,0.10)", text: "#BA1A1A" },
  "In Progress": { selBg: "#AA6700", selText: "#FFFFFF", bg: "rgba(254,178,70,0.28)", text: "#845400" },
  Resolved: { selBg: "#1B7A44", selText: "#FFFFFF", bg: "rgba(39,201,109,0.16)", text: "#1B7A44" },
  Closed: { selBg: "#C4C4C4", selText: "#FFFFFF", bg: "#262626", text: "#C4C4C4" },
};

const STATUS_CHIP: Record<ComplaintStatus, { bg: string; text: string; label: string }> = {
  open: { bg: "#BA1A1A", text: "#FFFFFF", label: "OPEN" },
  in_progress: { bg: "#AA6700", text: "#FFFFFF", label: "IN PROGRESS" },
  resolved: { bg: "rgba(39,201,109,0.18)", text: "#1B7A44", label: "RESOLVED" },
  closed: { bg: "#262626", text: "#C4C4C4", label: "CLOSED" },
};

const NEXT_STATUS: Record<string, ComplaintStatus> = {
  open: "in_progress",
  in_progress: "resolved",
  resolved: "closed",
  closed: "closed",
};

const CATEGORY_ICON: Record<string, React.ComponentProps<typeof MaterialIcons>["name"]> = {
  plumbing: "water-drop",
  electrical: "electrical-services",
  security: "shield",
  noise: "volume-up",
  cleaning: "cleaning-services",
  parking: "local-parking",
  lift: "elevator",
  elevator: "elevator",
};

export default function AdminRequests() {
  const showToast = useUiStore((s) => s.showToast);
  const utils = trpc.useUtils();
  const { complaintId: deepLinkedId } = useLocalSearchParams<{ complaintId?: string }>();
  const [filter, setFilter] = useState<(typeof STATUS_FILTERS)[number]>(STATUS_FILTERS[0]);
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [commentBody, setCommentBody] = useState("");

  // Arriving from a "New reply" notification: open that exact ticket and clear the status
  // filter to "All" so the ticket can't be hidden by whatever filter was last selected.
  useEffect(() => {
    if (!deepLinkedId) return;
    setFilter(STATUS_FILTERS[0]);
    setSearch("");
    setExpandedId(deepLinkedId);
  }, [deepLinkedId]);

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
      <AdminHeader barTitle="Operations" />
      <ScrollView
        contentContainerClassName="gap-4 px-4 pb-8 pt-2"
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
        <Input placeholder="Search tickets..." value={search} onChangeText={setSearch} />

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2">
          {STATUS_FILTERS.map((f) => {
            const colors = FILTER_COLORS[f.label];
            const selected = filter.label === f.label;
            return (
              <Pressable
                key={f.label}
                onPress={() => setFilter(f)}
                className="rounded-full px-4 py-2"
                style={{ backgroundColor: selected ? colors.selBg : colors.bg }}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                accessibilityLabel={`Filter: ${f.label}`}
              >
                <Text className="text-body-sm font-semibold" style={{ color: selected ? colors.selText : colors.text }}>
                  {f.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {complaintsQuery.isLoading ? (
          <ListLoading />
        ) : complaintsQuery.isError ? (
          <View className="rounded-card bg-surface">
            <EmptyState title="Couldn't load complaints" description="Pull down to refresh and try again." icon="error-outline" />
          </View>
        ) : complaints.length === 0 ? (
          <View className="rounded-card bg-surface">
            <EmptyState title="No matching complaints" description="Nothing found for this search or filter." icon="report-problem" />
          </View>
        ) : (
          <View className="gap-4">
            {complaints.map((complaint) => {
              const expanded = expandedId === complaint.id;
              const chip = STATUS_CHIP[complaint.status as ComplaintStatus] ?? STATUS_CHIP.open;
              const icon = CATEGORY_ICON[complaint.category.trim().toLowerCase()] ?? "report-problem";
              return (
                <Pressable
                  key={complaint.id}
                  onPress={() => setExpandedId(expanded ? null : complaint.id)}
                  className="gap-3 bg-surface p-5"
                  style={[{ borderRadius: 20 }, shadowCard]}
                >
                  <View className="flex-row items-start justify-between gap-3">
                    <View
                      className="items-center justify-center bg-surface-container"
                      style={{ width: 44, height: 44, borderRadius: 14 }}
                    >
                      <MaterialIcons name={icon} size={22} color="#F5821F" />
                    </View>
                    <View className="rounded-full px-3 py-1.5" style={{ backgroundColor: chip.bg }}>
                      <Text className="text-label-caps font-bold" style={{ color: chip.text }}>
                        {chip.label}
                      </Text>
                    </View>
                  </View>

                  <View className="gap-1">
                    <Text className="text-headline-md font-extrabold text-on-surface">{complaint.title}</Text>
                    <Text className="text-meta-text text-text-muted">
                      {complaint.category} • {complaint.priority} priority
                      {complaint.createdAt ? ` • Reported ${timeAgo(complaint.createdAt)}` : ""}
                    </Text>
                  </View>

                  {!expanded && (
                    <View className="flex-row items-center justify-between">
                      <Text className="text-body-sm text-text-muted" numberOfLines={1}>
                        {complaint.raisedByName}
                        {complaint.flatNumber ? ` • ${complaint.flatNumber}` : ""}
                      </Text>
                      <MaterialIcons name="expand-more" size={20} color="#8A8A8A" />
                    </View>
                  )}

                  {expanded && (
                    <View className="gap-3">
                      <View className="gap-1.5">
                        <Text className="text-body-sm font-bold text-on-surface">Description</Text>
                        <View
                          className="bg-surface p-3"
                          style={{ borderRadius: 12, borderWidth: 1, borderColor: "#333333" }}
                        >
                          <Text className="text-body-md text-on-surface-variant">{complaint.description}</Text>
                        </View>
                      </View>

                      <View className="flex-row items-center gap-3 bg-surface-container p-3" style={{ borderRadius: 12 }}>
                        <Avatar name={complaint.raisedByName} size={40} />
                        <View className="min-w-0 flex-1">
                          <Text className="text-body-sm font-bold text-on-surface" numberOfLines={1}>
                            {complaint.raisedByName}
                          </Text>
                          <Text className="text-meta-text text-text-muted" numberOfLines={1}>
                            {complaint.flatNumber ? `Flat ${complaint.flatNumber}` : "Resident"}
                          </Text>
                        </View>
                      </View>

                      <View className="gap-2">
                        <Text className="text-body-sm text-text-muted">Assign to Guard/Maintenance</Text>
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
                          loading={updateMutation.isPending}
                          onPress={() =>
                            updateMutation.mutate({ complaintId: complaint.id, status: NEXT_STATUS[complaint.status] })
                          }
                        >
                          {`Advance Status → ${NEXT_STATUS[complaint.status]?.replace("_", " ")}`}
                        </Button>
                      )}

                      <View className="gap-2 bg-surface-container p-3" style={{ borderRadius: 16 }}>
                        <Text className="text-body-sm font-bold text-on-surface">Activity Log</Text>
                        {commentsQuery.isLoading ? (
                          <ActivityIndicator color="#F5821F" />
                        ) : (commentsQuery.data ?? []).length === 0 ? (
                          <Text className="text-body-sm text-text-muted">No replies yet.</Text>
                        ) : (
                          <View className="gap-2">
                            {(commentsQuery.data ?? []).map((comment) => (
                              <View key={comment.id} className="bg-surface p-3" style={{ borderRadius: 12 }}>
                                <Text className="text-meta-text text-text-muted">
                                  {comment.authorName}
                                  {comment.authorRole !== "admin" ? ` (${comment.authorRole})` : " (You)"} •{" "}
                                  {timeAgo(comment.createdAt)}
                                </Text>
                                <Text className="text-body-sm text-on-surface-variant">{comment.body}</Text>
                              </View>
                            ))}
                          </View>
                        )}

                        <View className="flex-row items-center gap-2">
                          <Input
                            className="flex-1"
                            placeholder="Add a note..."
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
