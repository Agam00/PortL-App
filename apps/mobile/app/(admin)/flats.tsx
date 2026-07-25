import { useState } from "react";
import { View, Text, ScrollView, RefreshControl, Alert } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { trpc } from "../../lib/trpc";
import { useUiStore } from "../../stores/ui-store";
import { getErrorMessage } from "../../lib/error-message";
import { hapticSuccess, hapticError } from "../../lib/haptics";
import { AdminHeader } from "../../components/ui/admin-header";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Chip } from "../../components/ui/chip";
import { EmptyState } from "../../components/ui/empty-state";
import { FormPanel } from "../../components/ui/form-panel";
import { IconButton } from "../../components/ui/icon-button";
import { ListLoading } from "../../components/ui/list-loading";
import { PressableScale } from "../../components/ui/pressable-scale";
import { shadowCard } from "../../lib/shadows";

export default function AdminFlats() {
  const showToast = useUiStore((s) => s.showToast);
  const utils = trpc.useUtils();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [towerId, setTowerId] = useState<string | null>(null);
  const [flatNumber, setFlatNumber] = useState("");
  const [floor, setFloor] = useState("");
  const [type, setType] = useState("");
  const [flatNumberError, setFlatNumberError] = useState<string | null>(null);
  const [towerError, setTowerError] = useState<string | null>(null);

  const towersQuery = trpc.towers.list.useQuery();
  const flatsQuery = trpc.flats.list.useQuery({});

  function resetForm() {
    setShowForm(false);
    setEditingId(null);
    setTowerId(null);
    setFlatNumber("");
    setFloor("");
    setType("");
    setFlatNumberError(null);
    setTowerError(null);
  }

  const invalidate = () => {
    utils.flats.list.invalidate();
    utils.towers.list.invalidate();
  };

  const createMutation = trpc.flats.create.useMutation({
    onSuccess: () => {
      hapticSuccess();
      showToast("Flat added", "success");
      resetForm();
      invalidate();
    },
    onError: (error) => {
      hapticError();
      showToast(getErrorMessage(error), "error");
    },
  });

  const updateMutation = trpc.flats.update.useMutation({
    onSuccess: () => {
      hapticSuccess();
      showToast("Flat updated", "success");
      resetForm();
      invalidate();
    },
    onError: (error) => {
      hapticError();
      showToast(getErrorMessage(error), "error");
    },
  });

  const removeMutation = trpc.flats.remove.useMutation({
    onSuccess: () => {
      hapticSuccess();
      showToast("Flat removed", "success");
      invalidate();
    },
    onError: (error) => {
      hapticError();
      showToast(getErrorMessage(error), "error");
    },
  });

  function startEdit(flat: { id: string; towerId: string; flatNumber: string; floor: number | null; type: string | null }) {
    setEditingId(flat.id);
    setTowerId(flat.towerId);
    setFlatNumber(flat.flatNumber);
    setFloor(flat.floor?.toString() ?? "");
    setType(flat.type ?? "");
    setShowForm(true);
    setFlatNumberError(null);
    setTowerError(null);
  }

  function confirmDelete(flatId: string, label: string) {
    Alert.alert("Remove flat?", `${label} will be permanently removed.`, [
      { text: "Cancel", style: "cancel" },
      { text: "Remove", style: "destructive", onPress: () => removeMutation.mutate({ flatId }) },
    ]);
  }

  function handleSubmit() {
    const flatNumberMissing = !flatNumber.trim();
    setFlatNumberError(flatNumberMissing ? "Flat number is required" : null);
    if (!editingId && !towerId) {
      setTowerError("Select a tower first");
    } else {
      setTowerError(null);
    }
    if (flatNumberMissing || (!editingId && !towerId)) return;

    const floorNum = floor.trim() ? Number.parseInt(floor, 10) : undefined;
    if (editingId) {
      updateMutation.mutate({ flatId: editingId, flatNumber: flatNumber.trim(), floor: floorNum, type: type.trim() || undefined });
    } else {
      createMutation.mutate({ towerId: towerId as string, flatNumber: flatNumber.trim(), floor: floorNum, type: type.trim() || undefined });
    }
  }

  const towers = towersQuery.data ?? [];
  const flats = flatsQuery.data ?? [];
  const occupiedCount = flats.filter((f) => f.residentCount > 0).length;
  const flatsByTower = new Map<string, typeof flats>();
  for (const flat of flats) {
    const list = flatsByTower.get(flat.towerName) ?? [];
    list.push(flat);
    flatsByTower.set(flat.towerName, list);
  }

  return (
    <View className="flex-1 bg-background">
      <AdminHeader showBack barTitle="Flats" />
      <ScrollView
        contentContainerClassName="gap-4 p-4 pb-8"
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl tintColor="#F5821F" colors={["#F5821F"]} progressBackgroundColor="#1A1A1A"
            refreshing={flatsQuery.isRefetching || towersQuery.isRefetching}
            onRefresh={() => {
              flatsQuery.refetch();
              towersQuery.refetch();
            }}
          />
        }
      >
        {/* flats_management mockup: white intro card with title, blurb, and two stat chips */}
        <View className="gap-3 bg-surface p-5" style={[{ borderRadius: 16 }, shadowCard]}>
          <Text className="text-headline-lg font-extrabold text-on-surface">Flats Management</Text>
          <Text className="text-body-sm text-text-muted">
            Manage residential units across all towers. Monitor occupancy, edit details, or add new units to the registry.
          </Text>
          <View className="flex-row gap-3">
            <View className="flex-1 gap-1 bg-surface-container p-4" style={{ borderRadius: 12 }}>
              <Text className="text-label-caps uppercase text-text-muted">Total Flats</Text>
              <Text className="text-headline-md font-extrabold text-primary">{flatsQuery.isLoading ? "—" : flats.length}</Text>
            </View>
            <View className="flex-1 gap-1 bg-surface-container p-4" style={{ borderRadius: 12 }}>
              <Text className="text-label-caps uppercase text-text-muted">Occupied</Text>
              <Text className="text-headline-md font-extrabold" style={{ color: "#E19613" }}>
                {flatsQuery.isLoading ? "—" : occupiedCount}
              </Text>
            </View>
          </View>
        </View>

        <Button
          variant={showForm ? "outline" : "primary"}
          onPress={() => (showForm ? resetForm() : setShowForm(true))}
        >
          {showForm ? "Cancel" : "+ Add Flat"}
        </Button>

        {showForm && (
          <FormPanel>
            <View className="flex-row items-center gap-2">
              <MaterialIcons name="add-circle-outline" size={20} color="#F5821F" />
              <Text className="text-body-md font-bold text-on-surface">{editingId ? "Edit Flat" : "Quick Add Flat"}</Text>
            </View>

            {!editingId && (
              <View className="gap-2">
                <Text className="text-label-caps uppercase text-text-muted">Tower</Text>
                <View className="flex-row flex-wrap gap-2">
                  {towers.map((tower) => (
                    <Chip
                      key={tower.id}
                      label={tower.name}
                      selected={towerId === tower.id}
                      onPress={() => {
                        setTowerId(tower.id);
                        setTowerError(null);
                      }}
                    />
                  ))}
                </View>
                {towerError && <Text className="text-body-sm text-status-red">{towerError}</Text>}
              </View>
            )}

            <Input
              label="Flat Number"
              placeholder="e.g. A-103"
              value={flatNumber}
              onChangeText={(v) => {
                setFlatNumber(v);
                if (flatNumberError) setFlatNumberError(null);
              }}
              error={flatNumberError ?? undefined}
            />
            <Input label="Floor (optional)" placeholder="e.g. 1" keyboardType="number-pad" value={floor} onChangeText={setFloor} />
            <Input label="Type (optional)" placeholder="e.g. 2BHK" value={type} onChangeText={setType} />
            <Button onPress={handleSubmit} loading={createMutation.isPending || updateMutation.isPending}>
              {editingId ? "Save Changes" : "Add to Registry"}
            </Button>
          </FormPanel>
        )}

        {flatsQuery.isLoading ? (
          <ListLoading />
        ) : flatsQuery.isError ? (
          <View className="rounded-card bg-surface">
            <EmptyState title="Couldn't load flats" description="Pull down to refresh and try again." icon="error-outline" />
          </View>
        ) : flats.length === 0 ? (
          <View className="rounded-card bg-surface">
            <EmptyState title="No flats yet" description="Add a flat to a tower to get started." icon="door-front" />
          </View>
        ) : (
          Array.from(flatsByTower.entries()).map(([towerName, towerFlats]) => (
            <View key={towerName} className="gap-3">
              <View className="flex-row items-center gap-2 pt-1">
                <MaterialIcons name="apartment" size={20} color="#F5821F" />
                <Text className="text-headline-md font-extrabold text-on-surface">{towerName}</Text>
                <View className="mx-2 flex-1" style={{ height: 1, backgroundColor: "rgba(51,51,51,0.6)" }} />
                <Text className="text-meta-text text-text-muted">{towerFlats.length} units</Text>
              </View>

              {towerFlats.map((flat) => {
                const occupied = flat.residentCount > 0;
                const meta = [
                  flat.floor !== null ? `Floor ${flat.floor}` : null,
                  flat.type,
                  occupied ? `${flat.residentCount} resident${flat.residentCount > 1 ? "s" : ""}` : null,
                ]
                  .filter(Boolean)
                  .join(" • ");
                return (
                  <View
                    key={flat.id}
                    className="bg-surface"
                    style={[{ borderRadius: 16, overflow: "hidden" }, shadowCard]}
                  >
                    <View
                      pointerEvents="none"
                      style={{
                        position: "absolute",
                        left: 0,
                        top: 0,
                        bottom: 0,
                        width: 5,
                        backgroundColor: occupied ? "#FEB246" : "#6E6E6E",
                      }}
                    />
                    <View className="gap-3 p-4 pl-5">
                      <View className="flex-row items-center justify-between gap-3">
                        <Text className="min-w-0 flex-1 text-headline-md font-extrabold text-on-surface" numberOfLines={1}>
                          {flat.flatNumber}
                        </Text>
                        <View
                          className="rounded-full px-3 py-1"
                          style={{ backgroundColor: occupied ? "rgba(254,178,70,0.22)" : "#262626" }}
                        >
                          <Text className="text-meta-text font-semibold" style={{ color: occupied ? "#845400" : "#C4C4C4" }}>
                            {occupied ? "Occupied" : "Vacant"}
                          </Text>
                        </View>
                      </View>
                      {meta.length > 0 && <Text className="text-body-sm text-text-muted">{meta}</Text>}
                      <View style={{ height: 1, backgroundColor: "rgba(51,51,51,0.45)" }} />
                      <View className="flex-row gap-3">
                        <PressableScale
                          scaleTo={0.97}
                          className="flex-1 flex-row items-center justify-center gap-2 bg-surface-container py-2.5"
                          style={{ borderRadius: 12 }}
                          onPress={() => startEdit(flat)}
                          accessibilityRole="button"
                          accessibilityLabel={`Edit ${flat.flatNumber}`}
                        >
                          <MaterialIcons name="edit" size={16} color="#F5821F" />
                          <Text className="text-body-sm font-semibold text-primary">Edit</Text>
                        </PressableScale>
                        <PressableScale
                          scaleTo={0.97}
                          className="flex-1 flex-row items-center justify-center gap-2 py-2.5"
                          style={{ borderRadius: 12, backgroundColor: "rgba(186,26,26,0.08)" }}
                          onPress={() => confirmDelete(flat.id, flat.flatNumber)}
                          accessibilityRole="button"
                          accessibilityLabel={`Delete ${flat.flatNumber}`}
                        >
                          <MaterialIcons name="delete-outline" size={16} color="#BA1A1A" />
                          <Text className="text-body-sm font-semibold" style={{ color: "#BA1A1A" }}>
                            Delete
                          </Text>
                        </PressableScale>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}
