import { useState } from "react";
import { View, Text, ScrollView, RefreshControl, Pressable, Alert, ActivityIndicator } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { trpc } from "../../lib/trpc";
import { useUiStore } from "../../stores/ui-store";
import { getErrorMessage } from "../../lib/error-message";
import { hapticSuccess, hapticError } from "../../lib/haptics";
import { ScreenHeader } from "../../components/ui/screen-header";
import { EmptyState } from "../../components/ui/empty-state";
import { ListLoading } from "../../components/ui/list-loading";
import { shadowCard } from "../../lib/shadows";

function nextDays(count: number) {
  return Array.from({ length: count }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() + i);
    return date;
  });
}

function dateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

const AMENITY_ICON: Record<string, React.ComponentProps<typeof MaterialIcons>["name"]> = {
  pool: "pool",
  clubhouse: "celebration",
  gym: "fitness-center",
  court: "sports-tennis",
};

function iconFor(name: string) {
  const lower = name.toLowerCase();
  if (lower.includes("pool")) return AMENITY_ICON.pool;
  if (lower.includes("gym") || lower.includes("fitness")) return AMENITY_ICON.gym;
  if (lower.includes("court") || lower.includes("tennis")) return AMENITY_ICON.court;
  return AMENITY_ICON.clubhouse;
}

export default function ResidentAmenities() {
  const showToast = useUiStore((s) => s.showToast);
  const utils = trpc.useUtils();
  const days = nextDays(7);
  const [bookingAmenityId, setBookingAmenityId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(dateKey(days[0]));
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);

  const amenitiesQuery = trpc.amenities.listForResident.useQuery();
  const slotsQuery = trpc.amenityBookings.availableSlots.useQuery(
    { amenityId: bookingAmenityId ?? "", date: selectedDate },
    { enabled: !!bookingAmenityId },
  );
  const myBookingsQuery = trpc.amenityBookings.myBookings.useQuery();

  const bookMutation = trpc.amenityBookings.create.useMutation({
    onSuccess: () => {
      hapticSuccess();
      showToast("Booking confirmed", "success");
      setBookingAmenityId(null);
      setSelectedSlot(null);
      utils.amenityBookings.myBookings.invalidate();
    },
    onError: (error) => {
      hapticError();
      showToast(getErrorMessage(error), "error");
    },
  });

  const cancelMutation = trpc.amenityBookings.cancel.useMutation({
    onSuccess: () => {
      hapticSuccess();
      showToast("Booking cancelled", "success");
      utils.amenityBookings.myBookings.invalidate();
    },
    onError: (error) => {
      hapticError();
      showToast(getErrorMessage(error), "error");
    },
  });

  function confirmCancel(bookingId: string) {
    Alert.alert("Cancel booking?", "This will free up the slot for others.", [
      { text: "Keep it", style: "cancel" },
      { text: "Cancel Booking", style: "destructive", onPress: () => cancelMutation.mutate({ bookingId }) },
    ]);
  }

  function startBooking(amenityId: string) {
    setBookingAmenityId(bookingAmenityId === amenityId ? null : amenityId);
    setSelectedDate(dateKey(days[0]));
    setSelectedSlot(null);
  }

  const amenities = amenitiesQuery.data ?? [];
  const bookings = (myBookingsQuery.data ?? []).filter((b) => b.status === "confirmed");
  const selectedAmenity = amenities.find((a) => a.id === bookingAmenityId);
  const monthLabel = new Date(selectedDate).toLocaleDateString([], { month: "long", year: "numeric" });

  return (
    <View className="flex-1" style={{ backgroundColor: "#0D0D0D" }}>
      <ScreenHeader title="Book an Amenity" subtitle="Select a facility to reserve your spot." role="resident" />
      <ScrollView
        contentContainerClassName="gap-4 px-5 pb-8 pt-2"
        refreshControl={
          <RefreshControl
            refreshing={amenitiesQuery.isRefetching || myBookingsQuery.isRefetching}
            onRefresh={() => {
              amenitiesQuery.refetch();
              myBookingsQuery.refetch();
            }}
          />
        }
      >
        {amenitiesQuery.isLoading ? (
          <ListLoading />
        ) : amenitiesQuery.isError ? (
          <View className="rounded-xl bg-surface">
            <EmptyState title="Couldn't load facilities" description="Pull down to refresh and try again." icon="error-outline" />
          </View>
        ) : amenities.length === 0 ? (
          <View className="rounded-xl bg-surface">
            <EmptyState title="No facilities yet" description="Society facilities will show up here." icon="pool" />
          </View>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-3">
            {amenities.map((amenity) => {
              const selected = bookingAmenityId === amenity.id;
              return (
                <Pressable
                  key={amenity.id}
                  onPress={() => amenity.isActive && startBooking(amenity.id)}
                  disabled={!amenity.isActive}
                  className="justify-between rounded-xl p-4"
                  style={[
                    {
                      width: 180,
                      height: 120,
                      backgroundColor: selected ? "#2A2320" : "#242424",
                      borderWidth: 2,
                      borderColor: selected ? "#F5821F" : "transparent",
                      opacity: amenity.isActive ? 1 : 0.5,
                    },
                    shadowCard,
                  ]}
                  accessibilityLabel={`Select ${amenity.name}`}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                >
                  <MaterialIcons name={iconFor(amenity.name)} size={32} color="#FF9A3D" />
                  <View>
                    <Text className="text-body-md font-extrabold text-on-surface" numberOfLines={1}>
                      {amenity.name}
                    </Text>
                    <Text className="text-body-sm text-text-muted">
                      {amenity.isActive ? `Max capacity: ${amenity.capacity}` : "Unavailable"}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>
        )}

        {selectedAmenity && (
          <View className="gap-4 rounded-xl bg-surface p-5" style={shadowCard}>
            <View className="flex-row items-center justify-between">
              <Text className="text-body-lg font-extrabold text-on-surface">Select Date</Text>
              <Text className="text-body-md font-bold" style={{ color: "#F5821F" }}>
                {monthLabel}
              </Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2.5">
              {days.map((day) => {
                const key = dateKey(day);
                const isSelected = key === selectedDate;
                return (
                  <Pressable
                    key={key}
                    onPress={() => {
                      setSelectedDate(key);
                      setSelectedSlot(null);
                    }}
                    className="items-center rounded-xl px-4 py-3"
                    style={{ backgroundColor: isSelected ? "#F5821F" : "#242424", minWidth: 64 }}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isSelected }}
                  >
                    <Text className="text-body-sm" style={{ color: isSelected ? "#2A2320" : "#8A8A8A" }}>
                      {day.toLocaleDateString([], { weekday: "short" })}
                    </Text>
                    <Text
                      className="text-body-lg font-extrabold"
                      style={{ color: isSelected ? "#FFFFFF" : "#F5F5F5" }}
                    >
                      {day.getDate()}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            <Text className="text-body-lg font-extrabold text-on-surface">Available Times</Text>
            {slotsQuery.isLoading ? (
              <ActivityIndicator color="#F5821F" />
            ) : (slotsQuery.data ?? []).length === 0 ? (
              <Text className="text-body-sm text-text-muted">No slots for this day.</Text>
            ) : (
              <View className="flex-row flex-wrap gap-2.5">
                {(slotsQuery.data ?? []).map((slot) => {
                  const isSelected = selectedSlot === slot.slotStart;
                  return (
                    <Pressable
                      key={slot.slotStart}
                      disabled={!slot.isAvailable}
                      onPress={() => setSelectedSlot(slot.slotStart)}
                      className="items-center rounded-lg px-4 py-2.5"
                      style={
                        !slot.isAvailable
                          ? { backgroundColor: "#242424", opacity: 0.6 }
                          : isSelected
                            ? { backgroundColor: "#F5821F" }
                            : { backgroundColor: "#1A1A1A", borderWidth: 1, borderColor: "#3A3A3A" }
                      }
                      accessibilityRole="button"
                      accessibilityState={{ selected: isSelected, disabled: !slot.isAvailable }}
                    >
                      <Text
                        className={`text-body-md ${isSelected ? "font-bold" : ""}`}
                        style={{ color: !slot.isAvailable ? "#7E7E7E" : isSelected ? "#FFFFFF" : "#F5F5F5" }}
                      >
                        {slot.slotStart.slice(0, 5)}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            )}

            <Pressable
              disabled={!selectedSlot || bookMutation.isPending}
              onPress={() =>
                selectedSlot &&
                bookMutation.mutate({ amenityId: selectedAmenity.id, date: selectedDate, slotStart: selectedSlot })
              }
              className="mt-1 h-12 items-center justify-center rounded-full"
              style={{ backgroundColor: !selectedSlot ? "#7A5320" : "#F5821F" }}
              accessibilityLabel="Confirm booking"
              accessibilityRole="button"
            >
              <Text className="text-body-md font-bold" style={{ color: "#FFFFFF" }}>
                {bookMutation.isPending ? "Booking..." : "Confirm Booking"}
              </Text>
            </Pressable>
          </View>
        )}

        <Text className="pt-2 text-headline-lg font-extrabold text-on-surface">My Bookings</Text>
        {bookings.length === 0 ? (
          <Text className="px-1 text-body-sm text-text-muted">No upcoming bookings.</Text>
        ) : (
          <View className="gap-3">
            {bookings.map((booking) => (
              <View key={booking.id} className="flex-row items-center gap-3 rounded-xl bg-surface p-4" style={shadowCard}>
                <View
                  className="items-center justify-center"
                  style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: "#2A2320" }}
                >
                  <MaterialIcons name={iconFor(booking.amenityName)} size={22} color="#FF9A3D" />
                </View>
                <View className="min-w-0 flex-1">
                  <Text className="text-body-md font-extrabold text-on-surface" numberOfLines={1}>
                    {booking.amenityName}
                  </Text>
                  <Text className="text-body-sm text-text-muted">
                    {new Date(booking.date).toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" })} •{" "}
                    {booking.slotStart.slice(0, 5)}–{booking.slotEnd.slice(0, 5)}
                  </Text>
                </View>
                <View className="rounded-full px-3 py-1" style={{ backgroundColor: "#8A5A00" }}>
                  <Text className="text-body-sm font-bold" style={{ color: "#FFFFFF" }}>
                    Upcoming
                  </Text>
                </View>
                <Pressable
                  onPress={() => confirmCancel(booking.id)}
                  hitSlop={8}
                  accessibilityLabel={`Cancel booking for ${booking.amenityName}`}
                  accessibilityRole="button"
                >
                  <MaterialIcons name="close" size={18} color="#FF5F5F" />
                </Pressable>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
