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
import { GroupLabel } from "../../components/ui/group-label";

export default function AdminFlats() {
  const showToast = useUiStore((s) => s.showToast);
  const utils = trpc.useUtils();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [towerId, setTowerId] = useState<string | null>(null);
  const [flatNumber, setFlatNumber] = useState("");
  const [floor, setFloor] = useState("");
  const [type, setType] = useState("");

  const towersQuery = trpc.towers.list.useQuery();
  const flatsQuery = trpc.flats.list.useQuery({});

  function resetForm() {
    setShowForm(false);
    setEditingId(null);
    setTowerId(null);
    setFlatNumber("");
    setFloor("");
    setType("");
  }

  const invalidate = () => {
    utils.flats.list.invalidate();
    utils.towers.list.invalidate();
  };

  const createMutation = trpc.flats.create.useMutation({
    onSuccess: () => {
      showToast("Flat added", "success");
      resetForm();
      invalidate();
    },
    onError: (error) => showToast(getErrorMessage(error), "error"),
  });

  const updateMutation = trpc.flats.update.useMutation({
    onSuccess: () => {
      showToast("Flat updated", "success");
      resetForm();
      invalidate();
    },
    onError: (error) => showToast(getErrorMessage(error), "error"),
  });

  const removeMutation = trpc.flats.remove.useMutation({
    onSuccess: () => {
      showToast("Flat removed", "success");
      invalidate();
    },
    onError: (error) => showToast(getErrorMessage(error), "error"),
  });

  function startEdit(flat: { id: string; towerId: string; flatNumber: string; floor: number | null; type: string | null }) {
    setEditingId(flat.id);
    setTowerId(flat.towerId);
    setFlatNumber(flat.flatNumber);
    setFloor(flat.floor?.toString() ?? "");
    setType(flat.type ?? "");
    setShowForm(true);
  }

  function confirmDelete(flatId: string, label: string) {
    Alert.alert("Remove flat?", `${label} will be permanently removed.`, [
      { text: "Cancel", style: "cancel" },
      { text: "Remove", style: "destructive", onPress: () => removeMutation.mutate({ flatId }) },
    ]);
  }

  function handleSubmit() {
    if (!flatNumber.trim()) return;
    const floorNum = floor.trim() ? Number.parseInt(floor, 10) : undefined;
    if (editingId) {
      updateMutation.mutate({ flatId: editingId, flatNumber: flatNumber.trim(), floor: floorNum, type: type.trim() || undefined });
    } else {
      if (!towerId) {
        showToast("Select a tower first", "error");
        return;
      }
      createMutation.mutate({ towerId, flatNumber: flatNumber.trim(), floor: floorNum, type: type.trim() || undefined });
    }
  }

  const towers = towersQuery.data ?? [];
  const flats = flatsQuery.data ?? [];
  const flatsByTower = new Map<string, typeof flats>();
  for (const flat of flats) {
    const list = flatsByTower.get(flat.towerName) ?? [];
    list.push(flat);
    flatsByTower.set(flat.towerName, list);
  }

  return (
    <View className="flex-1 bg-background">
      <ScreenHeader title="Flats Management" role="admin" />
      <ScrollView contentContainerClassName="gap-4 p-4 pb-8" keyboardShouldPersistTaps="handled">
        <Text className="text-body-sm text-text-muted">Manage units, occupancy, and assignments across all towers.</Text>

        <Button
          variant={showForm ? "outline" : "primary"}
          onPress={() => (showForm ? resetForm() : setShowForm(true))}
        >
          {showForm ? "Cancel" : "+ Add Flat"}
        </Button>

        {showForm && (
          <View className="gap-3 rounded-lg border border-border-subtle bg-surface p-4">
            <Text className="text-body-md font-semibold text-on-surface">{editingId ? "Edit Flat" : "New Flat"}</Text>

            {!editingId && (
              <View className="gap-2">
                <Text className="text-label-caps uppercase text-text-muted">Tower</Text>
                <View className="flex-row flex-wrap gap-2">
                  {towers.map((tower) => (
                    <Chip key={tower.id} label={tower.name} selected={towerId === tower.id} onPress={() => setTowerId(tower.id)} />
                  ))}
                </View>
              </View>
            )}

            <Input label="Flat Number" placeholder="e.g. A-103" value={flatNumber} onChangeText={setFlatNumber} />
            <Input label="Floor (optional)" placeholder="e.g. 1" keyboardType="number-pad" value={floor} onChangeText={setFloor} />
            <Input label="Type (optional)" placeholder="e.g. 2BHK" value={type} onChangeText={setType} />
            <Button onPress={handleSubmit} loading={createMutation.isPending || updateMutation.isPending}>
              {editingId ? "Save Changes" : "Add Flat"}
            </Button>
          </View>
        )}

        {flatsQuery.isLoading ? (
          <ActivityIndicator className="py-8" color="#5e6ad2" />
        ) : flats.length === 0 ? (
          <View className="rounded-lg border border-border-subtle bg-surface-elevated">
            <EmptyState title="No flats yet" description="Add a flat to a tower to get started." icon="door-front" />
          </View>
        ) : (
          Array.from(flatsByTower.entries()).map(([towerName, towerFlats]) => (
            <View key={towerName} className="gap-2">
              <GroupLabel label={`${towerName} · ${towerFlats.length} units`} />
              {towerFlats.map((flat) => (
                <View
                  key={flat.id}
                  className="flex-row items-center gap-3 rounded-xl border border-border-subtle bg-surface p-4"
                >
                  <View className="h-11 w-11 items-center justify-center rounded-lg border border-border-subtle bg-surface-elevated">
                    <Text className="text-body-sm font-semibold text-on-surface">{flat.flatNumber.split("-").pop()}</Text>
                  </View>
                  <View className="min-w-0 flex-1">
                    <Text className="text-body-md font-medium text-on-surface" numberOfLines={1}>
                      {flat.flatNumber}
                      {flat.type ? ` (${flat.type})` : ""}
                    </Text>
                    <View className="flex-row items-center gap-1.5">
                      <View className={`h-1.5 w-1.5 rounded-full ${flat.residentCount > 0 ? "bg-status-green" : "bg-text-muted"}`} />
                      <Text className="text-meta-text text-text-muted">
                        {flat.residentCount > 0 ? `${flat.residentCount} resident${flat.residentCount > 1 ? "s" : ""}` : "Vacant"}
                      </Text>
                    </View>
                  </View>
                  <Pressable onPress={() => startEdit(flat)} hitSlop={8} className="p-1">
                    <MaterialIcons name="edit" size={18} color="#8A8F98" />
                  </Pressable>
                  <Pressable onPress={() => confirmDelete(flat.id, flat.flatNumber)} hitSlop={8} className="p-1">
                    <MaterialIcons name="delete-outline" size={18} color="#e5484d" />
                  </Pressable>
                </View>
              ))}
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}
