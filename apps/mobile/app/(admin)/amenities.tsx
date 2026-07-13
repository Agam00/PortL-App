import { useState } from "react";
import { View, Text, ScrollView, Pressable, Alert, ActivityIndicator } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { trpc } from "../../lib/trpc";
import { useUiStore } from "../../stores/ui-store";
import { getErrorMessage } from "../../lib/error-message";
import { ScreenHeader } from "../../components/ui/screen-header";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { TimeField } from "../../components/ui/time-field";
import { EmptyState } from "../../components/ui/empty-state";

function timeToDate(time: string): Date {
  const [h, m] = time.split(":").map(Number);
  const date = new Date();
  date.setHours(h ?? 0, m ?? 0, 0, 0);
  return date;
}

function dateToTime(date: Date): string {
  return `${date.getHours().toString().padStart(2, "0")}:${date.getMinutes().toString().padStart(2, "0")}`;
}

export default function AdminAmenities() {
  const showToast = useUiStore((s) => s.showToast);
  const utils = trpc.useUtils();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [capacity, setCapacity] = useState("1");
  const [openTime, setOpenTime] = useState(timeToDate("06:00"));
  const [closeTime, setCloseTime] = useState(timeToDate("22:00"));
  const [slotMinutes, setSlotMinutes] = useState("60");

  const amenitiesQuery = trpc.amenities.list.useQuery();

  function resetForm() {
    setShowForm(false);
    setEditingId(null);
    setName("");
    setDescription("");
    setCapacity("1");
    setOpenTime(timeToDate("06:00"));
    setCloseTime(timeToDate("22:00"));
    setSlotMinutes("60");
  }

  const createMutation = trpc.amenities.create.useMutation({
    onSuccess: () => {
      showToast("Facility added", "success");
      resetForm();
      utils.amenities.list.invalidate();
    },
    onError: (error) => showToast(getErrorMessage(error), "error"),
  });

  const updateMutation = trpc.amenities.update.useMutation({
    onSuccess: () => {
      showToast("Facility updated", "success");
      resetForm();
      utils.amenities.list.invalidate();
    },
    onError: (error) => showToast(getErrorMessage(error), "error"),
  });

  const removeMutation = trpc.amenities.remove.useMutation({
    onSuccess: () => {
      showToast("Facility removed", "success");
      utils.amenities.list.invalidate();
    },
    onError: (error) => showToast(getErrorMessage(error), "error"),
  });

  const toggleActiveMutation = trpc.amenities.update.useMutation({
    onSuccess: () => utils.amenities.list.invalidate(),
    onError: (error) => showToast(getErrorMessage(error), "error"),
  });

  function startEdit(amenity: {
    id: string;
    name: string;
    description: string | null;
    capacity: number;
    openTime: string;
    closeTime: string;
    slotMinutes: number;
  }) {
    setEditingId(amenity.id);
    setName(amenity.name);
    setDescription(amenity.description ?? "");
    setCapacity(amenity.capacity.toString());
    setOpenTime(timeToDate(amenity.openTime));
    setCloseTime(timeToDate(amenity.closeTime));
    setSlotMinutes(amenity.slotMinutes.toString());
    setShowForm(true);
  }

  function confirmDelete(amenityId: string, label: string) {
    Alert.alert("Remove facility?", `${label} will be permanently removed.`, [
      { text: "Cancel", style: "cancel" },
      { text: "Remove", style: "destructive", onPress: () => removeMutation.mutate({ amenityId }) },
    ]);
  }

  function handleSubmit() {
    if (!name.trim()) return;
    const input = {
      name: name.trim(),
      description: description.trim() || undefined,
      capacity: Number.parseInt(capacity, 10) || 1,
      openTime: dateToTime(openTime),
      closeTime: dateToTime(closeTime),
      slotMinutes: Number.parseInt(slotMinutes, 10) || 60,
    };
    if (editingId) {
      updateMutation.mutate({ amenityId: editingId, ...input });
    } else {
      createMutation.mutate(input);
    }
  }

  const amenities = amenitiesQuery.data ?? [];

  return (
    <View className="flex-1 bg-background">
      <ScreenHeader title="Facilities Management" role="admin" />
      <ScrollView contentContainerClassName="gap-4 p-4 pb-8" keyboardShouldPersistTaps="handled">
        <Text className="text-body-sm text-text-muted">Manage society amenities and access rules.</Text>

        <Button variant={showForm ? "outline" : "primary"} onPress={() => (showForm ? resetForm() : setShowForm(true))}>
          {showForm ? "Cancel" : "+ Add Facility"}
        </Button>

        {showForm && (
          <View className="gap-3 rounded-lg border border-border-subtle bg-surface p-4">
            <Text className="text-body-md font-semibold text-on-surface">{editingId ? "Edit Facility" : "New Facility"}</Text>
            <Input label="Facility Name" placeholder="e.g. Swimming Pool" value={name} onChangeText={setName} />
            <Input label="Description (optional)" placeholder="Short description" value={description} onChangeText={setDescription} />
            <Input label="Capacity" placeholder="e.g. 20" keyboardType="number-pad" value={capacity} onChangeText={setCapacity} />
            <View className="flex-row gap-3">
              <TimeField label="Opens At" value={openTime} onChange={setOpenTime} />
              <TimeField label="Closes At" value={closeTime} onChange={setCloseTime} />
            </View>
            <Input label="Slot Length (minutes)" placeholder="e.g. 60" keyboardType="number-pad" value={slotMinutes} onChangeText={setSlotMinutes} />
            <Button onPress={handleSubmit} loading={createMutation.isPending || updateMutation.isPending}>
              {editingId ? "Save Changes" : "Add Facility"}
            </Button>
          </View>
        )}

        {amenitiesQuery.isLoading ? (
          <ActivityIndicator className="py-8" color="#5e6ad2" />
        ) : amenities.length === 0 ? (
          <View className="rounded-lg border border-border-subtle bg-surface-elevated">
            <EmptyState title="No facilities yet" description="Add a facility to get started." icon="pool" />
          </View>
        ) : (
          <View className="gap-2">
            {amenities.map((amenity) => (
              <View key={amenity.id} className="gap-3 rounded-xl border border-border-subtle bg-surface p-4">
                <View className="flex-row items-center gap-3">
                  <View className="h-11 w-11 items-center justify-center rounded-lg border border-border-subtle bg-surface-elevated">
                    <MaterialIcons name="pool" size={20} color="#c6c5d5" />
                  </View>
                  <View className="min-w-0 flex-1">
                    <Text className="text-body-md font-medium text-on-surface" numberOfLines={1}>
                      {amenity.name}
                    </Text>
                    <View className="flex-row items-center gap-1.5">
                      <View className={`h-1.5 w-1.5 rounded-full ${amenity.isActive ? "bg-status-green" : "bg-status-amber"}`} />
                      <Text className="text-meta-text text-text-muted">{amenity.isActive ? "Active" : "Inactive"}</Text>
                    </View>
                  </View>
                  <Pressable onPress={() => startEdit(amenity)} hitSlop={8} className="p-1">
                    <MaterialIcons name="edit" size={18} color="#8A8F98" />
                  </Pressable>
                  <Pressable onPress={() => confirmDelete(amenity.id, amenity.name)} hitSlop={8} className="p-1">
                    <MaterialIcons name="delete-outline" size={18} color="#e5484d" />
                  </Pressable>
                </View>
                <View className="h-px bg-border-subtle" />
                <View className="flex-row justify-between">
                  <View>
                    <Text className="text-meta-text text-text-muted">Capacity</Text>
                    <Text className="text-body-sm text-on-surface">{amenity.capacity} Persons</Text>
                  </View>
                  <View>
                    <Text className="text-meta-text text-text-muted">Hours</Text>
                    <Text className="text-body-sm text-on-surface">
                      {amenity.openTime.slice(0, 5)} - {amenity.closeTime.slice(0, 5)}
                    </Text>
                  </View>
                  <Button
                    variant="outline"
                    onPress={() => toggleActiveMutation.mutate({ amenityId: amenity.id, isActive: !amenity.isActive })}
                  >
                    {amenity.isActive ? "Deactivate" : "Activate"}
                  </Button>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
