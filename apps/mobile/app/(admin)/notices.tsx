import { useState } from "react";
import { View, Text, ScrollView, Pressable, Alert, ActivityIndicator } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { trpc } from "../../lib/trpc";
import { useUiStore } from "../../stores/ui-store";
import { getErrorMessage } from "../../lib/error-message";
import { ScreenHeader } from "../../components/ui/screen-header";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Chip } from "../../components/ui/chip";
import { EmptyState } from "../../components/ui/empty-state";

const SCOPES: { value: "all" | "tower" | "flat"; label: string }[] = [
  { value: "all", label: "All Residents" },
  { value: "tower", label: "Specific Tower" },
  { value: "flat", label: "Specific Flat" },
];

export default function AdminNotices() {
  const showToast = useUiStore((s) => s.showToast);
  const utils = trpc.useUtils();
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [scope, setScope] = useState<"all" | "tower" | "flat">("all");
  const [targetTowerId, setTargetTowerId] = useState<string | null>(null);
  const [targetFlatId, setTargetFlatId] = useState<string | null>(null);

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
  }

  const createMutation = trpc.notices.create.useMutation({
    onSuccess: () => {
      showToast("Notice published", "success");
      resetForm();
      utils.notices.list.invalidate();
    },
    onError: (error) => showToast(getErrorMessage(error), "error"),
  });

  const removeMutation = trpc.notices.remove.useMutation({
    onSuccess: () => {
      showToast("Notice removed", "success");
      utils.notices.list.invalidate();
    },
    onError: (error) => showToast(getErrorMessage(error), "error"),
  });

  function confirmDelete(noticeId: string, label: string) {
    Alert.alert("Remove notice?", `"${label}" will be permanently removed.`, [
      { text: "Cancel", style: "cancel" },
      { text: "Remove", style: "destructive", onPress: () => removeMutation.mutate({ noticeId }) },
    ]);
  }

  function handlePublish() {
    if (!title.trim() || !body.trim()) {
      showToast("Title and message are required", "error");
      return;
    }
    if (scope === "tower" && !targetTowerId) {
      showToast("Select a tower", "error");
      return;
    }
    if (scope === "flat" && !targetFlatId) {
      showToast("Select a flat", "error");
      return;
    }
    createMutation.mutate({
      title: title.trim(),
      body: body.trim(),
      targetScope: scope,
      targetTowerId: scope === "tower" ? (targetTowerId ?? undefined) : undefined,
      targetFlatId: scope === "flat" ? (targetFlatId ?? undefined) : undefined,
    });
  }

  const notices = noticesQuery.data ?? [];
  const towers = towersQuery.data ?? [];
  const flats = flatsQuery.data ?? [];

  return (
    <View className="flex-1 bg-background">
      <ScreenHeader title="Notices Management" role="admin" />
      <ScrollView contentContainerClassName="gap-4 p-4 pb-8" keyboardShouldPersistTaps="handled">
        <Button variant={showForm ? "outline" : "primary"} onPress={() => (showForm ? resetForm() : setShowForm(true))}>
          {showForm ? "Cancel" : "+ Compose Notice"}
        </Button>

        {showForm && (
          <View className="gap-3 rounded-lg border border-border-subtle bg-surface p-4">
            <Text className="text-body-md font-semibold text-on-surface">Compose Notice</Text>
            <Input label="Title" placeholder="e.g. Scheduled Water Maintenance" value={title} onChangeText={setTitle} />
            <Input
              label="Message"
              placeholder="Enter notice details here..."
              value={body}
              onChangeText={setBody}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              className="min-h-[96px]"
            />
            <View className="gap-2">
              <Text className="text-label-caps uppercase text-text-muted">Audience</Text>
              <View className="flex-row flex-wrap gap-2">
                {SCOPES.map((s) => (
                  <Chip key={s.value} label={s.label} selected={scope === s.value} onPress={() => setScope(s.value)} />
                ))}
              </View>
            </View>
            {scope === "tower" && (
              <View className="flex-row flex-wrap gap-2">
                {towers.map((tower) => (
                  <Chip key={tower.id} label={tower.name} selected={targetTowerId === tower.id} onPress={() => setTargetTowerId(tower.id)} />
                ))}
              </View>
            )}
            {scope === "flat" && (
              <View className="flex-row flex-wrap gap-2">
                {flats.map((flat) => (
                  <Chip key={flat.id} label={flat.flatNumber} selected={targetFlatId === flat.id} onPress={() => setTargetFlatId(flat.id)} />
                ))}
              </View>
            )}
            <Button onPress={handlePublish} loading={createMutation.isPending}>
              Publish
            </Button>
          </View>
        )}

        <Text className="text-headline-md font-semibold text-on-surface">Active Notices</Text>

        {noticesQuery.isLoading ? (
          <ActivityIndicator className="py-8" color="#5e6ad2" />
        ) : notices.length === 0 ? (
          <View className="rounded-lg border border-border-subtle bg-surface-elevated">
            <EmptyState title="No notices yet" description="Publish your first notice above." icon="campaign" />
          </View>
        ) : (
          <View className="gap-2">
            {notices.map((notice) => (
              <View key={notice.id} className="gap-2 rounded-xl border border-border-subtle bg-surface p-4">
                <View className="flex-row items-start justify-between gap-2">
                  <View className="min-w-0 flex-1">
                    <Text className="text-body-md font-medium text-on-surface">{notice.title}</Text>
                    <Text className="text-meta-text text-text-muted">
                      {notice.targetScope === "all"
                        ? "All residents"
                        : notice.targetScope === "tower"
                          ? `Tower: ${notice.targetTowerName ?? "—"}`
                          : `Flat: ${notice.targetFlatNumber ?? "—"}`}
                    </Text>
                  </View>
                  <Pressable onPress={() => confirmDelete(notice.id, notice.title)} hitSlop={8} className="p-1">
                    <MaterialIcons name="delete-outline" size={18} color="#e5484d" />
                  </Pressable>
                </View>
                <Text className="text-body-sm text-on-surface-variant" numberOfLines={3}>
                  {notice.body}
                </Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
