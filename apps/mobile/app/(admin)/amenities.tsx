import { useState } from "react";
import { View, Text, ScrollView, RefreshControl, Pressable, Alert, ActivityIndicator } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { trpc } from "../../lib/trpc";
import { useUiStore } from "../../stores/ui-store";
import { getErrorMessage } from "../../lib/error-message";
import { hapticSuccess, hapticError } from "../../lib/haptics";
import { AdminHeader } from "../../components/ui/admin-header";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { TimeField } from "../../components/ui/time-field";
import { EmptyState } from "../../components/ui/empty-state";
import { FormPanel } from "../../components/ui/form-panel";
import { IconButton } from "../../components/ui/icon-button";
import { ListLoading } from "../../components/ui/list-loading";
import { PressableScale } from "../../components/ui/pressable-scale";

function timeToDate(time: string): Date {
  const [h, m] = time.split(":").map(Number);
  const date = new Date();
  date.setHours(h ?? 0, m ?? 0, 0, 0);
  return date;
}

function dateToTime(date: Date): string {
  return `${date.getHours().toString().padStart(2, "0")}:${date.getMinutes().toString().padStart(2, "0")}`;
}

function amenityIcon(name: string): React.ComponentProps<typeof MaterialIcons>["name"] {
  const n = name.toLowerCase();
  if (n.includes("pool") || n.includes("swim")) return "pool";
  if (n.includes("gym") || n.includes("fitness")) return "fitness-center";
  if (n.includes("tennis")) return "sports-tennis";
  if (n.includes("hall") || n.includes("club") || n.includes("party")) return "celebration";
  if (n.includes("park") || n.includes("garden")) return "park";
  return "meeting-room";
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

  // Booking oversight is split into live vs finished: once a slot's end time passes,
  // the booking drops into History (alongside cancellations) and is read-only.
  const now = Date.now();
  const bookingEnd = (b: { date: string; slotEnd: string }) =>
    new Date(`${b.date.slice(0, 10)}T${b.slotEnd.slice(0, 5)}:00`).getTime();
  const allAdminBookings = bookingsQuery.data ?? [];
  const upcomingBookings = allAdminBookings
    .filter((b) => b.status === "confirmed" && bookingEnd(b) >= now)
    .sort((a, b) => bookingEnd(a) - bookingEnd(b));
  const pastBookings = allAdminBookings
    .filter((b) => b.status === "cancelled" || (b.status === "confirmed" && bookingEnd(b) < now))
    .sort((a, b) => bookingEnd(b) - bookingEnd(a));

  return (
    <View className="flex-1 bg-background">
      <AdminHeader
        showBack
        barTitle="Portl"
        centerBar
        bigTitle="Amenities"
        action={{ label: showForm ? "Close" : "+ Add", onPress: () => (showForm ? resetForm() : setShowForm(true)) }}
      />
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 32, gap: 16 }}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl tintColor="#F5821F" colors={["#F5821F"]} progressBackgroundColor="#1A1A1A" refreshing={amenitiesQuery.isRefetching} onRefresh={() => amenitiesQuery.refetch()} />}
      >
        {showForm && (
          <FormPanel style={{ borderWidth: 1.5, borderColor: "#F5821F" }}>
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
          <View style={{ borderRadius: 20, backgroundColor: "#1A1A1A", borderWidth: 1, borderColor: "#333333" }}>
            <EmptyState title="Couldn't load facilities" description="Pull down to refresh and try again." icon="error-outline" />
          </View>
        ) : amenities.length === 0 ? (
          <View style={{ borderRadius: 20, backgroundColor: "#1A1A1A", borderWidth: 1, borderColor: "#333333" }}>
            <EmptyState title="No facilities yet" description="Add a facility to get started." icon="pool" />
          </View>
        ) : (
          <View style={{ gap: 16 }}>
            {amenities.map((amenity) => (
              <View
                key={amenity.id}
                style={{
                  backgroundColor: "#1A1A1A",
                  borderRadius: 20,
                  borderWidth: 1,
                  borderColor: "#333333",
                  padding: 20,
                  gap: 14,
                }}
              >
                <View className="flex-row items-start justify-between">
                  <View
                    className="items-center justify-center"
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 14,
                      backgroundColor: "#242424",
                      borderWidth: 1,
                      borderColor: "#333333",
                    }}
                  >
                    <MaterialIcons name={amenityIcon(amenity.name)} size={24} color="#F5821F" />
                  </View>
                  <Pressable
                    onPress={() => toggleActiveMutation.mutate({ amenityId: amenity.id, isActive: !amenity.isActive })}
                    className="flex-row items-center gap-1.5 rounded-full px-3 py-1.5"
                    style={{ backgroundColor: "#242424", borderWidth: 1, borderColor: "#333333" }}
                    accessibilityRole="button"
                    accessibilityLabel={`${amenity.name} is ${amenity.isActive ? "open — tap to close" : "under maintenance — tap to open"}`}
                  >
                    <View
                      style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: amenity.isActive ? "#27C96D" : "#FF5F5F" }}
                    />
                    <Text className="text-body-sm font-semibold text-on-surface">
                      {amenity.isActive ? "Available" : "Maintenance"}
                    </Text>
                  </Pressable>
                </View>

                <View className="gap-1">
                  <Text className="text-headline-md font-extrabold text-on-surface">{amenity.name}</Text>
                  <Text className="text-body-md text-text-muted" numberOfLines={1}>
                    Open {amenity.openTime.slice(0, 5)}–{amenity.closeTime.slice(0, 5)} · Capacity {amenity.capacity}
                    {amenity.description ? ` · ${amenity.description}` : ""}
                  </Text>
                </View>

                <View
                  className="flex-row items-center justify-between pt-3"
                  style={{ borderTopWidth: 1, borderTopColor: "#333333" }}
                >
                  <PressableScale
                    scaleTo={0.97}
                    onPress={() => setBookingsAmenityId(bookingsAmenityId === amenity.id ? null : amenity.id)}
                    className="flex-row items-center gap-2"
                    accessibilityRole="button"
                    accessibilityLabel={`${bookingsAmenityId === amenity.id ? "Hide" : "Show"} bookings for ${amenity.name}`}
                  >
                    <MaterialIcons name="event-note" size={18} color="#F5821F" />
                    <Text className="text-body-sm font-semibold text-primary">Booking Oversight</Text>
                  </PressableScale>
                  <View className="flex-row items-center gap-1">
                    <IconButton icon="edit" size={20} onPress={() => startEdit(amenity)} accessibilityLabel={`Edit ${amenity.name}`} />
                    <IconButton
                      icon="delete-outline"
                      size={20}
                      onPress={() => confirmDelete(amenity.id, amenity.name)}
                      accessibilityLabel={`Delete ${amenity.name}`}
                    />
                  </View>
                </View>

                {bookingsAmenityId === amenity.id && (
                  <View className="gap-2 border-t border-outline-variant pt-3">
                    {bookingsQuery.isLoading ? (
                      <ActivityIndicator color="#F5821F" />
                    ) : allAdminBookings.length === 0 ? (
                      <Text className="text-body-sm text-text-muted">No bookings yet.</Text>
                    ) : (
                      <>
                        <Text className="text-label-caps uppercase text-text-muted">Upcoming</Text>
                        {upcomingBookings.length === 0 ? (
                          <Text className="text-body-sm text-text-muted">No upcoming bookings.</Text>
                        ) : (
                          upcomingBookings.map((booking) => (
                            <View
                              key={booking.id}
                              className="flex-row items-center justify-between p-3"
                              style={{ borderRadius: 12, backgroundColor: "#242424" }}
                            >
                              <View className="min-w-0 flex-1">
                                <Text className="text-body-sm font-medium text-on-surface" numberOfLines={1}>
                                  {booking.flatNumber} · {booking.bookedByName}
                                </Text>
                                <Text className="text-meta-text text-text-muted">
                                  {booking.date} · {booking.slotStart.slice(0, 5)}–{booking.slotEnd.slice(0, 5)}
                                </Text>
                              </View>
                              <View className="h-1.5 w-1.5 rounded-full bg-status-green" />
                            </View>
                          ))
                        )}

                        {pastBookings.length > 0 && (
                          <>
                            <Text className="mt-2 text-label-caps uppercase text-text-muted">History</Text>
                            {pastBookings.map((booking) => {
                              const cancelled = booking.status === "cancelled";
                              return (
                                <View
                                  key={booking.id}
                                  className="flex-row items-center justify-between p-3"
                                  style={{ borderRadius: 12, backgroundColor: "#1F1F1F", opacity: 0.75 }}
                                >
                                  <View className="min-w-0 flex-1">
                                    <Text className="text-body-sm font-medium text-on-surface-variant" numberOfLines={1}>
                                      {booking.flatNumber} · {booking.bookedByName}
                                    </Text>
                                    <Text className="text-meta-text text-text-muted">
                                      {booking.date} · {booking.slotStart.slice(0, 5)}–{booking.slotEnd.slice(0, 5)}
                                    </Text>
                                  </View>
                                  <Text className="text-meta-text font-semibold" style={{ color: cancelled ? "#FF8A8A" : "#8A8A8A" }}>
                                    {cancelled ? "Cancelled" : "Completed"}
                                  </Text>
                                </View>
                              );
                            })}
                          </>
                        )}
                      </>
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
