import { useState } from "react";
import { View, Text, ScrollView, RefreshControl, Alert } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { trpc } from "../../lib/trpc";
import { useUiStore } from "../../stores/ui-store";
import { getErrorMessage } from "../../lib/error-message";
import { hapticSuccess, hapticError } from "../../lib/haptics";
import { ScreenHeader } from "../../components/ui/screen-header";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Chip } from "../../components/ui/chip";
import { EmptyState } from "../../components/ui/empty-state";
import { FormPanel } from "../../components/ui/form-panel";
import { IconButton } from "../../components/ui/icon-button";
import { ListLoading } from "../../components/ui/list-loading";
import { shadowCard } from "../../lib/shadows";

const SCOPES: { value: "all" | "tower" | "flat"; label: string }[] = [
  { value: "all", label: "All Residents" },
  { value: "tower", label: "Specific Tower" },
  { value: "flat", label: "Specific Flat" },
];

function formatPublished(iso: string | null) {
  if (!iso) return null;
  const date = new Date(iso);
  return `${date.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })} • ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
}

export default function AdminNotices() {
  const showToast = useUiStore((s) => s.showToast);
  const utils = trpc.useUtils();
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [search, setSearch] = useState("");
  const [scope, setScope] = useState<"all" | "tower" | "flat">("all");
  const [targetTowerId, setTargetTowerId] = useState<string | null>(null);
  const [targetFlatId, setTargetFlatId] = useState<string | null>(null);
  const [titleError, setTitleError] = useState<string | null>(null);
  const [bodyError, setBodyError] = useState<string | null>(null);
  const [audienceError, setAudienceError] = useState<string | null>(null);

  const noticesQuery = trpc.notices.list.useQuery();
  const towersQuery = trpc.towers.list.useQuery(undefined, { enabled: scope === "tower" });
  const flatsQuery = trpc.flats.list.useQuery({}, { enabled: scope === "flat" });

  function resetForm() {
    setShowForm(false);
    setTitle("");
    setBody("");
    setScope("all");
    setTargetTowerId(null);
    setTargetFlatId(null);
    setTitleError(null);
    setBodyError(null);
    setAudienceError(null);
  }

  const createMutation = trpc.notices.create.useMutation({
    onSuccess: () => {
      hapticSuccess();
      showToast("Notice published", "success");
      resetForm();
      utils.notices.list.invalidate();
    },
    onError: (error) => {
      hapticError();
      showToast(getErrorMessage(error), "error");
    },
  });

  const removeMutation = trpc.notices.remove.useMutation({
    onSuccess: () => {
      hapticSuccess();
      showToast("Notice removed", "success");
      utils.notices.list.invalidate();
    },
    onError: (error) => {
      hapticError();
      showToast(getErrorMessage(error), "error");
    },
  });

  function confirmDelete(noticeId: string, label: string) {
    Alert.alert("Remove notice?", `"${label}" will be permanently removed.`, [
      { text: "Cancel", style: "cancel" },
      { text: "Remove", style: "destructive", onPress: () => removeMutation.mutate({ noticeId }) },
    ]);
  }

  function handlePublish() {
    const titleMissing = !title.trim();
    const bodyMissing = !body.trim();
    const audienceMissing = (scope === "tower" && !targetTowerId) || (scope === "flat" && !targetFlatId);
    setTitleError(titleMissing ? "Title is required" : null);
    setBodyError(bodyMissing ? "Message is required" : null);
    setAudienceError(audienceMissing ? (scope === "tower" ? "Select a tower" : "Select a flat") : null);
    if (titleMissing || bodyMissing || audienceMissing) return;

    createMutation.mutate({
      title: title.trim(),
      body: body.trim(),
      targetScope: scope,
      targetTowerId: scope === "tower" ? (targetTowerId ?? undefined) : undefined,
      targetFlatId: scope === "flat" ? (targetFlatId ?? undefined) : undefined,
    });
  }

  const notices = (noticesQuery.data ?? []).filter(
    (n) =>
      search.trim().length === 0 ||
      n.title.toLowerCase().includes(search.toLowerCase()) ||
      n.body.toLowerCase().includes(search.toLowerCase()),
  );
  const towers = towersQuery.data ?? [];
  const flats = flatsQuery.data ?? [];

  return (
    <View className="flex-1 bg-background">
      <ScreenHeader title="Notices Management" subtitle="Broadcast important updates to the community." role="admin" />
      <ScrollView
        contentContainerClassName="gap-4 px-4 pb-8 pt-2"
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={noticesQuery.isRefetching} onRefresh={() => noticesQuery.refetch()} />}
      >
        <Button variant={showForm ? "outline" : "primary"} onPress={() => (showForm ? resetForm() : setShowForm(true))}>
          {showForm ? "Cancel" : "+ Compose Notice"}
        </Button>

        {showForm && (
          <FormPanel>
            <View className="flex-row items-center gap-2">
              <MaterialIcons name="campaign" size={20} color="#F5821F" />
              <Text className="text-body-md font-bold text-on-surface">Compose Notice</Text>
            </View>
            <Input
              label="Title"
              placeholder="e.g. Scheduled Water Maintenance"
              value={title}
              onChangeText={(v) => {
                setTitle(v);
                if (titleError) setTitleError(null);
              }}
              error={titleError ?? undefined}
            />
            <Input
              label="Message"
              placeholder="Enter notice details here..."
              value={body}
              onChangeText={(v) => {
                setBody(v);
                if (bodyError) setBodyError(null);
              }}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              className="min-h-[96px]"
              error={bodyError ?? undefined}
            />
            <View className="gap-2">
              <Text className="text-label-caps uppercase text-text-muted">Audience</Text>
              <View className="flex-row flex-wrap gap-2">
                {SCOPES.map((s) => (
                  <Chip
                    key={s.value}
                    label={s.label}
                    selected={scope === s.value}
                    onPress={() => {
                      setScope(s.value);
                      setAudienceError(null);
                    }}
                  />
                ))}
              </View>
            </View>
            {scope === "tower" && (
              <View className="gap-2">
                <View className="flex-row flex-wrap gap-2">
                  {towers.map((tower) => (
                    <Chip
                      key={tower.id}
                      label={tower.name}
                      selected={targetTowerId === tower.id}
                      onPress={() => {
                        setTargetTowerId(tower.id);
                        setAudienceError(null);
                      }}
                    />
                  ))}
                </View>
                {audienceError && <Text className="text-body-sm text-status-red">{audienceError}</Text>}
              </View>
            )}
            {scope === "flat" && (
              <View className="gap-2">
                <View className="flex-row flex-wrap gap-2">
                  {flats.map((flat) => (
                    <Chip
                      key={flat.id}
                      label={flat.flatNumber}
                      selected={targetFlatId === flat.id}
                      onPress={() => {
                        setTargetFlatId(flat.id);
                        setAudienceError(null);
                      }}
                    />
                  ))}
                </View>
                {audienceError && <Text className="text-body-sm text-status-red">{audienceError}</Text>}
              </View>
            )}
            <Button onPress={handlePublish} loading={createMutation.isPending}>
              Publish
            </Button>
          </FormPanel>
        )}

        <View className="bg-surface p-3" style={[{ borderRadius: 16 }, shadowCard]}>
          <Input placeholder="Search notices..." value={search} onChangeText={setSearch} />
        </View>

        {noticesQuery.isLoading ? (
          <ListLoading />
        ) : noticesQuery.isError ? (
          <View className="rounded-card bg-surface">
            <EmptyState title="Couldn't load notices" description="Pull down to refresh and try again." icon="error-outline" />
          </View>
        ) : notices.length === 0 ? (
          <View className="rounded-card bg-surface">
            <EmptyState title="No notices yet" description="Publish your first notice above." icon="campaign" />
          </View>
        ) : (
          <View className="gap-4">
            {notices.map((notice) => {
              const published = formatPublished(notice.publishedAt);
              const audience =
                notice.targetScope === "all"
                  ? "All Residents"
                  : notice.targetScope === "tower"
                    ? `Tower ${notice.targetTowerName ?? "—"}`
                    : `Flat ${notice.targetFlatNumber ?? "—"}`;
              return (
                <View key={notice.id} className="bg-surface" style={[{ borderRadius: 20, overflow: "hidden" }, shadowCard]}>
                  <View
                    pointerEvents="none"
                    style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 5, backgroundColor: "#FEB246" }}
                  />
                  <View className="gap-2 p-5">
                    <View className="flex-row items-center gap-3">
                      <View
                        className="flex-row items-center gap-1.5 rounded-full px-2.5 py-1"
                        style={{ backgroundColor: "rgba(39,201,109,0.14)" }}
                      >
                        <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: "#27C96D" }} />
                        <Text className="text-label-caps font-bold uppercase" style={{ color: "#1B7A44" }}>
                          Active
                        </Text>
                      </View>
                      {published && (
                        <Text className="min-w-0 flex-1 text-meta-text text-text-muted" numberOfLines={1}>
                          {published}
                        </Text>
                      )}
                      <IconButton
                        icon="delete-outline"
                        color="#BA1A1A"
                        onPress={() => confirmDelete(notice.id, notice.title)}
                        accessibilityLabel={`Delete ${notice.title}`}
                      />
                    </View>
                    <Text className="text-headline-md font-extrabold text-on-surface">{notice.title}</Text>
                    <Text className="text-body-md text-on-surface-variant" numberOfLines={2}>
                      {notice.body}
                    </Text>
                    <View className="flex-row items-center gap-2 pt-1">
                      <MaterialIcons name="groups" size={16} color="#8A8A8A" />
                      <View className="rounded-full bg-surface-container-high px-2.5 py-1">
                        <Text className="text-meta-text text-on-surface-variant">Audience: {audience}</Text>
                      </View>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
