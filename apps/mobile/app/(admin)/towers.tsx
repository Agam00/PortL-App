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
import { EmptyState } from "../../components/ui/empty-state";
import { FormPanel } from "../../components/ui/form-panel";
import { IconButton } from "../../components/ui/icon-button";
import { ListLoading } from "../../components/ui/list-loading";
import { shadowCard } from "../../lib/shadows";

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
      <ScreenHeader title="Towers" subtitle="Manage residential tower configurations." role="admin" />
      <ScrollView
        contentContainerClassName="gap-4 px-4 pb-8 pt-2"
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={towersQuery.isRefetching} onRefresh={() => towersQuery.refetch()} />}
      >
        <Button
          variant={showForm ? "outline" : "primary"}
          onPress={() => (showForm ? resetForm() : setShowForm(true))}
        >
          {showForm ? "Cancel" : "+ Add New Tower"}
        </Button>

        {showForm && (
          <FormPanel>
            <View className="flex-row items-center gap-2">
              <MaterialIcons name="add-circle-outline" size={20} color="#6244CD" />
              <Text className="text-body-md font-bold text-on-surface">
                {editingId ? "Edit Tower" : "Quick Add Tower"}
              </Text>
            </View>
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
          </FormPanel>
        )}

        {towersQuery.isLoading ? (
          <ListLoading />
        ) : towersQuery.isError ? (
          <View className="rounded-card bg-surface">
            <EmptyState title="Couldn't load towers" description="Pull down to refresh and try again." icon="error-outline" />
          </View>
        ) : towers.length === 0 ? (
          <View className="rounded-card bg-surface">
            <EmptyState title="No towers yet" description="Add your first tower to get started." icon="business" />
          </View>
        ) : (
          <View className="gap-4">
            {towers.map((tower) => (
              <View
                key={tower.id}
                className="gap-3 bg-surface p-5"
                style={[{ borderRadius: 24, overflow: "hidden" }, shadowCard]}
              >
                <View
                  pointerEvents="none"
                  style={{
                    position: "absolute",
                    top: -36,
                    right: -36,
                    width: 120,
                    height: 120,
                    borderRadius: 60,
                    backgroundColor: "#F6F2FB",
                  }}
                />
                <View className="flex-row items-center gap-4">
                  <View
                    className="items-center justify-center bg-surface-container"
                    style={{ width: 56, height: 56, borderRadius: 14 }}
                  >
                    <MaterialIcons name="apartment" size={28} color="#6244CD" />
                  </View>
                  <View className="min-w-0 flex-1 gap-1.5">
                    <Text className="text-headline-md font-extrabold text-on-surface" numberOfLines={1}>
                      {tower.name}
                    </Text>
                    <View className="flex-row gap-2">
                      {tower.code ? (
                        <View className="self-start rounded-full bg-surface-container-high px-2.5 py-1">
                          <Text className="text-meta-text text-on-surface-variant">Code: {tower.code}</Text>
                        </View>
                      ) : null}
                      <View className="self-start rounded-full bg-surface-container-high px-2.5 py-1">
                        <Text className="text-meta-text text-on-surface-variant">
                          {tower.flatCount} {tower.flatCount === 1 ? "flat" : "flats"}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
                <View className="border-t border-outline-variant/50" style={{ borderTopWidth: 1, borderColor: "rgba(202,196,214,0.45)" }} />
                <View className="flex-row items-center justify-end gap-4">
                  <IconButton icon="edit" size={20} color="#48454F" onPress={() => startEdit(tower)} accessibilityLabel={`Edit ${tower.name}`} />
                  <IconButton
                    icon="delete-outline"
                    size={20}
                    color="#BA1A1A"
                    onPress={() => confirmDelete(tower.id, tower.name)}
                    accessibilityLabel={`Delete ${tower.name}`}
                  />
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
