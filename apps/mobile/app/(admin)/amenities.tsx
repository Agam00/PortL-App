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
import { TimeField } from "../../components/ui/time-field";
import { EmptyState } from "../../components/ui/empty-state";
import { FormPanel } from "../../components/ui/form-panel";
import { IconButton } from "../../components/ui/icon-button";
import { ListLoading } from "../../components/ui/list-loading";
import { PressableScale } from "../../components/ui/pressable-scale";
import { shadowCard } from "../../lib/shadows";

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
  const [bookingsAmenityId, setBookingsAmenityId] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);

  const amenitiesQuery = trpc.amenities.list.useQuery();
  const bookingsQuery = trpc.amenityBookings.listForAdmin.useQuery(
    { amenityId: bookingsAmenityId ?? undefined },
    { enabled: !!bookingsAmenityId },
  );

  function resetForm() {
    setShowForm(false);
    setEditingId(null);
    setName("");
    setDescription("");
    setCapacity("1");
    setOpenTime(timeToDate("06:00"));
    setCloseTime(timeToDate("22:00"));
    setSlotMinutes("60");
    setNameError(null);
  }

  const createMutation = trpc.amenities.create.useMutation({
    onSuccess: () => {
      hapticSuccess();
      showToast("Facility added", "success");
      resetForm();
      utils.amenities.list.invalidate();
    },
    onError: (error) => {
      hapticError();
      showToast(getErrorMessage(error), "error");
    },
  });

  const updateMutation = trpc.amenities.update.useMutation({
    onSuccess: () => {
      hapticSuccess();
      showToast("Facility updated", "success");
      resetForm();
      utils.amenities.list.invalidate();
    },
    onError: (error) => {
      hapticError();
      showToast(getErrorMessage(error), "error");
    },
  });

  const removeMutation = trpc.amenities.remove.useMutation({
    onSuccess: () => {
      hapticSuccess();
      showToast("Facility removed", "success");
      utils.amenities.list.invalidate();
    },
    onError: (error) => {
      hapticError();
      showToast(getErrorMessage(error), "error");
    },
  });

  const toggleActiveMutation = trpc.amenities.update.useMutation({
    onSuccess: () => {
      hapticSuccess();
      utils.amenities.list.invalidate();
    },
    onError: (error) => {
      hapticError();
      showToast(getErrorMessage(error), "error");
    },
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
    setNameError(null);
  }

  function confirmDelete(amenityId: string, label: string) {
    Alert.alert("Remove facility?", `${label} will be permanently removed.`, [
      { text: "Cancel", style: "cancel" },
      { text: "Remove", style: "destructive", onPress: () => removeMutation.mutate({ amenityId }) },
    ]);
  }

  function handleSubmit() {
    if (!name.trim()) {
      setNameError("Facility name is required");
      return;
    }
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
      <ScreenHeader title="Amenities" subtitle="Manage community facilities, schedules, and capacities." role="admin" />
      <ScrollView
        contentContainerClassName="gap-4 px-4 pb-8 pt-2"
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={amenitiesQuery.isRefetching} onRefresh={() => amenitiesQuery.refetch()} />}
      >
        <Button variant={showForm ? "outline" : "primary"} onPress={() => (showForm ? resetForm() : setShowForm(true))}>
          {showForm ? "Cancel" : "+ New Amenity"}
        </Button>

        {showForm && (
          <FormPanel className="bg-surface" style={{ borderWidth: 1.5, borderColor: "#FF9A3D" }}>
            <View className="flex-row items-center gap-2">
              <MaterialIcons name={editingId ? "edit-note" : "add-circle-outline"} size={22} color="#F5821F" />
              <Text className="text-headline-md font-extrabold text-on-surface">
                {editingId ? "Edit Amenity" : "New Amenity"}
              </Text>
            </View>
            <Input
              label="Name"
              placeholder="e.g. Swimming Pool"
              value={name}
              onChangeText={(v) => {
                setName(v);
                if (nameError) setNameError(null);
              }}
              error={nameError ?? undefined}
            />
            <Input label="Description (optional)" placeholder="Short description" value={description} onChangeText={setDescription} />
            <View className="flex-row gap-3">
              <TimeField label="Open Time" value={openTime} onChange={setOpenTime} />
              <TimeField label="Close Time" value={closeTime} onChange={setCloseTime} />
            </View>
            <Input label="Max Capacity" placeholder="e.g. 20" keyboardType="number-pad" value={capacity} onChangeText={setCapacity} />
            <Input label="Slot Length (minutes)" placeholder="e.g. 60" keyboardType="number-pad" value={slotMinutes} onChangeText={setSlotMinutes} />
            <View className="flex-row gap-3">
              <Button variant="outline" className="flex-1" onPress={resetForm}>
                Cancel
              </Button>
              <Button className="flex-1" onPress={handleSubmit} loading={createMutation.isPending || updateMutation.isPending}>
                {editingId ? "Save Changes" : "Add Amenity"}
              </Button>
            </View>
          </FormPanel>
        )}

        {amenitiesQuery.isLoading ? (
          <ListLoading />
        ) : amenitiesQuery.isError ? (
          <View className="rounded-card bg-surface">
            <EmptyState title="Couldn't load facilities" description="Pull down to refresh and try again." icon="error-outline" />
          </View>
        ) : amenities.length === 0 ? (
          <View className="rounded-card bg-surface">
            <EmptyState title="No facilities yet" description="Add a facility to get started." icon="pool" />
          </View>
        ) : (
          <View className="gap-4">
            {amenities.map((amenity) => (
              <View key={amenity.id} className="gap-3 bg-surface p-5" style={[{ borderRadius: 20 }, shadowCard]}>
                <View className="flex-row items-center justify-between">
                  <Pressable
                    onPress={() => toggleActiveMutation.mutate({ amenityId: amenity.id, isActive: !amenity.isActive })}
                    className="flex-row items-center gap-1.5 rounded-full px-3 py-1.5"
                    style={{ backgroundColor: amenity.isActive ? "rgba(254,178,70,0.28)" : "rgba(186,26,26,0.10)" }}
                    accessibilityRole="button"
                    accessibilityLabel={`${amenity.name} is ${amenity.isActive ? "open — tap to close" : "under maintenance — tap to open"}`}
                  >
                    {amenity.isActive ? (
                      <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: "#845400" }} />
                    ) : (
                      <MaterialIcons name="warning-amber" size={13} color="#BA1A1A" />
                    )}
                    <Text className="text-meta-text font-semibold" style={{ color: amenity.isActive ? "#845400" : "#BA1A1A" }}>
                      {amenity.isActive ? "Open" : "Maintenance"}
                    </Text>
                  </Pressable>
                  <View className="flex-row items-center gap-1">
                    <IconButton icon="edit" size={20} onPress={() => startEdit(amenity)} accessibilityLabel={`Edit ${amenity.name}`} />
                    <IconButton
                      icon="delete-outline"
                      size={20}
                      color="#BA1A1A"
                      onPress={() => confirmDelete(amenity.id, amenity.name)}
                      accessibilityLabel={`Delete ${amenity.name}`}
                    />
                  </View>
                </View>

                <View className="gap-1">
                  <Text className="text-headline-md font-extrabold text-on-surface">{amenity.name}</Text>
                  {amenity.description ? (
                    <View className="flex-row items-center gap-1.5">
                      <MaterialIcons name="place" size={14} color="#8A8A8A" />
                      <Text className="min-w-0 flex-1 text-body-sm text-text-muted" numberOfLines={1}>
                        {amenity.description}
                      </Text>
                    </View>
                  ) : null}
                </View>

                <View className="flex-row gap-3">
                  <View
                    className="flex-1 gap-1 p-3"
                    style={{ borderRadius: 12, borderWidth: 1, borderColor: "#333333", backgroundColor: "#0D0D0D" }}
                  >
                    <Text className="text-meta-text text-text-muted">Schedule</Text>
                    <Text className="text-body-md font-bold text-on-surface">
                      {amenity.openTime.slice(0, 5)} - {amenity.closeTime.slice(0, 5)}
                    </Text>
                    <Text className="text-meta-text text-text-muted">{amenity.slotMinutes}-min slots</Text>
                  </View>
                  <View
                    className="flex-1 gap-1 p-3"
                    style={{ borderRadius: 12, borderWidth: 1, borderColor: "#333333", backgroundColor: "#0D0D0D" }}
                  >
                    <Text className="text-meta-text text-text-muted">Capacity</Text>
                    <View className="flex-row items-baseline gap-1">
                      <Text className="text-headline-md font-extrabold text-primary">{amenity.capacity}</Text>
                      <Text className="text-body-sm text-text-muted">persons</Text>
                    </View>
                  </View>
                </View>

                <PressableScale
                  scaleTo={0.97}
                  onPress={() => setBookingsAmenityId(bookingsAmenityId === amenity.id ? null : amenity.id)}
                  className="flex-row items-center justify-center gap-2 bg-surface-container py-3"
                  style={{ borderRadius: 12 }}
                  accessibilityRole="button"
                  accessibilityLabel={`${bookingsAmenityId === amenity.id ? "Hide" : "Show"} bookings for ${amenity.name}`}
                >
                  <MaterialIcons name="event-note" size={18} color="#F5821F" />
                  <Text className="text-body-sm font-semibold text-primary">Booking Oversight</Text>
                </PressableScale>

                {bookingsAmenityId === amenity.id && (
                  <View className="gap-2 border-t border-outline-variant pt-3">
                    {bookingsQuery.isLoading ? (
                      <ActivityIndicator color="#F5821F" />
                    ) : (bookingsQuery.data ?? []).length === 0 ? (
                      <Text className="text-body-sm text-text-muted">No bookings yet.</Text>
                    ) : (
                      (bookingsQuery.data ?? []).map((booking) => (
                        <View
                          key={booking.id}
                          className="flex-row items-center justify-between bg-surface-container p-3"
                          style={{ borderRadius: 12 }}
                        >
                          <View className="min-w-0 flex-1">
                            <Text className="text-body-sm font-medium text-on-surface" numberOfLines={1}>
                              {booking.flatNumber} · {booking.bookedByName}
                            </Text>
                            <Text className="text-meta-text text-text-muted">
                              {booking.date} · {booking.slotStart.slice(0, 5)}–{booking.slotEnd.slice(0, 5)}
                            </Text>
                          </View>
                          <View className={`h-1.5 w-1.5 rounded-full ${booking.status === "confirmed" ? "bg-status-green" : "bg-text-muted"}`} />
                        </View>
                      ))
                    )}
                  </View>
                )}
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
