import { useState } from "react";
import { View, Text, ScrollView, RefreshControl, Pressable, Alert, ActivityIndicator } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { trpc } from "../../lib/trpc";
import { useUiStore } from "../../stores/ui-store";
import { getErrorMessage } from "../../lib/error-message";
import { hapticSuccess, hapticError } from "../../lib/haptics";
import { ScreenHeader } from "../../components/ui/screen-header";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { EmptyState } from "../../components/ui/empty-state";

export default function AdminTowers() {
  const showToast = useUiStore((s) => s.showToast);
  const utils = trpc.useUtils();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [nameError, setNameError] = useState<string | null>(null);

  const towersQuery = trpc.towers.list.useQuery();

  function resetForm() {
    setShowForm(false);
    setEditingId(null);
    setName("");
    setCode("");
    setNameError(null);
  }

  const createMutation = trpc.towers.create.useMutation({
    onSuccess: () => {
      hapticSuccess();
      showToast("Tower added", "success");
      resetForm();
      utils.towers.list.invalidate();
    },
    onError: (error) => {
      hapticError();
      showToast(getErrorMessage(error), "error");
    },
  });

  const updateMutation = trpc.towers.update.useMutation({
    onSuccess: () => {
      hapticSuccess();
      showToast("Tower updated", "success");
      resetForm();
      utils.towers.list.invalidate();
    },
    onError: (error) => {
      hapticError();
      showToast(getErrorMessage(error), "error");
    },
  });

  const removeMutation = trpc.towers.remove.useMutation({
    onSuccess: () => {
      hapticSuccess();
      showToast("Tower removed", "success");
      utils.towers.list.invalidate();
    },
    onError: (error) => {
      hapticError();
      showToast(getErrorMessage(error), "error");
    },
  });

  function startEdit(tower: { id: string; name: string; code: string | null }) {
    setEditingId(tower.id);
    setName(tower.name);
    setCode(tower.code ?? "");
    setShowForm(true);
    setNameError(null);
  }

  function confirmDelete(towerId: string, towerName: string) {
    Alert.alert("Remove tower?", `${towerName} will be permanently removed.`, [
      { text: "Cancel", style: "cancel" },
      { text: "Remove", style: "destructive", onPress: () => removeMutation.mutate({ towerId }) },
    ]);
  }

  function handleSubmit() {
    if (!name.trim()) {
      setNameError("Tower name is required");
      return;
    }
    if (editingId) {
      updateMutation.mutate({ towerId: editingId, name: name.trim(), code: code.trim() || undefined });
    } else {
      createMutation.mutate({ name: name.trim(), code: code.trim() || undefined });
    }
  }

  const towers = towersQuery.data ?? [];

  return (
    <View className="flex-1 bg-background">
      <ScreenHeader title="Towers Management" role="admin" />
      <ScrollView
        contentContainerClassName="gap-4 p-4 pb-8"
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={towersQuery.isRefetching} onRefresh={() => towersQuery.refetch()} />}
      >
        <Text className="text-body-sm text-text-muted">Configure and monitor residential blocks.</Text>

        <Button
          variant={showForm ? "outline" : "primary"}
          onPress={() => (showForm ? resetForm() : setShowForm(true))}
        >
          {showForm ? "Cancel" : "+ Add Tower"}
        </Button>

        {showForm && (
          <View className="gap-3 rounded-lg border border-border-subtle bg-surface p-4">
            <Text className="text-body-md font-semibold text-on-surface">
              {editingId ? "Edit Tower" : "New Tower"}
            </Text>
            <Input
              label="Tower Name"
              placeholder="e.g. Tower A"
              value={name}
              onChangeText={(v) => {
                setName(v);
                if (nameError) setNameError(null);
              }}
              error={nameError ?? undefined}
            />
            <Input label="Code (optional)" placeholder="e.g. A" value={code} onChangeText={setCode} autoCapitalize="characters" />
            <Button onPress={handleSubmit} loading={createMutation.isPending || updateMutation.isPending}>
              {editingId ? "Save Changes" : "Add Tower"}
            </Button>
          </View>
        )}

        {towersQuery.isLoading ? (
          <ActivityIndicator className="py-8" color="#5e6ad2" />
        ) : towersQuery.isError ? (
          <View className="rounded-lg border border-border-subtle bg-surface-elevated">
            <EmptyState title="Couldn't load towers" description="Pull down to refresh and try again." icon="error-outline" />
          </View>
        ) : towers.length === 0 ? (
          <View className="rounded-lg border border-border-subtle bg-surface-elevated">
            <EmptyState title="No towers yet" description="Add your first tower to get started." icon="business" />
          </View>
        ) : (
          <View className="gap-2">
            {towers.map((tower) => (
              <View
                key={tower.id}
                className="flex-row items-center gap-3 rounded-xl border border-border-subtle bg-surface p-4"
              >
                <View className="h-11 w-11 items-center justify-center rounded-lg border border-border-subtle bg-surface-elevated">
                  <MaterialIcons name="business" size={20} color="#c6c5d5" />
                </View>
                <View className="min-w-0 flex-1">
                  <Text className="text-body-md font-medium text-on-surface" numberOfLines={1}>
                    {tower.name}
                    {tower.code ? ` (${tower.code})` : ""}
                  </Text>
                  <Text className="text-meta-text text-text-muted">
                    {tower.flatCount} {tower.flatCount === 1 ? "flat" : "flats"}
                  </Text>
                </View>
                <Pressable
                  onPress={() => startEdit(tower)}
                  hitSlop={8}
                  className="p-1"
                  accessibilityLabel={`Edit ${tower.name}`}
                  accessibilityRole="button"
                >
                  <MaterialIcons name="edit" size={18} color="#8A8F98" />
                </Pressable>
                <Pressable
                  onPress={() => confirmDelete(tower.id, tower.name)}
                  hitSlop={8}
                  className="p-1"
                  accessibilityLabel={`Delete ${tower.name}`}
                  accessibilityRole="button"
                >
                  <MaterialIcons name="delete-outline" size={18} color="#e5484d" />
                </Pressable>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
